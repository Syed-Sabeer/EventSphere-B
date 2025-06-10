const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { User } = require('../models');
const emailService = require('../services/emailService');

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'dev_secret', {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

// Register User
const register = async (req, res) => {
    try {
        console.log('=== Registration Request Debug ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('Content-Type:', req.get('Content-Type'));
        console.log('====================================');
        
        const { firstName, lastName, email, password, role, phone, company } = req.body;

        // Development mode check - if MongoDB is not connected (readyState 1 = connected)
        if (mongoose.connection.readyState !== 1) {
            return res.status(200).json({
                success: true,
                message: 'Registration successful (Development Mode - No Database)',
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
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Create new user
        const user = new User({
            firstName,
            lastName,
            email,
            password,
            role: role || 'attendee',
            phone,
            company
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        // Send welcome email
        try {
            await emailService.sendWelcomeEmail(user.email, user.firstName);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
        }

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: user.toJSON(),
                token
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};

// Login User
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Development mode check - if MongoDB is not connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(200).json({
                success: true,
                message: 'Login successful (Development Mode - No Database)',
                data: {
                    user: {
                        _id: 'dev_user_' + Date.now(),
                        firstName: 'Dev',
                        lastName: 'User',
                        email,
                        role: 'admin',
                        isEmailVerified: true,
                        createdAt: new Date().toISOString()
                    },
                    token: 'dev_token_' + Date.now()
                }
            });
        }

        // Find user and include password for comparison
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: user.toJSON(),
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};

// Get Current User
const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: { user: user.toJSON() }
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user information',
            error: error.message
        });
    }
};

// Update Profile
const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, phone, company, profilePicture } = req.body;
        
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update fields
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phone) user.phone = phone;
        if (company) user.company = company;
        if (profilePicture) user.profilePicture = profilePicture;

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { user: user.toJSON() }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
};

// Change Password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.userId).select('+password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
            error: error.message
        });
    }
};

// Forgot Password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found with this email'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save();

        // Send reset email
        try {
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
            await emailService.sendPasswordResetEmail(user.email, user.firstName, resetUrl);
        } catch (emailError) {
            console.error('Failed to send reset email:', emailError);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            
            return res.status(500).json({
                success: false,
                message: 'Failed to send reset email'
            });
        }

        res.json({
            success: true,
            message: 'Password reset email sent successfully'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process forgot password request',
            error: error.message
        });
    }
};

// Reset Password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        // Hash token to compare with stored token
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Update password
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        // Generate new token
        const authToken = generateToken(user._id);

        res.json({
            success: true,
            message: 'Password reset successfully',
            data: {
                user: user.toJSON(),
                token: authToken
            }
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password',
            error: error.message
        });
    }
};

// Logout (mainly for clearing client-side token)
const logout = async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed',
            error: error.message
        });
    }
};

// Verify Email (if email verification is needed)
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        
        // In a real implementation, you'd verify the token
        // For now, we'll just mark the user as verified
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.isVerified = true;
        await user.save();

        res.json({
            success: true,
            message: 'Email verified successfully'
        });
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({
            success: false,
            message: 'Email verification failed',
            error: error.message
        });
    }
};

module.exports = {
    register,
    login,
    getCurrentUser,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    logout,
    verifyEmail
}; 