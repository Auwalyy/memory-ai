const storyRepository = require('./story.repository');
const Story = require('./story.model');
const gemmaService = require('../../core/ai/gemma.service');
const { ANALYSIS_STATUS } = require('../../config/constants');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');

const storyService = {
  async create(data, userId) {
    // Only pick known fields to avoid passing unknown keys
    const { title, content, language, knowledgeType, community, source } = data;
    const story = await storyRepository.create({
      title,
      content,
      language,
      knowledgeType,
      ...(community && { tags: [community.toLowerCase()] }),
      contributor: userId,
      isPublished: true, // publish immediately so it appears in listings
      analysis: { status: ANALYSIS_STATUS.PENDING },
    });

    // Trigger async Gemma analysis — non-blocking, errors are logged not thrown
    setImmediate(() => {
      storyService._runAnalysis(story._id, story.content, story.language).catch((err) =>
        logger.error('Background analysis failed', { storyId: story._id, err: err.message })
      );
    });

    return story;
  },

  /**
   * Run full Gemma analysis pipeline and store results + embeddings.
   * Called asynchronously after story creation.
   */
  async _runAnalysis(storyId, content, language) {
    await storyRepository.updateById(storyId, {
      'analysis.status': ANALYSIS_STATUS.PROCESSING,
    });

    try {
      // Run analysis and embedding in parallel; embedding failure is non-fatal
      const [analysis, embedding] = await Promise.allSettled([
        gemmaService.analyzeKnowledge(content, language),
        gemmaService.generateEmbedding(content),
      ]);

      if (analysis.status === 'rejected') {
        throw analysis.reason;
      }

      const a = analysis.value;
      const updates = {
        'analysis.status': ANALYSIS_STATUS.COMPLETED,
        'analysis.summary': a.summary,
        'analysis.characters': a.characters || [],
        'analysis.moralLesson': a.moralLesson,
        'analysis.themes': a.themes || [],
        'analysis.culturalContext': a.culturalContext,
        'analysis.historicalPeriod': a.historicalPeriod,
        'analysis.geographicOrigin': a.geographicOrigin,
        'analysis.difficultTerms': a.difficultTerms || [],
        'analysis.relatedProverbs': a.relatedProverbs || [],
        'analysis.educationalValue': a.educationalValue,
        'analysis.preservationNotes': a.preservationNotes,
        'analysis.analyzedAt': new Date(),
        tags: a.tags || [],
      };

      // Only update title/language/knowledgeType if Gemma returned them
      if (a.title) updates.title = a.title;
      if (a.detectedLanguage) updates.language = a.detectedLanguage;
      if (a.knowledgeType) updates.knowledgeType = a.knowledgeType;

      // Only store embedding if generation succeeded
      if (embedding.status === 'fulfilled' && embedding.value?.length) {
        updates.embedding = embedding.value;
      }

      await Story.findByIdAndUpdate(storyId, updates, { new: true });
      logger.info('Story analysis completed', { storyId });
    } catch (err) {
      await Story.findByIdAndUpdate(storyId, {
        'analysis.status': ANALYSIS_STATUS.FAILED,
        'analysis.error': err.message,
      });
      throw err;
    }
  },

  async getById(id) {
    const story = await storyRepository.findById(id);
    if (!story) throw new AppError('Story not found', 404);
    await storyRepository.incrementViewCount(id);
    return story;
  },

  async getAll(query) {
    const { page, limit, skip } = parsePagination(query);
    const filter = {};

    if (query.language) filter.language = query.language;
    if (query.type) filter.knowledgeType = query.type;
    if (query.knowledgeType) filter.knowledgeType = query.knowledgeType;
    if (query.tag) filter.tags = query.tag;

    const { data, total } = await storyRepository.findAll({ filter, skip, limit });
    return { data, pagination: buildPaginationMeta(total, page, limit) };
  },

  async getMyStories(userId, query) {
    const { page, limit, skip } = parsePagination(query);
    const { data, total } = await storyRepository.findAll({
      filter: { contributor: userId },
      skip,
      limit,
    });
    return { data, pagination: buildPaginationMeta(total, page, limit) };
  },

  async publish(id, userId) {
    const story = await storyRepository.findById(id);
    if (!story) throw new AppError('Story not found', 404);
    if (story.contributor._id.toString() !== userId.toString()) {
      throw new AppError('Not authorized', 403);
    }
    return storyRepository.updateById(id, { isPublished: true });
  },

  async delete(id, userId, userRole) {
    const story = await storyRepository.findById(id);
    if (!story) throw new AppError('Story not found', 404);
    const isOwner = story.contributor._id.toString() === userId.toString();
    if (!isOwner && !['admin', 'moderator'].includes(userRole)) {
      throw new AppError('Not authorized', 403);
    }
    return storyRepository.deleteById(id);
  },

  async generateEducationalContent(id) {
    const story = await storyRepository.findById(id);
    if (!story) throw new AppError('Story not found', 404);
    return gemmaService.generateEducationalContent(story);
  },

  async generateChildrensVersion(id) {
    const story = await storyRepository.findById(id);
    if (!story) throw new AppError('Story not found', 404);
    return gemmaService.generateChildrensVersion(story);
  },

  async findCrossLanguageConnections(id) {
    const story = await storyRepository.findById(id);
    if (!story) throw new AppError('Story not found', 404);
    return gemmaService.findCrossLanguageConnections(story);
  },

  async translate(id, targetLanguage) {
    const story = await storyRepository.findById(id);
    if (!story) throw new AppError('Story not found', 404);
    const textToTranslate = story.content.slice(0, 1500);
    return gemmaService.translateWithContext(textToTranslate, story.language, targetLanguage);
  },

  async generatePodcastScript(id) {
    const story = await storyRepository.findById(id);
    if (!story) throw new AppError('Story not found', 404);
    return gemmaService.generatePodcastScript(story);
  },

  async getRecommendations(id) {
    const story = await storyRepository.findById(id);
    if (!story) throw new AppError('Story not found', 404);

    // Find stories with overlapping themes, same language, or same type — exclude self
    const themes = story.analysis?.themes || [];
    const candidates = await Story.find({
      _id: { $ne: story._id },
      isPublished: true,
      $or: [
        { 'analysis.themes': { $in: themes } },
        { language: story.language },
        { knowledgeType: story.knowledgeType },
      ],
    })
      .select('title language knowledgeType analysis.summary analysis.themes analysis.moralLesson')
      .limit(6)
      .lean();

    return candidates;
  },
};

module.exports = storyService;
