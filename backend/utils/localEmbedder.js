// Local embeddings via Transformers.js (@huggingface/transformers).
// Runs the model in-process using ONNX — no API key, no network call, no rate limit,
// no billing. Replaces OpenAI's text-embedding-3-small (1536-dim) with
// Xenova/all-MiniLM-L6-v2 (384-dim), a well-tested general-purpose sentence embedder.
//
// NOTE on dimensions: 384-dim vectors are NOT comparable to old 1536-dim OpenAI vectors.
// Any previously stored vectors must be cleared after switching (see migration note
// in the deployment steps) — cosineSimilarity() already guards against length
// mismatches by returning 0, so this won't crash anything, but stale old vectors will
// silently score 0 similarity against anything new until they're cleared/re-embedded.
//
// @huggingface/transformers is ESM-only, so it's loaded via dynamic import() from this
// CommonJS file — that's expected and not a bug.

let extractorPromise = null;

const getExtractor = () => {
  if (!extractorPromise) {
    extractorPromise = import('@huggingface/transformers').then(({ pipeline }) =>
      pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    );
  }
  return extractorPromise;
};

// Same signature/behavior as the old OpenAI-backed embedText: takes text, returns a
// plain float array. Everything downstream (vectorStore.js, ragPipeline.js,
// aiController.js) calls this same shape, so nothing else needs to change.
const embedText = async (text) => {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  // Model's effective context is ~256 tokens; truncate generously by characters first
  // so we're not handing the tokenizer multi-page resume text. The tokenizer/pipeline
  // truncates internally too, so this is a safety net, not the only protection.
  const extractor = await getExtractor();
  const output = await extractor(cleaned.slice(0, 2000), { pooling: 'mean', normalize: true });
  return Array.from(output.data); // float32[] — 384-dim
};

// Call once at server boot so the ~25-90MB model is downloaded/loaded before the first
// real user request hits it — otherwise the first request after every cold start
// (common on Render's free tier, which spins down on inactivity) pays that load cost.
const warmUpEmbedder = async () => {
  try {
    console.log('[LocalEmbedder] loading model...');
    await getExtractor();
    console.log('[LocalEmbedder] model loaded and ready');
  } catch (err) {
    console.error('[LocalEmbedder] warm-up failed:', err.message);
  }
};

module.exports = { embedText, warmUpEmbedder };