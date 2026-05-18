<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Headers: Authorization, Content-Type");

date_default_timezone_set('Asia/Dhaka');
require_once __DIR__ . '/../core/auth.php';

$user = enforce_role('admin');

try {
    $response = [];
    
    // 1. Stats
    $stmt = $pdo->query("SELECT COUNT(*) FROM loans l JOIN loan_statuses s ON l.status_id = s.status_id WHERE s.status_name = 'pending'");
    $pendingLoans = $stmt->fetchColumn() ?: 0;

    $stmt = $pdo->query("SELECT COALESCE(SUM(principal_amount), 0) FROM loans l JOIN loan_statuses s ON l.status_id = s.status_id WHERE s.status_name IN ('active', 'paid')");
    $loanVol = $stmt->fetchColumn() ?: 0;
    
    $stmt = $pdo->query("SELECT COALESCE(SUM(goal_amount), 0) FROM campaigns");
    $campVol = $stmt->fetchColumn() ?: 0;
    
    $stmt = $pdo->query("SELECT COUNT(*) FROM users u JOIN user_statuses s ON u.status_id = s.status_id WHERE s.status_name = 'active'");
    $activeUsers = $stmt->fetchColumn() ?: 0;

    $response['stats'] = [
        'pending_reviews' => $pendingLoans,
        'total_volume' => $loanVol + $campVol,
        'active_users' => $activeUsers
    ];

    // 2. Loans
    $stmt = $pdo->query("
        SELECT l.*, u.full_name as student_name, s.status_name as status
        FROM loans l 
        JOIN users u ON l.student_id = u.user_id 
        JOIN loan_statuses s ON l.status_id = s.status_id
        ORDER BY l.applied_at DESC
    ");
    $response['loans'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Campaigns
    $stmt = $pdo->query("
        SELECT c.*, u.full_name as student_name, s.status_name as status 
        FROM campaigns c 
        JOIN users u ON c.student_id = u.user_id 
        JOIN campaign_statuses s ON c.status_id = s.status_id 
        ORDER BY c.created_at DESC
    ");
    $response['campaigns'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Users
    $stmt = $pdo->query("
        SELECT 
            u.user_id as id, 
            u.full_name as name, 
            u.email, 
            r.role_name as role, 
            s.status_name as status,
            u.created_at
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        JOIN user_statuses s ON u.status_id = s.status_id
        ORDER BY u.created_at DESC
    ");
    $response['users'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 5. Recent Transactions
    $stmt = $pdo->query("
        SELECT 
            t.transaction_id as id,
            'transaction' as type, 
            t.amount,
            t.created_at,
            COALESCE(u.full_name, 'Unknown') as description
        FROM transactions t
        JOIN users u ON t.user_id = u.user_id
        ORDER BY t.created_at DESC LIMIT 10
    ");
    $response['recent_transactions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    json_response($response, "Admin dashboard loaded successfully");
} catch (PDOException $e) {
    json_response(null, "Database error: " . $e->getMessage(), 500);
}
?>
