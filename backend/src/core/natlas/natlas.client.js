/**
 * Low-level HTTP client for N-ATLAS (NCAIR1/N-ATLaS LLM + NCAIR1 ASR models).
 *
 * N-ATLAS has no public hosted API — it is self-hosted. This client speaks the
 * OpenAI-compatible wire format, which is what the bundled gateway
 * (natlas-gateway/), vLLM, TGI and Hugging Face Inference Endpoints expose:
 *
 *   ASR: POST {NATLAS_ASR_ENDPOINT}   multipart (file, language, model) → { text }
 *        or, with NATLAS_ASR_FORMAT=raw, the raw audio bytes as the body
 *        (Hugging Face Inference Endpoint style) → { text }
 *   LLM: POST {NATLAS_LLM_ENDPOINT}   OpenAI chat/completions JSON
 *
 * Only this file knows about endpoints and credentials. Never import it from
 * routes — go through natlas.service.js.
 */

const DEFAULT_LLM_MODEL = 'NCAIR1/N-ATLaS';
const DEFAULT_ASR_MODELS = { hausa: 'NCAIR1/Hausa-ASR' };

class NAtlasError extends Error {
  /**
   * @param {string} message
   * @param {'NOT_CONFIGURED'|'TIMEOUT'|'HTTP_ERROR'|'EMPTY_RESPONSE'|'NETWORK'} code
   * @param {number} [status]
   */
  constructor(message, code, status) {
    super(message);
    this.name = 'NAtlasError';
    this.code = code;
    this.status = status;
  }
}

const env = (key) => process.env[key]?.trim() || '';

const config = {
  apiKey: () => env('NATLAS_API_KEY'),
  llmEndpoint: () => env('NATLAS_LLM_ENDPOINT'),
  llmModel: () => env('NATLAS_MODEL') || DEFAULT_LLM_MODEL,
  asrFormat: () => (env('NATLAS_ASR_FORMAT') || 'openai').toLowerCase(),
  timeoutMs: () => parseInt(env('NATLAS_TIMEOUT_MS')) || 120000,
  // Per-language override, e.g. NATLAS_ASR_ENDPOINT_YORUBA, falls back to the shared endpoint
  asrEndpoint: (language = '') =>
    env(`NATLAS_ASR_ENDPOINT_${language.toUpperCase()}`) || env('NATLAS_ASR_ENDPOINT'),
  asrModel: (language = '') =>
    env(`NATLAS_ASR_MODEL_${language.toUpperCase()}`) ||
    env('NATLAS_ASR_MODEL') ||
    DEFAULT_ASR_MODELS[language] ||
    `N-ATLAS ASR (${language || 'auto'})`,
};

const authHeaders = () => {
  const key = config.apiKey();
  return key ? { Authorization: `Bearer ${key}` } : {};
};

const request = async (url, init) => {
  let res;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(config.timeoutMs()) });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new NAtlasError(`N-ATLAS request timed out after ${config.timeoutMs()}ms`, 'TIMEOUT');
    }
    throw new NAtlasError(`N-ATLAS endpoint unreachable: ${err.message}`, 'NETWORK');
  }

  const body = await res.text();
  if (!res.ok) {
    // Never echo the request (it may contain credentials) — only status + short body
    throw new NAtlasError(`N-ATLAS returned HTTP ${res.status}: ${body.slice(0, 200)}`, 'HTTP_ERROR', res.status);
  }
  try {
    return JSON.parse(body);
  } catch {
    return { text: body };
  }
};

/**
 * Transcribe audio with the N-ATLAS ASR model for the given language.
 * @param {{ buffer: Buffer, mimeType: string, filename?: string, language: string }} input
 * @returns {Promise<{ text: string, model: string }>}
 */
const transcribe = async ({ buffer, mimeType, filename = 'recording', language }) => {
  const url = config.asrEndpoint(language);
  if (!url) throw new NAtlasError('NATLAS_ASR_ENDPOINT is not configured', 'NOT_CONFIGURED');
  const model = config.asrModel(language);

  let data;
  if (config.asrFormat() === 'raw') {
    data = await request(url, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': mimeType },
      body: buffer,
    });
  } else {
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimeType }), filename);
    form.append('model', model);
    form.append('language', language);
    form.append('response_format', 'json');
    data = await request(url, { method: 'POST', headers: authHeaders(), body: form });
  }

  // Accept { text }, { transcription }, [{ text }] and HF pipeline chunk output
  const record = Array.isArray(data) ? data[0] : data;
  const text = (record?.text ?? record?.transcription ?? '').trim();
  if (!text) throw new NAtlasError('N-ATLAS ASR returned an empty transcript', 'EMPTY_RESPONSE');

  return { text, model: record?.model || model };
};

/**
 * Chat completion against the N-ATLaS LLM.
 * @param {{ messages: {role: string, content: string}[], temperature?: number, maxTokens?: number, json?: boolean }} input
 * @returns {Promise<{ text: string, model: string, usage?: object }>}
 */
const chat = async ({ messages, temperature = 0.1, maxTokens = 1200, json = false }) => {
  const url = config.llmEndpoint();
  if (!url) throw new NAtlasError('NATLAS_LLM_ENDPOINT is not configured', 'NOT_CONFIGURED');

  const payload = {
    model: config.llmModel(),
    messages,
    temperature,
    max_tokens: maxTokens,
    // N-ATLaS model card recommends repetition_penalty 1.12 at temperature 0.1
    repetition_penalty: 1.12,
    ...(json && { response_format: { type: 'json_object' } }),
  };

  const data = await request(url, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = (data?.choices?.[0]?.message?.content ?? data?.generated_text ?? data?.text ?? '').trim();
  if (!text) throw new NAtlasError('N-ATLAS LLM returned an empty response', 'EMPTY_RESPONSE');

  return { text, model: data?.model || config.llmModel(), usage: data?.usage };
};

const isConfigured = () => ({
  asr: Boolean(config.asrEndpoint('hausa')),
  llm: Boolean(config.llmEndpoint()),
});

module.exports = { transcribe, chat, isConfigured, config, NAtlasError };
