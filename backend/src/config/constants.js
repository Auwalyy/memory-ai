const LANGUAGES = {
  HAUSA: 'hausa',
  YORUBA: 'yoruba',
  IGBO: 'igbo',
  ENGLISH: 'english',
  PIDGIN: 'pidgin',
};

const ROLES = {
  USER: 'user',
  CONTRIBUTOR: 'contributor',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
};

const KNOWLEDGE_TYPES = {
  FOLKTALE: 'folktale',
  PROVERB: 'proverb',
  ORAL_HISTORY: 'oral_history',
  TRADITION: 'tradition',
  CEREMONY: 'ceremony',
  MEDICINE: 'medicine',
  SONG: 'song',
  POEM: 'poem',
  HISTORICAL_EVENT: 'historical_event',
  COMMUNITY_HISTORY: 'community_history',
  OTHER: 'other',
};

const UPLOAD_TYPES = {
  TEXT: 'text',
  DOCUMENT: 'document',
  IMAGE: 'image',
  AUDIO: 'audio',
};

const ANALYSIS_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024;

const ALLOWED_MIME_TYPES = {
  document: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'],
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'],
};

module.exports = {
  LANGUAGES,
  ROLES,
  KNOWLEDGE_TYPES,
  UPLOAD_TYPES,
  ANALYSIS_STATUS,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
};
