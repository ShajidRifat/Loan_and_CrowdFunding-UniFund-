<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$events = [];

// Notifications have been completely disabled as per user request.
echo json_encode(['events' => $events, 'server_time' => date('Y-m-d H:i:s')]);
?>
