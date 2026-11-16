// Testsidan för den tekniska spiken: ingen grafik, bara modellen och listan.
import { createEmbedClient } from './sok/client.js';
import { MODEL_ID, MODEL_BYTES } from './sok/config.js';

const $ = (s) => document.querySelector(s);
$('#model').textContent = MODEL_ID;
const status = (t) => { $('#status').textContent = t; };
const model = createEmbedClient();
const data = await fetch('/data/korpus.json').then((r) => r.json());
const texts = data.passages.map((p) => p.text);

$('#chips').replaceChildren(...data.questions.map((q) => {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = q;
  b.addEventListener('click', () => { $('#q').value = q; rank(); });
  return b;
}));

const t0 = performance.now();
try {
  const info = await model.load((m) => {
    if (m.type === 'progress') status(`Hämtar modellen: ${Math.round(m.loaded / 1e6)} av ${Math.round((m.total || MODEL_BYTES) / 1e6)} MB`);
    else status('Startar modellen …');
  });
  status(`Modellen räknar i din webbläsare (${info.threads} trådar). Laddad på ${((performance.now() - t0) / 1000).toFixed(1)} s.`);
  window.__loadMs = performance.now() - t0;
  await rank();
} catch (e) {
  status('Modellen gick inte att starta: ' + e.message);
  console.error(e);
}

async function rank() {
  const q = $('#q').value.trim();
  if (!q) return;
  const r = await model.rank(q, texts);
  $('#time').textContent = `${texts.length} textbitar och frågan inbäddade och rankade på ${r.ms.toFixed(0)} ms`;
  const max = Math.max(...r.ranked.map((x) => x.score));
  $('#out').innerHTML = r.ranked.map(({ i, score }) =>
    `<li><span class="bar" style="width:${Math.max(2, (score / max) * 120)}px"></span><span class="score">${score.toFixed(3)}</span> ${data.passages[i].text} <span class="id">${data.passages[i].id}</span></li>`).join('');
  window.__ranked = r.ranked;
}
$('#f').addEventListener('submit', (e) => { e.preventDefault(); rank(); });
