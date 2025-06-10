const { Attendee, Expo, Schedule, Exhibitor } = require('../models');

// Register for Expo
const registerForExpo = async (req, res) => {
    try {
        const { expoId } = req.params;
        const attendeeData = {
            ...req.body,
            user: req.user.userId,
            expo: expoId
        };

        // Check if user already registered for this expo
        const existingRegistration = await Attendee.findOne({
            user: req.user.userId,
            expo: expoId
        });

        if (existingRegistration) {
            return res.status(400).json({
                success: false,
                message: 'You are already registered for this expo'
            });
        }

        // Check if expo exists and registration is open
        const expo = await Expo.findById(expoId);
        if (!expo) {
            return res.status(404).json({
                success: false,
                message: 'Expo not found'
            });
        }

        if (!expo.isRegistrationOpen) {
            return res.status(400).json({
                success: false,
                message: 'Registration is closed for this expo'
            });
        }

        const attendee = new Attendee(attendeeData);
        await attendee.save();

        // Update expo attendee count
        await Expo.findByIdAndUpdate(expoId, {
            $inc: { attendeesCount: 1 }
        });

        await attendee.populate([
            { path: 'user', select: 'firstName lastName email' },
            { path: 'expo', select: 'title startDate endDate location' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Successfully registered for expo',
            data: { attendee }
        });
    } catch (error) {
        console.error('Register for expo error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register for expo',
            error: error.message
        });
    }
};

// Get Attendees by Expo (Admin/Organizer)
const getAttendeesByExpo = async (req, res) => {
    try {
        const { expoId } = req.params;
        const { status, ticketType, page = 1, limit = 10, search } = req.query;

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
        if (status) filter['registrationInfo.status'] = status;
        if (ticketType) filter['registrationInfo.ticketType'] = ticketType;

        if (search) {
            // We need to populate user first for search, so we'll use aggregation
            const pipeline = [
                { $match: filter },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user',
                        foreignField: '_id',
                        as: 'userInfo'
                    }
                },
                { $unwind: '$userInfo' },
                {
                    $match: {
                        $or: [
                            { 'userInfo.firstName': { $regex: search, $options: 'i' } },
                            { 'userInfo.lastName': { $regex: search, $options: 'i' } },
                            { 'userInfo.email': { $regex: search, $options: 'i' } },
                            { 'personalInfo.jobTitle': { $regex: search, $options: 'i' } },
                            { 'personalInfo.industry': { $regex: search, $options: 'i' } }
                        ]
                    }
                },
                { $sort: { 'registrationInfo.registrationDate': -1 } },
                { $skip: (page - 1) * limit },
                { $limit: parseInt(limit) }
            ];

            const attendees = await Attendee.aggregate(pipeline);
            const total = await Attendee.aggregate([...pipeline.slice(0, -2), { $count: 'total' }]);

            res.json({
                success: true,
                data: {
                    attendees,
                    pagination: {
                        current: parseInt(page),
                        pages: Math.ceil((total[0]?.total || 0) / limit),
                        total: total[0]?.total || 0,
                        limit: parseInt(limit)
                    }
                }
            });
        } else {
            const skip = (page - 1) * limit;

            const attendees = await Attendee.find(filter)
                .populate('user', 'firstName lastName email phone')
                .sort({ 'registrationInfo.registrationDate': -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const total = await Attendee.countDocuments(filter);

            res.json({
                success: true,
                data: {
                    attendees,
                    pagination: {
                        current: parseInt(page),
                        pages: Math.ceil(total / limit),
                        total,
                        limit: parseInt(limit)
                    }
                }
            });
        }
    } catch (error) {
        console.error('Get attendees by expo error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch attendees',
            error: error.message
        });
    }
};

// Get Attendee by ID
const getAttendeeById = async (req, res) => {
    try {
        const { id } = req.params;

        const attendee = await Attendee.findById(id)
            .populate('user', 'firstName lastName email phone')
            .populate('expo', 'title startDate endDate organizer')
            .populate('sessionRegistrations.session', 'title date startTime endTime location');

        if (!attendee) {
            return res.status(404).json({
                success: false,
                message: 'Attendee not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            attendee.user._id.toString() !== req.user.userId &&
            attendee.expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: { attendee }
        });
    } catch (error) {
        console.error('Get attendee by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch attendee',
            error: error.message
        });
    }
};

// Update Attendee Profile
const updateAttendeeProfile = async (req, res) => {
    try {
        const { id } = req.params;

        const attendee = await Attendee.findById(id);
        if (!attendee) {
            return res.status(404).json({
                success: false,
                message: 'Attendee not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            attendee.user.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        Object.assign(attendee, req.body);
        await attendee.save();

        await attendee.populate([
            { path: 'user', select: 'firstName lastName email' },
            { path: 'expo', select: 'title' }
        ]);

        res.json({
            success: true,
            message: 'Attendee profile updated successfully',
            data: { attendee }
        });
    } catch (error) {
        console.error('Update attendee profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update attendee profile',
            error: error.message
        });
    }
};

// Check-in Attendee
const checkInAttendee = async (req, res) => {
    try {
        const { id } = req.params;
        const { checkInMethod = 'manual', badgeNumber } = req.body;

        const attendee = await Attendee.findById(id).populate('expo');
        if (!attendee) {
            return res.status(404).json({
                success: false,
                message: 'Attendee not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            attendee.expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (attendee.checkInInfo.checkedIn) {
            return res.status(400).json({
                success: false,
                message: 'Attendee is already checked in'
            });
        }

        attendee.checkInInfo.checkedIn = true;
        attendee.checkInInfo.checkInTime = new Date();
        attendee.checkInInfo.checkInMethod = checkInMethod;
        if (badgeNumber) attendee.checkInInfo.badgeNumber = badgeNumber;

        await attendee.save();

        res.json({
            success: true,
            message: 'Attendee checked in successfully',
            data: { attendee }
        });
    } catch (error) {
        console.error('Check-in attendee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check-in attendee',
            error: error.message
        });
    }
};

// Register for Session
const registerForSession = async (req, res) => {
    try {
        const { attendeeId, sessionId } = req.params;

        const attendee = await Attendee.findById(attendeeId);
        if (!attendee) {
            return res.status(404).json({
                success: false,
                message: 'Attendee not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            attendee.user.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const session = await Schedule.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Check if session belongs to the same expo
        if (session.expo.toString() !== attendee.expo.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Session does not belong to the same expo'
            });
        }

        // Check if already registered
        const alreadyRegistered = attendee.sessionRegistrations.some(
            reg => reg.session.toString() === sessionId
        );

        if (alreadyRegistered) {
            return res.status(400).json({
                success: false,
                message: 'Already registered for this session'
            });
        }

        // Check if session is full
        if (session.isFull) {
            return res.status(400).json({
                success: false,
                message: 'Session is full'
            });
        }

        // Add to attendee's session registrations
        attendee.sessionRegistrations.push({
            session: sessionId,
            registeredAt: new Date()
        });
        await attendee.save();

        // Add to session's attendees
        session.attendees.push({
            user: attendee.user,
            registeredAt: new Date()
        });
        await session.save();

        res.json({
            success: true,
            message: 'Successfully registered for session',
            data: { attendee }
        });
    } catch (error) {
        console.error('Register for session error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register for session',
            error: error.message
        });
    }
};

// Get My Registrations
const getMyRegistrations = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;

        const filter = { user: req.user.userId };
        if (status) filter['registrationInfo.status'] = status;

        const skip = (page - 1) * limit;

        const registrations = await Attendee.find(filter)
            .populate('expo', 'title startDate endDate location status featuredImage')
            .sort({ 'registrationInfo.registrationDate': -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Attendee.countDocuments(filter);

        res.json({
            success: true,
            data: {
                registrations,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get my registrations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch your registrations',
            error: error.message
        });
    }
};

// Bookmark Exhibitor
const bookmarkExhibitor = async (req, res) => {
    try {
        const { attendeeId, exhibitorId } = req.params;

        const attendee = await Attendee.findById(attendeeId);
        if (!attendee) {
            return res.status(404).json({
                success: false,
                message: 'Attendee not found'
            });
        }

        // Check permission
        if (attendee.user.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const exhibitor = await Exhibitor.findById(exhibitorId);
        if (!exhibitor) {
            return res.status(404).json({
                success: false,
                message: 'Exhibitor not found'
            });
        }

        // Check if exhibitor belongs to the same expo
        if (exhibitor.expo.toString() !== attendee.expo.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Exhibitor does not belong to the same expo'
            });
        }

        // Check if already bookmarked
        const alreadyBookmarked = attendee.bookmarkedExhibitors.some(
            bookmark => bookmark.exhibitor.toString() === exhibitorId
        );

        if (alreadyBookmarked) {
            return res.status(400).json({
                success: false,
                message: 'Exhibitor already bookmarked'
            });
        }

        attendee.bookmarkedExhibitors.push({
            exhibitor: exhibitorId,
            bookmarkedAt: new Date()
        });
        await attendee.save();

        res.json({
            success: true,
            message: 'Exhibitor bookmarked successfully'
        });
    } catch (error) {
        console.error('Bookmark exhibitor error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to bookmark exhibitor',
            error: error.message
        });
    }
};

// Get Attendee Analytics
const getAttendeeAnalytics = async (req, res) => {
    try {
        const { id } = req.params;

        const attendee = await Attendee.findById(id);
        if (!attendee) {
            return res.status(404).json({
                success: false,
                message: 'Attendee not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            attendee.user.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const analytics = {
            totalVisitTime: attendee.analytics.totalVisitTime,
            boothsVisited: attendee.analytics.boothsVisited,
            sessionsAttended: attendee.analytics.sessionsAttended,
            connectionsMade: attendee.analytics.connectionsMade,
            materialsDownloaded: attendee.analytics.materialsDownloaded,
            sessionRegistrations: attendee.sessionRegistrations.length,
            bookmarkedExhibitors: attendee.bookmarkedExhibitors.length,
            exhibitorInteractions: attendee.exhibitorInteractions.length,
            feedbackSubmitted: attendee.feedback.length
        };

        res.json({
            success: true,
            data: { analytics }
        });
    } catch (error) {
        console.error('Get attendee analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch attendee analytics',
            error: error.message
        });
    }
};

module.exports = {
    registerForExpo,
    getAttendeesByExpo,
    getAttendeeById,
    updateAttendeeProfile,
    checkInAttendee,
    registerForSession,
    getMyRegistrations,
    bookmarkExhibitor,
    getAttendeeAnalytics
}; 