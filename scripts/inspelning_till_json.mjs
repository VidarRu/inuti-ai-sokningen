// Gör om ifyllda inspelningsmallar (inspelningar/*.txt, se docs/INSPELNING.md)
// till public/data/inspelningar.json, som sidan läser i steg 2, 6 och 7.
//   node scripts/inspelning_till_json.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const DIR = 'inspelningar', OUT = 'public/data/inspelningar.json';
const HEADS = ['FRÅGA', 'TJÄNST OCH LÄGE', 'DATUM OCH TID', 'SÖKFRÅGOR SOM VISADES', 'SVAR (ordagrant)', 'HÄNVISNINGAR', 'KONTROLL', 'UTDRAG TILL KORPUSET', 'ÖVRIGT'];
const headRe = new RegExp('^(' + HEADS.map((h) => h.replace(/[()]/g, '\\$&')).join('|') + '):\\s*(.*)$');
const dash = /\s[–-]\s/; // tankstreck eller bindestreck med mellanslag runt

function parse(text, name) {
  const parts = {};
  let cur = null;
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const m = headRe.exec(raw);
    if (m) { cur = m[1]; parts[cur] = m[2] ? [m[2]] : []; continue; }
    if (cur) parts[cur].push(raw);
  }
  const one = (h) => (parts[h] || []).join('\n').trim();
  const lines = (h) => (parts[h] || []).map((l) => l.trim()).filter(Boolean);
  const missing = ['FRÅGA', 'DATUM OCH TID', 'SVAR (ordagrant)'].filter((h) => !one(h));
  if (missing.length) throw new Error(`${name}: saknar ${missing.join(', ')}`);

  const refs = lines('HÄNVISNINGAR').map((l) => {
    const m = /^\[(\d+)\]\s*(\S+)(?:\s[–-]\s(.*))?$/.exec(l);
    if (!m) throw new Error(`${name}: kan inte läsa hänvisningen "${l}"`);
    return { n: Number(m[1]), url: m[2], sentence: (m[3] || '').trim() };
  });
  for (const l of lines('KONTROLL')) {
    const m = /^\[(\d+)\]\s*(står i källan|står inte|delvis)(?:\s[–-]\s(.*))?$/i.exec(l);
    if (!m) throw new Error(`${name}: kan inte läsa kontrollen "${l}"`);
    const r = refs.find((x) => x.n === Number(m[1]));
    if (!r) throw new Error(`${name}: kontroll [${m[1]}] har ingen hänvisning`);
    r.check = { 'står i källan': 'ja', 'står inte': 'nej', 'delvis': 'delvis' }[m[2].toLowerCase()];
    r.note = (m[3] || '').trim();
  }
  const answer = one('SVAR (ordagrant)');
  for (const r of refs) {
    if (r.sentence && !answer.includes(r.sentence)) console.warn(`${name}: meningen vid [${r.n}] finns inte ordagrant i svaret: "${r.sentence}"`);
    if (!r.check) console.warn(`${name}: hänvisning [${r.n}] saknar kontroll`);
  }
  const excerpts = lines('UTDRAG TILL KORPUSET').map((l) => {
    const m = /^(\S+),\s*hämtad\s+(\d{4}-\d{2}-\d{2}):\s*["”“](.*)["”“]\s*$/.exec(l);
    if (!m) throw new Error(`${name}: kan inte läsa utdraget "${l.slice(0, 60)}"`);
    return { url: m[1], fetched: m[2], text: m[3].trim() };
  });
  return {
    id: name,
    question: one('FRÅGA'),
    service: one('TJÄNST OCH LÄGE'),   // visas inte på sidan
    recorded: one('DATUM OCH TID'),
    searchQueries: lines('SÖKFRÅGOR SOM VISADES').map((l) => l.replace(/^-\s*/, '')).filter((l) => !/^\(inga/.test(l)),
    answer,
    references: refs,
    excerpts,
    other: one('ÖVRIGT') || undefined,
  };
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.txt')).sort();
const runs = files.map((f) => parse(readFileSync(`${DIR}/${f}`, 'utf8'), f.replace(/\.txt$/, '')));
writeFileSync(OUT, JSON.stringify({ note: 'Inspelade körningar i en AI-söktjänst, se docs/INSPELNING.md. Tjänsten visas inte på sidan.', generated: new Date().toISOString().slice(0, 10), runs }, null, 1) + '\n');
console.log(`${runs.length} inspelning(ar) → ${OUT}`);
for (const r of runs) console.log(`  ${r.id}: ${r.searchQueries.length} sökfrågor, ${r.references.length} hänvisningar (${r.references.filter((x) => x.check && x.check !== 'ja').length} som inte stämmer helt), ${r.excerpts.length} utdrag`);
