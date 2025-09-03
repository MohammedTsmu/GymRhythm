<?php
require __DIR__ . '/config.php';
$date = $_POST['date'] ?? '';
if (!$date){ echo json_encode(['ok'=>false]); exit; }

$pdo->beginTransaction();
// هل هناك تنفيذ لليوم؟
$has = $pdo->prepare("SELECT id FROM Logs WHERE date=? AND done=1 LIMIT 1");
$has->execute([$date]);
$row = $has->fetch();

if ($row){ // احذفه (إلغاء التنفيذ)
  $del = $pdo->prepare("DELETE FROM Logs WHERE id=?");
  $del->execute([$row['id']]);
} else {   // أضف تنفيذ
  $ins = $pdo->prepare("INSERT INTO Logs(date,done,note) VALUES(?,1,'')");
  $ins->execute([$date]);
}
$pdo->commit();
echo json_encode(['ok'=>true]);
