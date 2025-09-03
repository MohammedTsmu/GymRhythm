<?php
require __DIR__ . '/config.php';
$date = $_POST['date'] ?? '';
$note = trim($_POST['note'] ?? '');
if (!$date) { echo json_encode(['ok'=>false,'msg'=>'date required']); exit; }

$stmt = $pdo->prepare("INSERT INTO Logs(date,done,note) VALUES(?,?,?)");
$stmt->execute([$date, 1, $note]);
echo json_encode(['ok'=>true]);
