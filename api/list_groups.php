<?php
require __DIR__ . '/config.php';
$stmt = $pdo->query("SELECT id,name,COALESCE(note,'') note FROM PhotoGroups ORDER BY id DESC");
echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()]);
