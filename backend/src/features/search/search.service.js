const Story = require('../stories/story.model');
const Proverb = require('../proverbs/proverb.model');
const gemmaService = require('../../core/ai/gemma.service');
const storyRepository = require('../stories/story.repository');
const { cosineSimilarity } = require('../../core/embeddings/embedding.service');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');

const searchService = {
  /**
   * Full-text search across stories and proverbs.
   */
  async textSearch(query, options = {}) {
    const { page, limit, skip } = parsePagination(options);
    const filter = { $text: { $search: query } };
    if (options.language) filter.language = options.language;
    if (options.type) filter.knowledgeType = options.type;

    const [stories, proverbs, total] = await Promise.all([
      Story.find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .select('-embedding')
        .populate('contributor', 'name'),
      Proverb.find({ $text: { $search: query } }, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(5)
        .select('-embedding'),
      Story.countDocuments(filter),
    ]);

    return {
      stories,
      proverbs,
      pagination: buildPaginationMeta(total, page, limit),
    };
  },

  /**
   * Semantic search using embedding cosine similarity.
   */
  async semanticSearch(query, options = {}) {
    const queryEmbedding = await gemmaService.generateEmbedding(query);
    const candidates = await storyRepository.findAllWithEmbeddings({});

    const scored = candidates
      .map((story) => ({
        ...story,
        score: cosineSimilarity(queryEmbedding, story.embedding),
      }))
      .filter((s) => s.score > 0.6)
      .sort((a, b) => b.score - a.score)
      .slice(0, parseInt(options.limit) || 10);

    // Fetch full documents for top results
    const ids = scored.map((s) => s._id);
    const stories = await Story.find({ _id: { $in: ids } })
      .populate('contributor', 'name')
      .select('-embedding');

    // Re-sort by score
    const scoreMap = Object.fromEntries(scored.map((s) => [s._id.toString(), s.score]));
    stories.sort((a, b) => (scoreMap[b._id.toString()] || 0) - (scoreMap[a._id.toString()] || 0));

    return stories;
  },
};

module.exports = searchService;
