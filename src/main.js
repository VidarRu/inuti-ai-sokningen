// Huvudlogiken: scroll styr bilden, reglagen styr datan. Steg 3 och 4 rankas
// med förberäknade likhetstal (och, i steg 4 i planen, live när modellen är
// laddad). Steg 0, 2, 6 och 7 visar inspelade körningar i två tjänster
// (Tjänst A och B, se inspelningar/); saknas inspelningen visas en tydligt
// märkt platshållare. Scrollkoden är från Inuti AI-hjärnan.
import { Stage, SPLIT_K } from './scene/stage.js';

const $ = (sel) => document.querySelector(sel);
const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const params = new URLSearchParams(location.search);

const stage = new Stage($('#scene'), $('#labels'), { reduced: reducedQuery.matches });

const state = {
  data: null,          // korpus, förberäknat, inspelningar
  q: 0,                // vald fråga (index i korpus.questions)
  ranked: [],          // [{ i, score }] i fallande ordning
  runs: [],            // inspelade körningar för frågan (en per tjänst)
  run: null,           // den som visas, eller null
  svc: 'Tjänst A',     // vald tjänst, behålls när frågan byts
  answer: null,        // { text, refs: [{ key, url, idx, checks }], tag, notes }
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

const passageIndex = (id) => state.data.korpus.passages.findIndex((p) => p.id === id);
const runsFor = (text) => state.data.runs.filter((r) => r.question.trim() === text.trim());

function setQuestion(i) {
  state.q = i;
  const { korpus, pre } = state.data;
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
    html: `${esc(short(oneLine(korpus.passages[h.i].text), 34))}<small>${fmtNum(h.score)}</small>`, cls: r === 0 ? 'hit top1' : 'hit',
    getPos: () => stage.galaxyPosition(h.i), dy: -6,
  })));
  $('#hits').innerHTML = state.ranked.map((h) => {
    const p = korpus.passages[h.i];
    return `<li class="${p.lure ? 'lure' : ''}"><span class="t">${esc(oneLine(p.text))}</span><span class="bar"><i style="width:${Math.round(clamp01(h.score) * 100)}%"></i></span><span>${fmtNum(h.score)}</span></li>`;
  }).join('');
  $('#rank-readout').textContent = 'Förberäknat med samma modell';
  renderLure(top);
  // Steg 0, 2, 6, 7: inspelade körningar för frågan, en per tjänst
  state.runs = runsFor(text);
  state.run = state.runs.find((r) => r.label === state.svc) || state.runs[0] || null;
  renderRun();
}

// Byter inspelad körning (Tjänst A eller B) för samma fråga
function setService(label) {
  state.svc = label;
  state.run = state.runs.find((r) => r.label === label) || state.runs[0] || null;
  renderRun();
}
function renderRun() {
  renderServices();
  renderMock();
  renderSplit();
  buildAnswer();
  renderExcerpts();
  renderThreads();
  if (currentStep === 6) typeAnswer();
  $('#check').hidden = true; stage.setFocus(null, 7);
}
function renderServices() {
  for (const el of document.querySelectorAll('.svc')) {
    el.hidden = state.runs.length < 2;
    el.replaceChildren(...state.runs.map((r) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = r.label; b.setAttribute('aria-pressed', String(r === state.run));
      b.addEventListener('click', () => setService(r.label));
      return b;
    }));
  }
}

const short = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const oneLine = (s) => s.replace(/\s*\n\s*/g, ' · ');
const SENDER_NOTE = (p) => [p.sender, p.dated && `daterad ${p.dated}`, p.fetched && `hämtad ${p.fetched}`].filter(Boolean).join(', ');

// Steg 4: den lurande träffen är den högst rankade som är märkt i korpuset
function renderLure(top) {
  const { korpus, runs } = state.data;
  const lure = top.find((h) => korpus.passages[h.i].lure);
  if (!lure) {
    $('#lure-text').textContent = 'Ingen av de högst rankade sidorna är märkt som lurande för den här frågan.';
  } else {
    const p = korpus.passages[lure.i];
    const used = runs.some((r) => r.sources.some((s) => s.passage === p.id));
    $('#lure-text').innerHTML = `Rankad som nummer ${top.indexOf(lure) + 1} av ${korpus.passages.length} (likhet ${fmtNum(lure.score)}): <em>${esc(short(oneLine(p.text), 120))}</em>` +
      `<span class="lure-note">${esc(p.lureNote || '')}${used ? ' I en av de inspelade körningarna byggdes svaret på den här sidan.' : ''}</span>`;
  }
  stage.setLabels('hits.lure', lure ? [{ html: 'Lurande träff', cls: 'lure', getPos: () => stage.galaxyPosition(lure.i), dy: -30, vis: () => Math.max(0, stage.weightOfStep(4) * 2 - 1) }] : []);
}

// Steg 0: början av ett inspelat svar i sökrutan
function renderMock() {
  const r = state.runs[0];
  if (!r) return;
  const first = r.answer.split(/\n\s*\n/)[0];
  $('#mock-answer').innerHTML = esc(first).replace(/\[([^\]\n]+)\]/g, (_, k) => `<sup>${k}</sup>`) + ' <span class="cut">[…]</span>';
  const hosts = r.sources.filter((s) => s.url).slice(0, 3).map((s) => `<span>${esc(s.key)} ${esc(host(s.url))}</span>`);
  $('#mock-src').innerHTML = hosts.join('');
  $('#mock-meta').textContent = `Inspelat ${r.recorded}, ${r.label}. Början av svaret.`;
}

// Steg 2: sökfrågorna vid strängarnas spetsar. Visade tjänsten färre än
// strängarna står "visas inte" vid resten.
function renderSplit() {
  const text = state.data.korpus.questions[state.q], r = state.run;
  if (!r) {
    const base = text.replace(/\?$/, '');
    const qs = [base, `${base} ${new Date().getFullYear()}`, base.split(' ').filter((w) => w.length > 4).slice(0, 3).join(' '), `${base.split(' ').slice(-2).join(' ')} öppettider`];
    stage.setLabels('split', qs.map((s, k) => ({ html: esc(s), cls: 'split', getPos: () => stage.splitEndPosition(k), dy: -10 })));
    $('#split-readout').textContent = 'Platshållare';
    $('#split-list').innerHTML = qs.map((s) => `<li>${esc(s)}</li>`).join('') + '<li class="tag">platshållare, inspelning saknas</li>';
    return;
  }
  const qs = r.searchQueries.slice(0, SPLIT_K);
  stage.setLabels('split', Array.from({ length: SPLIT_K }, (_, k) => ({
    html: k < qs.length ? esc(qs[k]) : 'visas inte', cls: k < qs.length ? 'split' : 'split hidden-q',
    getPos: () => stage.splitEndPosition(k), dy: -10,
  })));
  $('#split-readout').textContent = `Inspelat ${r.recorded} · ${r.label}`;
  $('#split-list').innerHTML = (qs.length ? qs.map((s) => `<li>${esc(s)}</li>`).join('') : '<li>Inga sökfrågor visades.</li>') +
    `<li class="tag">${esc(r.searchNote)}</li>` +
    (r.shownHits.length ? `<li class="tag">${esc(r.shownHitsNote)}</li>` + r.shownHits.map((h) => `<li class="hitname">${esc(h)}</li>`).join('') : '');
}

// Steg 6 och 7: svaret med hänvisningar. Inspelat om det finns, annars en
// platshållare byggd av de högst rankade utdragen, tydligt märkt.
function buildAnswer() {
  const { korpus } = state.data, r = state.run;
  if (r) {
    const refs = r.sources.map((s) => ({ ...s, idx: s.passage ? passageIndex(s.passage) : -1, checks: r.checks.filter((c) => c.key === s.key) }));
    state.answer = { text: r.answer, refs, tag: `Inspelat ${r.recorded} · ${r.label} · ${r.answerKind === 'ordagrant' ? 'ordagrant' : 'sammanfattat'}`, notes: [r.answerNote, ...r.notes].filter(Boolean) };
    return;
  }
  const top = state.ranked.slice(0, 2);
  const refs = top.map((h, k) => ({ key: String(k + 1), url: korpus.passages[h.i].url || '', idx: h.i, checks: [] }));
  state.answer = { text: top.map((h, k) => `${firstSentence(oneLine(korpus.passages[h.i].text))} [${k + 1}]`).join(' '), refs, tag: 'Platshållare, inspelning saknas', notes: [] };
}
const firstSentence = (s) => (s.match(/^[^.!?]+[.!?]?/) || [s])[0].trim().replace(/[.!?]$/, '');

// Steg 5: utdragen flyger in i fönstret i takt med scrollen
function renderExcerpts() {
  const { korpus } = state.data;
  const top = state.ranked.slice(0, 4);
  $('#excerpts').className = 'out excerpts';
  $('#excerpts').innerHTML = top.map((h, k) => {
    const p = korpus.passages[h.i];
    const src = p.url ? `${host(p.url)} · ${p.dated ? `daterad ${p.dated}` : `hämtad ${p.fetched}`}` : 'handskriven fyllnadstext';
    return `<div class="excerpt" style="--i:${k}"><span class="src">${esc(src)} · likhet ${fmtNum(h.score)}</span>${esc(short(oneLine(p.text), 150))} <span class="cut">[…]</span></div>`;
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

// Gör om ett inspelat svar till HTML: stycken, listor och tabeller som i
// originalet, varje ord i ett eget <span class="w"> så att det kan skrivas fram,
// och hänvisningsmärkena som små etiketter.
function words(s) {
  let out = '', at = 0;
  for (const m of s.matchAll(/\[[^\]\n]+\]|[^\s[]+|\[/g)) {
    if (m.index > at) out += ' ';
    out += m[0].length > 2 && m[0][0] === '[' ? `<span class="w fn">${esc(m[0].slice(1, -1))}</span>` : `<span class="w">${esc(m[0])}</span>`;
    at = m.index + m[0].length;
  }
  return out;
}
function richAnswer(text) {
  const blocks = [];
  for (const line of text.split('\n')) {
    const t = line.trim(), last = blocks[blocks.length - 1];
    const kind = !t ? 'blank' : t.startsWith('|') ? 'table' : /^(- |\d+\. )/.test(t) ? 'list' : 'p';
    if (kind === 'blank') { blocks.push({ kind }); continue; }
    if (last && last.kind === kind && kind !== 'p') last.lines.push(t);
    else blocks.push({ kind, lines: [t] });
  }
  return blocks.filter((b) => b.kind !== 'blank').map((b) => {
    if (b.kind === 'p') return `<p>${words(b.lines[0])}</p>`;
    if (b.kind === 'list') return `<ul>${b.lines.map((l) => `<li${/^\d/.test(l) ? ' class="num"' : ''}>${words(l.replace(/^- /, ''))}</li>`).join('')}</ul>`;
    const rows = b.lines.map((l) => {
      const cells = l.replace(/^\|/, '').split('|').map((c) => c.trim());
      if (cells[cells.length - 1] === '') cells.pop();
      return cells;
    });
    const n = Math.max(...rows.map((c) => c.length));
    // Ett märke efter sista lodstrecket hör till raden: lägg det i sista cellen
    const fix = (c) => (c.length === n && n > rows[0].length ? [...c.slice(0, -2), `${c[n - 2]} ${c[n - 1]}`] : c);
    const [head, ...body] = rows.map(fix);
    return `<table><thead><tr>${head.map((c) => `<th>${words(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${words(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }).join('');
}

// Steg 6: svaret skrivs fram ord för ord
async function typeAnswer() {
  const my = ++state.typing;
  const el = $('#answer'), a = state.answer;
  el.innerHTML = richAnswer(a.text) +
    `<p class="meta">${esc(a.tag)}</p>` + a.notes.map((n) => `<p class="meta note">${esc(n)}</p>`).join('');
  el.scrollTop = 0;
  $('#answer-readout').textContent = a.tag.split(' · ').slice(0, 2).join(' · ');
  const ws = [...el.querySelectorAll('.w')];
  if (stage.reduced) { ws.forEach((w) => w.classList.add('on')); return; }
  const delay = Math.max(15, Math.min(70, 12000 / ws.length));
  for (const w of ws) {
    if (my !== state.typing) return;
    w.classList.add('on');
    if (w.offsetTop + w.offsetHeight > el.scrollTop + el.clientHeight) el.scrollTop = w.offsetTop - el.clientHeight * 0.6;
    await sleep(delay);
  }
}
$('#answer-again').addEventListener('click', typeAnswer);

// Steg 7: trådarna från svaret till källorna, och kontrollen
const VERDICT = { ja: 'Står i källan', nej: 'Står inte i källan', delvis: 'Står delvis i källan', okontrollerad: 'Inte kontrollerad' };
function renderThreads() {
  const refs = state.answer.refs.filter((r) => r.checks.length || r.idx >= 0);
  const withPassage = refs.filter((r) => r.idx >= 0);
  stage.setThreads(withPassage.map((r) => r.idx));
  $('#threads').replaceChildren(...refs.map((r) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'thread'; b.textContent = r.key; b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', `Kontrollera hänvisningen ${r.key}`);
    b.addEventListener('click', () => pullThread(r, b));
    return b;
  }));
  stage.setLabels('threads', withPassage.map((r) => ({ html: esc(r.key), cls: 'accent', getPos: () => stage.farPosition(r.idx), dy: -8 })));
}
const claimText = (q) => q.replace(/^\|\s*/, '').replace(/\s*\|\s*$/, '').replace(/\s*\|\s*/g, ': ').replace(/^(- |\d+\. )/, '');
function pullThread(r, btn) {
  const { korpus } = state.data, p = r.idx >= 0 ? korpus.passages[r.idx] : null;
  [...$('#threads').children].forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  stage.setFocus(p ? r.idx : null, 7);
  const claims = r.checks.map((c) => `<li><p class="claim">${esc(claimText(c.quote))}<span class="fn">${esc(r.key)}</span></p>` +
    `<p class="verdict ${c.verdict}">${VERDICT[c.verdict]}${c.note ? ` <span class="tag">${esc(c.note)}</span>` : ''}</p></li>`).join('');
  let source;
  if (p) {
    // Ord som finns i både påståendet och källtexten markeras i källtexten
    const ws = new Set(r.checks.flatMap((c) => c.quote.toLowerCase().match(/[a-zåäöé0-9–-]{4,}/g) || []));
    const marked = esc(p.text).replace(/[A-Za-zÅÄÖåäöé0-9–-]{4,}/g, (w) => (ws.has(w.toLowerCase()) ? `<mark>${w}</mark>` : w));
    source = `<div class="source"><span class="src">${esc(host(p.url))} · ${esc(SENDER_NOTE(p))}</span><p>${marked}</p>` +
      (p.fetchedNote ? `<span class="tag">${esc(p.fetchedNote)}</span>` : '') + '</div>';
  } else {
    source = `<div class="source"><span class="src">${esc(r.url ? host(r.url) : r.key)}</span><p class="tag">Källtexten finns inte i den här sidans lilla webb. Kontrollen gjordes i källan när svaret spelades in.</p></div>`;
  }
  $('#check').innerHTML = (claims ? `<ul class="claims">${claims}</ul>` : '<p class="tag">Inga påståenden vid den här hänvisningen är kontrollerade.</p>') + source;
  $('#check').hidden = false; $('#check').scrollTop = 0;
}

function onStep() {
  if (currentStep === 6) typeAnswer();
  if (currentStep !== 7) { $('#check').hidden = true; stage.setFocus(null, 7); }
}


// ---------- Start ----------
async function loadData() {
  const get = (name) => fetch(`/data/${name}`).then((r) => { if (!r.ok) throw new Error(`/data/${name} saknas (${r.status})`); return r.json(); });
  const [korpus, pre] = await Promise.all([get('korpus.json'), get('korpus_forberaknat.json')]);
  // Inspelningarna byggs av scripts/inspelning_till_json.mjs. Saknas de visas platshållare.
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
