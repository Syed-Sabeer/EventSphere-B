const { Schedule, Expo, Attendee } = require('../models');

// Create Schedule/Session
const createSchedule = async (req, res) => {
    try {
        const schedule = new Schedule(req.body);
        await schedule.save();

        await schedule.populate('expo', 'title organizer');

        res.status(201).json({
            success: true,
            message: 'Schedule created successfully',
            data: { schedule }
        });
    } catch (error) {
        console.error('Create schedule error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create schedule',
            error: error.message
        });
    }
};

// Get Schedules by Expo
const getSchedulesByExpo = async (req, res) => {
    try {
        const { expoId } = req.params;
        const { date, type, page = 1, limit = 20 } = req.query;

        const filter = { expo: expoId };
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            filter.date = { $gte: startDate, $lt: endDate };
        }
        if (type) filter.type = type;

        const skip = (page - 1) * limit;

        const schedules = await Schedule.find(filter)
            .sort({ date: 1, startTime: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Schedule.countDocuments(filter);

        res.json({
            success: true,
            data: {
                schedules,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get schedules by expo error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch schedules',
            error: error.message
        });
    }
};

// Get Schedule by ID
const getScheduleById = async (req, res) => {
    try {
        const { id } = req.params;

        const schedule = await Schedule.findById(id)
            .populate('expo', 'title organizer')
            .populate('attendees.user', 'firstName lastName email');

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Schedule not found'
            });
        }

        res.json({
            success: true,
            data: { schedule }
        });
    } catch (error) {
        console.error('Get schedule by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch schedule',
            error: error.message
        });
    }
};

// Update Schedule
const updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;

        const schedule = await Schedule.findById(id).populate('expo');
        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Schedule not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            schedule.expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        Object.assign(schedule, req.body);
        await schedule.save();

        await schedule.populate('expo', 'title organizer');

        res.json({
            success: true,
            message: 'Schedule updated successfully',
            data: { schedule }
        });
    } catch (error) {
        console.error('Update schedule error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update schedule',
            error: error.message
        });
    }
};

// Delete Schedule
const deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;

        const schedule = await Schedule.findById(id).populate('expo');
        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Schedule not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            schedule.expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Check if session has attendees
        if (schedule.attendees.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete session with registered attendees'
            });
        }

        await Schedule.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Schedule deleted successfully'
        });
    } catch (error) {
        console.error('Delete schedule error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete schedule',
            error: error.message
        });
    }
};

// Register for Session
const registerForSession = async (req, res) => {
    try {
        const { id } = req.params;

        const schedule = await Schedule.findById(id);
        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Check if registration is required
        if (!schedule.registrationRequired) {
            return res.status(400).json({
                success: false,
                message: 'Registration is not required for this session'
            });
        }

        // Check if session is full
        if (schedule.isFull) {
            return res.status(400).json({
                success: false,
                message: 'Session is full'
            });
        }

        // Check if user is already registered
        const alreadyRegistered = schedule.attendees.some(
            attendee => attendee.user.toString() === req.user.userId
        );

        if (alreadyRegistered) {
            return res.status(400).json({
                success: false,
                message: 'You are already registered for this session'
            });
        }

        // Check if user is registered for the expo
        const attendeeRecord = await Attendee.findOne({
            user: req.user.userId,
            expo: schedule.expo
        });

        if (!attendeeRecord) {
            return res.status(400).json({
                success: false,
                message: 'You must be registered for the expo to attend sessions'
            });
        }

        // Add user to session attendees
        schedule.attendees.push({
            user: req.user.userId,
            registeredAt: new Date()
        });
        await schedule.save();

        // Add session to attendee's registrations
        attendeeRecord.sessionRegistrations.push({
            session: id,
            registeredAt: new Date()
        });
        await attendeeRecord.save();

        res.json({
            success: true,
            message: 'Successfully registered for session'
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

// Unregister from Session
const unregisterFromSession = async (req, res) => {
    try {
        const { id } = req.params;

        const schedule = await Schedule.findById(id);
        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Remove user from session attendees
        schedule.attendees = schedule.attendees.filter(
            attendee => attendee.user.toString() !== req.user.userId
        );
        await schedule.save();

        // Remove session from attendee's registrations
        const attendeeRecord = await Attendee.findOne({
            user: req.user.userId,
            expo: schedule.expo
        });

        if (attendeeRecord) {
            attendeeRecord.sessionRegistrations = attendeeRecord.sessionRegistrations.filter(
                reg => reg.session.toString() !== id
            );
            await attendeeRecord.save();
        }

        res.json({
            success: true,
            message: 'Successfully unregistered from session'
        });
    } catch (error) {
        console.error('Unregister from session error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unregister from session',
            error: error.message
        });
    }
};

// Mark Attendance
const markAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, attended } = req.body;

        const schedule = await Schedule.findById(id).populate('expo');
        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            schedule.expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Find and update attendee
        const attendeeIndex = schedule.attendees.findIndex(
            attendee => attendee.user.toString() === userId
        );

        if (attendeeIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'User not registered for this session'
            });
        }

        schedule.attendees[attendeeIndex].attended = attended;
        await schedule.save();

        // Update attendee record
        const attendeeRecord = await Attendee.findOne({
            user: userId,
            expo: schedule.expo._id
        });

        if (attendeeRecord) {
            const sessionRegIndex = attendeeRecord.sessionRegistrations.findIndex(
                reg => reg.session.toString() === id
            );
            if (sessionRegIndex !== -1) {
                attendeeRecord.sessionRegistrations[sessionRegIndex].attended = attended;
                await attendeeRecord.save();
            }
        }

        res.json({
            success: true,
            message: `Attendance ${attended ? 'marked' : 'unmarked'} successfully`
        });
    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark attendance',
            error: error.message
        });
    }
};

// Submit Session Feedback
const submitSessionFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        const schedule = await Schedule.findById(id);
        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Check if user attended the session
        const attendee = schedule.attendees.find(
            attendee => attendee.user.toString() === req.user.userId
        );

        if (!attendee || !attendee.attended) {
            return res.status(400).json({
                success: false,
                message: 'You must attend the session to provide feedback'
            });
        }

        // Check if feedback already exists
        const existingFeedback = schedule.feedback.find(
            feedback => feedback.user.toString() === req.user.userId
        );

        if (existingFeedback) {
            existingFeedback.rating = rating;
            existingFeedback.comment = comment;
        } else {
            schedule.feedback.push({
                user: req.user.userId,
                rating,
                comment
            });
        }

        // Update average rating
        const totalRatings = schedule.feedback.length;
        const sumRatings = schedule.feedback.reduce((sum, fb) => sum + fb.rating, 0);
        schedule.rating.average = sumRatings / totalRatings;
        schedule.rating.count = totalRatings;

        await schedule.save();

        res.json({
            success: true,
            message: 'Feedback submitted successfully'
        });
    } catch (error) {
        console.error('Submit session feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit feedback',
            error: error.message
        });
    }
};

// Get Session Analytics
const getSessionAnalytics = async (req, res) => {
    try {
        const { id } = req.params;

        const schedule = await Schedule.findById(id).populate('expo');
        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            schedule.expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const analytics = {
            totalRegistered: schedule.attendees.length,
            totalAttended: schedule.attendees.filter(a => a.attended).length,
            attendanceRate: schedule.attendees.length > 0 ? 
                (schedule.attendees.filter(a => a.attended).length / schedule.attendees.length * 100).toFixed(2) : 0,
            averageRating: schedule.rating.average,
            totalFeedback: schedule.feedback.length,
            capacity: schedule.maxAttendees,
            occupancyRate: schedule.maxAttendees > 0 ? 
                (schedule.attendees.length / schedule.maxAttendees * 100).toFixed(2) : 0
        };

        res.json({
            success: true,
            data: { analytics }
        });
    } catch (error) {
        console.error('Get session analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch session analytics',
            error: error.message
        });
    }
};

// Get My Sessions (for attendees)
const getMySessions = async (req, res) => {
    try {
        const { expoId } = req.params;
        const { upcoming, attended } = req.query;

        const attendeeRecord = await Attendee.findOne({
            user: req.user.userId,
            expo: expoId
        }).populate({
            path: 'sessionRegistrations.session',
            populate: {
                path: 'expo',
                select: 'title'
            }
        });

        if (!attendeeRecord) {
            return res.status(404).json({
                success: false,
                message: 'You are not registered for this expo'
            });
        }

        let sessions = attendeeRecord.sessionRegistrations;

        if (upcoming === 'true') {
            const now = new Date();
            sessions = sessions.filter(reg => {
                const sessionDate = new Date(reg.session.date);
                return sessionDate > now;
            });
        }

        if (attended === 'true') {
            sessions = sessions.filter(reg => reg.attended);
        } else if (attended === 'false') {
            sessions = sessions.filter(reg => !reg.attended);
        }

        res.json({
            success: true,
            data: { sessions }
        });
    } catch (error) {
        console.error('Get my sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch your sessions',
            error: error.message
        });
    }
};

module.exports = {
    createSchedule,
    getSchedulesByExpo,
    getScheduleById,
    updateSchedule,
    deleteSchedule,
    registerForSession,
    unregisterFromSession,
    markAttendance,
    submitSessionFeedback,
    getSessionAnalytics,
    getMySessions
}; 