const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
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
    type: {
        type: String,
        enum: ['general', 'expo', 'session', 'exhibitor', 'booth', 'venue', 'support', 'suggestion', 'complaint'],
        required: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    category: {
        type: String,
        enum: ['organization', 'content', 'venue', 'technology', 'networking', 'catering', 'logistics', 'staff', 'other']
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed', 'cancelled'],
        default: 'open'
    },
    relatedEntity: {
        entityType: {
            type: String,
            enum: ['expo', 'session', 'exhibitor', 'booth', 'user']
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId
        }
    },
    attachments: [{
        fileName: String,
        url: String,
        fileType: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    responses: [{
        respondedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        message: {
            type: String,
            required: true
        },
        respondedAt: {
            type: Date,
            default: Date.now
        },
        isInternal: {
            type: Boolean,
            default: false
        }
    }],
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedAt: Date,
    resolvedAt: Date,
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolution: String,
    isAnonymous: {
        type: Boolean,
        default: false
    },
    contactPreference: {
        type: String,
        enum: ['email', 'phone', 'in_app', 'no_contact'],
        default: 'email'
    },
    tags: [{
        type: String,
        trim: true
    }],
    isPublic: {
        type: Boolean,
        default: false
    },
    helpfulness: {
        helpful: {
            type: Number,
            default: 0
        },
        notHelpful: {
            type: Number,
            default: 0
        }
    },
    followUpRequired: {
        type: Boolean,
        default: false
    },
    followUpDate: Date,
    escalated: {
        type: Boolean,
        default: false
    },
    escalatedAt: Date,
    escalatedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    metadata: {
        userAgent: String,
        ipAddress: String,
        deviceType: String,
        location: String
    }
}, {
    timestamps: true
});

// Index for efficient queries
feedbackSchema.index({ expo: 1, type: 1 });
feedbackSchema.index({ expo: 1, status: 1 });
feedbackSchema.index({ user: 1, expo: 1 });
feedbackSchema.index({ assignedTo: 1, status: 1 });
feedbackSchema.index({ priority: 1, status: 1 });

// Virtual to check if feedback is resolved
feedbackSchema.virtual('isResolved').get(function() {
    return this.status === 'resolved' || this.status === 'closed';
});

// Virtual to get response count
feedbackSchema.virtual('responseCount').get(function() {
    return this.responses.length;
});

// Virtual to check if feedback needs attention
feedbackSchema.virtual('needsAttention').get(function() {
    const daysSinceCreated = (new Date() - this.createdAt) / (1000 * 60 * 60 * 24);
    return (this.status === 'open' && daysSinceCreated > 2) || 
           (this.priority === 'urgent' && this.status !== 'resolved') ||
           this.escalated;
});

module.exports = mongoose.model('Feedback', feedbackSchema); 