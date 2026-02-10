const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['free', 'premium'],
        default: 'free'
    },
    expiresAt: {
        type: Date,
        required: true
    },
    maxBots: {
        type: Number,
        default: 1
    },
    currentBots: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

serverSchema.virtual('isExpired').get(function() {
    return this.expiresAt < new Date();
});

module.exports = mongoose.model('Server', serverSchema);
