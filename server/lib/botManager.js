const { makeWASocket, useMultiFileAuthState, Browsers, makeCacheableSignalKeyStore, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs-extra');

const db = require('./database');
const commandHandler = require('./commandHandler');
const groupManager = require('./groupManager');

class BotManager {
    constructor() {
        this.activeSockets = new Map();
        this.socketCreationTime = new Map();
        this.defaultConfig = {
            AUTO_VIEW_STATUS: 'true',
            AUTO_LIKE_STATUS: 'true',
            AUTO_RECORDING: 'false',
            AUTO_LIKE_EMOJI: ['🖤', '🍬', '💫', '🎈'],
            WORK_TYPE: 'public',
            ANTI_CALL: 'off'
        };
    }

    initialize() {
        console.log('🤖 Bot Manager initialized');
        this.autoReconnectAll();
    }

    async connectBot(number, userId, userConfig = {}) {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        
        if (this.activeSockets.has(sanitizedNumber)) {
            throw new Error('Bot already connected');
        }

        const sessionPath = path.join(__dirname, '../sessions', `session_${sanitizedNumber}`);
        
        try {
            const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
            const logger = pino({ level: 'silent' });

            const socket = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                printQRInTerminal: false,
                logger,
                browser: Browsers.macOS('Safari')
            });

            this.activeSockets.set(sanitizedNumber, socket);
            this.socketCreationTime.set(sanitizedNumber, Date.now());

            // Setup all handlers
            this.setupSocketHandlers(socket, sanitizedNumber, userId, userConfig);

            // Handle pairing for new sessions
            if (!socket.authState.creds.registered) {
                const pairingCode = await socket.requestPairingCode(sanitizedNumber);
                return { status: 'pairing_required', code: pairingCode };
            }

            return { status: 'connected' };

        } catch (error) {
            console.error(`Connection error for ${sanitizedNumber}:`, error);
            throw error;
        }
    }

    setupSocketHandlers(socket, number, userId, userConfig) {
        const config = { ...this.defaultConfig, ...userConfig };

        // Connection updates
        socket.ev.on('connection.update', async (update) => {
            if (update.connection === 'open') {
                console.log(`✅ Bot ${number} connected successfully`);
                
                // Save session to database
                await this.saveSessionToDB(socket, number, userId, config);
                
                // Send welcome message
                await this.sendWelcomeMessage(socket, number);
                
            } else if (update.connection === 'close') {
                console.log(`❌ Bot ${number} disconnected`);
                this.activeSockets.delete(number);
                this.socketCreationTime.delete(number);
            }
        });

        // Credentials updates
        socket.ev.on('creds.update', async () => {
            await this.saveSessionToDB(socket, number, userId, config);
        });

        // Message handling
        socket.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message) return;

            // Handle commands
            await commandHandler.handleCommand(socket, msg, number);
            
            // Handle auto features
            await this.handleAutoFeatures(socket, msg, config);
        });

        // Group participants updates
        socket.ev.on('group-participants.update', async (update) => {
            await groupManager.handleGroupUpdate(socket, update, number);
        });

        // Call handling
        socket.ev.on('call', async (calls) => {
            await this.handleCalls(socket, calls, config);
        });
    }

    async handleAutoFeatures(socket, message, config) {
        try {
            // Auto-view status
            if (config.AUTO_VIEW_STATUS === 'true' && message.key.remoteJid === 'status@broadcast') {
                await socket.readMessages([message.key]);
            }

            // Auto-like status
            if (config.AUTO_LIKE_STATUS === 'true' && message.key.remoteJid === 'status@broadcast') {
                const emojis = config.AUTO_LIKE_EMOJI;
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                await socket.sendMessage(message.key.remoteJid, {
                    react: {
                        text: randomEmoji,
                        key: message.key
                    }
                });
            }

            // Auto-recording in groups
            if (config.AUTO_RECORDING === 'true' && message.key.remoteJid?.endsWith('@g.us')) {
                await socket.sendPresenceUpdate('recording', message.key.remoteJid);
                setTimeout(async () => {
                    await socket.sendPresenceUpdate('available', message.key.remoteJid);
                }, 5000);
            }
        } catch (error) {
            console.error('Auto features error:', error);
        }
    }

    async handleCalls(socket, calls, config) {
        try {
            if (config.ANTI_CALL === 'on') {
                for (const call of calls) {
                    if (call.status === 'offer') {
                        await socket.rejectCall(call.id, call.from);
                        await socket.sendMessage(call.from, {
                            text: '*❌ CALL AUTO-REJECTED*'
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Call handling error:', error);
        }
    }

    async saveSessionToDB(socket, number, userId, config) {
        try {
            const sessionPath = path.join(__dirname, '../sessions', `session_${number}`);
            const credsPath = path.join(sessionPath, 'creds.json');
            
            if (await fs.pathExists(credsPath)) {
                const sessionData = await fs.readJson(credsPath);
                await db.saveBotSession(number, sessionData, config, userId);
            }
        } catch (error) {
            console.error('Session save error:', error);
        }
    }

    async sendWelcomeMessage(socket, number) {
        try {
            const userJid = `${number}@s.whatsapp.net`;
            const welcomeMessage = `
🤖 *MINI INCONNU XD V3 CONNECTED*

✅ *Bot Number:* ${number}
🕒 *Connected:* ${new Date().toLocaleString()}
⚡ *Status:* Active

📝 *Available Features:*
• Auto-View Status
• Auto-Like Status  
• Anti-Call Protection
• Group Management
• 50+ Commands

Type *.menu* to see all commands
            `.trim();

            await socket.sendMessage(userJid, { text: welcomeMessage });
        } catch (error) {
            console.error('Welcome message error:', error);
        }
    }

    // Utility methods
    isNumberConnected(number) {
        const sanitized = number.replace(/[^0-9]/g, '');
        return this.activeSockets.has(sanitized);
    }

    async disconnectBot(number) {
        const sanitized = number.replace(/[^0-9]/g, '');
        const socket = this.activeSockets.get(sanitized);
        
        if (socket) {
            await socket.ws.close();
            this.activeSockets.delete(sanitized);
            this.socketCreationTime.delete(sanitized);
            await db.deactivateBotSession(sanitized);
            return true;
        }
        return false;
    }

    updateBotConfig(number, newConfig) {
        // Config is applied in real-time through handlers
        console.log(`Config updated for ${number}:`, newConfig);
        return true;
    }

    getConnectionStatus(number) {
        const sanitized = number.replace(/[^0-9]/g, '');
        const isConnected = this.activeSockets.has(sanitized);
        const connectionTime = this.socketCreationTime.get(sanitized);
        
        return {
            isConnected,
            connectionTime: connectionTime ? new Date(connectionTime) : null,
            uptime: connectionTime ? Math.floor((Date.now() - connectionTime) / 1000) : 0
        };
    }

    async autoReconnectAll() {
        try {
            const activeSessions = await db.BotSession.find({ isActive: true });
            
            for (const session of activeSessions) {
                if (!this.isNumberConnected(session.number)) {
                    console.log(`🔄 Auto-reconnecting ${session.number}...`);
                    await this.connectBot(session.number, session.userId, session.config);
                    await delay(2000);
                }
            }
        } catch (error) {
            console.error('Auto-reconnect error:', error);
        }
    }

    getStats() {
        return {
            totalBots: this.activeSockets.size,
            connectedBots: Array.from(this.activeSockets.keys())
        };
    }
}

module.exports = new BotManager();
