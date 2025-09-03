// ======== إعداد المسار المطلق (عدّل هنا فقط إن غيّرت اسم مجلدك) ========
const BASE_PATH = '/gymrhythm'; // <-- إن كان مجلدك gymrhythm تحت htdocs
const API = (p) => `${BASE_PATH}/api/${p}`;

// ======== أدوات مساعدة ========
async function postForm(url, data) {
  const res = await fetch(url, { method:'POST', body: data });
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { ok:false, msg:'Invalid JSON', raw:txt }; }
}
async function postJSON(url, obj) {
  const res = await fetch(url, {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
    body: new URLSearchParams(obj).toString()
  });
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { ok:false, msg:'Invalid JSON', raw:txt }; }
}

function colorFor(plan, done){
  if (done) return '#22c55e';          // أخضر = تم التنفيذ
  if (plan === 'Off') return '#64748b'; // رمادي
  return '#60a5fa';                     // أزرق
}

async function loadCalendarEvents(info, success, failure){
  const url = API(`calendar_events.php?start=${info.startStr}&end=${info.endStr}`);
  console.log('[GET]', url);
  try {
    const res = await fetch(url);
    const txt = await res.text();
    let json;
    try { json = JSON.parse(txt); } catch { throw new Error('Invalid JSON: ' + txt); }
    if (!json.ok) throw new Error('API error');
    const events = json.data.map(e=>({
      id: e.date,
      title: e.plan + (e.done ? ' ✓' : ''),
      start: e.date,
      allDay: true,
      backgroundColor: colorFor(e.plan, e.done),
      borderColor: colorFor(e.plan, e.done)
    }));
    success(events);
  } catch (err) {
    console.error('calendar_events failed:', err);
    failure && failure(err.message);
  }
}

let calendar, statsChart;
async function refreshStats(){
  const url = API('stats_summary.php');
  console.log('[GET]', url);
  try {
    const res = await fetch(url);
    const txt = await res.text();
    const json = JSON.parse(txt);
    if (!json.ok) throw new Error('API error');
    const ctx = document.getElementById('statsCanvas');
    if (statsChart) statsChart.destroy();
    statsChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels: ['On','Off','تمّ التنفيذ'], datasets: [{ data: [json.on, json.off, json.done] }] }
    });
  } catch (e) {
    console.error('stats_summary failed:', e);
    const c = document.getElementById('statsCanvas');
    if (c) c.parentElement.insertAdjacentHTML('beforeend', '<div class="text-warning small mt-2">تعذر جلب الإحصاءات</div>');
  }
}

function openDayModal(dateStr, plan){
  document.getElementById('dayDate').value = dateStr;
  document.getElementById('dayPlan').value = plan || 'On';
  new bootstrap.Modal('#dayModal').show();
}

document.addEventListener('DOMContentLoaded', ()=>{
  // زر توليد الشهر
  document.getElementById('btnGenerate')?.addEventListener('click', async ()=>{
    const y = document.getElementById('year').value;
    const m = document.getElementById('month').value;
    const startOn = document.getElementById('startOn').checked ? 1 : 0;
    const url = API('generate_onoff.php');
    console.log('[POST]', url, {year:y, month:m, startOn});
    const json = await postJSON(url, {year:y, month:m, startOn});
    console.log('generate_onoff response:', json);
    document.getElementById('genMsg').textContent = json.ok ? 'تم ✅' : ('خطأ: ' + (json.msg || json.raw || ''));
    calendar.refetchEvents();
    refreshStats();
  });

  // تسجيل تنفيذ اليوم (اختياري من تبويب الإجراءات السريعة)
  document.getElementById('btnLog')?.addEventListener('click', async ()=>{
    const d = document.getElementById('logDate').value;
    const note = document.getElementById('logNote').value;
    const url = API('log_day.php');
    console.log('[POST]', url, {date:d, note});
    const json = await postJSON(url, {date:d, note});
    console.log('log_day response:', json);
    document.getElementById('logMsg').textContent = json.ok ? 'تم التسجيل ✓' : ('خطأ: ' + (json.msg || json.raw || ''));
    calendar.refetchEvents();
    refreshStats();
  });

  // رفع صورة التقدّم
  document.getElementById('btnSavePhoto')?.addEventListener('click', async ()=>{
    const inp = document.getElementById('photoFile');
    if (!inp.files?.length) return alert('اختر صورة');
    const fd = new FormData();
    fd.append('photo', inp.files[0]);
    fd.append('date', new Date().toISOString().slice(0,10));
    const url = API('upload_photo.php');
    console.log('[POST]', url, 'FormData{photo,date}');
    const json = await postForm(url, fd);
    console.log('upload_photo response:', json);
    document.getElementById('photoMsg').textContent = json.ok ? ('حُفظت: ' + json.path) : ('خطأ: ' + (json.msg || json.raw || ''));
  });

  // التقويم
  calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
    initialView: 'dayGridMonth',
    firstDay: 6,
    locale: 'ar',
    height: 'auto',
    events: loadCalendarEvents,
    dateClick: (info)=> openDayModal(info.dateStr, 'On'),
    eventClick: async (info)=>{
      const date = info.event.startStr;
      const url = API('toggle_done.php');
      console.log('[POST]', url, {date});
      const json = await postJSON(url, {date});
      console.log('toggle_done response:', json);
      if (json.ok){ calendar.refetchEvents(); refreshStats(); }
    }
  });
  calendar.render();
  refreshStats();
});
