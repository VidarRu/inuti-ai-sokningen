// Teknisk spik, steg 1: jämför två flerspråkiga inbäddningsmodeller på ett
// litet svenskt provkorpus. Körs i Node med samma bibliotek som sidan
// (Transformers.js), så att siffrorna blir desamma som i webbläsaren.
//   node scripts/jamfor_modeller.mjs
import { pipeline, env } from '@huggingface/transformers';

env.cacheDir = process.env.HF_CACHE || '.cache/hf';
// Modellerna är hämtade i förväg med curl (Node's fetch går inte genom proxyn)
env.allowRemoteModels = false; env.localModelPath = env.cacheDir;

// Ett litet provkorpus: korta textbitar av det slag som en söktjänst klipper ur sidor.
import { readFileSync } from 'node:fs';
const korpus = JSON.parse(readFileSync('public/data/korpus.json', 'utf8'));
const corpus = korpus.passages;

const queries = [
  { text: korpus.questions[0], want: ['jul-gammal', 'jul-reklam', 'bibl-oppet', 'bibl-gammal'] },
  { text: korpus.questions[1], want: ['ebok-bibl', 'ebok-reklam'] },
  { text: korpus.questions[2], want: ['elspark-regler', 'elspark', 'elspark-sat', 'elspark-reklam'] },
  { text: korpus.questions[3], want: ['buss-pris', 'buss-gammal'] },
];

const models = [
  { name: 'Xenova/multilingual-e5-small', q: 'query: ', p: 'passage: ' },
  { name: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', q: '', p: '' },
];

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

for (const m of models) {
  console.log(`\n==== ${m.name}`);
  let t0 = performance.now();
  const embed = await pipeline('feature-extraction', m.name, { dtype: 'q8' });
  console.log(`laddad på ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  const vec = async (texts) => (await embed(texts, { pooling: 'mean', normalize: true })).tolist();
  t0 = performance.now();
  const P = await vec(corpus.map((c) => m.p + c.text));
  console.log(`${corpus.length} textbitar inbäddade på ${((performance.now() - t0) / 1000).toFixed(2)} s`);
  let hits = 0, total = 0;
  for (const q of queries) {
    t0 = performance.now();
    const [Q] = await vec([m.q + q.text]);
    const ms = performance.now() - t0;
    const ranked = corpus.map((c, i) => ({ id: c.id, s: dot(Q, P[i]) })).sort((a, b) => b.s - a.s);
    const top = ranked.slice(0, 5).map((r) => `${r.id} ${r.s.toFixed(3)}`).join(' | ');
    const ok = ranked.slice(0, q.want.length).every((r) => q.want.includes(r.id));
    const first = q.want.includes(ranked[0].id);
    hits += first; total++;
    console.log(`${first ? 'OK ' : 'FEL'} ${ok ? '✓' : ' '} ${ms.toFixed(0).padStart(4)} ms  "${q.text}"\n       ${top}`);
  }
  console.log(`rätt första träff: ${hits} av ${total}`);
  const all = corpus.map((c, i) => P[i]);
  const spread = [];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) spread.push(dot(all[i], all[j]));
  spread.sort((a, b) => a - b);
  console.log(`likhet mellan slumpvisa par: min ${spread[0].toFixed(3)}, median ${spread[spread.length >> 1].toFixed(3)}, max ${spread[spread.length - 1].toFixed(3)}`);
}
