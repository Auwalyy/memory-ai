const router = require('express').Router();
const controller = require('./auth.controller');
const { registerValidator, loginValidator } = require('./auth.validators');
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');

router.post('/register', registerValidator, validate, controller.register);
router.post('/login', loginValidator, validate, controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.getMe);
router.patch('/me', authenticate, controller.updateProfile);

module.exports = router;
