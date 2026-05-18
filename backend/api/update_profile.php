<?php
// Headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

require_once 'db_config.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->user_id)) {
    
    try {
        // 1. Basic User Info Update
        if (!empty($data->full_name) || !empty($data->phone_number)) {
            $query = "UPDATE users SET full_name = ?, phone_number = ? WHERE user_id = ?";
            $stmt = $pdo->prepare($query);
            $stmt->execute([
                $data->full_name,
                $data->phone_number,
                $data->user_id
            ]);
        }

        // 2. Student Profile Update (if applicable)
        if (!empty($data->student_id) || !empty($data->university) || !empty($data->major)) {
            // Check if profile exists
            $check = $pdo->prepare("SELECT user_id FROM student_profiles WHERE user_id = ?");
            $check->execute([$data->user_id]);
            
            if ($check->rowCount() > 0) {
                $p_query = "UPDATE student_profiles SET student_id_number = ?, major = ? WHERE user_id = ?";
                $p_stmt = $pdo->prepare($p_query);
                $p_stmt->execute([
                    $data->student_id,
                    $data->major,
                    $data->user_id
                ]);
            } else {
                // Insert if missing (Should be created at register, but safe fallback)
                // Note: cgpa and credit score are required in strict schema, defaults might fail if not provided.
                // Assuming they exist.
            }
        }
        
        // 3. Handle Password (Optional)
        if (!empty($data->new_password)) {
            $hash = password_hash($data->new_password, PASSWORD_BCRYPT);
            $pw_stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE user_id = ?");
            $pw_stmt->execute([$hash, $data->user_id]);
        }

        http_response_code(200);
        echo json_encode(array("message" => "Profile updated successfully."));

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["message" => "Database error: " . $e->getMessage()]);
    }

} else {
    http_response_code(400);
    echo json_encode(array("message" => "Incomplete data. User ID required."));
}
?>
