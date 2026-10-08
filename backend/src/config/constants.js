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

// NAIC MVP — voice-first knowledge contributions (KnowledgeItem)
const CONTRIBUTION_TYPES = {
  STORY: 'story',
  PROVERB: 'proverb',
  TRADITION: 'tradition',
  HISTORICAL_ACCOUNT: 'historical_account',
  TRADITIONAL_OCCUPATION: 'traditional_occupation',
  LOCAL_TERMINOLOGY: 'local_terminology',
  FOOD_KNOWLEDGE: 'food_knowledge',
  CRAFT_KNOWLEDGE: 'craft_knowledge',
  OTHER: 'other',
};

const VERIFICATION_STATUS = {
  PENDING: 'PENDING',
  AI_PROCESSED: 'AI_PROCESSED',
  HUMAN_REVIEWED: 'HUMAN_REVIEWED',
  VERIFIED: 'VERIFIED',
};

// Statuses visible in the public Knowledge Library
const PUBLISHED_STATUSES = [VERIFICATION_STATUS.HUMAN_REVIEWED, VERIFICATION_STATUS.VERIFIED];

// Languages accepted for voice contributions. Hausa is the MVP focus.
const CONTRIBUTION_LANGUAGES = ['hausa', 'english', 'yoruba', 'igbo'];

const MAX_AUDIO_SIZE = (parseInt(process.env.MAX_AUDIO_SIZE_MB) || 25) * 1024 * 1024;

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
  CONTRIBUTION_TYPES,
  VERIFICATION_STATUS,
  PUBLISHED_STATUSES,
  CONTRIBUTION_LANGUAGES,
  MAX_AUDIO_SIZE,
};
