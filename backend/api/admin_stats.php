<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_config.php';

try {
    $stats = [];

    // Total Users
    $stmt = $pdo->query("SELECT r.role_name as role, COUNT(*) as count FROM users u JOIN roles r ON u.role_id = r.role_id GROUP BY r.role_name");
    $stats['users'] = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    // Financials
    // Disbursed: Active/Completed loans
    // Repaid: Sum of transactions linked to repayment (via txn_repayments)
    // Or just simple sum of 'amount_paid' if we had it.
    // We calculated amount_paid dynamically in other files. 
    // For admin stats, global sum of all repayments:
    // SELECT SUM(amount) FROM transactions WHERE amount < 0 (assuming negative is repayment/withdrawal)
    // But strict check: JOIN txn_repayments
    
    $stmt = $pdo->query("SELECT SUM(l.principal_amount) as disbursed FROM loans l JOIN loan_statuses s ON l.status_id = s.status_id WHERE s.status_name IN ('active', 'completed')");
    $disbursed = $stmt->fetchColumn() ?: 0;
    
    $stmt = $pdo->query("SELECT SUM(ABS(t.amount)) as repaid FROM transactions t JOIN txn_repayments tr ON t.transaction_id = tr.transaction_id");
    $repaid = $stmt->fetchColumn() ?: 0;

    $stats['loans'] = [
        'disbursed' => $disbursed,
        'repaid' => $repaid
    ];

    $stmt = $pdo->query("SELECT SUM(goal_amount) as total_raised FROM campaigns");
    $campStats = $stmt->fetch(PDO::FETCH_ASSOC);
    $stats['campaigns'] = $campStats;

    // Recent Activity (Loans applied, Users joined)
    $stmt = $pdo->query("SELECT u.user_id as id, u.full_name, u.email, r.role_name as role, u.created_at FROM users u JOIN roles r ON u.role_id = r.role_id ORDER BY u.created_at DESC LIMIT 5");
    $stats['recent_users'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($stats);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["message" => "Database error: " . $e->getMessage()]);
}
?>
