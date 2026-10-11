const axios = require('axios');

// ─────────────────────────────────────────────────────────────────────────
// Groq periodically retires/renames free-tier models — hardcoding a fixed
// list of "known good" model names turned out to still break (multiple
// guessed names in a row got decommissioned). The reliable fix is to ASK
// Groq which models are actually available right now via its models list
// endpoint, rather than guessing — then pick a sensible chat model from
// whatever comes back. This can never go stale the way a hardcoded list can.
// ─────────────────────────────────────────────────────────────────────────

// Preference order when multiple models are available — prefer small/fast
// models first (cheaper, much higher free-tier rate limits, and confirmed
// to actually work on this account already), falling back to large/expensive
// models last since they carry much tighter free-tier token-per-minute quotas
// and are more likely to hit rate limits under normal use.
const PREFERRED_SUBSTRINGS = [
  'compound-mini', 'compound',
  'llama-3.1-8b-instant', '8b-instant',
  'llama-3.3-70b', 'llama3-70b', 'llama-3', 'llama3',
  'gemma2', 'gemma',
];

// Huge models known for very tight free-tier rate limits — only tried as an
// absolute last resort, after everything else (including the hardcoded
// fallback list) has been exhausted.
const DEPRIORITIZED_HINTS = ['120b', '70b', '405b', '34b', '32b'];

// Last-resort hardcoded candidates, tried via REAL completion calls (not
// trusted blindly) only if the /v1/models listing is empty/unreachable or
// everything it listed turned out to be dead on actual invocation.
const HARDCODED_FALLBACK_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
];

let workingModel = null; // only ever set after a REAL completion succeeds with it

// Model IDs that exist in a Groq account's /v1/models listing but are NOT
// chat-completion models (audio transcription, TTS, moderation, etc.) —
// filtered out before attempting, since trying them just wastes a call and
// produces a confusing "does not support chat completions" error.
const NON_CHAT_MODEL_HINTS = ['whisper', 'tts', 'guard', 'moderation', 'distil-whisper', 'playai'];

function isChatCapable(modelId) {
  const id = modelId.toLowerCase();
  return !NON_CHAT_MODEL_HINTS.some(hint => id.includes(hint));
}

async function groqChatJSON({ prompt, maxTokens = 500, temperature = 0.4 }) {
  if (!process.env.GROQ_API_KEY) {
    const err = new Error('GROQ_API_KEY is not configured');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const attempt = async (m) => {
    try {
      const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: m,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature,
        response_format: { type: 'json_object' },
      }, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 20000,
      });
      return extractJSON(response.data.choices[0].message.content);
    } catch (err) {
      const apiMsg = err.response?.data?.error?.message || '';
      // Some models reject strict JSON mode outright (or produce output that
      // fails Groq's own JSON-schema validation) — retry the SAME model
      // once without response_format, relying on the prompt's own "respond
      // ONLY with JSON" instruction plus our lenient extractJSON() parser.
      if (/failed to validate json|failed_generation|response_format/i.test(apiMsg)) {
        const response2 = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: m,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature,
        }, {
          headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          timeout: 20000,
        });
        return extractJSON(response2.data.choices[0].message.content);
      }
      throw err;
    }
  };

  // If we already confirmed a working model via a REAL completion earlier
  // in this process's lifetime, use it directly — no repeated discovery cost.
  if (workingModel) {
    try { return await attempt(workingModel); }
    catch (err) {
      const apiMsg = err.response?.data?.error?.message || '';
      if (!isModelIssue(apiMsg)) throw err;
      workingModel = null; // it died since we last confirmed it — fall through to full retry below
    }
  }

  // Build the FULL candidate list: whatever Groq's /v1/models actually
  // returns, ordered by our preferences, PLUS a hardcoded safety net in case
  // the models endpoint itself is stale/wrong. Groq's model listing can
  // include decommissioned models it still has metadata for, AND non-chat
  // models (whisper/tts/etc) mixed in with chat models — the only way to
  // know a model REALLY works for chat is to attempt a real completion, so
  // this tries each chat-capable candidate in turn via actual API calls.
  let candidates = [];
  try {
    const res = await axios.get('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      timeout: 10000,
    });
    const listed = (res.data?.data || []).map(m => m.id).filter(Boolean).filter(isChatCapable);
    const ranked = [];
    for (const pref of PREFERRED_SUBSTRINGS) {
      listed.forEach(id => { if (id.toLowerCase().includes(pref) && !ranked.includes(id)) ranked.push(id); });
    }
    listed.forEach(id => {
      // Anything not yet ranked AND not flagged as a huge/rate-limited model
      if (!ranked.includes(id) && !DEPRIORITIZED_HINTS.some(h => id.toLowerCase().includes(h))) ranked.push(id);
    });
    // Finally, the huge/expensive models — only reached if nothing smaller worked.
    listed.forEach(id => { if (!ranked.includes(id)) ranked.push(id); });
    candidates = ranked;
  } catch (listErr) {
    console.error('Groq /v1/models listing failed, using hardcoded fallback only:', listErr.response?.data?.error?.message || listErr.message);
  }
  // Hardcoded safety net, appended after whatever the listing gave us, in
  // case the listing was empty, wrong, or unreachable.
  HARDCODED_FALLBACK_MODELS.filter(isChatCapable).forEach(id => { if (!candidates.includes(id)) candidates.push(id); });

  if (!candidates.length) throw new Error('No chat-capable Groq models available to try (models list empty and no fallback matched)');

  let lastErr = null;
  const attemptedLog = [];
  for (const model of candidates) {
    try {
      const result = await attempt(model);
      workingModel = model; // confirmed via a REAL completion — trust this one going forward
      return result;
    } catch (err) {
      lastErr = err;
      const apiMsg = err.response?.data?.error?.message || '';
      attemptedLog.push(`${model}: ${apiMsg || err.message}`);
      if (!isModelIssue(apiMsg)) {
        console.error('Groq candidates tried before hitting a non-model error:', attemptedLog.join(' | '));
        throw err; // a real error (bad key, rate limit, etc) — don't waste more calls
      }
      // else: this candidate is dead, try the next one
    }
  }
  console.error('Groq: ALL candidates failed:', attemptedLog.join(' | '));
  throw lastErr;
}

function isModelIssue(apiMsg) {
  return /does not exist|decommissioned|not found|invalid model|does not support chat completions|is not supported|failed to validate json|failed_generation|rate limit/i.test(apiMsg || '');
}

// Some models (notably larger "reasoning" models) don't reliably honor
// response_format:{type:"json_object"} and may wrap the JSON in prose or
// markdown fences despite instructions — extract the first {...} block
// rather than assuming the whole response is clean JSON.
function extractJSON(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  throw new Error('Could not extract valid JSON from model response');
}

// Startup check — confirms the key works AND reports which model was
// actually discovered/selected, so you know exactly what's running.
async function verifyGroqConfig() {
  if (!process.env.GROQ_API_KEY) {
    console.log('ℹ️  Groq not configured (GROQ_API_KEY empty) — AI coaching/deep-dive/IPO-analysis will be unavailable. Get a free key at console.groq.com/keys.');
    return false;
  }
  try {
    await groqChatJSON({ prompt: 'Respond with exactly this JSON: {"ok": true}', maxTokens: 20 });
    console.log(`✅ Groq configured and authenticated — using model "${workingModel}" for AI features.`);
    return true;
  } catch (err) {
    const apiMsg = err.response?.data?.error?.message;
    console.error('❌ GROQ CONFIG ERROR — AI features will fail:', apiMsg || err.message);
    return false;
  }
}

module.exports = { groqChatJSON, verifyGroqConfig };