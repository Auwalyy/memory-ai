const { CONTRIBUTION_TYPES } = require('../../config/constants');

const LANGUAGE_NAMES = {
  hausa: 'Hausa',
  yoruba: 'Yoruba',
  igbo: 'Igbo',
  english: 'Nigerian English',
};

const languageName = (code) => LANGUAGE_NAMES[code] || code;

const SYSTEM_PROMPT = `You are the MemoryAI Nigerian Indigenous Knowledge Processing Assistant powered by N-ATLAS.

Your responsibility is to preserve and structure knowledge provided by Nigerian contributors.

You must distinguish between:
1. Information explicitly present in the source.
2. Reasonable linguistic interpretation.
3. Information that is unknown.

Never invent cultural practices, historical facts, people, places or traditions.
When information is missing, return null or an empty array.
Preserve the original meaning of Hausa, Yoruba, Igbo and Nigerian English contributions.
When translating, preserve cultural terms where an exact English equivalent does not exist.
Always prioritize source fidelity over creativity.
Return valid structured JSON when requested.`;

const translate = (transcript, language) => ({
  system: SYSTEM_PROMPT,
  user: `Translate the following ${languageName(language)} contribution into clear English.

Rules:
- Translate only what is said. Do not add explanations, context or facts.
- Keep culturally specific ${languageName(language)} terms in the original language and add the closest English meaning in brackets the first time, e.g. "kayan lefe [bride's gifts]".
- Keep names of people and places exactly as spoken.
- Output only the English translation, with no preface or notes.

${languageName(language)} contribution:
"""
${transcript}
"""`,
});

const structure = ({ transcript, translation, language, knowledgeType }) => ({
  system: SYSTEM_PROMPT,
  user: `A community member contributed the following ${languageName(language)} knowledge. The contributor labelled it as: ${knowledgeType}.

Original transcript (${languageName(language)}):
"""
${transcript}
"""

English translation:
"""
${translation}
"""

Extract structured knowledge using ONLY what the source says. Return one JSON object with exactly these keys:
{
  "title": "short English title describing the content (max 12 words)",
  "summary": "2-3 English sentences summarising only what the contributor said",
  "topics": ["broad topics explicitly discussed, e.g. marriage, farming"],
  "entities": [{ "name": "as spoken", "type": "person | place | group | object | event | practice" }],
  "people": ["named people mentioned in the source"],
  "places": ["named places mentioned in the source"],
  "culturalConcepts": [{ "term": "term in ${languageName(language)} as spoken", "meaning": "English meaning based on the source" }],
  "proverbs": [{ "text": "the proverb exactly as spoken in ${languageName(language)}", "translation": "English translation", "meaning": "meaning if the contributor explains it, else null" }],
  "keywords": ["5-10 search keywords, English and ${languageName(language)}"],
  "knowledgeType": "one of: ${Object.values(CONTRIBUTION_TYPES).join(', ')}",
  "confidenceNotes": ["anything unclear, possibly mis-transcribed, or not stated by the contributor"]
}

If a field has no support in the source, use [] or null. Do not add people, places, dates, practices or proverbs that are not in the transcript. Return only the JSON object.`,
});

const summarize = (text, language) => ({
  system: SYSTEM_PROMPT,
  user: `Summarise this ${languageName(language)} community contribution in 2-3 English sentences. Use only information present in the text. Output only the summary.

"""
${text}
"""`,
});

/**
 * @param {string} question
 * @param {{ index: number, title: string, language: string, location?: string, text: string }[]} sources
 * @param {string} answerLanguage
 */
const answerFromSources = (question, sources, answerLanguage = 'english') => ({
  system: SYSTEM_PROMPT,
  user: `Answer the question using ONLY the community contributions below. Each contribution is numbered.

Rules:
- Use only facts stated in the contributions. Do not use outside knowledge.
- Cite the contribution number in square brackets after each statement, e.g. [1] or [1][3].
- If the contributions do not answer the question, say clearly that the archive does not yet contain that knowledge.
- Attribute knowledge to the community, e.g. "A contributor from Kano describes...".
- Write the answer in ${languageName(answerLanguage)}. Keep it under 180 words.

Question: ${question}

Community contributions:
${sources
  .map(
    (s) => `[${s.index}] "${s.title}" — ${languageName(s.language)}${s.location ? `, ${s.location}` : ''}
${s.text}`
  )
  .join('\n\n')}`,
});

module.exports = { SYSTEM_PROMPT, translate, structure, summarize, answerFromSources, languageName };
