<?php
// api/migrate_files_to_blob.php  (شغّله مرة وحده ثم احذفه)
require __DIR__.'/config.php';

// غيّر اسم الجدول/الأعمدة حسب وضعك الحالي:
$stmt = $pdo->query("SELECT id, path, `date`, group_id FROM Photos WHERE path IS NOT NULL");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$ins = $pdo->prepare("INSERT INTO Photos (filename, content_type, bytes, `date`, group_id)
                      VALUES (?, ?, ?, ?, ?)");

$finfo = new finfo(FILEINFO_MIME_TYPE);
$ok = 0; $fail = 0;

foreach ($rows as $r) {
  $full = dirname(__DIR__) . '/' . ltrim($r['path'], '/'); // حوّل لمسار فعلي حسب تخطيطك القديم
  if (!is_file($full)) { $fail++; continue; }
  $bytes = file_get_contents($full);
  $mime  = $finfo->file($full) ?: 'application/octet-stream';
  $fn    = basename($full);
  try {
    $ins->execute([$fn, $mime, $bytes, $r['date'], $r['group_id']]);
    $ok++;
  } catch(Throwable $e){ $fail++; }
}

echo json_encode(['migrated'=>$ok, 'missing'=>$fail]);
