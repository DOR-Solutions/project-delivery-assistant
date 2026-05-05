const express = require('express');
const {
  createUser,
  createUserSession,
  verifyUserCredentials,
} = require('../services/userStore');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const user = await createUser(req.body);
    res.status(201).json(createUserSession(user));
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const user = await verifyUserCredentials(req.body.email, req.body.password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    return res.json(createUserSession(user));
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
