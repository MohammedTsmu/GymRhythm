<?php
require __DIR__ . '/config.php';
$photoId = (int)($_POST['photo_id'] ?? 0);
$groupId = isset($_POST['group_id']) && $_POST['group_id']!=='' ? (int)$_POST['group_id'] : null;
if (!$photoId) { echo json_encode(['ok'=>false,'msg'=>'photo_id required']); exit; }
if ($groupId===null) {
  $stmt = $pdo->prepare("UPDATE Photos SET group_id=NULL WHERE id=?");
  $stmt->execute([$photoId]);
} else {
  $stmt = $pdo->prepare("UPDATE Photos SET group_id=? WHERE id=?");
  $stmt->execute([$groupId,$photoId]);
}
echo json_encode(['ok'=>true]);
