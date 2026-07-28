const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../utils/logger');

let _client = null;
let _embeddingModel = null;

const MODEL = () => process.env.GEMMA_MODEL?.trim() || 'gemma-4-31b-it';

const getClient = () => {
  if (!_client) {
    if (!process.env.GOOGLE_GEMINI_API_KEY) throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    _client = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    logger.info('Gemma AI client initialized');
  }
  return _client;
};

const getEmbeddingModel = () => {
  if (!_embeddingModel) {
    _embeddingModel = getClient().getGenerativeModel({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-004',
    });
  }
  return _embeddingModel;
};

/**
 * Generate a JSON response.
 * Uses systemInstruction + responseMimeType:'application/json' to force
 * clean JSON output without planning preamble or repetition loops.
 */
const generateJSON = async (systemPrompt, userPrompt, maxTokens = 2048) => {
  try {
    const model = getClient().getGenerativeModel({
      model: MODEL(),
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
      },
    });
    const result = await model.generateContent(userPrompt);
    return result.response.text();
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('API_KEY') || msg.includes('401') || msg.includes('403')) {
      throw new Error('Google AI API key is invalid or missing.');
    }
    throw err;
  }
};

/**
 * Generate plain text (used for chat and translation).
 */
const generateText = async (systemInstruction, userMessage, history = []) => {
  try {
    const model = getClient().getGenerativeModel({
      model: MODEL(),
      systemInstruction,
      generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 2048 },
    });
    const session = model.startChat({ history });
    const result = await session.sendMessage(userMessage);
    return result.response.text();
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('API_KEY') || msg.includes('401') || msg.includes('403')) {
      throw new Error('Google AI API key is invalid or missing.');
    }
    throw err;
  }
};

const embed = async (text) => {
  try {
    const result = await getEmbeddingModel().embedContent(text);
    return result.embedding.values;
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('API_KEY') || msg.includes('401') || msg.includes('403')) {
      throw new Error('Google AI API key is invalid or missing.');
    }
    throw err;
  }
};

module.exports = { generateJSON, generateText, embed };
