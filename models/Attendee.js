const mongoose = require('mongoose');

const attendeeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Expo',
        required: true
    },
    registrationInfo: {
        registrationDate: {
            type: Date,
            default: Date.now
        },
        ticketType: {
            type: String,
            enum: ['general', 'vip', 'press', 'student', 'exhibitor'],
            default: 'general'
        },
        status: {
            type: String,
            enum: ['registered', 'confirmed', 'checked-in', 'cancelled'],
            default: 'registered'
        },
        source: {
            type: String,
            enum: ['website', 'social_media', 'email', 'referral', 'partner', 'other'],
            default: 'website'
        },
        referralCode: String,
        specialRequirements: String
    },
    personalInfo: {
        jobTitle: String,
        industry: {
            type: String,
            enum: ['Technology', 'Healthcare', 'Education', 'Finance', 'Manufacturing', 'Retail', 'Food & Beverage', 'Automotive', 'Real Estate', 'Other']
        },
        experienceLevel: {
            type: String,
            enum: ['student', 'entry', 'mid', 'senior', 'executive']
        },
        interests: [{
            type: String,
            trim: true
        }],
        objectives: [{
            type: String,
            enum: ['networking', 'learning', 'business_development', 'product_discovery', 'recruitment', 'other']
        }],
        bio: String,
        profilePicture: String
    },
    paymentInfo: {
        amount: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['pending', 'paid', 'refunded', 'complimentary'],
            default: 'pending'
        },
        paidAt: Date,
        paymentMethod: String,
        transactionId: String,
        invoiceNumber: String
    },
    checkInInfo: {
        checkedIn: {
            type: Boolean,
            default: false
        },
        checkInTime: Date,
        badgeNumber: String,
        checkInMethod: {
            type: String,
            enum: ['qr_code', 'manual', 'mobile_app']
        }
    },
    sessionRegistrations: [{
        session: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Schedule'
        },
        registeredAt: {
            type: Date,
            default: Date.now
        },
        attended: {
            type: Boolean,
            default: false
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        feedback: String
    }],
    exhibitorInteractions: [{
        exhibitor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Exhibitor'
        },
        booth: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booth'
        },
        visitedAt: {
            type: Date,
            default: Date.now
        },
        duration: Number, // in minutes
        interactionType: {
            type: String,
            enum: ['visit', 'demo', 'meeting', 'lead_scan', 'material_download']
        },
        notes: String,
        followUpRequested: {
            type: Boolean,
            default: false
        }
    }],
    bookmarkedExhibitors: [{
        exhibitor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Exhibitor'
        },
        bookmarkedAt: {
            type: Date,
            default: Date.now
        }
    }],
    networkingConnections: [{
        connectedUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        connectedAt: {
            type: Date,
            default: Date.now
        },
        connectionType: {
            type: String,
            enum: ['mutual', 'requested', 'pending']
        },
        notes: String
    }],
    preferences: {
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            sms: {
                type: Boolean,
                default: false
            },
            push: {
                type: Boolean,
                default: true
            }
        },
        privacy: {
            showProfile: {
                type: Boolean,
                default: true
            },
            allowNetworking: {
                type: Boolean,
                default: true
            },
            shareContactInfo: {
                type: Boolean,
                default: false
            }
        }
    },
    analytics: {
        totalVisitTime: {
            type: Number,
            default: 0 // in minutes
        },
        boothsVisited: {
            type: Number,
            default: 0
        },
        sessionsAttended: {
            type: Number,
            default: 0
        },
        connectionseMade: {
            type: Number,
            default: 0
        },
        materialsDownloaded: {
            type: Number,
            default: 0
        }
    },
    feedback: [{
        category: {
            type: String,
            enum: ['overall', 'venue', 'organization', 'content', 'networking', 'exhibitors']
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        submittedAt: {
            type: Date,
            default: Date.now
        }
    }],
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
        email: String
    },
    dietaryRestrictions: [String],
    accessibilityNeeds: String,
    notes: String
}, {
    timestamps: true
});

// Index for efficient queries
attendeeSchema.index({ expo: 1, user: 1 }, { unique: true });
attendeeSchema.index({ expo: 1, 'registrationInfo.status': 1 });
attendeeSchema.index({ 'personalInfo.industry': 1 });

// Virtual to check if attendee is checked in
attendeeSchema.virtual('isCheckedIn').get(function() {
    return this.checkInInfo.checkedIn;
});

// Virtual to check if payment is complete
attendeeSchema.virtual('isPaid').get(function() {
    return this.paymentInfo.status === 'paid' || this.paymentInfo.status === 'complimentary';
});

// Virtual for total sessions registered
attendeeSchema.virtual('totalSessionsRegistered').get(function() {
    return this.sessionRegistrations.length;
});

module.exports = mongoose.model('Attendee', attendeeSchema); 