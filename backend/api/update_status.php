<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once 'db_config.php';

$data = json_decode(file_get_contents("php://input"));

if (empty($data->type) || empty($data->id) || empty($data->status)) {
    http_response_code(400);
    echo json_encode(["message" => "Incomplete data"]);
    exit;
}

$id = $data->id;
$status = $data->status;
$type = $data->type;

try {
    if ($type === 'loan') {
        // Resolve Status ID
        $stmt = $pdo->prepare("SELECT status_id FROM loan_statuses WHERE status_name = ?");
        $stmt->execute([$status]);
        $status_id = $stmt->fetchColumn();

        if ($status_id) {
            $stmt = $pdo->prepare("UPDATE loans SET status_id = ? WHERE loan_id = ?");
            $stmt->execute([$status_id, $id]);

            // If status is 'approved' or 'active', generate installments if they don't exist
            if ($status === 'approved' || $status === 'active') {
                // Check if installments already exist
                $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM loan_installments WHERE loan_id = ?");
                $checkStmt->execute([$id]);
                if ($checkStmt->fetchColumn() == 0) {
                    // Fetch Loan Details
                    $loanStmt = $pdo->prepare("SELECT principal_amount, interest_rate, tenure_months, student_id FROM loans WHERE loan_id = ?");
                    $loanStmt->execute([$id]);
                    $loan = $loanStmt->fetch(PDO::FETCH_ASSOC);

                    if ($loan) {
                        $principal = $loan['principal_amount'];
                        $rate = $loan['interest_rate'];
                        $months = $loan['tenure_months'];

                        // Flat Initial Interest Calculation based on rate (5%)
                        $totalInterest = $principal * ($rate / 100);
                        $totalAmount = $principal + $totalInterest;
                        $monthlyInstallment = $totalAmount / $months;

                        // Insert Installments
                        $insertInst = $pdo->prepare("INSERT INTO loan_installments (loan_id, due_date, installment_amount) VALUES (?, ?, ?)");
                        
                        $startDate = new DateTime();
                        for ($i = 1; $i <= $months; $i++) {
                            $startDate->modify('+1 month');
                            $dueDate = $startDate->format('Y-m-d');
                            $insertInst->execute([$id, $dueDate, $monthlyInstallment]);
                        }
                        
                        // DISBURSE FUNDS: Record the payout transaction in the 3NF ledger
                        // 1. Create the master transaction record (+ amount means student received it)
                        $insertTxn = $pdo->prepare("INSERT INTO transactions (user_id, amount) VALUES (?, ?)");
                        $insertTxn->execute([$loan['student_id'], $principal]);
                        $transaction_id = $pdo->lastInsertId();

                        // 2. Link it as a disbursement subtype
                        $insertDisb = $pdo->prepare("INSERT INTO txn_disbursements (transaction_id, loan_id) VALUES (?, ?)");
                        $insertDisb->execute([$transaction_id, $id]);
                    }
                }
            }
        } else {
             throw new Exception("Invalid status name: $status");
        }
        
    } elseif ($type === 'campaign') {
        // Resolve Status ID
        $stmt = $pdo->prepare("SELECT status_id FROM campaign_statuses WHERE status_name = ?");
        $stmt->execute([$status]);
        $status_id = $stmt->fetchColumn();

        if ($status_id) {
            $stmt = $pdo->prepare("UPDATE campaigns SET status_id = ? WHERE campaign_id = ?");
            $stmt->execute([$status_id, $id]);
        } else {
             throw new Exception("Invalid status name: $status");
        }
    } else {
        throw new Exception("Invalid update type");
    }

    echo json_encode(["message" => ucfirst($type) . " updated successfully"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["message" => "Error: " . $e->getMessage()]);
}
?>
