<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile - MINI INCONNU XD V3</title>
    <link rel="stylesheet" href="css/dashboard.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <div class="dashboard-container">
        <!-- Sidebar -->
        <div class="sidebar">
            <div class="logo">
                <i class="fas fa-robot"></i>
                <span>MINI INCONNU</span>
            </div>
            <nav class="nav">
                <a href="/dashboard" class="nav-item">
                    <i class="fas fa-robot"></i> My Bots
                </a>
                <a href="#profile" class="nav-item active">
                    <i class="fas fa-user"></i> Profile
                </a>
                <a href="/admin" class="nav-item">
                    <i class="fas fa-crown"></i> Admin
                </a>
                <a href="/auth/logout" class="nav-item logout">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            </nav>
        </div>

        <!-- Main Content -->
        <div class="main-content">
            <header class="header">
                <h1>User Profile</h1>
                <div class="user-info">
                    <span id="userCoins">Loading...</span>
                    <span id="userName">Loading...</span>
                </div>
            </header>

            <div class="profile-content">
                <div class="profile-card">
                    <h2>Profile Information</h2>
                    <form id="profileForm">
                        <div class="form-group">
                            <label>Full Name</label>
                            <input type="text" id="profileName" required>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="profileEmail" disabled>
                        </div>
                        <div class="form-group">
                            <label>Referral Code</label>
                            <input type="text" id="referralCode" disabled>
                            <button type="button" class="btn btn-secondary btn-small" onclick="copyReferralCode()">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                        </div>
                        <button type="submit" class="btn btn-primary">Update Profile</button>
                    </form>
                </div>

                <div class="stats-cards">
                    <div class="stat-card">
                        <i class="fas fa-coins"></i>
                        <div class="stat-info">
                            <h3 id="profileCoins">0</h3>
                            <p>Coins Balance</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-users"></i>
                        <div class="stat-info">
                            <h3 id="referralCount">0</h3>
                            <p>Referrals</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-robot"></i>
                        <div class="stat-info">
                            <h3 id="totalBotsProfile">0</h3>
                            <p>Total Bots</p>
                        </div>
                    </div>
                </div>

                <div class="profile-card">
                    <h2>Recent Transactions</h2>
                    <div id="transactionsList" class="transactions-list">
                        <!-- Transactions will be loaded here -->
                    </div>
                </div>

                <div class="profile-card">
                    <h2>Your Servers</h2>
                    <div id="serversList" class="servers-list">
                        <!-- Servers will be loaded here -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="js/profile.js"></script>
</body>
</html>
