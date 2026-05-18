<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_config.php';

$user_id = isset($_GET['user_id']) ? $_GET['user_id'] : die();

try {
    $stmt = $pdo->prepare("
        SELECT 
            c.*, 
            stat.status_name as status,
            cat.category_name as category,
            COALESCE(s.raised_amount, 0) as raised_amount,
            COALESCE(s.donor_count, 0) as donor_count,
            DATEDIFF(c.end_date, CURDATE()) as days_left
        FROM campaigns c
        JOIN campaign_statuses stat ON c.status_id = stat.status_id
        JOIN campaign_categories cat ON c.category_id = cat.category_id
        LEFT JOIN vw_campaign_stats_pure s ON c.campaign_id = s.campaign_id
        WHERE c.student_id = ? 
        ORDER BY c.created_at DESC
    ");
    $stmt->execute([$user_id]);
    $campaigns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($campaigns);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
