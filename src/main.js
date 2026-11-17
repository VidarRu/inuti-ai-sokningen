// Huvudlogiken: scroll styr bilden, reglagen styr datan. Steg 3 och 4 rankas
// med förberäknade likhetstal (och, i steg 4 i planen, live när modellen är
// laddad). Steg 2, 6 och 7 visar inspelade körningar; saknas inspelningen
// visas en tydligt märkt platshållare. Scrollkoden är från Inuti AI-hjärnan.
import { Stage, SPLIT_K } from './scene/stage.js';

const $ = (sel) => document.querySelector(sel);
const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const params = new URLSearchParams(location.search);

const stage = new Stage($('#scene'), $('#labels'), { reduced: reducedQuery.matches });

const state = {
  data: null,          // korpus, förberäknat, inspelningar
  q: 0,                // vald fråga (index i korpus.questions)
  ranked: [],          // [{ i, score }] i fallande ordning
  run: null,           // inspelad körning för frågan, eller null
  answer: null,        // { text, refs: [{ n, passage, check, note, sentence }] }
  typing: 0,
};

// ---------- Hjälpfunktioner ----------
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtNum = (x, d = 2) => x.toFixed(d).replace('.', ',');
const host = (url) => { try { return new URL(url).host.replace(/^www\./, ''); } catch { return url; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Scroll: var i resan kameran är (från hjärnprojektet) ----------
const scenes = [...document.querySelectorAll('.scene')];
const navLinks = [...document.querySelectorAll('.steps a')];
const sceneLines = scenes.map((s) => [...s.querySelectorAll('.line')]);
const LAST_STEP = scenes.length - 1;
let currentStep = -1, currentLine = -1, scrollPos = window.scrollY;

function sceneRange(i) {
  const s = scenes[i], top = s.offsetTop, len = s.offsetHeight;
  const into = i === 0 ? 0 : parseFloat(s.dataset.in || '1') * window.innerHeight;
  const hold = len - into - (i === scenes.length - 1 ? window.innerHeight : 0);
  return { top, into, hold: Math.max(1, hold) };
}

function locate(y) {
  let i = 0;
  while (i < scenes.length - 1 && y >= scenes[i + 1].offsetTop) i++;
  const r = sceneRange(i), local = y - r.top;
  if (local < r.into) return { k: i - 1, t: local / r.into, qa: 1, qb: 0 };
  return { k: i, t: 0, qa: clamp01((local - r.into) / r.hold), qb: 0 };
}

function goTo(i, smooth = true) {
  const r = sceneRange(i);
  window.scrollTo({ top: i === 0 ? 0 : r.top + r.into + 2, behavior: smooth && !stage.reduced ? 'smooth' : 'instant' });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#steg-"]');
  if (!a) return;
  e.preventDefault();
  const i = Number(a.getAttribute('href').slice(6));
  goTo(i);
  const h = scenes[i].querySelector('h1, h2');
  if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
});
scenes.forEach((s, i) => s.addEventListener('focusin', () => { if (i !== currentStep) goTo(i, false); }));

function updateProgress(dt) {
  if (stage.reduced) scrollPos = window.scrollY;
  else scrollPos += (window.scrollY - scrollPos) * Math.min(1, dt * 7);
  const at = locate(scrollPos);
  if (stage.reduced) { if (at.t > 0) { if (at.t >= 0.5) { at.k++; at.qa = 0; } at.t = 0; } }
  const rawQ = at.qa;
  if (stage.reduced) at.qa = Math.round(at.qa * 3) / 3;
  Object.assign(stage, at);
  const step = at.t >= 0.5 ? at.k + 1 : at.k;
  const q = at.t > 0 ? (step === at.k ? 1 : 0) : rawQ;
  const lines = sceneLines[step];
  const line = lines.length ? Math.min(lines.length - 1, Math.floor(q * lines.length)) : -1;
  if (step !== currentStep) {
    currentStep = step; currentLine = -1;
    scenes.forEach((s, i) => s.classList.toggle('on', i === step));
    navLinks.forEach((a, i) => { if (i === step) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
    $('#yours').hidden = step <= 1 || step === LAST_STEP;
    stage.resetOrbit();
    if (state.data) onStep();
  }
  if (line !== currentLine) { currentLine = line; lines.forEach((l, i) => l.classList.toggle('on', i === line)); }
  document.body.classList.toggle('travel', at.t > 0.12 && at.t < 0.62);
  if (step === 5) setExcerptAmount(q);
  if (stage.orbited !== !resetBtn.hidden) resetBtn.hidden = !stage.orbited;
  if (scenes[0].offsetHeight === anchor.h) {
    let i = 0; const y = window.scrollY;
    while (i < scenes.length - 1 && y >= scenes[i + 1].offsetTop) i++;
    anchor.i = i; anchor.f = (y - scenes[i].offsetTop) / scenes[i].offsetHeight;
  }
  scenes[LAST_STEP].classList.toggle('late', step === LAST_STEP && (q > 0.45 || stage.reduced));
}

const anchor = { i: 0, f: 0, h: scenes[0].offsetHeight };
window.addEventListener('resize', () => {
  const h = scenes[0].offsetHeight;
  if (h === anchor.h) return;
  anchor.h = h;
  const s = scenes[anchor.i];
  window.scrollTo({ top: s.offsetTop + anchor.f * s.offsetHeight, behavior: 'instant' });
  scrollPos = window.scrollY;
});

// ---------- Vrida bilden, helskärm, paus (från hjärnprojektet) ----------
const resetBtn = $('#reset-view');
resetBtn.addEventListener('click', () => stage.resetOrbit());
const fsBtn = $('#fullscreen'), root = document.documentElement;
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
const fsRequest = root.requestFullscreen || root.webkitRequestFullscreen;
const fsExit = document.exitFullscreen || document.webkitExitFullscreen;
function toggleFullscreen() {
  try { const p = fsElement() ? fsExit.call(document) : fsRequest.call(root); if (p && p.catch) p.catch(() => {}); } catch {}
}
if (!fsRequest || !fsExit) fsBtn.hidden = true;
else {
  fsBtn.addEventListener('click', toggleFullscreen);
  for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, () => {
    const on = !!fsElement();
    document.body.classList.toggle('fullscreen', on);
    fsBtn.setAttribute('aria-pressed', String(on));
    fsBtn.textContent = on ? 'Lämna helskärm' : 'Helskärm';
  });
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'f' || e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    toggleFullscreen();
  });
}
const pauseBtn = $('#pause');
function setPaused(p) { stage.paused = p; pauseBtn.setAttribute('aria-pressed', String(p)); pauseBtn.textContent = p ? 'Starta rörelse' : 'Pausa rörelse'; }
pauseBtn.addEventListener('click', () => setPaused(!stage.paused));
reducedQuery.addEventListener('change', (e) => { stage.reduced = e.matches; setPaused(e.matches); });
setPaused(reducedQuery.matches);
$('#model-note-close').addEventListener('click', () => { $('#model-note').hidden = true; });

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  updateProgress(dt);
  stage.frame(dt);
  requestAnimationFrame(loop);
}

// ---------- Frågan genom stegen ----------
function renderQuestions() {
  $('#questions').replaceChildren(...state.data.korpus.questions.map((q, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = q; b.setAttribute('aria-pressed', String(state.q === i));
    b.addEventListener('click', () => setQuestion(i));
    return b;
  }));
}

function setQuestion(i) {
  state.q = i;
  const { korpus, pre, runs } = state.data;
  const text = korpus.questions[i], q = pre.questions[i];
  renderQuestions();
  $('#yours-text').textContent = text;
  $('#mock-question').textContent = text;
  // Steg 1: frågan står mitt i klotet
  stage.setLabels('question', [{ html: esc(text), cls: 'query', getPos: () => stage.galaxyPosition(0).set(0, 0, 0) }]);
  // Steg 3: frågans plats i webben och rankningen (förberäknad)
  stage.setQuery(q.pos);
  state.ranked = q.scores.map((s, j) => ({ i: j, score: s })).sort((a, b) => b.score - a.score);
  const top = state.ranked.slice(0, 6);
  stage.setHits(top.map((h) => h.i), top.map((h, r) => 1 - r * 0.14));
  stage.setLabels('hits', top.map((h, r) => ({
    html: `${esc(short(korpus.passages[h.i].text, 34))}<small>${fmtNum(h.score)}</small>`, cls: r === 0 ? 'hit top1' : 'hit',
    getPos: () => stage.galaxyPosition(h.i), dy: -6,
  })));
  $('#hits').innerHTML = state.ranked.map((h, r) => {
    const p = korpus.passages[h.i];
    return `<li class="${isLure(p) ? 'lure' : ''}"><span class="t">${esc(p.text)}</span><span class="bar"><i style="width:${Math.round(clamp01(h.score) * 100)}%"></i></span><span>${fmtNum(h.score)}</span></li>`;
  }).join('');
  $('#rank-readout').textContent = 'Förberäknat med samma modell';
  // Steg 4: den lurande träffen är den högst rankade som är föråldrad, satirisk eller reklam
  const lure = top.find((h) => isLure(korpus.passages[h.i]));
  $('#lure-text').innerHTML = lure
    ? `Rankad som nummer ${top.indexOf(lure) + 1} (${fmtNum(lure.score)}): <em>${esc(korpus.passages[lure.i].text)}</em>`
    : 'Ingen av de högst rankade sidorna är märkt som lurande för den här frågan.';
  stage.setLabels('hits.lure', lure ? [{ html: 'Lurande träff', cls: 'lure', getPos: () => stage.galaxyPosition(lure.i), dy: -30, vis: () => Math.max(0, stage.weightOfStep(4) * 2 - 1) }] : []);
  // Steg 2, 6, 7: inspelat eller platshållare
  state.run = runs.find((r) => r.question.trim() === text.trim()) || null;
  renderSplit();
  buildAnswer();
  renderExcerpts();
  renderThreads();
  if (currentStep === 6) typeAnswer();
  $('#check').hidden = true; stage.setFocus(null, 7);
}
const short = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
// Platshållare: i korpuset markeras lurande sidor med sina id. Riktiga utdrag får ett eget fält.
const isLure = (p) => p.lure || /gammal|reklam|sat$|2019|2015|2021|2024/.test(p.id);

// Steg 2: sökfrågorna vid strängarnas spetsar
function renderSplit() {
  const text = state.data.korpus.questions[state.q];
  let queries, tag;
  if (state.run && state.run.searchQueries.length) { queries = state.run.searchQueries; tag = `inspelat ${state.run.recorded}`; }
  else {
    const base = text.replace(/\?$/, '');
    queries = [base, `${base} ${new Date().getFullYear()}`, base.split(' ').filter((w) => w.length > 4).slice(0, 3).join(' '), `${base.split(' ').slice(-2).join(' ')} öppettider`];
    tag = 'platshållare, inspelning saknas';
  }
  queries = queries.slice(0, SPLIT_K);
  stage.setLabels('split', queries.map((s, k) => ({ html: esc(s), cls: 'split', getPos: () => stage.splitEndPosition(k), dy: -10 })));
  $('#split-readout').textContent = state.run ? `Inspelat ${state.run.recorded}` : 'Platshållare';
  $('#split-list').innerHTML = queries.map((s) => `<li>${esc(s)}</li>`).join('') + `<li class="tag">${esc(tag)}</li>`;
}

// Steg 6 och 7: svaret med hänvisningar. Inspelat om det finns, annars en
// platshållare byggd av de högst rankade utdragen, tydligt märkt.
function buildAnswer() {
  const { korpus } = state.data;
  const top = state.ranked.slice(0, 3);
  if (state.run) {
    // Hänvisningarna i en inspelning kopplas till de högst rankade sidorna i ordning (byts mot riktig koppling i steg 4–5)
    const refs = state.run.references.map((r, k) => ({ n: r.n, passage: top[k % top.length].i, url: r.url, check: r.check || 'okant', note: r.note || '', sentence: r.sentence || '' }));
    state.answer = { text: state.run.answer, refs, tag: `inspelat ${state.run.recorded}` };
    return;
  }
  const refs = top.map((h, k) => ({ n: k + 1, passage: h.i, url: '', check: k < 2 ? 'ja' : 'nej', note: k < 2 ? 'Meningen är hämtad ur utdraget.' : 'Meningen går utöver det som står i utdraget.', sentence: '' }));
  const parts = top.slice(0, 2).map((h, k) => `${firstSentence(korpus.passages[h.i].text)} [${k + 1}]`);
  parts.push(`Uppgifterna gäller även i år [3].`);
  refs[2].sentence = parts[2];
  refs[0].sentence = parts[0]; refs[1].sentence = parts[1];
  state.answer = { text: parts.join(' '), refs, tag: 'platshållare, inspelning saknas' };
}
const firstSentence = (s) => (s.match(/^[^.!?]+[.!?]?/) || [s])[0].trim().replace(/[.!?]$/, '');

// Steg 5: utdragen flyger in i fönstret i takt med scrollen
function renderExcerpts() {
  const { korpus } = state.data;
  const top = state.ranked.slice(0, 4);
  $('#excerpts').className = 'out excerpts';
  $('#excerpts').innerHTML = top.map((h, k) => {
    const p = korpus.passages[h.i], url = p.url || `sida ${k + 1}`;
    return `<div class="excerpt" style="--i:${k}"><span class="src">${esc(host(url))} · likhet ${fmtNum(h.score)}</span>${esc(short(p.text, 150))} <span class="cut">[…]</span></div>`;
  }).join('');
  setExcerptAmount(0, true);
}
let excerptShown = -1;
function setExcerptAmount(q, force = false) {
  const n = Math.min(4, Math.floor(clamp01((q - 0.1) / 0.6) * 5));
  if (n === excerptShown && !force) return;
  excerptShown = n;
  [...document.querySelectorAll('.excerpt')].forEach((el, k) => el.classList.toggle('on', k < n || stage.reduced));
  $('#window-readout').textContent = n === 0 ? 'Fönstret är tomt' : `${n} utdrag i fönstret`;
}

// Steg 6: svaret skrivs fram ord för ord
async function typeAnswer() {
  const my = ++state.typing;
  const el = $('#answer'), a = state.answer;
  el.innerHTML = '';
  $('#answer-readout').textContent = a.tag.startsWith('inspelat') ? `Inspelat ${state.run.recorded}` : 'Platshållare';
  const words = a.text.split(/(\s+)/).filter((w) => w.length);
  for (const w of words) {
    if (my !== state.typing) return;
    const m = /^(.*?)\[(\d+)\]([.,;:!?]*)$/.exec(w);
    if (/^\s+$/.test(w)) el.appendChild(document.createTextNode(' '));
    else if (m) el.insertAdjacentHTML('beforeend', `<span class="w">${esc(m[1])}<span class="fn">${m[2]}</span>${esc(m[3])}</span>`);
    else el.insertAdjacentHTML('beforeend', `<span class="w">${esc(w)}</span>`);
    if (!stage.reduced) await sleep(70);
  }
  el.insertAdjacentHTML('beforeend', `<span class="meta">${esc(a.tag)}</span>`);
}
$('#answer-again').addEventListener('click', typeAnswer);

// Steg 7: trådarna från svaret till källorna, och kontrollen
function renderThreads() {
  const a = state.answer;
  stage.setThreads(a.refs.map((r) => r.passage));
  $('#threads').replaceChildren(...a.refs.map((r) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'thread'; b.textContent = `[${r.n}]`; b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', `Dra i tråd ${r.n}`);
    b.addEventListener('click', () => pullThread(r, b));
    return b;
  }));
  stage.setLabels('threads', a.refs.map((r) => ({ html: `[${r.n}]`, cls: 'accent', getPos: () => stage.farPosition(r.passage), dy: -8 })));
}
function pullThread(r, btn) {
  const { korpus } = state.data, p = korpus.passages[r.passage];
  [...$('#threads').children].forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  stage.setFocus(r.passage, 7);
  const claim = r.sentence || `Påståendet vid [${r.n}]`;
  const verdict = { ja: 'Står i källan', nej: 'Står inte i källan', delvis: 'Står delvis i källan', okant: 'Kontroll saknas i inspelningen' }[r.check] || 'Kontroll saknas';
  // Ord som finns i både påståendet och utdraget markeras i utdraget
  const words = new Set(claim.toLowerCase().match(/[a-zåäöé0-9–-]{4,}/g) || []);
  const marked = esc(p.text).replace(/[A-Za-zÅÄÖåäöé0-9–-]{4,}/g, (w) => (words.has(w.toLowerCase()) ? `<mark>${w}</mark>` : w));
  $('#check').innerHTML = `<p class="claim">${esc(claim.replace(/\s*\[\d+\]/, ''))}<span class="fn">${r.n}</span></p>` +
    `<p class="source"><span class="src">${esc(r.url ? host(r.url) : p.id)}</span>${marked}</p>` +
    `<p class="verdict ${r.check}">${verdict}${r.note ? ` <span class="tag">${esc(r.note)}</span>` : ''}</p>`;
  $('#check').hidden = false;
}

function onStep() {
  if (currentStep === 6) typeAnswer();
  if (currentStep !== 7) { $('#check').hidden = true; stage.setFocus(null, 7); }
}

// ---------- Start ----------
async function loadData() {
  const get = (name) => fetch(`/data/${name}`).then((r) => { if (!r.ok) throw new Error(`/data/${name} saknas (${r.status})`); return r.json(); });
  const [korpus, pre] = await Promise.all([get('korpus.json'), get('korpus_forberaknat.json')]);
  // Inspelningarna finns först när Vidar har fyllt i mallen (docs/INSPELNING.md)
  const runs = await get('inspelningar.json').then((d) => d.runs).catch(() => []);
  return { korpus, pre, runs };
}

async function init() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  requestAnimationFrame(loop);
  state.data = await loadData();
  stage.setPassages(state.data.pre.passages);
  setQuestion(0);
  onStep();
  const m = /^#steg-(\d+)$/.exec(location.hash);
  if (m && Number(m[1]) <= LAST_STEP) goTo(Number(m[1]), false);
  window.__ready = true;
}

init().catch((e) => { console.error(e); $('#model-status').dataset.state = 'error'; $('#model-status-text').textContent = 'Något gick fel när sidan laddades.'; });
window.__stage = stage; window.__state = state;
