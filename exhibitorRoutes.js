const express = require('express');
const Exhibitor = require('./Exhibitor');
const auth = require('./authMiddleware');
const role = require('./roleMiddleware');
const router = express.Router();

// Exhibitor registration/profile (exhibitor only)
router.post('/register', auth, role(['exhibitor']), async (req, res) => {
  const exhibitor = new Exhibitor({ ...req.body, user: req.user._id });
  await exhibitor.save();
  res.status(201).json(exhibitor);
});

router.get('/me', auth, role(['exhibitor']), async (req, res) => {
  const exhibitor = await Exhibitor.findOne({ user: req.user._id });
  res.json(exhibitor);
});

router.put('/me', auth, role(['exhibitor']), async (req, res) => {
  const exhibitor = await Exhibitor.findOneAndUpdate({ user: req.user._id }, req.body, { new: true });
  res.json(exhibitor);
});

// Admin: view all, approve/reject, assign booth
router.get('/', auth, role(['admin']), async (req, res) => {
  const exhibitors = await Exhibitor.find();
  res.json(exhibitors);
});

router.put('/:id/approve', auth, role(['admin']), async (req, res) => {
  const exhibitor = await Exhibitor.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
  res.json(exhibitor);
});

router.put('/:id/reject', auth, role(['admin']), async (req, res) => {
  const exhibitor = await Exhibitor.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
  res.json(exhibitor);
});

module.exports = router;
