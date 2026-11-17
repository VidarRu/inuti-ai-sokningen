// Gör om de inspelade körningarna till public/data/inspelningar.json, som sidan
// läser i steg 0, 2, 6 och 7.
//   node scripts/inspelning_till_json.mjs
//
// Två källor:
//   inspelningar/*.md        rådatan, oförändrad (se docs/INSPELNING.md). En
//                            körning per rubrik "## Fråga N, körning X", med
//                            fälten i ett kodblock.
//   inspelningar/kurering.json  det som kräver ett beslut: etikett (Tjänst A/B),
//                            vilken sida i korpuset varje hänvisning går till,
//                            och vilka meningar i svaret som är kontrollerade.
// Frågan, tiden, sökfrågorna och svaret läses ordagrant ur rådatan, så att
// inget skrivs av för hand. Tjänstens namn tas inte med.
//
// Skriptet stoppar om något inte går ihop: en kontrollerad mening som inte står
// ordagrant i svaret, en hänvisning till en sida som inte finns i korpuset, en
// fråga som inte finns i korpuset, eller ett utdrag märkt verbatim som inte står
// ordagrant i rådatan.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const DIR = 'inspelningar', OUT = 'public/data/inspelningar.json';
const korpus = JSON.parse(readFileSync('public/data/korpus.json', 'utf8'));
const kur = JSON.parse(readFileSync(`${DIR}/kurering.json`, 'utf8'));
const errors = [], warn = (m) => console.warn('  varning: ' + m);
const fail = (m) => errors.push(m);

// ---------- Läs rådatan ----------
const raw = readdirSync(DIR).filter((f) => f.endsWith('.md') && f !== 'README.md').sort()
  .map((f) => readFileSync(`${DIR}/${f}`, 'utf8').replace(/\r/g, '')).join('\n');

const HEAD = /^([A-ZÅÄÖ][A-ZÅÄÖ ]*[A-ZÅÄÖ])(?: \(([^)]*)\))?:\s?(.*)$/;
function parseBlock(body) {
  const f = {}; let cur = null;
  for (const line of body.split('\n')) {
    const m = HEAD.exec(line);
    if (m) { cur = m[1]; f[cur] = { qualifier: m[2] || '', lines: m[3] ? [m[3]] : [] }; continue; }
    if (cur) f[cur].lines.push(line);
  }
  const text = (k) => (f[k] ? f[k].lines.join('\n').replace(/\s+$/, '').replace(/^\n+/, '') : '');
  return { f, text };
}

const runsRaw = {};
for (const m of raw.matchAll(/^## Fråga (\d+), körning ([A-Z])\s*\n+```\n([\s\S]*?)\n```/gm)) {
  runsRaw[m[1] + m[2]] = parseBlock(m[3]);
}

// Ta bort en gemensam indragning (sammanfattade svar är indragna i rådatan)
function dedent(s) {
  const ls = s.split('\n'), ind = Math.min(...ls.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return ls.map((l) => l.slice(ind)).join('\n');
}

// ---------- Bygg körningarna ----------
const pid = new Set(korpus.passages.map((p) => p.id));
const runs = [];
for (const [key, c] of Object.entries(kur.runs)) {
  const r = runsRaw[key];
  if (!r) { fail(`${key}: finns i kurering.json men inte i rådatan`); continue; }
  const question = r.text('FRÅGA');
  if (!korpus.questions.includes(question)) fail(`${key}: frågan finns inte i korpus.json: "${question}"`);
  const svar = r.f['SVAR'];
  if (!svar) { fail(`${key}: saknar SVAR`); continue; }
  let answer = r.text('SVAR');
  const kind = c.answerKind || 'ordagrant';
  if (kind === 'ordagrant' && svar.qualifier !== 'ordagrant') fail(`${key}: svaret är inte märkt ordagrant i rådatan, ange answerKind`);
  if (c.answerFrom) {
    const at = answer.indexOf(c.answerFrom);
    if (at < 0) fail(`${key}: answerFrom "${c.answerFrom}" finns inte i svaret`);
    answer = dedent(answer.slice(answer.lastIndexOf('\n', at) + 1)).trim();
  }

  // Sökfrågorna: rader som börjar med "- ". En kommentar inom parentes efter
  // flera mellanslag tas bort. Indragna rader under är anteckningar, inte sökfrågor.
  const sq = (r.f['SÖKFRÅGOR SOM VISADES']?.lines || [])
    .filter((l) => /^- /.test(l)).map((l) => l.slice(2).replace(/\s{2,}\(.*\)\s*$/, '').trim())
    .filter((l) => !/^(visas inte|\(inga)/i.test(l));

  // Hänvisningsmärkena i svaret: [1], [play.google +1], [+2] …
  const markers = [...answer.matchAll(/\[([^\]\n]+)\]/g)].map((m) => m[1]);
  const keys = new Set(markers.filter((m) => !/^\+\d+$/.test(m)).map((m) => m.replace(/\s*\+\d+$/, '')));
  const srcKeys = new Set(c.sources.map((s) => s.key));
  for (const k of keys) if (!srcKeys.has(k)) warn(`${key}: märket [${k}] i svaret har ingen källa i kurering.json`);
  for (const s of c.sources) {
    if (!keys.has(s.key)) fail(`${key}: källan "${s.key}" har inget märke i svaret`);
    if (s.passage && !pid.has(s.passage)) fail(`${key}: källan "${s.key}" pekar på sidan "${s.passage}", som inte finns i korpuset`);
  }
  for (const ch of c.checks) {
    if (!answer.includes(ch.quote)) fail(`${key}: meningen finns inte ordagrant i svaret: "${ch.quote}"`);
    if (!srcKeys.has(ch.key)) fail(`${key}: kontrollen gäller källan "${ch.key}", som saknas`);
    if (!['ja', 'nej', 'delvis', 'okontrollerad'].includes(ch.verdict)) fail(`${key}: okänd dom "${ch.verdict}"`);
  }

  runs.push({
    id: c.id, question, label: c.label,
    recorded: r.text('DATUM OCH TID'),
    searchQueries: sq, searchNote: c.searchNote || '',
    shownHits: c.shownHits || [], shownHitsNote: c.shownHitsNote || '',
    answer, answerKind: kind, answerNote: c.answerNote || '',
    sources: c.sources, checks: c.checks, notes: c.notes || [],
  });
}

// ---------- Utdragen i korpuset ska stå ordagrant i rådatan ----------
const flat = (s) => s.replace(/\s+/g, ' ');
const rawFlat = flat(raw);
for (const p of korpus.passages.filter((p) => p.kind === 'utdrag')) {
  if (p.url && !raw.includes(p.url.replace(/^https:\/\/(www\.)?/, ''))) fail(`korpus ${p.id}: adressen finns inte i rådatan`);
  if (p.verbatim !== true) continue;
  for (const line of p.text.split('\n').map((l) => l.trim()).filter((l) => l && l !== '[…]')) {
    if (!rawFlat.includes(flat(line))) fail(`korpus ${p.id}: raden står inte ordagrant i rådatan: "${line}"`);
  }
}

if (errors.length) { console.error('Stoppat:\n  ' + errors.join('\n  ')); process.exit(1); }
writeFileSync(OUT, JSON.stringify({
  note: 'Inspelade körningar i två AI-söktjänster, kallade Tjänst A och Tjänst B. Byggd av scripts/inspelning_till_json.mjs ur inspelningar/. Tjänsternas namn visas inte.',
  conditions: kur.conditions,
  generated: new Date().toISOString().slice(0, 10),
  runs,
}, null, 1) + '\n');
console.log(`${runs.length} körningar → ${OUT}`);
for (const r of runs) {
  const v = (x) => r.checks.filter((c) => c.verdict === x).length;
  console.log(`  ${r.id} (${r.label}): ${r.searchQueries.length} sökfrågor, ${r.sources.length} källor, kontroller ${v('ja')} ja / ${v('delvis')} delvis / ${v('nej')} nej / ${v('okontrollerad')} okontrollerade`);
}
