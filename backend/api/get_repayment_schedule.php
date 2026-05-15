<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_config.php';

$loan_id = isset($_GET['loan_id']) ? $_GET['loan_id'] : null;

if (!$loan_id) {
    http_response_code(400);
    echo json_encode(["message" => "Loan ID required"]);
    exit;
}

try {
    // 1. Fetch Installments
    $stmt = $pdo->prepare("SELECT installment_id, loan_id, due_date, installment_amount FROM loan_installments WHERE loan_id = ? ORDER BY due_date ASC");
    $stmt->execute([$loan_id]);
    $installments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Calculate Status and Paid Amount Dynamically
    // 2. Calculate Status and Paid Amount Dynamically
    foreach ($installments as $key => &$inst) {
        $inst['installment_number'] = $key + 1; // Add installment number based on index
        $inst_id = $inst['installment_id'];
        
        // Sum repayments
        $sumStmt = $pdo->prepare("
            SELECT COALESCE(SUM(ABS(t.amount)), 0) 
            FROM transactions t 
            JOIN txn_repayments tr ON t.transaction_id = tr.transaction_id 
            WHERE tr.installment_id = ?
        ");
        $sumStmt->execute([$inst_id]);
        $amount_paid = (float)$sumStmt->fetchColumn();
        
        $inst['amount_paid'] = $amount_paid;
        $inst['amount_due'] = $inst['installment_amount'] - $amount_paid; // Remaining
        
        // Status Logic
        if ($amount_paid >= $inst['installment_amount']) {
            $inst['status'] = 'paid';
        } elseif ($amount_paid > 0) {
            $inst['status'] = 'partial';
        } elseif (strtotime($inst['due_date']) < time()) {
            $inst['status'] = 'overdue';
        } else {
            $inst['status'] = 'pending';
        }
    }

    echo json_encode(['schedule' => $installments]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["message" => "Database error: " . $e->getMessage()]);
}
?>
