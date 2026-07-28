const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const AppError = require('../../utils/AppError');

/**
 * Extract plain text from a document buffer based on MIME type.
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @returns {Promise<string>}
 */
const extractTextFromDocument = async (buffer, mimeType) => {
  if (mimeType === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text.trim();
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    // Handle UTF-16 files (e.g. created by Windows Notepad/cmd) by stripping null bytes
    const text = buffer.toString('utf-8').replace(/\u0000/g, '').trim();
    return text;
  }

  throw new AppError(`Unsupported document type: ${mimeType}`, 400);
};

module.exports = { extractTextFromDocument };
