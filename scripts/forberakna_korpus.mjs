// Förberäknar korpuset med samma modell som sidan: en vektor per textbit och
// fråga, likheten fråga–textbit, och en plats i 3D (PCA av vektorerna) för
// stjärnfältet. Resultatet är public/data/korpus_forberaknat.json, som sidan
// använder innan modellen har laddats, och på mobil.
//   node scripts/forberakna_korpus.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { pipeline, env } from '@huggingface/transformers';
import { MODEL_ID, MODEL_DTYPE } from '../src/sok/config.js';

env.cacheDir = process.env.HF_CACHE || '.cache/hf';
env.allowRemoteModels = false; env.localModelPath = env.cacheDir;

const korpus = JSON.parse(readFileSync('public/data/korpus.json', 'utf8'));
const embed = await pipeline('feature-extraction', MODEL_ID, { dtype: MODEL_DTYPE });
const vec = async (texts) => (await embed(texts, { pooling: 'mean', normalize: true })).tolist();

const P = await vec(korpus.passages.map((p) => p.text));
const Q = await vec(korpus.questions);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

// PCA till tre dimensioner, räknad på textbitarna och frågorna tillsammans
const X = [...P, ...Q], n = X.length, d = X[0].length;
const mean = new Array(d).fill(0);
for (const x of X) for (let j = 0; j < d; j++) mean[j] += x[j] / n;
const C = X.map((x) => x.map((v, j) => v - mean[j]));
const cov = Array.from({ length: d }, () => new Float64Array(d));
for (const c of C) for (let i = 0; i < d; i++) { const ci = c[i]; if (ci) for (let j = 0; j < d; j++) cov[i][j] += ci * c[j] / n; }
const comps = [];
for (let k = 0; k < 3; k++) {
  let v = Float64Array.from({ length: d }, (_, i) => Math.sin(i * 12.9898 + k * 78.233)); // fast startvektor
  for (let it = 0; it < 200; it++) {
    const w = new Float64Array(d);
    for (let i = 0; i < d; i++) { let s = 0; for (let j = 0; j < d; j++) s += cov[i][j] * v[j]; w[i] = s; }
    for (const c of comps) { const p = dot(w, c); for (let i = 0; i < d; i++) w[i] -= p * c[i]; }
    const norm = Math.hypot(...w); for (let i = 0; i < d; i++) v[i] = w[i] / norm;
  }
  comps.push(v);
}
const project = (x) => comps.map((c) => dot(x.map((v, j) => v - mean[j]), c));
const posAll = X.map(project);
const scale = Math.max(...posAll.flat().map(Math.abs));
const pos3 = (p) => p.map((v) => +(v / scale).toFixed(4)); // -1..1

const out = {
  model: MODEL_ID, dtype: MODEL_DTYPE, generated: new Date().toISOString().slice(0, 10),
  note: 'Vektorerna är normerade; likheten är skalärprodukten (cosinus). pos är en PCA-projektion till 3D, skalad till -1..1. Den förvränger avstånden.',
  dims: d,
  passages: korpus.passages.map((p, i) => ({ id: p.id, pos: pos3(posAll[i]) })),
  questions: korpus.questions.map((q, k) => ({
    text: q, pos: pos3(posAll[P.length + k]),
    scores: P.map((p) => +dot(Q[k], p).toFixed(4)),
  })),
  // De fullständiga vektorerna sparas också, så att en egen fråga kan jämföras mot korpuset utan att bädda in det igen
  vectors: P.map((p) => p.map((v) => +v.toFixed(5))),
};
writeFileSync('public/data/korpus_forberaknat.json', JSON.stringify(out));
console.log(`${P.length} textbitar, ${Q.length} frågor → public/data/korpus_forberaknat.json (${(JSON.stringify(out).length / 1024).toFixed(0)} kB)`);
for (const q of out.questions) {
  const top = q.scores.map((s, i) => [s, korpus.passages[i].id]).sort((a, b) => b[0] - a[0]).slice(0, 3);
  console.log(`  ${q.text}\n    ${top.map(([s, id]) => `${id} ${s.toFixed(2)}`).join(' | ')}`);
}
