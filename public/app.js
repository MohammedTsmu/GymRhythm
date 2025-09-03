// ================== الإعدادات ==================
const API = (p) => `../api/${p}`; // إذا تفتح من http://localhost/<folder>/public/

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
  if (done) return '#22c55e';       // أخضر = تم التنفيذ
  if (plan==='Off') return '#64748b'; // رمادي
  return '#60a5fa';                 // أزرق
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
    if (json.ok) loadGalleryByGroup(); // حدّث المعرض
  });
}

// ================== Groups & Gallery ==================
let currentGroup = null;         // id أو null
let selectedForCompare = [];     // [path1, path2]

async function loadGroups(){
  const res = await fetch(API('list_groups.php'));
  const json = await res.json();
  const ul = document.getElementById('groupsList');
  ul.innerHTML = '';

  // عنصر "الكل"
  const all = document.createElement('li');
  all.className = 'list-group-item';
  all.style.background='#0b1220'; all.style.color='#e2e8f0';
  all.textContent = 'الكل';
  all.onclick = ()=>{ currentGroup=null; loadGalleryByGroup(); };
  ul.appendChild(all);

  json.data.forEach(g=>{
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.style.background = '#0b1220'; li.style.color='#e2e8f0';
    li.textContent = g.name;
    li.onclick = ()=>{ currentGroup = g.id; loadGalleryByGroup(); };
    ul.appendChild(li);
  });
}

async function addGroup(){
  const name = document.getElementById('grpName').value.trim();
  if (!name) return;
  const res = await postJSON(API('create_group.php'), {name});
  if (res.ok){ document.getElementById('grpName').value=''; loadGroups(); }
}

async function loadGalleryByGroup(){
  const grid = document.getElementById('galleryGrid');
  const url = currentGroup==null ? API('list_photos.php')
                                 : API('list_group_photos.php') + `?group_id=${currentGroup}`;
  const res = await fetch(url);
  const json = await res.json();
  grid.innerHTML = '';
  selectedForCompare = [];
  document.getElementById('btnCompare').disabled = true;

  (json.data || []).forEach(item=>{
    const col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg-3';
    col.innerHTML = `
      <div class="card p-1" style="background:#111827">
        <img src="../${item.path}" class="img-fluid rounded" alt="" draggable="true" data-photo-id="${item.id}">
        <div class="d-flex justify-content-between align-items-center mt-1">
          <div class="form-check">
            <input class="form-check-input selCompare" type="checkbox" data-path="../${item.path}">
          </div>
          <small class="text-muted">${item.date}</small>
        </div>
      </div>`;
    grid.appendChild(col);
  });

  // اختيار صورتين للمقارنة
  grid.querySelectorAll('.selCompare').forEach(chk=>{
    chk.addEventListener('change', ()=>{
      const p = chk.getAttribute('data-path');
      if (chk.checked) selectedForCompare.push(p);
      else selectedForCompare = selectedForCompare.filter(x=>x!==p);
      document.getElementById('btnCompare').disabled = (selectedForCompare.length!==2);
    });
  });

  // سحب الصورة إلى قائمة المجموعات لإسنادها
  grid.querySelectorAll('img[draggable="true"]').forEach(img=>{
    img.addEventListener('dragstart', (e)=>{
      e.dataTransfer.setData('text/plain', img.getAttribute('data-photo-id'));
    });
  });
  // تفعيل الإسقاط على عناصر المجموعات
  document.querySelectorAll('#groupsList .list-group-item').forEach(li=>{
    li.addEventListener('dragover', e=> e.preventDefault());
    li.addEventListener('drop', async (e)=>{
      e.preventDefault();
      const pid = e.dataTransfer.getData('text/plain');
      const isAll = li.textContent.trim()==='الكل';
      const gid = isAll ? '' : (await findGroupIdByName(li.textContent.trim()));
      const res = await postJSON(API('assign_photo.php'), { photo_id: pid, group_id: gid });
      if (res.ok) loadGalleryByGroup();
    });
  });
}

async function findGroupIdByName(name){
  const res = await fetch(API('list_groups.php'));
  const json = await res.json();
  const g = (json.data || []).find(x=>x.name===name);
  return g ? g.id : '';
}

// مقارنة قبل/بعد
function buildCompareSlider(imgA, imgB){
  const wrap = document.getElementById('compareWrap');
  wrap.innerHTML = `
    <div style="position:relative">
      <img id="cmpA" src="${imgA}" style="width:100%;display:block">
      <div id="cmpMask" style="position:absolute;top:0;left:0;width:50%;overflow:hidden">
        <img id="cmpB" src="${imgB}" style="width:100%;display:block">
      </div>
      <input id="cmpRange" type="range" min="0" max="100" value="50"
        style="position:absolute;left:0;right:0;bottom:10px;width:100%">
    </div>`;
  const mask = wrap.querySelector('#cmpMask');
  const range = wrap.querySelector('#cmpRange');
  range.addEventListener('input', ()=> { mask.style.width = range.value + '%'; });
}

// ================== Bootstrap & init ==================
document.addEventListener('DOMContentLoaded', ()=>{
  // quick actions + upload
  wireGenerate();
  wireQuickLog();
  wirePhotoUpload();

  // calendar
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

  // groups & gallery
  document.getElementById('btnAddGroup')?.addEventListener('click', addGroup);
  document.getElementById('btnCompare')?.addEventListener('click', ()=>{
    if (selectedForCompare.length!==2) return;
    buildCompareSlider(selectedForCompare[0], selectedForCompare[1]);
    new bootstrap.Modal('#compareModal').show();
  });

  refreshStats();
  loadGroups();
  loadGalleryByGroup();
});
