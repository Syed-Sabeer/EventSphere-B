const mongoose = require('mongoose');

const exhibitorSchema = new mongoose.Schema({
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
    companyInfo: {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        industry: {
            type: String,
            required: true,
            enum: ['Technology', 'Healthcare', 'Education', 'Finance', 'Manufacturing', 'Retail', 'Food & Beverage', 'Automotive', 'Real Estate', 'Other']
        },
        website: {
            type: String,
            trim: true
        },
        logo: {
            type: String,
            default: ''
        },
        foundedYear: Number,
        employeeCount: {
            type: String,
            enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
        },
        headquarters: {
            address: String,
            city: String,
            state: String,
            country: String,
            zipCode: String
        }
    },
    contactInfo: {
        primaryContact: {
            name: {
                type: String,
                required: true
            },
            title: String,
            email: {
                type: String,
                required: true
            },
            phone: {
                type: String,
                required: true
            }
        },
        alternateContact: {
            name: String,
            title: String,
            email: String,
            phone: String
        }
    },
    productsServices: [{
        name: {
            type: String,
            required: true
        },
        description: String,
        category: String,
        image: String,
        price: Number,
        isNew: {
            type: Boolean,
            default: false
        }
    }],
    applicationInfo: {
        applicationDate: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'waitlisted'],
            default: 'pending'
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reviewedAt: Date,
        reviewNotes: String,
        documents: [{
            name: String,
            url: String,
            type: {
                type: String,
                enum: ['business_license', 'insurance', 'product_catalog', 'company_profile', 'other']
            },
            uploadedAt: {
                type: Date,
                default: Date.now
            }
        }]
    },
    boothRequirements: {
        preferredSize: {
            type: String,
            enum: ['small', 'medium', 'large', 'custom']
        },
        specialRequirements: String,
        budget: {
            min: Number,
            max: Number
        },
        powerRequirements: String,
        setupTime: String
    },
    assignedBooth: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booth'
    },
    paymentInfo: {
        amount: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['pending', 'paid', 'partial', 'refunded'],
            default: 'pending'
        },
        dueDate: Date,
        paidAt: Date,
        paymentMethod: String,
        transactionId: String
    },
    staffMembers: [{
        name: {
            type: String,
            required: true
        },
        role: String,
        email: String,
        phone: String,
        badgeType: {
            type: String,
            enum: ['exhibitor', 'staff', 'manager'],
            default: 'staff'
        }
    }],
    socialMedia: {
        facebook: String,
        twitter: String,
        linkedin: String,
        instagram: String
    },
    marketingMaterials: [{
        type: {
            type: String,
            enum: ['brochure', 'flyer', 'banner', 'video', 'other']
        },
        title: String,
        url: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    metrics: {
        boothVisits: {
            type: Number,
            default: 0
        },
        leadsGenerated: {
            type: Number,
            default: 0
        },
        meetings: {
            type: Number,
            default: 0
        },
        rating: {
            average: {
                type: Number,
                default: 0
            },
            count: {
                type: Number,
                default: 0
            }
        }
    },
    notes: String
}, {
    timestamps: true
});

// Index for efficient queries
exhibitorSchema.index({ expo: 1, user: 1 }, { unique: true });
exhibitorSchema.index({ expo: 1, 'applicationInfo.status': 1 });
exhibitorSchema.index({ 'companyInfo.industry': 1 });

// Virtual to check if application is approved
exhibitorSchema.virtual('isApproved').get(function() {
    return this.applicationInfo.status === 'approved';
});

// Virtual to check if payment is complete
exhibitorSchema.virtual('isPaid').get(function() {
    return this.paymentInfo.status === 'paid';
});

module.exports = mongoose.model('Exhibitor', exhibitorSchema); 