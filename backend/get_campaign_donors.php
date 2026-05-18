<?php
// Headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db_config.php';

$campaign_id = $_GET['campaign_id'] ?? null;

if (!$campaign_id) {
    http_response_code(400);
    echo json_encode(["message" => "Campaign ID required"]);
    exit;
}

// Fix: Correct column names based on schema
// users: user_id
// donations: donation_amount, donor_message, donated_at
$query = "SELECT 
            u.full_name as donor_name,
            u.email as donor_email, 
            t.amount as amount,
            t.created_at as date,
            td.message as message
          FROM txn_donations td
          JOIN transactions t ON td.transaction_id = t.transaction_id
          JOIN users u ON t.user_id = u.user_id
          WHERE td.campaign_id = ? 
          ORDER BY t.created_at DESC";

try {
    $stmt = $pdo->prepare($query);
    $stmt->execute([$campaign_id]);
    $donors = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($donors);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["message" => "Database error: " . $e->getMessage()]);
}
