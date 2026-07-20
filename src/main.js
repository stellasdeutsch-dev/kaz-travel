import './style.css';
import { LOCATIONS, EXPERIENCES } from './locations.js';
import { App3D } from './app3d.js';

const $ = (s) => document.querySelector(s);

// ---------- иконки ----------
const ICONS = {
  mountain: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20l6-11 4 7 3-4 5 8H3z"/></svg>',
  ski: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="17" cy="5" r="2"/><path d="M3 21l14-7-5-3 3-4"/><path d="M2 17l19 4"/></svg>',
  yurt: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M5 20l1-8h12l1 8M4 12l8-7 8 7z"/><path d="M12 20v-5"/></svg>',
  rocket: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15c-3 0-5-2-5-2s1-7 5-10c4 3 5 10 5 10s-2 2-5 2z"/><path d="M9 13l-3 5 3-1 3 3 3-3 3 1-3-5"/><circle cx="12" cy="8" r="1.4"/></svg>',
  compass: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
  wave: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M2 17c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/></svg>',
};

// ---------- карточки направлений ----------
const cardsEl = $('#cards');
for (const loc of LOCATIONS) {
  const card = document.createElement('article');
  card.className = 'card reveal';
  card.style.setProperty('--ca', loc.accent);
  card.style.setProperty('--cb', loc.accent2);
  card.innerHTML = `
    <div class="card-art"></div>
    <div class="card-letter">${loc.name[0]}</div>
    <div class="card-body">
      <div class="card-region">${loc.region}</div>
      <h3 class="card-name">${loc.name}</h3>
      <div class="card-tag">${loc.tagline}</div>
      <span class="card-cta">Прогуляться в 3D
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
    </div>`;
  card.addEventListener('click', () => enterWalk(loc.id));
  cardsEl.appendChild(card);
}

// ---------- впечатления ----------
const expEl = $('#expGrid');
for (const e of EXPERIENCES) {
  const div = document.createElement('div');
  div.className = 'exp reveal';
  div.innerHTML = `<div class="exp-ico">${ICONS[e.icon]}</div><h3>${e.title}</h3><p>${e.text}</p>`;
  expEl.appendChild(div);
}

// ---------- панель локации ----------
const panel = $('#panel');
let panelLoc = null;

function showPanel(loc) {
  panelLoc = loc;
  panel.style.setProperty('--pa', loc.accent);
  panel.style.setProperty('--pb', loc.accent2);
  $('#panelLetter').textContent = loc.name[0];
  $('#panelRegion').textContent = loc.region;
  $('#panelName').textContent = loc.name;
  $('#panelDesc').textContent = loc.desc;
  $('#panelFacts').innerHTML = loc.facts.map((f) => `<span>${f}</span>`).join('');
  panel.classList.add('open');
}
function hidePanel() {
  panel.classList.remove('open');
  panelLoc = null;
}

// ---------- 3D ----------
const app = new App3D({
  stage: $('#stage'),
  canvas: $('#scene'),
  labels: $('#labels'),
  onSelect: showPanel,
  onDeselect: hidePanel,
});
app.ready = () => setTimeout(() => $('#loader').classList.add('done'), 400);
// подстраховка, если что-то грузится дольше
setTimeout(() => $('#loader').classList.add('done'), 5000);

$('#panelClose').addEventListener('click', () => {
  hidePanel();
  app.resetView();
});

// ---------- режим прогулки ----------
const stage = $('#stage');
const walkUI = $('#walkUI');
const fader = $('#fader');
let inWalk = false;

async function enterWalk(id) {
  if (inWalk) return;
  const loc = LOCATIONS.find((l) => l.id === id);
  inWalk = true;
  fader.classList.add('on');
  await new Promise((r) => setTimeout(r, 480));
  panel.classList.remove('open');
  stage.classList.add('fullscreen');
  document.body.style.overflow = 'hidden';
  app.enterWalk(id);
  $('#walkRegion').textContent = loc.region;
  $('#walkName').textContent = loc.name;
  walkUI.classList.add('open');
  await new Promise((r) => setTimeout(r, 120));
  fader.classList.remove('on');
}

async function exitWalk() {
  if (!inWalk) return;
  fader.classList.add('on');
  await new Promise((r) => setTimeout(r, 480));
  walkUI.classList.remove('open');
  stage.classList.remove('fullscreen');
  document.body.style.overflow = '';
  app.exitWalk();
  if (panelLoc) panel.classList.add('open');
  await new Promise((r) => setTimeout(r, 120));
  fader.classList.remove('on');
  inWalk = false;
}

$('#panelWalk').addEventListener('click', () => panelLoc && enterWalk(panelLoc.id));
$('#walkBack').addEventListener('click', exitWalk);
addEventListener('keydown', (e) => { if (e.code === 'Escape') exitWalk(); });

// ---------- навигация / скролл ----------
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40), { passive: true });

$('#scrollDown').addEventListener('click', () =>
  $('#destinations').scrollIntoView({ behavior: 'smooth' })
);

// появление блоков
const io = new IntersectionObserver(
  (entries) => entries.forEach((en) => en.isIntersecting && en.target.classList.add('in')),
  { threshold: 0.12 }
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// счётчики
const fmt = new Intl.NumberFormat('ru-RU');
const ioNum = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting || en.target.dataset.done) continue;
    en.target.dataset.done = '1';
    const total = +en.target.dataset.count;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min((now - t0) / 1600, 1);
      en.target.textContent = fmt.format(Math.round(total * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}, { threshold: 0.5 });
document.querySelectorAll('.stat-num').forEach((el) => ioNum.observe(el));

$('#year').textContent = new Date().getFullYear();
