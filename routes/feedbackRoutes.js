const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdminOrOrganizer } = require('../middleware/roleMiddleware');

// Protected routes
router.use(authMiddleware);

// User routes
router.post('/', feedbackController.submitFeedback);
router.get('/my', feedbackController.getMyFeedback);
router.get('/:id', feedbackController.getFeedbackById);
router.put('/:id', feedbackController.updateFeedback);

// Admin/Organizer routes
router.get('/expo/:expoId', isAdminOrOrganizer, feedbackController.getFeedbackByExpo);
router.post('/:id/assign', isAdminOrOrganizer, feedbackController.assignFeedback);
router.post('/:id/respond', isAdminOrOrganizer, feedbackController.respondToFeedback);
router.post('/:id/resolve', isAdminOrOrganizer, feedbackController.resolveFeedback);
router.post('/:id/escalate', isAdminOrOrganizer, feedbackController.escalateFeedback);
router.get('/expo/:expoId/analytics', isAdminOrOrganizer, feedbackController.getFeedbackAnalytics);

module.exports = router; 