const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.use(authMiddleware); // Apply auth middleware to all routes below

router.get('/me', authController.getCurrentUser);
router.put('/profile', authController.updateProfile);
router.put('/change-password', authController.changePassword);
router.post('/logout', authController.logout);
router.post('/verify-email/:token', authController.verifyEmail);

// Test endpoint (no database required)
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Auth routes are working!',
        timestamp: new Date().toISOString()
    });
});

// Simple register endpoint for development
router.post('/register-dev', (req, res) => {
    const { firstName, lastName, email, password, role, phone, company } = req.body;
    
    res.status(200).json({
        success: true,
        message: 'Registration successful (Development Mode)',
        data: {
            user: {
                _id: 'dev_user_' + Date.now(),
                firstName,
                lastName,
                email,
                role: role || 'attendee',
                phone,
                company,
                isEmailVerified: true,
                createdAt: new Date().toISOString()
            },
            token: 'dev_token_' + Date.now()
        }
    });
});

module.exports = router; 