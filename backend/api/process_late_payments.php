<?php
// api/cron/process_late_payments.php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

date_default_timezone_set('Asia/Dhaka');
require_once __DIR__ . '/../db_config.php';
require_once __DIR__ . '/../core/ScoreEngine.php';

try {
    $response = [];
    $penaltiesApplied = 0;

    // Fetch all unpaid installments whose due dates are in the past
    $stmt = $pdo->query(
        "SELECT li.installment_id as id, l.student_id as user_id, li.due_date, li.score_penalty_status
         FROM loan_installments li
         JOIN loans l ON li.loan_id = l.loan_id
         WHERE li.due_date < CURDATE()
           AND li.installment_id NOT IN (SELECT installment_id FROM txn_repayments)"
    );
    $installments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($installments as $inst) {
        $dueDate = new DateTime($inst['due_date']);
        $today   = new DateTime();
        $days    = $today->diff($dueDate)->days;

        $status  = $inst['score_penalty_status'];
        $sid     = (int)$inst['user_id'];
        $iid     = (int)$inst['id'];

        // Bracket 1: Day 1 — fire once only
        if ($days >= 1 && $status === 'none') {
            ScoreEngine::applyEvent($sid, 'EVT_04', 'cron_late_payment', $pdo);
            $pdo->prepare("UPDATE loan_installments SET score_penalty_status = 'EVT_04_applied' WHERE installment_id = ?")->execute([$iid]);
            $penaltiesApplied++;
        }
        // Bracket 2: Day 8 — fire once only
        elseif ($days >= 8 && $status === 'EVT_04_applied') {
            ScoreEngine::applyEvent($sid, 'EVT_05', 'cron_late_payment', $pdo);
            $pdo->prepare("UPDATE loan_installments SET score_penalty_status = 'EVT_05_applied' WHERE installment_id = ?")->execute([$iid]);
            $penaltiesApplied++;
        }
        // Bracket 3: Day 30+ — fire once only
        elseif ($days >= 30 && $status === 'EVT_05_applied') {
            ScoreEngine::applyEvent($sid, 'EVT_06', 'cron_late_payment', $pdo);
            $pdo->prepare("UPDATE loan_installments SET score_penalty_status = 'EVT_06_applied' WHERE installment_id = ?")->execute([$iid]);
            $penaltiesApplied++;
        }
    }

    echo json_encode([
        "success" => true,
        "message" => "Late payment processing completed.",
        "penalties_applied" => $penaltiesApplied
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error processing late payments: " . $e->getMessage()
    ]);
}
?>
