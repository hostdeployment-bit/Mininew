const db = require('../lib/database');

/**
 * Middleware to check if user is authenticated and has admin role
 */
function ensureAdmin(req, res, next) {
    // First check if user is authenticated
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please login first.'
        });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required. You do not have permission to access this resource.'
        });
    }

    // Check if user is active
    if (req.user.isActive === false) {
        return res.status(403).json({
            success: false,
            message: 'Your account has been deactivated. Please contact administrator.'
        });
    }

    // User is authenticated and is admin, proceed to next middleware
    next();
}

/**
 * Middleware to check if user is super admin (for critical operations)
 */
function ensureSuperAdmin(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    // Check for super admin (you can define your own criteria)
    // For example, check if it's the original admin account
    const isSuperAdmin = req.user.email === process.env.ADMIN_EMAIL || 
                        req.user._id.toString() === process.env.SUPER_ADMIN_ID;

    if (!isSuperAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Super admin access required for this operation'
        });
    }

    next();
}

/**
 * Middleware to log admin actions for audit trail
 */
function logAdminAction(action) {
    return async (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(data) {
            // Log the admin action after response is sent
            try {
                const adminAction = {
                    adminId: req.user._id,
                    adminEmail: req.user.email,
                    action: action,
                    method: req.method,
                    path: req.path,
                    params: req.params,
                    body: req.body, // Be careful with sensitive data
                    ip: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('User-Agent'),
                    timestamp: new Date(),
                    statusCode: res.statusCode
                };

                // Log to console (in production, log to database/file)
                console.log('🔐 ADMIN ACTION:', {
                    admin: req.user.email,
                    action: action,
                    path: req.path,
                    status: res.statusCode,
                    timestamp: new Date().toISOString()
                });

                // TODO: Save to admin actions collection in database
                // await db.AdminAction.create(adminAction);

            } catch (error) {
                console.error('Error logging admin action:', error);
            }

            originalSend.call(this, data);
        };

        next();
    };
}

/**
 * Middleware to validate admin permissions for specific operations
 */
function validateAdminPermissions(requiredPermissions = []) {
    return (req, res, next) => {
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        // If no specific permissions required, allow access
        if (requiredPermissions.length === 0) {
            return next();
        }

        // Check if user has all required permissions
        // This would typically check against a permissions system
        const userPermissions = getUserPermissions(req.user);
        
        const hasAllPermissions = requiredPermissions.every(permission => 
            userPermissions.includes(permission)
        );

        if (!hasAllPermissions) {
            return res.status(403).json({
                success: false,
                message: `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
            });
        }

        next();
    };
}

/**
 * Helper function to get user permissions (mock implementation)
 * In a real application, this would check against a database
 */
function getUserPermissions(user) {
    // Default permissions for admin users
    const defaultAdminPermissions = [
        'users:read',
        'users:manage',
        'bots:read', 
        'bots:manage',
        'coins:manage',
        'settings:read'
    ];

    // Super admin gets all permissions
    if (user.email === process.env.ADMIN_EMAIL) {
        return [
            ...defaultAdminPermissions,
            'system:manage',
            'logs:read',
            'backup:manage',
            'everything' // Wildcard permission
        ];
    }

    return defaultAdminPermissions;
}

/**
 * Middleware to rate limit admin actions
 */
function adminRateLimit(windowMs = 60000, maxRequests = 100) {
    const requests = new Map();

    return (req, res, next) => {
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            return next();
        }

        const adminId = req.user._id.toString();
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean up old entries
        for (const [id, timestamps] of requests.entries()) {
            requests.set(id, timestamps.filter(time => time > windowStart));
            if (requests.get(id).length === 0) {
                requests.delete(id);
            }
        }

        // Get or create admin's request timestamps
        if (!requests.has(adminId)) {
            requests.set(adminId, []);
        }

        const adminRequests = requests.get(adminId);
        adminRequests.push(now);

        // Check if over limit
        if (adminRequests.length > maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please slow down.'
            });
        }

        next();
    };
}

/**
 * Middleware to validate admin input for critical operations
 */
function validateAdminInput(rules) {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rule] of Object.entries(rules)) {
            const value = req.body[field];

            // Required check
            if (rule.required && (!value || value.toString().trim() === '')) {
                errors.push(`${field} is required`);
                continue;
            }

            // Type check
            if (rule.type && value) {
                switch (rule.type) {
                    case 'number':
                        if (isNaN(Number(value))) {
                            errors.push(`${field} must be a number`);
                        }
                        break;
                    case 'email':
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(value)) {
                            errors.push(`${field} must be a valid email`);
                        }
                        break;
                    case 'array':
                        if (!Array.isArray(value)) {
                            errors.push(`${field} must be an array`);
                        }
                        break;
                }
            }

            // Min/Max check for numbers
            if (rule.min !== undefined && value !== undefined) {
                if (Number(value) < rule.min) {
                    errors.push(`${field} must be at least ${rule.min}`);
                }
            }

            if (rule.max !== undefined && value !== undefined) {
                if (Number(value) > rule.max) {
                    errors.push(`${field} must be at most ${rule.max}`);
                }
            }

            // Length check for strings
            if (rule.minLength && value && value.length < rule.minLength) {
                errors.push(`${field} must be at least ${rule.minLength} characters`);
            }

            if (rule.maxLength && value && value.length > rule.maxLength) {
                errors.push(`${field} must be at most ${rule.maxLength} characters`);
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }

        next();
    };
}

/**
 * Middleware to check if admin can modify specific user
 * Prevents admins from modifying higher-level admins
 */
function canModifyUser(req, res, next) {
    const targetUserId = req.params.userId || req.body.userId;
    
    if (!targetUserId) {
        return next();
    }

    // Admin can always modify themselves
    if (targetUserId === req.user._id.toString()) {
        return next();
    }

    // Get target user from database
    db.User.findById(targetUserId)
        .then(targetUser => {
            if (!targetUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Prevent modifying super admin
            if (targetUser.email === process.env.ADMIN_EMAIL) {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot modify super admin account'
                });
            }

            // Regular admin cannot modify other admins
            if (targetUser.role === 'admin' && req.user.email !== process.env.ADMIN_EMAIL) {
                return res.status(403).json({
                    success: false,
                    message: 'Regular admins cannot modify other admin accounts'
                });
            }

            next();
        })
        .catch(error => {
            console.error('Error in canModifyUser middleware:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        });
}

/**
 * Middleware to sanitize admin input
 */
function sanitizeAdminInput(req, res, next) {
    // Sanitize string fields
    if (req.body) {
        for (const [key, value] of Object.entries(req.body)) {
            if (typeof value === 'string') {
                req.body[key] = value.trim();
                
                // Remove potential dangerous characters for some fields
                if (key.includes('name') || key.includes('title')) {
                    req.body[key] = value.replace(/[<>]/g, '');
                }
            }
        }
    }

    // Sanitize query parameters
    if (req.query) {
        for (const [key, value] of Object.entries(req.query)) {
            if (typeof value === 'string') {
                req.query[key] = value.trim();
            }
        }
    }

    next();
}

/**
 * Middleware to check admin session validity
 */
function checkAdminSession(req, res, next) {
    if (!req.isAuthenticated()) {
        return next();
    }

    // Check if admin session is still valid
    const sessionAge = Date.now() - req.session.createdAt;
    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours

    if (sessionAge > maxSessionAge) {
        req.logout((err) => {
            if (err) {
                console.error('Error during auto-logout:', err);
            }
        });
        
        return res.status(401).json({
            success: false,
            message: 'Session expired. Please login again.'
        });
    }

    next();
}

// Export all middleware functions
module.exports = {
    ensureAdmin,
    ensureSuperAdmin,
    logAdminAction,
    validateAdminPermissions,
    adminRateLimit,
    validateAdminInput,
    canModifyUser,
    sanitizeAdminInput,
    checkAdminSession
};

// Also export ensureAdmin as default for backward compatibility
module.exports.default = ensureAdmin;
