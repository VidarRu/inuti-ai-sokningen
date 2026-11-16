// Teknisk spik, steg 1: jämför två flerspråkiga inbäddningsmodeller på ett
// litet svenskt provkorpus. Körs i Node med samma bibliotek som sidan
// (Transformers.js), så att siffrorna blir desamma som i webbläsaren.
//   node scripts/jamfor_modeller.mjs
import { pipeline, env } from '@huggingface/transformers';

env.cacheDir = process.env.HF_CACHE || '.cache/hf';
// Modellerna är hämtade i förväg med curl (Node's fetch går inte genom proxyn)
env.allowRemoteModels = false; env.localModelPath = env.cacheDir;

// Ett litet provkorpus: korta textbitar av det slag som en söktjänst klipper ur sidor.
const corpus = [
  { id: 'bibl-oppet', text: 'Stadsbiblioteket i Västervik har öppet måndag till torsdag 10–19, fredag 10–17 och lördag 11–14. Söndagar stängt.' },
  { id: 'bibl-meropp', text: 'Med Meröppet kan du som har lånekort och är över 18 år besöka biblioteket även när personalen har gått hem, alla dagar 7–22.' },
  { id: 'bibl-gammal', text: 'Biblioteket i Västervik: öppettider 2019. Måndag–fredag 10–18, lördag 10–13. Välkommen in!' },
  { id: 'bibl-gamleby', text: 'Gamleby bibliotek är öppet tisdag och torsdag 13–18 samt onsdag 10–15.' },
  { id: 'elspark', text: 'Från och med den 1 september 2022 är det förbjudet att parkera elsparkcyklar på gång- och cykelbanor, enligt nya regler från regeringen.' },
  { id: 'elspark-sat', text: 'Regeringen föreslår nu att alla elsparkcyklar ska förses med en liten klocka som ringer när föraren tänker en dum tanke. Nyheten är ett aprilskämt.' },
  { id: 'elspark-reklam', text: 'Hyr elsparkcykel i hela stan! Första åket gratis med koden SOMMAR. Parkera var du vill, vi fixar resten.' },
  { id: 'nobel-2024', text: 'Nobelpriset i litteratur 2024 tilldelades Han Kang, sydkoreansk författare, för hennes intensiva poetiska prosa.' },
  { id: 'nobel-2023', text: 'Nobelpriset i litteratur 2023 gick till den norske författaren Jon Fosse.' },
  { id: 'nobel-fys', text: 'Nobelpriset i fysik 2024 delades mellan John Hopfield och Geoffrey Hinton för grundläggande upptäckter som möjliggör maskininlärning.' },
  { id: 'tag-vvik', text: 'Tåget mellan Västervik och Linköping går via Åtvidaberg och tar ungefär två timmar. Linjen kallas Tjustbanan.' },
  { id: 'tag-inst', text: 'Under hösten 2025 är Tjustbanan avstängd för banarbeten och tågen ersätts med buss mellan Västervik och Åtvidaberg.' },
  { id: 'kaffe', text: 'Kaffe är en dryck som bryggs på rostade och malda kaffebönor. Sverige hör till de länder som dricker mest kaffe per person.' },
  { id: 'katt', text: 'Katten är ett litet rovdjur som hållits som husdjur i tusentals år. En tamkatt sover omkring 14 timmar per dygn.' },
  { id: 'vaccin', text: 'Regionen erbjuder gratis vaccination mot säsongsinfluensa till alla som fyllt 65 år. Vaccinationen startar den 4 november.' },
  { id: 'kommun-skatt', text: 'Kommunfullmäktige beslutade i november att höja kommunalskatten med 50 öre från 2026.' },
  { id: 'kommun-skatt-gammal', text: 'Västerviks kommun sänker skatten 2015: kommunalskatten blir 21,16 kronor.' },
  { id: 'sim', text: 'Simhallen har öppet alla dagar 6–21. Morgonsim för vuxna vardagar 6–8.' },
  { id: 'vader', text: 'SMHI varnar för kraftig blåst längs Smålandskusten under natten mot torsdag.' },
  { id: 'ai-sok', text: 'En AI-söktjänst hämtar först webbsidor, klipper ut korta utdrag och låter sedan en språkmodell skriva ett svar utifrån utdragen.' },
  { id: 'kallkritik', text: 'Källkritik innebär att granska vem som står bakom en uppgift, när den publicerades och om den går att bekräfta i en oberoende källa.' },
  { id: 'eng', text: 'The public library in Västervik is open Monday to Thursday from 10 am to 7 pm.' },
];

const queries = [
  { text: 'När har biblioteket i Västervik öppet?', want: ['bibl-oppet', 'bibl-meropp', 'bibl-gammal', 'eng'] },
  { text: 'Vem fick Nobelpriset i litteratur?', want: ['nobel-2024', 'nobel-2023'] },
  { text: 'Får man parkera elsparkcykeln på trottoaren?', want: ['elspark', 'elspark-reklam', 'elspark-sat'] },
  { text: 'Går tåget från Västervik till Linköping just nu?', want: ['tag-inst', 'tag-vvik'] },
  { text: 'Hur hög är kommunalskatten i Västervik?', want: ['kommun-skatt', 'kommun-skatt-gammal'] },
  { text: 'Hur fungerar en AI-sökmotor?', want: ['ai-sok'] },
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
