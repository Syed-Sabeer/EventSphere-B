const express = require('express');
const Attendee = require('./Attendee');
const auth = require('./authMiddleware');
const role = require('./roleMiddleware');
const router = express.Router();

// Attendee profile
router.get('/me', auth, role(['attendee']), async (req, res) => {
  const attendee = await Attendee.findOne({ user: req.user._id });
  res.json(attendee);
});

router.post('/register-expo', auth, role(['attendee']), async (req, res) => {
  const { expoId } = req.body;
  let attendee = await Attendee.findOne({ user: req.user._id });
  if (!attendee) attendee = new Attendee({ user: req.user._id, registeredExpos: [expoId] });
  else attendee.registeredExpos.push(expoId);
  await attendee.save();
  res.json(attendee);
});

router.put('/bookmark-session', auth, role(['attendee']), async (req, res) => {
  const { sessionId } = req.body;
  const attendee = await Attendee.findOneAndUpdate(
    { user: req.user._id },
    { $addToSet: { bookmarkedSessions: sessionId } },
    { new: true }
  );
  res.json(attendee);
});

module.exports = router;
