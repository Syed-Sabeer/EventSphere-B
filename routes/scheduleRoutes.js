const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdminOrOrganizer } = require('../middleware/roleMiddleware');

// Public routes
router.get('/expo/:expoId', scheduleController.getSchedulesByExpo);
router.get('/:id', scheduleController.getScheduleById);

// Protected routes
router.use(authMiddleware);

// Attendee routes
router.post('/:id/register', scheduleController.registerForSession);
router.post('/:id/unregister', scheduleController.unregisterFromSession);
router.post('/:id/feedback', scheduleController.submitSessionFeedback);
router.get('/expo/:expoId/my-sessions', scheduleController.getMySessions);

// Admin/Organizer routes
router.post('/', isAdminOrOrganizer, scheduleController.createSchedule);
router.put('/:id', isAdminOrOrganizer, scheduleController.updateSchedule);
router.delete('/:id', isAdminOrOrganizer, scheduleController.deleteSchedule);
router.post('/:id/attendance', isAdminOrOrganizer, scheduleController.markAttendance);
router.get('/:id/analytics', isAdminOrOrganizer, scheduleController.getSessionAnalytics);

module.exports = router; 