const { generateJSON, generateText, embed } = require('./gemma.client');
const prompts = require('./gemma.prompts');
const logger = require('../../utils/logger');
const AppError = require('../../utils/AppError');

/**
 * Remove word/char repetition loops from text, even when inside a JSON string.
 */
const removeRepetitionLoop = (text) => {
  let s = text.replace(/(\b\w{3,}\b)([ \t]+\1){3,}/gi, (match, word) => word);
  s = s.replace(/([^\s])\1{5,}/g, (match, ch) => ch.repeat(2));
  return s;
};

/**
 * Extract and parse the last complete JSON object/array from Gemma output.
 * Gemma-4 often writes planning text before the actual JSON — we want the last one.
 */
const parseJSON = (text) => {
  let s = removeRepetitionLoop(text);

  // Strip markdown fences
  s = s.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

  // Find the LAST '{' or '[' that starts a complete valid JSON block
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === '}' || s[i] === ']') {
      // Walk backwards from this closing brace to find matching open
      const closing = s[i];
      const opening = closing === '}' ? '{' : '[';
      // Try every '{' or '[' before this position
      for (let j = i - 1; j >= 0; j--) {
        if (s[j] === opening) {
          try {
            return JSON.parse(s.slice(j, i + 1));
          } catch (_) {}
        }
      }
    }
  }

  throw new Error(`Malformed JSON in: ${s.slice(0, 120)}`);
};

/**
 * Truncate all string values in a parsed object to maxLen characters.
 */
const truncateStrings = (obj, maxLen = 500) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((v) => truncateStrings(v, maxLen));
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') result[k] = v.slice(0, maxLen);
    else result[k] = truncateStrings(v, maxLen);
  }
  return result;
};

const isRateLimitError = (err) => {
  const msg = err?.message || '';
  return msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests');
};

const isRecitationError = (err) => {
  return (err?.message || '').includes('RECITATION');
};

const gemmaService = {

  async analyzeKnowledge(text, language = 'auto-detect') {
    try {
      const { system, user } = prompts.analyzeKnowledge(text, language);
      const raw = await generateJSON(system, user, 2048);
      return parseJSON(raw);
    } catch (err) {
      logger.warn('analyzeKnowledge failed', { err: err.message });
      if (isRateLimitError(err)) return { summary: 'AI analysis temporarily unavailable.', themes: [], culturalContext: '' };
      throw new AppError('AI analysis failed. Please try again.', 503);
    }
  },

  async generateEducationalContent(story) {
    try {
      const { system, user } = prompts.generateEducationalContent(story);
      const raw = await generateJSON(system, user, 2048);
      return truncateStrings(parseJSON(raw), 600);
    } catch (err) {
      logger.warn('generateEducationalContent failed', { err: err.message });
      if (isRateLimitError(err)) throw new AppError('AI quota exceeded. Please try again later.', 429);
      throw new AppError('Educational content generation failed.', 503);
    }
  },

  async generateChildrensVersion(story) {
    try {
      const { system, user } = prompts.generateChildrensVersion(story);
      const raw = await generateJSON(system, user, 1500);
      return truncateStrings(parseJSON(raw), 1500);
    } catch (err) {
      logger.warn('generateChildrensVersion failed', { err: err.message });
      if (isRateLimitError(err)) throw new AppError('AI quota exceeded. Please try again later.', 429);
      if (isRecitationError(err)) throw new AppError('Content blocked by safety filter. Try a different story.', 422);
      throw new AppError("Children's version generation failed.", 503);
    }
  },

  async findCrossLanguageConnections(story) {
    try {
      const { system, user } = prompts.findCrossLanguageConnections(story);
      const raw = await generateJSON(system, user, 1500);
      return truncateStrings(parseJSON(raw), 400);
    } catch (err) {
      logger.warn('findCrossLanguageConnections failed', { err: err.message });
      if (isRateLimitError(err)) throw new AppError('AI quota exceeded. Please try again later.', 429);
      if (isRecitationError(err)) throw new AppError('Content blocked by safety filter. Try a different story.', 422);
      throw new AppError('Cross-language analysis failed.', 503);
    }
  },

  async translateWithContext(text, fromLanguage, toLanguage) {
    try {
      const sliced = text.slice(0, 1500);

      // Step 1: get plain-text translation (no JSON — avoids truncated-string bug)
      const { system, user } = prompts.translateWithContext(sliced, fromLanguage, toLanguage);
      let translation = await generateText(system, user);

      // Gemma sometimes writes reasoning before the clean translation.
      // The clean translation is always the last paragraph block — extract it.
      translation = translation.trim();
      const blocks = translation.split(/\n{2,}/);
      // Find the last block that looks like prose (not bullet points or labels)
      const cleanBlocks = blocks.filter(b => !b.trim().startsWith('*') && !b.trim().startsWith('-') && b.trim().length > 20);
      if (cleanBlocks.length > 0) {
        translation = cleanBlocks[cleanBlocks.length - 1].trim();
      }

      // Step 2: get cultural notes as a small, safe JSON call
      let culturalNotes = [];
      let untranslatableTerms = [];
      try {
        const notes = prompts.translateCulturalNotes(sliced, fromLanguage, toLanguage);
        const raw = await generateJSON(notes.system, notes.user, 512);
        const parsed = parseJSON(raw);
        culturalNotes = parsed.culturalNotes || [];
        untranslatableTerms = parsed.untranslatableTerms || [];
      } catch (_) { /* cultural notes are non-fatal */ }

      return { translation, culturalNotes, untranslatableTerms };
    } catch (err) {
      logger.warn('translateWithContext failed', { err: err.message });
      if (isRateLimitError(err)) throw new AppError('AI quota exceeded. Please try again later.', 429);
      throw new AppError('Translation failed.', 503);
    }
  },

  async generatePodcastScript(story) {
    try {
      const { system, user } = prompts.generatePodcastScript(story);
      const raw = await generateJSON(system, user, 2048);
      return truncateStrings(parseJSON(raw), 800);
    } catch (err) {
      logger.warn('generatePodcastScript failed', { err: err.message });
      if (isRateLimitError(err)) throw new AppError('AI quota exceeded. Please try again later.', 429);
      throw new AppError('Podcast script generation failed.', 503);
    }
  },

  async extractProverbs(text, language) {
    try {
      const { system, user } = prompts.extractProverbs(text, language);
      const raw = await generateJSON(system, user, 1500);
      return parseJSON(raw);
    } catch (err) {
      logger.warn('extractProverbs failed', { err: err.message });
      if (isRateLimitError(err)) throw new AppError('AI quota exceeded. Please try again later.', 429);
      throw new AppError('Proverb extraction failed.', 503);
    }
  },

  // ── Ingestion Pipeline Methods ──────────────────────────────────────────

  async detectLanguage(text) {
    try {
      const { system, user } = prompts.detectLanguage(text);
      const raw = await generateJSON(system, user, 256);
      return parseJSON(raw);
    } catch (err) {
      logger.warn('detectLanguage failed', { err: err.message });
      return { language: 'english', confidence: 0.5 };
    }
  },

  async classifyContent(text, language) {
    try {
      const { system, user } = prompts.classifyContent(text, language);
      const raw = await generateJSON(system, user, 256);
      return parseJSON(raw);
    } catch (err) {
      logger.warn('classifyContent failed', { err: err.message });
      return { contentType: 'other', confidence: 0.5 };
    }
  },

  async generateSummaries(text, language) {
    try {
      const { system, user } = prompts.generateSummaries(text, language);
      const raw = await generateJSON(system, user, 1024);
      return truncateStrings(parseJSON(raw), 400);
    } catch (err) {
      logger.warn('generateSummaries failed', { err: err.message });
      return { short: '', medium: '', detailed: '' };
    }
  },

  async extractEntities(text, language) {
    try {
      const { system, user } = prompts.extractEntities(text, language);
      const raw = await generateJSON(system, user, 1024);
      return parseJSON(raw);
    } catch (err) {
      logger.warn('extractEntities failed', { err: err.message });
      return {};
    }
  },

  async deepUnderstand(text, language) {
    try {
      const { system, user } = prompts.deepUnderstand(text, language);
      const raw = await generateJSON(system, user, 1024);
      return truncateStrings(parseJSON(raw), 300);
    } catch (err) {
      logger.warn('deepUnderstand failed', { err: err.message });
      return {};
    }
  },

  async generateMetadata(text, language, classification) {
    try {
      const { system, user } = prompts.generateMetadata(text, language, classification);
      const raw = await generateJSON(system, user, 512);
      return truncateStrings(parseJSON(raw), 200);
    } catch (err) {
      logger.warn('generateMetadata failed', { err: err.message });
      return {};
    }
  },

  async discoverRelationships(newItem, candidates) {
    try {
      const { system, user } = prompts.discoverRelationships(newItem, candidates);
      const raw = await generateJSON(system, user, 512);
      const parsed = parseJSON(raw);
      return parsed.relationships || [];
    } catch (err) {
      logger.warn('discoverRelationships failed', { err: err.message });
      return [];
    }
  },

  async generateEmbedding(text) {
    try {
      return await embed(text);
    } catch (err) {
      logger.warn('generateEmbedding failed', { err: err.message });
      return [];
    }
  },

  async expandSearchQuery(query) {
    try {
      const { system, user } = prompts.expandSearchQuery(query);
      const raw = await generateJSON(system, user, 512);
      return parseJSON(raw);
    } catch (err) {
      logger.warn('expandSearchQuery failed, using original', { err: err.message });
      return { expandedTerms: [query], searchIntent: query };
    }
  },

  async chat(history, message, knowledgeContext = '') {
    try {
      const systemInstruction = prompts.chatSystemPrompt(knowledgeContext);
      return await generateText(systemInstruction, message, history);
    } catch (err) {
      logger.warn('chat failed', { err: err.message });
      if (isRateLimitError(err)) return 'The AI chat is temporarily unavailable due to quota limits. Please try again shortly.';
      throw new AppError('Chat service unavailable. Please try again.', 503);
    }
  },
};

module.exports = gemmaService;
