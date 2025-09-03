<?php
require __DIR__ . '/config.php';
$stmt = $pdo->query("SELECT id, date, path, COALESCE(note,'') AS note
                     FROM Photos ORDER BY date DESC, id DESC LIMIT 200");
echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()]);
