/**
 * NAtlasService — the single entry point for N-ATLAS language technology.
 *
 *   transcribeAudio()               N-ATLAS ASR  (e.g. NCAIR1/Hausa-ASR)
 *   translateKnowledge()            N-ATLaS LLM
 *   generateStructuredKnowledge()   N-ATLaS LLM + source-grounding check
 *   summarizeKnowledge()            N-ATLaS LLM
 *   answerFromRetrievedKnowledge()  N-ATLaS LLM over retrieved community sources only
 *
 * Every function returns `{ ..., meta: { provider, model, durationMs } }` so the
 * caller can store honest processing provenance.
 */
const client = require('./natlas.client');
const prompts = require('./natlas.prompts');
const { parseJSON } = require('../../utils/parseJSON');
const { CONTRIBUTION_TYPES } = require('../../config/constants');
const logger = require('../../utils/logger');

const { NAtlasError } = client;

// Optional, opt-in development fallback for the LLM step only (never for ASR).
// When used, provenance records provider "gemma-fallback" — it is never labelled N-ATLAS.
const llmFallbackEnabled = () => process.env.NATLAS_LLM_FALLBACK?.trim().toLowerCase() === 'gemma';

const runLLM = async ({ system, user, json = false, maxTokens = 1200 }) => {
  const started = Date.now();
  try {
    const { text, model } = await client.chat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      json,
      maxTokens,
    });
    return { text, meta: { provider: 'n-atlas', model, durationMs: Date.now() - started } };
  } catch (err) {
    if (!(err instanceof NAtlasError && err.code === 'NOT_CONFIGURED' && llmFallbackEnabled())) throw err;

    logger.warn('N-ATLAS LLM not configured — using Gemma development fallback');
    const gemma = require('../ai/gemma.client');
    const text = json
      ? await gemma.generateJSON(system, user, maxTokens)
      : await gemma.generateText(system, user);
    return {
      text: text.trim(),
      meta: { provider: 'gemma-fallback', model: process.env.GEMMA_MODEL || 'gemma', durationMs: Date.now() - started },
    };
  }
};

// ── Source grounding ─────────────────────────────────────────────────────────

/** Lower-case, strip diacritics and Hausa hooked letters so "Ƙano" matches "kano". */
const normalize = (s = '') =>
  String(s)
    .toLowerCase()
    .replace(/ɗ/g, 'd').replace(/ƙ/g, 'k').replace(/ɓ/g, 'b').replace(/ƴ/g, 'y')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’ʼ`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const tokens = (s) => normalize(s).split(' ').filter((t) => t.length > 2);

/**
 * True when `term` is supported by `source`: a direct match, or most of its
 * meaningful words occur in the source (`minOverlap`).
 */
const isGrounded = (term, source, minOverlap = 0.6) => {
  const t = normalize(term);
  if (!t) return false;
  const src = ` ${normalize(source)} `;
  if (src.includes(` ${t} `) || (t.length > 3 && src.includes(t))) return true;
  const words = tokens(term);
  if (words.length === 0) return false;
  const srcWords = new Set(tokens(source));
  return words.filter((w) => srcWords.has(w)).length / words.length >= minOverlap;
};

const asStringArray = (v, max = 30) =>
  (Array.isArray(v) ? v : [])
    .map((x) => (typeof x === 'string' ? x : x?.name || x?.text || ''))
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, max);

const asObjectArray = (v, max = 30) => (Array.isArray(v) ? v : []).filter((x) => x && typeof x === 'object').slice(0, max);

const str = (v, max = 2000) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/**
 * Normalise raw LLM JSON and drop any person, place, entity, cultural term or
 * proverb that cannot be found in the original transcript.
 */
const groundStructuredKnowledge = (raw, transcript, fallbackType) => {
  const removed = [];
  const keep = (field, items, getTerm, minOverlap) =>
    items.filter((item) => {
      const term = getTerm(item);
      const ok = isGrounded(term, transcript, minOverlap);
      if (!ok) removed.push({ field, value: term });
      return ok;
    });

  const knowledgeType = Object.values(CONTRIBUTION_TYPES).includes(raw.knowledgeType) ? raw.knowledgeType : fallbackType;

  const result = {
    title: str(raw.title, 200),
    summary: str(raw.summary, 1500),
    topics: asStringArray(raw.topics, 12).map((t) => t.toLowerCase()),
    keywords: asStringArray(raw.keywords, 15),
    knowledgeType,
    confidenceNotes: asStringArray(raw.confidenceNotes, 10),
    people: keep('people', asStringArray(raw.people), (x) => x),
    places: keep('places', asStringArray(raw.places), (x) => x),
    entities: keep(
      'entities',
      asObjectArray(raw.entities)
        .map((e) => ({ name: str(e.name, 200), type: str(e.type, 40) || 'other' }))
        .filter((e) => e.name),
      (e) => e.name
    ),
    culturalConcepts: keep(
      'culturalConcepts',
      asObjectArray(raw.culturalConcepts)
        .map((c) => ({ term: str(c.term, 200), meaning: str(c.meaning, 500) }))
        .filter((c) => c.term),
      (c) => c.term
    ),
    proverbs: keep(
      'proverbs',
      asObjectArray(raw.proverbs)
        .map((p) => ({ text: str(p.text, 500), translation: str(p.translation, 500), meaning: str(p.meaning, 500) }))
        .filter((p) => p.text),
      (p) => p.text,
      0.7
    ),
  };

  if (removed.length) {
    result.confidenceNotes.push(
      `${removed.length} AI-extracted item(s) were removed because they do not appear in the original recording.`
    );
  }

  return { result, grounding: { checked: true, removed } };
};

// ── Public service ───────────────────────────────────────────────────────────

const NAtlasService = {
  status() {
    const configured = client.isConfigured();
    return {
      asr: { configured: configured.asr, model: client.config.asrModel('hausa') },
      llm: {
        configured: configured.llm,
        model: client.config.llmModel(),
        fallback: !configured.llm && llmFallbackEnabled() ? 'gemma' : null,
      },
    };
  },

  /**
   * @param {{ buffer: Buffer, mimeType: string, filename?: string, language: string }} audio
   */
  async transcribeAudio(audio) {
    const started = Date.now();
    const { text, model } = await client.transcribe(audio);
    return { transcript: text, meta: { provider: 'n-atlas', model, durationMs: Date.now() - started } };
  },

  async translateKnowledge(transcript, language) {
    if (language === 'english') {
      return { translation: transcript, meta: { provider: 'none', model: null, durationMs: 0, skipped: true } };
    }
    const { system, user } = prompts.translate(transcript, language);
    const { text, meta } = await runLLM({ system, user, maxTokens: 1500 });
    return { translation: text.replace(/^(english translation|translation)\s*:\s*/i, '').trim(), meta };
  },

  async summarizeKnowledge(text, language) {
    const { system, user } = prompts.summarize(text, language);
    const { text: summary, meta } = await runLLM({ system, user, maxTokens: 300 });
    return { summary, meta };
  },

  /**
   * @param {{ transcript: string, translation: string, language: string, knowledgeType: string }} input
   */
  async generateStructuredKnowledge({ transcript, translation, language, knowledgeType }) {
    const { system, user } = prompts.structure({ transcript, translation, language, knowledgeType });
    const { text, meta } = await runLLM({ system, user, json: true, maxTokens: 1500 });
    const raw = parseJSON(text);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('N-ATLAS returned JSON that is not an object');
    const { result, grounding } = groundStructuredKnowledge(raw, transcript, knowledgeType);
    return { knowledge: result, grounding, meta };
  },

  /**
   * Generate an answer strictly from already-retrieved community sources.
   * Callers must retrieve first; this function refuses to run with no sources.
   * @param {string} question
   * @param {{ index: number, title: string, language: string, location?: string, text: string }[]} sources
   */
  async answerFromRetrievedKnowledge(question, sources, answerLanguage = 'english') {
    if (!sources?.length) return { answer: null, meta: null };
    const { system, user } = prompts.answerFromSources(question, sources, answerLanguage);
    const { text, meta } = await runLLM({ system, user, maxTokens: 600 });
    return { answer: text, meta };
  },
};

module.exports = NAtlasService;
module.exports.NAtlasError = NAtlasError;
module.exports._internal = { isGrounded, normalize, groundStructuredKnowledge };
