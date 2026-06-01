<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_config.php';

try {
    // 1. Dynamic Detection: Insert new alerts if they don't already exist
    $sql = "
        SELECT 
            u.user_id as id, 
            s.status_name as status, 
            sp.credit_score,
            (SELECT COUNT(*) FROM loans l WHERE l.student_id = u.user_id AND l.applied_at >= NOW() - INTERVAL 1 DAY) as loan_count_24h,
            (SELECT tier_name FROM risk_tiers rt WHERE sp.credit_score BETWEEN rt.min_score AND rt.max_score) as risk_tier
        FROM users u
        JOIN user_statuses s ON u.status_id = s.status_id
        LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
        WHERE 
            s.status_name IN ('banned', 'inactive')
            OR (SELECT COUNT(*) FROM loans l WHERE l.student_id = u.user_id AND l.applied_at >= NOW() - INTERVAL 1 DAY) >= 4
            OR (SELECT tier_name FROM risk_tiers rt WHERE sp.credit_score BETWEEN rt.min_score AND rt.max_score) = 'High'
    ";

    $stmt = $pdo->query($sql);
    $suspicious_users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $insertStmt = $pdo->prepare("
        INSERT INTO fraud_alerts (user_id, alert_type, severity, description, is_active)
        SELECT ?, ?, ?, ?, TRUE
        WHERE NOT EXISTS (
            SELECT 1 FROM fraud_alerts 
            WHERE user_id = ? AND alert_type = ? AND is_active = TRUE
        )
    ");

    foreach ($suspicious_users as $user) {
        $alertType = "Suspicious Pattern";
        $severity = "Medium";
        $description = "Suspicious activity detected";
        $loanCount = intval($user['loan_count_24h']);
        $riskTier = $user['risk_tier'] ?? 'N/A';

        if ($user['status'] === 'banned') {
            $alertType = "Account Banned";
            $severity = "High";
            $description = "User account has been banned or blocked.";
        } elseif ($loanCount >= 4) {
            $alertType = "High Velocity";
            $severity = "High";
            $description = "High Velocity: {$loanCount} loan applications in 24h";
        } elseif ($riskTier === 'High') {
            $alertType = "High Risk Profile";
            $severity = "High";
            $description = "High Risk Student Profile (Credit Score: {$user['credit_score']})";
        }

        $userId = $user['id'];
        $insertStmt->execute([$userId, $alertType, $severity, $description, $userId, $alertType]);

        // If a brand-new alert was successfully inserted, apply score penalty
        if ($insertStmt->rowCount() > 0) {
            // Only apply score penalty if the target user has a student role
            $role_stmt = $pdo->prepare("SELECT r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = ?");
            $role_stmt->execute([$userId]);
            $role_name = $role_stmt->fetchColumn();

            if ($role_name === 'student') {
                require_once 'core/ScoreEngine.php';
                try {
                    ScoreEngine::applyEvent((int)$userId, 'EVT_08', 'fraud_detection_system', $pdo);
                } catch (Exception $e) {
                    error_log("Failed to trigger EVT_08 for student $userId: " . $e->getMessage());
                }
            }
        }
    }

    // 2. Fetch Active Alerts from `fraud_alerts` table
    $fetchSql = "
        SELECT 
            fa.alert_id,
            fa.user_id,
            fa.alert_type,
            fa.severity,
            fa.description,
            DATE(fa.created_at) as alert_date,
            u.full_name as name, 
            u.email, 
            r.role_name as role, 
            s.status_name as status, 
            sp.current_cgpa,
            (SELECT tier_name FROM risk_tiers rt WHERE sp.credit_score BETWEEN rt.min_score AND rt.max_score) as risk_tier
        FROM fraud_alerts fa
        JOIN users u ON fa.user_id = u.user_id
        JOIN roles r ON u.role_id = r.role_id
        JOIN user_statuses s ON u.status_id = s.status_id
        LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
        WHERE fa.is_active = TRUE
        ORDER BY fa.created_at DESC
    ";

    $fetchStmt = $pdo->query($fetchSql);
    $saved_alerts = $fetchStmt->fetchAll(PDO::FETCH_ASSOC);

    $alerts = [];
    foreach ($saved_alerts as $alert) {
        $alerts[] = [
            'id' => $alert['alert_id'], // unique alert ID
            'userId' => $alert['user_id'], // keeping for compatibility
            'user' => [
                'id' => $alert['user_id'],
                'name' => $alert['name'],
                'email' => $alert['email'],
                'role' => $alert['role'],
                'status' => $alert['status'],
                'risk_tier' => $alert['risk_tier'] ?? 'N/A',
                'cgpa' => $alert['current_cgpa'] ?? 'N/A',
                'wallet' => 0.00
            ],
            'activity' => $alert['description'], // fraud-center.js expects `activity`
            'severity' => $alert['severity'],
            'date' => $alert['alert_date']
        ];
    }

    echo json_encode($alerts);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["message" => "Database error: " . $e->getMessage()]);
}
?>
