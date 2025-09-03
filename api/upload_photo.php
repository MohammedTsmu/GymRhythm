<?php
require __DIR__ . '/config.php';

/* متطلبات PHP الرسمية للرفع:
   - نقرأ $_FILES
   - نتحقق من UPLOAD_ERR_OK
   - ننقل الملف بـ move_uploaded_file إلى مجلد داخل الموقع
   - نُدخل المسار في جدول Photos
*/
if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
  echo json_encode(['ok'=>false,'msg'=>'upload failed','code'=>$_FILES['photo']['error'] ?? -1]);
  exit;
}

$date = $_POST['date'] ?? date('Y-m-d');
$note = trim($_POST['note'] ?? 'progress');

$ext = pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION);
$filename = $date . '-' . bin2hex(random_bytes(8)) . '.' . strtolower($ext);

$targetDir = __DIR__ . '/../uploads/photos/';
if (!is_dir($targetDir)) { mkdir($targetDir, 0777, true); }

$targetPath = $targetDir . $filename;
if (!move_uploaded_file($_FILES['photo']['tmp_name'], $targetPath)) {
  echo json_encode(['ok'=>false,'msg'=>'move_uploaded_file failed']);
  exit;
}

$relPath = 'uploads/photos/' . $filename;
$stmt = $pdo->prepare("INSERT INTO Photos(date,path,note) VALUES(?,?,?)");
$stmt->execute([$date, $relPath, $note]);

echo json_encode(['ok'=>true,'path'=>$relPath]);
