const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../lib/database');

/**
 * @route GET /api/servers/my-servers
 * @description Get all servers for the current user
 * @access Private
 */
router.get('/my-servers', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const servers = await db.getUserServers(userId);

        // Add server status (active/expired)
        const serversWithStatus = servers.map(server => ({
            ...server.toObject(),
            status: server.expiresAt > new Date() ? 'active' : 'expired',
            daysRemaining: Math.ceil((server.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
        }));

        res.json({
            success: true,
            servers: serversWithStatus
        });

    } catch (error) {
        console.error('Get user servers error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching servers'
        });
    }
});

/**
 * @route POST /api/servers/create-free
 * @description Create a free trial server for 3 days
 * @access Private
 */
router.post('/create-free', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Check if user already has a free server
        const existingServers = await db.getUserServers(userId);
        const hasFreeServer = existingServers.some(server => 
            server.type === 'free' && server.expiresAt > new Date()
        );

        if (hasFreeServer) {
            return res.status(400).json({
                success: false,
                message: 'You already have an active free server'
            });
        }

        // Check user coins
        const user = await db.User.findById(userId);
        if (user.coins < 0) { // Free server doesn't cost coins
            return res.status(400).json({
                success: false,
                message: 'Insufficient coins for server creation'
            });
        }

        // Create free server
        const serverData = {
            name: `Free Server - ${user.name}`,
            type: 'free',
            days: 3, // 3 days free trial
            maxBots: 1,
            config: {
                cpu: '1 core',
                memory: '512MB',
                storage: '10GB'
            }
        };

        const server = await db.createServer(userId, serverData);

        res.json({
            success: true,
            message: 'Free server created successfully for 3 days!',
            server: {
                ...server.toObject(),
                status: 'active',
                daysRemaining: 3
            }
        });

    } catch (error) {
        console.error('Create free server error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating free server'
        });
    }
});

/**
 * @route POST /api/servers/create-premium
 * @description Create a premium server
 * @access Private
 */
router.post('/create-premium', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, duration = 30, botCount = 5 } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Server name is required'
            });
        }

        // Calculate cost (example: 50 coins per month per bot)
        const cost = duration * botCount * 50;

        // Check user coins
        const user = await db.User.findById(userId);
        if (user.coins < cost) {
            return res.status(400).json({
                success: false,
                message: `Insufficient coins. Required: ${cost}, Available: ${user.coins}`
            });
        }

        // Create premium server
        const serverData = {
            name: name,
            type: 'premium',
            days: duration,
            maxBots: botCount,
            config: {
                cpu: '2 cores',
                memory: '2GB',
                storage: '50GB'
            }
        };

        const server = await db.createServer(userId, serverData);

        // Deduct coins
        await db.updateUserCoins(userId, -cost, 'server_purchase');

        res.json({
            success: true,
            message: `Premium server created successfully for ${duration} days!`,
            server: {
                ...server.toObject(),
                status: 'active',
                daysRemaining: duration,
                cost: cost
            }
        });

    } catch (error) {
        console.error('Create premium server error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating premium server'
        });
    }
});

/**
 * @route PUT /api/servers/:serverId
 * @description Update server information
 * @access Private
 */
router.put('/:serverId', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { serverId } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Server name is required'
            });
        }

        // Check if server belongs to user
        const server = await db.Server.findOne({ _id: serverId, userId });
        if (!server) {
            return res.status(404).json({
                success: false,
                message: 'Server not found or access denied'
            });
        }

        // Update server name
        server.name = name;
        await server.save();

        res.json({
            success: true,
            message: 'Server updated successfully',
            server: server
        });

    } catch (error) {
        console.error('Update server error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating server'
        });
    }
});

/**
 * @route POST /api/servers/:serverId/renew
 * @description Renew an expired server
 * @access Private
 */
router.post('/:serverId/renew', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { serverId } = req.params;
        const { duration = 30 } = req.body;

        // Check if server belongs to user
        const server = await db.Server.findOne({ _id: serverId, userId });
        if (!server) {
            return res.status(404).json({
                success: false,
                message: 'Server not found or access denied'
            });
        }

        // Calculate renewal cost based on server type
        let cost;
        if (server.type === 'free') {
            // Convert free server to premium
            cost = duration * server.maxBots * 50;
            server.type = 'premium';
        } else {
            cost = duration * server.maxBots * 50;
        }

        // Check user coins
        const user = await db.User.findById(userId);
        if (user.coins < cost) {
            return res.status(400).json({
                success: false,
                message: `Insufficient coins. Required: ${cost}, Available: ${user.coins}`
            });
        }

        // Calculate new expiration date
        const currentExpiry = server.expiresAt > new Date() ? server.expiresAt : new Date();
        const newExpiry = new Date(currentExpiry);
        newExpiry.setDate(newExpiry.getDate() + duration);

        server.expiresAt = newExpiry;
        await server.save();

        // Deduct coins
        await db.updateUserCoins(userId, -cost, 'server_renewal');

        res.json({
            success: true,
            message: `Server renewed successfully for ${duration} days!`,
            server: {
                ...server.toObject(),
                status: 'active',
                daysRemaining: Math.ceil((server.expiresAt - new Date()) / (1000 * 60 * 60 * 24)),
                cost: cost
            }
        });

    } catch (error) {
        console.error('Renew server error:', error);
        res.status(500).json({
            success: false,
            message: 'Error renewing server'
        });
    }
});

/**
 * @route POST /api/servers/:serverId/upgrade
 * @description Upgrade server (increase bot capacity)
 * @access Private
 */
router.post('/:serverId/upgrade', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { serverId } = req.params;
        const { newBotCount } = req.body;

        if (!newBotCount || newBotCount < 1) {
            return res.status(400).json({
                success: false,
                message: 'Valid bot count is required'
            });
        }

        // Check if server belongs to user
        const server = await db.Server.findOne({ _id: serverId, userId });
        if (!server) {
            return res.status(404).json({
                success: false,
                message: 'Server not found or access denied'
            });
        }

        // Check if downgrading (not allowed)
        if (newBotCount < server.maxBots) {
            return res.status(400).json({
                success: false,
                message: 'Cannot downgrade server capacity'
            });
        }

        // Calculate upgrade cost
        const additionalBots = newBotCount - server.maxBots;
        const cost = additionalBots * 100; // 100 coins per additional bot

        // Check user coins
        const user = await db.User.findById(userId);
        if (user.coins < cost) {
            return res.status(400).json({
                success: false,
                message: `Insufficient coins. Required: ${cost}, Available: ${user.coins}`
            });
        }

        // Update server capacity
        server.maxBots = newBotCount;
        await server.save();

        // Deduct coins
        await db.updateUserCoins(userId, -cost, 'server_upgrade');

        res.json({
            success: true,
            message: `Server upgraded to ${newBotCount} bots successfully!`,
            server: server,
            cost: cost
        });

    } catch (error) {
        console.error('Upgrade server error:', error);
        res.status(500).json({
            success: false,
            message: 'Error upgrading server'
        });
    }
});

/**
 * @route DELETE /api/servers/:serverId
 * @description Delete a server (only if no active bots)
 * @access Private
 */
router.delete('/:serverId', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { serverId } = req.params;

        // Check if server belongs to user
        const server = await db.Server.findOne({ _id: serverId, userId });
        if (!server) {
            return res.status(404).json({
                success: false,
                message: 'Server not found or access denied'
            });
        }

        // Check if server has active bots
        const activeBots = await db.BotSession.countDocuments({ 
            serverId: serverId, 
            isActive: true 
        });

        if (activeBots > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete server with active bots. Please disconnect bots first.'
            });
        }

        // Delete server
        await db.Server.findByIdAndDelete(serverId);

        res.json({
            success: true,
            message: 'Server deleted successfully'
        });

    } catch (error) {
        console.error('Delete server error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting server'
        });
    }
});

/**
 * @route GET /api/servers/pricing
 * @description Get server pricing information
 * @access Public
 */
router.get('/pricing', async (req, res) => {
    try {
        const pricing = {
            free: {
                name: 'Free Trial',
                description: 'Perfect for testing the platform',
                duration: '3 days',
                maxBots: 1,
                features: [
                    '1 WhatsApp Bot',
                    'Basic Features',
                    '3 Days Trial',
                    'Community Support'
                ],
                cost: 0,
                popular: false
            },
            premium: {
                name: 'Premium',
                description: 'For serious users and small businesses',
                duration: '30 days',
                maxBots: 5,
                features: [
                    'Up to 5 WhatsApp Bots',
                    'All Premium Features',
                    'Priority Support',
                    'Advanced Analytics',
                    'Custom Configurations'
                ],
                cost: 250, // 5 bots * 30 days * 50 coins
                costPerBot: 50,
                popular: true
            },
            business: {
                name: 'Business',
                description: 'For agencies and large-scale operations',
                duration: '30 days',
                maxBots: 20,
                features: [
                    'Up to 20 WhatsApp Bots',
                    'All Premium Features',
                    '24/7 Priority Support',
                    'Advanced Management',
                    'API Access',
                    'Custom Development'
                ],
                cost: 1000, // 20 bots * 30 days * 50 coins
                costPerBot: 50,
                popular: false
            }
        };

        res.json({
            success: true,
            pricing: pricing
        });

    } catch (error) {
        console.error('Get pricing error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pricing information'
        });
    }
});

/**
 * @route GET /api/servers/stats
 * @description Get server statistics for the user
 * @access Private
 */
router.get('/stats', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        const servers = await db.getUserServers(userId);
        
        const stats = {
            totalServers: servers.length,
            activeServers: servers.filter(s => s.expiresAt > new Date()).length,
            expiredServers: servers.filter(s => s.expiresAt <= new Date()).length,
            freeServers: servers.filter(s => s.type === 'free').length,
            premiumServers: servers.filter(s => s.type === 'premium').length,
            totalBotCapacity: servers.reduce((sum, server) => sum + server.maxBots, 0),
            usedBotCapacity: await db.BotSession.countDocuments({ userId, isActive: true }),
            totalCost: servers.reduce((sum, server) => {
                // This would need actual cost tracking in a real implementation
                return sum + (server.type === 'premium' ? 250 : 0);
            }, 0)
        };

        // Add days until next expiry
        const activeServers = servers.filter(s => s.expiresAt > new Date());
        if (activeServers.length > 0) {
            const nearestExpiry = Math.min(...activeServers.map(s => s.expiresAt));
            stats.daysUntilNextExpiry = Math.ceil((nearestExpiry - new Date()) / (1000 * 60 * 60 * 24));
        } else {
            stats.daysUntilNextExpiry = 0;
        }

        res.json({
            success: true,
            stats: stats
        });

    } catch (error) {
        console.error('Get server stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching server statistics'
        });
    }
});

/**
 * @route POST /api/servers/transfer-bot
 * @description Transfer a bot to a different server
 * @access Private
 */
router.post('/transfer-bot', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { botNumber, targetServerId } = req.body;

        if (!botNumber || !targetServerId) {
            return res.status(400).json({
                success: false,
                message: 'Bot number and target server ID are required'
            });
        }

        // Check if bot belongs to user
        const bot = await db.BotSession.findOne({ number: botNumber, userId });
        if (!bot) {
            return res.status(404).json({
                success: false,
                message: 'Bot not found or access denied'
            });
        }

        // Check if target server belongs to user and has capacity
        const targetServer = await db.Server.findOne({ _id: targetServerId, userId });
        if (!targetServer) {
            return res.status(404).json({
                success: false,
                message: 'Target server not found or access denied'
            });
        }

        // Check server capacity
        const currentBotsOnTarget = await db.BotSession.countDocuments({ 
            serverId: targetServerId, 
            isActive: true 
        });

        if (currentBotsOnTarget >= targetServer.maxBots) {
            return res.status(400).json({
                success: false,
                message: 'Target server has reached maximum bot capacity'
            });
        }

        // Transfer bot to new server
        bot.serverId = targetServerId;
        await bot.save();

        res.json({
            success: true,
            message: `Bot ${botNumber} transferred to server ${targetServer.name} successfully`
        });

    } catch (error) {
        console.error('Transfer bot error:', error);
        res.status(500).json({
            success: false,
            message: 'Error transferring bot'
        });
    }
});

/**
 * @route GET /api/servers/:serverId/bots
 * @description Get all bots for a specific server
 * @access Private
 */
router.get('/:serverId/bots', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { serverId } = req.params;

        // Check if server belongs to user
        const server = await db.Server.findOne({ _id: serverId, userId });
        if (!server) {
            return res.status(404).json({
                success: false,
                message: 'Server not found or access denied'
            });
        }

        // Get bots for this server
        const bots = await db.BotSession.find({ userId, serverId });

        res.json({
            success: true,
            server: server,
            bots: bots,
            usage: {
                current: bots.length,
                max: server.maxBots,
                percentage: (bots.length / server.maxBots) * 100
            }
        });

    } catch (error) {
        console.error('Get server bots error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching server bots'
        });
    }
});

module.exports = router;
