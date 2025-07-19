// StellarChat - Complete Server System

// Desktop-only application - Mobile support removed for better performance
console.log('StellarChat - Desktop Optimized Version v1.1.0');

// Performance optimization - disable mobile detection
const isDesktopApp = true;

// Initialize desktop-optimized features
document.addEventListener('DOMContentLoaded', function () {
    document.body.classList.add('desktop-optimized');
    initializeDesktopFeatures();
});

// Desktop-specific initialization
function initializeDesktopFeatures() {
    // Enable high-performance animations
    document.body.classList.add('high-performance');

    // Initialize notification system
    initializeNotificationSystem();

    // Setup performance monitoring
    setupPerformanceMonitoring();

    console.log('Desktop features initialized');
}

// Secure Configuration Loading
let firebaseConfig = null;
let firebase, db, auth;
let isDemoMode = false;

// Load configuration securely
async function loadSecureConfig() {
    try {
        // Try to load from secure endpoint (Electron) first
        if (window.electronAPI && window.electronAPI.getSecureConfig) {
            const result = await window.electronAPI.getSecureConfig();
            if (result.success && !result.config.demoMode) {
                return result.config;
            }
        }

        // For web version, use obfuscated configuration
        return await getObfuscatedFirebaseConfig();
    } catch (error) {
        console.warn("⚠️  Could not load configuration, using demo mode");
        return { demoMode: true };
    }
}

// Initialize Firebase securely
async function initializeFirebaseSecurely() {
    try {
        console.log("🔄 Starting Firebase initialization...");
        const config = await loadSecureConfig();
        console.log("🔍 Config loaded:", { demoMode: config.demoMode, hasFirebaseConfig: !!config.firebase });

        if (config.demoMode) {
            isDemoMode = true;
            console.log("🔒 Running in secure demo mode");
            return;
        }

        if (typeof window.firebase !== 'undefined' && config.firebase) {
            console.log("🔄 Firebase SDK found, initializing...");
            firebase = window.firebase;

            // Check if Firebase is already initialized
            if (firebase.apps.length === 0) {
                firebase.initializeApp(config.firebase);
                console.log("✅ Firebase app initialized");
            } else {
                console.log("ℹ️ Firebase app already initialized");
            }

            db = firebase.firestore();
            auth = firebase.auth();
            firebaseReady = true;
            console.log("🔒 Firebase initialized securely!");
            console.log("🔍 Firebase components:", { firebase: !!firebase, db: !!db, auth: !!auth });
        } else {
            isDemoMode = true;
            console.log("🔒 Firebase SDK not available - using secure demo mode");
            console.log("🔍 Debug info:", {
                firebaseExists: typeof window.firebase !== 'undefined',
                configExists: !!config.firebase
            });
        }
    } catch (error) {
        isDemoMode = true;
        console.error("❌ Firebase initialization failed:", error);
        console.error("❌ Full error:", error.message, error.stack);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initializeFirebaseSecurely);

// Firebase readiness check
let firebaseReady = false;
let firebaseInitPromise = null;

// Ensure Firebase is ready before operations
async function ensureFirebaseReady() {
    if (firebaseReady && firebase && auth) {
        return true;
    }

    if (!firebaseInitPromise) {
        firebaseInitPromise = initializeFirebaseSecurely();
    }

    await firebaseInitPromise;

    // Double check after initialization
    if (firebase && auth && !isDemoMode) {
        firebaseReady = true;
        return true;
    }

    return false;
}

// Obfuscated Firebase Configuration
async function getObfuscatedFirebaseConfig() {
    try {
        // Multi-layer obfuscation to hide Firebase config from inspection
        const obfuscatedData = [
            'QUl6YVN5QV9taDczelo1TDhhSGFRdFl0Si1aTGdnWENOVENJYU5j',
            'c3RlbGxhcmNoYXQtMzM2NDAuZmlyZWJhc2VhcHAuY29t',
            'c3RlbGxhcmNoYXQtMzM2NDA=',
            'c3RlbGxhcmNoYXQtMzM2NDAuZmlyZWJhc2VzdG9yYWdlLmFwcA==',
            'MzE3NDkxMDExMzY2',
            'MTozMTc0OTEwMTEzNjY6d2ViOjU1OGI0MzU0ZGI5NjI2N2MzNzJiZTc=',
            'Ry1KNUc4N1FRV0ZQ'
        ];

        // Decode and reconstruct configuration
        console.log('🔓 Decoding Firebase configuration...');
        const decodedConfig = {
            firebase: {
                apiKey: atob(obfuscatedData[0]),
                authDomain: atob(obfuscatedData[1]),
                projectId: atob(obfuscatedData[2]),
                storageBucket: atob(obfuscatedData[3]),
                messagingSenderId: atob(obfuscatedData[4]),
                appId: atob(obfuscatedData[5]),
                measurementId: atob(obfuscatedData[6])
            }
        };

        // Additional security layer - validate configuration
        if (!decodedConfig.firebase.apiKey || !decodedConfig.firebase.projectId) {
            console.error('❌ Invalid decoded configuration');
            throw new Error('Invalid configuration');
        }

        console.log('✅ Firebase configuration decoded successfully');
        console.log('🔍 Config validation:', {
            hasApiKey: !!decodedConfig.firebase.apiKey,
            hasProjectId: !!decodedConfig.firebase.projectId,
            hasAuthDomain: !!decodedConfig.firebase.authDomain
        });

        return decodedConfig;
    } catch (error) {
        console.warn('⚠️  Configuration decoding failed, using demo mode');
        return { demoMode: true };
    }
}

// Secure session management
class SecureSessionManager {
    constructor() {
        this.sessionToken = null;
        this.userId = null;
        this.isSecure = false;
    }

    async createSession(userId) {
        try {
            if (window.electronAPI && window.electronAPI.createSecureSession) {
                const result = await window.electronAPI.createSecureSession(userId);
                if (result.success) {
                    this.sessionToken = result.sessionToken;
                    this.userId = userId;
                    this.isSecure = true;
                    console.log('🔒 Secure session created');
                    return true;
                }
            }
            // Fallback for web version - use basic session
            this.userId = userId;
            this.sessionToken = this.generateBasicToken(userId);
            console.log('🔒 Basic session created');
            return true;
        } catch (error) {
            console.error('Session creation failed:', error);
            return false;
        }
    }

    async validateSession() {
        try {
            if (this.isSecure && window.electronAPI && window.electronAPI.validateSecureSession) {
                const result = await window.electronAPI.validateSecureSession(this.sessionToken);
                return result.success && result.valid;
            }
            // Basic validation for web version
            return this.sessionToken && this.userId;
        } catch (error) {
            console.error('Session validation failed:', error);
            return false;
        }
    }

    generateBasicToken(userId) {
        // Basic token generation for web version (not as secure as Electron version)
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return btoa(`${userId}:${timestamp}:${random}`);
    }

    clearSession() {
        this.sessionToken = null;
        this.userId = null;
        this.isSecure = false;
        console.log('🔒 Session cleared');
    }
}

// Initialize secure session manager
const secureSession = new SecureSessionManager();

// Security utilities
class SecurityUtils {
    static sanitizeInput(input) {
        if (typeof input !== 'string') return '';

        // Remove potentially dangerous characters and scripts
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/data:text\/html/gi, '')
            .trim()
            .substring(0, 1000); // Limit length
    }

    static validateUsername(username) {
        if (!username || typeof username !== 'string') return false;

        // Username validation: 3-20 chars, alphanumeric and underscore only
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
    }

    static validateMessage(message) {
        if (!message || typeof message !== 'string') return false;

        // Message validation: not empty, reasonable length
        const sanitized = this.sanitizeInput(message);
        return sanitized.length > 0 && sanitized.length <= 2000;
    }

    static obfuscateError(error) {
        // Don't expose internal error details to users
        const safeErrors = {
            'auth/user-not-found': 'Invalid credentials',
            'auth/wrong-password': 'Invalid credentials',
            'auth/too-many-requests': 'Too many attempts. Please try again later.',
            'permission-denied': 'Access denied',
            'not-found': 'Resource not found'
        };

        return safeErrors[error.code] || 'An error occurred. Please try again.';
    }

    static generateSecureId() {
        // Generate cryptographically secure random ID
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
}

// Rate limiting for security
class RateLimiter {
    constructor() {
        this.attempts = new Map();
        this.maxAttempts = 5;
        this.windowMs = 15 * 60 * 1000; // 15 minutes
    }

    isAllowed(key) {
        const now = Date.now();
        const attempts = this.attempts.get(key) || [];

        // Remove old attempts outside the window
        const validAttempts = attempts.filter(time => now - time < this.windowMs);

        if (validAttempts.length >= this.maxAttempts) {
            return false;
        }

        validAttempts.push(now);
        this.attempts.set(key, validAttempts);
        return true;
    }

    reset(key) {
        this.attempts.delete(key);
    }
}

// Initialize security components
const securityUtils = SecurityUtils;
const rateLimiter = new RateLimiter();

// Debug function to test Firebase configuration
window.testFirebaseConfig = async function () {
    console.log('🧪 Testing Firebase configuration...');
    try {
        const config = await getObfuscatedFirebaseConfig();
        console.log('🧪 Config test result:', {
            demoMode: config.demoMode,
            hasFirebaseConfig: !!config.firebase,
            apiKeyLength: config.firebase?.apiKey?.length,
            projectId: config.firebase?.projectId
        });
        return config;
    } catch (error) {
        console.error('🧪 Config test failed:', error);
        return null;
    }
};

// Global Variables
let currentUser = null;
let currentServer = null;
let currentChannel = 'general';
let currentChatType = 'none'; // 'server', 'dm', or 'none'
let currentDMUser = null;
let messageListeners = [];
let presenceListeners = [];
let isSendingMessage = false;
let userServers = [];

// Voice Call Variables
let localStream = null;
let peerConnections = {};
let currentCallId = null;
let isInCall = false;

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// UTILITY FUNCTIONS
function showNotification(message, type = 'info') {
    try {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Play notification sound
        if (type === 'success' || type === 'info') {
            playNotificationSound();
        }

        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    } catch (error) {
        console.log('Notification:', message);
    }
}

function playNotificationSound() {
    try {
        // Use Electron's notification sound if available
        if (window.electronAPI && window.electronAPI.playNotificationSound) {
            window.electronAPI.playNotificationSound();
        } else {
            // Use actual notification sound file for web version
            const audio = new Audio('Notification.mp3');
            audio.volume = 0.7;
            audio.play().catch(error => {
                console.log('Could not play notification sound file, using fallback:', error);
                // Fallback to web audio if file fails
                playFallbackNotificationSound();
            });
        }
    } catch (error) {
        console.log('Could not play notification sound:', error);
        playFallbackNotificationSound();
    }
}

// Fallback notification sound using Web Audio API
function playFallbackNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.log('Fallback notification sound failed:', error);
    }
}

function playMessageSound() {
    try {
        // Use actual UI press sound file
        const audio = new Audio('PressUI.mp3');
        audio.volume = 0.5;
        audio.play().catch(error => {
            console.log('Could not play UI press sound:', error);
        });
    } catch (error) {
        console.log('Could not play message sound:', error);
    }
}

// Enhanced DM notification sound
function playDMNotificationSound() {
    try {
        // Use Electron's notification sound if available
        if (window.electronAPI && window.electronAPI.playNotificationSound) {
            window.electronAPI.playNotificationSound();
        } else {
            // Use actual notification sound file for DMs
            const audio = new Audio('Notification.mp3');
            audio.volume = 0.8;
            audio.play().catch(error => {
                console.log('Could not play DM notification sound file, using fallback:', error);
                // Fallback to distinctive two-tone sound
                playFallbackDMSound();
            });
        }
    } catch (error) {
        console.log('Could not play DM notification sound:', error);
        playFallbackDMSound();
    }
}

// Fallback DM notification sound
function playFallbackDMSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Two-tone notification for DMs
        oscillator1.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator2.frequency.setValueAtTime(800, audioContext.currentTime);

        oscillator1.frequency.setValueAtTime(500, audioContext.currentTime + 0.1);
        oscillator2.frequency.setValueAtTime(700, audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.4);
        oscillator2.stop(audioContext.currentTime + 0.4);
    } catch (error) {
        console.log('Fallback DM sound failed:', error);
    }
}

// UI Press sound effect
function playUIPressSound() {
    try {
        const audio = new Audio('PressUI.mp3');
        audio.volume = 0.5;
        audio.play().catch(error => {
            console.log('Could not play UI press sound:', error);
        });
    } catch (error) {
        console.log('Could not play UI press sound:', error);
    }
}

// Initialize notification system
function initializeNotificationSystem() {
    // Request notification permission immediately for better UX
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            console.log('Notification permission:', permission);
            if (permission === 'granted') {
                showNotification('🔔 Desktop notifications enabled for DMs!', 'success');
            }
        });
    }

    // Initialize notification badge counter
    window.notificationCount = 0;

    // Add UI sound effects to common buttons
    addUISoundEffects();

    console.log('Notification system initialized');
}

// Add UI sound effects to buttons
function addUISoundEffects() {
    try {
        // Add click sound to all buttons
        document.addEventListener('click', function (event) {
            const target = event.target;

            // Check if clicked element is a button or has button-like classes
            if (target.tagName === 'BUTTON' ||
                target.classList.contains('btn') ||
                target.classList.contains('control-btn') ||
                target.classList.contains('auth-btn') ||
                target.classList.contains('nav-tab') ||
                target.classList.contains('server-item') ||
                target.classList.contains('friend-item') ||
                target.classList.contains('dm-item')) {

                // Play UI press sound
                playUIPressSound();
            }
        });

        console.log('UI sound effects added to buttons');
    } catch (error) {
        console.log('Could not add UI sound effects:', error);
    }
}

// Show desktop notification for DMs
function showDesktopNotification(title, body, icon = null) {
    try {
        // Use Electron system notifications if available
        if (window.electronAPI && window.electronAPI.showSystemNotification) {
            window.electronAPI.showSystemNotification(title, body, icon);
        } else if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: body,
                icon: icon || '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'stellarchat-dm',
                requireInteraction: false,
                silent: false
            });

            // Auto close after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);

            // Focus window when clicked
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    } catch (error) {
        console.log('Could not show desktop notification:', error);
    }
}

// Enhanced DM notification system - works even when browser is in background
function showEnhancedDMNotification(title, body, icon = null, senderName = '') {
    try {
        // Request notification permission if not already granted
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    showEnhancedDMNotification(title, body, icon, senderName);
                }
            });
            return;
        }

        // Use Electron system notifications if available
        if (window.electronAPI && window.electronAPI.showSystemNotification) {
            window.electronAPI.showSystemNotification(title, body, icon);
        } else if ('Notification' in window && Notification.permission === 'granted') {
            // Enhanced notification for DMs with better visibility
            const notification = new Notification(title, {
                body: body,
                icon: icon || '/favicon.ico',
                badge: '/favicon.ico',
                tag: `stellarchat-dm-${senderName}`,
                requireInteraction: true, // Keep notification visible until user interacts
                silent: false, // Allow system sound
                timestamp: Date.now(),
                data: {
                    sender: senderName,
                    type: 'dm',
                    timestamp: Date.now()
                }
            });

            // Enhanced click handling
            notification.onclick = () => {
                // Focus the window
                window.focus();

                // Bring browser tab to front if possible
                if (document.hidden) {
                    document.addEventListener('visibilitychange', function onVisibilityChange() {
                        if (!document.hidden) {
                            document.removeEventListener('visibilitychange', onVisibilityChange);
                        }
                    });
                }

                // Play UI press sound when notification is clicked
                playUIPressSound();

                // Close notification
                notification.close();

                console.log(`📱 DM notification clicked - focusing on conversation with ${senderName}`);
            };

            // Auto close after 10 seconds for DMs (longer than regular notifications)
            setTimeout(() => {
                notification.close();
            }, 10000);

            console.log(`📱 Enhanced DM notification shown for ${senderName}`);
        } else {
            // Fallback: show in-app notification if desktop notifications aren't available
            showNotification(`${title}: ${body}`, 'info');
        }
    } catch (error) {
        console.log('Could not show enhanced DM notification:', error);
        // Fallback to regular notification
        showDesktopNotification(title, body, icon);
    }
}

// Update notification badge
function updateNotificationBadge() {
    try {
        window.notificationCount = (window.notificationCount || 0) + 1;
        const badge = document.getElementById('notification-badge');
        if (badge) {
            badge.textContent = window.notificationCount;
            badge.style.display = 'flex';
        }
    } catch (error) {
        console.log('Could not update notification badge:', error);
    }
}

// Clear notification badge
function clearNotificationBadge() {
    try {
        window.notificationCount = 0;
        const badge = document.getElementById('notification-badge');
        if (badge) {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.log('Could not clear notification badge:', error);
    }
}

// Show notifications panel
function showNotificationsPanel() {
    try {
        showNotification('Notifications panel - Coming soon! 🔔', 'info');
        // Clear badge when viewing notifications
        clearNotificationBadge();
    } catch (error) {
        console.log('Could not show notifications panel:', error);
    }
}

// Performance monitoring system
function setupPerformanceMonitoring() {
    let isWindowFocused = true;
    let animationFrameId = null;
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let fps = 60;

    // Monitor window focus/blur
    window.addEventListener('focus', () => {
        isWindowFocused = true;
        document.body.classList.remove('window-blurred');
        document.body.classList.add('window-focused');
        console.log('Window focused - enabling high performance mode');
    });

    window.addEventListener('blur', () => {
        isWindowFocused = false;
        document.body.classList.remove('window-focused');
        document.body.classList.add('window-blurred');
        console.log('Window blurred - enabling power saving mode');
    });

    // FPS monitoring and animation optimization
    function monitorPerformance() {
        const currentTime = performance.now();
        frameCount++;

        if (currentTime - lastFrameTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastFrameTime = currentTime;

            // Adjust animation quality based on FPS and focus
            if (!isWindowFocused) {
                // Drastically reduce animations when window is not focused
                document.body.classList.add('reduced-animations');
                document.body.classList.remove('high-performance', 'medium-performance', 'low-performance');

                // Slow down monitoring when window is blurred to save resources
                setTimeout(() => {
                    if (!isWindowFocused && animationFrameId) {
                        animationFrameId = requestAnimationFrame(monitorPerformance);
                    }
                }, 1000); // Check every 1 second instead of every frame when blurred
                return;
            } else if (fps < 30) {
                document.body.classList.add('low-performance');
                document.body.classList.remove('medium-performance', 'high-performance', 'reduced-animations');
            } else if (fps < 50) {
                document.body.classList.add('medium-performance');
                document.body.classList.remove('low-performance', 'high-performance', 'reduced-animations');
            } else {
                document.body.classList.add('high-performance');
                document.body.classList.remove('low-performance', 'medium-performance', 'reduced-animations');
            }
        }

        // Only continue high-frequency monitoring when window is focused
        if (isWindowFocused) {
            animationFrameId = requestAnimationFrame(monitorPerformance);
        }
    }

    // Start monitoring
    animationFrameId = requestAnimationFrame(monitorPerformance);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    });

    console.log('Performance monitoring initialized');
}

function formatTimestamp(timestamp) {
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    } catch (error) {
        return 'Unknown time';
    }
}

function escapeHtml(text) {
    try {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    } catch (error) {
        return text;
    }
}

// Settings Functions
function showSettings() {
    try {
        const settingsModal = document.createElement('div');
        settingsModal.className = 'modal-overlay';
        settingsModal.id = 'settings-modal';

        settingsModal.innerHTML = `
            <div class="modal-content settings-modal">
                <div class="modal-header">
                    <h2><i class="fas fa-cog"></i> Settings</h2>
                    <button class="modal-close" onclick="closeSettings()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="settings-tabs">
                        <button class="settings-tab active" onclick="showSettingsTab('profile')">
                            <i class="fas fa-user"></i> Profile
                        </button>
                        <button class="settings-tab" onclick="showSettingsTab('appearance')">
                            <i class="fas fa-palette"></i> Appearance
                        </button>
                        <button class="settings-tab" onclick="showSettingsTab('status')">
                            <i class="fas fa-circle"></i> Status
                        </button>
                        ${currentUser && currentUser.username === 'SoraNeko' && currentUser.email === 'albertderek6878@gmail.com' ? `
                        <button class="settings-tab" onclick="showSettingsTab('sora-admin')" style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white;">
                            <i class="fas fa-crown"></i> Admin
                        </button>
                        ` : ''}
                    </div>
                    
                    <div class="settings-content">
                        <!-- Profile Tab -->
                        <div class="settings-tab-content active" id="profile-tab">
                            <div class="settings-section">
                                <h3>Profile Picture</h3>
                                <div class="profile-picture-section">
                                    <div class="current-avatar">
                                        ${currentUser?.photoURL
                ? `<img src="${currentUser.photoURL}" alt="Avatar">`
                : '<i class="fas fa-user"></i>'
            }
                                    </div>
                                    <div class="avatar-controls">
                                        <input type="file" id="avatar-upload" accept="image/*" style="display: none;" onchange="handleAvatarUpload(event)">
                                        <button onclick="document.getElementById('avatar-upload').click()" class="btn-secondary">
                                            <i class="fas fa-upload"></i> Upload New
                                        </button>
                                        <button onclick="removeAvatar()" class="btn-danger">
                                            <i class="fas fa-trash"></i> Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="settings-section">
                                <h3>Username</h3>
                                <div class="username-section">
                                    <input type="text" id="new-username" value="${currentUser?.username || ''}" placeholder="Enter new username">
                                    <div class="username-status" id="username-change-status"></div>
                                    <button onclick="updateUsername()" class="btn-primary">
                                        <i class="fas fa-save"></i> Update Username
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Appearance Tab -->
                        <div class="settings-tab-content" id="appearance-tab">
                            <div class="settings-section">
                                <h3>Theme</h3>
                                <div class="theme-options">
                                    <div class="theme-option" onclick="setTheme('dark')">
                                        <div class="theme-preview dark-theme">
                                            <div class="theme-preview-header"></div>
                                            <div class="theme-preview-body"></div>
                                        </div>
                                        <span>Dark Mode</span>
                                        <i class="fas fa-check theme-check" id="dark-check"></i>
                                    </div>
                                    <div class="theme-option" onclick="setTheme('light')">
                                        <div class="theme-preview light-theme">
                                            <div class="theme-preview-header"></div>
                                            <div class="theme-preview-body"></div>
                                        </div>
                                        <span>Light Mode</span>
                                        <i class="fas fa-check theme-check" id="light-check"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Status Tab -->
                        <div class="settings-tab-content" id="status-tab">
                            <div class="settings-section">
                                <h3>Online Status</h3>
                                <div class="status-options">
                                    <div class="status-option" onclick="setUserStatus('online')">
                                        <div class="status-indicator online"></div>
                                        <span>Online</span>
                                        <i class="fas fa-check status-check" id="online-check"></i>
                                    </div>
                                    <div class="status-option" onclick="setUserStatus('away')">
                                        <div class="status-indicator away"></div>
                                        <span>Away</span>
                                        <i class="fas fa-check status-check" id="away-check"></i>
                                    </div>
                                    <div class="status-option" onclick="setUserStatus('busy')">
                                        <div class="status-indicator busy"></div>
                                        <span>Do Not Disturb</span>
                                        <i class="fas fa-check status-check" id="busy-check"></i>
                                    </div>
                                    <div class="status-option" onclick="setUserStatus('invisible')">
                                        <div class="status-indicator offline"></div>
                                        <span>Invisible</span>
                                        <i class="fas fa-check status-check" id="invisible-check"></i>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="settings-section">
                                <h3>Custom Status Message</h3>
                                <div class="custom-status-section">
                                    <input type="text" id="custom-status" placeholder="What's happening?" maxlength="128">
                                    <button onclick="updateCustomStatus()" class="btn-primary">
                                        <i class="fas fa-save"></i> Set Status
                                    </button>
                                    <button onclick="clearCustomStatus()" class="btn-secondary">
                                        <i class="fas fa-times"></i> Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        ${currentUser && currentUser.username === 'SoraNeko' && currentUser.email === 'albertderek6878@gmail.com' ? `
                        <!-- SoraNeko Admin Tab -->
                        <div class="settings-tab-content" id="sora-admin-tab">
                            <div class="settings-section">
                                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 25px; margin-bottom: 30px; color: white; text-align: center;">
                                    <div style="font-size: 48px; margin-bottom: 15px;">
                                        <i class="fas fa-crown"></i>
                                    </div>
                                    <h3 style="margin: 0 0 10px 0; font-size: 24px;">SoraNeko Admin Panel</h3>
                                    <p style="margin: 0; opacity: 0.9;">Special administrative privileges for user account management.</p>
                                </div>

                                <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                                    <p style="color: #92400e; margin: 0;">
                                        <strong>🔥 Admin Powers:</strong> Lock any user account with custom reasons and durations.
                                    </p>
                                </div>

                                <div style="display: grid; gap: 25px; max-width: 600px;">
                                    <div>
                                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">
                                            <i class="fas fa-user"></i> Target Username:
                                        </label>
                                        <input type="text" id="sora-settings-username" placeholder="Enter username to lock" style="
                                            width: 100%;
                                            padding: 15px;
                                            border: 2px solid #7c3aed;
                                            border-radius: 8px;
                                            font-size: 16px;
                                            background: white;
                                        ">
                                    </div>

                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                        <div>
                                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">
                                                <i class="fas fa-clock"></i> Lock Duration:
                                            </label>
                                            <select id="sora-settings-duration" style="
                                                width: 100%;
                                                padding: 15px;
                                                border: 2px solid #7c3aed;
                                                border-radius: 8px;
                                                font-size: 16px;
                                                background: white;
                                            ">
                                                <option value="0.5">30 minutes</option>
                                                <option value="1">1 hour</option>
                                                <option value="3">3 hours</option>
                                                <option value="6">6 hours</option>
                                                <option value="12">12 hours</option>
                                                <option value="24" selected>24 hours (1 day)</option>
                                                <option value="48">48 hours (2 days)</option>
                                                <option value="72">72 hours (3 days)</option>
                                                <option value="168">168 hours (1 week)</option>
                                                <option value="custom">Custom duration...</option>
                                            </select>
                                            <input type="number" id="sora-settings-custom-duration" placeholder="Custom hours" 
                                                   style="width: 100%; padding: 15px; border: 2px solid #7c3aed; border-radius: 8px; font-size: 16px; margin-top: 10px; display: none; background: white;">
                                        </div>

                                        <div>
                                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">
                                                <i class="fas fa-tags"></i> Lock Category:
                                            </label>
                                            <select id="sora-settings-category" style="
                                                width: 100%;
                                                padding: 15px;
                                                border: 2px solid #7c3aed;
                                                border-radius: 8px;
                                                font-size: 16px;
                                                background: white;
                                            ">
                                                <option value="inappropriate_content">Inappropriate Content</option>
                                                <option value="harassment">Harassment</option>
                                                <option value="spam">Spam/Flooding</option>
                                                <option value="toxic_behavior">Toxic Behavior</option>
                                                <option value="rule_violation">Rule Violation</option>
                                                <option value="security_concern">Security Concern</option>
                                                <option value="custom">Custom Reason</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">
                                            <i class="fas fa-comment-alt"></i> Detailed Reason:
                                        </label>
                                        <textarea id="sora-settings-reason" placeholder="Enter detailed reason for the account lock..." style="
                                            width: 100%;
                                            padding: 15px;
                                            border: 2px solid #7c3aed;
                                            border-radius: 8px;
                                            font-size: 16px;
                                            min-height: 100px;
                                            resize: vertical;
                                            font-family: inherit;
                                            background: white;
                                        "></textarea>
                                    </div>

                                    <div style="display: flex; gap: 15px; margin-top: 20px;">
                                        <button onclick="executeSoraNekoSettingsLock()" style="
                                            flex: 2;
                                            background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
                                            color: white;
                                            border: none;
                                            padding: 18px;
                                            border-radius: 8px;
                                            font-size: 18px;
                                            font-weight: 600;
                                            cursor: pointer;
                                            transition: all 0.2s;
                                            box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
                                        ">
                                            <i class="fas fa-hammer"></i> Execute Lock
                                        </button>
                                        <button onclick="clearSoraNekoSettingsForm()" style="
                                            flex: 1;
                                            background: #6b7280;
                                            color: white;
                                            border: none;
                                            padding: 18px;
                                            border-radius: 8px;
                                            font-size: 16px;
                                            cursor: pointer;
                                            transition: all 0.2s;
                                        ">
                                            <i class="fas fa-eraser"></i> Clear
                                        </button>
                                    </div>

                                    <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-top: 25px;">
                                        <h4 style="color: #374151; margin-bottom: 15px;">
                                            <i class="fas fa-info-circle"></i> Quick Actions:
                                        </h4>
                                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                                            <button onclick="quickSoraNekoLock('spam', 6)" style="
                                                background: #f59e0b; color: white; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-size: 14px;
                                            ">
                                                <i class="fas fa-ban"></i> Quick Spam Lock (6h)
                                            </button>
                                            <button onclick="quickSoraNekoLock('toxic', 24)" style="
                                                background: #ef4444; color: white; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-size: 14px;
                                            ">
                                                <i class="fas fa-fire"></i> Toxic Behavior (24h)
                                            </button>
                                            <button onclick="quickSoraNekoLock('warning', 1)" style="
                                                background: #10b981; color: white; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; font-size: 14px;
                                            ">
                                                <i class="fas fa-exclamation"></i> Warning Lock (1h)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(settingsModal);

        // Add click outside to close
        settingsModal.addEventListener('click', function (e) {
            if (e.target === settingsModal) {
                closeSettings();
            }
        });

        // Add escape key to close
        const escapeHandler = function (e) {
            if (e.key === 'Escape') {
                closeSettings();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Load current settings
        loadCurrentSettings();

    } catch (error) {
        console.error('Show settings error:', error);
        showNotification('Failed to open settings', 'error');
    }
}

function closeSettings() {
    try {
        const modal = document.getElementById('settings-modal');
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        } else if (modal) {
            modal.remove();
        }
    } catch (error) {
        console.error('Close settings error:', error);
        // Fallback: try to remove by class if ID fails
        try {
            const modalByClass = document.querySelector('.modal-overlay');
            if (modalByClass) {
                modalByClass.remove();
            }
        } catch (fallbackError) {
            console.error('Fallback close error:', fallbackError);
        }
    }
}

function showSettingsTab(tabName) {
    try {
        // Update tab buttons
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[onclick="showSettingsTab('${tabName}')"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Handle custom duration dropdown for SoraNeko admin tab
        if (tabName === 'sora-admin') {
            const durationSelect = document.getElementById('sora-settings-duration');
            const customInput = document.getElementById('sora-settings-custom-duration');

            if (durationSelect && customInput) {
                durationSelect.addEventListener('change', function () {
                    if (this.value === 'custom') {
                        customInput.style.display = 'block';
                        customInput.focus();
                    } else {
                        customInput.style.display = 'none';
                    }
                });
            }
        }
    } catch (error) {
        console.error('Show settings tab error:', error);
    }
}

// SoraNeko Admin Functions (Settings Integration)

// Execute SoraNeko admin lock from settings
async function executeSoraNekoSettingsLock() {
    // Verify SoraNeko privileges
    if (!currentUser || currentUser.username !== 'SoraNeko' || currentUser.email !== 'albertderek6878@gmail.com') {
        console.error('❌ Unauthorized SoraNeko admin access attempt');
        alert('❌ Access denied. This feature is only available to SoraNeko.');
        return;
    }

    try {
        const username = document.getElementById('sora-settings-username').value.trim();
        const durationSelect = document.getElementById('sora-settings-duration');
        const customDuration = document.getElementById('sora-settings-custom-duration');
        const category = document.getElementById('sora-settings-category').value;
        const reason = document.getElementById('sora-settings-reason').value.trim();

        // Validation
        if (!username) {
            alert('👑 Please enter a username to lock.');
            document.getElementById('sora-settings-username').focus();
            return;
        }

        if (!reason) {
            alert('👑 Please enter a detailed reason for the lock.');
            document.getElementById('sora-settings-reason').focus();
            return;
        }

        // Get duration
        let duration;
        if (durationSelect.value === 'custom') {
            duration = parseFloat(customDuration.value);
            if (!duration || duration < 0.1) {
                alert('👑 Please enter a valid custom duration (minimum 0.1 hours).');
                customDuration.focus();
                return;
            }
        } else {
            duration = parseFloat(durationSelect.value);
        }

        // Create enhanced reason with category
        const categoryLabels = {
            'inappropriate_content': 'Inappropriate Content',
            'harassment': 'Harassment',
            'spam': 'Spam/Flooding',
            'toxic_behavior': 'Toxic Behavior',
            'rule_violation': 'Rule Violation',
            'security_concern': 'Security Concern',
            'custom': 'Custom'
        };

        const enhancedReason = `[${categoryLabels[category]}] ${reason}`;

        // Special SoraNeko confirmation
        const confirmMessage = `👑 SoraNeko Admin Action Confirmation
        
Target User: ${username}
Duration: ${duration} hours
Category: ${categoryLabels[category]}
Reason: ${reason}

Are you sure you want to execute this lock?`;

        if (!confirm(confirmMessage)) {
            return;
        }

        // Execute lock using the moderation system
        if (window.stellarChatModeration && window.stellarChatModeration.lockManager) {
            const lockResult = await window.stellarChatModeration.lockManager.lockAccount(
                username,
                duration,
                enhancedReason,
                'SORA_ADMIN',
                'albertderek6878@gmail.com'
            );

            // Success notification
            showNotification(`👑 Account "${username}" locked for ${duration} hours`, 'success');

            // Clear form
            clearSoraNekoSettingsForm();

            console.log('👑 SoraNeko admin lock executed from settings:', lockResult);
        } else {
            alert('❌ Moderation system not available. Please try again.');
        }

    } catch (error) {
        console.error('❌ SoraNeko admin lock failed:', error);
        alert(`👑 Failed to execute lock: ${error.message}`);
    }
}

// Clear SoraNeko admin form in settings
function clearSoraNekoSettingsForm() {
    if (!currentUser || currentUser.username !== 'SoraNeko' || currentUser.email !== 'albertderek6878@gmail.com') {
        return;
    }

    document.getElementById('sora-settings-username').value = '';
    document.getElementById('sora-settings-duration').value = '24';
    document.getElementById('sora-settings-custom-duration').value = '';
    document.getElementById('sora-settings-custom-duration').style.display = 'none';
    document.getElementById('sora-settings-category').value = 'inappropriate_content';
    document.getElementById('sora-settings-reason').value = '';
}

// Quick lock functionality for SoraNeko in settings
async function quickSoraNekoLock(type, hours) {
    if (!currentUser || currentUser.username !== 'SoraNeko' || currentUser.email !== 'albertderek6878@gmail.com') {
        console.error('❌ Unauthorized SoraNeko quick lock attempt');
        return;
    }

    const username = document.getElementById('sora-settings-username').value.trim();
    if (!username) {
        alert('👑 Please enter a username first.');
        document.getElementById('sora-settings-username').focus();
        return;
    }

    const quickLockReasons = {
        'spam': 'Spam/flooding detected - quick administrative action',
        'toxic': 'Toxic behavior - immediate intervention required',
        'warning': 'Warning lock - minor rule violation'
    };

    const quickLockCategories = {
        'spam': 'spam',
        'toxic': 'toxic_behavior',
        'warning': 'rule_violation'
    };

    // Set form values
    document.getElementById('sora-settings-duration').value = hours.toString();
    document.getElementById('sora-settings-category').value = quickLockCategories[type];
    document.getElementById('sora-settings-reason').value = quickLockReasons[type];

    // Confirm and execute
    if (confirm(`👑 Quick Lock: ${username} for ${hours} hours?\nReason: ${quickLockReasons[type]}`)) {
        await executeSoraNekoSettingsLock();
    }
}

async function loadCurrentSettings() {
    try {
        // Load current theme
        const currentTheme = localStorage.getItem('stellarchat-theme') || 'dark';
        document.getElementById(`${currentTheme}-check`).style.display = 'block';

        // Load current status
        if (currentUser && !isDemoMode) {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const status = userData.status || 'online';
                const customStatus = userData.customStatus || '';

                document.getElementById(`${status}-check`).style.display = 'block';
                document.getElementById('custom-status').value = customStatus;
            }
        }
    } catch (error) {
        console.error('Load current settings error:', error);
    }
}

function attachFile() {
    showNotification('File attachments coming soon!', 'info');
}

// Settings Implementation Functions
async function handleAvatarUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showNotification('Image must be less than 5MB', 'error');
            return;
        }

        if (!file.type.startsWith('image/')) {
            showNotification('Please select an image file', 'error');
            return;
        }

        if (isDemoMode) {
            showNotification('Avatar upload not available in demo mode', 'info');
            return;
        }

        showNotification('Uploading avatar...', 'info');

        // Upload to Firebase Storage
        const storageRef = firebase.storage().ref();
        const avatarRef = storageRef.child(`avatars/${currentUser.uid}`);

        const snapshot = await avatarRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();

        // Update user document
        await db.collection('users').doc(currentUser.uid).update({
            photoURL: downloadURL
        });

        // Update current user object
        currentUser.photoURL = downloadURL;

        // Update UI
        document.querySelector('.current-avatar').innerHTML = `<img src="${downloadURL}" alt="Avatar">`;
        const userAvatar = document.querySelector('.user-avatar');
        if (userAvatar) {
            userAvatar.innerHTML = `<img src="${downloadURL}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        }

        showNotification('Avatar updated successfully!', 'success');

    } catch (error) {
        console.error('Avatar upload error:', error);
        showNotification('Failed to upload avatar', 'error');
    }
}

async function removeAvatar() {
    try {
        if (isDemoMode) {
            showNotification('Avatar removal not available in demo mode', 'info');
            return;
        }

        if (!confirm('Are you sure you want to remove your avatar?')) return;

        // Update user document
        await db.collection('users').doc(currentUser.uid).update({
            photoURL: null
        });

        // Update current user object
        currentUser.photoURL = null;

        // Update UI
        document.querySelector('.current-avatar').innerHTML = '<i class="fas fa-user"></i>';
        const userAvatar = document.querySelector('.user-avatar');
        if (userAvatar) {
            userAvatar.innerHTML = '<i class="fas fa-user"></i>';
        }

        showNotification('Avatar removed successfully!', 'success');

    } catch (error) {
        console.error('Remove avatar error:', error);
        showNotification('Failed to remove avatar', 'error');
    }
}

async function updateUsername() {
    try {
        const newUsername = document.getElementById('new-username').value.trim();
        const statusElement = document.getElementById('username-change-status');

        if (!newUsername) {
            statusElement.textContent = 'Username cannot be empty';
            statusElement.className = 'username-status error';
            return;
        }

        if (newUsername === currentUser.username) {
            statusElement.textContent = 'This is already your username';
            statusElement.className = 'username-status error';
            return;
        }

        if (newUsername.length < 3) {
            statusElement.textContent = 'Username must be at least 3 characters';
            statusElement.className = 'username-status error';
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
            statusElement.textContent = 'Only letters, numbers, and underscores allowed';
            statusElement.className = 'username-status error';
            return;
        }

        if (isDemoMode) {
            showNotification('Username changes not available in demo mode', 'info');
            return;
        }

        statusElement.textContent = 'Checking availability...';
        statusElement.className = 'username-status checking';

        // Check if username is available
        const usernameDoc = await db.collection('usernames').doc(newUsername).get();
        if (usernameDoc.exists) {
            statusElement.textContent = 'Username is already taken';
            statusElement.className = 'username-status error';
            return;
        }

        // Update username
        const batch = db.batch();

        // Remove old username
        batch.delete(db.collection('usernames').doc(currentUser.username));

        // Add new username
        batch.set(db.collection('usernames').doc(newUsername), { uid: currentUser.uid });

        // Update user document
        batch.update(db.collection('users').doc(currentUser.uid), {
            username: newUsername
        });

        await batch.commit();

        // Update current user object
        currentUser.username = newUsername;

        // Update UI
        document.getElementById('current-username').textContent = newUsername;

        statusElement.textContent = 'Username updated successfully!';
        statusElement.className = 'username-status success';

        showNotification('Username updated successfully!', 'success');

    } catch (error) {
        console.error('Update username error:', error);
        const statusElement = document.getElementById('username-change-status');
        statusElement.textContent = 'Failed to update username';
        statusElement.className = 'username-status error';
        showNotification('Failed to update username', 'error');
    }
}

function setTheme(theme) {
    try {
        // Update theme checks
        document.querySelectorAll('.theme-check').forEach(check => {
            check.style.display = 'none';
        });
        document.getElementById(`${theme}-check`).style.display = 'block';

        // Apply theme
        document.body.className = theme === 'light' ? 'light-theme' : '';

        // Save theme preference
        localStorage.setItem('stellarchat-theme', theme);

        showNotification(`Switched to ${theme} mode`, 'success');

    } catch (error) {
        console.error('Set theme error:', error);
        showNotification('Failed to change theme', 'error');
    }
}

async function setUserStatus(status) {
    try {
        // Update status checks
        document.querySelectorAll('.status-check').forEach(check => {
            check.style.display = 'none';
        });
        document.getElementById(`${status}-check`).style.display = 'block';

        if (isDemoMode) {
            showNotification(`Status set to ${status} (demo mode)`, 'info');
            return;
        }

        // Update user status in database
        await db.collection('users').doc(currentUser.uid).update({
            status: status,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification(`Status updated to ${status}`, 'success');

    } catch (error) {
        console.error('Set user status error:', error);
        showNotification('Failed to update status', 'error');
    }
}

async function updateCustomStatus() {
    try {
        const customStatus = document.getElementById('custom-status').value.trim();

        if (isDemoMode) {
            showNotification('Custom status updated (demo mode)', 'info');
            return;
        }

        // Update custom status in database
        await db.collection('users').doc(currentUser.uid).update({
            customStatus: customStatus,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification('Custom status updated!', 'success');

    } catch (error) {
        console.error('Update custom status error:', error);
        showNotification('Failed to update custom status', 'error');
    }
}

async function clearCustomStatus() {
    try {
        document.getElementById('custom-status').value = '';

        if (isDemoMode) {
            showNotification('Custom status cleared (demo mode)', 'info');
            return;
        }

        // Clear custom status in database
        await db.collection('users').doc(currentUser.uid).update({
            customStatus: '',
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification('Custom status cleared!', 'success');

    } catch (error) {
        console.error('Clear custom status error:', error);
        showNotification('Failed to clear custom status', 'error');
    }
}

async function handleAvatarUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showNotification('Image must be less than 5MB', 'error');
            return;
        }

        if (!file.type.startsWith('image/')) {
            showNotification('Please select an image file', 'error');
            return;
        }

        if (isDemoMode) {
            showNotification('Avatar upload available in full version!', 'info');
            return;
        }

        showNotification('Uploading avatar...', 'info');

        // Upload to Firebase Storage
        const storageRef = firebase.storage().ref();
        const avatarRef = storageRef.child(`avatars/${currentUser.uid}`);

        const snapshot = await avatarRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();

        // Update user profile
        await db.collection('users').doc(currentUser.uid).update({
            photoURL: downloadURL
        });

        currentUser.photoURL = downloadURL;

        // Update UI
        document.querySelector('.current-avatar').innerHTML = `<img src="${downloadURL}" alt="Avatar">`;
        document.querySelector('.user-avatar').innerHTML = `<img src="${downloadURL}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;

        showNotification('Avatar updated successfully!', 'success');

    } catch (error) {
        console.error('Avatar upload error:', error);
        showNotification('Failed to upload avatar', 'error');
    }
}

async function removeAvatar() {
    try {
        if (!confirm('Remove your profile picture?')) return;

        if (isDemoMode) {
            showNotification('Avatar removal available in full version!', 'info');
            return;
        }

        await db.collection('users').doc(currentUser.uid).update({
            photoURL: null
        });

        currentUser.photoURL = null;

        // Update UI
        document.querySelector('.current-avatar').innerHTML = '<i class="fas fa-user"></i>';
        document.querySelector('.user-avatar').innerHTML = '<i class="fas fa-user"></i>';

        showNotification('Avatar removed successfully!', 'success');

    } catch (error) {
        console.error('Remove avatar error:', error);
        showNotification('Failed to remove avatar', 'error');
    }
}

async function updateUsername() {
    try {
        const newUsername = document.getElementById('new-username').value.trim();
        const statusElement = document.getElementById('username-change-status');

        if (!newUsername) {
            statusElement.textContent = 'Username cannot be empty';
            statusElement.className = 'username-status error';
            return;
        }

        if (newUsername === currentUser.username) {
            statusElement.textContent = 'This is already your username';
            statusElement.className = 'username-status error';
            return;
        }

        if (newUsername.length < 3) {
            statusElement.textContent = 'Username must be at least 3 characters';
            statusElement.className = 'username-status error';
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
            statusElement.textContent = 'Only letters, numbers, and underscores allowed';
            statusElement.className = 'username-status error';
            return;
        }

        if (isDemoMode) {
            showNotification('Username change available in full version!', 'info');
            return;
        }

        statusElement.textContent = 'Checking availability...';
        statusElement.className = 'username-status checking';

        // Check if username is available
        const usernameDoc = await db.collection('usernames').doc(newUsername).get();

        if (usernameDoc.exists) {
            statusElement.textContent = 'Username is already taken';
            statusElement.className = 'username-status error';
            return;
        }

        // Update username
        const batch = db.batch();

        // Remove old username
        batch.delete(db.collection('usernames').doc(currentUser.username));

        // Add new username
        batch.set(db.collection('usernames').doc(newUsername), { uid: currentUser.uid });

        // Update user document
        batch.update(db.collection('users').doc(currentUser.uid), {
            username: newUsername
        });

        await batch.commit();

        currentUser.username = newUsername;
        document.getElementById('current-username').textContent = newUsername;

        statusElement.textContent = 'Username updated successfully!';
        statusElement.className = 'username-status success';

        showNotification('Username updated successfully!', 'success');

    } catch (error) {
        console.error('Update username error:', error);
        const statusElement = document.getElementById('username-change-status');
        if (statusElement) {
            statusElement.textContent = 'Failed to update username';
            statusElement.className = 'username-status error';
        }
        showNotification('Failed to update username', 'error');
    }
}

function setTheme(theme) {
    try {
        // Update theme checks
        document.querySelectorAll('.theme-check').forEach(check => {
            check.style.display = 'none';
        });
        document.getElementById(`${theme}-check`).style.display = 'block';

        // Apply theme
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${theme}`);

        // Save theme preference
        localStorage.setItem('theme', theme);

        showNotification(`Switched to ${theme} mode`, 'success');

    } catch (error) {
        console.error('Set theme error:', error);
    }
}

async function setUserStatus(status) {
    try {
        // Update status checks
        document.querySelectorAll('.status-check').forEach(check => {
            check.style.display = 'none';
        });
        document.getElementById(`${status}-check`).style.display = 'block';

        if (isDemoMode) {
            showNotification(`Status set to ${status} in demo mode!`, 'info');
            return;
        }

        // Update user status in database
        await db.collection('users').doc(currentUser.uid).update({
            status: status,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });

        currentUser.status = status;

        showNotification(`Status updated to ${status}`, 'success');

        // Refresh member list if in a server
        if (currentServer) {
            loadServerMembers(currentServer);
        }

    } catch (error) {
        console.error('Set user status error:', error);
        showNotification('Failed to update status', 'error');
    }
}

async function updateCustomStatus() {
    try {
        const customStatus = document.getElementById('custom-status').value.trim();

        if (isDemoMode) {
            showNotification('Custom status available in full version!', 'info');
            return;
        }

        await db.collection('users').doc(currentUser.uid).update({
            customStatus: customStatus || null,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });

        currentUser.customStatus = customStatus;

        showNotification(customStatus ? 'Custom status updated!' : 'Custom status cleared!', 'success');

    } catch (error) {
        console.error('Update custom status error:', error);
        showNotification('Failed to update custom status', 'error');
    }
}

async function clearCustomStatus() {
    try {
        document.getElementById('custom-status').value = '';
        await updateCustomStatus();
    } catch (error) {
        console.error('Clear custom status error:', error);
    }
}

// Authentication Functions
async function handleGoogleLogin() {
    try {
        console.log('🔐 Google login attempt started');

        // Rate limiting check
        const clientId = 'auth-attempt';
        if (!rateLimiter.isAllowed(clientId)) {
            showNotification('Too many login attempts. Please wait before trying again.', 'error');
            return;
        }

        // Ensure Firebase is ready before proceeding
        console.log('🔄 Ensuring Firebase is ready...');
        const firebaseIsReady = await ensureFirebaseReady();

        if (!firebaseIsReady || isDemoMode) {
            console.log('🎭 Using demo mode');
            const demoUser = {
                uid: securityUtils.generateSecureId(),
                email: 'demo@stellarchat.com',
                displayName: 'Demo User',
                photoURL: null
            };
            showUsernameSetup(demoUser);
            return;
        }

        console.log('✅ Firebase is ready, proceeding with Google login');
        console.log('🔍 Firebase state:', { firebase: !!firebase, auth: !!auth, isDemoMode });

        console.log('🔐 Creating Google Auth Provider');
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');

        console.log('🔐 Attempting Google sign-in popup');
        const result = await auth.signInWithPopup(provider);
        const user = result.user;

        // Validate user data
        if (!user || !user.uid || !user.email) {
            throw new Error('Invalid user data received');
        }

        // Create secure session
        const sessionCreated = await secureSession.createSession(user.uid);
        if (!sessionCreated) {
            throw new Error('Failed to create secure session');
        }

        // Check if user already has a username
        const userDoc = await db.collection('users').doc(user.uid).get();

        if (userDoc.exists && userDoc.data().username) {
            const userData = userDoc.data();

            // Validate stored username
            if (!securityUtils.validateUsername(userData.username)) {
                throw new Error('Invalid stored username');
            }

            currentUser = {
                uid: user.uid,
                email: securityUtils.sanitizeInput(user.email),
                displayName: securityUtils.sanitizeInput(user.displayName || ''),
                photoURL: user.photoURL,
                username: userData.username
            };

            // Reset rate limiter on successful login
            rateLimiter.reset(clientId);
            showMainInterface();
        } else {
            showUsernameSetup(user);
        }
    } catch (error) {
        console.error('🔒 Authentication error:', error);
        console.error('🔒 Full error details:', error);

        // More specific error handling
        let errorMessage = 'An error occurred. Please try again.';

        if (error.code) {
            switch (error.code) {
                case 'auth/popup-closed-by-user':
                    errorMessage = 'Login cancelled by user';
                    break;
                case 'auth/popup-blocked':
                    errorMessage = 'Popup blocked. Please allow popups and try again.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many attempts. Please wait and try again.';
                    break;
                default:
                    errorMessage = securityUtils.obfuscateError(error);
            }
        } else if (error.message) {
            if (error.message.includes('Firebase')) {
                errorMessage = 'Authentication system not ready. Please refresh the page.';
            } else if (error.message.includes('session')) {
                errorMessage = 'Session error. Please try again.';
            }
        }

        showNotification(errorMessage, 'error');
    }
}

function showUsernameSetup(user) {
    try {
        window.tempUser = user;
        document.getElementById('google-login-form').classList.remove('active');
        document.getElementById('username-setup-form').classList.add('active');

        const usernameInput = document.getElementById('chosen-username');
        if (usernameInput) usernameInput.focus();
    } catch (error) {
        console.error('Username setup error:', error);
    }
}

async function checkUsernameAvailability() {
    try {
        const username = document.getElementById('chosen-username').value.trim();
        const statusElement = document.getElementById('username-status');

        if (!username) {
            statusElement.textContent = '';
            statusElement.className = 'username-status';
            return;
        }

        if (username.length < 3) {
            statusElement.textContent = 'Too short (min 3 characters)';
            statusElement.className = 'username-status taken';
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            statusElement.textContent = 'Only letters, numbers, and underscores allowed';
            statusElement.className = 'username-status taken';
            return;
        }

        statusElement.textContent = 'Checking...';
        statusElement.className = 'username-status checking';

        if (isDemoMode) {
            statusElement.textContent = 'Available! ✓';
            statusElement.className = 'username-status available';
            return;
        }

        const usernameDoc = await db.collection('usernames').doc(username).get();

        if (usernameDoc.exists) {
            statusElement.textContent = 'Username taken';
            statusElement.className = 'username-status taken';
        } else {
            statusElement.textContent = 'Available! ✓';
            statusElement.className = 'username-status available';
        }
    } catch (error) {
        console.error('Error checking username:', error);
        const statusElement = document.getElementById('username-status');
        if (statusElement) {
            statusElement.textContent = 'Error';
            statusElement.className = 'username-status taken';
        }
    }
}

async function completeSetup() {
    try {
        const username = document.getElementById('chosen-username').value.trim();
        const statusElement = document.getElementById('username-status');

        if (!username || statusElement.classList.contains('taken') || statusElement.classList.contains('checking')) {
            showNotification('Please choose a valid, available username', 'error');
            return;
        }

        const user = window.tempUser;

        if (isDemoMode) {
            currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                username: username
            };
        } else {
            const batch = db.batch();
            const usernameRef = db.collection('usernames').doc(username);
            batch.set(usernameRef, { uid: user.uid });

            const userRef = db.collection('users').doc(user.uid);
            batch.set(userRef, {
                username: username,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'online'
            });

            await batch.commit();

            currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                username: username
            };
        }

        showNotification(`Welcome to the galaxy, ${username}! ✨`, 'success');
        setTimeout(() => {
            showMainInterface();
        }, 1000);

    } catch (error) {
        console.error('Error completing setup:', error);
        showNotification('Setup failed: ' + error.message, 'error');
    }
}

function logout() {
    try {
        if (!isDemoMode && auth && currentUser) {
            db.collection('users').doc(currentUser.uid).update({
                status: 'offline',
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(console.error);

            auth.signOut().then(() => {
                currentUser = null;
                showNotification('Logged out successfully', 'info');
                showAuthInterface();
            });
        } else {
            currentUser = null;
            showNotification('Logged out successfully', 'info');
            showAuthInterface();
        }
    } catch (error) {
        console.error('Logout error:', error);
        currentUser = null;
        showAuthInterface();
    }
}

// Interface Functions
function showAuthInterface() {
    try {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('main-container').classList.add('hidden');
        document.getElementById('google-login-form').classList.add('active');
        document.getElementById('username-setup-form').classList.remove('active');
    } catch (error) {
        console.error('Show auth interface error:', error);
    }
}

async function showMainInterface() {
    try {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('main-container').classList.remove('hidden');
        document.getElementById('current-username').textContent = currentUser.username;

        const userAvatar = document.querySelector('.user-avatar');
        if (userAvatar && currentUser.photoURL) {
            userAvatar.innerHTML = `<img src="${currentUser.photoURL}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        }

        // Set up presence
        await setupUserPresence();

        // Initialize the servers tab as active
        showServersTab();

        // Load user's servers
        await loadUserServers();

        showNotification('Connected to StellarChat! 🌟', 'success');
    } catch (error) {
        console.error('Show main interface error:', error);
        showNotification('Error loading interface', 'error');
    }
}// Enhanced User Presence System
async function setupUserPresence() {
    try {
        if (isDemoMode || !currentUser) return;

        // Set initial online status
        await db.collection('users').doc(currentUser.uid).update({
            status: 'online',
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            currentServer: currentServer,
            currentChannel: currentChannel
        });

        // Set up offline detection
        const userStatusRef = db.collection('users').doc(currentUser.uid);

        // Create a Firestore connection state reference
        const connectionRef = db.collection('status').doc(currentUser.uid);

        // Monitor connection state using Realtime Database
        if (firebase.database) {
            firebase.database().ref('.info/connected').on('value', async (snapshot) => {
                if (snapshot.val() === false) {
                    // User is offline
                    return;
                }

                // User is online - set up disconnect handler
                await connectionRef.set({
                    status: 'online',
                    lastChanged: firebase.firestore.FieldValue.serverTimestamp()
                });

                // When user disconnects, update the status
                connectionRef.onDisconnect().set({
                    status: 'offline',
                    lastChanged: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
        }

        // Regular heartbeat to confirm online status
        setInterval(async () => {
            if (currentUser && db && document.visibilityState === 'visible') {
                try {
                    await userStatusRef.update({
                        lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                        status: 'online'
                    });
                } catch (error) {
                    console.error('Heartbeat error:', error);
                }
            }
        }, 30000);

        // Handle page visibility changes
        document.addEventListener('visibilitychange', async () => {
            if (!currentUser || !db) return;

            try {
                if (document.visibilityState === 'hidden') {
                    await userStatusRef.update({
                        status: 'away',
                        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    await userStatusRef.update({
                        status: 'online',
                        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            } catch (error) {
                console.error('Visibility change error:', error);
            }
        });

        // Handle before unload
        window.addEventListener('beforeunload', async () => {
            if (currentUser && db) {
                try {
                    // Synchronous update before page closes
                    navigator.sendBeacon(
                        '/api/update-status',
                        JSON.stringify({
                            uid: currentUser.uid,
                            status: 'offline'
                        })
                    );

                    // Also try direct update
                    await userStatusRef.update({
                        status: 'offline',
                        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch (error) {
                    console.error('Unload status update error:', error);
                }
            }
        });

        // Set up real-time status updates listener
        setupRealTimeStatusUpdates();

        // Set up periodic cleanup for offline users
        setInterval(async () => {
            if (!currentUser || !db) return;

            try {
                // Mark users as offline if they haven't been seen in 5 minutes
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

                // Get all users and filter client-side to avoid Firebase query limitations
                const allUsers = await db.collection('users').get();
                const batch = db.batch();
                let staleCount = 0;

                allUsers.forEach(doc => {
                    const userData = doc.data();
                    const lastSeen = userData.lastSeen?.toDate ? userData.lastSeen.toDate() : new Date(userData.lastSeen || 0);

                    if (userData.status !== 'offline' && lastSeen < fiveMinutesAgo) {
                        batch.update(doc.ref, {
                            status: 'offline',
                            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        staleCount++;
                    }
                });

                if (staleCount > 0) {
                    await batch.commit();
                    console.log(`Marked ${staleCount} users as offline`);
                }
            } catch (error) {
                console.error('Offline cleanup error:', error);
            }
        }, 60000); // Run every minute

        // Set up real-time status updates
        setupRealTimeStatusUpdates();

        // Set up real-time status updates
        setupRealTimeStatusUpdates();

        console.log('✅ Enhanced presence system active');
    } catch (error) {
        console.error('Presence setup error:', error);
    }
}

// Real-time Status Updates
function setupRealTimeStatusUpdates() {
    try {
        if (isDemoMode || !currentUser) return;

        // Listen for user status changes in current server
        const statusListener = db.collection('users').onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') {
                    const userData = change.doc.data();
                    const userId = change.doc.id;

                    // Update member status in real-time if they're in current server
                    updateMemberStatusInUI(userId, userData);
                }
            });
        });

        presenceListeners.push(statusListener);

        console.log('✅ Real-time status updates active');
    } catch (error) {
        console.error('Real-time status setup error:', error);
    }
}

function updateMemberStatusInUI(userId, userData) {
    try {
        const memberElement = document.querySelector(`[data-user-id="${userId}"]`);
        if (!memberElement) return;

        const status = userData.status || 'offline';
        const lastSeen = userData.lastSeen?.toMillis ? userData.lastSeen.toMillis() : 0;
        const now = Date.now();
        const minutesAgo = Math.floor((now - lastSeen) / 60000);

        let statusText = 'Offline';
        let statusClass = 'offline';

        if (status === 'online') {
            statusText = 'Online';
            statusClass = 'online';
        } else if (status === 'away') {
            statusText = 'Away';
            statusClass = 'away';
        } else if (status === 'busy') {
            statusText = 'Do Not Disturb';
            statusClass = 'busy';
        } else if (status === 'invisible') {
            statusText = 'Offline';
            statusClass = 'offline';
        } else if (lastSeen > 0) {
            if (minutesAgo < 60) {
                statusText = `${minutesAgo}m ago`;
            } else if (minutesAgo < 1440) {
                statusText = `${Math.floor(minutesAgo / 60)}h ago`;
            } else {
                statusText = `${Math.floor(minutesAgo / 1440)}d ago`;
            }
        }

        // Update status indicator
        const statusIndicator = memberElement.querySelector('.member-status');
        if (statusIndicator) {
            statusIndicator.className = `member-status ${statusClass}`;
            statusIndicator.title = statusText;
        }

        // Update status text
        const statusTextElement = memberElement.querySelector('.member-status-text');
        if (statusTextElement) {
            statusTextElement.textContent = statusText;
        }

        // Update member element dataset
        memberElement.dataset.status = status;

        // Re-sort members list if needed
        if (currentServer) {
            setTimeout(() => loadServerMembers(currentServer), 100);
        }

    } catch (error) {
        console.error('Update member status UI error:', error);
    }
}

// Server Management
async function loadUserServers() {
    try {
        if (isDemoMode) {
            userServers = [];
            return;
        }

        if (!currentUser) return;

        const serversSnapshot = await db.collection('servers')
            .where('members', 'array-contains', currentUser.uid)
            .get();

        userServers = [];
        serversSnapshot.forEach(doc => {
            userServers.push({ id: doc.id, ...doc.data() });
        });

        console.log('✅ Loaded user servers:', userServers.length);
        updateServersList();
    } catch (error) {
        console.error('Load user servers error:', error);
        userServers = [];
    }
}

function updateServersList() {
    try {
        const serversList = document.getElementById('servers-list');
        if (!serversList) return;

        if (userServers.length === 0) {
            serversList.innerHTML = `
                <div class="no-servers">
                    <i class="fas fa-server"></i>
                    <p>No servers joined</p>
                    <button onclick="showServerBrowser()" class="browse-servers-btn">
                        <i class="fas fa-search"></i>
                        Browse Servers
                    </button>
                </div>
            `;
            return;
        }

        serversList.innerHTML = '';

        userServers.forEach(server => {
            const serverElement = document.createElement('div');
            serverElement.className = 'server-item';
            serverElement.dataset.serverId = server.id;
            serverElement.onclick = () => joinServer(server.id);

            serverElement.innerHTML = `
                <div class="server-icon">
                    <i class="fas fa-hashtag"></i>
                </div>
                <div class="server-info">
                    <span class="server-name">${escapeHtml(server.name)}</span>
                    <span class="server-members">${server.members?.length || 0} members</span>
                </div>
                <button class="leave-server-btn" onclick="event.stopPropagation(); leaveServer('${server.id}')" title="Leave Server">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            `;

            serversList.appendChild(serverElement);
        });

        // Add browse servers button
        const browseBtn = document.createElement('div');
        browseBtn.className = 'browse-servers-item';
        browseBtn.onclick = showServerBrowser;
        browseBtn.innerHTML = `
            <div class="server-icon">
                <i class="fas fa-search"></i>
            </div>
            <span class="server-name">Browse Servers</span>
        `;
        serversList.appendChild(browseBtn);

    } catch (error) {
        console.error('Update servers list error:', error);
    }
}

async function showServerBrowser() {
    try {
        currentChatType = 'none';
        currentServer = null;

        // Update UI to show server browser
        document.getElementById('current-channel').textContent = 'Server Browser';

        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = `
            <div class="server-browser">
                <div class="browser-header">
                    <h2><i class="fas fa-server"></i> Server Browser</h2>
                    <button onclick="showCreateServerModal()" class="create-server-btn">
                        <i class="fas fa-plus"></i>
                        Create Server
                    </button>
                </div>
                <div class="server-grid" id="server-grid">
                    <div class="loading-servers">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading servers...</p>
                    </div>
                </div>
            </div>
        `;

        // Clear members list since we're not in a server
        const membersList = document.getElementById('members-list');
        if (membersList) {
            membersList.innerHTML = `
                <div class="no-members">
                    <i class="fas fa-users"></i>
                    <p>Join a server to see members</p>
                </div>
            `;
        }

        // Load all public servers
        await loadAllServers();

    } catch (error) {
        console.error('Show server browser error:', error);
    }
}

async function loadAllServers() {
    try {
        if (isDemoMode) {
            loadDemoServerBrowser();
            return;
        }

        const serversSnapshot = await db.collection('servers')
            .where('isPublic', '==', true)
            .orderBy('memberCount', 'desc')
            .limit(50)
            .get();

        const serverGrid = document.getElementById('server-grid');
        if (!serverGrid) return;

        if (serversSnapshot.empty) {
            serverGrid.innerHTML = `
                <div class="no-servers-found">
                    <i class="fas fa-server"></i>
                    <h3>No public servers found</h3>
                    <p>Be the first to create a server!</p>
                    <button onclick="showCreateServerModal()" class="create-first-server-btn">
                        <i class="fas fa-plus"></i>
                        Create Server
                    </button>
                </div>
            `;
            return;
        }

        serverGrid.innerHTML = '';

        serversSnapshot.forEach(doc => {
            const server = { id: doc.id, ...doc.data() };
            const isJoined = userServers.some(s => s.id === server.id);

            const serverCard = document.createElement('div');
            serverCard.className = 'server-card';

            serverCard.innerHTML = `
                <div class="server-card-header">
                    <div class="server-card-icon">
                        <i class="fas fa-hashtag"></i>
                    </div>
                    <h3>${escapeHtml(server.name)}</h3>
                </div>
                <div class="server-card-info">
                    <p class="server-description">${escapeHtml(server.description || 'No description')}</p>
                    <div class="server-stats">
                        <span><i class="fas fa-users"></i> ${server.memberCount || 0} members</span>
                        <span><i class="fas fa-clock"></i> ${formatTimestamp(server.createdAt?.toMillis ? server.createdAt.toMillis() : server.createdAt)}</span>
                    </div>
                </div>
                <div class="server-card-actions">
                    ${isJoined
                    ? `<button onclick="joinServer('${server.id}')" class="join-server-btn joined">
                             <i class="fas fa-check"></i> Joined
                           </button>`
                    : `<button onclick="joinServerFromBrowser('${server.id}')" class="join-server-btn">
                             <i class="fas fa-sign-in-alt"></i> Join Server
                           </button>`
                }
                </div>
            `;

            serverGrid.appendChild(serverCard);
        });

    } catch (error) {
        console.error('Load all servers error:', error);
        const serverGrid = document.getElementById('server-grid');
        if (serverGrid) {
            serverGrid.innerHTML = `
                <div class="error-loading">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading servers</p>
                    <button onclick="loadAllServers()" class="retry-btn">Retry</button>
                </div>
            `;
        }
    }
}

function loadDemoServerBrowser() {
    try {
        const serverGrid = document.getElementById('server-grid');
        if (!serverGrid) return;

        const demoServers = [
            { id: 'demo1', name: 'General Chat', description: 'A place for general discussion', memberCount: 42 },
            { id: 'demo2', name: 'Dev Talk', description: 'Discuss programming and development', memberCount: 28 },
            { id: 'demo3', name: 'Gaming Hub', description: 'Chat about games and gaming', memberCount: 35 }
        ];

        serverGrid.innerHTML = '';

        demoServers.forEach(server => {
            const serverCard = document.createElement('div');
            serverCard.className = 'server-card';

            serverCard.innerHTML = `
                <div class="server-card-header">
                    <div class="server-card-icon">
                        <i class="fas fa-hashtag"></i>
                    </div>
                    <h3>${server.name}</h3>
                </div>
                <div class="server-card-info">
                    <p class="server-description">${server.description}</p>
                    <div class="server-stats">
                        <span><i class="fas fa-users"></i> ${server.memberCount} members</span>
                        <span><i class="fas fa-clock"></i> 2 days ago</span>
                    </div>
                </div>
                <div class="server-card-actions">
                    <button onclick="joinDemoServer('${server.id}', '${server.name}')" class="join-server-btn">
                        <i class="fas fa-sign-in-alt"></i> Join Server
                    </button>
                </div>
            `;

            serverGrid.appendChild(serverCard);
        });
    } catch (error) {
        console.error('Load demo server browser error:', error);
    }
}

async function joinServerFromBrowser(serverId) {
    try {
        if (isDemoMode) {
            showNotification('Joined server in demo mode!', 'success');
            return;
        }

        if (!currentUser) {
            showNotification('Please log in first', 'error');
            return;
        }

        // Add user to server members
        await db.collection('servers').doc(serverId).update({
            members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
            memberCount: firebase.firestore.FieldValue.increment(1)
        });

        // Reload user servers and join the server
        await loadUserServers();
        await joinServer(serverId);

        showNotification('Successfully joined server!', 'success');

    } catch (error) {
        console.error('Join server error:', error);
        showNotification('Failed to join server', 'error');
    }
}

function joinDemoServer(serverId, serverName) {
    try {
        currentServer = serverId;
        currentChatType = 'server';

        document.getElementById('current-channel').textContent = `# ${serverName}`;

        // Show demo messages
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="messages" id="messages">
                    <div class="message">
                        <div class="message-avatar">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="message-content">
                            <div class="message-header">
                                <span class="message-author">StellarBot</span>
                                <span class="message-time">Just now</span>
                            </div>
                            <div class="message-text">Welcome to ${serverName}! This is demo mode.</div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Load demo members for this server
        loadDemoMembers();

        showNotification(`Joined ${serverName}!`, 'success');
    } catch (error) {
        console.error('Join demo server error:', error);
    }
}

async function joinServer(serverId) {
    try {
        if (!serverId) return;

        currentServer = serverId;
        currentChatType = 'server';
        currentChannel = 'general'; // Ensure we have a default channel

        // Find server info
        const server = userServers.find(s => s.id === serverId);
        if (!server) {
            showNotification('Server not found', 'error');
            return;
        }

        // Update UI
        document.getElementById('current-channel').textContent = `# ${server.name}`;

        // Clear messages container and show messages area
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="messages" id="messages" style="flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px;"></div>
            `;
        }

        // Update active server in sidebar
        document.querySelectorAll('.server-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.serverId === serverId) {
                item.classList.add('active');
            }
        });

        // Load messages and members for this server
        loadMessages();
        loadServerMembers(serverId);

        console.log('✅ Joined server:', server.name);

    } catch (error) {
        console.error('Join server error:', error);
        showNotification('Failed to join server', 'error');
    }
}

async function leaveServer(serverId) {
    try {
        if (!confirm('Are you sure you want to leave this server?')) return;

        if (isDemoMode) {
            showNotification('Left server in demo mode!', 'info');
            return;
        }

        if (!currentUser) return;

        // Remove user from server members
        await db.collection('servers').doc(serverId).update({
            members: firebase.firestore.FieldValue.arrayRemove(currentUser.uid),
            memberCount: firebase.firestore.FieldValue.increment(-1)
        });

        // If this was the current server, go back to browser
        if (currentServer === serverId) {
            showServerBrowser();
        }

        // Reload user servers
        await loadUserServers();

        showNotification('Left server successfully', 'info');

    } catch (error) {
        console.error('Leave server error:', error);
        showNotification('Failed to leave server', 'error');
    }
}
function loadMessages() {
    try {
        if (isDemoMode) {
            loadDemoMessages();
            return;
        }

        if (currentChatType === 'none') {
            return;
        }

        let messagesRef;

        if (currentChatType === 'server') {
            if (!currentServer) return;
            messagesRef = db.collection('servers')
                .doc(currentServer)
                .collection('channels')
                .doc(currentChannel)
                .collection('messages')
                .orderBy('timestamp', 'asc');
        } else if (currentChatType === 'dm') {
            if (!currentDMUser) return;
            const dmId = [currentUser.uid, currentDMUser.uid].sort().join('_');
            messagesRef = db.collection('dms')
                .doc(dmId)
                .collection('messages')
                .orderBy('timestamp', 'asc');
        }

        if (!messagesRef) return;

        // Clear existing listeners
        messageListeners.forEach(unsubscribe => {
            try { unsubscribe(); } catch (e) { }
        });
        messageListeners = [];

        const unsubscribe = messagesRef.onSnapshot(snapshot => {
            try {
                const messages = [];
                const now = Date.now();
                const thirtyMinutesAgo = now - (30 * 60 * 1000);
                let hasNewMessage = false;

                snapshot.forEach(doc => {
                    const messageData = doc.data();
                    const messageTime = messageData.timestamp?.toMillis ? messageData.timestamp.toMillis() : messageData.timestamp;

                    if (messageTime > thirtyMinutesAgo) {
                        messages.push({ id: doc.id, ...messageData });

                        // Check if this is a new message from someone else
                        if (messageData.uid !== currentUser?.uid && messageTime > (now - 5000)) {
                            hasNewMessage = true;
                        }
                    }
                });

                displayMessages(messages);

                // Play sound and show notifications for new messages from others
                if (hasNewMessage) {
                    // Get the newest message from someone else
                    const newMessages = messages.filter(msg =>
                        msg.uid !== currentUser?.uid &&
                        (msg.timestamp?.toMillis ? msg.timestamp.toMillis() : msg.timestamp) > (now - 5000)
                    );

                    if (newMessages.length > 0) {
                        const latestMessage = newMessages[newMessages.length - 1];

                        // Check if this is a DM conversation
                        if (currentChatType === 'dm') {
                            // Always play DM notification sound
                            playDMNotificationSound();

                            // Show enhanced desktop notification for DMs (works even when browser is in background)
                            showEnhancedDMNotification(
                                `New DM from ${latestMessage.author}`,
                                latestMessage.text.length > 50 ?
                                    latestMessage.text.substring(0, 50) + '...' :
                                    latestMessage.text,
                                latestMessage.photoURL,
                                latestMessage.author
                            );

                            // Update notification badge
                            updateNotificationBadge();
                        } else if (currentChatType === 'server') {
                            // Regular message sound for server messages
                            playMessageSound();

                            // Show notification for server messages too (less intrusive)
                            if (!document.hasFocus()) {
                                showDesktopNotification(
                                    `New message in #${currentChannel}`,
                                    `${latestMessage.author}: ${latestMessage.text.length > 30 ?
                                        latestMessage.text.substring(0, 30) + '...' :
                                        latestMessage.text}`,
                                    latestMessage.photoURL
                                );
                            }
                        }

                        // Always play some notification sound for any new message
                        if (currentChatType === 'none') {
                            playNotificationSound();
                        }
                    }
                }
            } catch (error) {
                console.error('Message snapshot error:', error);
            }
        });

        messageListeners.push(unsubscribe);
    } catch (error) {
        console.error('Load messages error:', error);
    }
}

function loadDemoMessages() {
    try {
        const demoMessages = [
            {
                id: '1',
                text: 'Welcome to StellarChat! 🚀',
                author: 'System',
                timestamp: Date.now() - 600000,
                photoURL: null
            },
            {
                id: '2',
                text: 'This is a demo message',
                author: 'alice_dev',
                timestamp: Date.now() - 300000,
                photoURL: null
            }
        ];
        displayMessages(demoMessages);
    } catch (error) {
        console.error('Load demo messages error:', error);
    }
}

function displayMessages(messages) {
    try {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) {
            console.warn('Messages container not found');
            return;
        }

        // Store current scroll position to check if user was at bottom
        const wasAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 50;

        messagesContainer.innerHTML = '';

        messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = 'message';
            messageElement.dataset.messageId = message.id;

            const avatarContent = message.photoURL
                ? `<img src="${message.photoURL}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
                : '<i class="fas fa-user"></i>';

            messageElement.innerHTML = `
                <div class="message-avatar">
                    ${avatarContent}
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-author">${escapeHtml(message.author)}</span>
                        <span class="message-time">${formatTimestamp(message.timestamp)}</span>
                    </div>
                    <div class="message-text">${escapeHtml(message.text)}</div>
                </div>
            `;

            messagesContainer.appendChild(messageElement);
        });

        // Auto-scroll to bottom if user was already at bottom or if it's the first load
        if (wasAtBottom || messages.length <= 5) {
            setTimeout(() => {
                smoothScrollToBottom(messagesContainer);
            }, 100);
        }

        // Show scroll-to-bottom button if user is not at bottom and there are many messages
        if (!wasAtBottom && messages.length > 10) {
            showScrollToBottomButton();
        } else {
            hideScrollToBottomButton();
        }

        console.log(`📝 Displayed ${messages.length} messages, scroll position updated`);
    } catch (error) {
        console.error('Display messages error:', error);
    }
}

// Smooth scroll to bottom function
function smoothScrollToBottom(container) {
    try {
        if (!container) return;

        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    } catch (error) {
        // Fallback for browsers that don't support smooth scrolling
        container.scrollTop = container.scrollHeight;
    }
}

// Show scroll-to-bottom button
function showScrollToBottomButton() {
    try {
        // Remove existing button if present
        hideScrollToBottomButton();

        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;

        const scrollButton = document.createElement('button');
        scrollButton.id = 'scroll-to-bottom-btn';
        scrollButton.className = 'scroll-to-bottom-button';
        scrollButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
        scrollButton.title = 'Scroll to bottom';

        scrollButton.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #667eea;
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        `;

        scrollButton.addEventListener('click', () => {
            const messages = document.getElementById('messages');
            if (messages) {
                smoothScrollToBottom(messages);
                hideScrollToBottomButton();
            }
        });

        messagesContainer.appendChild(scrollButton);
    } catch (error) {
        console.error('Error showing scroll button:', error);
    }
}

// Hide scroll-to-bottom button
function hideScrollToBottomButton() {
    try {
        const existingButton = document.getElementById('scroll-to-bottom-btn');
        if (existingButton) {
            existingButton.remove();
        }
    } catch (error) {
        console.error('Error hiding scroll button:', error);
    }
}

function handleMessageInput(event) {
    try {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    } catch (error) {
        console.error('Handle message input error:', error);
    }
}

// This function has been replaced by the enhanced version below

// Voice Chat Functions
async function startVoiceCall() {
    try {
        console.log('🎤 Starting voice call...');

        if (currentChatType === 'none') {
            showNotification('Join a server or start a DM to make voice calls', 'error');
            return;
        }

        if (isInCall) {
            showNotification('Already in a call', 'error');
            return;
        }

        // Request microphone permission
        try {
            console.log('🎤 Requesting microphone access...');
            localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            console.log('✅ Microphone access granted');

        } catch (error) {
            console.error('❌ Microphone access error:', error);
            showNotification('Microphone access denied. Please allow microphone access to make voice calls.', 'error');
            return;
        }

        isInCall = true;

        // Generate call ID based on chat type
        if (currentChatType === 'server') {
            currentCallId = `server_${currentServer}_${currentChannel}`;
        } else if (currentChatType === 'dm') {
            const sortedIds = [currentUser.uid, currentDMUser.uid].sort();
            currentCallId = `dm_${sortedIds.join('_')}`;
        }

        console.log('📞 Call ID:', currentCallId);

        // Show voice call modal
        const modalOverlay = document.getElementById('modal-overlay');
        const voiceCallModal = document.getElementById('voice-call-modal');

        if (modalOverlay && voiceCallModal) {
            modalOverlay.classList.remove('hidden');
            voiceCallModal.style.display = 'block';

            // Update call info
            const callChannel = document.getElementById('call-channel');
            if (callChannel) {
                if (currentChatType === 'server') {
                    const server = userServers.find(s => s.id === currentServer);
                    callChannel.textContent = `# ${server ? server.name : 'Unknown Server'}`;
                } else if (currentChatType === 'dm') {
                    callChannel.textContent = `@ ${currentDMUser.username}`;
                }
            }

            // Show current user in participants
            updateCallParticipants();
        }

        // Create or join call in Firebase
        if (!isDemoMode) {
            console.log('🔥 Creating/joining Firebase call...');
            await createOrJoinVoiceCall();
        }

        showNotification('Voice call started!', 'success');
        console.log('✅ Voice call started successfully');

    } catch (error) {
        console.error('❌ Start voice call error:', error);
        showNotification('Failed to start voice call', 'error');
        isInCall = false;
    }
}

function testAudioPlayback() {
    try {
        console.log('🔊 Testing audio playback...');

        // Create a test audio element
        const testAudio = document.createElement('audio');
        testAudio.autoplay = true;
        testAudio.volume = 1.0;

        // Create a test tone
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);

        console.log('✅ Audio test completed');
        showNotification('Audio test played', 'info');

    } catch (error) {
        console.error('❌ Audio test failed:', error);
        showNotification('Audio test failed', 'error');
    }
}

function toggleMute() {
    try {
        if (!localStream) {
            showNotification('No active call', 'error');
            return;
        }

        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;

            const muteBtn = document.querySelector('.call-btn.mute');
            if (muteBtn) {
                const icon = muteBtn.querySelector('i');
                if (audioTrack.enabled) {
                    icon.classList.remove('fa-microphone-slash');
                    icon.classList.add('fa-microphone');
                    muteBtn.classList.remove('muted');
                    showNotification('Microphone unmuted', 'info');
                } else {
                    icon.classList.remove('fa-microphone');
                    icon.classList.add('fa-microphone-slash');
                    muteBtn.classList.add('muted');
                    showNotification('Microphone muted', 'info');
                }
            }
        }
    } catch (error) {
        console.error('Toggle mute error:', error);
    }
}

function toggleDeafen() {
    try {
        const remoteAudios = document.querySelectorAll('[id^="remote-audio-"]');
        const deafenBtn = document.querySelector('.call-btn.deafen');

        if (deafenBtn) {
            const icon = deafenBtn.querySelector('i');
            const isDeafened = deafenBtn.classList.contains('deafened');

            remoteAudios.forEach(audio => {
                audio.muted = !isDeafened;
            });

            if (isDeafened) {
                icon.classList.remove('fa-volume-mute');
                icon.classList.add('fa-volume-up');
                deafenBtn.classList.remove('deafened');
                showNotification('Audio undeafened', 'info');
            } else {
                icon.classList.remove('fa-volume-up');
                icon.classList.add('fa-volume-mute');
                deafenBtn.classList.add('deafened');
                showNotification('Audio deafened', 'info');
            }
        }
    } catch (error) {
        console.error('Toggle deafen error:', error);
    }
}

async function leaveCall() {
    try {
        isInCall = false;

        // Stop local stream
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }

        // Close all peer connections
        Object.values(peerConnections).forEach(pc => pc.close());
        peerConnections = {};

        // Remove remote audio elements
        document.querySelectorAll('[id^="remote-audio-"]').forEach(audio => {
            audio.remove();
        });

        // Remove from Firebase call
        if (!isDemoMode && currentCallId && currentUser) {
            const callRef = db.collection('calls').doc(currentCallId);

            // Remove from participants array
            await callRef.update({
                participants: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
            });

            // Remove participant document
            await callRef.collection('participants').doc(currentUser.uid).delete();
        }

        currentCallId = null;
        closeModal();
        showNotification('Left voice call', 'info');

    } catch (error) {
        console.error('Leave voice call error:', error);
    }
}

// Modal Functions
function closeModal() {
    try {
        console.log('closeModal called');
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.classList.add('hidden');
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    } catch (error) {
        console.error('Close modal error:', error);
    }
}
function showCreateServerModal() {
    try {
        const modalOverlay = document.getElementById('modal-overlay');
        const createServerModal = document.getElementById('create-server-modal');

        if (modalOverlay && createServerModal) {
            modalOverlay.classList.remove('hidden');
            createServerModal.style.display = 'block';

            // Clear form
            document.getElementById('server-name').value = '';
            document.getElementById('server-description').value = '';

            // Focus on name input
            document.getElementById('server-name').focus();
        }
    } catch (error) {
        console.error('Show create server modal error:', error);
    }
}

async function createServer() {
    try {
        const serverName = document.getElementById('server-name').value.trim();
        const serverDescription = document.getElementById('server-description').value.trim();

        if (!serverName) {
            showNotification('Please enter a server name', 'error');
            return;
        }

        if (!currentUser) {
            showNotification('Please log in first', 'error');
            return;
        }

        if (isDemoMode) {
            showNotification('Server created in demo mode!', 'success');
            closeModal();
            return;
        }

        const serverData = {
            name: serverName,
            description: serverDescription || 'No description provided',
            owner: currentUser.uid,
            members: [currentUser.uid],
            memberCount: 1,
            isPublic: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            channels: ['general']
        };

        const serverRef = await db.collection('servers').add(serverData);

        // Create the general channel
        await db.collection('servers')
            .doc(serverRef.id)
            .collection('channels')
            .doc('general')
            .set({
                name: 'general',
                description: 'General discussion',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        showNotification(`Server "${serverName}" created successfully!`, 'success');
        closeModal();

        // Reload user servers and join the new server
        await loadUserServers();
        await joinServer(serverRef.id);

    } catch (error) {
        console.error('Create server error:', error);
        showNotification('Failed to create server', 'error');
    }
}

// Member Functions
async function loadServerMembers(serverId) {
    try {
        if (isDemoMode) {
            loadDemoMembers();
            return;
        }

        if (!serverId) return;

        const membersList = document.getElementById('members-list');
        if (!membersList) return;

        // Get server to find member IDs
        const serverDoc = await db.collection('servers').doc(serverId).get();
        if (!serverDoc.exists) return;

        const server = serverDoc.data();
        const memberIds = server.members || [];

        if (memberIds.length === 0) {
            membersList.innerHTML = `
                <div class="no-members">
                    <i class="fas fa-users"></i>
                    <p>No members found</p>
                </div>
            `;
            return;
        }

        // Get member details
        const memberPromises = memberIds.map(uid =>
            db.collection('users').doc(uid).get()
        );

        const memberDocs = await Promise.all(memberPromises);
        const members = [];

        memberDocs.forEach(doc => {
            if (doc.exists) {
                const userData = doc.data();
                members.push({ id: doc.id, ...userData });
            }
        });

        // Sort members by status: online first, then away, then offline
        members.sort((a, b) => {
            const statusOrder = { 'online': 0, 'away': 1, 'offline': 2 };
            const statusA = statusOrder[a.status] || 2;
            const statusB = statusOrder[b.status] || 2;

            if (statusA !== statusB) return statusA - statusB;

            // If same status, sort by last seen (most recent first)
            const lastSeenA = a.lastSeen?.toMillis ? a.lastSeen.toMillis() : 0;
            const lastSeenB = b.lastSeen?.toMillis ? b.lastSeen.toMillis() : 0;
            return lastSeenB - lastSeenA;
        });

        membersList.innerHTML = '';

        members.forEach(member => {
            const isCurrentUser = member.id === currentUser.uid;
            const status = member.status || 'offline';
            const lastSeen = member.lastSeen?.toMillis ? member.lastSeen.toMillis() : 0;
            const now = Date.now();
            const minutesAgo = Math.floor((now - lastSeen) / 60000);

            let statusText = 'Offline';
            let statusClass = 'offline';

            if (status === 'online') {
                statusText = 'Online';
                statusClass = 'online';
            } else if (status === 'away') {
                statusText = 'Away';
                statusClass = 'away';
            } else if (lastSeen > 0) {
                if (minutesAgo < 60) {
                    statusText = `${minutesAgo}m ago`;
                } else if (minutesAgo < 1440) {
                    statusText = `${Math.floor(minutesAgo / 60)}h ago`;
                } else {
                    statusText = `${Math.floor(minutesAgo / 1440)}d ago`;
                }
            }

            const memberElement = document.createElement('div');
            memberElement.className = 'member-item';
            memberElement.dataset.userId = member.id;
            memberElement.dataset.status = status;

            const avatarContent = member.photoURL
                ? `<img src="${member.photoURL}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
                : '<i class="fas fa-user"></i>';

            memberElement.innerHTML = `
                <div class="member-avatar">
                    ${avatarContent}
                    <div class="member-status ${statusClass}" title="${statusText}"></div>
                </div>
                <div class="member-info">
                    <span class="member-name">${member.username}${isCurrentUser ? ' (You)' : ''}</span>
                    <span class="member-status-text">${statusText}</span>
                    ${member.customStatus ? `<span class="member-custom-status">${escapeHtml(member.customStatus)}</span>` : ''}
                </div>
                ${!isCurrentUser ? `<button class="dm-btn" onclick="startDMWithUser('${member.username}', '${member.id}')" title="Send DM"><i class="fas fa-comment"></i></button>` : ''}
            `;

            membersList.appendChild(memberElement);
        });

        console.log(`✅ Loaded ${members.length} members for server`);

    } catch (error) {
        console.error('Load server members error:', error);
    }
}

function loadDemoMembers() {
    try {
        const membersList = document.getElementById('members-list');
        if (!membersList) return;

        const demoUsers = ['alice_dev', 'bob_coder', 'charlie_js'];

        membersList.innerHTML = `
            <div class="member-item">
                <div class="member-avatar">
                    <i class="fas fa-user"></i>
                    <div class="member-status online"></div>
                </div>
                <span class="member-name">${currentUser.username} (You)</span>
            </div>
        `;

        demoUsers.forEach(username => {
            membersList.innerHTML += `
                <div class="member-item">
                    <div class="member-avatar">
                        <i class="fas fa-user"></i>
                        <div class="member-status online"></div>
                    </div>
                    <span class="member-name">${username}</span>
                    <button class="dm-btn" onclick="startDMWithUser('${username}', 'demo-${username}')" title="Send DM">
                        <i class="fas fa-comment"></i>
                    </button>
                </div>
            `;
        });
    } catch (error) {
        console.error('Load demo members error:', error);
    }
}

// DM Functions
async function startDMWithUser(username, userId) {
    try {
        if (!currentUser) {
            showNotification('Please log in first', 'error');
            return;
        }

        if (userId === currentUser.uid) {
            showNotification('Cannot DM yourself', 'error');
            return;
        }

        currentChatType = 'dm';
        currentDMUser = { uid: userId, username: username };
        currentServer = null;

        // Clear notification badge when opening DM
        clearNotificationBadge();

        // Update UI
        document.getElementById('current-channel').textContent = `@ ${username}`;

        // Clear messages container and show messages area
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="messages" id="messages" style="flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px;"></div>
            `;
        }

        // Clear server selection
        document.querySelectorAll('.server-item').forEach(item => {
            item.classList.remove('active');
        });

        // Update members list to show just the DM participants
        const membersList = document.getElementById('members-list');
        if (membersList) {
            membersList.innerHTML = `
                <div class="dm-participants">
                    <div class="member-item">
                        <div class="member-avatar">
                            ${currentUser.photoURL ?
                    `<img src="${currentUser.photoURL}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` :
                    '<i class="fas fa-user"></i>'
                }
                            <div class="member-status online"></div>
                        </div>
                        <span class="member-name">${currentUser.username} (You)</span>
                    </div>
                    <div class="member-item">
                        <div class="member-avatar">
                            <i class="fas fa-user"></i>
                            <div class="member-status online"></div>
                        </div>
                        <span class="member-name">${username}</span>
                    </div>
                </div>
            `;
        }

        // Load DM messages
        loadMessages();

        showNotification(`Started DM with ${username}`, 'success');
        console.log('✅ Started DM with:', username);

    } catch (error) {
        console.error('Start DM error:', error);
        showNotification('Failed to start DM', 'error');
    }
}

// Desktop Interface Functions
function initializeDesktopInterface() {
    console.log('Desktop interface initialized - Mobile support removed');
}

// Make all functions globally available
window.sendMessage = sendMessage;
window.handleMessageInput = handleMessageInput;
window.closeModal = closeModal;
window.handleGoogleLogin = handleGoogleLogin;
window.checkUsernameAvailability = checkUsernameAvailability;
window.completeSetup = completeSetup;

// Debug: Ensure functions are available
console.log('Functions exposed to global scope:', {
    handleGoogleLogin: typeof window.handleGoogleLogin,
    checkUsernameAvailability: typeof window.checkUsernameAvailability,
    completeSetup: typeof window.completeSetup,
    sendMessage: typeof window.sendMessage
});

// Ensure functions are available immediately
if (typeof window.handleGoogleLogin === 'undefined') {
    console.error('handleGoogleLogin function not found! Adding fallback...');
    window.handleGoogleLogin = function () {
        console.log('Fallback handleGoogleLogin called');
        if (typeof handleGoogleLogin === 'function') {
            return handleGoogleLogin();
        } else {
            console.error('handleGoogleLogin function is not defined');
            showNotification('Authentication system not ready. Please refresh the page.', 'error');
        }
    };
}
window.logout = logout;
window.showCreateServerModal = showCreateServerModal;
window.createServer = createServer;
window.showServerBrowser = showServerBrowser;
window.joinServerFromBrowser = joinServerFromBrowser;
window.joinDemoServer = joinDemoServer;
window.joinServer = joinServer;
window.leaveServer = leaveServer;
window.startDMWithUser = startDMWithUser;
window.loadUserServers = loadUserServers;
window.toggleMute = toggleMute;
window.toggleDeafen = toggleDeafen;
window.leaveCall = leaveCall;
window.startVoiceCall = startVoiceCall;
window.testAudioPlayback = testAudioPlayback;
window.showSettings = showSettings;
window.attachFile = attachFile;

// Event Listeners
document.addEventListener('DOMContentLoaded', function () {
    try {
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', handleMessageInput);
        }

        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function (e) {
                if (e.target === this) {
                    closeModal();
                }
            });
        }

        console.log('✅ Event listeners set up');
    } catch (error) {
        console.error('DOM setup error:', error);
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    try {
        if (e.key === 'Escape') {
            closeModal();
        }
    } catch (error) {
        console.error('Keyboard shortcut error:', error);
    }
});

console.log('✅ StellarChat loaded successfully! 🚀');
// Them

function setTheme(theme) {
    try {
        // Update theme checks
        document.querySelectorAll('.theme-check').forEach(check => {
            check.style.display = 'none';
        });
        document.getElementById(`${theme}-check`).style.display = 'block';

        // Apply theme
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${theme}`);

        // Save theme preference
        localStorage.setItem('stellarchat-theme', theme);

        showNotification(`Switched to ${theme} mode`, 'success');
    } catch (error) {
        console.error('Set theme error:', error);
        showNotification('Failed to change theme', 'error');
    }
}

// Status Management Functions
async function setUserStatus(status) {
    try {
        if (isDemoMode) {
            showNotification(`Status set to ${status} (demo mode)`, 'info');
            return;
        }

        if (!currentUser) return;

        // Update status checks
        document.querySelectorAll('.status-check').forEach(check => {
            check.style.display = 'none';
        });
        document.getElementById(`${status}-check`).style.display = 'block';

        // Update user status in database
        await db.collection('users').doc(currentUser.uid).update({
            status: status,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification(`Status updated to ${status}`, 'success');

        // Refresh member lists if in a server
        if (currentServer) {
            loadServerMembers(currentServer);
        }

    } catch (error) {
        console.error('Set user status error:', error);
        showNotification('Failed to update status', 'error');
    }
}

async function updateCustomStatus() {
    try {
        const customStatus = document.getElementById('custom-status').value.trim();

        if (isDemoMode) {
            showNotification(`Custom status set: "${customStatus}" (demo mode)`, 'info');
            return;
        }

        if (!currentUser) return;

        await db.collection('users').doc(currentUser.uid).update({
            customStatus: customStatus,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification('Custom status updated!', 'success');

    } catch (error) {
        console.error('Update custom status error:', error);
        showNotification('Failed to update custom status', 'error');
    }
}

async function clearCustomStatus() {
    try {
        document.getElementById('custom-status').value = '';

        if (isDemoMode) {
            showNotification('Custom status cleared (demo mode)', 'info');
            return;
        }

        if (!currentUser) return;

        await db.collection('users').doc(currentUser.uid).update({
            customStatus: '',
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification('Custom status cleared!', 'success');

    } catch (error) {
        console.error('Clear custom status error:', error);
        showNotification('Failed to clear custom status', 'error');
    }
}

// Profile Management Functions
async function handleAvatarUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showNotification('Please select an image file', 'error');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Image must be smaller than 5MB', 'error');
            return;
        }

        if (isDemoMode) {
            // In demo mode, just show a preview
            const reader = new FileReader();
            reader.onload = function (e) {
                const currentAvatar = document.querySelector('.current-avatar');
                if (currentAvatar) {
                    currentAvatar.innerHTML = `<img src="${e.target.result}" alt="Avatar">`;
                }
                showNotification('Avatar updated (demo mode)', 'success');
            };
            reader.readAsDataURL(file);
            return;
        }

        if (!currentUser) return;

        showNotification('Uploading avatar...', 'info');

        // Check if Firebase Storage is available
        if (!firebase.storage) {
            showNotification('Firebase Storage not available. Please check your configuration.', 'error');
            console.error('Firebase Storage not initialized');
            return;
        }

        // Upload to Firebase Storage
        const storageRef = firebase.storage().ref();
        const avatarRef = storageRef.child(`avatars/${currentUser.uid}/${Date.now()}_${file.name}`);

        const uploadTask = avatarRef.put(file);

        uploadTask.on('state_changed',
            (snapshot) => {
                // Progress tracking could be added here
            },
            (error) => {
                console.error('Upload error:', error);
                showNotification('Failed to upload avatar', 'error');
            },
            async () => {
                try {
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();

                    // Update user profile
                    await db.collection('users').doc(currentUser.uid).update({
                        photoURL: downloadURL,
                        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // Update current user object
                    currentUser.photoURL = downloadURL;

                    // Update UI
                    const currentAvatar = document.querySelector('.current-avatar');
                    if (currentAvatar) {
                        currentAvatar.innerHTML = `<img src="${downloadURL}" alt="Avatar">`;
                    }

                    const userAvatar = document.querySelector('.user-avatar');
                    if (userAvatar) {
                        userAvatar.innerHTML = `<img src="${downloadURL}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                    }

                    showNotification('Avatar updated successfully!', 'success');

                } catch (error) {
                    console.error('Avatar update error:', error);
                    showNotification('Failed to update avatar', 'error');
                }
            }
        );

    } catch (error) {
        console.error('Handle avatar upload error:', error);
        showNotification('Failed to upload avatar', 'error');
    }
}

async function removeAvatar() {
    try {
        if (isDemoMode) {
            const currentAvatar = document.querySelector('.current-avatar');
            if (currentAvatar) {
                currentAvatar.innerHTML = '<i class="fas fa-user"></i>';
            }
            showNotification('Avatar removed (demo mode)', 'info');
            return;
        }

        if (!currentUser) return;

        await db.collection('users').doc(currentUser.uid).update({
            photoURL: null,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update current user object
        currentUser.photoURL = null;

        // Update UI
        const currentAvatar = document.querySelector('.current-avatar');
        if (currentAvatar) {
            currentAvatar.innerHTML = '<i class="fas fa-user"></i>';
        }

        const userAvatar = document.querySelector('.user-avatar');
        if (userAvatar) {
            userAvatar.innerHTML = '<i class="fas fa-user"></i>';
        }

        showNotification('Avatar removed successfully!', 'success');

    } catch (error) {
        console.error('Remove avatar error:', error);
        showNotification('Failed to remove avatar', 'error');
    }
}

async function updateUsername() {
    try {
        const newUsername = document.getElementById('new-username').value.trim();
        const statusElement = document.getElementById('username-change-status');

        if (!newUsername) {
            statusElement.textContent = 'Username cannot be empty';
            statusElement.className = 'username-status taken';
            return;
        }

        if (newUsername === currentUser.username) {
            statusElement.textContent = 'This is already your username';
            statusElement.className = 'username-status taken';
            return;
        }

        if (newUsername.length < 3) {
            statusElement.textContent = 'Too short (min 3 characters)';
            statusElement.className = 'username-status taken';
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
            statusElement.textContent = 'Only letters, numbers, and underscores allowed';
            statusElement.className = 'username-status taken';
            return;
        }

        statusElement.textContent = 'Checking availability...';
        statusElement.className = 'username-status checking';

        if (isDemoMode) {
            currentUser.username = newUsername;
            document.getElementById('current-username').textContent = newUsername;
            statusElement.textContent = 'Username updated! (demo mode)';
            statusElement.className = 'username-status available';
            showNotification('Username updated!', 'success');
            return;
        }

        if (!currentUser) return;

        // Check if username is available
        const usernameDoc = await db.collection('usernames').doc(newUsername).get();

        if (usernameDoc.exists) {
            statusElement.textContent = 'Username already taken';
            statusElement.className = 'username-status taken';
            return;
        }

        // Update username
        const batch = db.batch();

        // Remove old username
        const oldUsernameRef = db.collection('usernames').doc(currentUser.username);
        batch.delete(oldUsernameRef);

        // Add new username
        const newUsernameRef = db.collection('usernames').doc(newUsername);
        batch.set(newUsernameRef, { uid: currentUser.uid });

        // Update user document
        const userRef = db.collection('users').doc(currentUser.uid);
        batch.update(userRef, {
            username: newUsername,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        // Update current user object
        currentUser.username = newUsername;

        // Update UI
        document.getElementById('current-username').textContent = newUsername;

        statusElement.textContent = 'Username updated successfully!';
        statusElement.className = 'username-status available';

        showNotification('Username updated successfully!', 'success');

    } catch (error) {
        console.error('Update username error:', error);
        const statusElement = document.getElementById('username-change-status');
        if (statusElement) {
            statusElement.textContent = 'Failed to update username';
            statusElement.className = 'username-status taken';
        }
        showNotification('Failed to update username', 'error');
    }
}

// Real-time Status Updates
function setupRealTimeStatusUpdates() {
    try {
        if (isDemoMode || !currentUser) return;

        // Listen for user status changes in real-time
        const unsubscribe = db.collection('users')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'modified') {
                        const userData = change.doc.data();
                        const userId = change.doc.id;

                        // Update member status in UI if they're visible
                        const memberElement = document.querySelector(`[data-user-id="${userId}"]`);
                        if (memberElement) {
                            updateMemberStatusInUI(memberElement, userData);
                        }
                    }
                });
            });

        // Store unsubscribe function for cleanup
        presenceListeners.push(unsubscribe);

        console.log('✅ Real-time status updates active');

    } catch (error) {
        console.error('Setup real-time status updates error:', error);
    }
}

function updateMemberStatusInUI(memberElement, userData) {
    try {
        const status = userData.status || 'offline';
        const lastSeen = userData.lastSeen?.toMillis ? userData.lastSeen.toMillis() : 0;
        const now = Date.now();
        const minutesAgo = Math.floor((now - lastSeen) / 60000);

        let statusText = 'Offline';
        let statusClass = 'offline';

        if (status === 'online') {
            statusText = 'Online';
            statusClass = 'online';
        } else if (status === 'away') {
            statusText = 'Away';
            statusClass = 'away';
        } else if (status === 'busy') {
            statusText = 'Do Not Disturb';
            statusClass = 'busy';
        } else if (status === 'invisible') {
            statusText = 'Offline';
            statusClass = 'offline';
        } else if (lastSeen > 0) {
            if (minutesAgo < 60) {
                statusText = `${minutesAgo}m ago`;
            } else if (minutesAgo < 1440) {
                statusText = `${Math.floor(minutesAgo / 60)}h ago`;
            } else {
                statusText = `${Math.floor(minutesAgo / 1440)}d ago`;
            }
        }

        // Update status indicator
        const statusIndicator = memberElement.querySelector('.member-status');
        if (statusIndicator) {
            statusIndicator.className = `member-status ${statusClass}`;
            statusIndicator.title = statusText;
        }

        // Update status text
        const statusTextElement = memberElement.querySelector('.member-status-text');
        if (statusTextElement) {
            statusTextElement.textContent = statusText;
        }

        // Update custom status if present
        if (userData.customStatus) {
            const customStatusElement = memberElement.querySelector('.member-custom-status');
            if (customStatusElement) {
                customStatusElement.textContent = userData.customStatus;
            } else {
                // Add custom status element if it doesn't exist
                const memberInfo = memberElement.querySelector('.member-info');
                if (memberInfo) {
                    const customStatus = document.createElement('span');
                    customStatus.className = 'member-custom-status';
                    customStatus.textContent = userData.customStatus;
                    memberInfo.appendChild(customStatus);
                }
            }
        }

        // Update element's data attribute
        memberElement.dataset.status = status;

    } catch (error) {
        console.error('Update member status in UI error:', error);
    }
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', function () {
    try {
        const savedTheme = localStorage.getItem('stellarchat-theme') || 'dark';
        document.body.classList.add(`theme-${savedTheme}`);
    } catch (error) {
        console.error('Initialize theme error:', error);
    }
});
let friendsList = [];
let dmConversations = [];
let notifications = [];
let groupChats = [];

// Friend System Functions
function showAddFriendModal() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-user-plus"></i> Add Friend</h2>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="input-group">
                        <label for="friend-username">Enter username:</label>
                        <input type="text" id="friend-username" placeholder="Username" maxlength="50" autocomplete="off">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancel-friend-btn">Cancel</button>
                    <button class="btn-primary" id="send-friend-btn">Send Request</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('#cancel-friend-btn');
        const sendBtn = modal.querySelector('#send-friend-btn');
        const input = modal.querySelector('#friend-username');

        const closeModal = (result = null) => {
            modal.remove();
            resolve(result);
        };

        closeBtn.addEventListener('click', () => closeModal());
        cancelBtn.addEventListener('click', () => closeModal());
        sendBtn.addEventListener('click', () => {
            const username = input.value.trim();
            closeModal(username);
        });

        // Focus the input
        setTimeout(() => input.focus(), 100);

        // Handle Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const username = e.target.value.trim();
                closeModal(username);
            }
        });

        // Handle Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Handle click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    });
}

async function addFriend() {
    try {
        // Create a custom modal instead of using prompt()
        const username = await showAddFriendModal();
        if (!username) return;

        if (isDemoMode) {
            showNotification(`Friend request sent to ${username} (demo mode)`, 'info');
            return;
        }

        // Debug: Check if currentUser is properly set
        if (!currentUser || !currentUser.uid) {
            showNotification('Please log in first', 'error');
            return;
        }

        if (!currentUser.username) {
            showNotification('Username not set. Please refresh and try again.', 'error');
            return;
        }

        console.log('Adding friend:', username, 'Current user:', currentUser.username);

        // Check if username exists
        const usernameDoc = await db.collection('usernames').doc(username).get();
        if (!usernameDoc.exists) {
            showNotification('User not found', 'error');
            return;
        }

        const targetUserId = usernameDoc.data().uid;
        if (targetUserId === currentUser.uid) {
            showNotification("You can't add yourself as a friend", 'error');
            return;
        }

        // Check if already friends
        const friendshipDoc = await db.collection('friendships')
            .where('users', 'array-contains', currentUser.uid)
            .get();

        const alreadyFriends = friendshipDoc.docs.some(doc =>
            doc.data().users.includes(targetUserId)
        );

        if (alreadyFriends) {
            showNotification('Already friends with this user', 'info');
            return;
        }

        // Check if friend request already sent
        const existingRequest = await db.collection('notifications')
            .where('type', '==', 'friend_request')
            .where('from', '==', currentUser.uid)
            .where('to', '==', targetUserId)
            .where('read', '==', false)
            .get();

        if (!existingRequest.empty) {
            showNotification('Friend request already sent', 'info');
            return;
        }

        // Send friend request notification
        await db.collection('notifications').add({
            type: 'friend_request',
            from: currentUser.uid,
            fromUsername: currentUser.username,
            to: targetUserId,
            message: `${currentUser.username} sent you a friend request`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });

        showNotification(`Friend request sent to ${username}`, 'success');

    } catch (error) {
        console.error('Add friend error:', error);
        console.error('Error details:', error.message);
        showNotification(`Failed to send friend request: ${error.message}`, 'error');
    }
}

async function acceptFriendRequest(notificationId, fromUserId, fromUsername) {
    try {
        if (isDemoMode) {
            showNotification(`Accepted friend request from ${fromUsername} (demo mode)`, 'success');
            return;
        }

        // Create friendship
        await db.collection('friendships').add({
            users: [currentUser.uid, fromUserId],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Mark notification as read
        await db.collection('notifications').doc(notificationId).update({
            read: true
        });

        // Send acceptance notification
        await db.collection('notifications').add({
            type: 'friend_accepted',
            from: currentUser.uid,
            fromUsername: currentUser.username,
            to: fromUserId,
            message: `${currentUser.username} accepted your friend request`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });

        showNotification(`You are now friends with ${fromUsername}`, 'success');
        loadFriends();
        loadNotifications();

    } catch (error) {
        console.error('Accept friend request error:', error);
        showNotification('Failed to accept friend request', 'error');
    }
}

async function loadFriends() {
    try {
        if (isDemoMode) {
            friendsList = [
                { id: 'demo1', username: 'alice_dev', status: 'online' },
                { id: 'demo2', username: 'bob_coder', status: 'away' }
            ];
            updateFriendsList();
            return;
        }

        if (!currentUser) return;

        const friendshipsSnapshot = await db.collection('friendships')
            .where('users', 'array-contains', currentUser.uid)
            .get();

        const friendIds = [];
        friendshipsSnapshot.forEach(doc => {
            const users = doc.data().users;
            const friendId = users.find(id => id !== currentUser.uid);
            if (friendId) friendIds.push(friendId);
        });

        if (friendIds.length === 0) {
            friendsList = [];
            updateFriendsList();
            return;
        }

        // Get friend details
        const friendPromises = friendIds.map(id =>
            db.collection('users').doc(id).get()
        );

        const friendDocs = await Promise.all(friendPromises);
        friendsList = [];

        friendDocs.forEach(doc => {
            if (doc.exists) {
                friendsList.push({ id: doc.id, ...doc.data() });
            }
        });

        updateFriendsList();

    } catch (error) {
        console.error('Load friends error:', error);
    }
}

function updateFriendsList() {
    try {
        const friendsListElement = document.getElementById('friends-list');
        if (!friendsListElement) return;

        if (friendsList.length === 0) {
            friendsListElement.innerHTML = `
                <div class="no-friends">
                    <i class="fas fa-user-friends"></i>
                    <p>No friends yet</p>
                    <button onclick="addFriend()" class="add-friend-btn">
                        <i class="fas fa-plus"></i> Add Friend
                    </button>
                </div>
            `;
            return;
        }

        friendsListElement.innerHTML = '';

        friendsList.forEach(friend => {
            const friendElement = document.createElement('div');
            friendElement.className = 'friend-item';
            friendElement.dataset.userId = friend.id;

            const status = friend.status || 'offline';
            const statusClass = status === 'online' ? 'online' : status === 'away' ? 'away' : 'offline';

            friendElement.innerHTML = `
                <div class="friend-avatar">
                    ${friend.photoURL
                    ? `<img src="${friend.photoURL}" alt="Avatar">`
                    : '<i class="fas fa-user"></i>'
                }
                    <div class="friend-status ${statusClass}"></div>
                </div>
                <div class="friend-info">
                    <span class="friend-name">${friend.username}</span>
                    <span class="friend-status-text">${status}</span>
                </div>
                <button class="dm-friend-btn" onclick="startDMWithUser('${friend.username}', '${friend.id}')" title="Send Message">
                    <i class="fas fa-comment"></i>
                </button>
            `;

            friendsListElement.appendChild(friendElement);
        });

    } catch (error) {
        console.error('Update friends list error:', error);
    }
}

// DM System Functions
async function startDMWithUser(username, userId) {
    try {
        currentChatType = 'dm';
        currentDMUser = { id: userId, username: username };

        document.getElementById('current-channel').textContent = `@ ${username}`;

        // Clear messages container and show DM area
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="messages" id="messages" style="flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px;"></div>
            `;
        }

        // Load DM messages
        loadDMMessages(userId);

        // Add to DM conversations list
        addToDMConversations(userId, username);

        console.log(`✅ Started DM with ${username}`);

    } catch (error) {
        console.error('Start DM error:', error);
        showNotification('Failed to start DM', 'error');
    }
}

async function loadDMMessages(userId) {
    try {
        if (isDemoMode) {
            const messagesElement = document.getElementById('messages');
            if (messagesElement) {
                messagesElement.innerHTML = `
                    <div class="message">
                        <div class="message-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="message-content">
                            <div class="message-header">
                                <span class="message-author">Demo User</span>
                                <span class="message-time">Just now</span>
                            </div>
                            <div class="message-text">This is a demo DM conversation!</div>
                        </div>
                    </div>
                `;
            }
            return;
        }

        if (!currentUser) return;

        // Create conversation ID (consistent ordering)
        const conversationId = [currentUser.uid, userId].sort().join('_');

        // Listen for DM messages
        const messagesListener = db.collection('dm_messages')
            .where('conversationId', '==', conversationId)
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
                const messagesElement = document.getElementById('messages');
                if (!messagesElement) return;

                messagesElement.innerHTML = '';

                snapshot.forEach(doc => {
                    const message = doc.data();
                    const messageElement = createMessageElement(message);
                    messagesElement.appendChild(messageElement);
                });

                // Scroll to bottom
                messagesElement.scrollTop = messagesElement.scrollHeight;
            });

        // Store listener for cleanup
        messageListeners.push(messagesListener);

    } catch (error) {
        console.error('Load DM messages error:', error);
    }
}

function addToDMConversations(userId, username) {
    try {
        // Check if conversation already exists
        const existingConv = dmConversations.find(conv => conv.userId === userId);
        if (existingConv) {
            existingConv.lastActivity = Date.now();
        } else {
            dmConversations.push({
                userId: userId,
                username: username,
                lastActivity: Date.now()
            });
        }

        // Sort by last activity
        dmConversations.sort((a, b) => b.lastActivity - a.lastActivity);

        updateDMsList();

    } catch (error) {
        console.error('Add to DM conversations error:', error);
    }
}

function updateDMsList() {
    try {
        const dmsListElement = document.getElementById('dms-list');
        if (!dmsListElement) return;

        if (dmConversations.length === 0) {
            dmsListElement.innerHTML = `
                <div class="no-dms">
                    <i class="fas fa-comments"></i>
                    <p>No conversations yet</p>
                </div>
            `;
            return;
        }

        dmsListElement.innerHTML = '';

        dmConversations.forEach(conv => {
            const dmElement = document.createElement('div');
            dmElement.className = 'dm-item';
            dmElement.onclick = () => startDMWithUser(conv.username, conv.userId);

            dmElement.innerHTML = `
                <div class="dm-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="dm-info">
                    <span class="dm-username">${conv.username}</span>
                    <span class="dm-last-activity">${formatTimestamp(conv.lastActivity)}</span>
                </div>
            `;

            dmsListElement.appendChild(dmElement);
        });

    } catch (error) {
        console.error('Update DMs list error:', error);
    }
}

// Notifications System
async function loadNotifications() {
    try {
        if (isDemoMode) {
            notifications = [
                {
                    id: 'demo1',
                    type: 'friend_request',
                    fromUsername: 'alice_dev',
                    message: 'alice_dev sent you a friend request',
                    timestamp: Date.now(),
                    read: false
                }
            ];
            updateNotificationsList();
            return;
        }

        if (!currentUser) return;

        const notificationsSnapshot = await db.collection('notifications')
            .where('to', '==', currentUser.uid)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();

        notifications = [];
        notificationsSnapshot.forEach(doc => {
            notifications.push({ id: doc.id, ...doc.data() });
        });

        updateNotificationsList();
        updateNotificationBadge();

    } catch (error) {
        console.error('Load notifications error:', error);
    }
}

function updateNotificationsList() {
    try {
        const notificationsListElement = document.getElementById('notifications-list');
        if (!notificationsListElement) return;

        if (notifications.length === 0) {
            notificationsListElement.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell"></i>
                    <p>No notifications</p>
                </div>
            `;
            return;
        }

        notificationsListElement.innerHTML = '';

        notifications.forEach(notification => {
            const notifElement = document.createElement('div');
            notifElement.className = `notification-item ${notification.read ? 'read' : 'unread'}`;

            let actionButtons = '';
            if (notification.type === 'friend_request' && !notification.read) {
                actionButtons = `
                    <div class="notification-actions">
                        <button onclick="acceptFriendRequest('${notification.id}', '${notification.from}', '${notification.fromUsername}')" class="accept-btn">
                            <i class="fas fa-check"></i> Accept
                        </button>
                        <button onclick="declineFriendRequest('${notification.id}')" class="decline-btn">
                            <i class="fas fa-times"></i> Decline
                        </button>
                    </div>
                `;
            }

            notifElement.innerHTML = `
                <div class="notification-content">
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${formatTimestamp(notification.timestamp?.toMillis ? notification.timestamp.toMillis() : notification.timestamp)}</div>
                    ${actionButtons}
                </div>
            `;

            notificationsListElement.appendChild(notifElement);
        });

    } catch (error) {
        console.error('Update notifications list error:', error);
    }
}

function updateNotificationBadge() {
    try {
        const unreadCount = notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notification-badge');

        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }

    } catch (error) {
        console.error('Update notification badge error:', error);
    }
}

function showNotificationsPanel() {
    try {
        currentChatType = 'notifications';

        document.getElementById('current-channel').textContent = 'Notifications';

        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="notifications-panel">
                    <div class="notifications-header">
                        <h2><i class="fas fa-bell"></i> Notifications</h2>
                        <button onclick="markAllNotificationsRead()" class="mark-all-read-btn">
                            <i class="fas fa-check-double"></i> Mark All Read
                        </button>
                    </div>
                    <div class="notifications-list" id="notifications-list"></div>
                </div>
            `;
        }

        loadNotifications();

    } catch (error) {
        console.error('Show notifications panel error:', error);
    }
}

async function markAllNotificationsRead() {
    try {
        if (isDemoMode) {
            notifications.forEach(n => n.read = true);
            updateNotificationsList();
            updateNotificationBadge();
            showNotification('All notifications marked as read (demo mode)', 'success');
            return;
        }

        const batch = db.batch();
        const unreadNotifications = notifications.filter(n => !n.read);

        unreadNotifications.forEach(notification => {
            const notifRef = db.collection('notifications').doc(notification.id);
            batch.update(notifRef, { read: true });
        });

        if (unreadNotifications.length > 0) {
            await batch.commit();
            loadNotifications();
            showNotification('All notifications marked as read', 'success');
        }

    } catch (error) {
        console.error('Mark all notifications read error:', error);
        showNotification('Failed to mark notifications as read', 'error');
    }
}

// Group Chat System
async function createGroupChat() {
    try {
        const groupName = prompt('Enter group chat name:');
        if (!groupName) return;

        if (isDemoMode) {
            showNotification(`Group chat "${groupName}" created (demo mode)`, 'success');
            return;
        }

        // Create group chat
        const groupChatRef = await db.collection('group_chats').add({
            name: groupName,
            creator: currentUser.uid,
            members: [currentUser.uid],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isPrivate: true
        });

        showNotification(`Group chat "${groupName}" created!`, 'success');
        loadGroupChats();

        // Show invite modal
        showGroupInviteModal(groupChatRef.id, groupName);

    } catch (error) {
        console.error('Create group chat error:', error);
        showNotification('Failed to create group chat', 'error');
    }
}

function showGroupInviteModal(groupId, groupName) {
    try {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'group-invite-modal';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-users"></i> Invite to ${groupName}</h3>
                    <button class="close-btn" onclick="closeGroupInviteModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="invite-section">
                        <label>Username to invite:</label>
                        <input type="text" id="invite-username" placeholder="Enter username">
                        <button onclick="sendGroupInvite('${groupId}', '${groupName}')" class="btn-primary">
                            <i class="fas fa-paper-plane"></i> Send Invite
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Focus input
        setTimeout(() => {
            document.getElementById('invite-username').focus();
        }, 100);

    } catch (error) {
        console.error('Show group invite modal error:', error);
    }
}

function closeGroupInviteModal() {
    try {
        const modal = document.getElementById('group-invite-modal');
        if (modal) {
            document.body.removeChild(modal);
        }
    } catch (error) {
        console.error('Close group invite modal error:', error);
    }
}

async function sendGroupInvite(groupId, groupName) {
    try {
        const username = document.getElementById('invite-username').value.trim();
        if (!username) {
            showNotification('Please enter a username', 'error');
            return;
        }

        if (isDemoMode) {
            showNotification(`Group invite sent to ${username} (demo mode)`, 'success');
            closeGroupInviteModal();
            return;
        }

        // Check if username exists
        const usernameDoc = await db.collection('usernames').doc(username).get();
        if (!usernameDoc.exists) {
            showNotification('User not found', 'error');
            return;
        }

        const targetUserId = usernameDoc.data().uid;

        // Send group invite notification
        await db.collection('notifications').add({
            type: 'group_invite',
            from: currentUser.uid,
            fromUsername: currentUser.username,
            to: targetUserId,
            groupId: groupId,
            groupName: groupName,
            message: `${currentUser.username} invited you to join "${groupName}"`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });

        showNotification(`Group invite sent to ${username}`, 'success');
        closeGroupInviteModal();

    } catch (error) {
        console.error('Send group invite error:', error);
        showNotification('Failed to send group invite', 'error');
    }
}

async function acceptGroupInvite(notificationId, groupId, groupName) {
    try {
        if (isDemoMode) {
            showNotification(`Joined group "${groupName}" (demo mode)`, 'success');
            return;
        }

        // Add user to group
        await db.collection('group_chats').doc(groupId).update({
            members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
        });

        // Mark notification as read
        await db.collection('notifications').doc(notificationId).update({
            read: true
        });

        showNotification(`Joined group "${groupName}"`, 'success');
        loadGroupChats();
        loadNotifications();

    } catch (error) {
        console.error('Accept group invite error:', error);
        showNotification('Failed to join group', 'error');
    }
}

async function loadGroupChats() {
    try {
        if (isDemoMode) {
            groupChats = [
                { id: 'demo1', name: 'Demo Group', members: ['demo1', 'demo2'] }
            ];
            updateGroupChatsList();
            return;
        }

        if (!currentUser) return;

        const groupChatsSnapshot = await db.collection('group_chats')
            .where('members', 'array-contains', currentUser.uid)
            .get();

        groupChats = [];
        groupChatsSnapshot.forEach(doc => {
            groupChats.push({ id: doc.id, ...doc.data() });
        });

        updateGroupChatsList();

    } catch (error) {
        console.error('Load group chats error:', error);
    }
}

function updateGroupChatsList() {
    try {
        const groupChatsListElement = document.getElementById('group-chats-list');
        if (!groupChatsListElement) return;

        if (groupChats.length === 0) {
            groupChatsListElement.innerHTML = `
                <div class="no-group-chats">
                    <i class="fas fa-users"></i>
                    <p>No group chats</p>
                    <button onclick="createGroupChat()" class="create-group-btn">
                        <i class="fas fa-plus"></i> Create Group
                    </button>
                </div>
            `;
            return;
        }

        groupChatsListElement.innerHTML = '';

        groupChats.forEach(group => {
            const groupElement = document.createElement('div');
            groupElement.className = 'group-chat-item';
            groupElement.onclick = () => joinGroupChat(group.id, group.name);

            groupElement.innerHTML = `
                <div class="group-chat-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="group-chat-info">
                    <span class="group-chat-name">${group.name}</span>
                    <span class="group-chat-members">${group.members?.length || 0} members</span>
                </div>
            `;

            groupChatsListElement.appendChild(groupElement);
        });

    } catch (error) {
        console.error('Update group chats list error:', error);
    }
}

async function joinGroupChat(groupId, groupName) {
    try {
        currentChatType = 'group';
        currentServer = groupId;

        document.getElementById('current-channel').textContent = `# ${groupName}`;

        // Clear messages container and show group chat area
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="messages" id="messages" style="flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px;"></div>
            `;
        }

        // Load group chat messages
        loadGroupChatMessages(groupId);

        console.log(`✅ Joined group chat: ${groupName}`);

    } catch (error) {
        console.error('Join group chat error:', error);
        showNotification('Failed to join group chat', 'error');
    }
}

async function loadGroupChatMessages(groupId) {
    try {
        if (isDemoMode) {
            const messagesElement = document.getElementById('messages');
            if (messagesElement) {
                messagesElement.innerHTML = `
                    <div class="message">
                        <div class="message-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="message-content">
                            <div class="message-header">
                                <span class="message-author">Demo User</span>
                                <span class="message-time">Just now</span>
                            </div>
                            <div class="message-text">Welcome to the demo group chat!</div>
                        </div>
                    </div>
                `;
            }
            return;
        }

        // Listen for group chat messages
        const messagesListener = db.collection('group_messages')
            .where('groupId', '==', groupId)
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
                const messagesElement = document.getElementById('messages');
                if (!messagesElement) return;

                messagesElement.innerHTML = '';

                snapshot.forEach(doc => {
                    const message = doc.data();
                    const messageElement = createMessageElement(message);
                    messagesElement.appendChild(messageElement);
                });

                // Scroll to bottom
                messagesElement.scrollTop = messagesElement.scrollHeight;
            });

        // Store listener for cleanup
        messageListeners.push(messagesListener);

    } catch (error) {
        console.error('Load group chat messages error:', error);
    }
}// N

function showServersTab() {
    switchSidebarTab('servers');
    loadUserServers();
}

function showDMsTab() {
    switchSidebarTab('dms');
    updateDMsList();
}

function showFriendsTab() {
    switchSidebarTab('friends');
    loadFriends();
}

function showGroupsTab() {
    switchSidebarTab('groups');
    loadGroupChats();
}

function switchSidebarTab(tabName) {
    try {
        console.log('Switching to tab:', tabName);

        // Update tab buttons
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Update tab content
        document.querySelectorAll('.sidebar-tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });

        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) {
            activeContent.classList.add('active');
            activeContent.style.display = 'flex';
        }

        console.log('Tab switched successfully to:', tabName);

    } catch (error) {
        console.error('Switch sidebar tab error:', error);
    }
}

// Enhanced Message Sending Function
async function sendMessage() {
    try {
        console.log('📤 sendMessage called, currentChatType:', currentChatType);

        // Prevent double sending
        if (isSendingMessage) {
            console.log('⏳ Already sending message, ignoring...');
            return;
        }

        const messageInput = document.getElementById('message-input');
        if (!messageInput) {
            console.error('❌ Message input not found');
            return;
        }

        const messageText = messageInput.value.trim();
        if (!messageText) {
            console.log('📝 No message text');
            return;
        }

        // Security validation
        if (!securityUtils.validateMessage(messageText)) {
            showNotification('Invalid message content', 'error');
            return;
        }

        // Message rate limiting removed - users can type as fast as they want

        // Validate session
        const sessionValid = await secureSession.validateSession();
        if (!sessionValid) {
            showNotification('Session expired. Please log in again.', 'error');
            return;
        }

        if (!currentUser) {
            showNotification('Please log in first', 'error');
            return;
        }

        if (currentChatType === 'none') {
            showNotification('Please join a server or start a DM to send messages', 'error');
            return;
        }

        console.log('📤 Sending message:', messageText);
        isSendingMessage = true;

        // Demo mode handling
        if (isDemoMode) {
            console.log('🎭 Demo mode - simulating message send');
            const messagesElement = document.getElementById('messages');
            if (messagesElement) {
                const messageElement = document.createElement('div');
                messageElement.className = 'message';
                messageElement.innerHTML = `
                    <div class="message-avatar">
                        ${currentUser.photoURL
                        ? `<img src="${currentUser.photoURL}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
                        : '<i class="fas fa-user"></i>'
                    }
                    </div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-author">${escapeHtml(currentUser.username)}</span>
                            <span class="message-time">Just now</span>
                        </div>
                        <div class="message-text">${escapeHtml(messageText)}</div>
                    </div>
                `;
                messagesElement.appendChild(messageElement);
                messagesElement.scrollTop = messagesElement.scrollHeight;
            }
            messageInput.value = '';
            isSendingMessage = false;
            return;
        }

        // Prepare message data
        const messageData = {
            text: messageText,
            author: currentUser.username,
            authorId: currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            photoURL: currentUser.photoURL || null
        };

        // Send based on chat type
        if (currentChatType === 'server') {
            console.log('🖥️ Sending server message to:', currentServer);

            if (!currentServer) {
                showNotification('No server selected', 'error');
                isSendingMessage = false;
                return;
            }

            messageData.serverId = currentServer;
            messageData.channel = currentChannel;

            // Send to the correct nested collection structure that matches loadMessages
            await db.collection('servers')
                .doc(currentServer)
                .collection('channels')
                .doc(currentChannel)
                .collection('messages')
                .add(messageData);

            console.log('✅ Server message sent successfully to nested collection');

        } else if (currentChatType === 'dm') {
            console.log('💬 Sending DM message to:', currentDMUser?.username);

            if (!currentDMUser) {
                showNotification('No DM user selected', 'error');
                isSendingMessage = false;
                return;
            }

            const conversationId = [currentUser.uid, currentDMUser.id].sort().join('_');
            messageData.conversationId = conversationId;
            messageData.participants = [currentUser.uid, currentDMUser.id];

            await db.collection('dm_messages').add(messageData);
            console.log('✅ DM message sent successfully');

            // Update DM conversation list
            addToDMConversations(currentDMUser.id, currentDMUser.username);

        } else if (currentChatType === 'group') {
            console.log('👥 Sending group message to:', currentServer);

            if (!currentServer) {
                showNotification('No group selected', 'error');
                isSendingMessage = false;
                return;
            }

            messageData.groupId = currentServer;

            await db.collection('group_messages').add(messageData);
            console.log('✅ Group message sent successfully');

        } else {
            console.error('❌ Unknown chat type:', currentChatType);
            showNotification('Invalid chat context', 'error');
            isSendingMessage = false;
            return;
        }

        // Clear input and reset sending flag
        messageInput.value = '';
        isSendingMessage = false;

        console.log('✅ Message sent successfully');

    } catch (error) {
        console.error('❌ Send message error:', error);
        showNotification('Failed to send message', 'error');
        isSendingMessage = false;
    }
}

// Helper function to create message elements
function createMessageElement(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';

    const timestamp = message.timestamp?.toMillis ? message.timestamp.toMillis() : Date.now();

    messageElement.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${escapeHtml(message.author)}</span>
                <span class="message-time">${formatTimestamp(timestamp)}</span>
            </div>
            <div class="message-text">${escapeHtml(message.text)}</div>
        </div>
    `;

    return messageElement;
}

// Decline friend request function
async function declineFriendRequest(notificationId) {
    try {
        if (isDemoMode) {
            showNotification('Friend request declined (demo mode)', 'info');
            return;
        }

        // Mark notification as read
        await db.collection('notifications').doc(notificationId).update({
            read: true
        });

        showNotification('Friend request declined', 'info');
        loadNotifications();

    } catch (error) {
        console.error('Decline friend request error:', error);
        showNotification('Failed to decline friend request', 'error');
    }
}

// Initialize the app with new features
async function initializeApp() {
    try {
        if (currentUser) {
            // Load all the new features
            await Promise.all([
                loadFriends(),
                loadNotifications(),
                loadGroupChats()
            ]);

            // Set up real-time listeners
            setupRealTimeStatusUpdates();

            // Update notification badge
            updateNotificationBadge();

            console.log('✅ App initialized with all features');
        }
    } catch (error) {
        console.error('Initialize app error:', error);
    }
}

// This will be handled by the enhanced version below
document.addEventListener('DOMContentLoaded', function () {
    // Make sure the servers tab is active by default
    setTimeout(() => {
        try {
            // Show servers tab by default
            const serversTab = document.querySelector('[data-tab="servers"]');
            const serversContent = document.getElementById('servers-tab');

            if (serversTab && serversContent) {
                // Remove active from all tabs
                document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
                document.querySelectorAll('.sidebar-tab-content').forEach(content => {
                    content.classList.remove('active');
                    content.style.display = 'none';
                });

                // Activate servers tab
                serversTab.classList.add('active');
                serversContent.classList.add('active');
                serversContent.style.display = 'flex';

                console.log('✅ Servers tab activated by default');
            }
        } catch (error) {
            console.error('Tab initialization error:', error);
        }
    }, 500);
});

// Ensure tab functions are globally available
window.showServersTab = function () {
    console.log('Switching to servers tab');
    switchSidebarTab('servers');
    loadUserServers();
};

window.showDMsTab = function () {
    console.log('Switching to DMs tab');
    switchSidebarTab('dms');
    updateDMsList();
};

window.showFriendsTab = function () {
    console.log('Switching to friends tab');
    switchSidebarTab('friends');
    loadFriends();
};

window.showGroupsTab = function () {
    console.log('Switching to groups tab');
    switchSidebarTab('groups');
    loadGroupChats();
};
function debugTabs() {
    console.log('=== TAB DEBUG INFO ===');
    console.log('Nav tabs found:', document.querySelectorAll('.nav-tab').length);
    console.log('Tab contents found:', document.querySelectorAll('.sidebar-tab-content').length);

    document.querySelectorAll('.nav-tab').forEach((tab, index) => {
        console.log(`Tab ${index}:`, tab.dataset.tab, 'Active:', tab.classList.contains('active'));
    });

    document.querySelectorAll('.sidebar-tab-content').forEach((content, index) => {
        console.log(`Content ${index}:`, content.id, 'Active:', content.classList.contains('active'), 'Display:', content.style.display);
    });

    console.log('Current user servers:', userServers.length);
    console.log('=== END DEBUG ===');
}

// Make debug function globally available
window.debugTabs = debugTabs;

// Force tab initialization after a delay
setTimeout(() => {
    try {
        console.log('🔧 Force initializing tabs...');

        // Ensure servers tab is active
        const serversTab = document.querySelector('[data-tab="servers"]');
        const serversContent = document.getElementById('servers-tab');

        if (serversTab && serversContent) {
            // Clear all active states
            document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.sidebar-tab-content').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });

            // Activate servers tab
            serversTab.classList.add('active');
            serversContent.classList.add('active');
            serversContent.style.display = 'flex';

            console.log('✅ Servers tab force-activated');

            // Load servers if user is logged in
            if (currentUser) {
                loadUserServers();
            }
        } else {
            console.error('❌ Could not find servers tab elements');
        }
    } catch (error) {
        console.error('❌ Force tab initialization error:', error);
    }
}, 2000);
function initializeTabs() {
    try {
        console.log('🚀 Initializing tabs system...');

        // Add click event listeners to all nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            const tabName = tab.dataset.tab;
            if (tabName) {
                tab.addEventListener('click', function (e) {
                    e.preventDefault();
                    console.log(`Tab clicked: ${tabName}`);

                    // Switch to the clicked tab
                    switchSidebarTab(tabName);

                    // Load appropriate content
                    switch (tabName) {
                        case 'servers':
                            loadUserServers();
                            break;
                        case 'dms':
                            updateDMsList();
                            break;
                        case 'friends':
                            loadFriends();
                            break;
                        case 'groups':
                            loadGroupChats();
                            break;
                    }
                });

                console.log(`✅ Event listener added to ${tabName} tab`);
            }
        });

        // Initialize servers tab as default
        setTimeout(() => {
            switchSidebarTab('servers');
            if (currentUser) {
                loadUserServers();
            }
        }, 100);

        console.log('✅ Tabs system initialized successfully');

    } catch (error) {
        console.error('❌ Tab initialization error:', error);
    }
}

// Enhanced switch function with better error handling
function switchSidebarTab(tabName) {
    try {
        console.log(`🔄 Switching to tab: ${tabName}`);

        // Remove active class from all tabs
        const allTabs = document.querySelectorAll('.nav-tab');
        const allContents = document.querySelectorAll('.sidebar-tab-content');

        console.log(`Found ${allTabs.length} tabs and ${allContents.length} content areas`);

        allTabs.forEach(tab => {
            tab.classList.remove('active');
        });

        allContents.forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });

        // Activate the selected tab
        const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
        const targetContent = document.getElementById(`${tabName}-tab`);

        if (targetTab && targetContent) {
            targetTab.classList.add('active');
            targetContent.classList.add('active');
            targetContent.style.display = 'flex';

            console.log(`✅ Successfully switched to ${tabName} tab`);
        } else {
            console.error(`❌ Could not find elements for tab: ${tabName}`);
            console.log('Available tabs:', Array.from(document.querySelectorAll('.nav-tab')).map(t => t.dataset.tab));
            console.log('Available contents:', Array.from(document.querySelectorAll('.sidebar-tab-content')).map(c => c.id));
        }

    } catch (error) {
        console.error(`❌ Error switching to tab ${tabName}:`, error);
    }
}

// Override the original functions to use the enhanced version
window.showServersTab = function () {
    console.log('🖥️ Showing servers tab');
    switchSidebarTab('servers');
    if (currentUser) loadUserServers();
};

window.showDMsTab = function () {
    console.log('💬 Showing DMs tab');
    switchSidebarTab('dms');
    updateDMsList();
};

window.showFriendsTab = function () {
    console.log('👥 Showing friends tab');
    switchSidebarTab('friends');
    loadFriends();
};

window.showGroupsTab = function () {
    console.log('👨‍👩‍👧‍👦 Showing groups tab');
    switchSidebarTab('groups');
    loadGroupChats();
};

// Initialize tabs when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTabs);
} else {
    initializeTabs();
}

// Also initialize when main interface is shown
const originalShowMainInterface = showMainInterface;
showMainInterface = async function () {
    try {
        await originalShowMainInterface.call(this);

        // Initialize tabs after main interface is shown
        setTimeout(() => {
            initializeTabs();
        }, 500);

    } catch (error) {
        console.error('Enhanced showMainInterface error:', error);
    }
};

// Add a manual refresh function for servers
window.refreshServers = function () {
    console.log('🔄 Manually refreshing servers...');
    if (currentUser) {
        loadUserServers().then(() => {
            console.log('✅ Servers refreshed');
        }).catch(error => {
            console.error('❌ Error refreshing servers:', error);
        });
    } else {
        console.log('❌ No current user, cannot refresh servers');
    }
};

// Add console commands for debugging
window.stellarDebug = {
    tabs: debugTabs,
    refresh: refreshServers,
    switchTab: switchSidebarTab,
    user: () => console.log('Current user:', currentUser),
    servers: () => console.log('User servers:', userServers)
};//
console.log('🚀 StellarChat Enhanced Tab System Loading...');

// Ensure tabs work immediately when page loads
document.addEventListener('DOMContentLoaded', function () {
    console.log('📱 DOM Content Loaded - Initializing tabs...');

    setTimeout(() => {
        try {
            // Test if elements exist
            const navTabs = document.querySelectorAll('.nav-tab');
            const tabContents = document.querySelectorAll('.sidebar-tab-content');

            console.log(`Found ${navTabs.length} navigation tabs`);
            console.log(`Found ${tabContents.length} tab content areas`);

            if (navTabs.length > 0 && tabContents.length > 0) {
                // Force activate servers tab
                navTabs.forEach(tab => tab.classList.remove('active'));
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    content.style.display = 'none';
                });

                const serversTab = document.querySelector('[data-tab="servers"]');
                const serversContent = document.getElementById('servers-tab');

                if (serversTab && serversContent) {
                    serversTab.classList.add('active');
                    serversContent.classList.add('active');
                    serversContent.style.display = 'flex';

                    console.log('✅ Servers tab activated successfully');

                    // Load servers if user is logged in
                    if (currentUser) {
                        console.log('👤 User found, loading servers...');
                        loadUserServers();
                    }
                } else {
                    console.error('❌ Could not find servers tab elements');
                }
            } else {
                console.error('❌ Tab elements not found');
            }
        } catch (error) {
            console.error('❌ Tab initialization error:', error);
        }
    }, 1000);
});

// Test function to manually check tabs
window.testTabs = function () {
    console.log('🧪 Testing tab system...');

    const tabs = ['servers', 'dms', 'friends', 'groups'];

    tabs.forEach(tabName => {
        const tab = document.querySelector(`[data-tab="${tabName}"]`);
        const content = document.getElementById(`${tabName}-tab`);

        console.log(`${tabName}: Tab=${!!tab}, Content=${!!content}`);

        if (tab) {
            console.log(`  - Tab classes: ${tab.className}`);
        }
        if (content) {
            console.log(`  - Content classes: ${content.className}`);
            console.log(`  - Content display: ${content.style.display}`);
        }
    });

    console.log('Current user:', currentUser?.username || 'Not logged in');
    console.log('User servers:', userServers.length);
};

console.log('✅ Enhanced tab system loaded. Use testTabs() to debug.');// Enhance
function setupMessageInputHandlers() {
    try {
        console.log('🎯 Setting up message input handlers...');

        const messageInput = document.getElementById('message-input');
        if (!messageInput) {
            console.error('❌ Message input not found');
            return;
        }

        // Remove any existing event listeners to prevent duplicates
        messageInput.removeEventListener('keypress', handleMessageInput);

        // Add the keypress event listener
        messageInput.addEventListener('keypress', handleMessageInput);

        // Add input event listener to update placeholder based on current chat
        messageInput.addEventListener('focus', updateMessagePlaceholder);

        console.log('✅ Message input handlers set up successfully');

    } catch (error) {
        console.error('❌ Setup message input handlers error:', error);
    }
}

function updateMessagePlaceholder() {
    try {
        const messageInput = document.getElementById('message-input');
        if (!messageInput) return;

        let placeholder = 'Type a message...';

        if (currentChatType === 'server' && currentServer) {
            const serverName = userServers.find(s => s.id === currentServer)?.name || 'Server';
            placeholder = `Message #${currentChannel} in ${serverName}`;
        } else if (currentChatType === 'dm' && currentDMUser) {
            placeholder = `Message @${currentDMUser.username}`;
        } else if (currentChatType === 'group' && currentServer) {
            const groupName = groupChats.find(g => g.id === currentServer)?.name || 'Group';
            placeholder = `Message ${groupName}`;
        } else if (currentChatType === 'none') {
            placeholder = 'Join a server or start a DM to send messages';
        }

        messageInput.placeholder = placeholder;

    } catch (error) {
        console.error('Update message placeholder error:', error);
    }
}

// Enhanced message input handler with better debugging
function handleMessageInput(event) {
    try {
        console.log('⌨️ Key pressed:', event.key, 'Chat type:', currentChatType);

        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            console.log('📤 Enter pressed, sending message...');
            sendMessage();
        }
    } catch (error) {
        console.error('❌ Handle message input error:', error);
    }
}

// Initialize message handlers when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    console.log('📱 DOM loaded, setting up message handlers...');
    setTimeout(setupMessageInputHandlers, 1000);
});

// Also set up handlers when main interface is shown
const originalShowMainInterfaceForMessages = showMainInterface;
showMainInterface = async function () {
    try {
        await originalShowMainInterfaceForMessages.call(this);

        // Set up message handlers after interface is shown
        setTimeout(() => {
            setupMessageInputHandlers();
            updateMessagePlaceholder();
        }, 500);

    } catch (error) {
        console.error('Enhanced showMainInterface for messages error:', error);
    }
};

// Debug function to test message sending
window.testMessageSending = function () {
    console.log('🧪 Testing message sending...');
    console.log('Current user:', currentUser?.username || 'Not logged in');
    console.log('Current chat type:', currentChatType);
    console.log('Current server:', currentServer);
    console.log('Current DM user:', currentDMUser?.username || 'None');
    console.log('Is sending message:', isSendingMessage);

    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        console.log('Message input found, value:', messageInput.value);
        console.log('Message input placeholder:', messageInput.placeholder);
    } else {
        console.error('❌ Message input not found');
    }

    // Test sending a message
    if (messageInput && !messageInput.value.trim()) {
        messageInput.value = 'Test message from debug function';
        console.log('📝 Added test message, now sending...');
        sendMessage();
    }
};

// Add to debug object
window.stellarDebug = window.stellarDebug || {};
window.stellarDebug.testMessage = testMessageSending;
window.stellarDebug.setupHandlers = setupMessageInputHandlers;
window.stellarDebug.updatePlaceholder = updateMessagePlaceholder;

console.log('✅ Enhanced message handling system loaded');// Com
window.stellarDebug = window.stellarDebug || {};

// Test server messaging
window.stellarDebug.testServerMessaging = function () {
    console.log('🧪 Testing Server Messaging...');
    console.log('Current user:', currentUser?.username || 'Not logged in');
    console.log('Current chat type:', currentChatType);
    console.log('Current server:', currentServer);
    console.log('Current channel:', currentChannel);
    console.log('Is demo mode:', isDemoMode);
    console.log('Is sending message:', isSendingMessage);

    if (currentChatType === 'server' && currentServer) {
        console.log('✅ Server context looks good');

        // Test the database path
        const testPath = `servers/${currentServer}/channels/${currentChannel}/messages`;
        console.log('📍 Database path:', testPath);

        // Try to send a test message
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            const originalValue = messageInput.value;
            messageInput.value = 'Test server message from debug';
            console.log('📝 Sending test message...');
            sendMessage().then(() => {
                console.log('✅ Test message sent successfully');
                messageInput.value = originalValue;
            }).catch(error => {
                console.error('❌ Test message failed:', error);
                messageInput.value = originalValue;
            });
        }
    } else {
        console.log('❌ Not in server context');
        console.log('To test: Join a server first, then run this function');
    }
};

// Test Firebase Storage
window.stellarDebug.testFirebaseStorage = function () {
    console.log('🧪 Testing Firebase Storage...');
    console.log('Firebase object:', typeof firebase);
    console.log('Firebase storage:', typeof firebase?.storage);

    if (firebase && firebase.storage) {
        try {
            const storageRef = firebase.storage().ref();
            console.log('✅ Firebase Storage initialized successfully');
            console.log('Storage reference:', storageRef);

            // Test creating a reference
            const testRef = storageRef.child('test/test.txt');
            console.log('✅ Can create storage references');

        } catch (error) {
            console.error('❌ Firebase Storage error:', error);
        }
    } else {
        console.error('❌ Firebase Storage not available');
        console.log('Check if Firebase Storage SDK is loaded');
    }
};

// Test message loading
window.stellarDebug.testMessageLoading = function () {
    console.log('🧪 Testing Message Loading...');

    if (currentChatType === 'server' && currentServer) {
        const messagesPath = `servers/${currentServer}/channels/${currentChannel}/messages`;
        console.log('📍 Loading messages from:', messagesPath);

        if (!isDemoMode && db) {
            db.collection('servers')
                .doc(currentServer)
                .collection('channels')
                .doc(currentChannel)
                .collection('messages')
                .orderBy('timestamp', 'desc')
                .limit(5)
                .get()
                .then(snapshot => {
                    console.log('📨 Found', snapshot.size, 'messages');
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        console.log('Message:', data.text, 'by', data.author);
                    });
                })
                .catch(error => {
                    console.error('❌ Error loading messages:', error);
                });
        }
    } else {
        console.log('❌ Not in server context for message loading test');
    }
};

// Fix server messaging by ensuring proper initialization
window.stellarDebug.fixServerMessaging = function () {
    console.log('🔧 Attempting to fix server messaging...');

    // Ensure we're in server context
    if (currentChatType !== 'server') {
        console.log('⚠️ Not in server - switching to server context');
        currentChatType = 'server';
    }

    // Ensure we have a server selected
    if (!currentServer && userServers.length > 0) {
        currentServer = userServers[0].id;
        console.log('🖥️ Selected server:', currentServer);
    }

    // Ensure we have a channel
    if (!currentChannel) {
        currentChannel = 'general';
        console.log('📺 Set channel to:', currentChannel);
    }

    // Update UI
    updateMessagePlaceholder();

    // Try to load messages
    loadMessages();

    console.log('✅ Server messaging context fixed');
    console.log('Current state:', {
        chatType: currentChatType,
        server: currentServer,
        channel: currentChannel
    });
};

// Add to existing debug object
window.stellarDebug.serverMsg = window.stellarDebug.testServerMessaging;
window.stellarDebug.storage = window.stellarDebug.testFirebaseStorage;
window.stellarDebug.messages = window.stellarDebug.testMessageLoading;
window.stellarDebug.fix = window.stellarDebug.fixServerMessaging;

console.log('🔧 Debug functions loaded:');
console.log('- stellarDebug.serverMsg() - Test server messaging');
console.log('- stellarDebug.storage() - Test Firebase Storage');
console.log('- stellarDebug.messages() - Test message loading');
console.log('- stellarDebug.fix() - Fix server messaging context');

// Auto-fix common issues on load
setTimeout(() => {
    if (currentUser && currentChatType === 'none' && userServers.length > 0) {
        console.log('🔧 Auto-fixing server context...');
        window.stellarDebug.fixServerMessaging();
    }
}, 3000);
let isElectronApp = false;

// Check if running in Electron
if (typeof window !== 'undefined' && window.electronAPI) {
    isElectronApp = true;
    console.log('🖥️ Running in Electron app');
}

// Auto-login functions
async function saveUserSession(user) {
    try {
        if (!isElectronApp) {
            // Fallback to localStorage for web version
            localStorage.setItem('stellarchat-session', JSON.stringify({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                username: user.username,
                timestamp: Date.now()
            }));
            return;
        }

        // Use Electron secure storage
        const sessionData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            username: user.username,
            timestamp: Date.now()
        };

        const result = await window.electronAPI.storeUserData(sessionData);
        if (result.success) {
            console.log('✅ User session saved securely');
        } else {
            console.error('❌ Failed to save user session:', result.error);
        }
    } catch (error) {
        console.error('Save user session error:', error);
    }
}

async function loadUserSession() {
    try {
        if (!isElectronApp) {
            // Fallback to localStorage for web version
            const sessionData = localStorage.getItem('stellarchat-session');
            if (sessionData) {
                const parsed = JSON.parse(sessionData);
                // Check if session is less than 30 days old
                if (Date.now() - parsed.timestamp < 30 * 24 * 60 * 60 * 1000) {
                    return parsed;
                } else {
                    localStorage.removeItem('stellarchat-session');
                }
            }
            return null;
        }

        // Use Electron secure storage
        const result = await window.electronAPI.getUserData();
        if (result.success && result.data) {
            const sessionData = result.data;
            // Check if session is less than 30 days old
            if (Date.now() - sessionData.timestamp < 30 * 24 * 60 * 60 * 1000) {
                console.log('✅ Loaded user session from secure storage');
                return sessionData;
            } else {
                // Session expired, clear it
                await clearUserSession();
                console.log('🕐 User session expired, cleared');
            }
        }
        return null;
    } catch (error) {
        console.error('Load user session error:', error);
        return null;
    }
}

async function clearUserSession() {
    try {
        if (!isElectronApp) {
            localStorage.removeItem('stellarchat-session');
            return;
        }

        const result = await window.electronAPI.clearUserData();
        if (result.success) {
            console.log('✅ User session cleared');
        }
    } catch (error) {
        console.error('Clear user session error:', error);
    }
}

// Enhanced authentication with auto-login
async function initializeAuth() {
    try {
        console.log('🔐 Initializing authentication...');

        // Try to load saved session first
        const savedSession = await loadUserSession();

        if (savedSession && !isDemoMode) {
            console.log('🔄 Attempting auto-login for:', savedSession.username);

            // Set current user from saved session
            currentUser = savedSession;

            // Try to verify the session is still valid
            try {
                if (auth && auth.currentUser) {
                    // User is still authenticated with Firebase
                    console.log('✅ Firebase auth still valid');
                    await showMainInterface();
                    return;
                } else {
                    // Try silent sign-in
                    console.log('🔄 Attempting silent Firebase auth...');
                    // Firebase will automatically restore auth state if valid
                }
            } catch (error) {
                console.log('⚠️ Firebase auth verification failed:', error);
            }
        }

        // Set up Firebase auth state listener
        if (auth) {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    console.log('🔐 Firebase auth state changed - user signed in');

                    // Get user data from Firestore
                    try {
                        const userDoc = await db.collection('users').doc(user.uid).get();
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            currentUser = {
                                uid: user.uid,
                                email: user.email,
                                displayName: user.displayName,
                                photoURL: user.photoURL,
                                username: userData.username
                            };

                            // Save session for auto-login
                            await saveUserSession(currentUser);

                            // Show main interface
                            await showMainInterface();
                        } else {
                            // User exists in auth but not in Firestore, show username setup
                            showUsernameSetup(user);
                        }
                    } catch (error) {
                        console.error('Error loading user data:', error);
                        showAuthInterface();
                    }
                } else {
                    console.log('🔐 Firebase auth state changed - user signed out');
                    currentUser = null;
                    showAuthInterface();
                }
            });
        }

        console.log('✅ Authentication initialized');

    } catch (error) {
        console.error('Initialize auth error:', error);
        showAuthInterface();
    }
}

// Enhanced logout with session clearing
const originalLogout = logout;
logout = async function () {
    try {
        // Clear saved session
        await clearUserSession();

        // Call original logout
        await originalLogout.call(this);

        console.log('✅ Logout complete with session cleared');
    } catch (error) {
        console.error('Enhanced logout error:', error);
        // Fallback to original logout
        originalLogout.call(this);
    }
};

// Enhanced complete setup with session saving
const originalCompleteSetup = completeSetup;
completeSetup = async function () {
    try {
        await originalCompleteSetup.call(this);

        // Save session after successful setup
        if (currentUser) {
            await saveUserSession(currentUser);
        }
    } catch (error) {
        console.error('Enhanced complete setup error:', error);
    }
};

// Initialize auth when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Small delay to ensure Firebase is initialized
    setTimeout(initializeAuth, 1000);
});

// Add session management to debug tools
window.stellarDebug = window.stellarDebug || {};
window.stellarDebug.session = {
    save: () => saveUserSession(currentUser),
    load: loadUserSession,
    clear: clearUserSession,
    check: async () => {
        const session = await loadUserSession();
        console.log('Current session:', session);
        return session;
    }
};

console.log('✅ Auto-login system loaded');// M

// Mobile navigation functions removed - Desktop-only version
function removedMobileFunction() {
    // All mobile functions removed in v1.1.0 for desktop optimization
    console.log('Mobile functions removed - Desktop-only version');
    const mobileNav = document.createElement('div');
    mobileNav.className = 'mobile-nav';
    mobileNav.innerHTML = `
            <div class="mobile-nav-buttons">
                <button class="mobile-nav-btn active" data-tab="servers">
                    <i class="fas fa-server"></i>
                    <span>Servers</span>
                </button>
                <button class="mobile-nav-btn" data-tab="dms">
                    <i class="fas fa-comments"></i>
                    <span>DMs</span>
                </button>
                <button class="mobile-nav-btn" data-tab="friends">
                    <i class="fas fa-users"></i>
                    <span>Friends</span>
                </button>
                <button class="mobile-nav-btn" data-tab="groups">
                    <i class="fas fa-user-friends"></i>
                    <span>Groups</span>
                </button>
                <button class="mobile-nav-btn" id="mobile-menu-btn">
                    <i class="fas fa-bars"></i>
                    <span>Menu</span>
                </button>
            </div>
        `;
    document.body.appendChild(mobileNav);
}

// Add mobile sidebar overlay
if (!document.querySelector('.mobile-sidebar-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'mobile-sidebar-overlay';
    overlay.innerHTML = `
            <div class="mobile-sidebar">
                <div class="mobile-sidebar-header">
                    <h3>StellarChat</h3>
                    <button class="mobile-close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="mobile-sidebar-content">
                    <!-- Sidebar content will be populated here -->
                </div>
            </div>
        `;
    document.body.appendChild(overlay);
}

function setupMobileNavigation() {
    // Mobile nav button handlers
    document.querySelectorAll('.mobile-nav-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            switchMobileTab(tab);

            // Update active state
            document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });

    // Mobile menu button
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', toggleMobileSidebar);
    }

    // Mobile sidebar close
    const closeBtn = document.querySelector('.mobile-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeMobileSidebar);
    }

    // Overlay click to close
    const overlay = document.querySelector('.mobile-sidebar-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeMobileSidebar();
            }
        });
    }
}

function switchMobileTab(tab) {
    // Hide all tab content first
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });

    // Show selected tab content
    const tabContent = document.getElementById(`${tab}-tab`);
    if (tabContent) {
        tabContent.style.display = 'block';
    }

    // Update main content based on tab
    switch (tab) {
        case 'servers':
            showServersView();
            break;
        case 'dms':
            showDMsView();
            break;
        case 'friends':
            showFriendsView();
            break;
        case 'groups':
            showGroupsView();
            break;
    }
}

function showServersView() {
    const mainContent = document.querySelector('.main-content');
    if (currentServer && currentChannel) {
        // Show current channel
        loadMessages(currentServer, currentChannel);
    } else {
        // Show server selection
        mainContent.innerHTML = `
            <div class="mobile-welcome">
                <h2>Select a Server</h2>
                <p>Choose a server from the menu to start chatting</p>
                <button onclick="toggleMobileSidebar()" class="btn-primary">
                    <i class="fas fa-server"></i> Browse Servers
                </button>
            </div>
        `;
    }
}

function showDMsView() {
    const mainContent = document.querySelector('.main-content');
    if (currentDM) {
        loadDMMessages(currentDM);
    } else {
        mainContent.innerHTML = `
            <div class="mobile-welcome">
                <h2>Direct Messages</h2>
                <p>Start a conversation with your friends</p>
                <button onclick="toggleMobileSidebar()" class="btn-primary">
                    <i class="fas fa-comments"></i> View DMs
                </button>
            </div>
        `;
    }
}

function showFriendsView() {
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = `
        <div class="mobile-welcome">
            <h2>Friends</h2>
            <p>Manage your friends and send requests</p>
            <div class="mobile-friends-actions">
                <button onclick="addFriend()" class="btn-primary">
                    <i class="fas fa-user-plus"></i> Add Friend
                </button>
                <button onclick="toggleMobileSidebar()" class="btn-secondary">
                    <i class="fas fa-users"></i> View Friends
                </button>
            </div>
        </div>
    `;
}

function showGroupsView() {
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = `
        <div class="mobile-welcome">
            <h2>Groups</h2>
            <p>Create and manage group chats</p>
            <div class="mobile-groups-actions">
                <button onclick="createGroup()" class="btn-primary">
                    <i class="fas fa-plus"></i> Create Group
                </button>
                <button onclick="toggleMobileSidebar()" class="btn-secondary">
                    <i class="fas fa-user-friends"></i> View Groups
                </button>
            </div>
        </div>
    `;
}

function toggleMobileSidebar() {
    const overlay = document.querySelector('.mobile-sidebar-overlay');
    const sidebar = document.querySelector('.mobile-sidebar');

    if (overlay && sidebar) {
        overlay.classList.toggle('active');
        sidebar.classList.toggle('open');

        // Populate sidebar content
        if (sidebar.classList.contains('open')) {
            populateMobileSidebar();
        }
    }
}

function closeMobileSidebar() {
    const overlay = document.querySelector('.mobile-sidebar-overlay');
    const sidebar = document.querySelector('.mobile-sidebar');

    if (overlay && sidebar) {
        overlay.classList.remove('active');
        sidebar.classList.remove('open');
    }
}

function populateMobileSidebar() {
    const sidebarContent = document.querySelector('.mobile-sidebar-content');
    if (!sidebarContent) return;

    // Copy current sidebar content to mobile sidebar
    const desktopSidebar = document.querySelector('.sidebar');
    if (desktopSidebar) {
        sidebarContent.innerHTML = desktopSidebar.innerHTML;
    }
}

// Initialize mobile navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if mobile
    if (window.innerWidth <= 768) {
        initializeMobileNavigation();
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
        print("cat");
    }
});

// Add mobile-specific styles for welcome screens
const mobileWelcomeStyles = `
<style>
.mobile-welcome {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: 40px 20px;
}

.mobile-welcome h2 {
    font-size: 1.5rem;
    margin-bottom: 10px;
    color: #667eea;
}

.mobile-welcome p {
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 30px;
    font-size: 0.9rem;
}

.mobile-friends-actions,
.mobile-groups-actions {
    display: flex;
    flex-direction: column;
    gap: 15px;
    width: 100%;
    max-width: 200px;
}

.mobile-friends-actions button,
.mobile-groups-actions button {
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: 500;
}
</style>
`;

// Add mobile styles to head
if (!document.querySelector('#mobile-welcome-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'mobile-welcome-styles';
    styleElement.innerHTML = mobileWelcomeStyles;
    document.head.appendChild(styleElement);
}// M

// Mobile GUI functions removed - Desktop-only version

// Mobile header function removed - Desktop-only version

function createMobileNavigation() {
    // Remove existing mobile nav
    const existingNav = document.querySelector('.mobile-nav');
    if (existingNav) existingNav.remove();

    const nav = document.createElement('div');
    nav.className = 'mobile-nav';
    nav.innerHTML = `
        <button class="mobile-nav-btn active" data-tab="chat">
            <i class="fas fa-comments"></i>
            <span>Chat</span>
        </button>
        <button class="mobile-nav-btn" data-tab="servers">
            <i class="fas fa-server"></i>
            <span>Servers</span>
        </button>
        <button class="mobile-nav-btn" data-tab="friends">
            <i class="fas fa-users"></i>
            <span>Friends</span>
        </button>
        <button class="mobile-nav-btn" data-tab="profile">
            <i class="fas fa-user"></i>
            <span>Profile</span>
        </button>
    `;

    document.body.appendChild(nav);
}

function createMobileSidebar() {
    // Remove existing sidebar overlay
    const existingOverlay = document.querySelector('.mobile-sidebar-overlay');
    if (existingOverlay) existingOverlay.remove();

    const overlay = document.createElement('div');
    overlay.className = 'mobile-sidebar-overlay';
    overlay.innerHTML = `
        <div class="mobile-sidebar">
            <div class="mobile-sidebar-header">
                <h3>Menu</h3>
                <button class="mobile-close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="mobile-sidebar-content">
                <div class="mobile-menu-section">
                    <h4>Servers</h4>
                    <div id="mobile-servers-list">
                        <div class="mobile-menu-item">
                            <i class="fas fa-plus"></i>
                            <span>Join Server</span>
                        </div>
                    </div>
                </div>
                <div class="mobile-menu-section">
                    <h4>Direct Messages</h4>
                    <div id="mobile-dms-list">
                        <div class="mobile-menu-item">
                            <i class="fas fa-plus"></i>
                            <span>New DM</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
}

function modifyMainContentForMobile() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    // Clear existing content
    mainContent.innerHTML = '';

    // Create mobile chat interface
    mainContent.innerHTML = `
        <div class="mobile-welcome">
            <h2>Welcome to StellarChat</h2>
            <p>Connect with friends across the galaxy</p>
            <button class="mobile-welcome-btn" onclick="showMobileServers()">
                <i class="fas fa-server"></i> Browse Servers
            </button>
            <button class="mobile-welcome-btn secondary" onclick="showMobileFriends()">
                <i class="fas fa-users"></i> Find Friends
            </button>
        </div>
    `;
}

function setupMobileEventListeners() {
    // Mobile menu button
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', toggleMobileSidebar);
    }

    // Mobile settings button
    const settingsBtn = document.getElementById('mobile-settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            showMobileSettings();
        });
    }

    // Mobile navigation tabs
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            switchMobileTab(tab);

            // Update active state
            document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });

    // Mobile sidebar close
    const closeBtn = document.querySelector('.mobile-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeMobileSidebar);
    }

    // Sidebar overlay click
    const overlay = document.querySelector('.mobile-sidebar-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeMobileSidebar();
            }
        });
    }
}

function switchMobileTab(tab) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    // Update mobile title
    const title = document.getElementById('mobile-title');

    switch (tab) {
        case 'chat':
            title.textContent = 'Chat';
            showMobileChat();
            break;
        case 'servers':
            title.textContent = 'Servers';
            showMobileServers();
            break;
        case 'friends':
            title.textContent = 'Friends';
            showMobileFriends();
            break;
        case 'profile':
            title.textContent = 'Profile';
            showMobileProfile();
            break;
    }
}

function showMobileChat() {
    const mainContent = document.querySelector('.main-content');
    if (currentServer && currentChannel) {
        // Show chat interface
        mainContent.innerHTML = `
            <div class="messages-container" id="messages-container">
                <!-- Messages will be loaded here -->
            </div>
            <div class="message-input-container">
                <textarea class="message-input" placeholder="Type a message..." id="mobile-message-input"></textarea>
                <button class="send-btn" onclick="sendMobileMessage()">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;
        loadMessages(currentServer, currentChannel);
    } else {
        mainContent.innerHTML = `
            <div class="mobile-welcome">
                <h2>No Chat Selected</h2>
                <p>Choose a server or start a DM to begin chatting</p>
                <button class="mobile-welcome-btn" onclick="toggleMobileSidebar()">
                    <i class="fas fa-server"></i> Browse Servers
                </button>
            </div>
        `;
    }
}

function showMobileServers() {
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = `
        <div class="mobile-welcome">
            <h2>Servers</h2>
            <p>Join servers to chat with communities</p>
            <button class="mobile-welcome-btn" onclick="joinServer()">
                <i class="fas fa-plus"></i> Join Server
            </button>
            <button class="mobile-welcome-btn secondary" onclick="createServer()">
                <i class="fas fa-server"></i> Create Server
            </button>
        </div>
    `;
}

function showMobileFriends() {
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = `
        <div class="mobile-welcome">
            <h2>Friends</h2>
            <p>Connect with friends and start conversations</p>
            <button class="mobile-welcome-btn" onclick="addFriend()">
                <i class="fas fa-user-plus"></i> Add Friend
            </button>
            <button class="mobile-welcome-btn secondary" onclick="loadNotifications()">
                <i class="fas fa-bell"></i> Friend Requests
            </button>
        </div>
    `;
}

function showMobileProfile() {
    const mainContent = document.querySelector('.main-content');
    const user = currentUser || { username: 'Guest', email: 'Not logged in' };
    mainContent.innerHTML = `
        <div class="mobile-welcome">
            <h2>Profile</h2>
            <div class="mobile-profile-info">
                <div class="mobile-avatar">
                    ${user.username ? user.username.charAt(0).toUpperCase() : 'G'}
                </div>
                <h3>${user.username || 'Guest'}</h3>
                <p>${user.email || 'Not logged in'}</p>
            </div>
            <button class="mobile-welcome-btn" onclick="showSettings()">
                <i class="fas fa-cog"></i> Settings
            </button>
            <button class="mobile-welcome-btn secondary" onclick="signOut()">
                <i class="fas fa-sign-out-alt"></i> Sign Out
            </button>
        </div>
    `;
}

function sendMobileMessage() {
    const input = document.getElementById('mobile-message-input');
    if (!input || !input.value.trim()) return;

    const message = input.value.trim();
    input.value = '';

    // Send message using existing function
    if (currentServer && currentChannel) {
        sendMessage(message);
    } else if (currentDM) {
        sendDMMessage(message);
    }
}

function showMobileSettings() {
    // Show settings modal optimized for mobile
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Settings</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <button class="mobile-welcome-btn" onclick="showNotificationSettings()">
                    <i class="fas fa-bell"></i> Notifications
                </button>
                <button class="mobile-welcome-btn" onclick="showThemeSettings()">
                    <i class="fas fa-palette"></i> Theme
                </button>
                <button class="mobile-welcome-btn" onclick="showAccountSettings()">
                    <i class="fas fa-user"></i> Account
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Desktop-only initialization - Mobile support removed for better performance
console.log('StellarChat v1.1.0 - Desktop Optimized (Mobile Support Removed)');

// Force desktop class and initialization
document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.classList.add('desktop-device');
    document.body.classList.add('desktop-device', 'desktop-optimized');
    console.log('Desktop layout initialized - Mobile support disabled');
});
//

// Particle System for Background Effects
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.canvas = null;
        this.ctx = null;
        this.init();
    }

    init() {
        // Create canvas for particles
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '-1';
        this.canvas.style.opacity = '0.6';
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this.resize();
        this.createParticles();
        this.animate();

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticles() {
        const particleCount = Math.min(50, Math.floor(window.innerWidth / 20));
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 1,
                opacity: Math.random() * 0.5 + 0.2,
                color: `hsl(${Math.random() * 60 + 220}, 70%, 60%)`
            });
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach(particle => {
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Wrap around edges
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;

            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fill();
        });

        requestAnimationFrame(() => this.animate());
    }
}

// Message Animation System
class MessageAnimator {
    static animateNewMessage(messageElement) {
        // Add stagger delay based on message position
        const messages = document.querySelectorAll('.message');
        const index = Array.from(messages).indexOf(messageElement);
        const delay = Math.min(index * 50, 500);

        messageElement.style.animationDelay = `${delay}ms`;
        messageElement.classList.add('message-enter');

        // Add typing sound effect
        setTimeout(() => {
            playMessageSound();
        }, delay);

        // Add sparkle effect
        this.addSparkleEffect(messageElement);
    }

    static addSparkleEffect(element) {
        const sparkles = document.createElement('div');
        sparkles.className = 'sparkle-container';
        sparkles.innerHTML = `
            <div class="sparkle" style="--delay: 0s; --x: 10%; --y: 20%;"></div>
            <div class="sparkle" style="--delay: 0.2s; --x: 80%; --y: 30%;"></div>
            <div class="sparkle" style="--delay: 0.4s; --x: 60%; --y: 70%;"></div>
        `;

        element.appendChild(sparkles);

        setTimeout(() => {
            if (sparkles.parentNode) {
                sparkles.parentNode.removeChild(sparkles);
            }
        }, 2000);
    }

    static animateTyping(username) {
        const messagesContainer = document.getElementById('messages-container');
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="typing-content">
                <span class="typing-user">${username} is typing</span>
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;

        messagesContainer.appendChild(typingIndicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        return typingIndicator;
    }

    static removeTyping(typingElement) {
        if (typingElement && typingElement.parentNode) {
            typingElement.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (typingElement.parentNode) {
                    typingElement.parentNode.removeChild(typingElement);
                }
            }, 300);
        }
    }
}

// Button Animation System
class ButtonAnimator {
    static addRippleEffect(button, event) {
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s ease-out;
            pointer-events: none;
        `;

        button.appendChild(ripple);

        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }

    static pulseButton(button) {
        button.style.animation = 'buttonPulse 0.3s ease-out';
        setTimeout(() => {
            button.style.animation = '';
        }, 300);
    }
}

// Notification Animation System
class NotificationAnimator {
    static showAnimatedNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `animated-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : 'info'}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-message">${message}</div>
                <div class="notification-progress"></div>
            </div>
            <button class="notification-close" onclick="this.parentNode.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'linear-gradient(45deg, #10b981, #059669)' :
                type === 'error' ? 'linear-gradient(45deg, #ef4444, #dc2626)' :
                    'linear-gradient(45deg, #667eea, #764ba2)'};
            color: white;
            padding: 16px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            max-width: 350px;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: notificationSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(10px);
        `;

        document.body.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'notificationSlideOut 0.3s ease-out forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, duration);

        return notification;
    }
}

// Loading Animation System
class LoadingAnimator {
    static showLoadingSpinner(container, message = 'Loading...') {
        const loader = document.createElement('div');
        loader.className = 'loading-container';
        loader.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-message">${message}</div>
        `;

        loader.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            z-index: 1000;
        `;

        container.appendChild(loader);
        return loader;
    }

    static showPulseLoader(container, message = 'Loading...') {
        const loader = document.createElement('div');
        loader.className = 'pulse-loader-container';
        loader.innerHTML = `
            <div class="pulse-loader">
                <div class="pulse-dot"></div>
                <div class="pulse-dot"></div>
                <div class="pulse-dot"></div>
            </div>
            <div class="loading-message">${message}</div>
        `;

        container.appendChild(loader);
        return loader;
    }

    static removeLoader(loader) {
        if (loader && loader.parentNode) {
            loader.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (loader.parentNode) {
                    loader.parentNode.removeChild(loader);
                }
            }, 300);
        }
    }
}

// Scroll Animation System
class ScrollAnimator {
    static smoothScrollToBottom(container) {
        const start = container.scrollTop;
        const end = container.scrollHeight - container.clientHeight;
        const distance = end - start;
        const duration = Math.min(Math.abs(distance) * 0.5, 500);

        let startTime = null;

        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);

            // Easing function
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);

            container.scrollTop = start + distance * easeOutCubic;

            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        }

        requestAnimationFrame(animation);
    }

    static animateScrollIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'scroll-indicator';
        indicator.innerHTML = '<i class="fas fa-chevron-down"></i>';
        indicator.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 30px;
            width: 40px;
            height: 40px;
            background: linear-gradient(45deg, #667eea, #764ba2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            cursor: pointer;
            z-index: 1000;
            animation: scrollBounce 2s ease-in-out infinite;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        `;

        document.body.appendChild(indicator);

        indicator.addEventListener('click', () => {
            const messagesContainer = document.getElementById('messages-container');
            this.smoothScrollToBottom(messagesContainer);
            indicator.remove();
        });

        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 5000);
    }
}

// Theme Animation System
class ThemeAnimator {
    static animateThemeChange(newTheme) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${newTheme === 'light' ? '#ffffff' : '#0a0a0f'};
            z-index: 9999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        `;

        document.body.appendChild(overlay);

        // Fade in overlay
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);

        // Change theme
        setTimeout(() => {
            document.body.className = newTheme === 'light' ? 'light-theme' : '';
        }, 150);

        // Fade out overlay
        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        }, 300);
    }
}

// Initialize Animation Systems
let particleSystem;
let animationInitialized = false;

function initializeAnimations() {
    if (animationInitialized) return;
    animationInitialized = true;

    // Initialize particle system (desktop-only)
    particleSystem = new ParticleSystem();

    // Add CSS animations
    const animationStyles = document.createElement('style');
    animationStyles.textContent = `
        @keyframes ripple {
            to {
                transform: scale(2);
                opacity: 0;
            }
        }
        
        @keyframes buttonPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        @keyframes notificationSlideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes notificationSlideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        @keyframes scrollBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        .sparkle-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: hidden;
        }
        
        .sparkle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: linear-gradient(45deg, #fff, #667eea);
            border-radius: 50%;
            animation: sparkleFloat 2s ease-out forwards;
            animation-delay: var(--delay);
            left: var(--x);
            top: var(--y);
        }
        
        @keyframes sparkleFloat {
            0% {
                opacity: 0;
                transform: scale(0) translateY(0);
            }
            50% {
                opacity: 1;
                transform: scale(1) translateY(-20px);
            }
            100% {
                opacity: 0;
                transform: scale(0) translateY(-40px);
            }
        }
        
        .message-enter {
            animation: messageEnter 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        
        @keyframes messageEnter {
            from {
                opacity: 0;
                transform: translateY(20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        .animated-notification {
            animation: notificationSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .notification-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: rgba(255, 255, 255, 0.3);
            animation: progressBar 3s linear forwards;
        }
        
        @keyframes progressBar {
            from { width: 100%; }
            to { width: 0%; }
        }
    `;
    document.head.appendChild(animationStyles);

    // Add event listeners for button animations
    document.addEventListener('click', (e) => {
        const button = e.target.closest('button, .auth-btn, .modal-btn, .control-btn');
        if (button && !button.classList.contains('no-ripple')) {
            ButtonAnimator.addRippleEffect(button, e);
        }
    });



    console.log('🎨 Animation systems initialized!');
}

// Enhanced message sending with animations
function sendMessageWithAnimation() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();

    if (!message || isSendingMessage) return;

    // Add sending animation to input
    input.classList.add('sending');
    input.disabled = true;

    // Show typing indicator briefly
    const typingIndicator = MessageAnimator.animateTyping(currentUser?.username || 'You');

    // Send message
    sendMessage().then(() => {
        // Remove typing indicator
        MessageAnimator.removeTyping(typingIndicator);

        // Reset input
        input.classList.remove('sending');
        input.disabled = false;
        input.focus();

        // Show success animation
        ButtonAnimator.pulseButton(document.querySelector('.input-btn[onclick="sendMessage()"]'));
    }).catch(() => {
        // Remove typing indicator
        MessageAnimator.removeTyping(typingIndicator);

        // Reset input
        input.classList.remove('sending');
        input.disabled = false;

        // Show error animation
        input.style.animation = 'shake 0.5s ease-out';
        setTimeout(() => {
            input.style.animation = '';
        }, 500);
    });
}

// Enhanced notification system
function showAnimatedNotification(message, type = 'info', duration = 3000) {
    return NotificationAnimator.showAnimatedNotification(message, type, duration);
}

// Initialize animations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeAnimations, 100);
});

// Initialize animations if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeAnimations, 100);
    });
} else {
    setTimeout(initializeAnimations, 100);
}

// Add shake animation for errors
const shakeKeyframes = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}
`;

// Add the shake animation to the document
const shakeStyle = document.createElement('style');
shakeStyle.textContent = shakeKeyframes;
document.head.appendChild(shakeStyle);

console.log('🚀 Stellar Chat Enhanced Animations Loaded!');

// Magical Cursor Trail System
class CursorTrail {
    constructor() {
        this.trails = [];
        this.maxTrails = 15;
        this.init();
    }

    init() {
        // Desktop-only cursor trail
        document.addEventListener('mousemove', (e) => {
            this.createTrail(e.clientX, e.clientY);
        });

        // Clean up old trails
        setInterval(() => {
            this.cleanupTrails();
        }, 100);
    }

    createTrail(x, y) {
        const trail = document.createElement('div');
        trail.className = 'cursor-trail';
        trail.style.left = x + 'px';
        trail.style.top = y + 'px';

        document.body.appendChild(trail);
        this.trails.push(trail);

        // Remove after animation
        setTimeout(() => {
            if (trail.parentNode) {
                trail.parentNode.removeChild(trail);
            }
        }, 1000);

        // Limit number of trails
        if (this.trails.length > this.maxTrails) {
            const oldTrail = this.trails.shift();
            if (oldTrail && oldTrail.parentNode) {
                oldTrail.parentNode.removeChild(oldTrail);
            }
        }
    }

    cleanupTrails() {
        this.trails = this.trails.filter(trail => {
            if (!trail.parentNode) {
                return false;
            }
            return true;
        });
    }
}

// Enhanced Sound Effects System
class SoundEffects {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.init();
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.log('Audio context not available');
            this.enabled = false;
        }
    }

    // playHoverSound removed - no hover sounds needed

    playClickSound() {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.05);

        gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.05);
    }

    playSuccessSound() {
        if (!this.enabled || !this.audioContext) return;

        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5

        frequencies.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime + index * 0.1);

            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime + index * 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + index * 0.1 + 0.2);

            oscillator.start(this.audioContext.currentTime + index * 0.1);
            oscillator.stop(this.audioContext.currentTime + index * 0.1 + 0.2);
        });
    }
}

// Enhanced Particle Effects
class EnhancedParticleSystem extends ParticleSystem {
    constructor() {
        super();
        this.specialEffects = [];
    }

    createMessageParticles(x, y) {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 50,
                y: y + (Math.random() - 0.5) * 50,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: Math.random() * 2 + 1,
                opacity: 0.8,
                color: `hsl(${Math.random() * 60 + 220}, 70%, 60%)`,
                life: 60,
                maxLife: 60
            });
        }
    }

    createSuccessParticles(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                size: Math.random() * 3 + 2,
                opacity: 1,
                color: '#10b981',
                life: 120,
                maxLife: 120
            });
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach((particle, index) => {
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Update life
            if (particle.life !== undefined) {
                particle.life--;
                particle.opacity = particle.life / particle.maxLife;

                if (particle.life <= 0) {
                    this.particles.splice(index, 1);
                    return;
                }
            }

            // Wrap around edges for infinite particles
            if (particle.life === undefined) {
                if (particle.x < 0) particle.x = this.canvas.width;
                if (particle.x > this.canvas.width) particle.x = 0;
                if (particle.y < 0) particle.y = this.canvas.height;
                if (particle.y > this.canvas.height) particle.y = 0;
            }

            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fill();
        });

        requestAnimationFrame(() => this.animate());
    }
}

// Interactive Element Enhancer
class InteractiveEnhancer {
    constructor() {
        this.init();
    }

    init() {
        this.addClickEffects();
        this.addFocusEffects();
    }

    // addHoverEffects removed - no hover sounds needed

    addClickEffects() {
        document.addEventListener('click', (e) => {
            const element = e.target.closest('button, .clickable');

            if (element) {
                this.addClickEffect(element);
                if (window.soundEffects) {
                    window.soundEffects.playClickSound();
                }
            }
        });
    }

    addFocusEffects() {
        document.addEventListener('focusin', (e) => {
            if (e.target.matches('input, textarea')) {
                this.addFocusGlow(e.target);
            }
        });

        document.addEventListener('focusout', (e) => {
            if (e.target.matches('input, textarea')) {
                this.removeFocusGlow(e.target);
            }
        });
    }

    addHoverGlow(element) {
        element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        element.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
    }

    removeHoverGlow(element) {
        element.style.boxShadow = '';
    }

    addMessageHover(element) {
        element.style.transform = 'translateX(4px) scale(1.01)';
        element.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.1)';
    }

    addClickEffect(element) {
        element.style.transform = 'scale(0.95)';
        setTimeout(() => {
            element.style.transform = '';
        }, 150);
    }

    addFocusGlow(element) {
        element.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.4)';
        element.style.borderColor = '#667eea';
    }

    removeFocusGlow(element) {
        element.style.boxShadow = '';
        element.style.borderColor = '';
    }
}

// Enhanced Theme System
class EnhancedThemeSystem {
    constructor() {
        this.currentTheme = localStorage.getItem('stellarchat-theme') || 'dark';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
    }

    applyTheme(theme) {
        // Create transition overlay
        const overlay = document.createElement('div');
        overlay.className = 'theme-transition';
        document.body.appendChild(overlay);

        // Apply theme after short delay
        setTimeout(() => {
            document.body.className = theme === 'light' ? 'light-theme' : '';
            this.currentTheme = theme;
            localStorage.setItem('stellarchat-theme', theme);
        }, 200);

        // Remove overlay
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 800);
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        return newTheme;
    }
}

// Performance Monitor
class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 60;
        this.init();
    }

    init() {
        this.monitor();
    }

    monitor() {
        const currentTime = performance.now();
        this.frameCount++;

        if (currentTime - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = currentTime;

            // Adjust animations based on performance
            if (this.fps < 30) {
                this.reduceAnimations();
            } else if (this.fps > 50) {
                this.enableFullAnimations();
            }
        }

        requestAnimationFrame(() => this.monitor());
    }

    reduceAnimations() {
        document.body.classList.add('reduced-animations');
    }

    enableFullAnimations() {
        document.body.classList.remove('reduced-animations');
    }
}

// Initialize all enhanced systems
let cursorTrail;
let soundEffects;
let enhancedParticleSystem;
let interactiveEnhancer;
let enhancedThemeSystem;
let performanceMonitor;

function initializeEnhancedAnimations() {
    try {
        // Initialize cursor trail (desktop-only)
        cursorTrail = new CursorTrail();

        // Initialize sound effects
        soundEffects = new SoundEffects();
        window.soundEffects = soundEffects;

        // Initialize enhanced particle system (desktop-only)
        if (window.particleSystem) {
            enhancedParticleSystem = new EnhancedParticleSystem();
            window.enhancedParticleSystem = enhancedParticleSystem;
        }

        // Initialize interactive enhancer
        interactiveEnhancer = new InteractiveEnhancer();

        // Initialize enhanced theme system
        enhancedThemeSystem = new EnhancedThemeSystem();
        window.enhancedThemeSystem = enhancedThemeSystem;

        // Initialize performance monitor
        performanceMonitor = new PerformanceMonitor();

        // Add final loading animation
        document.body.classList.add('animations-loaded');

        console.log('✨ Enhanced animations initialized successfully!');

        // Show success notification
        setTimeout(() => {
            if (window.NotificationAnimator) {
                NotificationAnimator.showAnimatedNotification(
                    '🚀 Stellar Chat Enhanced Animations Loaded!',
                    'success',
                    2000
                );
            }
        }, 1000);

    } catch (error) {
        console.error('Enhanced animations initialization error:', error);
    }
}

// Enhanced message sending function
function sendMessageWithEnhancedAnimation() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();

    if (!message || isSendingMessage) return;

    // Add enhanced sending animation
    input.classList.add('sending');
    input.disabled = true;

    // Create particle effect at input
    if (window.enhancedParticleSystem) {
        const rect = input.getBoundingClientRect();
        enhancedParticleSystem.createMessageParticles(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
        );
    }

    // Show enhanced typing indicator
    const typingIndicator = MessageAnimator.animateTyping(currentUser?.username || 'You');

    // Send message with enhanced feedback
    sendMessage().then(() => {
        // Success effects
        MessageAnimator.removeTyping(typingIndicator);
        input.classList.remove('sending');
        input.disabled = false;
        input.focus();

        // Success particle effect
        if (window.enhancedParticleSystem) {
            enhancedParticleSystem.createSuccessParticles(input);
        }

        // Success sound
        if (window.soundEffects) {
            soundEffects.playSuccessSound();
        }

        // Button pulse
        ButtonAnimator.pulseButton(document.querySelector('.input-btn[onclick="sendMessage()"]'));

    }).catch(() => {
        // Error effects
        MessageAnimator.removeTyping(typingIndicator);
        input.classList.remove('sending');
        input.disabled = false;

        // Error shake animation
        input.style.animation = 'shake 0.5s ease-out';
        setTimeout(() => {
            input.style.animation = '';
        }, 500);
    });
}

// Enhanced notification function
function showEnhancedNotification(message, type = 'info', duration = 3000) {
    const notification = NotificationAnimator.showAnimatedNotification(message, type, duration);

    // Add particle effect for success notifications
    if (type === 'success' && window.enhancedParticleSystem) {
        setTimeout(() => {
            enhancedParticleSystem.createSuccessParticles(notification);
        }, 200);
    }

    return notification;
}

// Initialize enhanced animations after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initializeEnhancedAnimations();
    }, 500);
});

// Initialize if DOM is already loaded
if (document.readyState !== 'loading') {
    setTimeout(() => {
        initializeEnhancedAnimations();
    }, 500);
}

// Add reduced animations CSS for performance
const reducedAnimationsCSS = `
.reduced-animations * {
    animation-duration: 0.1s !important;
    transition-duration: 0.1s !important;
}

.reduced-animations .stars,
.reduced-animations .nebula,
.reduced-animations .particle-system {
    display: none !important;
}
`;

const reducedAnimationsStyle = document.createElement('style');
reducedAnimationsStyle.textContent = reducedAnimationsCSS;
document.head.appendChild(reducedAnimationsStyle);

console.log('🎨✨ STELLAR CHAT ULTIMATE ANIMATIONS LOADED! ✨🎨');
console.log('🚀 Your chat app now has INCREDIBLE animations! 🚀');// =
// Environment Detection
const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);
const isHardwareAccelerationDisabled = isElectron && (typeof process !== 'undefined' && process.argv && process.argv.includes('--disable-hardware-acceleration'));

if (isElectron && isHardwareAccelerationDisabled) {
    document.body.classList.add('cpu-efficient');
    document.body.classList.add('reduced-animations');
    console.log('Electron: CPU-efficient and reduced animations enabled for smoother performance.');
}

document.addEventListener('DOMContentLoaded', function () {
    // Detect Electron and hardware acceleration status
    const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);
    const isHardwareAccelerationDisabled = isElectron && (typeof process !== 'undefined' && process.argv && process.argv.includes('--disable-hardware-acceleration'));

    if (isElectron && isHardwareAccelerationDisabled) {
        document.body.classList.add('cpu-efficient');
        document.body.classList.add('reduced-animations');
        console.log('Electron: CPU-efficient and reduced animations enabled for smoother performance.');
    }
});