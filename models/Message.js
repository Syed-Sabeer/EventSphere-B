const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    expo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Expo',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
    type: {
        type: String,
        enum: ['inquiry', 'meeting_request', 'follow_up', 'support', 'general', 'announcement'],
        default: 'general'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read', 'replied', 'archived'],
        default: 'sent'
    },
    thread: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message' // Reference to the original message in the thread
    },
    attachments: [{
        fileName: String,
        url: String,
        fileType: String,
        fileSize: Number,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    readAt: Date,
    repliedAt: Date,
    isStarred: {
        sender: {
            type: Boolean,
            default: false
        },
        recipient: {
            type: Boolean,
            default: false
        }
    },
    isDeleted: {
        sender: {
            type: Boolean,
            default: false
        },
        recipient: {
            type: Boolean,
            default: false
        }
    },
    context: {
        contextType: {
            type: String,
            enum: ['booth', 'session', 'expo', 'networking', 'general']
        },
        contextId: {
            type: mongoose.Schema.Types.ObjectId
        }
    },
    metadata: {
        userAgent: String,
        ipAddress: String,
        deviceType: String
    },
    scheduledFor: Date, // For scheduled messages
    autoReply: {
        type: Boolean,
        default: false
    },
    tags: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true
});

// Index for efficient queries
messageSchema.index({ expo: 1, sender: 1, recipient: 1 });
messageSchema.index({ expo: 1, recipient: 1, status: 1 });
messageSchema.index({ expo: 1, sender: 1, status: 1 });
messageSchema.index({ thread: 1, createdAt: 1 });
messageSchema.index({ expo: 1, createdAt: -1 });

// Virtual to check if message is unread
messageSchema.virtual('isUnread').get(function() {
    return this.status !== 'read' && !this.readAt;
});

// Virtual to check if message has attachments
messageSchema.virtual('hasAttachments').get(function() {
    return this.attachments && this.attachments.length > 0;
});

// Method to mark message as read
messageSchema.methods.markAsRead = function() {
    this.status = 'read';
    this.readAt = new Date();
    return this.save();
};

// Method to mark message as replied
messageSchema.methods.markAsReplied = function() {
    this.status = 'replied';
    this.repliedAt = new Date();
    return this.save();
};

module.exports = mongoose.model('Message', messageSchema); 