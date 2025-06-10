const express = require('express');
const Feedback = require('./Feedback');
const auth = require('./authMiddleware');
const router = express.Router();

// Submit feedback
router.post('/', auth, async (req, res) => {
  const feedback = new Feedback({ ...req.body, user: req.user._id });
  await feedback.save();
  res.status(201).json(feedback);
});

// Admin: view all feedback
router.get('/', auth, async (req, res) => {
  const feedbacks = await Feedback.find().populate('user', 'name email role');
  res.json(feedbacks);
});

module.exports = router;
