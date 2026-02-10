const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const botManager = require('../lib/botManager');
const db = require('../lib/database');

// Connect bot
router.post('/connect', auth, async (req, res) => {
    try {
        const { number } = req.body;
        const userId = req.user.id;

        if (!number) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        // Check coins
        const user = await db.User.findById(userId);
        if (user.coins < 10) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient coins. 10 coins required to connect a bot.'
            });
        }

        if (botManager.isNumberConnected(number)) {
            return res.status(400).json({
                success: false,
                message: 'This bot is already connected'
            });
        }

        const result = await botManager.connectBot(number, userId, {});

        if (result.status === 'pairing_required') {
            // Deduct coins
            await db.updateUserCoins(userId, -10, 'bot_creation');

            res.json({
                success: true,
                pairing: true,
                code: result.code,
                message: 'Pairing code generated'
            });
        } else {
            res.json({
                success: true,
                pairing: false,
                message: 'Bot connected successfully'
            });
        }

    } catch (error) {
        console.error('Bot connection error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Disconnect bot
router.post('/disconnect', auth, async (req, res) => {
    try {
        const { number } = req.body;

        const success = await botManager.disconnectBot(number);

        if (success) {
            res.json({
                success: true,
                message: 'Bot disconnected successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Bot not found or already disconnected'
            });
        }

    } catch (error) {
        console.error('Bot disconnection error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get user bots
router.get('/my-bots', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const bots = await db.getUserBots(userId);

        const botsWithStatus = bots.map(bot => {
            const status = botManager.getConnectionStatus(bot.number);
            return {
                number: bot.number,
                isActive: bot.isActive,
                config: bot.config,
                connectionStatus: status,
                stats: bot.stats,
                lastActive: bot.lastActive,
                createdAt: bot.createdAt
            };
        });

        res.json({
            success: true,
            bots: botsWithStatus
        });

    } catch (error) {
        console.error('Get bots error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching bots'
        });
    }
});

// Update bot config
router.put('/config', auth, async (req, res) => {
    try {
        const { number, config } = req.body;

        if (!number || !config) {
            return res.status(400).json({
                success: false,
                message: 'Number and configuration are required'
            });
        }

        botManager.updateBotConfig(number, config);

        res.json({
            success: true,
            message: 'Configuration updated successfully'
        });

    } catch (error) {
        console.error('Config update error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get bot status
router.get('/status/:number', auth, async (req, res) => {
    try {
        const { number } = req.params;
        const status = botManager.getConnectionStatus(number);

        res.json({
            success: true,
            status
        });

    } catch (error) {
        console.error('Bot status error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
