<?php
// api/list_group_photos.php
require __DIR__.'/config.php';
$gid = isset($_GET['group_id']) ? (int)$_GET['group_id'] : 0;
$stmt = $pdo->prepare("SELECT id, `date` FROM Photos WHERE group_id = ? ORDER BY created_at DESC");
$stmt->execute([$gid]);
echo json_encode(['ok'=>true, 'data'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
