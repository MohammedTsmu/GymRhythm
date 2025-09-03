<?php
require __DIR__ . '/config.php';
$date = $_POST['date'] ?? '';
$plan = $_POST['plan'] ?? '';
if (!$date || !$plan) { echo json_encode(['ok'=>false]); exit; }
$sql = "INSERT INTO Workouts(date,plan) VALUES(?,?)
        ON DUPLICATE KEY UPDATE plan=VALUES(plan)";
$stmt = $pdo->prepare($sql);
$stmt->execute([$date, $plan]);
echo json_encode(['ok'=>true]);
