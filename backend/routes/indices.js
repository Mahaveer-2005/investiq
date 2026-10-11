const express = require('express');
const router = express.Router();
const { getIndices } = require('../services/stockService');

router.get('/', async (req, res) => {
  try {
    const data = await getIndices();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
