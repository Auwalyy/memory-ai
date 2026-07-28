const Story = require('./story.model');

const storyRepository = {
  async create(data) {
    return Story.create(data);
  },

  async findById(id) {
    return Story.findById(id).populate('contributor', 'name avatar role');
  },

  async findAll({ filter = {}, skip = 0, limit = 20, sort = { createdAt: -1 } }) {
    const [data, total] = await Promise.all([
      Story.find(filter)
        .populate('contributor', 'name avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-embedding'),
      Story.countDocuments(filter),
    ]);
    return { data, total };
  },

  async updateById(id, updates) {
    return Story.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  },

  async deleteById(id) {
    return Story.findByIdAndDelete(id);
  },

  async incrementViewCount(id) {
    return Story.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
  },

  async findWithEmbedding(id) {
    return Story.findById(id).select('+embedding');
  },

  async findAllWithEmbeddings(filter = {}) {
    return Story.find({ ...filter, embedding: { $exists: true, $ne: [] } })
      .select('_id title embedding language knowledgeType')
      .lean();
  },
};

module.exports = storyRepository;
