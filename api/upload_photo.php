<?php
require __DIR__ . '/config.php';

// تأكد من إعدادات php.ini: upload_max_filesize, post_max_size, إلخ (إن لزم) 
// ثم استخدم move_uploaded_file (الطريقة الصحيحة لملفات الرفع).
// مراجع رسمية لآلية الرفع وسلوك move_uploaded_file: 
// - PHP manual (features.file-upload + move_uploaded_file)  :contentReference[oaicite:6]{index=6}

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
