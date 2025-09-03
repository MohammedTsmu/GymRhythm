<?php
require __DIR__ . '/config.php';
$on  = (int)$pdo->query("SELECT COUNT(*) FROM Workouts WHERE plan<>'Off'")->fetchColumn();
$off = (int)$pdo->query("SELECT COUNT(*) FROM Workouts WHERE plan='Off'")->fetchColumn();
$done= (int)$pdo->query("SELECT COUNT(*) FROM Logs WHERE done=1 AND date>=DATE_SUB(CURDATE(), INTERVAL 30 DAY)")->fetchColumn();
echo json_encode(['ok'=>true,'on'=>$on,'off'=>$off,'done'=>$done]);
