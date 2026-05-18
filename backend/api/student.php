<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Headers: Authorization, Content-Type");

date_default_timezone_set('Asia/Dhaka');
require_once __DIR__ . '/../core/auth.php';

$user = enforce_role('student');
$user_id = $user['id'];

try {
    $response = [];

    // Wallet Balance
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $response['wallet_balance'] = (float)$stmt->fetchColumn();
    
    // Loans
    $stmt = $pdo->prepare("
        SELECT l.*, l.loan_id as id, s.status_name as status 
        FROM loans l 
        JOIN loan_statuses s ON l.status_id = s.status_id
        WHERE l.student_id = ? 
        ORDER BY l.applied_at DESC
    ");
    $stmt->execute([$user_id]);
    $response['loans'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Campaigns
    $stmt = $pdo->prepare("
        SELECT c.*, s.status_name as status 
        FROM campaigns c 
        JOIN campaign_statuses s ON c.status_id = s.status_id
        WHERE c.student_id = ? 
        ORDER BY c.created_at DESC
    ");
    $stmt->execute([$user_id]);
    $response['campaigns'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Student Profile
    $stmt = $pdo->prepare("SELECT * FROM student_profiles WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($profile) {
        $stmt = $pdo->prepare("SELECT tier_name FROM risk_tiers WHERE ? BETWEEN min_score AND max_score");
        $stmt->execute([$profile['credit_score']]);
        $profile['risk_tier'] = $stmt->fetchColumn() ?: 'Unknown';
    }
    $response['profile'] = $profile;

    // Total Debt Calculation
    $stmt = $pdo->prepare("
        SELECT 
            COALESCE((
                SELECT SUM(li.installment_amount)
                FROM loan_installments li
                JOIN loans l ON li.loan_id = l.loan_id
                JOIN loan_statuses s ON l.status_id = s.status_id
                WHERE l.student_id = ? AND s.status_name IN ('active', 'approved', 'overdue')
            ), 0) - COALESCE((
                SELECT SUM(ABS(t.amount))
                FROM transactions t
                JOIN txn_repayments tr ON t.transaction_id = tr.transaction_id
                JOIN loan_installments li ON tr.installment_id = li.installment_id
                JOIN loans l ON li.loan_id = l.loan_id
                JOIN loan_statuses s ON l.status_id = s.status_id
                WHERE l.student_id = ? AND s.status_name IN ('active', 'approved', 'overdue')
            ), 0) as outstanding_debt
    ");
    $stmt->execute([$user_id, $user_id]);
    $debt = $stmt->fetchColumn();
    $response['total_debt'] = $debt > 0 ? (float)$debt : 0;

    // Funds Raised
    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(t.amount), 0)
        FROM transactions t
        JOIN txn_donations td ON t.transaction_id = td.transaction_id
        JOIN campaigns c ON td.campaign_id = c.campaign_id
        WHERE c.student_id = ?
    ");
    $stmt->execute([$user_id]);
    $response['total_raised'] = (float)$stmt->fetchColumn();

    // Upcoming Obligations
    $stmt = $pdo->prepare("
        SELECT 
            li.installment_id,
            li.loan_id,
            li.installment_amount as amount_due,
            li.due_date,
            l.title as loan_title
        FROM loan_installments li
        JOIN loans l ON li.loan_id = l.loan_id
        WHERE l.student_id = ? 
        AND li.installment_id NOT IN (SELECT installment_id FROM txn_repayments)
        ORDER BY li.due_date ASC
        LIMIT 3
    ");
    $stmt->execute([$user_id]);
    $response['upcoming_obligations'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Recent Transactions
    $stmt = $pdo->prepare("
        SELECT transaction_id as id, 'transaction' as type, amount, created_at
        FROM transactions 
        WHERE user_id = ? 
        ORDER BY created_at DESC LIMIT 10
    ");
    $stmt->execute([$user_id]);
    $response['recent_transactions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

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

    json_response($response, "Student dashboard loaded");
} catch (PDOException $e) {
    json_response(null, "Database error: " . $e->getMessage(), 500);
}
?>
