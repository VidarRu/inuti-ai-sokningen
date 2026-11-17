// Formerna som partiklarna ordnar sig i. Varje form är en Float32Array med
// x, y, z för var och en av N partiklar. De första M partiklarna är textbitarna
// i korpuset (en per sida), partikel M är besökarens fråga, resten är stoft.
// Slump- och brusfunktionerna är hämtade från Inuti AI-hjärnan (shapes.js).

export const N = 24000;

// ---------- Slump och brus med frö, så att formerna blir likadana varje gång ----------
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash3(x, y, z) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
           l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
}

function randomDirection(rand) {
  const z = rand() * 2 - 1, a = rand() * Math.PI * 2, r = Math.sqrt(1 - z * z);
  return [r * Math.cos(a), z, r * Math.sin(a)];
}

// ---------- Världen: resan går inåt längs z-axeln, mot minus ----------
// Sökrutan och frågan ligger runt origo. Längre in kommer webben (stjärnfältet),
// kontextfönstret, strömmen där svaret skrivs, och till sist webben igen på håll.
export const GALAXY_CENTER = [0, 0, -9];
export const GALAXY_SCALE = 2.6;
export const WINDOW_Z = -17;
export const WINDOW_W = 1.1, WINDOW_H = 1.5;     // kontextfönstret: smalt och högt
export const STREAM_Z0 = -20, STREAM_LEN = 14;
export const FAR_CENTER = [0, 0, STREAM_Z0 - STREAM_LEN - 9];
export const FAR_SCALE = 1.9;
export const SPLIT_K = 4;                        // antal sökfrågor som frågan delas i
export const SPLIT_LEN = 2.2;

// ---------- Fältet: ett lugnt moln runt sökrutan ----------
export function buildField() {
  const rand = mulberry(23);
  const pos = new Float32Array(N * 3), bright = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const d = randomDirection(rand);
    const r = 0.8 + 2.4 * Math.pow(rand(), 0.6);
    const sw = noise3(d[0] * 1.5, d[1] * 1.5, d[2] * 1.5);
    pos[i * 3] = d[0] * r * 1.6; pos[i * 3 + 1] = d[1] * r * 0.8 + sw * 0.3; pos[i * 3 + 2] = d[2] * r * 1.1 - 0.5;
    bright[i] = 0.45 * Math.pow(rand(), 3); // några varma gnistor i det blå
  }
  return { pos, bright };
}

// ---------- Frågan: partiklarna samlas i ett tätt, glödande klot ----------
export function buildCloud() {
  const rand = mulberry(29);
  const pos = new Float32Array(N * 3), bright = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const d = randomDirection(rand);
    // Tät kärna och en gles slöja utanför
    const core = rand() < 0.8;
    const r = core ? 0.35 + 0.3 * Math.pow(rand(), 2) : 0.7 + 1.4 * rand();
    pos[i * 3] = d[0] * r; pos[i * 3 + 1] = d[1] * r * 0.85; pos[i * 3 + 2] = d[2] * r;
    bright[i] = core ? 0.8 - r : 0.1;
  }
  return { pos, bright };
}

// ---------- Omformuleringen: frågan delas i strängar som flyger åt olika håll ----------
// Varje partikel hör till en sträng k och ligger på andelen t ut längs den.
// Riktningarna står i SPLIT_DIRS så att etiketterna kan sättas vid ändarna.
export const SPLIT_DIRS = Array.from({ length: SPLIT_K }, (_, k) => {
  const a = (k / SPLIT_K) * Math.PI * 2 + 0.6;
  return [Math.cos(a) * 1.0, Math.sin(a) * 0.55, -0.35 - 0.25 * ((k * 7) % SPLIT_K) / SPLIT_K];
});
export function splitEnd(k) { const d = SPLIT_DIRS[k]; return [d[0] * SPLIT_LEN, d[1] * SPLIT_LEN, d[2] * SPLIT_LEN]; }
export function buildSplit() {
  const rand = mulberry(31);
  const pos = new Float32Array(N * 3), bright = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const k = i % SPLIT_K, d = SPLIT_DIRS[k];
    const t = Math.pow(rand(), 0.8), spread = 0.05 + 0.22 * t;
    const [ox, oy, oz] = randomDirection(rand);
    pos[i * 3] = d[0] * SPLIT_LEN * t + ox * spread;
    pos[i * 3 + 1] = d[1] * SPLIT_LEN * t + oy * spread;
    pos[i * 3 + 2] = d[2] * SPLIT_LEN * t + oz * spread;
    bright[i] = 0.25 + 0.6 * t; // ljusare mot spetsen
  }
  return { pos, bright };
}

// ---------- Webben: ett stjärnfält där sidorna är punkter ----------
// passages: [{ pos: [x, y, z] }] i -1..1 från PCA-projektionen. De läggs på
// partiklarna 0..M-1. Partikel M är frågan (sätts separat). Resten är stoft.
export function buildGalaxy(passages, center = GALAXY_CENTER, scale = GALAXY_SCALE, seed = 37) {
  const rand = mulberry(seed);
  const pos = new Float32Array(N * 3), bright = new Float32Array(N);
  const M = passages.length;
  for (let i = 0; i < N; i++) {
    let x, y, z;
    if (i < M) { [x, y, z] = passages[i].pos; bright[i] = 0.7; }
    else if (i === M) { x = y = z = 0; }
    else {
      // Stoftet ligger i stråk och hopar, som i hjärnprojektets rum
      const d = randomDirection(rand);
      const r = Math.pow(rand(), 0.45) * 1.25;
      const sw = noise3(d[0] * 2.2 + 3, d[1] * 2.2, d[2] * 2.2);
      x = d[0] * r * (1 + 0.5 * sw); y = d[1] * r * (0.6 + 0.4 * sw); z = d[2] * r;
    }
    pos[i * 3] = center[0] + x * scale; pos[i * 3 + 1] = center[1] + y * scale; pos[i * 3 + 2] = center[2] + z * scale;
  }
  return { pos, bright };
}

// ---------- Kontextfönstret: ett smalt, högt fönster av partiklar ----------
export function buildWindow() {
  const rand = mulberry(41);
  const pos = new Float32Array(N * 3), bright = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const u = rand(), v = rand();
    // Ramen är tät, ytan gles: de flesta partiklar ligger längs kanterna
    const edge = rand() < 0.7;
    let x, y;
    if (edge) {
      const side = Math.floor(rand() * 4), t = rand();
      x = side < 2 ? (t * 2 - 1) * WINDOW_W : (side === 2 ? -1 : 1) * WINDOW_W;
      y = side < 2 ? (side === 0 ? 1 : -1) * WINDOW_H : (t * 2 - 1) * WINDOW_H;
      x += (rand() - 0.5) * 0.06; y += (rand() - 0.5) * 0.06;
      bright[i] = 0.6;
    } else { x = (u * 2 - 1) * WINDOW_W; y = (v * 2 - 1) * WINDOW_H; bright[i] = 0.1; }
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = WINDOW_Z + (rand() - 0.5) * 0.08;
  }
  return { pos, bright };
}

// ---------- Strömmen: bitar som rinner förbi runt kameran medan svaret skrivs ----------
export function buildStream() {
  const rand = mulberry(47);
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const z = rand() * STREAM_LEN;
    const band = Math.floor(rand() * 9);
    const a = band * (Math.PI * 2 / 9) + z * 0.22 + (rand() + rand() - 1) * 0.28;
    const r = 1.25 + 0.35 * Math.sin(band * 1.7 + z * 0.5) + 1.6 * Math.pow(rand(), 2.2);
    pos[i * 3] = Math.cos(a) * r * 1.35; pos[i * 3 + 1] = Math.sin(a) * r * 0.85; pos[i * 3 + 2] = STREAM_Z0 - z;
  }
  return { pos, bright: new Float32Array(N) };
}
