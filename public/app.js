// ================== إعداد مسارات الـAPI ==================
const API = (p) => `../api/${p}`;

// ================== ثابت التوقيت + Helpers ==================
const APP_TZ = 'Asia/Baghdad';

// yyyy-mm-dd بتوقيت بغداد
function todayYMD() {
  const d = new Date();
  const y = new Intl.DateTimeFormat('en', { timeZone: APP_TZ, year: 'numeric' }).format(d);
  const m = new Intl.DateTimeFormat('en', { timeZone: APP_TZ, month: '2-digit' }).format(d);
  const da = new Intl.DateTimeFormat('en', { timeZone: APP_TZ, day: '2-digit' }).format(d);
  return `${y}-${m}-${da}`;
}

// طلب POST (x-www-form-urlencoded)
async function postJSON(url, obj) {
  const res = await fetch(url, {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
    body: new URLSearchParams(obj).toString(),
    credentials: 'same-origin'
  });
  return await res.json();
}

// طلب POST (multipart/form-data)
async function postForm(url, data) {
  const res = await fetch(url, { method:'POST', body: data, credentials:'same-origin' });
  return await res.json();
}

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ================== ألوان الثيم ==================
let THEME = { on:'#60a5fa', off:'#64748b', done:'#22c55e', text:'#e2e8f0' };

function refreshThemeVars(){
  THEME.on   = cssVar('--event-on')   || THEME.on;
  THEME.off  = cssVar('--event-off')  || THEME.off;
  THEME.done = cssVar('--event-done') || THEME.done;
  THEME.text = cssVar('--text')       || THEME.text;
}

function colorFor(plan, done){
  if (done) return THEME.done;
  if (plan==='Off') return THEME.off;
  return THEME.on;
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
    const res = await fetch(API('calendar_events.php') + `?start=${info.startStr}&end=${info.endStr}`, { credentials:'same-origin' });
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
    const res = await fetch(API('stats_summary.php'), { credentials:'same-origin' });
    const json = await res.json();
    if (!json.ok) return;
    const ctx = document.getElementById('statsCanvas');
    if (statsChart) statsChart.destroy();
    const colors = [ THEME.on, THEME.off, THEME.done ];

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
      options: {
        cutout: '60%',
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: THEME.text,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          }
        }
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
    fixCalendarLayout(); // تصحيح تمدّد التقويم بعد التوليد
  });
}

function wireQuickLog(){
  const btn = document.getElementById('btnLog');
  if (!btn) return;
  // تعبئة تاريخ اليوم افتراضيًا إن فارغ (بتوقيت بغداد)
  const d = document.getElementById('logDate');
  if (d && !d.value) d.value = todayYMD();

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

    const file = inp.files[0];
    // فحص النوع والحجم
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      return alert('صيغة الصورة غير مدعومة. استخدم PNG أو JPG أو WEBP.');
    }
    if (file.size > 5 * 1024 * 1024) {
      return alert('حجم الصورة كبير. الحد الأقصى 5MB.');
    }

    const fd = new FormData();
    fd.append('photo', file);
    fd.append('date', todayYMD());

    try{
      const json = await postForm(API('upload_photo_blob.php'), fd);
      document.getElementById('photoMsg').textContent =
        json.ok ? 'حُفظت الصورة ✓' : ('خطأ: ' + (json.msg||''));
      if (json.ok) { loadGalleryByGroup(); fixCalendarLayout(); }
    }catch(e){
      document.getElementById('photoMsg').textContent = 'تعذّر الرفع: ' + e.message;
    }
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
  const res = await fetch(API('list_groups.php'), { credentials:'same-origin' });
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
    li.dataset.id = g.id; // حقن المعرف لتجنب استعلام لاحق
    li.onclick = ()=>{ currentGroup = g.id; loadGalleryByGroup(); };
    ul.appendChild(li);
  });

  // تفعيل إسقاط الصور على العناصر بعد إعادة البناء
  document.querySelectorAll('#groupsList .list-group-item').forEach(li=>{
    li.addEventListener('dragover', e=> e.preventDefault());
    li.addEventListener('drop', async (e)=>{
      e.preventDefault();
      const pid = e.dataTransfer.getData('text/plain');
      const isAll = li.textContent.trim()==='الكل';
      const gid = isAll ? '' : (li.dataset.id || '');
      const res = await postJSON(API('assign_photo.php'), { photo_id: pid, group_id: gid });
      if (res.ok) loadGalleryByGroup();
    });
  });
}

async function loadGalleryByGroup(){
  const grid = document.getElementById('galleryGrid');
  const url = currentGroup==null ? API('list_photos.php')
                                 : API('list_group_photos.php') + `?group_id=${currentGroup}`;
  const res = await fetch(url, { credentials:'same-origin' });
  const json = await res.json();
  grid.innerHTML = '';
  selectedForCompare = [];
  const compareBtn = document.getElementById('btnCompare');
  if (compareBtn) compareBtn.disabled = true;

  (json.data||[]).forEach(item=>{
    const col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg-3';
    const imgSrc = `${API('photo_get.php')}?id=${item.id}`;
    const altTxt = `صورة #${item.id}${item.date ? ' - ' + item.date : ''}`;

    col.innerHTML = `
      <div class="card p-1" style="background:var(--surface);border:1px solid var(--border)">
        <img src="${imgSrc}" class="img-fluid rounded" alt="${altTxt}" draggable="true" data-photo-id="${item.id}">
        <div class="d-flex justify-content-between align-items-center mt-1">
          <div class="form-check">
            <input class="form-check-input selCompare" type="checkbox" data-path="${imgSrc}">
          </div>
          <small class="text-muted">${item.date ?? ''}</small>
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
}

// ================== مقارنة قبل/بعد (Responsive + سحب/لمس + نسبة تلقائية) ==================
function ensureCompareStyles(){
  if (document.getElementById('gr-compare-css')) return;
  const css = `
#compareWrap { width:100%; }
#compareWrap .cmp-container{position:relative;width:100%;max-width:100%;background:#111;border-radius:.75rem;overflow:hidden;}
#compareWrap .cmp-container img{display:block;width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none;}
#compareWrap .cmp-mask{position:absolute;inset:0;overflow:hidden;width:50%;}
#compareWrap .cmp-range{position:absolute;left:0;right:0;bottom:.5rem;width:96%;margin:0 auto;z-index:3;}
#compareWrap .cmp-handle{position:absolute;top:0;bottom:0;left:50%;width:2px;transform:translateX(-1px);background:rgba(255,255,255,.85);box-shadow:0 0 0 1px rgba(0,0,0,.2);z-index:2;}
#compareWrap .cmp-handle::before{content:'';position:absolute;top:50%;left:50%;width:28px;height:28px;transform:translate(-50%,-50%);border-radius:50%;background:rgba(255,255,255,.95);box-shadow:0 2px 8px rgba(0,0,0,.35);border:1px solid rgba(0,0,0,.15);}
#compareModal .modal-dialog{max-width:min(100vw - 1rem, 900px);margin:1rem auto;}
#compareModal .modal-body{padding:.75rem;}
`;
  const style = document.createElement('style');
  style.id = 'gr-compare-css';
  style.textContent = css;
  document.head.appendChild(style);
}

async function buildCompareSlider(imgA, imgB){
  ensureCompareStyles();

  const wrap = document.getElementById('compareWrap');
  wrap.innerHTML = `
    <div class="cmp-container">
      <img id="cmpA" alt="قبل">
      <div id="cmpMask" class="cmp-mask">
        <img id="cmpB" alt="بعد">
      </div>
      <div id="cmpHandle" class="cmp-handle" aria-hidden="true"></div>
      <input id="cmpRange" class="cmp-range" type="range" min="0" max="100" value="50" aria-label="مقارنة قبل/بعد">
    </div>
    <div class="d-flex align-items-center justify-content-center gap-2 mt-2">
      <label class="small text-muted">Zoom</label>
      <input id="cmpZoom" type="range" min="100" max="300" value="100" style="width:220px">
      <button id="cmpZoomReset" type="button" class="btn btn-sm btn-secondary">Reset</button>
    </div>`;

  const container = wrap.querySelector('.cmp-container');
  const elA = wrap.querySelector('#cmpA');
  const elB = wrap.querySelector('#cmpB');
  const mask = wrap.querySelector('#cmpMask');
  const handle = wrap.querySelector('#cmpHandle');
  const range = wrap.querySelector('#cmpRange');
  const zoomRange = wrap.querySelector('#cmpZoom');
  const zoomReset = wrap.querySelector('#cmpZoomReset');

  // تحميل صورة مع وعد
  function load(src, el){
    return new Promise((resolve, reject)=>{
      el.onload = ()=> resolve({w: el.naturalWidth, h: el.naturalHeight});
      el.onerror = ()=> reject(new Error('image load error'));
      el.src = src;
    });
  }

  // حمّل الصورتين
  let r1, r2;
  try{
    [r1, r2] = await Promise.all([ load(imgA, elA), load(imgB, elB) ]);
  }catch(e){
    container.innerHTML = `<div class="p-3 text-danger">تعذّر تحميل الصور للمقارنة</div>`;
    return;
  }

  // حدد النسبة من صورة A
  const ratio = (r1.w && r1.h) ? (r1.w / r1.h) : (4/3);

  // حاول استخدام aspect-ratio، ولو ما اشتغل اضبط ارتفاع يدويًا
  try { container.style.aspectRatio = `${r1.w} / ${r1.h}`; } catch(_) {}
  function sizeFallback(){
    const rect = container.getBoundingClientRect();
    const expectedH = Math.max(220, Math.round(rect.width / ratio)); // حدّ أدنى 220px
    container.style.height = expectedH + 'px';
  }
  sizeFallback();

  // سحب/لمس للسلايدر
  function setPercent(p){
    p = Math.max(0, Math.min(100, p));
    mask.style.width = p + '%';
    handle.style.left = p + '%';
    range.value = p;
  }
  function percentFromEvent(evt){
    const rect = container.getBoundingClientRect();
    const x = (evt.touches ? evt.touches[0].clientX : evt.clientX) - rect.left;
    return (x / rect.width) * 100;
  }
  let dragging = false;
  function startDrag(evt){ dragging = true; setPercent(percentFromEvent(evt)); }
  function moveDrag(evt){ if (!dragging) return; setPercent(percentFromEvent(evt)); }
  function endDrag(){ dragging = false; }

  container.addEventListener('mousedown', startDrag);
  window.addEventListener('mousemove', moveDrag);
  window.addEventListener('mouseup', endDrag);
  container.addEventListener('touchstart', startDrag, {passive:true});
  window.addEventListener('touchmove', moveDrag, {passive:true});
  window.addEventListener('touchend', endDrag);

  range.addEventListener('input', ()=> setPercent(parseInt(range.value,10)));
  setPercent(50);

  // زووم بسيط (تكبير متزامن للصورتين)
  let scale = 1;
  function applyZoom(){
    const s = `scale(${scale})`;
    elA.style.transform = s;
    elB.style.transform = s;
    elA.style.transformOrigin = 'center center';
    elB.style.transformOrigin = 'center center';
  }
  applyZoom();

  // عجلة الماوس للزووم (Ctrl + Scroll)
  container.addEventListener('wheel', (e)=>{
    if (!e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    scale = Math.max(1, Math.min(3, +(scale + delta).toFixed(2)));
    zoomRange.value = Math.round(scale*100);
    applyZoom();
  }, { passive:false });

  // سلايدر الزووم + Reset
  zoomRange.addEventListener('input', ()=>{
    scale = Math.max(1, Math.min(3, zoomRange.value/100));
    applyZoom();
  });
  zoomReset.addEventListener('click', ()=>{
    scale = 1; zoomRange.value = 100; applyZoom();
  });

  // إعادة ضبط عند تغيير الحجم أو عند إظهار المودال
  function onResize(){ sizeFallback(); setPercent(parseInt(range.value,10)); }
  window.addEventListener('resize', onResize, { passive:true });

  const modalEl = document.getElementById('compareModal');
  if (modalEl){
    modalEl.addEventListener('shown.bs.modal', ()=>{ onResize(); });
    modalEl.addEventListener('hidden.bs.modal', ()=>{
      window.removeEventListener('mousemove', moveDrag);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('touchmove', moveDrag);
      window.removeEventListener('touchend', endDrag);
      window.removeEventListener('resize', onResize);
    }, { once:true });
  }
}

// ================== الدليل المرئي (Intro.js) + Tooltips ==================
function initTooltips(){
  const tList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tList.forEach(el => new bootstrap.Tooltip(el));
}

// ===== Helpers للشرح =====
function getEl(sel){ try { return document.querySelector(sel) || null; } catch { return null; } }
function introAvailable(){ return (typeof introJs === 'function'); }

// جولة تعليمية مرِنة + فلترة العناصر غير الموجودة
function startTour(){
  if (!introAvailable()) { alert('ميزة الشرح غير مفعلة: تأكد من تضمين Intro.js'); return; }

  const rawSteps = [
    { sel:'#mainTabs',      intro:'هنا تتنقل بين لوحة المتابعة، الإجراءات السريعة، ومعرض التقدّم.', pos:'bottom' },
    { sel:'#calendarCard',  intro:'التقويم يعرض الخطة. انقر على يوم لضبطه، أو على الحدث للتبديل إلى "تم التنفيذ" ✓.', pos:'right' },
    { sel:'#statsCard',     intro:'إحصاءات سريعة: On / Off / تم التنفيذ.', pos:'left' },
    { sel:'#genCard',       intro:'ولّد خطة الشهر (On/Off).', pos:'bottom' },
    { sel:'#quickLogCard',  intro:'سجّل إنجاز يوم معيّن بسرعة.', pos:'bottom' },
    { sel:'#uploadCard',    intro:'ارفع صورة التقدّم لتظهر في المعرض.', pos:'bottom' },
    { sel:'#groupsCard',    intro:'أنشئ مجموعات واسحب الصورة عليها لإسنادها.', pos:'right' },
    { sel:'#galleryCard',   intro:'علّم صورتين ثم "مقارنة صورتين" لفتح السلايدر.', pos:'left' }
  ];

  const steps = rawSteps.map(s => {
    const el = getEl(s.sel);
    return el ? { element: el, intro: s.intro, position: s.pos } : null;
  }).filter(Boolean);

  if (!steps.length){
    console.warn('لا يوجد عناصر صالحة للجولة الآن.');
    alert('تعذّر بدء الشرح الآن. تأكد أن الصفحة جاهزة ثم جرّب من جديد.');
    return;
  }

  const tour = introJs();
  tour.setOptions({
    steps, rtl: true,
    nextLabel:'التالي', prevLabel:'السابق', doneLabel:'تم',
    scrollToElement:true, scrollTo:'element', showProgress:true, showBullets:true
  });

  // بدّل التبويب حسب العنصر الهدف
  tour.onbeforechange(function(targetEl){
    if (!targetEl) return;
    const paneQuick   = getEl('#pane-quick');
    const paneGallery = getEl('#pane-gallery');
    const tabDash     = getEl('#tab-dashboard');
    const tabQuick    = getEl('#tab-quick');
    const tabGallery  = getEl('#tab-gallery');

    if      (paneQuick && paneQuick.contains(targetEl)   && tabQuick)   new bootstrap.Tab(tabQuick).show();
    else if (paneGallery && paneGallery.contains(targetEl) && tabGallery) new bootstrap.Tab(tabGallery).show();
    else if (tabDash) new bootstrap.Tab(tabDash).show();

    try { targetEl.scrollIntoView({ block:'center', behavior:'smooth' }); } catch {}
  });

  tour.start();
}

// تشغيل تلقائي ذكي: ينتظر العناصر ثم يبدأ، مع سقف محاولات
function maybeAutoTour(){
  const STORAGE_KEY = 'gr_seen_tour_v3';
  if (localStorage.getItem(STORAGE_KEY)) return;

  let tries = 0, maxTries = 10;

  const tick = () => {
    tries++;
    const ready = introAvailable() && getEl('#calendarCard') && getEl('#galleryCard');
    if (ready){
      setTimeout(()=>{
        try { startTour(); localStorage.setItem(STORAGE_KEY,'1'); }
        catch(e){ console.warn('فشل بدء الجولة:', e); }
      }, 250);
      return;
    }
    if (tries < maxTries) setTimeout(tick, 300);
    else console.warn('فشل تهيئة الجولة بعد محاولات متعددة.');
  };

  setTimeout(tick, 400);
}

// ================== الثيمات ==================
// function applyTheme(cls){
//   document.body.classList.remove('theme-slate','theme-gray','theme-offwhite');
//   document.body.classList.add(cls);
//   localStorage.setItem('gr_theme', cls);
//   refreshThemeVars();        // تحديث ألوان الثيم
//   calendar && calendar.refetchEvents();
//   refreshStats();
// }

function applyTheme(cls){
  // احذف أي كلاس يبدأ بـ theme-
  document.body.classList.forEach(c => {
    if (c.startsWith('theme-')) document.body.classList.remove(c);
  });
  document.body.classList.add(cls);
  localStorage.setItem('gr_theme', cls);
  refreshThemeVars();        // تحديث ألوان الثيم
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

// ================== Import / Export helpers ==================

// Fetch all workouts (very wide range once)
async function fetchAllWorkoutsInRange(start='2000-01-01', end='2100-12-31'){
  const res = await fetch(API('calendar_events.php') + `?start=${start}&end=${end}`, { credentials:'same-origin' });
  const json = await res.json();
  if (!json.ok) throw new Error('failed to load workouts');
  // data: [{date, plan, done}]
  return json.data || [];
}

// Fetch groups (names only)
async function fetchAllGroups(){
  const res = await fetch(API('list_groups.php'), { credentials:'same-origin' });
  const json = await res.json();
  if (!json.ok) throw new Error('failed to load groups');
  // data: [{id, name}]
  return (json.data || []).map(g => ({ name: g.name }));
}

// Download helper
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
}

// Export: JSON (workouts + groups)
async function exportDataJSON(){
  const [workouts, groups] = await Promise.all([
    fetchAllWorkoutsInRange(),
    fetchAllGroups()
  ]);

  const payload = {
    type: 'GymRhythmExport',
    version: 1,
    exportedAt: new Date().toISOString(),
    workouts,   // [{date, plan, done}]
    groups      // [{name}]
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
  const ymd = new Date().toISOString().slice(0,10).replace(/-/g,'');
  downloadBlob(blob, `gymrhythm_export_${ymd}.json`);
}

// Export: CSV (workouts only)
async function exportWorkoutsCSV(){
  const workouts = await fetchAllWorkoutsInRange();
  const header = 'date,plan,done';
  const lines = workouts.map(w => `${w.date},${w.plan},${w.done ? 1 : 0}`);
  const bom = '\ufeff'; // better Excel support
  const blob = new Blob([bom + [header, ...lines].join('\n')], { type:'text/csv;charset=utf-8' });
  const ymd = new Date().toISOString().slice(0,10).replace(/-/g,'');
  downloadBlob(blob, `gymrhythm_workouts_${ymd}.csv`);
}

// Import JSON (workouts + groups)
// - Upserts plan for each date
// - Syncs "done" by comparing current state (no accidental flip)
async function importDataFromJSON(file){
  const msg = document.getElementById('importMsg');
  const setMsg = (t, cls='') => { msg.textContent = t; msg.className = `small mt-2 ${cls}`; };

  if (!file) { setMsg('اختر ملف JSON أولاً', 'text-danger'); return; }

  // Read file
  let payload;
  try{
    const text = await file.text();
    payload = JSON.parse(text);
  }catch(e){
    setMsg('ملف غير صالح أو صيغة JSON خاطئة.', 'text-danger');
    return;
  }

  // Validate
  if (!payload || payload.type !== 'GymRhythmExport' || !Array.isArray(payload.workouts)){
    setMsg('هذا الملف لا يبدو تصديرًا من GymRhythm.', 'text-danger');
    return;
  }

  const totalW = payload.workouts.length;
  const groups = Array.isArray(payload.groups) ? payload.groups : [];

  // Fetch current state to avoid double toggles
  const current = await fetchAllWorkoutsInRange();
  const doneMap = Object.fromEntries(current.map(x => [x.date, !!x.done]));

  // Create groups (skip if name exists)
  try{
    const existing = await fetchAllGroups();
    const existSet = new Set(existing.map(g => g.name));
    let created = 0;
    for (const g of groups){
      if (!g?.name || existSet.has(g.name)) continue;
      const r = await postJSON(API('create_group.php'), { name: g.name });
      if (r.ok) { created++; existSet.add(g.name); }
    }
    if (created) setMsg(`تم إنشاء ${created} مجموعة...`, 'text-info');
  }catch(e){
    // non-fatal
    console.warn('group import failed', e);
  }

  // Upsert workouts and sync "done"
  let ok = 0, fail = 0, toggled = 0;
  for (let i = 0; i < totalW; i++){
    const w = payload.workouts[i];
    setMsg(`جارٍ الاستيراد ${i+1}/${totalW} — ${w.date}...`, 'text-muted');

    try{
      const r = await postJSON(API('upsert_workout.php'), { date: w.date, plan: w.plan });
      if (!r.ok) throw new Error(r.msg || 'upsert failed');
      ok++;

      const cur = !!doneMap[w.date];
      const target = !!w.done;
      if (cur !== target){
        const t = await postJSON(API('toggle_done.php'), { date: w.date });
        if (t.ok) { toggled++; doneMap[w.date] = target; }
      }
    }catch(e){
      fail++;
      console.warn('import workout error', w, e);
    }
  }

  const summary = `تم الاستيراد: ${ok} يوم، فشل: ${fail}${toggled?`، ضبط "تم التنفيذ": ${toggled}`:''}.`;
  setMsg(summary, fail ? 'text-warning' : 'text-success');

  // Refresh UI
  calendar?.refetchEvents();
  refreshStats();
}

// Wire buttons/inputs
function wireImportExport(){
  const expJsonBtn = document.getElementById('btnExportJSON');
  const expCsvBtn  = document.getElementById('btnExportCSV');
  const impBtn     = document.getElementById('btnImportJSON');
  const impFile    = document.getElementById('importFile');
  const impMsg     = document.getElementById('importMsg');

  expJsonBtn?.addEventListener('click', async ()=>{
    try{
      expJsonBtn.disabled = true;
      await exportDataJSON();
    }catch(e){
      alert('تعذّر التصدير: ' + e.message);
    }finally{
      expJsonBtn.disabled = false;
    }
  });

  expCsvBtn?.addEventListener('click', async ()=>{
    try{
      expCsvBtn.disabled = true;
      await exportWorkoutsCSV();
    }catch(e){
      alert('تعذّر التصدير: ' + e.message);
    }finally{
      expCsvBtn.disabled = false;
    }
  });

  impBtn?.addEventListener('click', async ()=>{
    const file = impFile?.files?.[0];
    if (!file){ impMsg.textContent = 'اختر ملف JSON أولاً.'; impMsg.className = 'small mt-2 text-danger'; return; }
    if (!confirm('سيتم استيراد الجدول (ستُستبدل الخطط للأيام المطابقة). المتابعة؟')) return;

    try{
      impBtn.disabled = true;
      await importDataFromJSON(file);
    }catch(e){
      alert('تعذّر الاستيراد: ' + e.message);
    }finally{
      impBtn.disabled = false;
    }
  });
}


// ================== Init ==================
document.addEventListener('DOMContentLoaded', ()=>{
  initTheme();
  refreshThemeVars(); // مهمة قبل أي رسم أو تلوين
  initTooltips();

  // Calendar
  calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
    initialView: 'dayGridMonth',
    firstDay: 6, locale: 'ar', height: 'auto',
    events: loadCalendarEvents,
    dateClick: (info)=> openDayModal(info.dateStr, 'On'),
    eventClick: async (info)=>{
      const date = info.event.startStr; // YYYY-MM-DD من FullCalendar
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
  document.getElementById('btnAddGroup')?.addEventListener('click', async ()=>{
    const name = document.getElementById('grpName').value.trim();
    if (!name) return;
    const res = await postJSON(API('create_group.php'), {name});
    if (res.ok){ document.getElementById('grpName').value=''; loadGroups(); }
  });

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

  // تأكد أن شبكة المعرض تستخدم صفوف/أعمدة مرنة
  const galleryGrid = document.getElementById('galleryGrid');
  if (galleryGrid){
    galleryGrid.classList.add('row', 'g-2', 'row-cols-2', 'row-cols-md-3', 'row-cols-lg-4');
  }

  // عند ظهور مودال المقارنة، أعِد ضبط النسبة/المقبض
  const cmpModal = document.getElementById('compareModal');
  if (cmpModal){
    cmpModal.addEventListener('shown.bs.modal', ()=>{
      const range = document.getElementById('cmpRange');
      if (range) {
        const ev = new Event('input');
        range.dispatchEvent(ev);
      }
    });
  }

  // زر المساعدة العائم + F1 لتشغيل الشرح
  document.getElementById('helpFab')?.addEventListener('click', startTour);
  window.addEventListener('keydown', (e)=>{
    if (e.key === 'F1') { e.preventDefault(); startTour(); }
  });

  refreshStats();
  loadGroups();
  loadGalleryByGroup();
  maybeAutoTour();
  wireImportExport();
});
