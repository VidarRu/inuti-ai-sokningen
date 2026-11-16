// Web Worker: här räknar inbäddningsmodellen, vid sidan av själva sidan så att
// animationerna inte hackar. Transformers.js laddar modellen och ONNX Runtime
// Web (WebAssembly) kör den. Modellen är liten nog att WebGPU inte behövs.
import { pipeline, env } from '@huggingface/transformers';
import { MODEL_ID, MODEL_DTYPE, LOCAL_MODEL_BASE, REMOTE_HOST } from './config.js';

// ONNX Runtimes WebAssembly-filer serveras från sidan själv (se scripts/copy-ort.mjs)
env.backends.onnx.wasm.wasmPaths = new URL('/ort/', self.location.origin).href;
env.backends.onnx.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
if (LOCAL_MODEL_BASE) {
  env.allowRemoteModels = false; env.allowLocalModels = true;
  env.localModelPath = LOCAL_MODEL_BASE; // en sökväg, inte en hel adress: annars hoppar biblioteket över de lokala filerna
} else {
  env.allowLocalModels = false;
  env.remoteHost = REMOTE_HOST;
}
env.useBrowserCache = true; // modellen sparas i webbläsarens cache efter första gången

let embedder = null;
const post = (msg, transfer) => self.postMessage(msg, transfer || []);

async function load(id) {
  if (embedder) return;
  embedder = await pipeline('feature-extraction', MODEL_ID, {
    dtype: MODEL_DTYPE,
    device: 'wasm',
    progress_callback: (p) => {
      if (p.status === 'progress' && /\.onnx$/.test(p.file || '')) post({ id, type: 'progress', loaded: p.loaded, total: p.total });
      else if (p.status === 'ready') post({ id, type: 'status', status: 'startar' });
    },
  });
  // Provkör en gång, så att fel upptäcks här och inte mitt i berättelsen
  await embed(['prov']);
}

// Normerade vektorer: likheten mellan två är då skalärprodukten (cosinus)
async function embed(texts) {
  if (!embedder) throw new Error('Modellen är inte startad');
  const out = await embedder(texts, { pooling: 'mean', normalize: true });
  const [n, d] = out.dims;
  const data = out.data; // Float32Array, n × d
  const vecs = [];
  for (let i = 0; i < n; i++) vecs.push(data.slice(i * d, (i + 1) * d));
  return vecs;
}

const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

const handlers = {
  async load({ id }) { await load(id); return { threads: env.backends.onnx.wasm.numThreads }; },
  async embed({ texts }) {
    const t0 = performance.now();
    const vecs = await embed(texts);
    return { vecs, ms: performance.now() - t0, _transfer: vecs.map((v) => v.buffer) };
  },
  async rank({ query, texts }) {
    const t0 = performance.now();
    const [q, ...P] = await embed([query, ...texts]);
    const ranked = P.map((v, i) => ({ i, score: dot(q, v) })).sort((a, b) => b.score - a.score);
    return { ranked, query: q, ms: performance.now() - t0, _transfer: [q.buffer] };
  },
};

self.onmessage = async (e) => {
  const { id, type } = e.data;
  try {
    const result = await handlers[type](e.data);
    const transfer = result._transfer; delete result._transfer;
    post({ id, type: 'done', result }, transfer);
  } catch (err) {
    post({ id, type: 'error', message: String((err && err.message) || err) });
  }
};
