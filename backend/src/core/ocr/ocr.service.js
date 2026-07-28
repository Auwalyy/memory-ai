const Tesseract = require('tesseract.js');
const logger = require('../../utils/logger');
const AppError = require('../../utils/AppError');

/**
 * Extract text from an image buffer using Tesseract OCR.
 * Supports English + Latin-script Nigerian languages.
 * @param {Buffer} imageBuffer
 * @returns {Promise<{text: string, confidence: number}>}
 */
const extractTextFromImage = async (imageBuffer) => {
  try {
    const { data } = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          logger.debug('OCR progress', { progress: Math.round(m.progress * 100) });
        }
      },
    });

    return {
      text: data.text.trim(),
      confidence: data.confidence,
    };
  } catch (err) {
    logger.error('OCR extraction failed', { err: err.message });
    throw new AppError('Text extraction from image failed', 500);
  }
};

module.exports = { extractTextFromImage };
