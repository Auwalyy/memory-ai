const KnowledgeItem = require('./models/knowledge-item.model');
const KnowledgeEmbedding = require('./models/knowledge-embedding.model');
const NAtlasService = require('../../core/natlas/natlas.service');
const { embedText, cosineSimilarity } = require('../../core/embeddings/embedding.service');
const { PUBLISHED_STATUSES } = require('../../config/constants');
const { escapeRegex, locationLabel } = require('./knowledge.service')._internal;
const logger = require('../../utils/logger');

const SEMANTIC_THRESHOLD = 0.55;
const MAX_ANSWER_SOURCES = 5;

const publishedFilter = (language) => ({
  verificationStatus: { $in: PUBLISHED_STATUSES },
  isWithdrawn: false,
  ...(language && { language }),
});

const queryTokens = (q) =>
  q.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter((t) => t.length > 3);

/** Pick the sentence that best matches the query, for a result snippet. */
const bestSnippet = (text = '', q) => {
  const words = queryTokens(q);
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (!sentences.length) return '';
  let best = sentences[0];
  let bestHits = -1;
  for (const s of sentences) {
    const lower = s.toLowerCase();
    const hits = words.filter((w) => lower.includes(w)).length;
    if (hits > bestHits) { best = s; bestHits = hits; }
  }
  return best.slice(0, 280);
};

const knowledgeSearchService = {
  /**
   * Retrieval-first search over verified community knowledge.
   * N-ATLAS is only asked to summarise sources that were actually retrieved.
   */
  async search({ q, language, answer = true, answerLanguage = 'english', limit = 8 }) {
    const base = publishedFilter(language);
    const scores = new Map(); // id → { semantic, text, matchedBy:Set }
    const bump = (id, key, value) => {
      const k = String(id);
      const entry = scores.get(k) || { semantic: 0, text: 0, matchedBy: new Set() };
      entry[key] = Math.max(entry[key], value);
      entry.matchedBy.add(key === 'semantic' ? 'semantic' : 'keyword');
      scores.set(k, entry);
    };

    // 1. Keyword retrieval (MongoDB text index)
    const textHits = await KnowledgeItem.find({ ...base, $text: { $search: q } }, { _id: 1, score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(30)
      .lean();
    const maxText = Math.max(...textHits.map((h) => h.score), 1);
    textHits.forEach((h) => bump(h._id, 'text', h.score / maxText));

    // 2. Semantic retrieval (embeddings), when the embedding model is available
    let semanticUsed = false;
    const queryVector = await embedText(q);
    if (queryVector?.length) {
      const publishedIds = await KnowledgeItem.find(base).distinct('_id');
      const vectors = await KnowledgeEmbedding.find({ knowledgeItem: { $in: publishedIds } }).select('knowledgeItem vector').lean();
      semanticUsed = vectors.length > 0;
      for (const v of vectors) {
        const sim = cosineSimilarity(queryVector, v.vector);
        if (sim >= SEMANTIC_THRESHOLD) bump(v.knowledgeItem, 'semantic', sim);
      }
    }

    // 3. Fallback: partial-word match on curated fields
    if (scores.size === 0) {
      const words = queryTokens(q).slice(0, 6);
      if (words.length) {
        const rx = words.map((w) => new RegExp(escapeRegex(w), 'i'));
        const hits = await KnowledgeItem.find({
          ...base,
          $or: [{ title: { $in: rx } }, { topics: { $in: rx } }, { keywords: { $in: rx } }, { places: { $in: rx } }, { summary: { $in: rx } }],
        }).limit(20).select('_id').lean();
        hits.forEach((h) => bump(h._id, 'text', 0.4));
      }
    }

    const ranked = [...scores.entries()]
      .map(([id, s]) => ({ id, score: semanticUsed ? 0.65 * s.semantic + 0.35 * s.text : s.text, matchedBy: [...s.matchedBy] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(parseInt(limit) || 8, 20));

    const docs = await KnowledgeItem.find({ _id: { $in: ranked.map((r) => r.id) } }).populate('contributor', 'name').lean();
    const byId = new Map(docs.map((d) => [String(d._id), d]));

    const sources = ranked
      .filter((r) => byId.has(r.id))
      .map((r, i) => {
        const d = byId.get(r.id);
        return {
          index: i + 1,
          _id: d._id,
          title: d.title,
          language: d.language,
          knowledgeType: d.knowledgeType,
          location: d.location?.label || locationLabel(d.location),
          summary: d.summary,
          snippet: bestSnippet(d.translation || d.originalTranscript, q),
          verificationStatus: d.verificationStatus,
          fidelityScore: d.fidelityScore,
          contributorName: d.isAnonymous ? 'Anonymous contributor' : d.contributor?.name || 'Community member',
          hasAudio: Boolean(d.audioUrl),
          score: Math.round(r.score * 1000) / 1000,
          matchedBy: r.matchedBy,
          _context: [d.summary, (d.translation || d.originalTranscript || '').slice(0, 1200)].filter(Boolean).join('\n'),
        };
      });

    // 4. Optional N-ATLAS summary — only over retrieved sources
    let generated = null;
    let answerError = null;
    const answerSources = sources.slice(0, MAX_ANSWER_SOURCES);
    if (answer && answerSources.length) {
      try {
        generated = await NAtlasService.answerFromRetrievedKnowledge(
          q,
          answerSources.map((s) => ({ index: s.index, title: s.title, language: s.language, location: s.location, text: s._context })),
          answerLanguage
        );
      } catch (err) {
        logger.warn('N-ATLAS answer generation failed', { err: err.message });
        answerError = 'N-ATLAS summarisation is unavailable right now — showing the matching community sources.';
      }
    }

    return {
      query: q,
      answer: generated?.answer || null,
      answerMeta: generated?.meta || null,
      answerError,
      basedOn: generated?.answer ? answerSources.length : 0,
      totalMatches: sources.length,
      retrieval: { keyword: true, semantic: semanticUsed },
      sources: sources.map(({ _context, ...s }) => s),
    };
  },
};

module.exports = knowledgeSearchService;
