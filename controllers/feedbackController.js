const { Feedback, Expo } = require('../models');

// Submit Feedback
const submitFeedback = async (req, res) => {
    try {
        const feedbackData = {
            ...req.body,
            user: req.user.userId
        };

        const feedback = new Feedback(feedbackData);
        await feedback.save();

        await feedback.populate([
            { path: 'user', select: 'firstName lastName email' },
            { path: 'expo', select: 'title' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            data: { feedback }
        });
    } catch (error) {
        console.error('Submit feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit feedback',
            error: error.message
        });
    }
};

// Get Feedback by Expo (Admin/Organizer)
const getFeedbackByExpo = async (req, res) => {
    try {
        const { expoId } = req.params;
        const { 
            type, 
            status, 
            priority, 
            page = 1, 
            limit = 10,
            assignedTo,
            search 
        } = req.query;

        // Check permission
        const expo = await Expo.findById(expoId);
        if (!expo) {
            return res.status(404).json({
                success: false,
                message: 'Expo not found'
            });
        }

        if (req.user.role !== 'admin' && expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const filter = { expo: expoId };
        if (type) filter.type = type;
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (assignedTo) filter.assignedTo = assignedTo;

        if (search) {
            filter.$or = [
                { subject: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        const skip = (page - 1) * limit;

        const feedbacks = await Feedback.find(filter)
            .populate('user', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName')
            .populate('resolvedBy', 'firstName lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Feedback.countDocuments(filter);

        res.json({
            success: true,
            data: {
                feedbacks,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get feedback by expo error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch feedback',
            error: error.message
        });
    }
};

// Get Feedback by ID
const getFeedbackById = async (req, res) => {
    try {
        const { id } = req.params;

        const feedback = await Feedback.findById(id)
            .populate('user', 'firstName lastName email')
            .populate('expo', 'title organizer')
            .populate('assignedTo', 'firstName lastName email')
            .populate('resolvedBy', 'firstName lastName')
            .populate('responses.respondedBy', 'firstName lastName');

        if (!feedback) {
            return res.status(404).json({
                success: false,
                message: 'Feedback not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            feedback.user._id.toString() !== req.user.userId &&
            feedback.expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: { feedback }
        });
    } catch (error) {
        console.error('Get feedback by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch feedback',
            error: error.message
        });
    }
};

// Update Feedback
const updateFeedback = async (req, res) => {
    try {
        const { id } = req.params;

        const feedback = await Feedback.findById(id).populate('expo');
        if (!feedback) {
            return res.status(404).json({
                success: false,
                message: 'Feedback not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            feedback.user.toString() !== req.user.userId &&
            feedback.expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Users can only update their own feedback if it's not resolved
        if (feedback.user.toString() === req.user.userId && feedback.isResolved) {
            return res.status(400).json({
                success: false,
                message: 'Cannot update resolved feedback'
            });
        }

        Object.assign(feedback, req.body);
        await feedback.save();

        await feedback.populate([
            { path: 'user', select: 'firstName lastName email' },
            { path: 'assignedTo', select: 'firstName lastName' }
        ]);

        res.json({
            success: true,
            message: 'Feedback updated successfully',
            data: { feedback }
        });
    } catch (error) {
        console.error('Update feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update feedback',
            error: error.message
        });
    }
};

// Assign Feedback
const assignFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { assignedTo } = req.body;

        const feedback = await Feedback.findById(id).populate('expo');
        if (!feedback) {
            return res.status(404).json({
                success: false,
                message: 'Feedback not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && feedback.expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        feedback.assignedTo = assignedTo;
        feedback.assignedAt = new Date();
        feedback.status = 'in_progress';
        await feedback.save();

        await feedback.populate('assignedTo', 'firstName lastName email');

        res.json({
            success: true,
            message: 'Feedback assigned successfully',
            data: { feedback }
        });
    } catch (error) {
        console.error('Assign feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign feedback',
            error: error.message
        });
    }
};

// Respond to Feedback
const respondToFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, isInternal = false } = req.body;

        const feedback = await Feedback.findById(id).populate('expo');
        if (!feedback) {
            return res.status(404).json({
                success: false,
                message: 'Feedback not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            feedback.expo.organizer.toString() !== req.user.userId &&
            feedback.assignedTo?.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        feedback.responses.push({
            respondedBy: req.user.userId,
            message,
            isInternal,
            respondedAt: new Date()
        });

        if (feedback.status === 'open') {
            feedback.status = 'in_progress';
        }

        await feedback.save();

        await feedback.populate('responses.respondedBy', 'firstName lastName');

        res.json({
            success: true,
            message: 'Response added successfully',
            data: { feedback }
        });
    } catch (error) {
        console.error('Respond to feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to respond to feedback',
            error: error.message
        });
    }
};

// Resolve Feedback
const resolveFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution } = req.body;

        const feedback = await Feedback.findById(id).populate('expo');
        if (!feedback) {
            return res.status(404).json({
                success: false,
                message: 'Feedback not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            feedback.expo.organizer.toString() !== req.user.userId &&
            feedback.assignedTo?.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        feedback.status = 'resolved';
        feedback.resolvedAt = new Date();
        feedback.resolvedBy = req.user.userId;
        feedback.resolution = resolution;
        await feedback.save();

        await feedback.populate('resolvedBy', 'firstName lastName');

        res.json({
            success: true,
            message: 'Feedback resolved successfully',
            data: { feedback }
        });
    } catch (error) {
        console.error('Resolve feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resolve feedback',
            error: error.message
        });
    }
};

// Get My Feedback
const getMyFeedback = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, type } = req.query;

        const filter = { user: req.user.userId };
        if (status) filter.status = status;
        if (type) filter.type = type;

        const skip = (page - 1) * limit;

        const feedbacks = await Feedback.find(filter)
            .populate('expo', 'title')
            .populate('assignedTo', 'firstName lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Feedback.countDocuments(filter);

        res.json({
            success: true,
            data: {
                feedbacks,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get my feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch your feedback',
            error: error.message
        });
    }
};

// Get Feedback Analytics
const getFeedbackAnalytics = async (req, res) => {
    try {
        const { expoId } = req.params;

        // Check permission
        const expo = await Expo.findById(expoId);
        if (!expo) {
            return res.status(404).json({
                success: false,
                message: 'Expo not found'
            });
        }

        if (req.user.role !== 'admin' && expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const [
            totalFeedback,
            byStatus,
            byType,
            byPriority,
            averageRating,
            responseTime
        ] = await Promise.all([
            Feedback.countDocuments({ expo: expoId }),
            Feedback.aggregate([
                { $match: { expo: expo._id } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Feedback.aggregate([
                { $match: { expo: expo._id } },
                { $group: { _id: '$type', count: { $sum: 1 } } }
            ]),
            Feedback.aggregate([
                { $match: { expo: expo._id } },
                { $group: { _id: '$priority', count: { $sum: 1 } } }
            ]),
            Feedback.aggregate([
                { $match: { expo: expo._id, rating: { $exists: true } } },
                { $group: { _id: null, avgRating: { $avg: '$rating' } } }
            ]),
            Feedback.aggregate([
                { 
                    $match: { 
                        expo: expo._id, 
                        resolvedAt: { $exists: true },
                        createdAt: { $exists: true }
                    } 
                },
                {
                    $project: {
                        responseTimeHours: {
                            $divide: [
                                { $subtract: ['$resolvedAt', '$createdAt'] },
                                1000 * 60 * 60
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgResponseTime: { $avg: '$responseTimeHours' }
                    }
                }
            ])
        ]);

        const analytics = {
            total: totalFeedback,
            byStatus: byStatus.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byType: byType.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byPriority: byPriority.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            averageRating: averageRating[0]?.avgRating || 0,
            averageResponseTimeHours: responseTime[0]?.avgResponseTime || 0
        };

        res.json({
            success: true,
            data: { analytics }
        });
    } catch (error) {
        console.error('Get feedback analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch feedback analytics',
            error: error.message
        });
    }
};

// Escalate Feedback
const escalateFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { escalatedTo } = req.body;

        const feedback = await Feedback.findById(id).populate('expo');
        if (!feedback) {
            return res.status(404).json({
                success: false,
                message: 'Feedback not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            feedback.expo.organizer.toString() !== req.user.userId &&
            feedback.assignedTo?.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        feedback.escalated = true;
        feedback.escalatedAt = new Date();
        feedback.escalatedTo = escalatedTo;
        feedback.priority = 'urgent';
        await feedback.save();

        res.json({
            success: true,
            message: 'Feedback escalated successfully',
            data: { feedback }
        });
    } catch (error) {
        console.error('Escalate feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to escalate feedback',
            error: error.message
        });
    }
};

module.exports = {
    submitFeedback,
    getFeedbackByExpo,
    getFeedbackById,
    updateFeedback,
    assignFeedback,
    respondToFeedback,
    resolveFeedback,
    getMyFeedback,
    getFeedbackAnalytics,
    escalateFeedback
}; 