const express = require('express');
const router = express.Router();
const {
    ensureAdmin,
    logAdminAction,
    validateAdminInput,
    canModifyUser,
    adminRateLimit
} = require('../middleware/admin');
const { getValidationRules } = require('../middleware/adminValidation');

// Apply admin middleware to all routes
router.use(ensureAdmin);
router.use(adminRateLimit(60000, 100)); // 100 requests per minute

// Get admin dashboard
router.get('/dashboard', 
    logAdminAction('view_dashboard'),
    async (req, res) => {
        // Dashboard logic here
    }
);

// Manage user coins
router.post('/coins',
    logAdminAction('manage_coins'),
    validateAdminInput(getValidationRules('coinManagement')),
    canModifyUser,
    async (req, res) => {
        // Coin management logic here
        const { userId, amount, reason } = req.body;
        
        try {
            // Your coin management logic
            res.json({
                success: true,
                message: `Successfully ${amount > 0 ? 'added' : 'removed'} ${Math.abs(amount)} coins`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error managing coins'
            });
        }
    }
);

// Promote user to admin
router.post('/promote',
    logAdminAction('promote_user'),
    validateAdminInput(getValidationRules('userManagement')),
    canModifyUser,
    async (req, res) => {
        const { userId } = req.body;
        
        try {
            // Your promotion logic here
            res.json({
                success: true,
                message: 'User promoted to admin successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error promoting user'
            });
        }
    }
);

// Get admin logs
router.get('/logs',
    logAdminAction('view_logs'),
    async (req, res) => {
        try {
            const AdminAction = require('../models/AdminAction');
            const logs = await AdminAction.getRecentActions(100);
            
            res.json({
                success: true,
                logs: logs
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching logs'
            });
        }
    }
);

module.exports = router;
