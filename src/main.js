import './style.css';
import { LOCATIONS, EXPERIENCES, mapsUrl } from './locations.js';
import { REGIONS, UNESCO, SEASONS, PRACTICAL, EVENTS } from './content.js';
import { App3D } from './app3d.js';

const $ = (s) => document.querySelector(s);
const BASE = import.meta.env.BASE_URL;

/* ---------- иконки ---------- */
const S = (d, extra = '') =>
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}${extra}</svg>`;

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
};

/* ---------- карточки направлений ---------- */
const cardsEl = $('#cards');
for (const loc of LOCATIONS) {
  const card = document.createElement('article');
  card.className = 'card reveal';
  card.innerHTML = `
    <div class="card-photo">
      <span class="card-badge">${loc.region}</span>
      <img src="${BASE}${loc.img}" alt="${loc.name}" loading="lazy" width="1100" height="825" />
    </div>
    <div class="card-body">
      <h3 class="card-name">${loc.name}</h3>
      <p class="card-tag">${loc.tagline}</p>
      <span class="card-cta">Прогуляться в 3D
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
    </div>`;
  card.addEventListener('click', () => enterWalk(loc.id));
  cardsEl.appendChild(card);
}

/* ---------- впечатления ---------- */
$('#expGrid').innerHTML = EXPERIENCES.map(
  (e) => `<div class="exp reveal"><div class="exp-ico">${ICONS[e.icon]}</div><h3>${e.title}</h3><p>${e.text}</p></div>`
).join('');

/* ---------- регионы ---------- */
$('#regionGrid').innerHTML = REGIONS.map(
  (r) => `<div class="region reveal">
    <h3>${r.name}</h3><p>${r.text}</p>
    <ul>${r.spots.map((s) => `<li>${s}</li>`).join('')}</ul>
  </div>`
).join('');

/* ---------- ЮНЕСКО ---------- */
$('#unescoGrid').innerHTML = UNESCO.map(
  (u) => `<div class="uitem reveal ${u.type === 'nature' ? 'nature' : ''}">
    <span class="uitem-year">${u.year}</span>
    <div><h4>${u.name}</h4><p>${u.text}</p></div>
  </div>`
).join('');

/* ---------- сезоны ---------- */
$('#seasonGrid').innerHTML = SEASONS.map(
  (s) => `<div class="season reveal">
    <div class="season-name">${s.name}</div>
    <div class="season-temp">${s.months} · ${s.temp}</div>
    <p>${s.text}</p>
  </div>`
).join('');

/* ---------- события ---------- */
$('#eventGrid').innerHTML = EVENTS.map(
  (e) => `<div class="event reveal">
    <div class="event-when">${e.when}</div>
    <h3>${e.name}</h3>
    <div class="event-where">${e.where}</div>
    <p>${e.text}</p>
  </div>`
).join('');

/* ---------- практическая информация ---------- */
$('#practicalGrid').innerHTML = PRACTICAL.map(
  (p) => `<div class="pcard reveal">
    <div class="pcard-head"><span class="pcard-ico">${ICONS[p.icon]}</span><h3>${p.title}</h3></div>
    <p>${p.html}</p>
    ${p.note ? `<p class="pcard-note">${p.note}</p>` : ''}
  </div>`
).join('');

/* ---------- панель локации на карте ---------- */
const panel = $('#panel');
let panelLoc = null;

function showPanel(loc) {
  panelLoc = loc;
  $('#panelImg').src = BASE + loc.img;
  $('#panelImg').alt = loc.name;
  $('#panelRegion').textContent = loc.region;
  $('#panelName').textContent = loc.name;
  $('#panelDesc').textContent = loc.short;
  $('#panelFacts').innerHTML = loc.facts.map((f) => `<span>${f}</span>`).join('');
  $('#panelMaps').href = mapsUrl(loc);
  panel.classList.add('open');
}
function hidePanel() {
  panel.classList.remove('open');
  panelLoc = null;
}

/* ---------- 3D ---------- */
const app = new App3D({
  stage: $('#stage'),
  canvas: $('#scene'),
  labels: $('#labels'),
  onSelect: showPanel,
  onDeselect: hidePanel,
});
app.ready = () => setTimeout(() => $('#loader').classList.add('done'), 350);
setTimeout(() => $('#loader').classList.add('done'), 5000); // подстраховка
if (import.meta.env.DEV) window.app3d = app;

$('#panelClose').addEventListener('click', () => {
  hidePanel();
  app.resetView();
});

/* ---------- режим прогулки ---------- */
const stage = $('#stage');
const walkUI = $('#walkUI');
const walkInfo = $('#walkInfo');
const fader = $('#fader');
let inWalk = false;

function fillWalkInfo(loc) {
  $('#wiRegion').textContent = loc.region;
  $('#wiName').textContent = loc.name;
  $('#wiImg').src = BASE + loc.img;
  $('#wiImg').alt = loc.name;
  $('#wiCredit').innerHTML =
    `Фото: ${loc.credit.author} · <a href="${loc.credit.url}" target="_blank" rel="noopener">${loc.credit.license}</a>`;
  $('#wiLead').textContent = loc.short;
  $('#wiFacts').innerHTML = loc.facts.map((f) => `<span>${f}</span>`).join('');
  $('#wiDetail').innerHTML = loc.detailed.map((p) => `<p>${p}</p>`).join('');
  $('#wiHow').textContent = loc.practical.how;
  $('#wiWhen').textContent = loc.practical.when;
  $('#wiTime').textContent = loc.practical.time;
  $('#wiCoords').textContent = loc.coords
    ? `${loc.coords[0].toFixed(4)}° с. ш., ${loc.coords[1].toFixed(4)}° в. д.`
    : 'Точные координаты уточняйте у оператора — объект расположен вне дорог общего пользования.';
  $('#wiMaps').href = mapsUrl(loc);

  // свернуть подробности при открытии новой локации
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
  stage.classList.add('fullscreen');
  document.body.style.overflow = 'hidden';
  app.enterWalk(id);

  fillWalkInfo(loc);
  walkUI.classList.add('open');
  walkInfo.classList.add('open');
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
  if (panelLoc) panel.classList.add('open');

  await new Promise((r) => setTimeout(r, 120));
  fader.classList.remove('on');
  inWalk = false;
}

function setWalkTab(open) {
  walkInfo.classList.toggle('open', open);
  $('#wiTabText').textContent = open ? 'Скрыть' : 'Об объекте';
}

$('#panelWalk').addEventListener('click', () => panelLoc && enterWalk(panelLoc.id));
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

/* ---------- навигация и скролл ---------- */
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 30), { passive: true });
$('#scrollDown').addEventListener('click', () => $('#destinations').scrollIntoView({ behavior: 'smooth' }));

const io = new IntersectionObserver(
  (entries) => entries.forEach((en) => en.isIntersecting && en.target.classList.add('in')),
  { threshold: 0.1 }
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* ---------- счётчики ---------- */
const fmt = new Intl.NumberFormat('ru-RU');
const ioNum = new IntersectionObserver(
  (entries) => {
    for (const en of entries) {
      if (!en.isIntersecting || en.target.dataset.done) continue;
      en.target.dataset.done = '1';
      const total = +en.target.dataset.count;
      // год и малые числа показываем без анимации разрядов
      if (total < 100) { en.target.textContent = total; continue; }
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min((now - t0) / 1500, 1);
        const val = Math.round(total * (1 - Math.pow(1 - k, 3)));
        en.target.textContent = total === 1991 ? String(val) : fmt.format(val);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  },
  { threshold: 0.5 }
);
document.querySelectorAll('.stat-num').forEach((el) => ioNum.observe(el));

$('#year').textContent = new Date().getFullYear();
