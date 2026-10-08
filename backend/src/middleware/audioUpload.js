const multer = require('multer');
const AppError = require('../utils/AppError');
const { MAX_AUDIO_SIZE } = require('../config/constants');

/**
 * Multer for voice contributions. Browsers report recordings with codec
 * suffixes ("audio/webm;codecs=opus"), so accept any audio/* type.
 */
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (/^audio\//i.test(file.mimetype)) cb(null, true);
    else cb(new AppError(`Expected an audio recording, received ${file.mimetype}`, 400), false);
  },
});

module.exports = audioUpload;
