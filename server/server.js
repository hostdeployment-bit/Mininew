const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
require('dotenv').config();

// Import configurations
const config = require('./lib/config');

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ SERVIR LES FICHIERS STATIQUES CORRECTEMENT
app.use(express.static(path.join(__dirname, '../public')));
app.use('/css', express.static(path.join(__dirname, '../public/css')));
app.use('/js', express.static(path.join(__dirname, '../public/js')));
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// ✅ CORRECTION SESSION AVEC CONNECT-MONGO POUR RENDER
const MongoStore = require('connect-mongo');

app.use(session({
    secret: process.env.SESSION_SECRET || config.get('server.sessionSecret'),
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || config.get('database.url'),
        collectionName: 'sessions'
    }),
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: config.get('server.sessionMaxAge')
    }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// ✅ CORS POUR RENDER
app.use((req, res, next) => {
    const allowedOrigins = ['https://mini-inconnu-xd-v3.onrender.com', 'http://localhost:3000'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || config.get('database.url'), config.get('database.options'))
    .then(() => {
        console.log('✅ MongoDB connected successfully');
        initializeDefaultAdmin();
    })
    .catch(error => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });

// Import managers
const botManager = require('./lib/botManager');
const commandHandler = require('./lib/commandHandler');

// ✅ CORRECTION IMPORT MIDDLEWARE
const authMiddleware = require('./middleware/auth');
const adminMiddleware = require('./middleware/admin');

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/api/bots', authMiddleware, require('./routes/bots'));
app.use('/api/admin', authMiddleware, adminMiddleware.ensureAdmin, require('./routes/admin'));
app.use('/api/profile', authMiddleware, require('./routes/profile'));
app.use('/api/servers', authMiddleware, require('./routes/servers'));

// Pages
app.get('/', (req, res) => {
    console.log('🏠 Serving index page');
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/dashboard', authMiddleware, (req, res) => {
    console.log('📊 Serving dashboard for user:', req.user.email);
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/profile', authMiddleware, (req, res) => {
    console.log('👤 Serving profile for user:', req.user.email);
    res.sendFile(path.join(__dirname, '../public/profile.html'));
});

app.get('/admin', authMiddleware, adminMiddleware.ensureAdmin, (req, res) => {
    console.log('👑 Serving admin panel for user:', req.user.email);
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Health check endpoint avec info de session
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: config.getEnvironment(),
        version: config.get('app.version'),
        uptime: process.uptime(),
        session: {
            authenticated: req.isAuthenticated(),
            user: req.user ? { id: req.user._id, email: req.user.email } : null,
            sessionID: req.sessionID
        }
    });
});

// Initialize bot manager
if (typeof botManager.initialize === 'function') {
    botManager.initialize();
} else {
    console.log('⚠️  Bot manager initialization skipped');
}

const PORT = process.env.PORT || config.get('server.port');

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ${config.get('app.name')} v${config.get('app.version')}`);
    console.log(`🔗 Running on port ${PORT}`);
    console.log(`🌍 Environment: ${config.getEnvironment()}`);
});

// Initialize default admin user
async function initializeDefaultAdmin() {
    try {
        const User = require('./models/User');
        const adminConfig = config.get('admin.defaultAdmin');
        
        const existingAdmin = await User.findOne({ email: adminConfig.email });
        
        if (!existingAdmin) {
            const adminUser = new User({
                name: adminConfig.name,
                email: adminConfig.email,
                password: adminConfig.password,
                coins: adminConfig.coins,
                role: 'admin'
            });
            
            await adminUser.save();
            console.log('✅ Default admin user created');
        } else {
            console.log('ℹ️  Admin user already exists');
        }
    } catch (error) {
        console.error('❌ Error creating default admin:', error);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down gracefully...');
    
    // Disconnect all bots
    if (typeof botManager.disconnectAllBots === 'function') {
        await botManager.disconnectAllBots();
    }
    
    // Close MongoDB connection
    await mongoose.connection.close();
    
    console.log('✅ Shutdown complete');
    process.exit(0);
});
