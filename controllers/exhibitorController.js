const { Exhibitor, Expo, User, Booth } = require('../models');

// Apply as Exhibitor
const applyAsExhibitor = async (req, res) => {
    try {
        const { expoId } = req.params;
        const exhibitorData = {
            ...req.body,
            user: req.user.userId,
            expo: expoId
        };

        // Check if user already applied for this expo
        const existingApplication = await Exhibitor.findOne({
            user: req.user.userId,
            expo: expoId
        });

        if (existingApplication) {
            return res.status(400).json({
                success: false,
                message: 'You have already applied for this expo'
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

        const exhibitor = new Exhibitor(exhibitorData);
        await exhibitor.save();

        await exhibitor.populate([
            { path: 'user', select: 'firstName lastName email' },
            { path: 'expo', select: 'title startDate endDate' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Exhibitor application submitted successfully',
            data: { exhibitor }
        });
    } catch (error) {
        console.error('Apply as exhibitor error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit application',
            error: error.message
        });
    }
};

// Get Exhibitor Applications (Admin/Organizer)
const getExhibitorApplications = async (req, res) => {
    try {
        const { expoId } = req.params;
        const { status, page = 1, limit = 10, search } = req.query;

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
        if (status) filter['applicationInfo.status'] = status;

        if (search) {
            filter.$or = [
                { 'companyInfo.name': { $regex: search, $options: 'i' } },
                { 'companyInfo.industry': { $regex: search, $options: 'i' } },
                { 'contactInfo.primaryContact.name': { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;

        const exhibitors = await Exhibitor.find(filter)
            .populate('user', 'firstName lastName email')
            .populate('assignedBooth', 'boothNumber category')
            .sort({ 'applicationInfo.applicationDate': -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Exhibitor.countDocuments(filter);

        res.json({
            success: true,
            data: {
                exhibitors,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get exhibitor applications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch exhibitor applications',
            error: error.message
        });
    }
};

// Get Exhibitor by ID
const getExhibitorById = async (req, res) => {
    try {
        const { id } = req.params;

        const exhibitor = await Exhibitor.findById(id)
            .populate('user', 'firstName lastName email phone')
            .populate('expo', 'title startDate endDate organizer')
            .populate('assignedBooth', 'boothNumber category size position');

        if (!exhibitor) {
            return res.status(404).json({
                success: false,
                message: 'Exhibitor not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            exhibitor.user._id.toString() !== req.user.userId &&
            exhibitor.expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: { exhibitor }
        });
    } catch (error) {
        console.error('Get exhibitor by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch exhibitor',
            error: error.message
        });
    }
};

// Update Exhibitor Application
const updateExhibitorApplication = async (req, res) => {
    try {
        const { id } = req.params;

        const exhibitor = await Exhibitor.findById(id);
        if (!exhibitor) {
            return res.status(404).json({
                success: false,
                message: 'Exhibitor not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            exhibitor.user.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // If application is already approved, limit what can be updated
        if (exhibitor.applicationInfo.status === 'approved' && req.user.userId === exhibitor.user.toString()) {
            const allowedFields = ['companyInfo', 'contactInfo', 'productsServices', 'staffMembers', 'socialMedia'];
            const updateData = {};
            allowedFields.forEach(field => {
                if (req.body[field]) updateData[field] = req.body[field];
            });
            Object.assign(exhibitor, updateData);
        } else {
            Object.assign(exhibitor, req.body);
        }

        await exhibitor.save();

        await exhibitor.populate([
            { path: 'user', select: 'firstName lastName email' },
            { path: 'expo', select: 'title' },
            { path: 'assignedBooth', select: 'boothNumber' }
        ]);

        res.json({
            success: true,
            message: 'Exhibitor application updated successfully',
            data: { exhibitor }
        });
    } catch (error) {
        console.error('Update exhibitor application error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update exhibitor application',
            error: error.message
        });
    }
};

// Review Exhibitor Application (Approve/Reject)
const reviewExhibitorApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reviewNotes } = req.body;

        const exhibitor = await Exhibitor.findById(id).populate('expo');
        if (!exhibitor) {
            return res.status(404).json({
                success: false,
                message: 'Exhibitor not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && exhibitor.expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        exhibitor.applicationInfo.status = status;
        exhibitor.applicationInfo.reviewedBy = req.user.userId;
        exhibitor.applicationInfo.reviewedAt = new Date();
        exhibitor.applicationInfo.reviewNotes = reviewNotes;

        await exhibitor.save();

        // Update expo exhibitor count if approved
        if (status === 'approved') {
            await Expo.findByIdAndUpdate(exhibitor.expo._id, {
                $inc: { exhibitorsCount: 1 }
            });
        }

        await exhibitor.populate([
            { path: 'user', select: 'firstName lastName email' },
            { path: 'applicationInfo.reviewedBy', select: 'firstName lastName' }
        ]);

        res.json({
            success: true,
            message: `Exhibitor application ${status} successfully`,
            data: { exhibitor }
        });
    } catch (error) {
        console.error('Review exhibitor application error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to review exhibitor application',
            error: error.message
        });
    }
};

// Get My Applications (for exhibitors)
const getMyApplications = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;

        const filter = { user: req.user.userId };
        if (status) filter['applicationInfo.status'] = status;

        const skip = (page - 1) * limit;

        const applications = await Exhibitor.find(filter)
            .populate('expo', 'title startDate endDate location status')
            .populate('assignedBooth', 'boothNumber category size')
            .sort({ 'applicationInfo.applicationDate': -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Exhibitor.countDocuments(filter);

        res.json({
            success: true,
            data: {
                applications,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get my applications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch your applications',
            error: error.message
        });
    }
};

// Get Exhibitors by Expo (Public)
const getExhibitorsByExpo = async (req, res) => {
    try {
        const { expoId } = req.params;
        const { industry, search, page = 1, limit = 20 } = req.query;

        const filter = { 
            expo: expoId, 
            'applicationInfo.status': 'approved' 
        };

        if (industry) filter['companyInfo.industry'] = industry;

        if (search) {
            filter.$or = [
                { 'companyInfo.name': { $regex: search, $options: 'i' } },
                { 'companyInfo.description': { $regex: search, $options: 'i' } },
                { 'productsServices.name': { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;

        const exhibitors = await Exhibitor.find(filter)
            .select('companyInfo productsServices assignedBooth socialMedia metrics')
            .populate('assignedBooth', 'boothNumber category position')
            .sort({ 'companyInfo.name': 1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Exhibitor.countDocuments(filter);

        res.json({
            success: true,
            data: {
                exhibitors,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get exhibitors by expo error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch exhibitors',
            error: error.message
        });
    }
};

// Assign Booth to Exhibitor
const assignBooth = async (req, res) => {
    try {
        const { id } = req.params;
        const { boothId } = req.body;

        const exhibitor = await Exhibitor.findById(id).populate('expo');
        if (!exhibitor) {
            return res.status(404).json({
                success: false,
                message: 'Exhibitor not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && exhibitor.expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Check if exhibitor is approved
        if (exhibitor.applicationInfo.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Exhibitor must be approved before booth assignment'
            });
        }

        // Check if booth is available
        const booth = await Booth.findById(boothId);
        if (!booth || booth.expo.toString() !== exhibitor.expo._id.toString()) {
            return res.status(404).json({
                success: false,
                message: 'Booth not found or not in the same expo'
            });
        }

        if (booth.status !== 'available') {
            return res.status(400).json({
                success: false,
                message: 'Booth is not available'
            });
        }

        // Release previous booth if any
        if (exhibitor.assignedBooth) {
            await Booth.findByIdAndUpdate(exhibitor.assignedBooth, {
                status: 'available',
                exhibitor: null
            });
        }

        // Assign new booth
        booth.status = 'booked';
        booth.exhibitor = exhibitor.user;
        await booth.save();

        exhibitor.assignedBooth = boothId;
        await exhibitor.save();

        await exhibitor.populate('assignedBooth', 'boothNumber category size');

        res.json({
            success: true,
            message: 'Booth assigned successfully',
            data: { exhibitor }
        });
    } catch (error) {
        console.error('Assign booth error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign booth',
            error: error.message
        });
    }
};

// Get Exhibitor Analytics
const getExhibitorAnalytics = async (req, res) => {
    try {
        const { id } = req.params;

        const exhibitor = await Exhibitor.findById(id);
        if (!exhibitor) {
            return res.status(404).json({
                success: false,
                message: 'Exhibitor not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            exhibitor.user.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const analytics = {
            boothVisits: exhibitor.metrics.boothVisits,
            leadsGenerated: exhibitor.metrics.leadsGenerated,
            meetings: exhibitor.metrics.meetings,
            rating: exhibitor.metrics.rating,
            productsCount: exhibitor.productsServices.length,
            staffCount: exhibitor.staffMembers.length,
            marketingMaterialsCount: exhibitor.marketingMaterials.length
        };

        res.json({
            success: true,
            data: { analytics }
        });
    } catch (error) {
        console.error('Get exhibitor analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch exhibitor analytics',
            error: error.message
        });
    }
};

module.exports = {
    applyAsExhibitor,
    getExhibitorApplications,
    getExhibitorById,
    updateExhibitorApplication,
    reviewExhibitorApplication,
    getMyApplications,
    getExhibitorsByExpo,
    assignBooth,
    getExhibitorAnalytics
}; 