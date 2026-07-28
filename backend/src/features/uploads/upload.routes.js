const router = require('express').Router();
const controller = require('./upload.controller');
const { authenticate } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

router.use(authenticate);
router.post('/', upload.single('file'), controller.upload);
router.get('/', controller.getUploads);
router.post('/:id/analyze', controller.analyzeUpload);

module.exports = router;
