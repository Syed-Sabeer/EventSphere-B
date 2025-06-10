const express = require('express');
const Schedule = require('./Schedule');
const auth = require('./authMiddleware');
const role = require('./roleMiddleware');
const router = express.Router();

// Get all schedules for an expo
router.get('/:expoId', auth, async (req, res) => {
  const schedules = await Schedule.find({ expo: req.params.expoId });
  res.json(schedules);
});

// Create schedule (admin only)
router.post('/', auth, role(['admin']), async (req, res) => {
  const schedule = new Schedule(req.body);
  await schedule.save();
  res.status(201).json(schedule);
});

// Edit schedule (admin only)
router.put('/:id', auth, role(['admin']), async (req, res) => {
  const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(schedule);
});

// Delete schedule (admin only)
router.delete('/:id', auth, role(['admin']), async (req, res) => {
  await Schedule.findByIdAndDelete(req.params.id);
  res.json({ message: 'Schedule deleted' });
});

module.exports = router;
