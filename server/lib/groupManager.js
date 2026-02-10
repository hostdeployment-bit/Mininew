const db = require('./database');

class GroupManager {
    constructor() {
        this.welcomeMessages = new Map();
        this.goodbyeMessages = new Map();
        this.groupSettings = new Map();
    }

    async handleGroupUpdate(socket, update, botNumber) {
        const { id: groupId, participants, action } = update;

        try {
            // Get group settings from database
            const groupSettings = await this.getGroupSettings(groupId, botNumber);
            
            // Handle different actions
            switch (action) {
                case 'add':
                    await this.handleMemberJoin(socket, groupId, participants, groupSettings);
                    break;
                    
                case 'remove':
                    await this.handleMemberLeave(socket, groupId, participants, groupSettings);
                    break;
                    
                case 'promote':
                    await this.handleAdminPromote(socket, groupId, participants, groupSettings);
                    break;
                    
                case 'demote':
                    await this.handleAdminDemote(socket, groupId, participants, groupSettings);
                    break;
            }

        } catch (error) {
            console.error('Group manager error:', error);
        }
    }

    async handleMemberJoin(socket, groupId, participants, settings) {
        if (!settings.welcomeEnabled) return;

        try {
            const metadata = await socket.groupMetadata(groupId);
            const groupName = metadata.subject;
            const membersCount = metadata.participants.length;

            for (const user of participants) {
                // Get user info
                const userInfo = await this.getUserInfo(socket, user);
                const userName = userInfo?.name || user.split('@')[0];
                
                // Format welcome message
                const welcomeMessage = this.formatWelcomeMessage(userName, groupName, membersCount);
                
                // Send welcome message
                await socket.sendMessage(groupId, {
                    image: { url: settings.welcomeImage || 'https://files.catbox.moe/bm2v7m.jpg' },
                    caption: welcomeMessage,
                    mentions: [user]
                });

                // Update stats
                await this.updateGroupStats(groupId, 'welcomeCount');
                
                // Add delay to avoid rate limiting
                await this.delay(1000);
            }

        } catch (error) {
            console.error('Welcome message error:', error);
        }
    }

    async handleMemberLeave(socket, groupId, participants, settings) {
        if (!settings.goodbyeEnabled) return;

        try {
            const metadata = await socket.groupMetadata(groupId);
            const groupName = metadata.subject;

            for (const user of participants) {
                // Get user info
                const userInfo = await this.getUserInfo(socket, user);
                const userName = userInfo?.name || user.split('@')[0];
                
                // Format goodbye message
                const goodbyeMessage = this.formatGoodbyeMessage(userName, groupName);
                
                // Send goodbye message
                await socket.sendMessage(groupId, {
                    image: { url: settings.goodbyeImage || 'https://files.catbox.moe/bm2v7m.jpg' },
                    caption: goodbyeMessage,
                    mentions: [user]
                });

                // Add delay to avoid rate limiting
                await this.delay(1000);
            }

        } catch (error) {
            console.error('Goodbye message error:', error);
        }
    }

    async handleAdminPromote(socket, groupId, participants, settings) {
        if (!settings.notifyAdminChanges) return;

        try {
            for (const user of participants) {
                const userInfo = await this.getUserInfo(socket, user);
                const userName = userInfo?.name || user.split('@')[0];
                
                const message = `👑 *ADMIN PROMOTION*\n\n@${userName} has been promoted to admin in this group!`;
                
                await socket.sendMessage(groupId, {
                    text: message,
                    mentions: [user]
                });
            }
        } catch (error) {
            console.error('Admin promote notification error:', error);
        }
    }

    async handleAdminDemote(socket, groupId, participants, settings) {
        if (!settings.notifyAdminChanges) return;

        try {
            for (const user of participants) {
                const userInfo = await this.getUserInfo(socket, user);
                const userName = userInfo?.name || user.split('@')[0];
                
                const message = `🔻 *ADMIN DEMOTION*\n\n@${userName} has been demoted from admin in this group.`;
                
                await socket.sendMessage(groupId, {
                    text: message,
                    mentions: [user]
                });
            }
        } catch (error) {
            console.error('Admin demote notification error:', error);
        }
    }

    formatWelcomeMessage(userName, groupName, membersCount) {
        const currentDate = new Date();
        const date = currentDate.toLocaleDateString();
        const time = currentDate.toLocaleTimeString();

        return `
╭───────────────✦
│ 🎉 *WELCOME TO ${groupName.toUpperCase()}*
│ 
│ 👤 *User:* @${userName}
│ 🏠 *Group:* ${groupName}
│ 🔢 *Members:* ${membersCount}
│ 📅 *Date Joined:* ${date}
│ 🕒 *Time:* ${time}
│ 
│ 📌 _Let's give a warm welcome!_
│ 💫 _Enjoy your stay in our community_
╰───────────────✦
> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍɪɴɪ ɪɴᴄᴏɴɴᴜ xᴅ ᴠ3 🖤
        `.trim();
    }

    formatGoodbyeMessage(userName, groupName) {
        const currentDate = new Date();
        const date = currentDate.toLocaleDateString();
        const time = currentDate.toLocaleTimeString();

        return `
╭───────────────✦
│ 😢 *GOODBYE @${userName}*
│ 
│ 🏠 *Group:* ${groupName}
│ 📅 *Date:* ${date}
│ 🕒 *Time:* ${time}
│ 
│ 💭 We'll miss you...  
│ 🕊️ Stay safe and come back soon!
│ ✨ Thank you for being part of our community
╰───────────────✦
> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍɪɴɪ ɪɴᴄᴏɴɴᴜ xᴅ ᴠ3 🖤
        `.trim();
    }

    async getGroupSettings(groupId, botNumber) {
        // Try to get from cache first
        if (this.groupSettings.has(groupId)) {
            return this.groupSettings.get(groupId);
        }

        // Get from database
        let settings = await db.getGroupSettings(groupId);
        
        // If no settings exist, create default ones
        if (!settings) {
            settings = {
                groupId: groupId,
                botNumber: botNumber,
                welcomeEnabled: true,
                goodbyeEnabled: true,
                welcomeImage: 'https://files.catbox.moe/bm2v7m.jpg',
                goodbyeImage: 'https://files.catbox.moe/bm2v7m.jpg',
                notifyAdminChanges: true,
                antilink: false,
                nsfwFilter: false,
                maxWarnings: 3,
                autoDeleteLinks: false,
                language: 'en'
            };
            
            // Save to database
            await db.updateGroupSettings(groupId, settings);
        }

        // Cache the settings
        this.groupSettings.set(groupId, settings);
        
        return settings;
    }

    async updateGroupSettings(groupId, newSettings) {
        // Update in database
        await db.updateGroupSettings(groupId, newSettings);
        
        // Update cache
        this.groupSettings.set(groupId, newSettings);
        
        return newSettings;
    }

    async getUserInfo(socket, userJid) {
        try {
            // Try to get user info from WhatsApp
            const [user] = await socket.onWhatsApp(userJid);
            if (user && user.exists) {
                return {
                    jid: user.jid,
                    name: user.name || user.jid.split('@')[0],
                    exists: true
                };
            }
        } catch (error) {
            console.error('Error getting user info:', error);
        }
        
        // Fallback to basic info
        return {
            jid: userJid,
            name: userJid.split('@')[0],
            exists: false
        };
    }

    async updateGroupStats(groupId, statType) {
        try {
            // This would update group statistics in the database
            // For now, we'll just log it
            console.log(`Group stats updated: ${groupId} - ${statType}`);
        } catch (error) {
            console.error('Error updating group stats:', error);
        }
    }

    // Anti-link feature
    async handleMessageForLinks(socket, message) {
        const from = message.key.remoteJid;
        if (!from.endsWith('@g.us')) return false;

        try {
            const settings = await this.getGroupSettings(from);
            if (!settings.antilink) return false;

            const body = this.extractMessageBody(message);
            if (!body) return false;

            // Common URL patterns
            const urlPatterns = [
                /https?:\/\/[^\s]+/g,
                /www\.[^\s]+/g,
                /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/g
            ];

            const hasLink = urlPatterns.some(pattern => pattern.test(body));
            
            if (hasLink) {
                await this.handleLinkViolation(socket, message, settings);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Anti-link check error:', error);
            return false;
        }
    }

    async handleLinkViolation(socket, message, settings) {
        const from = message.key.remoteJid;
        const userJid = message.key.participant || from;

        try {
            // Send warning message
            await socket.sendMessage(from, {
                text: `⚠️ *LINK DETECTED*\n\n@${userJid.split('@')[0]} Please avoid sending links in this group!`,
                mentions: [userJid]
            }, { quoted: message });

            // Auto-delete if enabled
            if (settings.autoDeleteLinks) {
                await socket.sendMessage(from, {
                    delete: message.key
                });
            }

        } catch (error) {
            console.error('Link violation handling error:', error);
        }
    }

    // NSFW Filter
    async handleMessageForNSFW(socket, message) {
        const from = message.key.remoteJid;
        if (!from.endsWith('@g.us')) return false;

        try {
            const settings = await this.getGroupSettings(from);
            if (!settings.nsfwFilter) return false;

            // Basic NSFW word list (in a real app, use a comprehensive list)
            const nsfwWords = [
                'porn', 'xxx', 'nsfw', 'adult', 'explicit',
                'nude', 'naked', 'sex', 'fuck', 'dick', 'pussy'
            ];

            const body = this.extractMessageBody(message)?.toLowerCase();
            if (!body) return false;

            const hasNSFW = nsfwWords.some(word => body.includes(word));
            
            if (hasNSFW) {
                await this.handleNSFWViolation(socket, message, settings);
                return true;
            }

            return false;
        } catch (error) {
            console.error('NSFW filter error:', error);
            return false;
        }
    }

    async handleNSFWViolation(socket, message, settings) {
        const from = message.key.remoteJid;
        const userJid = message.key.participant || from;

        try {
            await socket.sendMessage(from, {
                text: `🔞 *NSFW CONTENT DETECTED*\n\n@${userJid.split('@')[0]} Please avoid NSFW content in this group!`,
                mentions: [userJid]
            }, { quoted: message });

            // Delete the message
            await socket.sendMessage(from, {
                delete: message.key
            });

        } catch (error) {
            console.error('NSFW violation handling error:', error);
        }
    }

    extractMessageBody(message) {
        const msg = message.message;
        
        if (msg.conversation) return msg.conversation;
        if (msg.extendedTextMessage) return msg.extendedTextMessage.text;
        if (msg.imageMessage) return msg.imageMessage.caption;
        if (msg.videoMessage) return msg.videoMessage.caption;
        
        return '';
    }

    // Group information command
    async sendGroupInfo(socket, message) {
        const from = message.key.remoteJid;
        if (!from.endsWith('@g.us')) return;

        try {
            const metadata = await socket.groupMetadata(from);
            const settings = await this.getGroupSettings(from);
            
            const groupInfo = `
🏠 *GROUP INFORMATION*

📛 *Name:* ${metadata.subject}
🔢 *Members:* ${metadata.participants.length}
👑 *Admins:* ${metadata.participants.filter(p => p.admin).length}
📅 *Created:* ${new Date(metadata.creation * 1000).toLocaleDateString()}
🔗 *Group ID:* ${metadata.id}

⚙️ *Settings:*
├── Welcome: ${settings.welcomeEnabled ? '✅' : '❌'}
├── Goodbye: ${settings.goodbyeEnabled ? '✅' : '❌'}
├── Anti-link: ${settings.antilink ? '✅' : '❌'}
├── NSFW Filter: ${settings.nsfwFilter ? '✅' : '❌'}
└── Admin Notify: ${settings.notifyAdminChanges ? '✅' : '❌'}

💫 *Description:* ${metadata.desc || 'No description'}
            `.trim();

            await socket.sendMessage(from, { text: groupInfo }, { quoted: message });

        } catch (error) {
            console.error('Group info error:', error);
            await socket.sendMessage(from, {
                text: '❌ Error fetching group information'
            }, { quoted: message });
        }
    }

    // Utility function for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Clean up cache (call this periodically)
    cleanupCache() {
        const now = Date.now();
        const maxAge = 30 * 60 * 1000; // 30 minutes
        
        for (const [groupId, settings] of this.groupSettings.entries()) {
            if (now - (settings._lastAccessed || 0) > maxAge) {
                this.groupSettings.delete(groupId);
            }
        }
    }
}

module.exports = new GroupManager();
