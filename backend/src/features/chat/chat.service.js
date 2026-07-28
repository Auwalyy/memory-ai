const Chat = require('./chat.model');
const Story = require('../stories/story.model');
const gemmaService = require('../../core/ai/gemma.service');
const AppError = require('../../utils/AppError');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');

/**
 * Fetch relevant knowledge snippets to ground Gemma's responses.
 */
const buildKnowledgeContext = async (message) => {
  try {
    const stories = await Story.find(
      { $text: { $search: message } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(3)
      .select('title analysis.summary language knowledgeType');

    if (!stories.length) return 'No specific knowledge found. Answer from general Nigerian cultural knowledge.';

    return stories
      .map((s) => `[${s.knowledgeType} | ${s.language}] ${s.title}: ${s.analysis?.summary || ''}`)
      .join('\n\n');
  } catch {
    return 'Answer from general Nigerian cultural knowledge.';
  }
};

const chatService = {
  async createSession(userId) {
    return Chat.create({ user: userId });
  },

  async sendMessage(sessionId, userId, message, preferredLanguage = 'english') {
    const session = await Chat.findOne({ _id: sessionId, user: userId });
    if (!session) throw new AppError('Chat session not found', 404);

    // Build Gemma-format history from stored messages
    const history = session.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const knowledgeContext = await buildKnowledgeContext(message);
    const langNote = preferredLanguage !== 'english'
      ? `\n\nIMPORTANT: Respond in ${preferredLanguage} when appropriate.`
      : '';
    const response = await gemmaService.chat(history, message, knowledgeContext + langNote);

    // Auto-title from first message
    if (session.messages.length === 0) {
      session.title = message.slice(0, 60) + (message.length > 60 ? '...' : '');
    }

    session.messages.push({ role: 'user', content: message });
    session.messages.push({ role: 'assistant', content: response });
    session.messageCount = session.messages.length;
    await session.save();

    return { response, sessionId: session._id };
  },

  async getSessions(userId, query) {
    const { page, limit, skip } = parsePagination(query);
    const [data, total] = await Promise.all([
      Chat.find({ user: userId }).sort({ updatedAt: -1 }).skip(skip).limit(limit).select('-messages'),
      Chat.countDocuments({ user: userId }),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, limit) };
  },

  async getSession(sessionId, userId) {
    const session = await Chat.findOne({ _id: sessionId, user: userId });
    if (!session) throw new AppError('Chat session not found', 404);
    return session;
  },

  async deleteSession(sessionId, userId) {
    const session = await Chat.findOneAndDelete({ _id: sessionId, user: userId });
    if (!session) throw new AppError('Chat session not found', 404);
  },
};

module.exports = chatService;
