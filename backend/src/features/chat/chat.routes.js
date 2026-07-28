const router = require('express').Router();
const controller = require('./chat.controller');
const { authenticate } = require('../../middleware/auth');
const { body, param } = require('express-validator');
const validate = require('../../middleware/validate');

const idParam = [param('id').isMongoId().withMessage('Invalid session ID')];

router.use(authenticate);
router.post('/', controller.createSession);
router.get('/', controller.getSessions);
router.get('/:id', idParam, validate, controller.getSession);
router.post('/:id/messages', idParam, [body('message').trim().notEmpty().withMessage('Message is required')], validate, controller.sendMessage);
router.delete('/:id', idParam, validate, controller.deleteSession);

module.exports = router;
