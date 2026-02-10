// API Base URL
const API_BASE = '/api';

// Current user data
let currentUser = null;

// Initialize profile page
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadProfileData();
    setupEventListeners();
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

// Load profile data
async function loadProfileData() {
    try {
        const response = await fetch('/api/profile');
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            updateProfileForm();
            displayTransactions(data.transactions);
            displayServers(data.servers);
            updateStats();
        }
    } catch (error) {
        console.error('Load profile error:', error);
        showNotification('Error loading profile data', 'error');
    }
}

// Update user info
function updateUserInfo() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userCoins').textContent = `${currentUser.coins} coins`;
    }
}

// Update profile form
function updateProfileForm() {
    document.getElementById('profileName').value = currentUser.name;
    document.getElementById('profileEmail').value = currentUser.email;
    document.getElementById('referralCode').value = currentUser.referralCode;
}

// Update stats
function updateStats() {
    document.getElementById('profileCoins').textContent = currentUser.coins;
    document.getElementById('referralCount').textContent = currentUser.referralCount || 0;
    
    // Load bot count
    loadBotCount();
}

// Load bot count
async function loadBotCount() {
    try {
        const response = await fetch('/api/bots/my-bots');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('totalBotsProfile').textContent = data.bots.length;
        }
    } catch (error) {
        console.error('Load bot count error:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('profileForm').addEventListener('submit', updateProfile);
}

// Update profile
async function updateProfile(e) {
    e.preventDefault();
    
    const name = document.getElementById('profileName').value;
    
    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Profile updated successfully!', 'success');
            currentUser = data.user;
            updateUserInfo();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Update profile error:', error);
        showNotification('Error updating profile', 'error');
    }
}

// Copy referral code
function copyReferralCode() {
    const code = document.getElementById('referralCode').value;
    navigator.clipboard.writeText(code).then(() => {
        showNotification('Referral code copied to clipboard!', 'success');
    });
}

// Display transactions
function displayTransactions(transactions) {
    const transactionsList = document.getElementById('transactionsList');
    
    if (transactions.length === 0) {
        transactionsList.innerHTML = '<p class="no-data">No transactions yet</p>';
        return;
    }

    transactionsList.innerHTML = transactions.map(transaction => `
        <div class="transaction-item ${transaction.type}">
            <div class="transaction-info">
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'credit' ? '+' : '-'}${transaction.amount} coins
                </div>
                <div class="transaction-reason">${formatReason(transaction.reason)}</div>
                <div class="transaction-date">${new Date(transaction.timestamp).toLocaleDateString()}</div>
            </div>
            <div class="transaction-balance">
                Balance: ${transaction.balance} coins
            </div>
        </div>
    `).join('');
}

// Display servers
function displayServers(servers) {
    const serversList = document.getElementById('serversList');
    
    if (servers.length === 0) {
        serversList.innerHTML = `
            <div class="no-servers">
                <p>No servers active</p>
                <button class="btn btn-primary" onclick="createFreeServer()">
                    <i class="fas fa-plus"></i> Create Free Server (3 days)
                </button>
            </div>
        `;
        return;
    }

    serversList.innerHTML = servers.map(server => `
        <div class="server-item ${server.isExpired ? 'expired' : 'active'}">
            <div class="server-header">
                <div class="server-name">${server.name}</div>
                <div class="server-type ${server.type}">${server.type}</div>
            </div>
            <div class="server-info">
                <div class="server-detail">
                    <i class="fas fa-clock"></i>
                    Expires: ${new Date(server.expiresAt).toLocaleDateString()}
                </div>
                <div class="server-detail">
                    <i class="fas fa-robot"></i>
                    Bots: ${server.currentBots}/${server.maxBots}
                </div>
            </div>
            ${server.isExpired ? 
                '<div class="server-status expired">EXPIRED</div>' : 
                '<div class="server-status active">ACTIVE</div>'
            }
        </div>
    `).join('');
}

// Format transaction reason
function formatReason(reason) {
    const reasons = {
        'registration': 'Account Registration',
        'referral': 'Referral Bonus',
        'bot_creation': 'Bot Creation',
        'server_purchase': 'Server Purchase',
        'admin_grant': 'Admin Grant',
        'system': 'System'
    };
    return reasons[reason] || reason;
}

// Create free server
async function createFreeServer() {
    try {
        const response = await fetch('/api/servers/create-free', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Free server created for 3 days!', 'success');
            loadProfileData();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Create server error:', error);
        showNotification('Error creating server', 'error');
    }
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

// Add CSS for profile page
const style = document.createElement('style');
style.textContent = `
    .profile-content {
        display: grid;
        gap: 2rem;
        grid-template-columns: 1fr 1fr;
    }
    
    .profile-card {
        background: white;
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .profile-card h2 {
        margin-bottom: 1rem;
        color: #2d3748;
    }
    
    .transactions-list,
    .servers-list {
        max-height: 300px;
        overflow-y: auto;
    }
    
    .transaction-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .transaction-item:last-child {
        border-bottom: none;
    }
    
    .transaction-amount.credit {
        color: #48bb78;
        font-weight: bold;
    }
    
    .transaction-amount.debit {
        color: #f56565;
        font-weight: bold;
    }
    
    .transaction-reason {
        color: #718096;
        font-size: 0.9rem;
    }
    
    .transaction-date {
        color: #a0aec0;
        font-size: 0.8rem;
    }
    
    .transaction-balance {
        color: #4a5568;
        font-weight: 500;
    }
    
    .server-item {
        background: #f7fafc;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 0.5rem;
        border-left: 4px solid #48bb78;
    }
    
    .server-item.expired {
        border-left-color: #f56565;
        opacity: 0.7;
    }
    
    .server-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    
    .server-name {
        font-weight: bold;
    }
    
    .server-type {
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: bold;
    }
    
    .server-type.free {
        background: #bee3f8;
        color: #2c5282;
    }
    
    .server-type.premium {
        background: #c6f6d5;
        color: #276749;
    }
    
    .server-info {
        display: flex;
        gap: 1rem;
        margin-bottom: 0.5rem;
    }
    
    .server-detail {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
        color: #718096;
    }
    
    .server-status {
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: bold;
        text-align: center;
    }
    
    .server-status.active {
        background: #c6f6d5;
        color: #276749;
    }
    
    .server-status.expired {
        background: #fed7d7;
        color: #c53030;
    }
    
    .no-data,
    .no-servers {
        text-align: center;
        padding: 2rem;
        color: #718096;
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
