const Proverb = require('./proverb.model');
const gemmaService = require('../../core/ai/gemma.service');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');
const AppError = require('../../utils/AppError');

const proverbService = {
  async create(data, userId) {
    const proverb = await Proverb.create({ ...data, contributor: userId });
    // Generate embedding asynchronously — non-blocking
    setImmediate(async () => {
      try {
        const embedding = await gemmaService.generateEmbedding(
          `${data.original} ${data.englishTranslation} ${data.meaning}`
        );
        await Proverb.findByIdAndUpdate(proverb._id, { embedding });
      } catch (err) {
        // Embedding failure is non-fatal — proverb is still saved
      }
    });
    return proverb;
  },

  async getAll(query) {
    const { page, limit, skip } = parsePagination(query);
    const filter = {};
    if (query.language) filter.language = query.language;

    const [data, total] = await Promise.all([
      Proverb.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-embedding'),
      Proverb.countDocuments(filter),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, limit) };
  },

  async extractFromText(text, language) {
    const result = await gemmaService.extractProverbs(text, language);
    return result.proverbs || [];
  },

  async getById(id) {
    const proverb = await Proverb.findById(id);
    if (!proverb) throw new AppError('Proverb not found', 404);
    return proverb;
  },
};

module.exports = proverbService;
