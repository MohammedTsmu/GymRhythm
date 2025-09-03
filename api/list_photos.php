<?php
// api/list_photos.php
require __DIR__.'/config.php';
$stmt = $pdo->query("SELECT id, `date` FROM Photos ORDER BY created_at DESC");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode(['ok'=>true, 'data'=>$rows]);
