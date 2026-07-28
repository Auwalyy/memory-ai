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

async function run() {
  const { system, user } = prompts.generateEducationalContent(story);
  const raw = await generateJSON(system, user, 2048);
  console.log('RAW LENGTH:', raw.length);
  console.log('RAW:\n', raw);
}

run().catch(e => console.error('ERROR:', e.message));
