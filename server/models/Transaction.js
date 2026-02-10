const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    balance: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true,
        enum: [
            'registration',
            'referral',
            'bot_creation',
            'server_purchase',
            'admin_grant',
            'system'
        ]
    },
    description: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);
