const mongoose = require('mongoose');

const botSessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    number: {
        type: String,
        required: true,
        unique: true
    },
    sessionData: {
        type: Object,
        required: true
    },
    config: {
        AUTO_VIEW_STATUS: {
            type: String,
            default: 'true'
        },
        AUTO_LIKE_STATUS: {
            type: String,
            default: 'true'
        },
        AUTO_RECORDING: {
            type: String,
            default: 'false'
        },
        AUTO_LIKE_EMOJI: {
            type: [String],
            default: ['🖤', '🍬', '💫', '🎈']
        },
        WORK_TYPE: {
            type: String,
            default: 'public'
        },
        ANTI_CALL: {
            type: String,
            default: 'off'
        }
    },
    isActive: {
        type: Boolean,
        default: false
    },
    serverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Server'
    },
    stats: {
        messagesProcessed: {
            type: Number,
            default: 0
        },
        commandsExecuted: {
            type: Number,
            default: 0
        }
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    deactivatedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('BotSession', botSessionSchema);
