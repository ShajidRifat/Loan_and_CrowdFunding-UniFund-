<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once 'db_config.php';

$data = json_decode(file_get_contents("php://input"));

if (
    empty($data->campaign_id) ||
    empty($data->donor_id) ||
    empty($data->rating) ||
    !isset($data->comment)
) {
    http_response_code(400);
    echo json_encode(["message" => "Incomplete data"]);
    exit;
}

$campaign_id = $data->campaign_id;
$donor_id = $data->donor_id;
$stars = $data->rating;
$comment = $data->comment;

if ($stars < 1 || $stars > 5) {
    http_response_code(400);
    echo json_encode(["message" => "Rating must be between 1 and 5"]);
    exit;
}

try {
    // Check if campaign is active
    $stmt = $pdo->prepare("SELECT status_id FROM campaigns WHERE campaign_id = ?");
    $stmt->execute([$campaign_id]);
    $status_id = $stmt->fetchColumn();

    // Fetch Active Status ID
    $stmt = $pdo->prepare("SELECT status_id FROM campaign_statuses WHERE status_name = 'active'");
    $stmt->execute();
    $active_id = $stmt->fetchColumn();

    if ($status_id != $active_id) {
        http_response_code(403);
        echo json_encode(["message" => "Campaign is not active"]);
        exit;
    }

    // Check if user already rated this campaign
    $stmt = $pdo->prepare("SELECT rating_id FROM campaign_ratings WHERE campaign_id = ? AND donor_id = ?");
    $stmt->execute([$campaign_id, $donor_id]);
    
    if ($stmt->rowCount() > 0) {
        // User already rated
        http_response_code(400);
        echo json_encode(["message" => "You have already rated this campaign."]);
        exit;
    } else {
        // Insert new rating
        $stmt = $pdo->prepare("INSERT INTO campaign_ratings (campaign_id, donor_id, rating_stars, review_comment) VALUES (?, ?, ?, ?)");
        $stmt->execute([$campaign_id, $donor_id, $stars, $comment]);
        $message = "Rating submitted successfully";
    }

    echo json_encode(["message" => $message]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["message" => "Database error: " . $e->getMessage()]);
}
?>
