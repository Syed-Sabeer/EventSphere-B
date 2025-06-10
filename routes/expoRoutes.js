const express = require('express');
const router = express.Router();
const expoController = require('../controllers/expoController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdminOrOrganizer } = require('../middleware/roleMiddleware');

// Public routes
router.get('/', expoController.getAllExpos);
router.get('/:id', expoController.getExpoById);

// Protected routes
router.use(authMiddleware);

// Admin/Organizer routes
router.post('/', isAdminOrOrganizer, expoController.createExpo);
router.put('/:id', isAdminOrOrganizer, expoController.updateExpo);
router.delete('/:id', isAdminOrOrganizer, expoController.deleteExpo);
router.post('/:id/publish', isAdminOrOrganizer, expoController.publishExpo);
router.get('/:id/analytics', isAdminOrOrganizer, expoController.getExpoAnalytics);

// Organizer specific routes
router.get('/my/expos', isAdminOrOrganizer, expoController.getMyExpos);

module.exports = router; 