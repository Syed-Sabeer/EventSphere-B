const express = require('express');
const Booth = require('./Booth');
const auth = require('./authMiddleware');
const role = require('./roleMiddleware');
const router = express.Router();

// Get all booths for an expo
router.get('/:expoId', auth, async (req, res) => {
  const booths = await Booth.find({ expo: req.params.expoId });
  res.json(booths);
});

// Create booth (admin only)
router.post('/', auth, role(['admin']), async (req, res) => {
  const booth = new Booth(req.body);
  await booth.save();
  res.status(201).json(booth);
});

// Edit booth (admin only)
router.put('/:id', auth, role(['admin']), async (req, res) => {
  const booth = await Booth.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(booth);
});

// Delete booth (admin only)
router.delete('/:id', auth, role(['admin']), async (req, res) => {
  await Booth.findByIdAndDelete(req.params.id);
  res.json({ message: 'Booth deleted' });
});

module.exports = router;
