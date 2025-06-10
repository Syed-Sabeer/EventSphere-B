const { Booth, Expo, Exhibitor } = require('../models');

// Create Booth
const createBooth = async (req, res) => {
    try {
        const booth = new Booth(req.body);
        await booth.save();

        await booth.populate([
            { path: 'expo', select: 'title organizer' },
            { path: 'exhibitor', select: 'firstName lastName email company' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Booth created successfully',
            data: { booth }
        });
    } catch (error) {
        console.error('Create booth error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create booth',
            error: error.message
        });
    }
};

// Get Booths by Expo
const getBoothsByExpo = async (req, res) => {
    try {
        const { expoId } = req.params;
        const { status, category, available } = req.query;

        const filter = { expo: expoId };
        if (status) filter.status = status;
        if (category) filter.category = category;
        if (available === 'true') filter.status = 'available';

        const booths = await Booth.find(filter)
            .populate('exhibitor', 'firstName lastName email company')
            .sort({ boothNumber: 1 });

        res.json({
            success: true,
            data: { booths }
        });
    } catch (error) {
        console.error('Get booths by expo error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booths',
            error: error.message
        });
    }
};

// Get Booth by ID
const getBoothById = async (req, res) => {
    try {
        const { id } = req.params;

        const booth = await Booth.findById(id)
            .populate([
                { path: 'expo', select: 'title organizer startDate endDate' },
                { path: 'exhibitor', select: 'firstName lastName email company phone' }
            ]);

        if (!booth) {
            return res.status(404).json({
                success: false,
                message: 'Booth not found'
            });
        }

        res.json({
            success: true,
            data: { booth }
        });
    } catch (error) {
        console.error('Get booth by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booth',
            error: error.message
        });
    }
};

// Update Booth
const updateBooth = async (req, res) => {
    try {
        const { id } = req.params;

        const booth = await Booth.findById(id).populate('expo');
        if (!booth) {
            return res.status(404).json({
                success: false,
                message: 'Booth not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            booth.expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        Object.assign(booth, req.body);
        await booth.save();

        await booth.populate([
            { path: 'expo', select: 'title organizer' },
            { path: 'exhibitor', select: 'firstName lastName email company' }
        ]);

        res.json({
            success: true,
            message: 'Booth updated successfully',
            data: { booth }
        });
    } catch (error) {
        console.error('Update booth error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update booth',
            error: error.message
        });
    }
};

// Delete Booth
const deleteBooth = async (req, res) => {
    try {
        const { id } = req.params;

        const booth = await Booth.findById(id).populate('expo');
        if (!booth) {
            return res.status(404).json({
                success: false,
                message: 'Booth not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            booth.expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Check if booth is booked
        if (booth.status === 'booked' && booth.exhibitor) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete a booked booth'
            });
        }

        await Booth.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Booth deleted successfully'
        });
    } catch (error) {
        console.error('Delete booth error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete booth',
            error: error.message
        });
    }
};

// Reserve Booth
const reserveBooth = async (req, res) => {
    try {
        const { id } = req.params;
        const { reservationDuration = 30 } = req.body; // minutes

        const booth = await Booth.findById(id);
        if (!booth) {
            return res.status(404).json({
                success: false,
                message: 'Booth not found'
            });
        }

        if (booth.status !== 'available') {
            return res.status(400).json({
                success: false,
                message: 'Booth is not available for reservation'
            });
        }

        booth.status = 'reserved';
        booth.reservedUntil = new Date(Date.now() + reservationDuration * 60 * 1000);
        await booth.save();

        res.json({
            success: true,
            message: 'Booth reserved successfully',
            data: { booth }
        });
    } catch (error) {
        console.error('Reserve booth error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reserve booth',
            error: error.message
        });
    }
};

// Book Booth
const bookBooth = async (req, res) => {
    try {
        const { id } = req.params;
        const { exhibitorId, boothDetails } = req.body;

        const booth = await Booth.findById(id);
        if (!booth) {
            return res.status(404).json({
                success: false,
                message: 'Booth not found'
            });
        }

        if (booth.status !== 'available' && booth.status !== 'reserved') {
            return res.status(400).json({
                success: false,
                message: 'Booth is not available for booking'
            });
        }

        // Verify exhibitor exists and is approved
        const exhibitor = await Exhibitor.findOne({
            _id: exhibitorId,
            expo: booth.expo,
            'applicationInfo.status': 'approved'
        });

        if (!exhibitor) {
            return res.status(400).json({
                success: false,
                message: 'Exhibitor not found or not approved'
            });
        }

        booth.status = 'booked';
        booth.exhibitor = exhibitorId;
        booth.boothDetails = boothDetails;
        booth.reservedUntil = undefined;
        await booth.save();

        // Update exhibitor's assigned booth
        exhibitor.assignedBooth = booth._id;
        await exhibitor.save();

        // Update expo's booked booths count
        await Expo.findByIdAndUpdate(booth.expo, {
            $inc: { bookedBooths: 1 }
        });

        await booth.populate([
            { path: 'expo', select: 'title' },
            { path: 'exhibitor', select: 'firstName lastName email company' }
        ]);

        res.json({
            success: true,
            message: 'Booth booked successfully',
            data: { booth }
        });
    } catch (error) {
        console.error('Book booth error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to book booth',
            error: error.message
        });
    }
};

// Release Booth
const releaseBooth = async (req, res) => {
    try {
        const { id } = req.params;

        const booth = await Booth.findById(id).populate('expo');
        if (!booth) {
            return res.status(404).json({
                success: false,
                message: 'Booth not found'
            });
        }

        // Check permission
        if (req.user.role !== 'admin' && 
            req.user.role !== 'organizer' && 
            booth.expo.organizer.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const wasBooked = booth.status === 'booked';
        const exhibitorId = booth.exhibitor;

        booth.status = 'available';
        booth.exhibitor = null;
        booth.boothDetails = {};
        booth.reservedUntil = undefined;
        await booth.save();

        // Update exhibitor's assigned booth
        if (exhibitorId) {
            await Exhibitor.findByIdAndUpdate(exhibitorId, {
                $unset: { assignedBooth: 1 }
            });
        }

        // Update expo's booked booths count
        if (wasBooked) {
            await Expo.findByIdAndUpdate(booth.expo._id, {
                $inc: { bookedBooths: -1 }
            });
        }

        res.json({
            success: true,
            message: 'Booth released successfully',
            data: { booth }
        });
    } catch (error) {
        console.error('Release booth error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to release booth',
            error: error.message
        });
    }
};

// Get Floor Plan
const getFloorPlan = async (req, res) => {
    try {
        const { expoId } = req.params;

        const booths = await Booth.find({ expo: expoId })
            .select('boothNumber position size status category exhibitor')
            .populate('exhibitor', 'companyInfo.name companyInfo.logo');

        const floorPlan = booths.map(booth => ({
            id: booth._id,
            boothNumber: booth.boothNumber,
            position: booth.position,
            size: booth.size,
            status: booth.status,
            category: booth.category,
            exhibitor: booth.exhibitor ? {
                name: booth.exhibitor.companyInfo?.name,
                logo: booth.exhibitor.companyInfo?.logo
            } : null
        }));

        res.json({
            success: true,
            data: { floorPlan }
        });
    } catch (error) {
        console.error('Get floor plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch floor plan',
            error: error.message
        });
    }
};

// Bulk Create Booths
const bulkCreateBooths = async (req, res) => {
    try {
        const { booths } = req.body;

        const createdBooths = await Booth.insertMany(booths);

        res.status(201).json({
            success: true,
            message: `${createdBooths.length} booths created successfully`,
            data: { booths: createdBooths }
        });
    } catch (error) {
        console.error('Bulk create booths error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create booths',
            error: error.message
        });
    }
};

module.exports = {
    createBooth,
    getBoothsByExpo,
    getBoothById,
    updateBooth,
    deleteBooth,
    reserveBooth,
    bookBooth,
    releaseBooth,
    getFloorPlan,
    bulkCreateBooths
}; 