const mongoose = require('mongoose');

const adminActionSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    adminEmail: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true
    },
    method: {
        type: String,
        required: true,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    },
    path: {
        type: String,
        required: true
    },
    params: {
        type: Object,
        default: {}
    },
    body: {
        type: Object,
        default: {}
    },
    ip: {
        type: String,
        required: true
    },
    userAgent: {
        type: String
    },
    statusCode: {
        type: Number,
        required: true
    },
    responseTime: {
        type: Number // in milliseconds
    },
    error: {
        type: Object
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index for better query performance
adminActionSchema.index({ adminId: 1, timestamp: -1 });
adminActionSchema.index({ action: 1, timestamp: -1 });
adminActionSchema.index({ timestamp: -1 });

// Static method to get recent admin actions
adminActionSchema.statics.getRecentActions = function(limit = 50) {
    return this.find()
        .populate('adminId', 'name email')
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec();
};

// Static method to get actions by admin
adminActionSchema.statics.getActionsByAdmin = function(adminId, limit = 100) {
    return this.find({ adminId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec();
};

// Static method to cleanup old logs
adminActionSchema.statics.cleanupOldLogs = function(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this.deleteMany({ timestamp: { $lt: cutoffDate } }).exec();
};

module.exports = mongoose.model('AdminAction', adminActionSchema);
