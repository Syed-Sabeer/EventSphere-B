const express = require('express');
const router = express.Router();
const boothController = require('../controllers/boothController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdminOrOrganizer, isExhibitorOrHigher } = require('../middleware/roleMiddleware');

// Protected routes
router.use(authMiddleware);

// Public (authenticated) routes
router.get('/expo/:expoId', boothController.getBoothsByExpo);
router.get('/expo/:expoId/floor-plan', boothController.getFloorPlan);
router.get('/:id', boothController.getBoothById);

// Exhibitor routes
router.post('/:id/reserve', isExhibitorOrHigher, boothController.reserveBooth);

// Admin/Organizer routes
router.post('/', isAdminOrOrganizer, boothController.createBooth);
router.post('/bulk', isAdminOrOrganizer, boothController.bulkCreateBooths);
router.put('/:id', isAdminOrOrganizer, boothController.updateBooth);
router.delete('/:id', isAdminOrOrganizer, boothController.deleteBooth);
router.post('/:id/book', isAdminOrOrganizer, boothController.bookBooth);
router.post('/:id/release', isAdminOrOrganizer, boothController.releaseBooth);

module.exports = router; 