<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once 'db_config.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        // List Users with readable Roles and Statuses
        $stmt = $pdo->query("
            SELECT u.user_id as id, u.full_name, u.email, 
                   r.role_name as role, s.status_name as status, 
                   u.created_at
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            JOIN user_statuses s ON u.status_id = s.status_id
            ORDER BY u.created_at DESC
        ");
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($users);
    } 
    elseif ($method === 'POST') {
        // Create User (Admin)
        $data = json_decode(file_get_contents("php://input"));
        
        if (!empty($data->name) && !empty($data->email) && !empty($data->role) && !empty($data->password)) {
            // Check email
            $check = $pdo->prepare("SELECT user_id FROM users WHERE email = ?");
            $check->execute([$data->email]);
            if ($check->rowCount() > 0) {
                http_response_code(400);
                echo json_encode(["message" => "Email already exists"]);
                exit;
            }

            $pdo->beginTransaction();

            // Resolve lookup IDs
            $stmt = $pdo->prepare("SELECT role_id FROM roles WHERE role_name = ?");
            $stmt->execute([$data->role]);
            $role_id = $stmt->fetchColumn();

            $stmt = $pdo->prepare("SELECT status_id FROM user_statuses WHERE status_name = 'active'");
            $stmt->execute();
            $status_id = $stmt->fetchColumn();

            if (!$role_id) throw new Exception("Invalid Role");

            $hash = password_hash($data->password, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("INSERT INTO users (full_name, email, password_hash, role_id, status_id) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$data->name, $data->email, $hash, $role_id, $status_id]);
            $user_id = $pdo->lastInsertId();

            // Create Profile
            if ($data->role === 'student') {
                $stmt = $pdo->prepare("INSERT INTO student_profiles (user_id, university, student_id_number, major, enrollment_year, current_cgpa) VALUES (?, '', '', '', YEAR(CURRENT_DATE), 0.00)");
                $stmt->execute([$user_id]);
            } elseif ($data->role === 'donor') {
                 $stmt = $pdo->prepare("SELECT donor_type_id FROM donor_types WHERE type_name = 'individual'");
                 $stmt->execute();
                 $dtype = $stmt->fetchColumn();
                 $stmt = $pdo->prepare("INSERT INTO donor_profiles (user_id, donor_type_id) VALUES (?, ?)");
                 $stmt->execute([$user_id, $dtype]);
            }

            $pdo->commit();

            http_response_code(201);
            echo json_encode(["message" => "User created successfully", "id" => $user_id]);
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Incomplete data"]);
        }
    }
    elseif ($method === 'PUT') {
        // Update Status
        $data = json_decode(file_get_contents("php://input"));
        
        if (!empty($data->id)) {
            if (!empty($data->status)) {
                // Resolve Status ID
                $stmt = $pdo->prepare("SELECT status_id FROM user_statuses WHERE status_name = ?");
                $stmt->execute([$data->status]);
                $status_id = $stmt->fetchColumn();

                if ($status_id) {
                    $stmt = $pdo->prepare("UPDATE users SET status_id = ? WHERE user_id = ?");
                    $stmt->execute([$status_id, $data->id]);
                }
            }
            echo json_encode(["message" => "User updated successfully"]);
        } else {
            http_response_code(400);
            echo json_encode(["message" => "User ID required"]);
        }
    }
    elseif ($method === 'DELETE') {
        // Soft Delete -> Ban (since Strict 3NF usually avoids raw deletes, or we map to 'banned' status)
        $id = isset($_GET['id']) ? $_GET['id'] : null;
        if ($id) {
             // Find 'banned' status_id
             $stmt = $pdo->prepare("SELECT status_id FROM user_statuses WHERE status_name = 'banned'");
             $stmt->execute();
             $banned_id = $stmt->fetchColumn();

             $stmt = $pdo->prepare("UPDATE users SET status_id = ? WHERE user_id = ?");
             if ($stmt->execute([$banned_id, $id])) {
                echo json_encode(["message" => "User banned successfully"]);
             } else {
                http_response_code(503);
                echo json_encode(["message" => "Unable to ban user"]);
             }
        } else {
            http_response_code(400);
            echo json_encode(["message" => "User ID required"]);
        }
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["message" => "Error: " . $e->getMessage()]);
}
?>
