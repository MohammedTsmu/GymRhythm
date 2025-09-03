<?php
require __DIR__ . '/config.php';
$name = trim($_POST['name'] ?? '');
$note = trim($_POST['note'] ?? '');
if ($name==='') { echo json_encode(['ok'=>false,'msg'=>'name required']); exit; }
$stmt = $pdo->prepare("INSERT INTO PhotoGroups(name,note) VALUES(?,?)");
$stmt->execute([$name,$note]);
echo json_encode(['ok'=>true,'id'=>$pdo->lastInsertId()]);
