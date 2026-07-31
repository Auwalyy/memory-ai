const Chat = require('./chat.model');
const Story = require('../stories/story.model');
const Upload = require('../uploads/upload.model');
const gemmaService = require('../../core/ai/gemma.service');
const AppError = require('../../utils/AppError');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');

// Remove reasoning/planning preamble that some model versions emit
const REASONING_OPEN = /<think[^>]*>/i;
const REASONING_CLOSE = /<\/think>/i;
const META_LINE = /^\s*(user (query|asks?|request|language)|my persona|goal:|persona:|drafting:|answer:|disclaimer:|context:|planning:|thought:|reasoning:|note:|internal:|ok[,.]|alright[,.]|sure[,.]|let me|i will|i need|i should|i'll|here is|here's|certainly|of course|great[,!]|absolutely)/i;

function stripReasoning(text) {
  if (!text) return text;
  // Remove <think>...</think> blocks
  let s = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '').trimStart();
  // Drop leading meta lines
  const lines = s.split('\n');
  let start = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) { start = i + 1; continue; }
    if (META_LINE.test(lines[i])) { start = i + 1; continue; }
    break;
  }
  return lines.slice(start).join('\n').trimStart() || s.trimStart();
}

/**
 * Fetch relevant knowledge snippets from both Stories and Uploads to ground Gemma.
 */
const buildKnowledgeContext = async (message) => {
  try {
    const [stories, uploads] = await Promise.all([
      Story.find(
        { $text: { $search: message } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(3)
        .select('title analysis.summary language knowledgeType'),

      Upload.find(
        { analysisStatus: 'completed', extractedText: { $exists: true, $ne: '' } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ createdAt: -1 })
        .limit(3)
        .select('originalName ingestion.summaries ingestion.aiUnderstanding ingestion.detectedLanguage ingestion.metadata extractedText'),
    ]);

    const parts = [];

    if (stories.length) {
      parts.push(
        stories.map((s) =>
          `[${s.knowledgeType} | ${s.language}] ${s.title}: ${s.analysis?.summary || ''}`
        ).join('\n')
      );
    }

    // Score uploads by keyword relevance in extracted text
    const msgLower = message.toLowerCase();
    const relevantUploads = uploads.filter((u) => {
      const text = [
        u.ingestion?.metadata?.title,
        u.ingestion?.summaries?.short,
        u.ingestion?.aiUnderstanding?.mainTheme,
        (u.ingestion?.aiUnderstanding?.subThemes || []).join(' '),
        u.extractedText?.slice(0, 500),
      ].filter(Boolean).join(' ').toLowerCase();
      return msgLower.split(' ').some((word) => word.length > 3 && text.includes(word));
    });

    if (relevantUploads.length) {
      parts.push(
        relevantUploads.map((u) => {
          const title = u.ingestion?.metadata?.title || u.originalName;
          const summary = u.ingestion?.summaries?.medium || u.ingestion?.summaries?.short || '';
          const moral = (u.ingestion?.aiUnderstanding?.moralLessons || []).join('; ');
          const lang = u.ingestion?.detectedLanguage || '';
          return `[uploaded document | ${lang}] ${title}: ${summary}${moral ? ` | Moral: ${moral}` : ''}`;
        }).join('\n')
      );
    }

    if (!parts.length) return 'No specific knowledge found. Answer from general Nigerian cultural knowledge.';
    return parts.join('\n\n');
  } catch {
    return 'Answer from general Nigerian cultural knowledge.';
  }
};

const chatService = {
  async createSession(userId) {
    return Chat.create({ user: userId });
  },

  async sendMessage(sessionId, userId, message, preferredLanguage = 'hausa', uploadId = null) {
    const session = await Chat.findOne({ _id: sessionId, user: userId });
    if (!session) throw new AppError('Chat session not found', 404);

    const history = session.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const knowledgeContext = await buildKnowledgeContext(message);

    // Resolve upload context server-side — any user can reference any upload by ID
    let docContext = '';
    if (uploadId) {
      const upload = await Upload.findById(uploadId).select(
        'originalName extractedText ingestion.summaries ingestion.aiUnderstanding ingestion.detectedLanguage ingestion.metadata'
      );
      if (upload) {
        const title = upload.ingestion?.metadata?.title || upload.originalName;
        const lang = upload.ingestion?.detectedLanguage || '';
        const summary = upload.ingestion?.summaries?.medium || upload.ingestion?.summaries?.short || '';
        const moral = (upload.ingestion?.aiUnderstanding?.moralLessons || []).join('; ');
        docContext = `\n\nFOCUS DOCUMENT — the user is asking about this specific uploaded document:\nTitle: ${title}\nLanguage: ${lang}\nContent Summary: ${summary}\nMoral Lessons: ${moral}\nFull Text:\n${upload.extractedText || ''}\n`;
      }
    }

    const langNote = `\n\nLANGUAGE RULE: Respond entirely in ${preferredLanguage}. Do not switch languages unless the user asks.`;
    let response = await gemmaService.chat(history, message, knowledgeContext + docContext + langNote);

    // Strip any reasoning/planning preamble the model may emit
    response = stripReasoning(response);

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
