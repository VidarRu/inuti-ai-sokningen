// Inbäddningsmodellen som rankar textbitarna i steg 3. Vald i den tekniska
// spiken 2026-11-16 (se scripts/jamfor_modeller.mjs och PROGRESS.md).
// Filerna hämtas från Hugging Face. Under utveckling går det att köra med
// lokala filer: lägg dem i public/models/<MODEL_ID>/ och skriv
// VITE_MODEL_BASE=/models/ i .env.local (den läggs inte i Git).
export const MODEL_ID = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
export const MODEL_DTYPE = 'q8';           // onnx/model_quantized.onnx, 118 MB
export const MODEL_FILE = 'onnx/model_quantized.onnx';
export const MODEL_BYTES = 118_308_185;    // för förloppsindikatorn
export const LOCAL_MODEL_BASE = (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_MODEL_BASE) || ''; // tom i Node
export const REMOTE_HOST = 'https://huggingface.co/';
