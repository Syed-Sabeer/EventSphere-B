const mongoose = require('mongoose');

const expoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    theme: {
        type: String,
        trim: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    location: {
        venue: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        zipCode: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        }
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Technology', 'Healthcare', 'Education', 'Business', 'Arts', 'Fashion', 'Food', 'Automotive', 'Real Estate', 'Other']
    },
    maxCapacity: {
        type: Number,
        required: true
    },
    registrationFee: {
        type: Number,
        default: 0
    },
    boothPrice: {
        type: Number,
        required: true
    },
    floorPlan: {
        type: String, // URL to floor plan image
        default: ''
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
        default: 'draft'
    },
    featuredImage: {
        type: String,
        default: ''
    },
    tags: [{
        type: String,
        trim: true
    }],
    isPublic: {
        type: Boolean,
        default: true
    },
    registrationDeadline: {
        type: Date,
        required: true
    },
    totalBooths: {
        type: Number,
        required: true
    },
    bookedBooths: {
        type: Number,
        default: 0
    },
    attendeesCount: {
        type: Number,
        default: 0
    },
    exhibitorsCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Virtual for available booths
expoSchema.virtual('availableBooths').get(function() {
    return this.totalBooths - this.bookedBooths;
});

// Virtual to check if registration is open
expoSchema.virtual('isRegistrationOpen').get(function() {
    return new Date() < this.registrationDeadline && this.status === 'published';
});

// Virtual to check if expo is active
expoSchema.virtual('isActive').get(function() {
    const now = new Date();
    return now >= this.startDate && now <= this.endDate;
});

module.exports = mongoose.model('Expo', expoSchema); 