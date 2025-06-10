const { Expo, Booth, Exhibitor, Attendee, Schedule } = require('../models');

// Create Expo
const createExpo = async (req, res) => {
    try {
        const expoData = {
            ...req.body,
            organizer: req.user.userId
        };

        const expo = new Expo(expoData);
        await expo.save();

        // Populate organizer info
        await expo.populate('organizer', 'firstName lastName email');

        res.status(201).json({
            success: true,
            message: 'Expo created successfully',
            data: { expo }
        });
    } catch (error) {
        console.error('Create expo error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create expo',
            error: error.message
        });
    }
};

// Get All Expos (with filters)
const getAllExpos = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            category,
            search,
            startDate,
            endDate,
            location,
            organizer
        } = req.query;

        // Build filter object
        const filter = {};
        
        if (status) filter.status = status;
        if (category) filter.category = category;
        if (organizer) filter.organizer = organizer;
        
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { theme: { $regex: search, $options: 'i' } }
            ];
        }

        if (startDate || endDate) {
            filter.startDate = {};
            if (startDate) filter.startDate.$gte = new Date(startDate);
            if (endDate) filter.startDate.$lte = new Date(endDate);
        }

        if (location) {
            filter.$or = [
                { 'location.venue': { $regex: location, $options: 'i' } },
                { 'location.city': { $regex: location, $options: 'i' } },
                { 'location.state': { $regex: location, $options: 'i' } }
            ];
        }

        // For non-admin users, only show published expos
        if (req.user.role !== 'admin' && req.user.role !== 'organizer') {
            filter.status = 'published';
            filter.isPublic = true;
        }

        const skip = (page - 1) * limit;
        
        const expos = await Expo.find(filter)
            .populate('organizer', 'firstName lastName email company')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Expo.countDocuments(filter);

        res.json({
            success: true,
            data: {
                expos,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get all expos error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch expos',
            error: error.message
        });
    }
};

// Get Expo by ID
const getExpoById = async (req, res) => {
    try {
        const { id } = req.params;

        const expo = await Expo.findById(id)
            .populate('organizer', 'firstName lastName email company phone');

        if (!expo) {
            return res.status(404).json({
                success: false,
                message: 'Expo not found'
            });
        }

        // Check if user has permission to view this expo
        if (expo.status !== 'published' && !expo.isPublic) {
            if (req.user.role !== 'admin' && 
                req.user.role !== 'organizer' && 
                expo.organizer._id.toString() !== req.user.userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        res.json({
            success: true,
            data: { expo }
        });
    } catch (error) {
        console.error('Get expo by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch expo',
            error: error.message
        });
    }
};

// Update Expo
const updateExpo = async (req, res) => {
    try {
        const { id } = req.params;

        const expo = await Expo.findById(id);
        if (!expo) {
            return res.status(404).json({
                success: false,
                message: 'Expo not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Update expo
        Object.assign(expo, req.body);
        await expo.save();

        await expo.populate('organizer', 'firstName lastName email');

        res.json({
            success: true,
            message: 'Expo updated successfully',
            data: { expo }
        });
    } catch (error) {
        console.error('Update expo error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update expo',
            error: error.message
        });
    }
};

// Delete Expo
const deleteExpo = async (req, res) => {
    try {
        const { id } = req.params;

        const expo = await Expo.findById(id);
        if (!expo) {
            return res.status(404).json({
                success: false,
                message: 'Expo not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Check if expo can be deleted (no active registrations)
        const exhibitorCount = await Exhibitor.countDocuments({ 
            expo: id, 
            'applicationInfo.status': 'approved' 
        });
        const attendeeCount = await Attendee.countDocuments({ 
            expo: id, 
            'registrationInfo.status': { $in: ['registered', 'confirmed', 'checked-in'] }
        });

        if (exhibitorCount > 0 || attendeeCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete expo with active registrations'
            });
        }

        await Expo.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Expo deleted successfully'
        });
    } catch (error) {
        console.error('Delete expo error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete expo',
            error: error.message
        });
    }
};

// Get Expo Analytics
const getExpoAnalytics = async (req, res) => {
    try {
        const { id } = req.params;

        const expo = await Expo.findById(id);
        if (!expo) {
            return res.status(404).json({
                success: false,
                message: 'Expo not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get analytics data
        const [
            totalExhibitors,
            approvedExhibitors,
            totalAttendees,
            checkedInAttendees,
            totalBooths,
            bookedBooths,
            totalSessions,
            sessionAttendance
        ] = await Promise.all([
            Exhibitor.countDocuments({ expo: id }),
            Exhibitor.countDocuments({ expo: id, 'applicationInfo.status': 'approved' }),
            Attendee.countDocuments({ expo: id }),
            Attendee.countDocuments({ expo: id, 'checkInInfo.checkedIn': true }),
            Booth.countDocuments({ expo: id }),
            Booth.countDocuments({ expo: id, status: 'booked' }),
            Schedule.countDocuments({ expo: id }),
            Schedule.aggregate([
                { $match: { expo: expo._id } },
                { $group: { _id: null, totalAttendees: { $sum: { $size: '$attendees' } } } }
            ])
        ]);

        // Get exhibitor applications by status
        const exhibitorsByStatus = await Exhibitor.aggregate([
            { $match: { expo: expo._id } },
            { $group: { _id: '$applicationInfo.status', count: { $sum: 1 } } }
        ]);

        // Get attendees by registration status
        const attendeesByStatus = await Attendee.aggregate([
            { $match: { expo: expo._id } },
            { $group: { _id: '$registrationInfo.status', count: { $sum: 1 } } }
        ]);

        // Get booth occupancy by category
        const boothsByCategory = await Booth.aggregate([
            { $match: { expo: expo._id } },
            { $group: { _id: '$category', total: { $sum: 1 }, booked: { $sum: { $cond: [{ $eq: ['$status', 'booked'] }, 1, 0] } } } }
        ]);

        const analytics = {
            overview: {
                totalExhibitors,
                approvedExhibitors,
                totalAttendees,
                checkedInAttendees,
                totalBooths,
                bookedBooths,
                totalSessions,
                sessionAttendance: sessionAttendance[0]?.totalAttendees || 0
            },
            exhibitors: {
                byStatus: exhibitorsByStatus.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            },
            attendees: {
                byStatus: attendeesByStatus.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            },
            booths: {
                byCategory: boothsByCategory
            },
            occupancyRate: totalBooths > 0 ? (bookedBooths / totalBooths * 100).toFixed(2) : 0,
            checkInRate: totalAttendees > 0 ? (checkedInAttendees / totalAttendees * 100).toFixed(2) : 0
        };

        res.json({
            success: true,
            data: { analytics }
        });
    } catch (error) {
        console.error('Get expo analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch expo analytics',
            error: error.message
        });
    }
};

// Get My Expos (for organizers)
const getMyExpos = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;

        const filter = { organizer: req.user.userId };
        if (status) filter.status = status;

        const skip = (page - 1) * limit;

        const expos = await Expo.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Expo.countDocuments(filter);

        res.json({
            success: true,
            data: {
                expos,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get my expos error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch your expos',
            error: error.message
        });
    }
};

// Publish Expo
const publishExpo = async (req, res) => {
    try {
        const { id } = req.params;

        const expo = await Expo.findById(id);
        if (!expo) {
            return res.status(404).json({
                success: false,
                message: 'Expo not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        expo.status = 'published';
        await expo.save();

        res.json({
            success: true,
            message: 'Expo published successfully',
            data: { expo }
        });
    } catch (error) {
        console.error('Publish expo error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to publish expo',
            error: error.message
        });
    }
};

module.exports = {
    createExpo,
    getAllExpos,
    getExpoById,
    updateExpo,
    deleteExpo,
    getExpoAnalytics,
    getMyExpos,
    publishExpo
}; 