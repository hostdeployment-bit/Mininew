// API Base URL
const API_BASE = '/api';

// Current user data
let currentUser = null;
let userBots = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadUserData();
    setupEventListeners();
    loadBots();
    loadCommands();
});

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/auth/check');
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = '/';
            return;
        }
        
        currentUser = data.user;
        updateUserInfo();
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/';
    }
}

// Load user data
async function loadUserData() {
    try {
        const response = await fetch('/api/profile');
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            updateUserInfo();
        }
    } catch (error) {
        console.error('Load user data error:', error);
    }
}

// Update user info in UI
function updateUserInfo() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userCoins').textContent = `${currentUser.coins} coins`;
        document.getElementById('userCoinsCard').textContent = currentUser.coins;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        if (!item.classList.contains('logout')) {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const page = this.getAttribute('data-page');
                showPage(page);
            });
        }
    });

    // Modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Connect bot form
    document.getElementById('connectBotForm').addEventListener('submit', connectBot);
    
    // Bot config form
    document.getElementById('botConfigForm').addEventListener('submit', saveBotConfig);

    // Close modals on outside click
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Show specific page
function showPage(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(`${page}Page`).classList.add('active');
    
    // Activate nav item
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    // Update page title
    document.getElementById('pageTitle').textContent = 
        page.charAt(0).toUpperCase() + page.slice(1);
}

// Load user's bots
async function loadBots() {
    try {
        const response = await fetch('/api/bots/my-bots');
        const data = await response.json();
        
        if (data.success) {
            userBots = data.bots;
            displayBots();
            updateStats();
        }
    } catch (error) {
        console.error('Load bots error:', error);
        showNotification('Error loading bots', 'error');
    }
}

// Display bots in grid
function displayBots() {
    const botsGrid = document.getElementById('botsGrid');
    
    if (userBots.length === 0) {
        botsGrid.innerHTML = `
            <div class="no-bots">
                <i class="fas fa-robot" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <h3>No Bots Connected</h3>
                <p>Connect your first WhatsApp bot to get started</p>
                <button class="btn btn-primary" onclick="showConnectBotModal()">
                    <i class="fas fa-plus"></i> Connect First Bot
                </button>
            </div>
        `;
        return;
    }

    botsGrid.innerHTML = userBots.map(bot => `
        <div class="bot-card ${bot.connectionStatus.isConnected ? '' : 'disconnected'}">
            <div class="bot-header">
                <div class="bot-number">${bot.number}</div>
                <div class="bot-status ${bot.connectionStatus.isConnected ? 'status-connected' : 'status-disconnected'}">
                    ${bot.connectionStatus.isConnected ? 'Connected' : 'Disconnected'}
                </div>
            </div>
            
            <div class="bot-config">
                <div class="config-item">
                    <i class="fas ${bot.config.AUTO_VIEW_STATUS === 'true' ? 'fa-check text-success' : 'fa-times text-muted'}"></i>
                    <span>Auto View</span>
                </div>
                <div class="config-item">
                    <i class="fas ${bot.config.AUTO_LIKE_STATUS === 'true' ? 'fa-check text-success' : 'fa-times text-muted'}"></i>
                    <span>Auto Like</span>
                </div>
                <div class="config-item">
                    <i class="fas ${bot.config.AUTO_RECORDING === 'true' ? 'fa-check text-success' : 'fa-times text-muted'}"></i>
                    <span>Auto Record</span>
                </div>
                <div class="config-item">
                    <i class="fas ${bot.config.ANTI_CALL === 'on' ? 'fa-check text-success' : 'fa-times text-muted'}"></i>
                    <span>Anti Call</span>
                </div>
            </div>
            
            <div class="bot-info">
                <div class="info-item">
                    <small>Uptime: ${bot.connectionStatus.uptime ? formatUptime(bot.connectionStatus.uptime) : 'N/A'}</small>
                </div>
                <div class="info-item">
                    <small>Last Active: ${new Date(bot.lastActive).toLocaleDateString()}</small>
                </div>
            </div>
            
            <div class="bot-actions">
                <button class="btn btn-secondary btn-small" onclick="editBotConfig('${bot.number}')">
                    <i class="fas fa-cog"></i> Config
                </button>
                <button class="btn btn-danger btn-small" onclick="disconnectBot('${bot.number}')">
                    <i class="fas fa-power-off"></i> Disconnect
                </button>
            </div>
        </div>
    `).join('');
}

// Update stats cards
function updateStats() {
    const totalBots = userBots.length;
    const activeBots = userBots.filter(bot => bot.connectionStatus.isConnected).length;
    
    document.getElementById('totalBots').textContent = totalBots;
    document.getElementById('activeBots').textContent = activeBots;
}

// Format uptime
function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

// Show connect bot modal
function showConnectBotModal() {
    document.getElementById('connectBotModal').style.display = 'block';
    document.getElementById('pairingResult').style.display = 'none';
    document.getElementById('connectBotForm').reset();
}

// Connect new bot
async function connectBot(e) {
    e.preventDefault();
    
    const number = document.getElementById('botNumber').value;
    
    if (!number) {
        showNotification('Please enter a phone number', 'error');
        return;
    }

    try {
        const response = await fetch('/api/bots/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ number })
        });

        const data = await response.json();

        if (data.success) {
            if (data.pairing) {
                // Show pairing code
                document.getElementById('pairingCodeDisplay').textContent = data.code;
                document.getElementById('pairingResult').style.display = 'block';
                showNotification('Pairing code generated! Enter it in WhatsApp.', 'success');
            } else {
                showNotification('Bot connected successfully!', 'success');
                document.getElementById('connectBotModal').style.display = 'none';
                loadBots();
            }
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Connect bot error:', error);
        showNotification('Error connecting bot', 'error');
    }
}

// Copy pairing code
function copyPairingCode() {
    const code = document.getElementById('pairingCodeDisplay').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showNotification('Pairing code copied to clipboard!', 'success');
    });
}

// Edit bot configuration
function editBotConfig(number) {
    const bot = userBots.find(b => b.number === number);
    if (!bot) return;

    document.getElementById('configBotNumber').value = number;
    document.getElementById('autoViewStatus').checked = bot.config.AUTO_VIEW_STATUS === 'true';
    document.getElementById('autoLikeStatus').checked = bot.config.AUTO_LIKE_STATUS === 'true';
    document.getElementById('autoRecording').checked = bot.config.AUTO_RECORDING === 'true';
    document.getElementById('antiCall').checked = bot.config.ANTI_CALL === 'on';
    document.getElementById('workType').value = bot.config.WORK_TYPE;

    document.getElementById('botConfigModal').style.display = 'block';
}

// Save bot configuration
async function saveBotConfig(e) {
    e.preventDefault();
    
    const number = document.getElementById('configBotNumber').value;
    const config = {
        AUTO_VIEW_STATUS: document.getElementById('autoViewStatus').checked ? 'true' : 'false',
        AUTO_LIKE_STATUS: document.getElementById('autoLikeStatus').checked ? 'true' : 'false',
        AUTO_RECORDING: document.getElementById('autoRecording').checked ? 'true' : 'false',
        ANTI_CALL: document.getElementById('antiCall').checked ? 'on' : 'off',
        WORK_TYPE: document.getElementById('workType').value,
        AUTO_LIKE_EMOJI: ['🖤', '🍬', '💫', '🎈']
    };

    try {
        const response = await fetch('/api/bots/config', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ number, config })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Configuration updated successfully!', 'success');
            document.getElementById('botConfigModal').style.display = 'none';
            loadBots();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Save config error:', error);
        showNotification('Error updating configuration', 'error');
    }
}

// Disconnect bot
async function disconnectBot(number) {
    if (!confirm('Are you sure you want to disconnect this bot?')) {
        return;
    }

    try {
        const response = await fetch('/api/bots/disconnect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ number })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Bot disconnected successfully!', 'success');
            loadBots();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Disconnect bot error:', error);
        showNotification('Error disconnecting bot', 'error');
    }
}

// Load commands
async function loadCommands() {
    try {
        // This would typically come from an API endpoint
        const commands = [
            { command: '.ping', description: 'Test bot response time', category: 'tools' },
            { command: '.menu', description: 'Show all commands', category: 'general' },
            { command: '.sticker', description: 'Create sticker from image', category: 'tools' },
            { command: '.ai', description: 'Chat with AI', category: 'fun' },
            { command: '.game', description: 'Play games', category: 'fun' },
            { command: '.broadcast', description: 'Broadcast message to all groups', category: 'admin' },
            { command: '.promote', description: 'Promote user to admin', category: 'group' },
            { command: '.welcome', description: 'Toggle welcome messages', category: 'group' }
        ];

        displayCommands(commands);
    } catch (error) {
        console.error('Load commands error:', error);
    }
}

// Display commands
function displayCommands(commands) {
    const commandsGrid = document.getElementById('commandsGrid');
    
    commandsGrid.innerHTML = commands.map(cmd => `
        <div class="command-card">
            <div class="command-name">${cmd.command}</div>
            <div class="command-desc">${cmd.description}</div>
            <span class="command-category">${cmd.category}</span>
        </div>
    `).join('');
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    if (type === 'success') {
        notification.style.background = '#48bb78';
    } else if (type === 'error') {
        notification.style.background = '#f56565';
    } else {
        notification.style.background = '#667eea';
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .no-bots {
        text-align: center;
        padding: 3rem;
        grid-column: 1 / -1;
    }
    
    .text-success { color: #48bb78; }
    .text-muted { color: #a0aec0; }
    
    .bot-info {
        margin-bottom: 1rem;
    }
    
    .info-item {
        margin-bottom: 0.25rem;
    }
    
    .info-item small {
        color: #718096;
    }
`;
document.head.appendChild(style);
