require('dotenv').config();
const { generateJSON } = require('./src/core/ai/gemma.client');
const prompts = require('./src/core/ai/gemma.prompts');

const story = {
  title: 'The Clever Hare',
  content: 'A hare outsmarted a lion by showing him his reflection in a well.',
  language: 'hausa',
  analysis: { culturalContext: 'Hausa trickster tradition', themes: ['cleverness'], moralLesson: 'Intelligence beats brute force' },
  knowledgeType: 'folktale',
};

const removeRepetitionLoop = (text) => {
  const charLoop = text.match(/([^\s])(\1{4,})/);
  if (charLoop) return text.slice(0, charLoop.index).trimEnd();
  const wordLoop = text.match(/(\w+)(\s+\1){2,}/);
  if (wordLoop) return text.slice(0, wordLoop.index).trimEnd();
  return text;
};

async function run() {
  console.log('=== CROSS LANGUAGE ===');
  const { system: cs, user: cu } = prompts.findCrossLanguageConnections(story);
  const crossRaw = await generateJSON(cs, cu, 1500);
  const crossCleaned = removeRepetitionLoop(crossRaw);
  console.log('CLEANED:\n', crossCleaned.slice(0, 800));

  console.log('\n=== PODCAST ===');
  const { system: ps, user: pu } = prompts.generatePodcastScript(story);
  const podRaw = await generateJSON(ps, pu, 2048);
  const podCleaned = removeRepetitionLoop(podRaw);
  console.log('CLEANED:\n', podCleaned.slice(0, 800));
}

run().catch(e => console.error('ERROR:', e.message));
