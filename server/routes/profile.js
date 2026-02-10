const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../lib/database');

// Get user profile
router.get('/', auth, async (req, res) => {
    try {
        const user = await db.User.findById(req.user.id).select('-password');
        const transactions = await db.Transaction.find({ userId: req.user.id })
            .sort({ timestamp: -1 })
            .limit(10);

        const servers = await db.getUserServers(req.user.id);

        res.json({
            success: true,
            user,
            transactions,
            servers
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile'
        });
    }
});

// Update profile
router.put('/', auth, async (req, res) => {
    try {
        const { name } = req.body;

        const user = await db.User.findByIdAndUpdate(
            req.user.id,
            { name },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating profile'
        });
    }
});

module.exports = router;
