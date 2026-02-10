const fs = require('fs-extra');
const path = require('path');

class Config {
    constructor() {
        this.config = {};
        this.environment = process.env.NODE_ENV || 'development';
        this.loadConfig();
    }

    loadConfig() {
        try {
            // Load default configuration
            const defaultConfigPath = path.join(__dirname, '../../config/default.json');
            this.config = fs.readJsonSync(defaultConfigPath);

            // Load environment-specific configuration
            const envConfigPath = path.join(__dirname, '../../config', `${this.environment}.json`);
            if (fs.existsSync(envConfigPath)) {
                const envConfig = fs.readJsonSync(envConfigPath);
                this.mergeConfig(this.config, envConfig);
            }

            // Load plugins configuration
            const pluginsConfigPath = path.join(__dirname, '../../config/plugins.json');
            if (fs.existsSync(pluginsConfigPath)) {
                this.config.plugins = fs.readJsonSync(pluginsConfigPath);
            }

            // Override with environment variables
            this.overrideWithEnvVars();

            console.log(`✅ Configuration loaded for ${this.environment} environment`);
        } catch (error) {
            console.error('❌ Error loading configuration:', error);
            throw error;
        }
    }

    mergeConfig(target, source) {
        for (const key of Object.keys(source)) {
            if (source[key] instanceof Object && !Array.isArray(source[key])) {
                Object.assign(source[key], this.mergeConfig(target[key] || {}, source[key]));
            }
        }
        Object.assign(target, source);
        return target;
    }

    overrideWithEnvVars() {
        // Database
        if (process.env.MONGODB_URI) {
            this.config.database.url = process.env.MONGODB_URI;
        }

        // Server
        if (process.env.PORT) {
            this.config.server.port = parseInt(process.env.PORT);
        }

        if (process.env.SESSION_SECRET) {
            this.config.server.sessionSecret = process.env.SESSION_SECRET;
        }

        // Admin
        if (process.env.ADMIN_EMAIL) {
            this.config.admin.defaultAdmin.email = process.env.ADMIN_EMAIL;
        }

        if (process.env.ADMIN_PASSWORD) {
            this.config.admin.defaultAdmin.password = process.env.ADMIN_PASSWORD;
        }
    }

    get(key, defaultValue = null) {
        const keys = key.split('.');
        let value = this.config;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }

        return value !== undefined ? value : defaultValue;
    }

    set(key, value) {
        const keys = key.split('.');
        let current = this.config;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;
    }

    getAll() {
        return this.config;
    }

    getEnvironment() {
        return this.environment;
    }

    isProduction() {
        return this.environment === 'production';
    }

    isDevelopment() {
        return this.environment === 'development';
    }
}

module.exports = new Config();
