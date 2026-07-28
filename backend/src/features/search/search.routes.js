const router = require('express').Router();
const controller = require('./search.controller');

router.get('/', controller.textSearch);
router.get('/semantic', controller.semanticSearch);

module.exports = router;
