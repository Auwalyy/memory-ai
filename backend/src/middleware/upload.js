const multer = require('multer');
const AppError = require('../utils/AppError');
const { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } = require('../config/constants');

const allAllowed = Object.values(ALLOWED_MIME_TYPES).flat();

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (allAllowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`File type ${file.mimetype} is not supported`, 400), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

module.exports = upload;
