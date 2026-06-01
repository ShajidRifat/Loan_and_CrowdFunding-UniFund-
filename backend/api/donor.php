<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Headers: Authorization, Content-Type");

date_default_timezone_set('Asia/Dhaka');
require_once __DIR__ . '/../core/auth.php';

$user = enforce_role('donor');
$user_id = $user['id'];

try {
    $response = [];

    // Wallet Balance
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $response['wallet_balance'] = (float)$stmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT COUNT(DISTINCT campaign_id) FROM txn_donations td JOIN transactions t ON td.transaction_id = t.transaction_id WHERE t.user_id = ?");
    $stmt->execute([$user_id]);
    $campaigns_supported = $stmt->fetchColumn() ?: 0;

    // Lives Impacted represents the count of unique student beneficiaries whose campaigns this donor has supported
    $stmt = $pdo->prepare("
        SELECT COUNT(DISTINCT c.student_id) 
        FROM txn_donations td
        JOIN transactions t ON td.transaction_id = t.transaction_id
        JOIN campaigns c ON td.campaign_id = c.campaign_id
        WHERE t.user_id = ?
    ");
    $stmt->execute([$user_id]);
    $lives_impacted = $stmt->fetchColumn() ?: 0; 

    $response['stats'] = [
        'total_donated' => $response['wallet_balance'],
        'lives_impacted' => $lives_impacted,
        'campaigns_supported' => $campaigns_supported
    ];

    // Donations
    $stmt = $pdo->prepare("
        SELECT 
            td.*, 
            c.title as campaign_title, 
            t.amount as donation_amount, 
            t.amount as amount,
            t.created_at as donated_at,
            u.full_name as student_name
        FROM txn_donations td
        JOIN transactions t ON td.transaction_id = t.transaction_id
        JOIN campaigns c ON td.campaign_id = c.campaign_id 
        JOIN users u ON c.student_id = u.user_id
        WHERE t.user_id = ? 
        ORDER BY t.created_at DESC
    ");
    $stmt->execute([$user_id]);
    $response['donations'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Recent Transactions
    $stmt = $pdo->prepare("
        SELECT 
            t.transaction_id as id,
            'donation' as type,
            t.amount,
            t.created_at,
            'completed' as status,
            c.title as description
        FROM transactions t
        JOIN txn_donations td ON t.transaction_id = td.transaction_id
        JOIN campaigns c ON td.campaign_id = c.campaign_id
        WHERE t.user_id = ?
        ORDER BY t.created_at DESC LIMIT 10
    ");
    $stmt->execute([$user_id]);
    $response['recent_transactions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Smart Recommendations Engine
    $pref_stmt = $pdo->prepare("
        SELECT DISTINCT c.category_id 
        FROM txn_donations td
        JOIN transactions t ON td.transaction_id = t.transaction_id
        JOIN campaigns c ON td.campaign_id = c.campaign_id
        WHERE t.user_id = ?
    ");
    $pref_stmt->execute([$user_id]);
    $fav_categories = $pref_stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];

    $fav_cat_placeholders = !empty($fav_categories) ? implode(',', array_fill(0, count($fav_categories), '?')) : 'NULL';
    
    $rec_sql = "
        SELECT 
            c.campaign_id,
            c.title,
            c.description,
            c.image_url,
            c.goal_amount,
            COALESCE(s.raised_amount, 0) as raised_amount,
            CASE WHEN c.category_id IN ($fav_cat_placeholders) THEN 1 ELSE 0 END as is_matched
        FROM campaigns c
        JOIN campaign_statuses stat ON c.status_id = stat.status_id
        LEFT JOIN vw_campaign_stats_pure s ON c.campaign_id = s.campaign_id
        WHERE stat.status_name = 'active'
          AND COALESCE(s.raised_amount, 0) < c.goal_amount
          AND c.end_date >= CURDATE()
        ORDER BY is_matched DESC, (COALESCE(s.raised_amount, 0) / c.goal_amount) DESC, c.created_at DESC
        LIMIT 3
    ";
    
    $rec_stmt = $pdo->prepare($rec_sql);
    if (!empty($fav_categories)) {
        $rec_stmt->execute($fav_categories);
    } else {
        $rec_stmt->execute([]);
    }
    $response['recommended_campaigns'] = $rec_stmt->fetchAll(PDO::FETCH_ASSOC);

    // Financial History (Last 30 Days)
    $stmt = $pdo->prepare("
        SELECT 
            DATE_FORMAT(created_at, '%Y-%m-%d') as full_date,
            DATE_FORMAT(created_at, '%b %d') as day_label, 
            SUM(ABS(amount)) as total 
        FROM transactions 
        WHERE user_id = ?
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY full_date, day_label
        ORDER BY full_date ASC
    ");
    $stmt->execute([$user_id]);
    $raw_history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $history = [];
    $data_map = [];
    foreach ($raw_history as $row) {
        $data_map[$row['full_date']] = $row['total'];
    }

    for ($i = 29; $i >= 0; $i--) {
        $timestamp = strtotime("today -$i days");
        $key = date('Y-m-d', $timestamp);
        $label = date('M d', $timestamp);
        
        $history[] = [
            'day' => $label,
            'total' => isset($data_map[$key]) ? (float)$data_map[$key] : 0
        ];
    }
    $response['financial_history'] = $history;

    json_response($response, "Donor dashboard loaded");
} catch (PDOException $e) {
    json_response(null, "Database error: " . $e->getMessage(), 500);
}
?>
