const mongoose = require('mongoose');

const boothSchema = new mongoose.Schema({
    boothNumber: {
        type: String,
        required: true
    },
    expo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Expo',
        required: true
    },
    exhibitor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    size: {
        width: {
            type: Number,
            required: true
        },
        height: {
            type: Number,
            required: true
        },
        unit: {
            type: String,
            enum: ['ft', 'm'],
            default: 'ft'
        }
    },
    position: {
        x: {
            type: Number,
            required: true
        },
        y: {
            type: Number,
            required: true
        }
    },
    price: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['available', 'reserved', 'booked', 'occupied', 'maintenance'],
        default: 'available'
    },
    category: {
        type: String,
        enum: ['standard', 'premium', 'corner', 'island'],
        default: 'standard'
    },
    amenities: [{
        type: String,
        enum: ['power', 'internet', 'water', 'storage', 'lighting', 'carpet', 'furniture']
    }],
    description: {
        type: String,
        trim: true
    },
    reservedUntil: {
        type: Date
    },
    boothDetails: {
        companyName: String,
        companyLogo: String,
        companyDescription: String,
        productsServices: [String],
        contactPerson: {
            name: String,
            email: String,
            phone: String
        },
        staffMembers: [{
            name: String,
            role: String,
            email: String
        }]
    },
    setupRequirements: {
        electricalLoad: Number,
        specialRequests: String,
        deliveryInstructions: String
    },
    visitorsCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for efficient queries
boothSchema.index({ expo: 1, boothNumber: 1 }, { unique: true });
boothSchema.index({ expo: 1, status: 1 });

// Virtual for booth area
boothSchema.virtual('area').get(function() {
    return this.size.width * this.size.height;
});

// Virtual to check if booth is available
boothSchema.virtual('isAvailable').get(function() {
    return this.status === 'available' && (!this.reservedUntil || this.reservedUntil < new Date());
});

module.exports = mongoose.model('Booth', boothSchema); 