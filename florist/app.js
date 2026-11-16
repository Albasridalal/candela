'use strict';
(() => {
  // ---------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const DAYS_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const WEEK_START = 0; // 0 = Sunday, 6 = Saturday
  const TYPES = { corner: 'كورنر ورد', delivery: 'دزة' };
  const STATUSES = { new: 'جديد', confirmed: 'مؤكد', done: 'منجز' };
  const DEFAULT_FLOWERS = ['جوري', 'توليب', 'ليليوم', 'أوركيد', 'هيدرانجا', 'بيبي بريث', 'قرنفل', 'كالا', 'بيوني', 'أقحوان', 'رانونكولوس', 'يوكالبتوس', 'لافندر', 'عباد الشمس'];
  const UPCOMING_LIMIT = 8;
  const PHOTO_MAX = 1200;
  const PHOTO_QUALITY = 0.82;
  const BACKUP_KEY = 'florist:lastBackup';

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const todayISO = () => iso(new Date());
  const uid = () => (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id, cls = '') => `<svg class="${cls}"><use href="#i-${id}"/></svg>`;
  const toLatinDigits = (s) => String(s ?? '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
  const normalize = (s) => toLatinDigits(s).toLowerCase()
    .replace(/[ً-ْـ]/g, '') // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ').trim();

  function daysBetween(a, b) {
    return Math.round((parseISO(b) - parseISO(a)) / 86400000);
  }
  function fmtDate(s, { weekday = true, year = false } = {}) {
    const d = parseISO(s);
    let out = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    if (weekday) out = `${DAYS[d.getDay()]} ${out}`;
    if (year) out += ` ${d.getFullYear()}`;
    return out;
  }
  function fmtTime(t) {
    if (!t) return '';
    let [h, m] = t.split(':').map(Number);
    const suffix = h < 12 ? 'ص' : 'م';
    h = h % 12 || 12;
    return `${h}:${pad(m)} ${suffix}`;
  }
  function relDay(s) {
    const diff = daysBetween(todayISO(), s);
    if (diff === 0) return 'اليوم';
    if (diff === 1) return 'بكرة';
    if (diff === -1) return 'أمس';
    return null;
  }
  function sortOrders(a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const ta = a.time || '99:99', tb = b.time || '99:99';
    if (ta !== tb) return ta < tb ? -1 : 1;
    return (a.createdAt || 0) - (b.createdAt || 0);
  }

  // ---------------------------------------------------------------
  // IndexedDB
  // ---------------------------------------------------------------
  const DB_NAME = 'florist-orders';
  const DB_VERSION = 1;
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('orders')) {
          db.createObjectStore('orders', { keyPath: 'id' }).createIndex('date', 'date');
        }
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos', { keyPath: 'id' }).createIndex('orderId', 'orderId');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  // Runs `work(stores)` synchronously inside one transaction, resolves when it commits.
  async function withTx(names, mode, work) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(names, mode);
      const stores = Object.fromEntries(names.map((n) => [n, tx.objectStore(n)]));
      let result;
      try { result = work(stores); } catch (e) { tx.abort(); reject(e); return; }
      tx.oncomplete = () => resolve(typeof result === 'function' ? result() : result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  }

  const store = {
    allOrders() {
      return withTx(['orders'], 'readonly', (s) => {
        const r = s.orders.getAll();
        return () => r.result;
      });
    },
    allPhotos() {
      return withTx(['photos'], 'readonly', (s) => {
        const r = s.photos.getAll();
        return () => r.result;
      });
    },
    photo(id) {
      return withTx(['photos'], 'readonly', (s) => {
        const r = s.photos.get(id);
        return () => r.result;
      });
    },
    saveOrder(order, newPhotos, removedIds) {
      return withTx(['orders', 'photos'], 'readwrite', (s) => {
        s.orders.put(order);
        newPhotos.forEach((p) => s.photos.put(p));
        removedIds.forEach((id) => s.photos.delete(id));
      });
    },
    deleteOrder(order) {
      return withTx(['orders', 'photos'], 'readwrite', (s) => {
        s.orders.delete(order.id);
        (order.photoIds || []).forEach((id) => s.photos.delete(id));
      });
    },
    putMany(orders, photos) {
      return withTx(['orders', 'photos'], 'readwrite', (s) => {
        orders.forEach((o) => s.orders.put(o));
        photos.forEach((p) => s.photos.put(p));
      });
    },
  };

  // Photo object URLs, cached by photo id
  const photoURLs = new Map();
  async function photoURL(id) {
    if (photoURLs.has(id)) return photoURLs.get(id);
    const rec = await store.photo(id);
    if (!rec) return null;
    const blob = rec.data instanceof Blob ? rec.data : new Blob([rec.data], { type: rec.type || 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    photoURLs.set(id, url);
    return url;
  }
  function forgetPhoto(id) {
    const url = photoURLs.get(id);
    if (url) URL.revokeObjectURL(url);
    photoURLs.delete(id);
  }

  async function compressImage(file) {
    const src = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error('تعذر قراءة الصورة'));
        i.src = src;
      });
      const scale = Math.min(1, PHOTO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      return await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('تعذر ضغط الصورة'))), 'image/jpeg', PHOTO_QUALITY));
    } finally {
      URL.revokeObjectURL(src);
    }
  }

  // ---------------------------------------------------------------
  // State
  // ---------------------------------------------------------------
  const now = new Date();
  const state = {
    orders: new Map(),
    viewYear: now.getFullYear(),
    viewMonth: now.getMonth(),
    selected: todayISO(),
    query: '',
    dayDate: null,
    detailId: null,
    form: null,
    installPrompt: null,
  };
  const ordersArray = () => Array.from(state.orders.values());
  const ordersOn = (date) => ordersArray().filter((o) => o.date === date).sort(sortOrders);

  // ---------------------------------------------------------------
  // Layers (sheets, pages, dialogs) wired to browser history so the
  // phone's back button closes the top layer instead of leaving the app.
  // ---------------------------------------------------------------
  const layers = [];
  let popWaiters = [];

  function openLayer(el, onClose) {
    layers.push({ el, onClose });
    el.style.zIndex = String(50 + layers.length); // newest layer always on top
    el.hidden = false;
    // force reflow so the transition runs
    void el.offsetWidth;
    el.classList.add('open');
    document.body.classList.add('noscroll');
    history.pushState({ layer: layers.length }, '');
  }
  function closeLayer() {
    if (!layers.length) return Promise.resolve();
    return new Promise((resolve) => {
      popWaiters.push(resolve);
      history.back();
    });
  }
  function hideTop() {
    const { el, onClose } = layers.pop();
    el.classList.remove('open');
    setTimeout(() => { if (!el.classList.contains('open')) el.hidden = true; }, 280);
    if (!layers.length) document.body.classList.remove('noscroll');
    if (onClose) onClose();
  }
  const isOpen = (el) => layers.some((l) => l.el === el);

  window.addEventListener('popstate', (e) => {
    const depth = (e.state && e.state.layer) || 0;
    while (layers.length > depth) hideTop();
    const waiters = popWaiters; popWaiters = [];
    waiters.forEach((fn) => fn());
  });
  if (history.state && history.state.layer) history.replaceState(null, '');

  document.addEventListener('click', (e) => {
    const closer = e.target.closest('[data-close]');
    if (closer && layers.length && closer.closest('.layer') === layers[layers.length - 1].el) closeLayer();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && layers.length) closeLayer();
  });

  // ---------------------------------------------------------------
  // Toast & confirm
  // ---------------------------------------------------------------
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  // Resolves to 'ok' | 'alt' | null
  function confirmDialog({ title, message, ok, alt = null, cancel = 'إلغاء', danger = false }) {
    const dlg = $('#confirmDlg');
    $('#dlgTitle').textContent = title;
    $('#dlgMsg').textContent = message || '';
    const okBtn = $('#dlgOk');
    okBtn.textContent = ok;
    okBtn.className = `btn ${danger ? 'danger-solid' : 'primary'}`;
    const altBtn = $('#dlgAlt');
    altBtn.hidden = !alt;
    altBtn.textContent = alt || '';
    $('#dlgCancel').textContent = cancel;
    return new Promise((resolve) => {
      let answer = null;
      const pick = (v) => () => { answer = v; closeLayer(); };
      okBtn.onclick = pick('ok');
      altBtn.onclick = pick('alt');
      $('#dlgCancel').onclick = pick(null);
      openLayer(dlg, () => setTimeout(() => resolve(answer), 0));
    });
  }

  // ---------------------------------------------------------------
  // Rendering: order card
  // ---------------------------------------------------------------
  function orderCard(o, { showDate = true } = {}) {
    const d = parseISO(o.date);
    const rel = relDay(o.date);
    const when = showDate
      ? `<div class="when"><b>${d.getDate()}</b><small>${rel || MONTHS[d.getMonth()]}</small></div>`
      : `<div class="when">${o.time ? `<b style="font-size:14px">${esc(fmtTime(o.time).split(' ')[0])}</b><small>${fmtTime(o.time).split(' ')[1]}</small>` : '<small>بدون<br>وقت</small>'}</div>`;
    const meta = [];
    if (showDate && o.time) meta.push(`<span>${icon('clock')}${esc(fmtTime(o.time))}</span>`);
    if (o.location) meta.push(`<span class="loc">${icon('pin')}${esc(o.location.split('\n')[0])}</span>`);
    return `
      <button class="order ${o.type} ${o.status === 'done' ? 'is-done' : ''}" type="button" data-id="${esc(o.id)}">
        <span class="bar"></span>
        ${when}
        <span class="body">
          <span class="top"><span class="name">${esc(o.customer)}</span><span class="tag ${o.status}">${STATUSES[o.status] || ''}</span></span>
          <span class="meta"><span class="type-chip ${o.type}"><i class="dot ${o.type}"></i>${TYPES[o.type]}</span>${meta.join('')}</span>
        </span>
      </button>`;
  }
  function emptyState(text) {
    return `<div class="empty-state">${icon('flower')}${esc(text)}</div>`;
  }

  // ---------------------------------------------------------------
  // Calendar
  // ---------------------------------------------------------------
  function renderWeekdays() {
    const out = [];
    for (let i = 0; i < 7; i++) out.push(`<div>${DAYS_SHORT[(WEEK_START + i) % 7]}</div>`);
    $('#weekdays').innerHTML = out.join('');
  }

  function renderCalendar() {
    const y = state.viewYear, m = state.viewMonth;
    $('#monthTitle').textContent = `${MONTHS[m]} ${y}`;
    const first = new Date(y, m, 1);
    const offset = (first.getDay() - WEEK_START + 7) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const total = Math.ceil((offset + days) / 7) * 7;
    const today = todayISO();

    const byDate = new Map();
    for (const o of state.orders.values()) {
      if (!byDate.has(o.date)) byDate.set(o.date, []);
      byDate.get(o.date).push(o);
    }

    const cells = [];
    for (let i = 0; i < total; i++) {
      const dayNum = i - offset + 1;
      if (dayNum < 1 || dayNum > days) { cells.push('<div class="day empty"></div>'); continue; }
      const date = `${y}-${pad(m + 1)}-${pad(dayNum)}`;
      const list = (byDate.get(date) || []).sort(sortOrders);
      const cls = ['day'];
      if (list.length) cls.push('has');
      if (date === today) cls.push('today');
      if (date === state.selected) cls.push('selected');
      if (date < today) cls.push('past');
      const shown = list.slice(0, 4).map((o) => `<i class="dot ${o.type} ${o.status === 'done' ? 'done' : ''}"></i>`).join('');
      const more = list.length > 4 ? `<span class="more">+${list.length - 4}</span>` : '';
      const label = `${fmtDate(date)}${list.length ? `، ${list.length} طلب` : ''}`;
      cells.push(`<button class="${cls.join(' ')}" type="button" data-date="${date}" aria-label="${esc(label)}"><span class="num">${dayNum}</span><span class="dots">${shown}</span>${more}</button>`);
    }
    $('#calGrid').innerHTML = cells.join('');
  }

  function shiftMonth(delta) {
    const d = new Date(state.viewYear, state.viewMonth + delta, 1);
    state.viewYear = d.getFullYear();
    state.viewMonth = d.getMonth();
    renderCalendar();
  }

  // ---------------------------------------------------------------
  // Upcoming & search
  // ---------------------------------------------------------------
  function renderUpcoming() {
    const today = todayISO();
    const list = ordersArray().filter((o) => o.date >= today && o.status !== 'done').sort(sortOrders);
    $('#upcomingCount').textContent = list.length ? `${list.length} طلب` : '';
    $('#upcomingList').innerHTML = list.length
      ? list.slice(0, UPCOMING_LIMIT).map((o) => orderCard(o)).join('')
      : emptyState('لا توجد طلبات قادمة — اضغط «طلب جديد» لإضافة أول طلب');
  }

  function renderSearch() {
    const q = normalize(state.query);
    const section = $('#searchResults');
    section.hidden = !q;
    $('#searchClear').hidden = !state.query;
    if (!q) return;
    const today = todayISO();
    const list = ordersArray().filter((o) => normalize(o.customer).includes(q));
    // Upcoming first (soonest first), then past (most recent first)
    list.sort((a, b) => {
      const fa = a.date >= today, fb = b.date >= today;
      if (fa !== fb) return fa ? -1 : 1;
      return fa ? sortOrders(a, b) : sortOrders(b, a);
    });
    $('#searchCount').textContent = `${list.length} نتيجة`;
    $('#searchList').innerHTML = list.length ? list.map((o) => orderCard(o)).join('') : emptyState('ما في طلبات بهذا الاسم');
  }

  // ---------------------------------------------------------------
  // Day sheet
  // ---------------------------------------------------------------
  function renderDay() {
    const date = state.dayDate;
    const list = ordersOn(date);
    const rel = relDay(date);
    $('#dayTitle').textContent = fmtDate(date, { year: true });
    const counts = { corner: 0, delivery: 0 };
    list.forEach((o) => { counts[o.type] = (counts[o.type] || 0) + 1; });
    const parts = [];
    if (rel) parts.push(rel);
    if (list.length) {
      if (counts.corner) parts.push(`${counts.corner} كورنر`);
      if (counts.delivery) parts.push(`${counts.delivery} دزة`);
    } else parts.push('لا توجد طلبات');
    $('#daySub').textContent = parts.join(' · ');
    $('#dayList').innerHTML = list.length ? list.map((o) => orderCard(o, { showDate: false })).join('') : emptyState('يوم فاضي 🌿');
  }

  function openDay(date) {
    state.selected = date;
    state.dayDate = date;
    renderCalendar();
    renderDay();
    openLayer($('#daySheet'), () => { state.dayDate = null; });
  }

  // ---------------------------------------------------------------
  // Order details
  // ---------------------------------------------------------------
  async function renderDetail() {
    const o = state.orders.get(state.detailId);
    const body = $('#detailBody');
    if (!o) { body.innerHTML = emptyState('الطلب غير موجود'); return; }
    const rel = relDay(o.date);
    const flowers = o.flowers || [];
    const numericTotal = flowers.reduce((sum, f) => sum + (typeof f.qty === 'number' ? f.qty : 0), 0);
    const allNumeric = flowers.length > 1 && flowers.every((f) => typeof f.qty === 'number');
    const mapURL = o.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.location)}` : '';

    body.innerHTML = `
      <div class="card d-hero ${o.type}">
        <div class="chips">
          <span class="type-chip ${o.type}"><i class="dot ${o.type}"></i>${TYPES[o.type]}</span>
          <span class="tag ${o.status}">${STATUSES[o.status]}</span>
        </div>
        <h3>${esc(o.customer)}</h3>
        <div class="d-line">${icon('cal')}<span>${esc(fmtDate(o.date, { year: true }))}${rel ? ` (${rel})` : ''}</span></div>
        ${o.time ? `<div class="d-line">${icon('clock')}<span>${esc(fmtTime(o.time))}</span></div>` : ''}
      </div>

      <div class="field">
        <span class="field-label">الحالة</span>
        <div class="seg status-seg" id="dStatus" role="radiogroup">
          ${Object.entries(STATUSES).map(([k, v]) => `<button type="button" role="radio" data-value="${k}" aria-checked="${o.status === k}">${v}</button>`).join('')}
        </div>
      </div>

      ${o.location ? `
      <div class="card d-sec">
        <h4>${o.type === 'corner' ? 'مكان المناسبة' : 'عنوان التوصيل'}</h4>
        <p>${esc(o.location)}</p>
        <a class="map-link" href="${mapURL}" target="_blank" rel="noopener">${icon('pin')}فتح في الخريطة</a>
      </div>` : ''}

      <div class="card d-sec">
        <h4>تفاصيل الورد</h4>
        ${flowers.length ? `
          <ul class="fl-list">${flowers.map((f) => `<li><span>${esc(f.name)}</span>${f.qty !== '' && f.qty != null ? `<span class="q">${esc(f.qty)}</span>` : ''}</li>`).join('')}</ul>
          ${allNumeric ? `<div class="fl-total"><span>المجموع</span><span>${numericTotal}</span></div>` : ''}
        ` : '<p class="muted">لم تُضف تفاصيل الورد</p>'}
      </div>

      ${o.notes ? `<div class="card d-sec"><h4>ملاحظات</h4><p>${esc(o.notes)}</p></div>` : ''}

      ${(o.photoIds || []).length ? `
      <div class="card d-sec">
        <h4>صور مرجعية (${o.photoIds.length})</h4>
        <div class="photo-grid d-photos" id="dPhotos">
          ${o.photoIds.map((id, i) => `<button class="thumb" type="button" data-index="${i}" aria-label="تكبير الصورة ${i + 1}"><img alt="" data-photo="${esc(id)}"></button>`).join('')}
        </div>
      </div>` : ''}

      <div class="d-actions">
        <button class="btn primary" type="button" id="dEdit">${icon('edit')}تعديل</button>
        <button class="btn danger" type="button" id="dDelete">${icon('trash')}حذف</button>
      </div>
    `;

    for (const img of $$('img[data-photo]', body)) {
      photoURL(img.dataset.photo).then((url) => { if (url) img.src = url; });
    }
  }

  function openDetail(id) {
    state.detailId = id;
    renderDetail();
    openLayer($('#detailSheet'), () => { state.detailId = null; });
    $('#detailBody').scrollTop = 0;
  }

  async function setStatus(id, status) {
    const o = state.orders.get(id);
    if (!o || o.status === status) return;
    const updated = { ...o, status, updatedAt: Date.now() };
    await store.saveOrder(updated, [], []);
    state.orders.set(id, updated);
    refresh();
    toast(`تم تغيير الحالة إلى «${STATUSES[status]}»`);
  }

  async function deleteOrder(id) {
    const o = state.orders.get(id);
    if (!o) return;
    const answer = await confirmDialog({
      title: 'حذف الطلب؟',
      message: `سيتم حذف طلب «${o.customer}» وصوره نهائياً.`,
      ok: 'نعم، احذف',
      danger: true,
    });
    if (answer !== 'ok') return;
    await store.deleteOrder(o);
    (o.photoIds || []).forEach(forgetPhoto);
    state.orders.delete(id);
    await closeLayer(); // close details
    refresh();
    toast('تم حذف الطلب');
  }

  // ---------------------------------------------------------------
  // Lightbox
  // ---------------------------------------------------------------
  const lb = { urls: [], index: 0 };
  function showLightboxImage() {
    $('#lbImg').src = lb.urls[lb.index];
    $('#lbCount').textContent = `${lb.index + 1} / ${lb.urls.length}`;
    $('.lb-nav').hidden = lb.urls.length < 2;
  }
  function openLightbox(urls, index) {
    lb.urls = urls; lb.index = index;
    showLightboxImage();
    openLayer($('#lightbox'));
  }
  function lbStep(delta) {
    if (lb.urls.length < 2) return;
    lb.index = (lb.index + delta + lb.urls.length) % lb.urls.length;
    showLightboxImage();
  }

  // ---------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------
  function setSeg(container, value) {
    $$('button', container).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.value === value)));
  }

  function updateLocationLabel() {
    const t = state.form && state.form.type;
    $('#fLocationLabel').textContent = t === 'corner' ? 'مكان المناسبة' : t === 'delivery' ? 'عنوان التوصيل' : 'مكان المناسبة / عنوان التوصيل';
  }

  function flowerRow(f = { name: '', qty: '' }) {
    const row = document.createElement('div');
    row.className = 'flower-row';
    row.innerHTML = `
      <input type="text" class="fname" list="flowerNames" placeholder="نوع الورد" value="${esc(f.name)}" autocomplete="off">
      <input type="text" class="qty" inputmode="numeric" placeholder="العدد" value="${esc(f.qty ?? '')}" autocomplete="off">
      <button type="button" class="del" aria-label="حذف">${icon('trash')}</button>`;
    return row;
  }

  function refreshFlowerSuggestions() {
    const names = new Set(DEFAULT_FLOWERS);
    for (const o of state.orders.values()) (o.flowers || []).forEach((f) => f.name && names.add(f.name));
    $('#flowerNames').innerHTML = Array.from(names).map((n) => `<option value="${esc(n)}"></option>`).join('');
  }

  function renderFormPhotos() {
    const grid = $('#photoGrid');
    $$('.thumb', grid).forEach((t) => t.remove());
    const add = $('.photo-add', grid);
    for (const p of state.form.photos) {
      const div = document.createElement('div');
      div.className = 'thumb';
      div.dataset.id = p.id;
      div.innerHTML = `<img alt=""><button type="button" class="rm" aria-label="إزالة الصورة">${icon('x')}</button>`;
      const img = div.querySelector('img');
      if (p.url) img.src = p.url;
      else photoURL(p.id).then((url) => { if (url) { p.url = url; img.src = url; } });
      grid.insertBefore(div, add);
    }
  }

  function formSnapshot() {
    return JSON.stringify(collectForm(false)) + '|' + state.form.photos.map((p) => p.id).join(',');
  }

  function openForm({ order = null, date = null } = {}) {
    state.form = {
      id: order ? order.id : null,
      type: order ? order.type : null,
      status: order ? order.status : 'new',
      photos: order ? (order.photoIds || []).map((id) => ({ id, existing: true, url: photoURLs.get(id) || null })) : [],
      removed: [],
      saving: false,
    };
    $('#formTitle').textContent = order ? 'تعديل الطلب' : 'طلب جديد';
    $('#fDate').value = order ? order.date : (date || state.selected || todayISO());
    $('#fTime').value = order ? (order.time || '') : '';
    $('#fTimeClear').hidden = !$('#fTime').value;
    $('#fCustomer').value = order ? order.customer : '';
    $('#fLocation').value = order ? (order.location || '') : '';
    $('#fNotes').value = order ? (order.notes || '') : '';
    setSeg($('#fType'), state.form.type);
    setSeg($('#fStatus'), state.form.status);
    updateLocationLabel();

    const rows = $('#flowerRows');
    rows.innerHTML = '';
    const flowers = order && order.flowers && order.flowers.length ? order.flowers : [{ name: '', qty: '' }];
    flowers.forEach((f) => rows.appendChild(flowerRow(f)));
    refreshFlowerSuggestions();
    renderFormPhotos();
    $$('#orderForm .field.invalid').forEach((f) => f.classList.remove('invalid'));
    state.form.initial = formSnapshot();

    openLayer($('#formSheet'), () => {
      // Discard object URLs of photos that were added but never saved
      if (state.form && !state.form.saved) {
        state.form.photos.filter((p) => !p.existing && p.url).forEach((p) => URL.revokeObjectURL(p.url));
      }
      state.form = null;
    });
    $('#orderForm').scrollTop = 0;
  }

  function parseQty(raw) {
    const v = toLatinDigits(raw).trim();
    if (v === '') return '';
    return /^\d+(\.\d+)?$/.test(v) ? Number(v) : raw.trim();
  }

  function collectForm(strict = true) {
    const flowers = $$('#flowerRows .flower-row').map((row) => ({
      name: $('.fname', row).value.trim(),
      qty: parseQty($('.qty', row).value),
    })).filter((f) => !strict || f.name || f.qty !== '');
    return {
      date: $('#fDate').value,
      time: $('#fTime').value || '',
      customer: $('#fCustomer').value.trim(),
      location: $('#fLocation').value.trim(),
      type: state.form.type,
      status: state.form.status,
      flowers: flowers.map((f) => ({ name: f.name || (strict ? 'ورد' : ''), qty: f.qty })),
      notes: $('#fNotes').value.trim(),
    };
  }

  function validate(data) {
    const errors = [];
    const mark = (name, bad) => {
      const field = $(`#orderForm [data-field="${name}"]`);
      field.classList.toggle('invalid', bad);
      if (bad) errors.push(field);
    };
    mark('date', !data.date);
    mark('customer', !data.customer);
    mark('type', !data.type);
    if (errors.length) {
      errors[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      errors.forEach((f) => { f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); });
    }
    return !errors.length;
  }

  async function saveForm() {
    const f = state.form;
    if (!f || f.saving) return;
    if (!$('#photoBusy').hidden) { toast('لحظة… جاري تجهيز الصور'); return; }
    const data = collectForm(true);
    if (!validate(data)) return;
    f.saving = true;
    try {
      const existing = f.id ? state.orders.get(f.id) : null;
      const ts = Date.now();
      const order = {
        id: f.id || uid(),
        ...data,
        photoIds: f.photos.map((p) => p.id),
        createdAt: existing ? existing.createdAt : ts,
        updatedAt: ts,
      };
      const newPhotos = [];
      for (const p of f.photos.filter((x) => !x.existing)) {
        newPhotos.push({ id: p.id, orderId: order.id, type: p.blob.type || 'image/jpeg', data: await p.blob.arrayBuffer() });
      }
      await store.saveOrder(order, newPhotos, f.removed);
      f.saved = true;
      f.photos.filter((p) => !p.existing).forEach((p) => photoURLs.set(p.id, p.url));
      f.removed.forEach(forgetPhoto);
      state.orders.set(order.id, order);

      // Jump the calendar to the order's month
      const d = parseISO(order.date);
      state.viewYear = d.getFullYear();
      state.viewMonth = d.getMonth();
      state.selected = order.date;
      if (state.dayDate) state.dayDate = order.date;

      await closeLayer();
      refresh();
      toast(existing ? 'تم حفظ التعديلات' : 'تمت إضافة الطلب 🌸');
      requestPersistence();
    } catch (err) {
      console.error(err);
      toast('صار خطأ أثناء الحفظ، حاول مرة ثانية');
    } finally {
      f.saving = false;
    }
  }

  async function cancelForm() {
    if (state.form && formSnapshot() !== state.form.initial) {
      const answer = await confirmDialog({ title: 'تجاهل التغييرات؟', message: 'لن يتم حفظ ما كتبته.', ok: 'تجاهل', cancel: 'متابعة التعديل', danger: true });
      if (answer !== 'ok') return;
    }
    closeLayer();
  }

  async function addPhotos(files) {
    if (!files.length || !state.form) return;
    const form = state.form;
    $('#photoBusy').hidden = false;
    let failed = 0;
    for (const file of files) {
      try {
        const blob = await compressImage(file);
        if (state.form !== form) return; // form was closed meanwhile
        form.photos.push({ id: uid(), existing: false, blob, url: URL.createObjectURL(blob) });
        renderFormPhotos();
      } catch (e) {
        failed++;
      }
    }
    $('#photoBusy').hidden = true;
    if (failed) toast(`تعذر إضافة ${failed} صورة`);
  }

  // ---------------------------------------------------------------
  // Backup: export / import
  // ---------------------------------------------------------------
  function abToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function base64ToAb(b64) {
    const s = atob(b64.replace(/^data:[^,]*,/, ''));
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out.buffer;
  }

  function downloadFile(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function markBackup() {
    try { localStorage.setItem(BACKUP_KEY, new Date().toISOString()); } catch (e) { /* ignore */ }
    updateMenuInfo();
  }

  async function exportBackup() {
    try {
      const [orders, photos] = await Promise.all([store.allOrders(), store.allPhotos()]);
      const payload = {
        app: 'florist-orders',
        version: 1,
        exportedAt: new Date().toISOString(),
        orders,
        photos: photos.map((p) => ({ id: p.id, orderId: p.orderId, type: p.type, data: abToBase64(p.data) })),
      };
      const name = `florist-backup-${todayISO()}.json`;
      const file = new File([JSON.stringify(payload)], name, { type: 'application/json' });
      const canShare = navigator.canShare && matchMedia('(pointer: coarse)').matches && navigator.canShare({ files: [file] });

      if (canShare) {
        // Sharing needs a fresh tap, so ask first (lets her save to Files, WhatsApp, email…)
        const answer = await confirmDialog({
          title: 'النسخة الاحتياطية جاهزة',
          message: `${orders.length} طلب و ${photos.length} صورة.\nاحفظ الملف في مكان آمن (الملفات، واتساب، الإيميل…).`,
          ok: 'حفظ / مشاركة',
          alt: 'تنزيل الملف',
        });
        if (answer === 'ok') {
          try {
            await navigator.share({ files: [file], title: name });
            markBackup();
            toast('تم حفظ النسخة الاحتياطية');
          } catch (e) {
            if (e.name !== 'AbortError') { downloadFile(file); markBackup(); }
          }
        } else if (answer === 'alt') {
          downloadFile(file);
          markBackup();
        }
      } else {
        downloadFile(file);
        markBackup();
        toast('تم تنزيل النسخة الاحتياطية');
      }
    } catch (err) {
      console.error(err);
      toast('تعذر تصدير النسخة الاحتياطية');
    }
  }

  async function importBackup(file) {
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch (e) {
      toast('الملف غير صالح');
      return;
    }
    if (!data || data.app !== 'florist-orders' || !Array.isArray(data.orders)) {
      toast('هذا الملف ليس نسخة احتياطية من دفتر الورد');
      return;
    }
    const orders = data.orders.filter((o) => o && o.id && o.date && o.customer);
    const photos = (data.photos || []).filter((p) => p && p.id && p.data);
    const overlap = orders.filter((o) => state.orders.has(o.id)).length;
    const answer = await confirmDialog({
      title: 'استيراد النسخة الاحتياطية؟',
      message: `الملف فيه ${orders.length} طلب و ${photos.length} صورة.` + (overlap ? `\n${overlap} طلب موجود مسبقاً وسيتم تحديثه.` : '') + '\nالطلبات الحالية الأخرى لن تُحذف.',
      ok: 'استيراد',
    });
    if (answer !== 'ok') return;
    try {
      const photoRecs = photos.map((p) => ({ id: p.id, orderId: p.orderId, type: p.type || 'image/jpeg', data: base64ToAb(p.data) }));
      const cleanOrders = orders.map((o) => ({
        id: String(o.id),
        date: String(o.date),
        time: o.time || '',
        customer: String(o.customer),
        location: o.location || '',
        type: o.type === 'corner' ? 'corner' : 'delivery',
        status: STATUSES[o.status] ? o.status : 'new',
        flowers: Array.isArray(o.flowers) ? o.flowers.map((f) => ({ name: String(f.name || ''), qty: f.qty ?? '' })) : [],
        notes: o.notes || '',
        photoIds: Array.isArray(o.photoIds) ? o.photoIds.map(String) : [],
        createdAt: o.createdAt || Date.now(),
        updatedAt: o.updatedAt || Date.now(),
      }));
      await store.putMany(cleanOrders, photoRecs);
      photoRecs.forEach((p) => forgetPhoto(p.id));
      cleanOrders.forEach((o) => state.orders.set(o.id, o));
      refresh();
      updateMenuInfo();
      toast(`تم استيراد ${cleanOrders.length} طلب`);
      requestPersistence();
    } catch (err) {
      console.error(err);
      toast('تعذر استيراد الملف');
    }
  }

  // ---------------------------------------------------------------
  // Menu / install
  // ---------------------------------------------------------------
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function updateMenuInfo() {
    const orders = state.orders.size;
    const photos = ordersArray().reduce((n, o) => n + (o.photoIds || []).length, 0);
    $('#menuStats').textContent = `${orders} طلب · ${photos} صورة محفوظة على هذا الجهاز`;
    let last = null;
    try { last = localStorage.getItem(BACKUP_KEY); } catch (e) { /* ignore */ }
    $('#backupInfo').textContent = last
      ? `آخر نسخة احتياطية: ${fmtDate(iso(new Date(last)), { year: true })}`
      : 'ننصح بعمل نسخة احتياطية كل أسبوع 🌷';
    $('#installBtn').hidden = !state.installPrompt || isStandalone();
    $('#iosHint').hidden = !(isIOS() && !isStandalone());
  }

  function requestPersistence() {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  }

  // ---------------------------------------------------------------
  // Refresh everything that's visible
  // ---------------------------------------------------------------
  function refresh() {
    renderCalendar();
    renderUpcoming();
    renderSearch();
    if (isOpen($('#daySheet'))) renderDay();
    if (isOpen($('#detailSheet'))) renderDetail();
  }

  // ---------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------
  function bindEvents() {
    $('#prevMonth').addEventListener('click', () => shiftMonth(-1));
    $('#nextMonth').addEventListener('click', () => shiftMonth(1));
    $('#todayBtn').addEventListener('click', () => {
      const d = new Date();
      state.viewYear = d.getFullYear();
      state.viewMonth = d.getMonth();
      state.selected = todayISO();
      renderCalendar();
    });
    $('#calGrid').addEventListener('click', (e) => {
      const btn = e.target.closest('.day[data-date]');
      if (btn) openDay(btn.dataset.date);
    });

    // Swipe between months on the calendar
    let touchX = null, touchY = null;
    const cal = $('#calendarCard');
    cal.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }, { passive: true });
    cal.addEventListener('touchend', (e) => {
      if (touchX == null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      const dy = e.changedTouches[0].clientY - touchY;
      touchX = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) shiftMonth(dx > 0 ? 1 : -1); // RTL: swipe right → next
    });

    // Open order details from any list
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.order[data-id]');
      if (card) openDetail(card.dataset.id);
    });

    $('#fab').addEventListener('click', () => openForm({ date: state.selected }));
    $('#dayAdd').addEventListener('click', () => openForm({ date: state.dayDate }));

    // Search
    const search = $('#searchInput');
    search.addEventListener('input', () => { state.query = search.value; renderSearch(); });
    $('#searchClear').addEventListener('click', () => { search.value = ''; state.query = ''; renderSearch(); search.focus(); });

    // Form
    $('#orderForm').addEventListener('submit', (e) => { e.preventDefault(); saveForm(); });
    $('#formSaveTop').addEventListener('click', saveForm);
    $('#formCancel').addEventListener('click', cancelForm);
    $('#fType').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-value]');
      if (!b) return;
      state.form.type = b.dataset.value;
      setSeg($('#fType'), state.form.type);
      $('#orderForm [data-field="type"]').classList.remove('invalid');
      updateLocationLabel();
    });
    $('#fStatus').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-value]');
      if (!b) return;
      state.form.status = b.dataset.value;
      setSeg($('#fStatus'), state.form.status);
    });
    $('#fCustomer').addEventListener('input', () => $('#orderForm [data-field="customer"]').classList.remove('invalid'));
    $('#fDate').addEventListener('input', () => $('#orderForm [data-field="date"]').classList.remove('invalid'));
    $('#fTime').addEventListener('input', () => { $('#fTimeClear').hidden = !$('#fTime').value; });
    $('#fTimeClear').addEventListener('click', () => { $('#fTime').value = ''; $('#fTimeClear').hidden = true; });
    $('#addFlower').addEventListener('click', () => {
      const row = flowerRow();
      $('#flowerRows').appendChild(row);
      $('.fname', row).focus();
    });
    $('#flowerRows').addEventListener('click', (e) => {
      const del = e.target.closest('.del');
      if (!del) return;
      const rows = $$('#flowerRows .flower-row');
      const row = del.closest('.flower-row');
      if (rows.length === 1) { $$('input', row).forEach((i) => { i.value = ''; }); return; }
      row.remove();
    });
    $('#fPhotos').addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      addPhotos(files);
    });
    $('#photoGrid').addEventListener('click', (e) => {
      const rm = e.target.closest('.rm');
      if (rm) {
        const id = rm.closest('.thumb').dataset.id;
        const idx = state.form.photos.findIndex((p) => p.id === id);
        if (idx < 0) return;
        const [p] = state.form.photos.splice(idx, 1);
        if (p.existing) state.form.removed.push(p.id);
        else if (p.url) URL.revokeObjectURL(p.url);
        renderFormPhotos();
        return;
      }
      const thumb = e.target.closest('.thumb');
      if (thumb) {
        const urls = state.form.photos.map((p) => p.url).filter(Boolean);
        const i = state.form.photos.findIndex((p) => p.id === thumb.dataset.id);
        if (urls.length) openLightbox(urls, Math.max(0, i));
      }
    });

    // Details
    $('#detailBody').addEventListener('click', async (e) => {
      const id = state.detailId;
      if (!id) return;
      if (e.target.closest('#dEdit')) return openForm({ order: state.orders.get(id) });
      if (e.target.closest('#dDelete')) return deleteOrder(id);
      const st = e.target.closest('#dStatus button[data-value]');
      if (st) return setStatus(id, st.dataset.value);
      const thumb = e.target.closest('#dPhotos .thumb');
      if (thumb) {
        const o = state.orders.get(id);
        const urls = (await Promise.all(o.photoIds.map(photoURL))).filter(Boolean);
        openLightbox(urls, Number(thumb.dataset.index) || 0);
      }
    });
    $('#detailEditTop').addEventListener('click', () => {
      const o = state.orders.get(state.detailId);
      if (o) openForm({ order: o });
    });

    // Lightbox
    $('#lbPrev').addEventListener('click', (e) => { e.stopPropagation(); lbStep(-1); });
    $('#lbNext').addEventListener('click', (e) => { e.stopPropagation(); lbStep(1); });
    $('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') closeLayer(); });
    let lbX = null;
    $('#lightbox').addEventListener('touchstart', (e) => { lbX = e.touches[0].clientX; }, { passive: true });
    $('#lightbox').addEventListener('touchend', (e) => {
      if (lbX == null) return;
      const dx = e.changedTouches[0].clientX - lbX;
      lbX = null;
      if (Math.abs(dx) > 50) lbStep(dx > 0 ? 1 : -1);
    });

    // Menu
    $('#menuBtn').addEventListener('click', () => { updateMenuInfo(); openLayer($('#menuSheet')); });
    $('#exportBtn').addEventListener('click', exportBackup);
    $('#importBtn').addEventListener('click', () => $('#importInput').click());
    $('#importInput').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (file) importBackup(file);
    });
    $('#installBtn').addEventListener('click', async () => {
      if (!state.installPrompt) return;
      state.installPrompt.prompt();
      await state.installPrompt.userChoice.catch(() => {});
      state.installPrompt = null;
      updateMenuInfo();
    });
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      state.installPrompt = e;
      updateMenuInfo();
    });

    // Keep "today" correct if the app stays open past midnight
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderCalendar(); renderUpcoming(); } });
  }

  // ---------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------
  async function init() {
    renderWeekdays();
    bindEvents();
    renderCalendar();
    try {
      const orders = await store.allOrders();
      orders.forEach((o) => state.orders.set(o.id, o));
    } catch (err) {
      console.error(err);
      toast('تعذر فتح قاعدة البيانات على هذا المتصفح');
    }
    refresh();
    if (state.orders.size) requestPersistence();

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW registration failed', e));
    }
  }

  init();
})();
