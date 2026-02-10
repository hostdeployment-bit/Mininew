/**
 * Predefined validation rules for admin operations
 */
const adminValidationRules = {
    // User management validations
    userManagement: {
        userId: {
            required: true,
            type: 'string',
            minLength: 1
        },
        action: {
            required: true,
            type: 'string',
            enum: ['promote', 'demote', 'ban', 'unban', 'addCoins', 'removeCoins']
        }
    },

    // Coin management validations
    coinManagement: {
        userId: {
            required: true,
            type: 'string',
            minLength: 1
        },
        amount: {
            required: true,
            type: 'number',
            min: 1,
            max: 1000000
        },
        reason: {
            required: true,
            type: 'string',
            minLength: 3,
            maxLength: 100
        }
    },

    // Bot management validations
    botManagement: {
        number: {
            required: true,
            type: 'string',
            minLength: 10,
            maxLength: 15
        },
        action: {
            required: true,
            type: 'string',
            enum: ['connect', 'disconnect', 'restart', 'config']
        }
    },

    // System settings validations
    systemSettings: {
        settingName: {
            required: true,
            type: 'string',
            minLength: 3,
            maxLength: 50
        },
        settingValue: {
            required: true
        }
    },

    // Broadcast validations
    broadcast: {
        message: {
            required: true,
            type: 'string',
            minLength: 5,
            maxLength: 1000
        },
        target: {
            required: false,
            type: 'string',
            enum: ['all', 'users', 'groups', 'specific']
        }
    }
};

/**
 * Get validation rules for specific admin operation
 */
function getValidationRules(operation) {
    return adminValidationRules[operation] || {};
}

module.exports = {
    adminValidationRules,
    getValidationRules
};
