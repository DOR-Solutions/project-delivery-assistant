const express = require('express');
const router = express.Router();

router.post('/chat', (req, res) => {
  const { message } = req.body;
  res.json({
    response: `AI Assistant received: "${message}". This is a placeholder response.`,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
