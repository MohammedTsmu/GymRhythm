<?php
require __DIR__ . '/config.php';
$stmt = $pdo->query("SELECT date, plan, COALESCE(note,'') AS note FROM Workouts ORDER BY date DESC LIMIT 10");
echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()]);
