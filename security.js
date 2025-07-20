// Security Configuration Module
// This module handles secure configuration loading and encryption

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecurityManager {
    constructor() {
        this.encryptionKey = this.generateOrLoadKey();
        this.config = this.loadSecureConfig();
    }

    // Generate or load encryption key
    generateOrLoadKey() {
        const keyPath = path.join(__dirname, '.security_key');
        
        try {
            if (fs.existsSync(keyPath)) {
                return fs.readFileSync(keyPath, 'utf8');
            } else {
                const key = crypto.randomBytes(32).toString('hex');
                fs.writeFileSync(keyPath, key, { mode: 0o600 }); // Restricted permissions
                return key;
            }
        } catch (error) {
            console.error('Security key management error:', error);
            return crypto.randomBytes(32).toString('hex');
        }
    }

    // Encrypt sensitive data
    encrypt(text) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    }

    // Decrypt sensitive data
    decrypt(encryptedText) {
        try {
            const textParts = encryptedText.split(':');
            const iv = Buffer.from(textParts.shift(), 'hex');
            const encrypted = textParts.join(':');
            const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    // Load configuration securely
    loadSecureConfig() {
        const config = {
            firebase: {
                apiKey: process.env.FIREBASE_API_KEY || '',
                authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
                projectId: process.env.FIREBASE_PROJECT_ID || '',
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
                messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
                appId: process.env.FIREBASE_APP_ID || '',
                measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
            },
            security: {
                encryptionKey: process.env.ENCRYPTION_KEY || this.encryptionKey,
                jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex')
            },
            app: {
                nodeEnv: process.env.NODE_ENV || 'production',
                debugMode: process.env.DEBUG_MODE === 'true'
            }
        };

        // Validate required configuration
        if (!config.firebase.apiKey || !config.firebase.projectId) {
            console.warn('⚠️  Firebase configuration incomplete. Using demo mode.');
            return { ...config, demoMode: true };
        }

        return config;
    }

    // Get obfuscated config for client-side
    getClientConfig() {
        if (this.config.demoMode) {
            return { demoMode: true };
        }

        // Only return necessary and safe configuration
        return {
            firebase: {
                authDomain: this.config.firebase.authDomain,
                projectId: this.config.firebase.projectId
            },
            app: {
                version: '1.1.0',
                name: 'StellarChat'
            }
        };
    }

    // Generate secure session token
    generateSessionToken(userId) {
        try {
            const payload = {
                userId: userId,
                timestamp: Date.now(),
                random: crypto.randomBytes(16).toString('hex')
            };
            
            const token = crypto
                .createHmac('sha256', this.config.security.jwtSecret)
                .update(JSON.stringify(payload))
                .digest('hex');
                
            return this.encrypt(JSON.stringify({ ...payload, token }));
        } catch (error) {
            console.error('Token generation error:', error);
            return null;
        }
    }

    // Validate session token
    validateSessionToken(encryptedToken) {
        try {
            const decrypted = this.decrypt(encryptedToken);
            if (!decrypted) return false;
            
            const payload = JSON.parse(decrypted);
            const { token, ...data } = payload;
            
            const expectedToken = crypto
                .createHmac('sha256', this.config.security.jwtSecret)
                .update(JSON.stringify(data))
                .digest('hex');
                
            return token === expectedToken && (Date.now() - payload.timestamp) < 86400000; // 24 hours
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }
}

module.exports = new SecurityManager();