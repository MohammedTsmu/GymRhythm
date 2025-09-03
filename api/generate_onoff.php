<?php
require __DIR__ . '/config.php';
$year   = (int)($_POST['year']   ?? 0);
$month  = (int)($_POST['month']  ?? 0);
$startOn= isset($_POST['startOn']) ? (bool)$_POST['startOn'] : true;

if (!$year || !$month) { echo json_encode(['ok'=>false,'msg'=>'invalid y/m']); exit; }

// ادخل سطر في Schedules (اختياري)
$stmt = $pdo->prepare("INSERT INTO Schedules(year,month,type,meta) VALUES(?,?, 'ONOFF', NULL)");
$stmt->execute([$year,$month]);

$daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month, $year);
$on = $startOn ? 1 : 0;

$pdo->beginTransaction();
$ins = $pdo->prepare("INSERT INTO Workouts(date,plan,note) VALUES(?,?,?) ON DUPLICATE KEY UPDATE plan=VALUES(plan), note=VALUES(note)");
for ($d=1; $d <= $daysInMonth; $d++){
  $date = sprintf("%04d-%02d-%02d", $year, $month, $d);
  $plan = $on ? 'On' : 'Off';
  $ins->execute([$date, $plan, '']);
  $on = 1 - $on;
}
$pdo->commit();

echo json_encode(['ok'=>true, 'msg'=>'generated']);
