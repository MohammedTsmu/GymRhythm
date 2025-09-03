<?php
// api/photo_get.php
require __DIR__ . '/config.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) { http_response_code(400); exit; }

$stmt = $pdo->prepare("SELECT content_type, bytes FROM Photos WHERE id = ?");
$stmt->execute([$id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) { http_response_code(404); exit; }

$ct = $row['content_type'];
$bytes = $row['bytes'];

// أمان: امنع الـMIME sniffing
header('X-Content-Type-Options: nosniff');
header('Content-Type: ' . $ct);
header('Content-Length: ' . strlen($bytes));

// يمكن إضافة Cache-Control حسب الحاجة
// header('Cache-Control: public, max-age=31536000');

echo $bytes;
