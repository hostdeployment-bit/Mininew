module.exports = {
    command: 'ping',
    description: 'Test bot response time and status',
    category: 'tools',
    
    async execute(socket, message, args, botNumber) {
        const from = message.key.remoteJid;
        const startTime = Date.now();
        
        await socket.sendMessage(from, {
            text: '🏓 Pong!'
        }, { quoted: message });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        await socket.sendMessage(from, {
            text: `🏓 *PONG!*\n\n⏱️ Response Time: ${responseTime}ms\n🔢 Bot Number: ${botNumber}\n🕒 Server Time: ${new Date().toLocaleString()}`
        });
    }
};
