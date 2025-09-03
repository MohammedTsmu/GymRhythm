<?php
require __DIR__ . '/config.php';
$start = $_GET['start'] ?? date('Y-m-01');
$end   = $_GET['end']   ?? date('Y-m-t');

$sql = "SELECT w.date, w.plan,
        EXISTS(SELECT 1 FROM Logs l WHERE l.date=w.date AND l.done=1) AS done
        FROM Workouts w
        WHERE w.date BETWEEN ? AND ?
        ORDER BY w.date";
$stmt = $pdo->prepare($sql);
$stmt->execute([$start, $end]);
echo json_encode(['ok'=>true,'data'=>$stmt->fetchAll()]);
