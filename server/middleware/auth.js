function ensureAuthenticated(req, res, next) {
    console.log('🔐 Auth middleware called:', {
        isAuthenticated: req.isAuthenticated(),
        path: req.path,
        method: req.method,
        user: req.user ? { id: req.user._id, email: req.user.email } : 'No user',
        sessionID: req.sessionID
    });

    if (req.isAuthenticated()) {
        console.log('✅ User authenticated, proceeding to:', req.path);
        return next();
    }
    
    console.log('❌ User not authenticated, blocking access to:', req.path);
    
    // Si c'est une requête API, retourner une erreur JSON
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({
            success: false,
            message: 'Please login to access this resource'
        });
    }
    
    // Pour les pages, rediriger vers la page de login
    res.redirect('/');
}

function ensureAdmin(req, res, next) {
    console.log('👑 Admin middleware called:', {
        isAuthenticated: req.isAuthenticated(),
        userRole: req.user?.role,
        path: req.path
    });

    if (req.isAuthenticated() && req.user.role === 'admin') {
        console.log('✅ Admin access granted for:', req.user.email);
        return next();
    }
    
    console.log('❌ Admin access denied');
    
    if (req.path.startsWith('/api/')) {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    
    res.redirect('/dashboard');
}

// ✅ CORRECTION ICI : Exporter correctement
module.exports = ensureAuthenticated;
module.exports.ensureAdmin = ensureAdmin; // Pas .admin mais .ensureAdmin
