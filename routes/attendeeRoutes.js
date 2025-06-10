const express = require('express');
const router = express.Router();
const attendeeController = require('../controllers/attendeeController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdminOrOrganizer } = require('../middleware/roleMiddleware');

// Protected routes
router.use(authMiddleware);

// Attendee routes
router.post('/register/:expoId', attendeeController.registerForExpo);
router.get('/my/registrations', attendeeController.getMyRegistrations);
router.put('/:id', attendeeController.updateAttendeeProfile);
router.post('/:attendeeId/sessions/:sessionId/register', attendeeController.registerForSession);
router.post('/:attendeeId/exhibitors/:exhibitorId/bookmark', attendeeController.bookmarkExhibitor);
router.get('/:id/analytics', attendeeController.getAttendeeAnalytics);

// Admin/Organizer routes
router.get('/expo/:expoId', isAdminOrOrganizer, attendeeController.getAttendeesByExpo);
router.get('/:id', attendeeController.getAttendeeById);
router.post('/:id/checkin', isAdminOrOrganizer, attendeeController.checkInAttendee);

module.exports = router; 