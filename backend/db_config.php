<?php
$host = '127.0.0.1';
$db   = 'unifund_db'; // Matches setup.sql
$user = 'root';
$pass = ''; // Default XAMPP/MAMP is empty. If using MAMP Pro or custom, set 'root'.
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // Return JSON error if connection fails, helpful for frontend debugging
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}
?>
