// ================== إعداد مسارات الـAPI ==================
const API = (p) => `../api/${p}`;

// ================== Helpers ==================
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
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function colorFor(plan, done){
  const ON   = cssVar('--event-on')   || '#60a5fa';
  const OFF  = cssVar('--event-off')  || '#64748b';
  const DONE = cssVar('--event-done') || '#22c55e';
  if (done) return DONE;
  if (plan==='Off') return OFF;
  return ON;
}

// يجبر فول كالندر يعيد حساب الحجم بعد تغيّر الحاوية/التبويب
function fixCalendarLayout() {
  requestAnimationFrame(() => {
    try { calendar.updateSize(); } catch {}
  });
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
      borderColor:     colorFor(e.plan, e.done)
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
    const colors = [
      cssVar('--event-on')   || '#60a5fa',
      cssVar('--event-off')  || '#64748b',
      cssVar('--event-done') || '#22c55e'
    ];
    statsChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['On','Off','تمّ التنفيذ'],
        datasets: [{
          data: [json.on, json.off, json.done],
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1
        }]
      },
      options: { cutout: '60%' }
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
    fixCalendarLayout(); // تصحيح تمدّد التقويم بعد التوليد
  });
}

function wireQuickLog(){
  const btn = document.getElementById('btnLog');
  if (!btn) return;
  // تعبئة تاريخ اليوم افتراضيًا إن فارغ
  const d = document.getElementById('logDate');
  if (d && !d.value) d.value = new Date().toISOString().slice(0,10);

  btn.addEventListener('click', async ()=>{
    const d = document.getElementById('logDate').value;
    const note = document.getElementById('logNote').value;
    if (!d) return alert('اختر التاريخ');
    const json = await postJSON(API('log_day.php'), { date:d, note });
    document.getElementById('logMsg').textContent = json.ok ? 'تم التسجيل ✓' : ('خطأ: ' + (json.msg||''));
    if (json.ok) { calendar.refetchEvents(); refreshStats(); fixCalendarLayout(); }
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
    if (json.ok) { loadGalleryByGroup(); fixCalendarLayout(); }
  });
}

// حفظ اليوم من المودال
function wireDaySave(){
  const btn = document.getElementById('saveDay');
  if (!btn) return;
  btn.addEventListener('click', async ()=>{
    const date = document.getElementById('dayDate').value;
    const plan = document.getElementById('dayPlan').value;
    const json = await postJSON(API('upsert_workout.php'), { date, plan });
    if (json.ok){
      const modal = bootstrap.Modal.getInstance(document.getElementById('dayModal'));
      modal && modal.hide();
      calendar.refetchEvents();
      refreshStats();
      fixCalendarLayout();
    } else {
      alert('تعذّر الحفظ: ' + (json.msg || 'خطأ غير معروف'));
    }
  });
}

// ================== Groups & Gallery ==================
let currentGroup = null;
let selectedForCompare = [];

async function loadGroups(){
  const res = await fetch(API('list_groups.php'));
  const json = await res.json();
  const ul = document.getElementById('groupsList');
  ul.innerHTML = '';

  const all = document.createElement('li');
  all.className = 'list-group-item';
  all.textContent = 'الكل';
  all.onclick = ()=>{ currentGroup=null; loadGalleryByGroup(); };
  ul.appendChild(all);

  (json.data||[]).forEach(g=>{
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
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

async function findGroupIdByName(name){
  const res = await fetch(API('list_groups.php'));
  const json = await res.json();
  const g = (json.data||[]).find(x=>x.name===name);
  return g ? g.id : '';
}

async function loadGalleryByGroup(){
  const grid = document.getElementById('galleryGrid');
  const url = currentGroup==null ? API('list_photos.php')
                                 : API('list_group_photos.php') + `?group_id=${currentGroup}`;
  const res = await fetch(url);
  const json = await res.json();
  grid.innerHTML = '';
  selectedForCompare = [];
  const compareBtn = document.getElementById('btnCompare');
  if (compareBtn) compareBtn.disabled = true;

  (json.data||[]).forEach(item=>{
    const col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg-3';
    col.innerHTML = `
      <div class="card p-1" style="background:var(--surface);border:1px solid var(--border)">
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

  grid.querySelectorAll('.selCompare').forEach(chk=>{
    chk.addEventListener('change', ()=>{
      const p = chk.getAttribute('data-path');
      if (chk.checked) selectedForCompare.push(p);
      else selectedForCompare = selectedForCompare.filter(x=>x!==p);
      if (compareBtn) compareBtn.disabled = (selectedForCompare.length!==2);
    });
  });

  grid.querySelectorAll('img[draggable="true"]').forEach(img=>{
    img.addEventListener('dragstart', (e)=>{
      e.dataTransfer.setData('text/plain', img.getAttribute('data-photo-id'));
    });
  });

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

// ================== الدليل المرئي (Intro.js) + Tooltips ==================
function initTooltips(){
  const tList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tList.forEach(el => new bootstrap.Tooltip(el));
}

function startTour(){
  const steps = [
    { element: document.querySelector('#mainTabs'),
      intro: 'هنا تتنقل بين لوحة المتابعة، الإجراءات السريعة، ومعرض التقدّم.',
      position: 'bottom' },
    { element: document.querySelector('#calendarCard'),
      intro: 'التقويم يعرض الخطة. انقر على يوم لضبطه، أو على الحدث للتبديل إلى "تم التنفيذ" ✓.',
      position: 'right' },
    { element: document.querySelector('#statsCard'),
      intro: 'إحصاءات سريعة لآخر 30 يوم: On / Off / تم التنفيذ.',
      position: 'left' },
    { element: document.querySelector('#genCard'),
      intro: 'ولّد خطة الشهر (On/Off). اختر السنة/الشهر ثم "توليد الجدول".',
      position: 'bottom' },
    { element: document.querySelector('#quickLogCard'),
      intro: 'سجّل إنجاز يوم معيّن بسرعة بدون فتح التقويم.',
      position: 'bottom' },
    { element: document.querySelector('#uploadCard'),
      intro: 'ارفع صورة التقدّم لتظهر في المعرض ويمكن ربطها بالمجموعات أو مقارنتها.',
      position: 'bottom' },
    { element: document.querySelector('#groupsCard'),
      intro: 'أنشئ مجموعات (Bulk, Cut...). اسحب صورة وأسقطها على المجموعة لإسنادها.',
      position: 'right' },
    { element: document.querySelector('#galleryCard'),
      intro: 'علّم صورتين (Checkbox) ثم "مقارنة صورتين" لفتح سلايدر قبل/بعد.',
      position: 'left' }
  ];

  const tour = introJs();
  tour.setOptions({
    steps, rtl:true,
    nextLabel:'التالي', prevLabel:'السابق', doneLabel:'تم',
    scrollToElement:true, scrollTo:'element', showProgress:true, showBullets:true
  });

  // بدّل التبويب حسب موضع العنصر
  tour.onbeforechange(function(targetEl){
    if (!targetEl) return;
    const paneQuick   = document.querySelector('#pane-quick');
    const paneGallery = document.querySelector('#pane-gallery');
    if      (paneQuick.contains(targetEl))   new bootstrap.Tab(document.querySelector('#tab-quick')).show();
    else if (paneGallery.contains(targetEl)) new bootstrap.Tab(document.querySelector('#tab-gallery')).show();
    else                                     new bootstrap.Tab(document.querySelector('#tab-dashboard')).show();
    targetEl.scrollIntoView({ block:'center', behavior:'smooth' });
  });

  tour.start();
}

function maybeAutoTour(){
  try{
    const k='gr_seen_tour_v2';
    if(!localStorage.getItem(k)){ setTimeout(()=>startTour(), 400); localStorage.setItem(k,'1'); }
  }catch(e){}
}

// ================== الثيمات ==================
function applyTheme(cls){
  document.body.classList.remove('theme-slate','theme-gray','theme-offwhite');
  document.body.classList.add(cls);
  localStorage.setItem('gr_theme', cls);
  calendar && calendar.refetchEvents();
  refreshStats();
}
function initTheme(){
  const sel = document.getElementById('themeSelect');
  const saved = localStorage.getItem('gr_theme') || 'theme-slate';
  document.body.classList.add(saved);
  if (sel){
    sel.value = saved;
    sel.addEventListener('change', ()=> applyTheme(sel.value));
  }
}

// ================== Init ==================
document.addEventListener('DOMContentLoaded', ()=>{
  initTheme();
  initTooltips();

  // Calendar
  calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
    initialView: 'dayGridMonth',
    firstDay: 6, locale: 'ar', height: 'auto',
    events: loadCalendarEvents,
    dateClick: (info)=> openDayModal(info.dateStr, 'On'),
    eventClick: async (info)=>{
      const date = info.event.startStr;
      const json = await postJSON(API('toggle_done.php'), {date});
      if (json.ok){ calendar.refetchEvents(); refreshStats(); fixCalendarLayout(); }
    }
  });
  calendar.render();

  // Quick actions + Upload + Modal Save
  wireGenerate();
  wireQuickLog();
  wirePhotoUpload();
  wireDaySave();

  // Groups & gallery
  document.getElementById('btnAddGroup')?.addEventListener('click', addGroup);
  document.getElementById('btnCompare')?.addEventListener('click', ()=>{
    if (selectedForCompare.length!==2) return;
    buildCompareSlider(selectedForCompare[0], selectedForCompare[1]);
    new bootstrap.Modal('#compareModal').show();
  });

  // إصلاح التقويم عند إظهار تبويب لوحة المتابعة
  document.querySelectorAll('#mainTabs [data-bs-toggle="tab"]').forEach(el=>{
    el.addEventListener('shown.bs.tab', (e)=>{
      if (e.target.id === 'tab-dashboard') {
        setTimeout(() => { calendar.updateSize(); }, 50);
      }
    });
  });

  // مراقبة تغيّر حجم بطاقة التقويم (اختياري لكنه مفيد)
  const calCard = document.getElementById('calendarCard');
  if ('ResizeObserver' in window && calCard) {
    const ro = new ResizeObserver(() => fixCalendarLayout());
    ro.observe(calCard);
  }

  refreshStats();
  loadGroups();
  loadGalleryByGroup();
  maybeAutoTour();
});
