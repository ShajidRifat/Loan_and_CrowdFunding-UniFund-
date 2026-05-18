<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_config.php';

$user_id = isset($_GET['user_id']) ? $_GET['user_id'] : die(json_encode(['error' => 'Missing user_id']));

try {
    // 1. Get User Basics
    $stmt = $pdo->prepare("
        SELECT 
            u.user_id as id, 
            u.full_name, 
            u.email, 
            u.phone_number, 
            r.role_name as role, 
            s.status_name as status
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        JOIN user_statuses s ON u.status_id = s.status_id
        WHERE u.user_id = ?
    ");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(["message" => "User not found"]);
        exit;
    }

    // Mock avatar
    $user['avatar_url'] = 'https://ui-avatars.com/api/?name=' . urlencode($user['full_name']);

    // Check if user has an active loan (for restriction logic)
    $stmtLoan = $pdo->prepare("
        SELECT COUNT(*) 
        FROM loans l
        JOIN loan_statuses ls ON l.status_id = ls.status_id
        WHERE l.student_id = ? AND ls.status_name IN ('approved', 'active', 'defaulted')
    ");
    $stmtLoan->execute([$user['id']]);
    $hasActiveLoan = $stmtLoan->fetchColumn() > 0;
    
    // Add 'restricted' flag
    $user['restricted'] = ($user['status'] === 'restricted') || ($user['status'] === 'banned' && $hasActiveLoan);

    $response = [
        'user' => $user,
        'profile' => null
    ];

    // 2. Get Role Specific details
    if ($user['role'] === 'student') {
        $stmt = $pdo->prepare("SELECT university, student_id_number, major FROM student_profiles WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        $response['profile'] = $profile ? $profile : [];
    } elseif ($user['role'] === 'donor') {
        $stmt = $pdo->prepare("SELECT organization_name as organization FROM donor_profiles WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        $response['profile'] = $profile ? $profile : [];
    }

    echo json_encode($response);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["message" => "Database error: " . $e->getMessage()]);
}
?>
