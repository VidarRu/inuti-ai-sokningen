// Sidans väg in till inbäddningsmodellen i Web Workern. Varje anrop ger ett löfte.
export function createEmbedClient() {
  const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  let nextId = 1;
  const pending = new Map();
  worker.onmessage = (e) => {
    const { id, type } = e.data;
    const p = pending.get(id);
    if (!p) return;
    if (type === 'done') { pending.delete(id); p.resolve(e.data.result); }
    else if (type === 'error') { pending.delete(id); p.reject(new Error(e.data.message)); }
    else p.onEvent?.(e.data);
  };
  worker.onerror = (e) => { for (const p of pending.values()) p.reject(new Error(e.message || 'Fel i modellens arbetstråd')); pending.clear(); };
  function call(type, args = {}, onEvent) {
    const id = nextId++;
    const promise = new Promise((resolve, reject) => pending.set(id, { resolve, reject, onEvent }));
    worker.postMessage({ id, type, ...args });
    return promise;
  }
  return {
    // onEvent får { type: 'progress', loaded, total } medan filerna hämtas
    load: (onEvent) => call('load', {}, onEvent),
    // Ger en normerad vektor (Float32Array) per text
    embed: (texts) => call('embed', { texts }),
    // Rankar textbitar efter likhet med frågan. Ger [{ i, score }] i fallande ordning.
    rank: (query, texts) => call('rank', { query, texts }),
  };
}
