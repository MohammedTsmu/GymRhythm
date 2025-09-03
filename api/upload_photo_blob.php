<?php
// api/upload_photo_blob.php
require __DIR__ . '/config.php';

// تحقق من الملف
if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
  http_response_code(400);
  echo json_encode(['ok'=>false,'msg'=>'upload error']);
  exit;
}

$f = $_FILES['photo'];

// تحديد حدود الحجم (مثلاً 5MB)
$maxBytes = 5 * 1024 * 1024;
if ($f['size'] > $maxBytes) {
  http_response_code(413);
  echo json_encode(['ok'=>false,'msg'=>'file too large']);
  exit;
}

// اسم الملف الأصلي + نوع المحتوى
$origName = basename($f['name']);
$tmpPath  = $f['tmp_name'];

// تحقق من النوع عبر finfo (لا تعتمد فقط على Content-Type القادم من العميل)
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime  = $finfo->file($tmpPath);
$allowed = ['image/jpeg','image/png','image/webp'];
if (!in_array($mime, $allowed, true)) {
  http_response_code(415);
  echo json_encode(['ok'=>false,'msg'=>'unsupported type']);
  exit;
}

// اقرأ بيانات الصورة إلى باينري
$bytes = file_get_contents($tmpPath);

// تاريخ (اختياري)
$date = isset($_POST['date']) && $_POST['date'] ? $_POST['date'] : null;

// إدراج داخل DB (PDO + LOB)
$sql = "INSERT INTO Photos (filename, content_type, bytes, `date`, group_id)
        VALUES (:fn, :ct, :bytes, :d, :gid)";
$stmt = $pdo->prepare($sql);
$stmt->bindValue(':fn', $origName, PDO::PARAM_STR);
$stmt->bindValue(':ct', $mime, PDO::PARAM_STR);
$stmt->bindValue(':bytes', $bytes, PDO::PARAM_LOB);   // ← مهم
$stmt->bindValue(':d', $date);
$stmt->bindValue(':gid', isset($_POST['group_id']) ? $_POST['group_id'] : null);
$stmt->execute();

echo json_encode(['ok'=>true, 'id'=>$pdo->lastInsertId()]);
