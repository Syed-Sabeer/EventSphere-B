const express = require('express');
const router = express.Router();
const exhibitorController = require('../controllers/exhibitorController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdminOrOrganizer, isExhibitorOrHigher } = require('../middleware/roleMiddleware');

// Public routes
router.get('/expo/:expoId', exhibitorController.getExhibitorsByExpo);

// Protected routes
router.use(authMiddleware);

// Exhibitor routes
router.post('/apply/:expoId', exhibitorController.applyAsExhibitor);
router.get('/my/applications', exhibitorController.getMyApplications);
router.put('/:id', exhibitorController.updateExhibitorApplication);
router.get('/:id/analytics', exhibitorController.getExhibitorAnalytics);

// Admin/Organizer routes
router.get('/expo/:expoId/applications', isAdminOrOrganizer, exhibitorController.getExhibitorApplications);
router.get('/:id', exhibitorController.getExhibitorById);
router.post('/:id/review', isAdminOrOrganizer, exhibitorController.reviewExhibitorApplication);
router.post('/:id/assign-booth', isAdminOrOrganizer, exhibitorController.assignBooth);

module.exports = router; 