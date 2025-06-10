const express = require('express');
const Expo = require('./Expo');
const auth = require('./authMiddleware');
const role = require('./roleMiddleware');
const router = express.Router();

// Get all expos
router.get('/', auth, async (req, res) => {
  const expos = await Expo.find();
  res.json(expos);
});

// Create expo (admin only)
router.post('/', auth, role(['admin']), async (req, res) => {
  const expo = new Expo(req.body);
  await expo.save();
  res.status(201).json(expo);
});

// Edit expo (admin only)
router.put('/:id', auth, role(['admin']), async (req, res) => {
  const expo = await Expo.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(expo);
});

// Delete expo (admin only)
router.delete('/:id', auth, role(['admin']), async (req, res) => {
  await Expo.findByIdAndDelete(req.params.id);
  res.json({ message: 'Expo deleted' });
});

module.exports = router;
