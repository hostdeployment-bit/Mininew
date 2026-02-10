const fs = require('fs');
const path = require('path');

class CommandHandler {
    constructor() {
        this.plugins = new Map();
        this.categories = new Map();
        this.loadAllPlugins();
    }

    loadAllPlugins() {
        const pluginsDir = path.join(__dirname, '../plugins');
        const categories = fs.readdirSync(pluginsDir);

        for (const category of categories) {
            const categoryPath = path.join(pluginsDir, category);
            
            if (fs.statSync(categoryPath).isDirectory()) {
                this.loadCategory(category, categoryPath);
            }
        }

        console.log(`✅ Loaded ${this.plugins.size} commands from ${categories.length} categories`);
    }

    loadCategory(categoryName, categoryPath) {
        const pluginFiles = fs.readdirSync(categoryPath)
            .filter(file => file.endsWith('.js'));

        this.categories.set(categoryName, []);

        for (const file of pluginFiles) {
            try {
                const pluginPath = path.join(categoryPath, file);
                const plugin = require(pluginPath);
                
                if (plugin.command && plugin.execute) {
                    this.plugins.set(plugin.command, {
                        ...plugin,
                        category: categoryName,
                        file: file
                    });
                    
                    this.categories.get(categoryName).push(plugin.command);
                    console.log(`📦 Loaded command: ${plugin.command} (${categoryName})`);
                }
            } catch (error) {
                console.error(`❌ Failed to load plugin ${file}:`, error);
            }
        }
    }

    async handleCommand(socket, message, botNumber) {
        try {
            const from = message.key.remoteJid;
            const body = this.extractMessageBody(message);
            
            if (!body || !body.startsWith('.')) return;

            const [command, ...args] = body.slice(1).split(' ');
            const plugin = this.plugins.get(command.toLowerCase());

            if (plugin) {
                await plugin.execute(socket, message, args, botNumber);
            } else if (command.toLowerCase() === 'menu') {
                await this.showMenu(socket, message, botNumber);
            } else {
                await socket.sendMessage(from, {
                    text: `❌ Command *${command}* not found. Type *.menu* for available commands.`
                }, { quoted: message });
            }

        } catch (error) {
            console.error('Command handler error:', error);
        }
    }

    async showMenu(socket, message, botNumber) {
        const from = message.key.remoteJid;
        let menuText = '🤖 *MINI INCONNU XD V3 MENU*\n\n';

        for (const [category, commands] of this.categories) {
            if (commands.length > 0) {
                menuText += `*${category.toUpperCase()}*\n`;
                
                for (const command of commands) {
                    const plugin = this.plugins.get(command);
                    menuText += `• .${command} - ${plugin.description || 'No description'}\n`;
                }
                menuText += '\n';
            }
        }

        menuText += `📊 *Total Commands:* ${this.plugins.size}\n`;
        menuText += `🔢 *Bot Number:* ${botNumber}\n`;
        menuText += `⚡ *Powered by Mini Inconnu XD V3*`;

        await socket.sendMessage(from, { text: menuText }, { quoted: message });
    }

    extractMessageBody(message) {
        const msg = message.message;
        
        if (msg.conversation) return msg.conversation;
        if (msg.extendedTextMessage) return msg.extendedTextMessage.text;
        if (msg.imageMessage) return msg.imageMessage.caption;
        if (msg.videoMessage) return msg.videoMessage.caption;
        
        return '';
    }

    getCommandList() {
        return Array.from(this.plugins.entries()).map(([command, plugin]) => ({
            command: `.${command}`,
            description: plugin.description || 'No description',
            category: plugin.category || 'general'
        }));
    }
}

module.exports = new CommandHandler();
