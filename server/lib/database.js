const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

class DatabaseManager {
    constructor() {
        this.connected = false;
        this.models = {};
    }

    async connect() {
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            this.connected = true;
            console.log('✅ MongoDB connected successfully');
            this.initializeModels();
        } catch (error) {
            console.error('❌ MongoDB connection error:', error);
            throw error;
        }
    }

    initializeModels() {
        this.User = require('../models/User');
        this.BotSession = require('../models/BotSession');
        this.Server = require('../models/Server');
        this.Transaction = require('../models/Transaction');
    }

    // User operations
    async createUser(userData) {
        const user = new this.User(userData);
        return await user.save();
    }

    async findUser(query) {
        return await this.User.findOne(query);
    }

    async updateUserCoins(userId, coinsChange, reason = 'system') {
        const user = await this.User.findByIdAndUpdate(
            userId,
            { $inc: { coins: coinsChange } },
            { new: true }
        );

        if (coinsChange !== 0) {
            const transaction = new this.Transaction({
                userId,
                type: coinsChange > 0 ? 'credit' : 'debit',
                amount: Math.abs(coinsChange),
                reason,
                balance: user.coins
            });
            await transaction.save();
        }

        return user;
    }

    // Bot session operations
    async getBotSession(number) {
        return await this.BotSession.findOne({ number });
    }

    async saveBotSession(number, sessionData, config, userId) {
        return await this.BotSession.findOneAndUpdate(
            { number },
            {
                userId,
                sessionData,
                config,
                lastActive: new Date(),
                isActive: true
            },
            { upsert: true, new: true }
        );
    }

    async getUserBots(userId) {
        return await this.BotSession.find({ userId });
    }

    async deactivateBotSession(number) {
        return await this.BotSession.findOneAndUpdate(
            { number },
            { isActive: false, deactivatedAt: new Date() }
        );
    }

    // Server operations
    async createServer(userId, serverData) {
        const server = new this.Server({
            userId,
            ...serverData,
            expiresAt: new Date(Date.now() + (serverData.days * 24 * 60 * 60 * 1000))
        });
        return await server.save();
    }

    async getUserServers(userId) {
        return await this.Server.find({ userId });
    }

    // Stats
    async getStats() {
        const totalUsers = await this.User.countDocuments();
        const totalBots = await this.BotSession.countDocuments({ isActive: true });
        const todayCommands = await this.Transaction.countDocuments({
            timestamp: { $gte: new Date().setHours(0,0,0,0) }
        });

        return { totalUsers, totalBots, todayCommands };
    }
}

module.exports = new DatabaseManager();
