// API Base URL
const API_BASE = '/api';

// Current admin data
let currentAdmin = null;
let allUsers = [];
let selectedUserId = null;

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    loadAdminData();
    setupEventListeners();
    loadUsers();
    loadStats();
});

// Check admin authentication
async function checkAdminAuth() {
    try {
        const response = await fetch('/auth/check');
        const data = await response.json();
        
        if (!data.authenticated || data.user.role !== 'admin') {
            window.location.href = '/dashboard';
            return;
        }
        
        currentAdmin = data.user;
        updateAdminInfo();
    } catch (error) {
        console.error('Admin auth check error:', error);
        window.location.href = '/dashboard';
    }
}

// Load admin data
async function loadAdminData() {
    try {
        const response = await fetch('/api/admin/dashboard');
        const data = await response.json();
        
        if (data.success) {
            displayStats(data.stats);
            displayRecentUsers(data.recentUsers);
        }
    } catch (error) {
        console.error('Load admin data error:', error);
        showNotification('Error loading admin data', 'error');
    }
}

// Update admin info
function updateAdminInfo() {
    if (currentAdmin) {
        document.getElementById('adminName').textContent = currentAdmin.name;
        document.getElementById('adminCoins').textContent = `${currentAdmin.coins} coins`;
    }
}

// Setup event listeners
function setupEventListeners() {
    // User search
    document.getElementById('userSearch').addEventListener('input', searchUsers);
    
    // Coins form
    document.getElementById('coinsForm').addEventListener('submit', manageCoins);
    
    // Modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Close modals on outside click
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Load users
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        
        if (data.success) {
            allUsers = data.users;
            displayUsers(allUsers);
        }
    } catch (error) {
        console.error('Load users error:', error);
        showNotification('Error loading users', 'error');
    }
}

// Display users in table
function displayUsers(users) {
    const usersTable = document.getElementById('usersTable');
    
    if (users.length === 0) {
        usersTable.innerHTML = '<div class="no-data">No users found</div>';
        return;
    }

    usersTable.innerHTML = users.map(user => `
        <div class="user-row" data-user-id="${user._id}">
            <div class="user-cell user-info">
                <div class="user-name">${user.name}</div>
                <div class="user-email">${user.email}</div>
            </div>
            <div class="user-cell user-coins">${user.coins} coins</div>
            <div class="user-cell user-role">
                <span class="role-badge ${user.role}">${user.role}</span>
            </div>
            <div class="user-cell user-joined">
                ${new Date(user.createdAt).toLocaleDateString()}
            </div>
            <div class="user-cell user-actions">
                <button class="btn btn-secondary btn-small" onclick="showUserActions('${user._id}')">
                    <i class="fas fa-cog"></i> Actions
                </button>
            </div>
        </div>
    `).join('');
}

// Search users
function searchUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    
    if (!searchTerm) {
        displayUsers(allUsers);
        return;
    }
    
    const filteredUsers = allUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
    );
    
    displayUsers(filteredUsers);
}

// Show user actions modal
async function showUserActions(userId) {
    selectedUserId = userId;
    const user = allUsers.find(u => u._id === userId);
    
    if (!user) return;
    
    document.getElementById('userInfo').innerHTML = `
        <div class="user-detail">
            <strong>Name:</strong> ${user.name}
        </div>
        <div class="user-detail">
            <strong>Email:</strong> ${user.email}
        </div>
        <div class="user-detail">
            <strong>Coins:</strong> ${user.coins}
        </div>
        <div class="user-detail">
            <strong>Role:</strong> <span class="role-badge ${user.role}">${user.role}</span>
        </div>
        <div class="user-detail">
            <strong>Joined:</strong> ${new Date(user.createdAt).toLocaleDateString()}
        </div>
        <div class="user-detail">
            <strong>Referrals:</strong> ${user.referralCount || 0}
        </div>
    `;
    
    document.getElementById('userActionsModal').style.display = 'block';
}

// Promote user to admin
async function promoteUser() {
    if (!selectedUserId) return;
    
    if (!confirm('Are you sure you want to promote this user to admin?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/promote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: selectedUserId })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('User promoted to admin successfully!', 'success');
            document.getElementById('userActionsModal').style.display = 'none';
            loadUsers();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Promote user error:', error);
        showNotification('Error promoting user', 'error');
    }
}

// Ban user (placeholder function)
async function banUser() {
    if (!selectedUserId) return;
    
    if (!confirm('Are you sure you want to ban this user?')) {
        return;
    }
    
    showNotification('Ban user functionality coming soon', 'info');
}

// Manage coins
async function manageCoins(e) {
    e.preventDefault();
    
    const userEmail = document.getElementById('userEmail').value;
    const amount = parseInt(document.getElementById('coinsAmount').value);
    const reason = document.getElementById('coinsReason').value;
    
    if (!userEmail || !amount) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    // Find user by email
    const user = allUsers.find(u => u.email === userEmail);
    if (!user) {
        showNotification('User not found', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/coins', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                userId: user._id, 
                amount: amount,
                reason: reason
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} coins successfully!`, 'success');
            document.getElementById('coinsForm').reset();
            loadUsers();
            loadStats();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Manage coins error:', error);
        showNotification('Error managing coins', 'error');
    }
}

// Load stats
async function loadStats() {
    try {
        const response = await fetch('/api/admin/dashboard');
        const data = await response.json();
        
        if (data.success) {
            displayStats(data.stats);
        }
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

// Display stats
function displayStats(stats) {
    document.getElementById('totalUsers').textContent = stats.totalUsers;
    document.getElementById('totalBotsAdmin').textContent = stats.totalBots;
    document.getElementById('todayCommands').textContent = stats.todayCommands;
    
    // Calculate total coins (this would normally come from the API)
    const totalCoins = allUsers.reduce((sum, user) => sum + user.coins, 0);
    document.getElementById('totalCoins').textContent = totalCoins;
}

// Display recent users
function displayRecentUsers(users) {
    const recentUsers = document.getElementById('recentUsers');
    
    if (users.length === 0) {
        recentUsers.innerHTML = '<div class="no-data">No recent users</div>';
        return;
    }

    recentUsers.innerHTML = users.map(user => `
        <div class="recent-user">
            <div class="recent-user-info">
                <div class="recent-user-name">${user.name}</div>
                <div class="recent-user-email">${user.email}</div>
            </div>
            <div class="recent-user-coins">${user.coins} coins</div>
            <div class="recent-user-date">
                ${new Date(user.createdAt).toLocaleDateString()}
            </div>
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

// Add CSS for admin panel
const style = document.createElement('style');
style.textContent = `
    .admin-content {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }
    
    .admin-card {
        background: white;
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .search-box {
        position: relative;
        width: 300px;
    }
    
    .search-box input {
        width: 100%;
        padding: 0.5rem 2.5rem 0.5rem 1rem;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
    }
    
    .search-box i {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: #a0aec0;
    }
    
    .users-table {
        max-height: 400px;
        overflow-y: auto;
    }
    
    .user-row {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
        gap: 1rem;
        padding: 1rem;
        border-bottom: 1px solid #e2e8f0;
        align-items: center;
    }
    
    .user-row:last-child {
        border-bottom: none;
    }
    
    .user-row:hover {
        background: #f7fafc;
    }
    
    .user-cell {
        display: flex;
        align-items: center;
    }
    
    .user-info {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .user-name {
        font-weight: bold;
        margin-bottom: 0.25rem;
    }
    
    .user-email {
        color: #718096;
        font-size: 0.9rem;
    }
    
    .role-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: bold;
    }
    
    .role-badge.admin {
        background: #fed7d7;
        color: #c53030;
    }
    
    .role-badge.user {
        background: #bee3f8;
        color: #2c5282;
    }
    
    .coins-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    
    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 1rem;
    }
    
    .recent-users {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    
    .recent-user {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: #f7fafc;
        border-radius: 8px;
    }
    
    .recent-user-info {
        flex: 1;
    }
    
    .recent-user-name {
        font-weight: bold;
        margin-bottom: 0.25rem;
    }
    
    .recent-user-email {
        color: #718096;
        font-size: 0.9rem;
    }
    
    .recent-user-coins {
        font-weight: bold;
        color: #d69e2e;
        margin: 0 1rem;
    }
    
    .recent-user-date {
        color: #a0aec0;
        font-size: 0.9rem;
    }
    
    .user-info-modal {
        margin-bottom: 1.5rem;
    }
    
    .user-detail {
        margin-bottom: 0.5rem;
        padding: 0.5rem 0;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .user-detail:last-child {
        border-bottom: none;
    }
    
    .action-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
    }
    
    .no-data {
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
