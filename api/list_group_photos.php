<?php
require __DIR__ . '/config.php';
$gid = (int)($_GET['group_id'] ?? 0);
$sql = $gid ? "WHERE p.group_id=?" : "";
$stmt = $gid
  ? $pdo->prepare("SELECT p.id,p.date,p.path FROM Photos p $sql ORDER BY p.date, p.id")
  : $pdo->query("SELECT p.id,p.date,p.path FROM Photos p ORDER BY p.date, p.id");
if ($gid) $stmt->execute([$gid]);
echo json_encode(['ok'=>true,'data'=>$gid?$stmt->fetchAll():$stmt->fetchAll()]);
