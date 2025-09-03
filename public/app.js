// ================== الإعدادات ==================
const API = (p) => `../api/${p}`; // يعمل عندما تفتح من http://localhost/<folder>/public/

// ================== Utilities ==================
async function postJSON(url, obj) {
  const res = await fetch(url, {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
    body: new URLSearchParams(obj).toString()
  });
  return await res.json();
}
async function postForm(url, data) {
  const res = await fetch(url, { method:'POST', body: data });
  return await res.json();
}
function colorFor(plan, done){
  if (done) return '#22c55e';      // أخضر = تم التنفيذ
  if (plan==='Off') return '#64748b'; // رمادي
  return '#60a5fa';                // أزرق
}

// ================== Calendar/Data ==================
let calendar, statsChart;

async function loadCalendarEvents(info, success, failure){
  try {
    const res = await fetch(API('calendar_events.php') + `?start=${info.startStr}&end=${info.endStr}`);
    const json = await res.json();
    if (!json.ok) return failure && failure('api error');
    const events = json.data.map(e=>({
      id: e.date,
      title: e.plan + (e.done ? ' ✓' : ''),
      start: e.date,
      allDay: true,
      backgroundColor: colorFor(e.plan, e.done),
      borderColor: colorFor(e.plan, e.done)
    }));
    success(events);
  } catch (e) { failure && failure(e.message); }
}

async function refreshStats(){
  try {
    const res = await fetch(API('stats_summary.php'));
    const json = await res.json();
    if (!json.ok) return;
    const ctx = document.getElementById('statsCanvas');
    if (statsChart) statsChart.destroy();
    statsChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['On','Off','تمّ التنفيذ'],
        datasets: [{ data: [json.on, json.off, json.done] }]
      }
    });
  } catch(err){ console.warn('stats error', err); }
}

function openDayModal(dateStr, plan){
  document.getElementById('dayDate').value = dateStr;
  document.getElementById('dayPlan').value = plan || 'On';
  new bootstrap.Modal('#dayModal').show();
}

// ================== Quick actions ==================
function wireGenerate(){
  const btn = document.getElementById('btnGenerate');
  if (!btn) return;
  btn.addEventListener('click', async ()=>{
    const y = document.getElementById('year').value;
    const m = document.getElementById('month').value;
    const startOn = document.getElementById('startOn').checked ? 1 : 0;
    const json = await postJSON(API('generate_onoff.php'), {year:y, month:m, startOn});
    document.getElementById('genMsg').textContent = json.ok ? 'تم ✅' : ('خطأ: ' + (json.msg||''));
    calendar.refetchEvents();
    refreshStats();
  });
}

function wireQuickLog(){
  const btn = document.getElementById('btnLog');
  if (!btn) return;
  btn.addEventListener('click', async ()=>{
    const d = document.getElementById('logDate').value;
    const note = document.getElementById('logNote').value;
    if (!d) return alert('اختر التاريخ');
    const json = await postJSON(API('log_day.php'), { date:d, note });
    document.getElementById('logMsg').textContent = json.ok ? 'تم التسجيل ✓' : ('خطأ: ' + (json.msg||''));
    if (json.ok) { calendar.refetchEvents(); refreshStats(); }
  });
}

function wirePhotoUpload(){
  const btn = document.getElementById('btnSavePhoto');
  if (!btn) return;
  btn.addEventListener('click', async ()=>{
    const inp = document.getElementById('photoFile');
    if (!inp?.files?.length) return alert('اختر صورة');
    const fd = new FormData();
    fd.append('photo', inp.files[0]);
    fd.append('date', new Date().toISOString().slice(0,10));
    const json = await postForm(API('upload_photo.php'), fd);
    document.getElementById('photoMsg').textContent =
      json.ok ? ('حُفظت: ' + json.path) : ('خطأ: ' + (json.msg||''));    
    if (json.ok) loadGallery();
  });
}

// ================== Gallery ==================
async function loadGallery(){
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  const res = await fetch(API('list_photos.php'));
  const json = await res.json();
  grid.innerHTML = '';
  if (json.ok && json.data.length){
    json.data.forEach(item=>{
      const col = document.createElement('div');
      col.className = 'col-6 col-md-4 col-lg-3';
      col.innerHTML = `
        <div class="card p-1" style="background:#111827">
          <img src="../${item.path}" class="img-fluid rounded" alt="">
          <div class="small text-muted mt-1">${item.date}</div>
        </div>`;
      grid.appendChild(col);
    });
  } else {
    grid.innerHTML = '<div class="text-muted">لا توجد صور بعد.</div>';
  }
}

// ================== Bootstrap Calendar wiring ==================
document.addEventListener('DOMContentLoaded', ()=>{
  wireGenerate();
  wireQuickLog();
  wirePhotoUpload();

  calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
    initialView: 'dayGridMonth',
    firstDay: 6, // السبت
    locale: 'ar',
    height: 'auto',
    events: loadCalendarEvents,
    dateClick: (info)=> openDayModal(info.dateStr, 'On'),
    eventClick: async (info)=>{
      const date = info.event.startStr;
      const json = await postJSON(API('toggle_done.php'), {date});
      if (json.ok){ calendar.refetchEvents(); refreshStats(); }
    }
  });
  calendar.render();

  refreshStats();
  loadGallery();
});
