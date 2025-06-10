const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    expo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Expo',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['keynote', 'workshop', 'panel', 'presentation', 'networking', 'break', 'other'],
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        required: true // Format: "HH:MM"
    },
    endTime: {
        type: String,
        required: true // Format: "HH:MM"
    },
    location: {
        room: {
            type: String,
            required: true
        },
        capacity: {
            type: Number,
            required: true
        },
        floor: String,
        building: String
    },
    speakers: [{
        name: {
            type: String,
            required: true
        },
        title: String,
        company: String,
        bio: String,
        photo: String,
        email: String,
        linkedin: String
    }],
    topics: [{
        type: String,
        trim: true
    }],
    attendees: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        registeredAt: {
            type: Date,
            default: Date.now
        },
        attended: {
            type: Boolean,
            default: false
        }
    }],
    maxAttendees: {
        type: Number,
        required: true
    },
    registrationRequired: {
        type: Boolean,
        default: true
    },
    fee: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    materials: [{
        title: String,
        url: String,
        type: {
            type: String,
            enum: ['pdf', 'presentation', 'video', 'link', 'other']
        }
    }],
    tags: [{
        type: String,
        trim: true
    }],
    rating: {
        average: {
            type: Number,
            default: 0
        },
        count: {
            type: Number,
            default: 0
        }
    },
    feedback: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Index for efficient queries
scheduleSchema.index({ expo: 1, date: 1, startTime: 1 });
scheduleSchema.index({ expo: 1, type: 1 });

// Virtual for current attendance count
scheduleSchema.virtual('currentAttendees').get(function() {
    return this.attendees.length;
});

// Virtual for available spots
scheduleSchema.virtual('availableSpots').get(function() {
    return this.maxAttendees - this.attendees.length;
});

// Virtual to check if session is full
scheduleSchema.virtual('isFull').get(function() {
    return this.attendees.length >= this.maxAttendees;
});

// Virtual to check if session is ongoing
scheduleSchema.virtual('isOngoing').get(function() {
    const now = new Date();
    const sessionDate = new Date(this.date);
    const [startHour, startMin] = this.startTime.split(':');
    const [endHour, endMin] = this.endTime.split(':');
    
    const startDateTime = new Date(sessionDate);
    startDateTime.setHours(parseInt(startHour), parseInt(startMin));
    
    const endDateTime = new Date(sessionDate);
    endDateTime.setHours(parseInt(endHour), parseInt(endMin));
    
    return now >= startDateTime && now <= endDateTime;
});

module.exports = mongoose.model('Schedule', scheduleSchema); 