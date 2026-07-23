const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Groq's response_format:json_object should return clean JSON, but guard anyway:
// strip stray markdown fences and parse. Throws a clear error (not a raw SyntaxError)
// so callers/logs show what actually came back.
const parseJSON = (content) => {
  if (!content || !content.trim()) {
    throw new Error('LLM returned empty response');
  }
  const cleaned = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Last-ditch: grab the outermost {...} block in case of leading/trailing prose.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch (_) {}
    }
    throw new Error(`LLM returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }
};

const chatCompletion = async (messages, options = {}) => {
  const temperature = options.temperature ?? 0.2;
  const max_tokens = options.max_tokens ?? 2000;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature,
        max_tokens,
        response_format: { type: 'json_object' },
      });
      return parseJSON(response?.choices?.[0]?.message?.content);
    } catch (err) {
      const status = err?.status || err?.response?.status;
      // Retry on rate limits (429) and transient server errors (5xx). Everything
      // else (including JSON parse failures) fails fast — retrying won't help.
      const retryable = status === 429 || (status >= 500 && status < 600);
      if (!retryable || attempt === MAX_RETRIES) throw err;

      const retryAfter = Number(err?.headers?.['retry-after'] || 0);
      const delay = retryAfter > 0
        ? retryAfter * 1000
        : BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 400;
      console.warn(`[groq] ${status} — retry ${attempt + 1}/${MAX_RETRIES} in ${(delay / 1000).toFixed(1)}s`);
      await sleep(delay);
    }
  }
};

module.exports = { chatCompletion };