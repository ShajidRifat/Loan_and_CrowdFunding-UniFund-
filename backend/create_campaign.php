<?php
// Headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

require_once 'db_config.php';

$data = json_decode(file_get_contents("php://input"));

if (
    !empty($data->studentId) &&
    !empty($data->title) && 
    !empty($data->goal_amount) &&
    !empty($data->end_date) &&
    !empty($data->category_id)
) {
    if ($data->end_date < date('Y-m-d')) {
        http_response_code(400);
        echo json_encode(["message" => "Deadline cannot be in the past"]);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // 1. Resolve Status ID (Draft)
        // In the 3NF schema, campaign statuses are 'draft', 'active', 'completed', 'rejected'.
        $stmt = $pdo->prepare("SELECT status_id FROM campaign_statuses WHERE status_name = 'draft'");
        $stmt->execute();
        $status_id = $stmt->fetchColumn();

        if (!$status_id) throw new Exception("Invalid Status");

        // 2. Insert Campaign
        $stmt = $pdo->prepare("INSERT INTO campaigns (
            student_id, 
            category_id,
            status_id,
            title, 
            description, 
            goal_amount, 
            start_date,
            end_date
        ) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?)"); // slug removed, status_id added
        
        if ($stmt->execute([
            $data->studentId,
            $data->category_id,
            $status_id,
            $data->title,
            $data->description ?? '',
            $data->goal_amount,
            $data->end_date
        ])) {
            $id = $pdo->lastInsertId();
            $pdo->commit();
            http_response_code(201);
            echo json_encode(["message" => "Campaign created successfully", "campaign_id" => $id]);
        } else {
            throw new Exception("Unable to create campaign");
        }
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["message" => "Error: " . $e->getMessage()]);
    }
} else {
    http_response_code(400);
    echo json_encode(["message" => "Incomplete data"]);
}
?>
