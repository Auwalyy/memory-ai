require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const client = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

async function test() {
  // Test prefill: start model turn with { to force JSON continuation
  const model = client.getGenerativeModel({
    model: process.env.GEMMA_MODEL,
    generationConfig: { temperature: 0 },
  });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: 'Generate a podcast script JSON for a Yoruba folktale about a tortoise. Include fields: episodeTitle, duration, intro, outro' }],
      },
      {
        role: 'model',
        parts: [{ text: '{' }],
      },
    ],
  });

  const raw = result.response.text();
  console.log('RAW:\n', raw.slice(0, 400));

  try {
    const parsed = JSON.parse('{' + raw);
    console.log('\nPARSED KEYS:', Object.keys(parsed));
  } catch (e) {
    console.log('\nPARSE FAILED:', e.message);
  }
}

test().catch(e => console.error('ERROR:', e.message));
