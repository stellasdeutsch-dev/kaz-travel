import './style.css';
import { LOCATIONS, EXPERIENCES, mapsUrl } from './locations.js';
import { REGIONS_ALL, ACTIVITIES, PHRASES, QUICKFACTS, UNESCO, SEASONS, PRACTICAL, EVENTS } from './content.js';
import { App3D } from './app3d.js';

const $ = (s) => document.querySelector(s);
const BASE = import.meta.env.BASE_URL;

/* ---------- иконки ---------- */
const S = (d) =>
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

const ICONS = {
  mountain: S('<path d="M3 20l6-11 4 7 3-4 5 8H3z"/>'),
  ski: S('<circle cx="17" cy="5" r="2"/><path d="M3 21l14-7-5-3 3-4"/><path d="M2 17l19 4"/>'),
  yurt: S('<path d="M4 20h16M5 20l1-8h12l1 8M4 12l8-7 8 7z"/><path d="M12 20v-5"/>'),
  rocket: S('<path d="M12 15c-3 0-5-2-5-2s1-7 5-10c4 3 5 10 5 10s-2 2-5 2z"/><path d="M9 13l-3 5 3-1 3 3 3-3 3 1-3-5"/><circle cx="12" cy="8" r="1.4"/>'),
  compass: S('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
  wave: S('<path d="M2 12c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M2 17c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/>'),
  mosque: S('<path d="M4 21V12M20 21V12M4 12a8 8 0 0116 0"/><path d="M12 4c1.5 1.2 2.2 2.3 2.2 3.4M2 21h20"/><path d="M8 21v-4a4 4 0 018 0v4"/>'),
  bird: S('<path d="M21 5l-4 2c-1-2-3-3-5-3a6 6 0 00-6 6c0 5 5 9 8 9"/><path d="M3 9H2M14 21c4 0 7-3 7-7"/><circle cx="15.5" cy="7.5" r="0.6" fill="currentColor"/>'),
  passport: S('<rect x="5" y="3" width="14" height="18" rx="2.5"/><circle cx="12" cy="10" r="2.8"/><path d="M9 17h6"/>'),
  money: S('<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>'),
  chat: S('<path d="M20 15a2 2 0 01-2 2H8l-4 3V6a2 2 0 012-2h12a2 2 0 012 2z"/>'),
  plane: S('<path d="M10 4.5a1.5 1.5 0 013 0V10l8 4.5v2l-8-2v4l2.5 2v1.5L12 21l-3.5 1v-1.5L11 18.5v-4l-8 2v-2L11 10z"/>'),
  car: S('<path d="M5 17h14M4 17v-4.5L6 7h12l2 5.5V17"/><circle cx="7.5" cy="17.5" r="1.6"/><circle cx="16.5" cy="17.5" r="1.6"/>'),
  shield: S('<path d="M12 3l8 3v6c0 5-3.5 8.2-8 9-4.5-.8-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
  flower: S('<path d="M12 9a3 3 0 100 6 3 3 0 000-6z"/><path d="M12 9c0-2.5-1-4-2.5-4S7 6.2 7 8s1.8 3.2 3.5 3.4M12 9c0-2.5 1-4 2.5-4S17 6.2 17 8s-1.8 3.2-3.5 3.4"/><path d="M12 15v6M9.5 21h5"/>'),
  food: S('<path d="M6 3v8a2.5 2.5 0 005 0V3M8.5 11v10"/><path d="M17 3c-1.7 1.4-2.5 3.4-2.5 5.5S15.3 12 17 12.5V21"/>'),
  spa: S('<path d="M12 12c0-4 2.5-7 6.5-8 .6 4.5-2 8-6.5 8zm0 0c0-4-2.5-7-6.5-8C4.9 8.5 7.5 12 12 12z"/><path d="M4 17c1.8 1.4 3.4 1.4 5.2 0 1.8-1.4 3.4-1.4 5.2 0 1.8 1.4 3.4 1.4 5.6-.2"/>'),
  trophy: S('<path d="M8 4h8v6a4 4 0 01-8 0z"/><path d="M8 5H4.5v2A3.5 3.5 0 008 10.5M16 5h3.5v2A3.5 3.5 0 0116 10.5"/><path d="M12 14v3m-4 4h8m-6.5 0v-2.5a1.5 1.5 0 013 0V21"/>'),
  factory: S('<path d="M3 21V9l6 4V9l6 4V4h6v17z"/><path d="M7 17h2m4 0h2"/>'),
  leaf: S('<path d="M5 21C5 12 11 5 21 4c0 10-6 16-15 16"/><path d="M5 21c2-5 6-9 11-11"/>'),
  briefcase: S('<rect x="3" y="7.5" width="18" height="13" rx="2.5"/><path d="M9 7.5V6a2 2 0 012-2h2a2 2 0 012 2v1.5M3 13h18"/>'),
  bolt: S('<path d="M13 2L4.5 14H10l-1.5 8L18 10h-5.5z"/>'),
  star: S('<path d="M12 3l2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.6 6.7 19.5l1.1-6L3.4 9.3l6-.8z"/>'),
  columns: S('<path d="M3 21h18M4 8h16M12 3L4 8m8-5l8 5"/><path d="M6 8v13m4-13v13m4-13v13m4-13v13"/>'),
};

/* ================================================================
   3D
   ================================================================ */
const stage = $('#stage');
const app = new App3D({
  stage,
  canvas: $('#scene'),
  labels: $('#labels'),
  onSelect: showPanel,
  onDeselect: hidePanel,
});
app.ready = () => setTimeout(() => $('#loader').classList.add('done'), 350);
setTimeout(() => $('#loader').classList.add('done'), 5000);
if (import.meta.env.DEV) window.app3d = app;

/* ================================================================
   РЕНДЕР ГЛАВНОЙ
   ================================================================ */
const arrow =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

$('.tiles').innerHTML = LOCATIONS.map(
  (loc) => `
  <article class="tile reveal" data-id="${loc.id}">
    <div class="tile-media"><img src="${BASE}${loc.img}" alt="${loc.name}" loading="lazy" /></div>
    <div class="tile-content">
      <span class="tile-region">${loc.region}</span>
      <h2 class="tile-name">${loc.name}</h2>
      <p class="tile-tag">${loc.tagline}</p>
      <div class="tile-actions">
        <button class="btn btn-primary" data-walk="${loc.id}">Прогуляться в 3D</button>
        <a class="btn btn-ghost" href="#/place/${loc.id}">Подробнее ${arrow}</a>
      </div>
    </div>
  </article>`
).join('');

$('#expStrip').innerHTML = EXPERIENCES.map(
  (e) => `<div class="strip-item reveal"><div class="strip-ico">${ICONS[e.icon]}</div><h3>${e.title}</h3></div>`
).join('');

/* ================================================================
   РЕНДЕР «СПЛАНИРОВАТЬ»
   ================================================================ */
// сезоны
const seg = $('#seasonSeg');
seg.innerHTML = SEASONS.map((s, i) => `<button role="tab" data-i="${i}">${s.name}</button>`).join('');
function setSeason(i) {
  seg.querySelectorAll('button').forEach((b, k) => b.classList.toggle('active', k === i));
  const s = SEASONS[i];
  const st = $('#seasonStage');
  st.className = `season-stage s${i}`;
  const temp = $('#seasonTemp');
  temp.textContent = s.temp.replace(' °C', '°');
  temp.classList.remove('swap');
  void temp.offsetWidth;                 // перезапуск анимации смены температуры
  temp.classList.add('swap');
  $('#seasonMonths').textContent = `${s.name} · ${s.months}`;
  $('#seasonText').textContent = s.text;
}
seg.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) setSeason(+b.dataset.i);
});
// сезоны в массиве начинаются с весны (март), поэтому сдвигаем месяц на два
setSeason(Math.floor(((new Date().getMonth() - 2 + 12) % 12) / 3));

// события
$('#eventLane').innerHTML = EVENTS.map(
  (e) => `<div class="lane-card reveal">
    <span class="lane-when">${e.when}</span>
    <h3>${e.name}</h3>
    <div class="lane-where">${e.where}</div>
    <p>${e.text}</p>
  </div>`
).join('');

// ЮНЕСКО
$('#unescoLane').innerHTML = UNESCO.map(
  (u) => `<div class="lane-card reveal ${u.type === 'nature' ? 'nature' : ''}">
    <div class="lane-year">${u.year}</div>
    <h3>${u.name}</h3>
    <p>${u.text}</p>
  </div>`
).join('');

// практика — аккордеон
$('#practicalAcc').innerHTML = PRACTICAL.map(
  (p, i) => `
  <button class="acc-head" data-acc="p${i}">
    <span class="acc-ico">${ICONS[p.icon]}</span><span>${p.title}</span>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>
  <div class="acc-body"><p>${p.html}</p>${p.note ? `<div class="acc-note">${p.note}</div>` : ''}</div>`
).join('');

// быстрые факты
$('#qfacts').innerHTML = QUICKFACTS.map(
  (q) => `<div class="qfact reveal"><div class="qfact-v">${q.v}</div><div class="qfact-c">${q.c}</div></div>`
).join('');

// разговорник — флип-карточки
$('#phrases').innerHTML = PHRASES.map(
  (p) => `<button class="flip reveal" aria-label="${p.kk} — ${p.ru}">
    <span class="flip-inner">
      <span class="flip-face flip-front">${p.kk}</span>
      <span class="flip-face flip-back">${p.ru}</span>
    </span>
  </button>`
).join('');
$('#phrases').addEventListener('click', (e) => {
  const f = e.target.closest('.flip');
  if (f) f.classList.toggle('flipped');
});

/* ================================================================
   РЕГИОНЫ (20) и ВПЕЧАТЛЕНИЯ (13)
   ================================================================ */
$('#regions20').innerHTML = REGIONS_ALL.map(
  (r, i) => `
  <button class="rcard reveal" data-i="${i}">
    <span class="rcard-head">
      <span class="rcard-name">${r.name}</span>
      ${r.count ? `<span class="rcard-count">${r.count}<i>объекта(ов)</i></span>` : '<span class="rcard-count new">новое</span>'}
    </span>
    <span class="rcard-center">${r.center}</span>
    <span class="rcard-more">
      <span class="rcard-line">${r.line}</span>
      <span class="rcard-spots">${r.spots.map((s) => `<i>${s}</i>`).join('')}</span>
    </span>
  </button>`
).join('');
$('#regions20').addEventListener('click', (e) => {
  const c = e.target.closest('.rcard');
  if (c) c.classList.toggle('open');
});

$('#actsGrid').innerHTML = ACTIVITIES.map(
  (a) => `<div class="act reveal">
    <div class="act-ico">${ICONS[a.icon]}</div>
    <h3>${a.title}</h3>
    <p>${a.line}</p>
  </div>`
).join('');

/* аккордеоны (общий обработчик) */
document.addEventListener('click', (e) => {
  const head = e.target.closest('.acc-head');
  if (!head) return;
  const body = head.nextElementSibling;
  const open = !head.classList.contains('open');
  head.classList.toggle('open', open);
  if (body && body.classList.contains('acc-body')) body.classList.toggle('open', open);
});

/* ================================================================
   ПАНЕЛЬ ЛОКАЦИИ НА КАРТЕ
   ================================================================ */
const panel = $('#panel');
let panelLoc = null;

function showPanel(loc) {
  panelLoc = loc;
  $('#panelImg').src = BASE + loc.img;
  $('#panelImg').alt = loc.name;
  $('#panelRegion').textContent = loc.region;
  $('#panelName').textContent = loc.name;
  $('#panelFacts').innerHTML = loc.facts.map((f) => `<span>${f}</span>`).join('');
  $('#panelMore').href = `#/place/${loc.id}`;
  panel.classList.add('open');
}
function hidePanel() {
  panel.classList.remove('open');
  panelLoc = null;
}
$('#panelClose').addEventListener('click', () => {
  hidePanel();
  app.resetView();
});
$('#panelWalk').addEventListener('click', () => panelLoc && enterWalk(panelLoc.id));

/* ================================================================
   РЕЖИМ ПРОГУЛКИ
   ================================================================ */
const walkUI = $('#walkUI');
const walkInfo = $('#walkInfo');
const fader = $('#fader');
let inWalk = false;

function fillWalkInfo(loc) {
  $('#wiRegion').textContent = loc.region;
  $('#wiName').textContent = loc.name;
  $('#wiImg').src = BASE + loc.img;
  $('#wiImg').alt = loc.name;
  $('#wiCredit').innerHTML = `Фото: ${loc.credit.author} · <a href="${loc.credit.url}" target="_blank" rel="noopener">${loc.credit.license}</a>`;
  $('#wiLead').textContent = loc.short;
  $('#wiFacts').innerHTML = loc.facts.map((f) => `<span>${f}</span>`).join('');
  $('#wiDetail').innerHTML = loc.detailed.map((p) => `<p>${p}</p>`).join('');
  $('#wiHow').textContent = loc.practical.how;
  $('#wiWhen').textContent = loc.practical.when;
  $('#wiTime').textContent = loc.practical.time;
  $('#wiCoords').textContent = loc.coords
    ? `${loc.coords[0].toFixed(4)}° с. ш., ${loc.coords[1].toFixed(4)}° в. д.`
    : 'Объект вне дорог общего пользования — точный маршрут даст оператор.';
  $('#wiMaps').href = mapsUrl(loc);
  $('#wiDetail').classList.remove('open');
  $('#wiToggle').setAttribute('aria-expanded', 'false');
  walkInfo.querySelector('.wi-scroll').scrollTop = 0;
}

async function enterWalk(id) {
  if (inWalk) return;
  const loc = LOCATIONS.find((l) => l.id === id);
  if (!loc) return;
  inWalk = true;

  fader.classList.add('on');
  await new Promise((r) => setTimeout(r, 450));

  panel.classList.remove('open');
  stage.classList.remove('stage-hidden');
  stage.classList.add('fullscreen');
  document.body.style.overflow = 'hidden';
  app.enterWalk(id);

  fillWalkInfo(loc);
  walkUI.classList.add('open');
  setWalkTab(true);

  await new Promise((r) => setTimeout(r, 120));
  fader.classList.remove('on');
}

async function exitWalk() {
  if (!inWalk) return;
  fader.classList.add('on');
  await new Promise((r) => setTimeout(r, 450));

  walkUI.classList.remove('open');
  walkInfo.classList.remove('open');
  stage.classList.remove('fullscreen');
  document.body.style.overflow = '';
  app.exitWalk();
  inWalk = false;          // до syncStage: иначе он выйдет по guard и слой карты останется висеть
  syncStage();
  if (panelLoc && current === 'home') panel.classList.add('open');

  await new Promise((r) => setTimeout(r, 120));
  fader.classList.remove('on');
}

function setWalkTab(open) {
  walkInfo.classList.toggle('open', open);
  $('#wiTabText').textContent = open ? 'Скрыть' : 'Об объекте';
}

$('#walkBack').addEventListener('click', exitWalk);
$('#wiTab').addEventListener('click', () => setWalkTab(!walkInfo.classList.contains('open')));
$('#wiToggle').addEventListener('click', (e) => {
  const btn = e.currentTarget;
  const open = btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', String(open));
  $('#wiDetail').classList.toggle('open', open);
});
addEventListener('keydown', (e) => {
  if (e.code === 'Escape') exitWalk();
});

/* кнопки «Прогуляться в 3D» в тайлах и на страницах мест */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-walk]');
  if (b) enterWalk(b.dataset.walk);
});

/* ================================================================
   СТРАНИЦА МЕСТА
   ================================================================ */
let placeId = null;

function fillPlace(id) {
  const loc = LOCATIONS.find((l) => l.id === id);
  if (!loc) return false;
  placeId = id;
  $('#plImg').src = BASE + loc.img;
  $('#plImg').alt = loc.name;
  $('#plRegion').textContent = loc.region;
  $('#plName').textContent = loc.name;
  $('#plTag').textContent = loc.tagline;
  $('#plFacts').innerHTML = loc.facts.map((f) => `<span>${f}</span>`).join('');
  $('#plWalk').dataset.walk = loc.id;
  $('#plMaps').href = mapsUrl(loc);
  $('#plShort').textContent = loc.short;
  $('#plStory').innerHTML = loc.detailed.map((p) => `<p>${p}</p>`).join('');
  $('#plPlan').innerHTML = `
    <div class="acc-rows">
      <div class="acc-row"><span class="acc-row-ico">${ICONS.car}</span><div class="acc-row-txt"><b>Как добраться</b>${loc.practical.how}</div></div>
      <div class="acc-row"><span class="acc-row-ico">${ICONS.compass}</span><div class="acc-row-txt"><b>Когда ехать</b>${loc.practical.when}</div></div>
      <div class="acc-row"><span class="acc-row-ico">${ICONS.passport}</span><div class="acc-row-txt"><b>Сколько времени</b>${loc.practical.time}</div></div>
    </div>`;
  $('#plCredit').innerHTML = `Фото: ${loc.credit.author} · <a href="${loc.credit.url}" target="_blank" rel="noopener">${loc.credit.license}</a>`;

  const next = LOCATIONS[(LOCATIONS.indexOf(loc) + 1) % LOCATIONS.length];
  $('#plNext').href = `#/place/${next.id}`;
  $('#plNextName').textContent = next.name;

  // свернуть аккордеоны
  document.querySelectorAll('#plAcc .acc-head').forEach((h) => h.classList.remove('open'));
  document.querySelectorAll('#plAcc .acc-body').forEach((b) => b.classList.remove('open'));
  return true;
}

/* ================================================================
   РОУТЕР
   ================================================================ */
const pages = {};
document.querySelectorAll('main[data-page]').forEach((el) => (pages[el.dataset.page] = el));
let current = 'home';

function syncStage() {
  if (inWalk) return;
  stage.classList.toggle('stage-hidden', current !== 'home');
  if (current === 'home') app.resize();
}

function showPage(name) {
  const changed = current !== name;
  current = name;
  for (const [k, el] of Object.entries(pages)) el.hidden = k !== name;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('active', a.dataset.nav === name);
  });
  syncStage();
  observeReveals();
  // анимация входа страницы
  if (changed) {
    const el = pages[name];
    el.classList.remove('page-enter');
    void el.offsetWidth;
    el.classList.add('page-enter');
  }
}

function route() {
  const h = location.hash || '#/';
  if (h.startsWith('#/place/')) {
    const ok = fillPlace(h.slice(8));
    if (!ok) { location.hash = '#/'; return; }
    showPage('place');
    scrollTo(0, 0);
  } else if (h === '#/plan' || h === '#/regions' || h === '#/activities') {
    showPage(h.slice(2));
    scrollTo(0, 0);
  } else if (h === '#/places') {
    showPage('home');
    document.getElementById('places')?.scrollIntoView({ behavior: 'smooth' });
  } else {
    showPage('home');
    if (h !== '#/' && h !== '') history.replaceState(null, '', '#/');
    scrollTo(0, 0);
  }
}
addEventListener('hashchange', route);

/* ================================================================
   СКРОЛЛ-ЭФФЕКТЫ
   ================================================================ */
const nav = $('#nav');
const progress = $('#progress');
addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', scrollY > 30);
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.width = max > 0 ? `${(scrollY / max) * 100}%` : '0%';
  parallax();
}, { passive: true });

$('#scrollDown').addEventListener('click', () =>
  document.getElementById('places').scrollIntoView({ behavior: 'smooth' })
);

// лёгкий параллакс фото в тайлах и в шапке места
function parallax() {
  const els = document.querySelectorAll('.tile-media img, .place-media img');
  const vh = innerHeight;
  for (const img of els) {
    const r = img.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) continue;
    const p = (r.top + r.height / 2 - vh / 2) / vh; // -0.5..0.5
    img.style.transform = `translateY(${(-p * r.height * 0.12).toFixed(1)}px)`;
  }
}

/* появление блоков */
const io = new IntersectionObserver(
  (entries) => entries.forEach((en) => en.isIntersecting && en.target.classList.add('in')),
  { threshold: 0.1 }
);
function observeReveals() {
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
}

/* счётчики больших цифр */
const fmt = new Intl.NumberFormat('ru-RU');
const ioNum = new IntersectionObserver(
  (entries) => {
    for (const en of entries) {
      if (!en.isIntersecting || en.target.dataset.done) continue;
      en.target.dataset.done = '1';
      const total = +en.target.dataset.count;
      if (total < 100) { en.target.textContent = total; continue; }
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min((now - t0) / 1500, 1);
        en.target.textContent = fmt.format(Math.round(total * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  },
  { threshold: 0.5 }
);
document.querySelectorAll('.bignum-v').forEach((el) => ioNum.observe(el));

document.querySelectorAll('.year').forEach((el) => (el.textContent = new Date().getFullYear()));

/* ================================================================
   АНИМАЦИИ
   ================================================================ */
// заголовок hero: буквы взлетают по очереди
(() => {
  const title = document.querySelector('.hero-title');
  title.classList.remove('reveal');
  const wrap = (text, cls) =>
    [...text].map((ch, i) => `<span class="hl ${cls}" style="animation-delay:${0.35 + i * 0.055}s">${ch}</span>`).join('');
  const gradEl = title.querySelector('.grad');
  const plain = title.firstChild.textContent;   // «КАЗАХ»
  const grad = gradEl.textContent;              // «СТАН»
  title.innerHTML = wrap(plain, '') + wrap(grad, 'hl-grad');
  // градиентным буквам смещаем позицию фона, чтобы градиент шёл по всему слову
  title.querySelectorAll('.hl-grad').forEach((el, i, all) => {
    el.style.backgroundPosition = `${(i / Math.max(all.length - 1, 1)) * 100}% 0`;
  });
})();

// 3D-наклон фото-тайлов за курсором
document.querySelectorAll('.tile').forEach((tile) => {
  tile.addEventListener('pointermove', (e) => {
    if (matchMedia('(pointer: coarse)').matches) return;
    const r = tile.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    tile.style.transform = `perspective(1200px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 3).toFixed(2)}deg)`;
  });
  tile.addEventListener('pointerleave', () => { tile.style.transform = ''; });
});

// каскадные появления внутри сеток и лент
document.querySelectorAll('.tiles, .strip, .lane, .acts, .regions20, .phrases, .bignums, .qfacts').forEach((group) => {
  [...group.children].forEach((el, i) => {
    if (el.classList.contains('reveal')) el.style.transitionDelay = `${Math.min(i % 8, 5) * 70}ms`;
  });
});

route();
parallax();
