const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('./cloudinary.service');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');

/**
 * Stores original contribution recordings. Uses Cloudinary when configured,
 * otherwise the local disk (served by app.js at /media/audio).
 */

const LOCAL_AUDIO_DIR = path.resolve(process.env.LOCAL_MEDIA_DIR || path.join(__dirname, '../../../uploads'), 'audio');

const EXTENSIONS = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/flac': 'flac',
};

/** "audio/webm;codecs=opus" → "audio/webm" */
const baseMimeType = (mimeType = '') => mimeType.split(';')[0].trim().toLowerCase();

const extensionFor = (mimeType) => EXTENSIONS[baseMimeType(mimeType)] || 'bin';

/**
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {string} publicBaseUrl  e.g. "https://api.example.com" — used for local files
 */
const saveAudio = async (buffer, mimeType, publicBaseUrl) => {
  if (cloudinary.isConfigured()) {
    const result = await cloudinary.uploadBuffer(buffer, { folder: 'contributions', resourceType: 'video' });
    return { url: result.url, storage: 'cloudinary', publicId: result.publicId, bytes: result.bytes };
  }

  await fs.mkdir(LOCAL_AUDIO_DIR, { recursive: true });
  const fileName = `${crypto.randomUUID()}.${extensionFor(mimeType)}`;
  const localPath = path.join(LOCAL_AUDIO_DIR, fileName);
  await fs.writeFile(localPath, buffer);
  return {
    url: `${publicBaseUrl.replace(/\/$/, '')}/media/audio/${fileName}`,
    storage: 'local',
    localPath,
    bytes: buffer.length,
  };
};

/**
 * Load the original recording back into memory for N-ATLAS ASR.
 * @param {{ storage: string, url: string, localPath?: string }} audio
 */
const readAudio = async (audio) => {
  if (audio.storage === 'local') {
    if (!audio.localPath) throw new AppError('Recording file path missing', 500);
    return fs.readFile(audio.localPath);
  }
  const res = await fetch(audio.url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new AppError(`Could not download recording (HTTP ${res.status})`, 502);
  return Buffer.from(await res.arrayBuffer());
};

const deleteAudio = async (audio) => {
  if (!audio) return;
  try {
    if (audio.storage === 'local' && audio.localPath) await fs.unlink(audio.localPath);
    if (audio.storage === 'cloudinary' && audio.publicId) await cloudinary.deleteFile(audio.publicId, 'video');
  } catch (err) {
    logger.warn('Failed to delete recording', { err: err.message });
  }
};

module.exports = { saveAudio, readAudio, deleteAudio, baseMimeType, LOCAL_AUDIO_DIR };
