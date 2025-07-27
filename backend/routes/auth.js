// backend/routes/auth.js

const express = require('express');
const router = express.Router();
const { register, login, getEngineers } = require('../controllers/authController');

// ✅ Register a new user
router.post('/register', register);

// ✅ Login existing user
router.post('/login', login);

// ✅ Get all engineers (needed for MP dashboard dropdown)
router.get('/engineers', getEngineers);

module.exports = router;
