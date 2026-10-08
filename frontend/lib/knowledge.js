// Shared constants and copy for the NAIC voice-preservation flow.
// Hausa strings should be reviewed by a native speaker before public launch.

export const CONSENT_STATEMENT =
  'Your recording will be processed by N-ATLAS to create a searchable cultural knowledge record.';

export const PRINCIPLE = 'AI should preserve Nigerian knowledge, not invent Nigerian culture.';

export const CONTRIBUTION_LANGUAGES = [
  { value: 'hausa', label: 'Hausa', native: 'Hausa', enabled: true },
  { value: 'english', label: 'English', native: 'English / Nigerian English', enabled: true },
  { value: 'yoruba', label: 'Yoruba', native: 'Yorùbá', enabled: false },
  { value: 'igbo', label: 'Igbo', native: 'Igbo', enabled: false },
];

export const CONTRIBUTION_TYPES = [
  { value: 'story', en: 'Story', ha: 'Labari' },
  { value: 'proverb', en: 'Proverb', ha: 'Karin magana' },
  { value: 'tradition', en: 'Tradition', ha: "Al'ada" },
  { value: 'historical_account', en: 'Historical account', ha: 'Tarihi' },
  { value: 'traditional_occupation', en: 'Traditional occupation', ha: "Sana'ar gargajiya" },
  { value: 'local_terminology', en: 'Local terminology', ha: 'Kalmomin gargajiya' },
  { value: 'food_knowledge', en: 'Food knowledge', ha: 'Ilimin abinci' },
  { value: 'craft_knowledge', en: 'Craft knowledge', ha: "Ilimin sana'ar hannu" },
  { value: 'other', en: 'Other', ha: 'Wani abu' },
];

export const typeLabel = (value, lang = 'english') => {
  const t = CONTRIBUTION_TYPES.find((x) => x.value === value);
  if (!t) return value?.replace(/_/g, ' ') || '';
  return lang === 'hausa' ? t.ha : t.en;
};

export const languageLabel = (value) =>
  CONTRIBUTION_LANGUAGES.find((l) => l.value === value)?.label || value;

export const STATUS_META = {
  PENDING: {
    label: 'Pending',
    className: 'bg-muted text-muted-foreground border-border',
    description: 'Received, waiting for N-ATLAS processing.',
  },
  AI_PROCESSED: {
    label: 'AI processed',
    className: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    description: 'Structured by N-ATLAS. Not yet checked by a person.',
  },
  HUMAN_REVIEWED: {
    label: 'Human reviewed',
    className: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
    description: 'The contributor confirmed how accurately N-ATLAS captured it.',
  },
  VERIFIED: {
    label: 'Verified',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    description: 'Checked and verified by a MemoryAI moderator.',
  },
};

export const FIDELITY_SCALE = [
  { score: 1, en: 'Completely incorrect', ha: 'Ba daidai ba ko kaɗan' },
  { score: 2, en: 'Major errors', ha: 'Akwai manyan kurakurai' },
  { score: 3, en: 'Mostly correct', ha: 'Galibi daidai ne' },
  { score: 4, en: 'Very accurate', ha: 'Daidai sosai' },
  { score: 5, en: 'Completely accurate', ha: 'Daidai ne gaba ɗaya' },
];

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River',
  'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
  'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

const STRINGS = {
  english: {
    whatToPreserve: 'What would you like to preserve?',
    chooseLanguage: 'Which language will you speak?',
    where: 'Where does this knowledge come from?',
    town: 'Town or city',
    state: 'State',
    community: 'Community / ward (optional)',
    anonymous: 'Contribute anonymously',
    anonymousHint: 'Your name will not be shown with this record.',
    consentTitle: 'Consent',
    consentAgree: 'I agree and want to contribute this knowledge.',
    record: 'Start recording',
    recording: 'Recording…',
    stop: 'Stop',
    reRecord: 'Record again',
    uploadFile: 'or upload an audio file',
    typeInstead: 'Cannot record? Type it instead',
    useVoice: 'Use voice instead',
    typePlaceholder: 'Write the story, proverb or knowledge in your own words…',
    submit: 'Submit for N-ATLAS processing',
    submitting: 'Uploading…',
    accurateQuestion: 'Does this accurately represent what you said?',
    correction: 'What should be corrected? (optional)',
    feedback: 'Any other feedback? (optional)',
    saveReview: 'Save review',
    micDenied: 'Microphone access was blocked. Allow it in your browser, or upload a file.',
    speakNow: 'Speak naturally. Take your time.',
  },
  hausa: {
    whatToPreserve: 'Me kuke so ku adana?',
    chooseLanguage: 'Da wane harshe za ku yi magana?',
    where: 'Daga ina wannan ilimi ya fito?',
    town: 'Gari ko birni',
    state: 'Jiha',
    community: 'Unguwa (ba dole ba)',
    anonymous: 'Ba da gudummawa ba tare da suna ba',
    anonymousHint: 'Ba za a nuna sunanku tare da wannan bayani ba.',
    consentTitle: 'Izini',
    consentAgree: 'Na yarda, ina so in ba da wannan ilimi.',
    record: 'Fara rikodi',
    recording: 'Ana rikodi…',
    stop: 'Tsaya',
    reRecord: 'Sake rikodi',
    uploadFile: 'ko ɗora fayil na murya',
    typeInstead: 'Ba za ku iya rikodi ba? Ku rubuta',
    useVoice: 'Yi amfani da murya',
    typePlaceholder: 'Rubuta labarin, karin maganar ko ilimin da kalmominku…',
    submit: 'Aika don N-ATLAS ya sarrafa',
    submitting: 'Ana aikawa…',
    accurateQuestion: 'Shin wannan ya yi daidai da abin da kuka faɗa?',
    correction: 'Me ya kamata a gyara? (ba dole ba)',
    feedback: 'Wani ra’ayi? (ba dole ba)',
    saveReview: 'Ajiye',
    micDenied: 'An hana amfani da makirufo. Ku ba da izini a burauza, ko ku ɗora fayil.',
    speakNow: 'Ku yi magana kamar yadda kuka saba. Ba gaggawa.',
  },
};

/** Contribution-flow copy in the contributor's language (Hausa or English). */
export const flowStrings = (lang) => STRINGS[lang] || STRINGS.english;

export const formatDuration = (sec) => {
  if (sec == null || Number.isNaN(sec)) return '';
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const formatMs = (ms) => {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
};

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const apiErrorMessage = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message || err?.message || fallback;

export const newSessionId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
