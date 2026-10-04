const express = require('express');
const { register, login, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { registerRules, loginRules } = require('../middleware/validationMiddleware');

const router = express.Router();

router.post('/register', registerRules, register);
router.post('/login', loginRules, login);
router.get('/profile', protect, getProfile);

module.exports = router;
