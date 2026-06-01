<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_config.php';

try {
    // Fetch active campaigns with student details and stats
    $query = "
        SELECT 
            c.campaign_id,
            c.campaign_id as id,
            c.student_id,
            c.title,
            c.description,
            c.category_id,
            c.goal_amount,
            c.image_url,
            s.raised_amount,
            s.donor_count,
            c.end_date as deadline,
            stat.status_name as status,
            c.created_at,
            u.full_name as student_name, 
            sp.major,
            sp.university,
            cat.category_name as category,
            COALESCE(AVG(cr.rating_stars), 0) as average_rating,
            COUNT(cr.rating_id) as rating_count
        FROM campaigns c
        JOIN users u ON c.student_id = u.user_id
        JOIN campaign_statuses stat ON c.status_id = stat.status_id
        LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
        LEFT JOIN campaign_categories cat ON c.category_id = cat.category_id
        LEFT JOIN vw_campaign_stats_pure s ON c.campaign_id = s.campaign_id
        LEFT JOIN campaign_ratings cr ON c.campaign_id = cr.campaign_id
        WHERE stat.status_name = 'active'
        AND s.raised_amount < c.goal_amount
        GROUP BY c.campaign_id
        ORDER BY c.created_at DESC
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $campaigns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($campaigns);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["message" => "Database error: " . $e->getMessage()]);
}
?>
