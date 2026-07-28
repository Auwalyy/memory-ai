const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../utils/logger');

let _embeddingModel = null;
let _embeddingDisabled = false; // circuit breaker — disabled after first 404

function getEmbeddingModel() {
  if (_embeddingDisabled) return null;
  if (!_embeddingModel) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY is not set');
    const client = new GoogleGenerativeAI(apiKey);
    _embeddingModel = client.getGenerativeModel(
      { model: process.env.EMBEDDING_MODEL || 'text-embedding-004' },
      { apiVersion: 'v1beta' }
    );
  }
  return _embeddingModel;
}

/**
 * Generate embedding vector for a single text
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function embedText(text) {
  if (_embeddingDisabled) return [];
  try {
    const model = getEmbeddingModel();
    if (!model) return [];
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (err) {
    if (err.message?.includes('404') || err.message?.includes('not found')) {
      _embeddingDisabled = true;
      _embeddingModel = null;
      logger.warn('Embedding model unavailable — embeddings disabled for this session');
    } else {
      logger.error('Embedding error', { err: err.message });
    }
    return [];
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
async function embedBatch(texts) {
  if (_embeddingDisabled) return texts.map(() => []);
  try {
    const model = getEmbeddingModel();
    if (!model) return texts.map(() => []);
    const requests = texts.map((text) => ({ content: { parts: [{ text }] } }));
    const result = await model.batchEmbedContents({ requests });
    return result.embeddings.map((e) => e.values);
  } catch (err) {
    if (err.message?.includes('404') || err.message?.includes('not found')) {
      _embeddingDisabled = true;
      _embeddingModel = null;
      logger.warn('Embedding model unavailable — embeddings disabled for this session');
      return texts.map(() => []);
    }
    logger.error('Batch embedding error', { err: err.message });
    return texts.map(() => []);
  }
}

/**
 * Compute cosine similarity between two vectors
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} similarity score 0-1
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

module.exports = { embedText, embedBatch, cosineSimilarity };
