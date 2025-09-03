<?php
// api/log_day.php
require __DIR__ . '/config.php';

// مدخلات
$date = trim($_POST['date'] ?? '');
$note = trim($_POST['note'] ?? '');

if (!$date) {
  echo json_encode(['ok'=>false,'msg'=>'date required']); exit;
}

try {
  $pdo->beginTransaction();

  // (اختياري) سجّل في جدول Logs إذا عندك الجدول
  // $stmt = $pdo->prepare("INSERT INTO Logs(date, note) VALUES(?, ?)");
  // $stmt->execute([$date, $note]);

  // علّم اليوم كتمّ التنفيذ في Workouts
  // يفترض وجود فهرس فريد على العمود date
  // إذا الصف غير موجود: يُدرِج plan='On' افتراضيًا + done=1 + note
  // إذا موجود: يحدّث done=1، ويحدث note فقط لو كانت المُدخلات غير فارغة
    $sql = "INSERT INTO Workouts(`date`, plan, done, note)
            VALUES(?, 'On', 1, ?)
            ON DUPLICATE KEY UPDATE
                done = 1,
                note = IF(VALUES(note) = '' OR VALUES(note) IS NULL, note, VALUES(note))";
            
  $stmt = $pdo->prepare($sql);
  $stmt->execute([$date, $note]);

  $pdo->commit();
  echo json_encode(['ok'=>true]);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['ok'=>false,'msg'=>$e->getMessage()]);
}
