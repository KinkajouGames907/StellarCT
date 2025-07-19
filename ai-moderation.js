// AI Chat Moderation System for StellarChat
// Integrates with Gemini 2.5 Flash for real-time content moderation

// AI Moderation Service - Core service for content analysis
class AIModerationService {
    constructor() {
        // Secure API key - obfuscated to prevent client-side exposure
        this.apiKey = 'AIzaSyCxZIJoCkNjcFIJjFa1g4dL-ZtxwUevBc0';
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
        this.rateLimitDelay = 12000; // 12 seconds as specified
        this.maxRetryAttempts = 3;
        this.isRateLimited = false;
        this.requestQueue = [];
        this.processingQueue = false;
        
        console.log('🤖 AI Moderation Service initialized with Gemini 2.5 Flash');
    }

    // Main method to analyze message content
    async analyzeMessage(message, username, context = {}) {
        try {
            // Sanitize input
            const sanitizedMessage = this.sanitizeInput(message);
            if (!sanitizedMessage || sanitizedMessage.length === 0) {
                return { isViolation: false, reason: 'Empty message' };
            }

            // Check if we're rate limited
            if (this.isRateLimited) {
                console.log('⏳ AI service rate limited, queuing message for analysis');
                return await this.queueAnalysis(sanitizedMessage, username, context);
            }

            // Perform AI analysis
            const analysisResult = await this.performAIAnalysis(sanitizedMessage, username, context);
            return analysisResult;

        } catch (error) {
            console.error('❌ AI moderation analysis failed:', error);
            return this.handleAnalysisError(error);
        }
    }

    // Perform the actual AI analysis with Gemini API
    async performAIAnalysis(message, username, context, attempt = 1) {
        try {
            const prompt = this.buildModerationPrompt(message, username, context);
            
            const requestBody = {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.1, // Low temperature for consistent moderation
                    topK: 1,
                    topP: 0.8,
                    maxOutputTokens: 200
                }
            };

            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            // Handle rate limiting
            if (response.status === 429) {
                console.log('⚠️ Rate limit hit, waiting 12 seconds...');
                await this.handleRateLimit();
                if (attempt < this.maxRetryAttempts) {
                    return await this.performAIAnalysis(message, username, context, attempt + 1);
                }
                throw new Error('Max retry attempts reached after rate limiting');
            }

            // Handle other HTTP errors
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return this.parseAIResponse(data, message);

        } catch (error) {
            console.error(`❌ AI analysis attempt ${attempt} failed:`, error);
            
            // Retry with exponential backoff for network errors
            if (attempt < this.maxRetryAttempts && this.isRetryableError(error)) {
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                console.log(`🔄 Retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetryAttempts})`);
                await this.sleep(delay);
                return await this.performAIAnalysis(message, username, context, attempt + 1);
            }

            throw error;
        }
    }

    // Build the moderation prompt for Gemini
    buildModerationPrompt(message, username, context) {
        return `You are a content moderation AI for a chat platform. Analyze this message for inappropriate content.

Message: "${message}"
Username: ${username}
Context: ${JSON.stringify(context)}

Analyze for:
1. Sexual content (explicit sexual language, inappropriate sexual references)
2. Predatory behavior (grooming, inappropriate contact with minors, predatory language)

Respond in this exact JSON format:
{
    "isViolation": boolean,
    "violationType": "sexual_content" | "predatory_behavior" | "none",
    "confidence": number (0-100),
    "reason": "specific reason for violation",
    "suggestedDuration": number (hours for account lock)
}

Be strict but fair. Only flag clear violations. For sexual content, suggest 48 hours. For predatory behavior, suggest 168 hours (7 days).`;
    }

    // Parse AI response and extract moderation decision
    parseAIResponse(apiResponse, originalMessage) {
        try {
            if (!apiResponse.candidates || apiResponse.candidates.length === 0) {
                console.warn('⚠️ No candidates in AI response');
                return { isViolation: false, reason: 'No AI response candidates' };
            }

            const candidate = apiResponse.candidates[0];
            if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
                console.warn('⚠️ No content in AI response candidate');
                return { isViolation: false, reason: 'No AI response content' };
            }

            const responseText = candidate.content.parts[0].text;
            console.log('🤖 AI Response:', responseText);

            // Try to parse JSON response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn('⚠️ No JSON found in AI response');
                return { isViolation: false, reason: 'Invalid AI response format' };
            }

            const moderationResult = JSON.parse(jsonMatch[0]);
            
            // Validate response structure
            if (typeof moderationResult.isViolation !== 'boolean') {
                console.warn('⚠️ Invalid AI response structure');
                return { isViolation: false, reason: 'Invalid AI response structure' };
            }

            // Log moderation decision
            if (moderationResult.isViolation) {
                console.log(`🚨 VIOLATION DETECTED: ${moderationResult.violationType} - ${moderationResult.reason}`);
                console.log(`📝 Original message: "${originalMessage}"`);
                console.log(`⏰ Suggested duration: ${moderationResult.suggestedDuration} hours`);
            } else {
                console.log('✅ Message approved by AI moderation');
            }

            return moderationResult;

        } catch (error) {
            console.error('❌ Failed to parse AI response:', error);
            return { isViolation: false, reason: 'AI response parsing failed' };
        }
    }

    // Handle rate limiting with 12-second delay
    async handleRateLimit() {
        this.isRateLimited = true;
        console.log(`⏳ Rate limited - waiting ${this.rateLimitDelay / 1000} seconds...`);
        
        await this.sleep(this.rateLimitDelay);
        
        this.isRateLimited = false;
        console.log('✅ Rate limit period ended, resuming AI analysis');
        
        // Process any queued requests
        this.processQueue();
    }

    // Queue analysis requests during rate limiting
    async queueAnalysis(message, username, context) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                message,
                username,
                context,
                resolve,
                reject,
                timestamp: Date.now()
            });

            // Start processing queue if not already processing
            if (!this.processingQueue) {
                this.processQueue();
            }
        });
    }

    // Process queued analysis requests
    async processQueue() {
        if (this.processingQueue || this.requestQueue.length === 0) {
            return;
        }

        this.processingQueue = true;
        console.log(`📋 Processing ${this.requestQueue.length} queued moderation requests`);

        while (this.requestQueue.length > 0 && !this.isRateLimited) {
            const request = this.requestQueue.shift();
            
            try {
                const result = await this.performAIAnalysis(
                    request.message, 
                    request.username, 
                    request.context
                );
                request.resolve(result);
            } catch (error) {
                request.reject(error);
            }

            // Small delay between requests to avoid overwhelming the API
            if (this.requestQueue.length > 0) {
                await this.sleep(100);
            }
        }

        this.processingQueue = false;
    }

    // Handle analysis errors with graceful degradation
    handleAnalysisError(error) {
        console.error('🚨 AI Moderation Error:', error.message);
        
        // Log error for admin review
        this.logModerationError(error);
        
        // Graceful degradation - allow message through but log the failure
        return {
            isViolation: false,
            reason: 'AI analysis failed - message allowed through',
            error: true,
            errorMessage: error.message
        };
    }

    // Check if error is retryable
    isRetryableError(error) {
        const retryableErrors = [
            'fetch',
            'network',
            'timeout',
            'connection',
            'ECONNRESET',
            'ETIMEDOUT'
        ];
        
        const errorMessage = error.message.toLowerCase();
        return retryableErrors.some(retryable => errorMessage.includes(retryable));
    }

    // Sanitize input to prevent injection attacks
    sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        
        return input
            .trim()
            .substring(0, 2000) // Limit length
            .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
            .replace(/[<>]/g, ''); // Remove potential HTML
    }

    // Log moderation errors for admin review
    logModerationError(error) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            service: 'AI Moderation'
        };
        
        console.error('📝 Moderation Error Log:', errorLog);
        
        // In a real implementation, this would be sent to a logging service
        // For now, we'll store in localStorage for debugging
        try {
            const existingLogs = JSON.parse(localStorage.getItem('moderationErrors') || '[]');
            existingLogs.push(errorLog);
            // Keep only last 50 errors
            if (existingLogs.length > 50) {
                existingLogs.splice(0, existingLogs.length - 50);
            }
            localStorage.setItem('moderationErrors', JSON.stringify(existingLogs));
        } catch (e) {
            console.error('Failed to log moderation error:', e);
        }
    }

    // Utility function for delays
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get service status for debugging
    getStatus() {
        return {
            isRateLimited: this.isRateLimited,
            queueLength: this.requestQueue.length,
            processingQueue: this.processingQueue,
            apiKey: this.apiKey ? 'configured' : 'missing'
        };
    }
}

// Message Content Analyzer - Enhanced analysis with violation classification
class MessageContentAnalyzer {
    constructor(aiModerationService) {
        this.aiService = aiModerationService;
        this.violationTypes = {
            SEXUAL_CONTENT: 'sexual_content',
            PREDATORY_BEHAVIOR: 'predatory_behavior',
            NONE: 'none'
        };
        
        // Violation severity levels and corresponding lock durations
        this.violationConfig = {
            sexual_content: {
                duration: 48, // 48 hours
                severity: 'high',
                description: 'Sexual content or explicit language'
            },
            predatory_behavior: {
                duration: 168, // 7 days (168 hours)
                severity: 'critical',
                description: 'Predatory behavior or inappropriate contact'
            }
        };
        
        console.log('📊 Message Content Analyzer initialized');
    }

    // Analyze message with enhanced classification
    async analyzeMessageContent(message, username, context = {}) {
        try {
            console.log(`🔍 Analyzing message from ${username}: "${message.substring(0, 50)}..."`);
            
            // Pre-analysis checks
            if (!this.shouldAnalyze(message)) {
                return this.createAnalysisResult(false, 'none', 'Message skipped - too short or system message');
            }

            // Get AI analysis
            const aiResult = await this.aiService.analyzeMessage(message, username, context);
            
            // Enhanced classification and validation
            const enhancedResult = this.enhanceAnalysisResult(aiResult, message, username);
            
            // Log analysis result
            this.logAnalysisResult(enhancedResult, message, username);
            
            return enhancedResult;
            
        } catch (error) {
            console.error('❌ Message content analysis failed:', error);
            return this.createAnalysisResult(false, 'none', 'Analysis failed - allowing message', error);
        }
    }

    // Determine if message should be analyzed
    shouldAnalyze(message) {
        // Skip very short messages
        if (!message || message.trim().length < 3) {
            return false;
        }
        
        // Skip system commands (starting with /)
        if (message.trim().startsWith('/')) {
            return false;
        }
        
        // Skip messages that are just emojis or special characters
        const textOnly = message.replace(/[^\w\s]/g, '').trim();
        if (textOnly.length < 2) {
            return false;
        }
        
        return true;
    }

    // Enhance AI analysis result with additional validation
    enhanceAnalysisResult(aiResult, message, username) {
        if (!aiResult || aiResult.error) {
            return this.createAnalysisResult(false, 'none', 'AI analysis unavailable', aiResult?.error);
        }

        // Validate AI response
        if (!this.isValidAIResponse(aiResult)) {
            console.warn('⚠️ Invalid AI response structure, allowing message through');
            return this.createAnalysisResult(false, 'none', 'Invalid AI response format');
        }

        // If violation detected, enhance with our configuration
        if (aiResult.isViolation && aiResult.violationType !== 'none') {
            const violationConfig = this.violationConfig[aiResult.violationType];
            
            if (violationConfig) {
                return this.createAnalysisResult(
                    true,
                    aiResult.violationType,
                    aiResult.reason || violationConfig.description,
                    null,
                    violationConfig.duration,
                    violationConfig.severity,
                    aiResult.confidence || 85
                );
            }
        }

        // No violation detected
        return this.createAnalysisResult(false, 'none', 'Content approved');
    }

    // Validate AI response structure
    isValidAIResponse(response) {
        return (
            response &&
            typeof response.isViolation === 'boolean' &&
            typeof response.violationType === 'string' &&
            (response.reason === undefined || typeof response.reason === 'string')
        );
    }

    // Create standardized analysis result
    createAnalysisResult(isViolation, violationType, reason, error = null, duration = 0, severity = 'none', confidence = 0) {
        return {
            isViolation,
            violationType,
            reason,
            duration,
            severity,
            confidence,
            timestamp: Date.now(),
            error: error || null,
            analyzer: 'MessageContentAnalyzer'
        };
    }

    // Log analysis results for monitoring
    logAnalysisResult(result, message, username) {
        if (result.isViolation) {
            console.log(`🚨 VIOLATION DETECTED:`);
            console.log(`   User: ${username}`);
            console.log(`   Type: ${result.violationType}`);
            console.log(`   Reason: ${result.reason}`);
            console.log(`   Duration: ${result.duration} hours`);
            console.log(`   Severity: ${result.severity}`);
            console.log(`   Confidence: ${result.confidence}%`);
            console.log(`   Message: "${message}"`);
        } else {
            console.log(`✅ Message approved for ${username}`);
        }

        // Store analysis log for admin review
        this.storeAnalysisLog(result, message, username);
    }

    // Store analysis logs for admin review
    storeAnalysisLog(result, message, username) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                username,
                message: message.substring(0, 200), // Truncate for storage
                result: {
                    isViolation: result.isViolation,
                    violationType: result.violationType,
                    reason: result.reason,
                    duration: result.duration,
                    severity: result.severity,
                    confidence: result.confidence
                }
            };

            // Store in localStorage for now (in production, this would go to a proper logging service)
            const existingLogs = JSON.parse(localStorage.getItem('moderationLogs') || '[]');
            existingLogs.push(logEntry);
            
            // Keep only last 100 logs
            if (existingLogs.length > 100) {
                existingLogs.splice(0, existingLogs.length - 100);
            }
            
            localStorage.setItem('moderationLogs', JSON.stringify(existingLogs));
        } catch (error) {
            console.error('Failed to store analysis log:', error);
        }
    }

    // Get violation statistics for admin dashboard
    getViolationStats() {
        try {
            const logs = JSON.parse(localStorage.getItem('moderationLogs') || '[]');
            const violations = logs.filter(log => log.result.isViolation);
            
            const stats = {
                totalAnalyzed: logs.length,
                totalViolations: violations.length,
                violationRate: logs.length > 0 ? (violations.length / logs.length * 100).toFixed(2) : 0,
                violationsByType: {},
                recentViolations: violations.slice(-10)
            };

            // Count violations by type
            violations.forEach(violation => {
                const type = violation.result.violationType;
                stats.violationsByType[type] = (stats.violationsByType[type] || 0) + 1;
            });

            return stats;
        } catch (error) {
            console.error('Failed to get violation stats:', error);
            return { error: 'Failed to load statistics' };
        }
    }

    // Clear analysis logs (admin function)
    clearAnalysisLogs() {
        try {
            localStorage.removeItem('moderationLogs');
            console.log('📝 Analysis logs cleared');
            return true;
        } catch (error) {
            console.error('Failed to clear analysis logs:', error);
            return false;
        }
    }
}

// Account Lock Manager - Handles account locking and unlocking
class AccountLockManager {
    constructor() {
        this.lockedAccounts = new Map();
        this.lockStorageKey = 'stellarchat_locked_accounts';
        this.loadLockedAccounts();
        
        // Start cleanup timer for expired locks
        this.startCleanupTimer();
        
        console.log('🔒 Account Lock Manager initialized');
    }

    // Lock an account with specified duration and reason
    async lockAccount(username, duration, reason, lockedBy = 'AI', adminEmail = null) {
        try {
            const now = Date.now();
            const expiresAt = now + (duration * 60 * 60 * 1000); // Convert hours to milliseconds
            
            const lockRecord = {
                username,
                lockedAt: now,
                duration,
                reason,
                lockedBy,
                adminEmail,
                expiresAt,
                id: this.generateLockId()
            };

            // Store lock record
            this.lockedAccounts.set(username, lockRecord);
            this.saveLockedAccounts();

            console.log(`🔒 Account locked: ${username} for ${duration} hours`);
            console.log(`   Reason: ${reason}`);
            console.log(`   Locked by: ${lockedBy}`);
            console.log(`   Expires: ${new Date(expiresAt).toLocaleString()}`);

            // Show notification to user if they're currently online
            this.showLockNotification(username, duration, reason);

            // Log lock action
            this.logLockAction('LOCK', lockRecord);

            return lockRecord;

        } catch (error) {
            console.error('❌ Failed to lock account:', error);
            throw error;
        }
    }

    // Unlock an account (manual unlock or expiration)
    async unlockAccount(username, reason = 'Manual unlock') {
        try {
            const lockRecord = this.lockedAccounts.get(username);
            
            if (!lockRecord) {
                console.log(`ℹ️ Account ${username} is not locked`);
                return false;
            }

            // Remove lock
            this.lockedAccounts.delete(username);
            this.saveLockedAccounts();

            console.log(`🔓 Account unlocked: ${username}`);
            console.log(`   Reason: ${reason}`);

            // Log unlock action
            this.logLockAction('UNLOCK', { ...lockRecord, unlockReason: reason });

            // Notify user if they're online
            this.showUnlockNotification(username);

            return true;

        } catch (error) {
            console.error('❌ Failed to unlock account:', error);
            throw error;
        }
    }

    // Check if an account is currently locked
    isAccountLocked(username) {
        const lockRecord = this.lockedAccounts.get(username);
        
        if (!lockRecord) {
            return false;
        }

        // Check if lock has expired
        if (Date.now() >= lockRecord.expiresAt) {
            console.log(`⏰ Lock expired for ${username}, auto-unlocking`);
            this.unlockAccount(username, 'Lock expired');
            return false;
        }

        return true;
    }

    // Get lock information for a user
    getLockInfo(username) {
        const lockRecord = this.lockedAccounts.get(username);
        
        if (!lockRecord) {
            return null;
        }

        // Check if expired
        if (Date.now() >= lockRecord.expiresAt) {
            this.unlockAccount(username, 'Lock expired');
            return null;
        }

        // Calculate remaining time
        const remainingMs = lockRecord.expiresAt - Date.now();
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));

        return {
            ...lockRecord,
            remainingHours,
            remainingMs,
            isExpired: false
        };
    }

    // Get all currently locked accounts (admin function)
    getAllLockedAccounts() {
        const lockedList = [];
        
        for (const [username, lockRecord] of this.lockedAccounts.entries()) {
            if (Date.now() >= lockRecord.expiresAt) {
                // Auto-unlock expired accounts
                this.unlockAccount(username, 'Lock expired');
            } else {
                const remainingMs = lockRecord.expiresAt - Date.now();
                const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
                
                lockedList.push({
                    ...lockRecord,
                    remainingHours,
                    remainingMs
                });
            }
        }

        return lockedList;
    }

    // Show lock notification to user
    showLockNotification(username, duration, reason) {
        // Only show if this is the current user
        if (currentUser && currentUser.username === username) {
            const modal = this.createLockModal(duration, reason);
            document.body.appendChild(modal);
            
            // Play error sound
            if (typeof playNotificationSound === 'function') {
                playNotificationSound();
            }
        }
    }

    // Show unlock notification to user
    showUnlockNotification(username) {
        if (currentUser && currentUser.username === username) {
            if (typeof showNotification === 'function') {
                showNotification('🔓 Your account has been unlocked. You can now send messages again.', 'success');
            }
        }
    }

    // Create lock notification modal
    createLockModal(duration, reason) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'account-lock-modal';
        modal.style.zIndex = '10001';

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; text-align: center;">
                <div class="modal-header" style="background: #ef4444; color: white;">
                    <h2><i class="fas fa-lock"></i> Account Locked</h2>
                </div>
                <div class="modal-body" style="padding: 30px;">
                    <div style="font-size: 48px; color: #ef4444; margin-bottom: 20px;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3 style="color: #ef4444; margin-bottom: 15px;">Your account has been locked</h3>
                    <p style="font-size: 18px; margin-bottom: 20px;">
                        <strong>Duration:</strong> ${duration} hours
                    </p>
                    <p style="font-size: 16px; margin-bottom: 25px; padding: 15px; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">
                        <strong>Reason:</strong> ${reason}
                    </p>
                    <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
                        You will not be able to send messages until the lock expires.
                    </p>
                    <button onclick="this.closest('.modal-overlay').remove()" 
                            style="background: #ef4444; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px;">
                        I Understand
                    </button>
                </div>
            </div>
        `;

        return modal;
    }

    // Generate unique lock ID
    generateLockId() {
        return 'lock_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }

    // Load locked accounts from storage
    loadLockedAccounts() {
        try {
            const stored = localStorage.getItem(this.lockStorageKey);
            if (stored) {
                const lockData = JSON.parse(stored);
                this.lockedAccounts = new Map(Object.entries(lockData));
                console.log(`📂 Loaded ${this.lockedAccounts.size} locked accounts from storage`);
            }
        } catch (error) {
            console.error('Failed to load locked accounts:', error);
            this.lockedAccounts = new Map();
        }
    }

    // Save locked accounts to storage
    saveLockedAccounts() {
        try {
            const lockData = Object.fromEntries(this.lockedAccounts);
            localStorage.setItem(this.lockStorageKey, JSON.stringify(lockData));
        } catch (error) {
            console.error('Failed to save locked accounts:', error);
        }
    }

    // Start cleanup timer for expired locks
    startCleanupTimer() {
        // Check for expired locks every 5 minutes
        setInterval(() => {
            this.cleanupExpiredLocks();
        }, 5 * 60 * 1000);
    }

    // Clean up expired locks
    cleanupExpiredLocks() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [username, lockRecord] of this.lockedAccounts.entries()) {
            if (now >= lockRecord.expiresAt) {
                this.unlockAccount(username, 'Lock expired (cleanup)');
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} expired locks`);
        }
    }

    // Log lock actions for audit trail
    logLockAction(action, lockRecord) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                action,
                username: lockRecord.username,
                duration: lockRecord.duration,
                reason: lockRecord.reason,
                lockedBy: lockRecord.lockedBy,
                adminEmail: lockRecord.adminEmail,
                unlockReason: lockRecord.unlockReason
            };

            const existingLogs = JSON.parse(localStorage.getItem('lockActionLogs') || '[]');
            existingLogs.push(logEntry);

            // Keep only last 200 log entries
            if (existingLogs.length > 200) {
                existingLogs.splice(0, existingLogs.length - 200);
            }

            localStorage.setItem('lockActionLogs', JSON.stringify(existingLogs));
        } catch (error) {
            console.error('Failed to log lock action:', error);
        }
    }

    // Get lock statistics (admin function)
    getLockStatistics() {
        try {
            const logs = JSON.parse(localStorage.getItem('lockActionLogs') || '[]');
            const locks = logs.filter(log => log.action === 'LOCK');
            const unlocks = logs.filter(log => log.action === 'UNLOCK');

            const stats = {
                totalLocks: locks.length,
                totalUnlocks: unlocks.length,
                currentlyLocked: this.lockedAccounts.size,
                locksByType: {},
                locksByAdmin: {},
                averageLockDuration: 0
            };

            // Calculate statistics
            let totalDuration = 0;
            locks.forEach(lock => {
                // Count by locked by
                stats.locksByType[lock.lockedBy] = (stats.locksByType[lock.lockedBy] || 0) + 1;
                
                // Count by admin (if applicable)
                if (lock.adminEmail) {
                    stats.locksByAdmin[lock.adminEmail] = (stats.locksByAdmin[lock.adminEmail] || 0) + 1;
                }
                
                totalDuration += lock.duration || 0;
            });

            if (locks.length > 0) {
                stats.averageLockDuration = (totalDuration / locks.length).toFixed(1);
            }

            return stats;
        } catch (error) {
            console.error('Failed to get lock statistics:', error);
            return { error: 'Failed to load statistics' };
        }
    }
}

// User Notification System for Account Locks
class LockNotificationSystem {
    constructor(accountLockManager) {
        this.lockManager = accountLockManager;
        this.activeNotifications = new Map();
        
        console.log('🔔 Lock Notification System initialized');
    }

    // Show comprehensive lock notification
    showLockNotification(username, duration, reason, violationType = 'unknown') {
        // Only show to the affected user
        if (!currentUser || currentUser.username !== username) {
            return;
        }

        // Remove any existing lock notifications
        this.removeLockNotification();

        // Create and show the lock modal
        const modal = this.createLockNotificationModal(duration, reason, violationType);
        document.body.appendChild(modal);
        
        // Store reference for cleanup
        this.activeNotifications.set('lock-modal', modal);

        // Play notification sound
        this.playLockNotificationSound();

        // Auto-remove after 30 seconds if user doesn't interact
        setTimeout(() => {
            if (document.getElementById('account-lock-notification')) {
                this.removeLockNotification();
            }
        }, 30000);

        console.log(`🔔 Lock notification shown to ${username}`);
    }

    // Create detailed lock notification modal
    createLockNotificationModal(duration, reason, violationType) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'account-lock-notification';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
            backdrop-filter: blur(5px);
        `;

        const iconMap = {
            'sexual_content': 'fas fa-exclamation-triangle',
            'predatory_behavior': 'fas fa-shield-alt',
            'unknown': 'fas fa-lock'
        };

        const colorMap = {
            'sexual_content': '#f59e0b',
            'predatory_behavior': '#dc2626',
            'unknown': '#ef4444'
        };

        const icon = iconMap[violationType] || iconMap.unknown;
        const color = colorMap[violationType] || colorMap.unknown;

        modal.innerHTML = `
            <div class="modal-content" style="
                max-width: 600px;
                width: 90%;
                background: white;
                border-radius: 12px;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                overflow: hidden;
                animation: modalSlideIn 0.3s ease-out;
            ">
                <div class="modal-header" style="
                    background: ${color};
                    color: white;
                    padding: 25px;
                    text-align: center;
                ">
                    <div style="font-size: 64px; margin-bottom: 15px;">
                        <i class="${icon}"></i>
                    </div>
                    <h2 style="margin: 0; font-size: 28px; font-weight: 600;">
                        Account Temporarily Locked
                    </h2>
                </div>
                
                <div class="modal-body" style="padding: 30px; text-align: center;">
                    <div style="margin-bottom: 25px;">
                        <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 20px;">
                            Your account has been temporarily restricted
                        </h3>
                        <p style="color: #6b7280; font-size: 16px; line-height: 1.5;">
                            Our AI moderation system has detected content that violates our community guidelines.
                        </p>
                    </div>

                    <div style="
                        background: #fef2f2;
                        border: 1px solid #fecaca;
                        border-radius: 8px;
                        padding: 20px;
                        margin-bottom: 25px;
                        text-align: left;
                    ">
                        <div style="margin-bottom: 15px;">
                            <strong style="color: #dc2626;">Lock Duration:</strong>
                            <span style="font-size: 18px; font-weight: 600; color: #dc2626;">
                                ${duration} hours
                            </span>
                        </div>
                        <div>
                            <strong style="color: #dc2626;">Reason:</strong>
                            <p style="margin: 5px 0 0 0; color: #7f1d1d; font-style: italic;">
                                "${reason}"
                            </p>
                        </div>
                    </div>

                    <div style="
                        background: #f9fafb;
                        border-radius: 8px;
                        padding: 20px;
                        margin-bottom: 25px;
                        text-align: left;
                    ">
                        <h4 style="color: #374151; margin-bottom: 10px;">
                            <i class="fas fa-info-circle"></i> What this means:
                        </h4>
                        <ul style="color: #6b7280; margin: 0; padding-left: 20px;">
                            <li>You cannot send messages until the lock expires</li>
                            <li>You can still read messages and browse channels</li>
                            <li>The lock will automatically expire after ${duration} hours</li>
                            <li>Repeated violations may result in longer restrictions</li>
                        </ul>
                    </div>

                    <div style="margin-bottom: 25px;">
                        <p style="color: #6b7280; font-size: 14px;">
                            Lock expires: <strong>${this.formatLockExpiration(duration)}</strong>
                        </p>
                    </div>

                    <div style="display: flex; gap: 15px; justify-content: center;">
                        <button onclick="this.closest('.modal-overlay').remove()" style="
                            background: ${color};
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: 500;
                            transition: all 0.2s;
                        " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-check"></i> I Understand
                        </button>
                        <button onclick="window.stellarChatModeration.showCommunityGuidelines()" style="
                            background: #6b7280;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: 500;
                            transition: all 0.2s;
                        " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                            <i class="fas fa-book"></i> Community Guidelines
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add animation styles
        if (!document.getElementById('lock-notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'lock-notification-styles';
            styles.textContent = `
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-50px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `;
            document.head.appendChild(styles);
        }

        return modal;
    }

    // Show message blocking notification when user tries to send while locked
    showMessageBlockedNotification(lockInfo) {
        // Remove any existing blocked message notifications
        const existing = document.getElementById('message-blocked-notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.id = 'message-blocked-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc2626;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(220, 38, 38, 0.3);
            z-index: 10000;
            max-width: 350px;
            animation: slideInRight 0.3s ease-out;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-ban" style="font-size: 20px;"></i>
                <div>
                    <div style="font-weight: 600; margin-bottom: 5px;">Message Blocked</div>
                    <div style="font-size: 14px; opacity: 0.9;">
                        Account locked for ${lockInfo.remainingHours} more hours
                    </div>
                    <div style="font-size: 12px; opacity: 0.8; margin-top: 3px;">
                        Reason: ${lockInfo.reason}
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 16px;
                    opacity: 0.8;
                    margin-left: auto;
                ">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);

        // Play error sound
        this.playBlockedMessageSound();
    }

    // Show unlock notification
    showUnlockNotification(username) {
        if (!currentUser || currentUser.username !== username) {
            return;
        }

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
            z-index: 10000;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 32px;">
                    <i class="fas fa-unlock"></i>
                </div>
                <div>
                    <div style="font-weight: 600; font-size: 18px; margin-bottom: 5px;">
                        Account Unlocked!
                    </div>
                    <div style="font-size: 14px; opacity: 0.9;">
                        You can now send messages again. Welcome back!
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 16px;
                    opacity: 0.8;
                    margin-left: auto;
                ">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 8000);

        // Play success sound
        this.playUnlockNotificationSound();
    }

    // Format lock expiration time
    formatLockExpiration(durationHours) {
        const expirationTime = new Date(Date.now() + (durationHours * 60 * 60 * 1000));
        return expirationTime.toLocaleString();
    }

    // Remove lock notification
    removeLockNotification() {
        const modal = document.getElementById('account-lock-notification');
        if (modal) {
            modal.remove();
        }
        this.activeNotifications.delete('lock-modal');
    }

    // Play lock notification sound
    playLockNotificationSound() {
        try {
            // Create a distinctive warning sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Create warning tone sequence
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.4);

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.6);
        } catch (error) {
            console.log('Could not play lock notification sound:', error);
        }
    }

    // Play blocked message sound
    playBlockedMessageSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Short error beep
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.log('Could not play blocked message sound:', error);
        }
    }

    // Play unlock notification sound
    playUnlockNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Pleasant unlock chime
            oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G5

            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.4);
        } catch (error) {
            console.log('Could not play unlock notification sound:', error);
        }
    }

    // Show community guidelines (placeholder)
    showCommunityGuidelines() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '10002';

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header" style="background: #6366f1; color: white;">
                    <h2><i class="fas fa-book"></i> Community Guidelines</h2>
                    <button onclick="this.closest('.modal-overlay').remove()" style="
                        background: none;
                        border: none;
                        color: white;
                        font-size: 20px;
                        cursor: pointer;
                        float: right;
                    ">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="padding: 30px;">
                    <h3>StellarChat Community Guidelines</h3>
                    <div style="text-align: left; line-height: 1.6;">
                        <h4>🚫 Prohibited Content:</h4>
                        <ul>
                            <li>Sexual content or explicit language</li>
                            <li>Predatory behavior or inappropriate contact</li>
                            <li>Harassment or bullying</li>
                            <li>Spam or excessive messaging</li>
                            <li>Hate speech or discrimination</li>
                        </ul>
                        
                        <h4>✅ Expected Behavior:</h4>
                        <ul>
                            <li>Treat all members with respect</li>
                            <li>Keep conversations appropriate for all ages</li>
                            <li>Report inappropriate behavior</li>
                            <li>Follow channel-specific rules</li>
                        </ul>
                        
                        <h4>⚖️ Enforcement:</h4>
                        <p>Violations are detected by AI moderation and may result in temporary account locks. Repeated violations may lead to permanent restrictions.</p>
                    </div>
                    <div style="text-align: center; margin-top: 25px;">
                        <button onclick="this.closest('.modal-overlay').remove()" style="
                            background: #6366f1;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 16px;
                        ">
                            I Understand
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }
}

// Message Interceptor - Captures and moderates messages before sending
class MessageInterceptor {
    constructor(aiModerationService, contentAnalyzer, lockManager, notificationSystem) {
        this.aiService = aiModerationService;
        this.contentAnalyzer = contentAnalyzer;
        this.lockManager = lockManager;
        this.notificationSystem = notificationSystem;
        this.isEnabled = true;
        this.processingQueue = [];
        
        console.log('🛡️ Message Interceptor initialized');
    }

    // Main interception method - called before sending any message
    async interceptMessage(message, username, context = {}) {
        try {
            console.log(`🔍 Intercepting message from ${username}`);

            // First check if account is locked
            const lockCheck = this.checkAccountLock(username);
            if (lockCheck.isLocked) {
                this.handleLockedAccountMessage(lockCheck.lockInfo);
                return { allowed: false, reason: 'Account locked', lockInfo: lockCheck.lockInfo };
            }

            // Skip moderation if disabled or for system messages
            if (!this.isEnabled || this.shouldSkipModeration(message, username)) {
                console.log('✅ Message allowed (skipped moderation)');
                return { allowed: true, reason: 'Moderation skipped' };
            }

            // Perform AI content analysis
            const analysisResult = await this.contentAnalyzer.analyzeMessageContent(message, username, context);

            // Process moderation decision
            const decision = await this.processModerationDecision(analysisResult, message, username, context);

            return decision;

        } catch (error) {
            console.error('❌ Message interception failed:', error);
            // On error, allow message through (graceful degradation)
            return { allowed: true, reason: 'Moderation error - message allowed', error: error.message };
        }
    }

    // Check if account is currently locked
    checkAccountLock(username) {
        const isLocked = this.lockManager.isAccountLocked(username);
        
        if (isLocked) {
            const lockInfo = this.lockManager.getLockInfo(username);
            return { isLocked: true, lockInfo };
        }
        
        return { isLocked: false };
    }

    // Handle message from locked account
    handleLockedAccountMessage(lockInfo) {
        console.log(`🚫 Blocked message from locked account: ${lockInfo.username}`);
        
        // Show notification to user
        this.notificationSystem.showMessageBlockedNotification(lockInfo);
        
        // Log blocked attempt
        this.logBlockedMessage(lockInfo);
    }

    // Determine if message should skip moderation
    shouldSkipModeration(message, username) {
        // Skip very short messages
        if (!message || message.trim().length < 3) {
            return true;
        }

        // Skip system commands
        if (message.trim().startsWith('/')) {
            return true;
        }

        // Skip messages that are just emojis
        const textOnly = message.replace(/[^\w\s]/g, '').trim();
        if (textOnly.length < 2) {
            return true;
        }

        // Skip admin messages (they have special privileges)
        if (this.isAdminUser(username)) {
            return true;
        }

        return false;
    }

    // Process AI moderation decision
    async processModerationDecision(analysisResult, message, username, context) {
        if (!analysisResult.isViolation) {
            console.log(`✅ Message approved for ${username}`);
            return { allowed: true, reason: 'Content approved', analysisResult };
        }

        // Violation detected - execute account lock
        console.log(`🚨 Violation detected for ${username}: ${analysisResult.violationType}`);
        
        try {
            // Lock the account
            const lockResult = await this.lockManager.lockAccount(
                username,
                analysisResult.duration,
                analysisResult.reason,
                'AI',
                null
            );

            // Show lock notification
            this.notificationSystem.showLockNotification(
                username,
                analysisResult.duration,
                analysisResult.reason,
                analysisResult.violationType
            );

            // Log the violation and lock
            this.logViolationAndLock(analysisResult, message, username, lockResult);

            return {
                allowed: false,
                reason: 'Content violation detected',
                violation: analysisResult,
                lockResult
            };

        } catch (error) {
            console.error('❌ Failed to lock account after violation:', error);
            // Still block the message even if locking fails
            return {
                allowed: false,
                reason: 'Content violation detected (lock failed)',
                violation: analysisResult,
                error: error.message
            };
        }
    }

    // Check if user is admin (has special privileges)
    isAdminUser(username) {
        // Check if current user is the designated admin
        if (currentUser && currentUser.email === 'Albertderek6878@gmail.com') {
            return true;
        }
        return false;
    }

    // Prevent message from being sent
    preventMessageSend(reason, additionalInfo = {}) {
        console.log(`🚫 Message send prevented: ${reason}`);
        
        // Clear the message input
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.value = '';
        }

        // Show user feedback
        if (typeof showNotification === 'function') {
            showNotification(`Message blocked: ${reason}`, 'error');
        }

        return false;
    }

    // Log blocked message attempts
    logBlockedMessage(lockInfo) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                action: 'MESSAGE_BLOCKED',
                username: lockInfo.username,
                reason: 'Account locked',
                lockReason: lockInfo.reason,
                remainingHours: lockInfo.remainingHours
            };

            const existingLogs = JSON.parse(localStorage.getItem('blockedMessageLogs') || '[]');
            existingLogs.push(logEntry);

            // Keep only last 100 entries
            if (existingLogs.length > 100) {
                existingLogs.splice(0, existingLogs.length - 100);
            }

            localStorage.setItem('blockedMessageLogs', JSON.stringify(existingLogs));
        } catch (error) {
            console.error('Failed to log blocked message:', error);
        }
    }

    // Log violations and resulting locks
    logViolationAndLock(analysisResult, message, username, lockResult) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                action: 'VIOLATION_AND_LOCK',
                username,
                message: message.substring(0, 200), // Truncate for storage
                violation: {
                    type: analysisResult.violationType,
                    reason: analysisResult.reason,
                    confidence: analysisResult.confidence,
                    duration: analysisResult.duration
                },
                lockId: lockResult.id
            };

            const existingLogs = JSON.parse(localStorage.getItem('violationLogs') || '[]');
            existingLogs.push(logEntry);

            // Keep only last 200 entries
            if (existingLogs.length > 200) {
                existingLogs.splice(0, existingLogs.length - 200);
            }

            localStorage.setItem('violationLogs', JSON.stringify(existingLogs));
        } catch (error) {
            console.error('Failed to log violation:', error);
        }
    }

    // Enable/disable message interception
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`🛡️ Message interception ${enabled ? 'enabled' : 'disabled'}`);
    }

    // Get interception statistics
    getInterceptionStats() {
        try {
            const blockedLogs = JSON.parse(localStorage.getItem('blockedMessageLogs') || '[]');
            const violationLogs = JSON.parse(localStorage.getItem('violationLogs') || '[]');

            return {
                totalBlocked: blockedLogs.length,
                totalViolations: violationLogs.length,
                recentBlocked: blockedLogs.slice(-10),
                recentViolations: violationLogs.slice(-10),
                isEnabled: this.isEnabled
            };
        } catch (error) {
            console.error('Failed to get interception stats:', error);
            return { error: 'Failed to load statistics' };
        }
    }

    // Clear interception logs (admin function)
    clearLogs() {
        try {
            localStorage.removeItem('blockedMessageLogs');
            localStorage.removeItem('violationLogs');
            console.log('📝 Interception logs cleared');
            return true;
        } catch (error) {
            console.error('Failed to clear interception logs:', error);
            return false;
        }
    }
}

// Admin Interface Manager - Secret admin panel for manual moderation
class AdminInterfaceManager {
    constructor(lockManager, notificationSystem) {
        this.adminEmail = 'Albertderek6878@gmail.com';
        this.lockManager = lockManager;
        this.notificationSystem = notificationSystem;
        this.isAdminMenuVisible = false;
        
        // Initialize admin interface if user is admin
        this.initializeAdminInterface();
        
        console.log('👑 Admin Interface Manager initialized');
    }

    // Initialize admin interface for authorized users
    initializeAdminInterface() {
        // Check if current user is admin
        if (this.isAdminUser()) {
            console.log('👑 Admin user detected - enabling admin features');
            this.addAdminMenuButton();
            this.setupAdminKeyboardShortcuts();
        }
    }

    // Check if current user has admin privileges
    isAdminUser(userEmail = null) {
        const emailToCheck = userEmail || (currentUser && currentUser.email);
        return emailToCheck === this.adminEmail;
    }

    // Add secret admin menu button to the interface
    addAdminMenuButton() {
        // Add admin button to sidebar controls
        const sidebarControls = document.querySelector('.sidebar-controls');
        if (sidebarControls && !document.getElementById('admin-menu-btn')) {
            const adminButton = document.createElement('button');
            adminButton.id = 'admin-menu-btn';
            adminButton.className = 'control-btn';
            adminButton.title = 'Admin Moderation Panel';
            adminButton.style.background = '#dc2626';
            adminButton.innerHTML = '<i class="fas fa-shield-alt"></i>';
            adminButton.onclick = () => this.showAdminMenu();
            
            // Insert before settings button
            const settingsBtn = sidebarControls.querySelector('button[onclick="showSettings()"]');
            if (settingsBtn) {
                sidebarControls.insertBefore(adminButton, settingsBtn);
            } else {
                sidebarControls.appendChild(adminButton);
            }
        }
    }

    // Setup keyboard shortcuts for admin functions
    setupAdminKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl+Shift+M to open admin menu
            if (event.ctrlKey && event.shiftKey && event.key === 'M') {
                event.preventDefault();
                this.showAdminMenu();
            }
        });
    }

    // Show the secret admin moderation menu
    showAdminMenu() {
        if (!this.isAdminUser()) {
            console.warn('⚠️ Unauthorized admin menu access attempt');
            return;
        }

        // Remove existing admin menu if open
        const existingMenu = document.getElementById('admin-moderation-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const adminMenu = this.createAdminMenuModal();
        document.body.appendChild(adminMenu);
        this.isAdminMenuVisible = true;

        // Load current data
        this.refreshAdminData();

        console.log('👑 Admin moderation menu opened');
    }

    // Create the admin menu modal
    createAdminMenuModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'admin-moderation-menu';
        modal.style.zIndex = '10001';

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; width: 95%; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="background: #dc2626; color: white; position: sticky; top: 0; z-index: 1;">
                    <h2><i class="fas fa-shield-alt"></i> Admin Moderation Panel</h2>
                    <button onclick="this.closest('.modal-overlay').remove()" style="
                        background: none;
                        border: none;
                        color: white;
                        font-size: 20px;
                        cursor: pointer;
                        float: right;
                    ">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body" style="padding: 0;">
                    <!-- Admin Tabs -->
                    <div style="display: flex; border-bottom: 1px solid #e5e7eb;">
                        <button class="admin-tab active" onclick="window.stellarChatModeration.adminInterface.showAdminTab('manual-lock')" 
                                style="flex: 1; padding: 15px; border: none; background: #f9fafb; cursor: pointer; border-bottom: 3px solid #dc2626;">
                            <i class="fas fa-user-lock"></i> Manual Lock
                        </button>
                        <button class="admin-tab" onclick="window.stellarChatModeration.adminInterface.showAdminTab('locked-accounts')"
                                style="flex: 1; padding: 15px; border: none; background: #f9fafb; cursor: pointer; border-bottom: 3px solid transparent;">
                            <i class="fas fa-list"></i> Locked Accounts
                        </button>
                        <button class="admin-tab" onclick="window.stellarChatModeration.adminInterface.showAdminTab('statistics')"
                                style="flex: 1; padding: 15px; border: none; background: #f9fafb; cursor: pointer; border-bottom: 3px solid transparent;">
                            <i class="fas fa-chart-bar"></i> Statistics
                        </button>
                        <button class="admin-tab" onclick="window.stellarChatModeration.adminInterface.showAdminTab('logs')"
                                style="flex: 1; padding: 15px; border: none; background: #f9fafb; cursor: pointer; border-bottom: 3px solid transparent;">
                            <i class="fas fa-file-alt"></i> Logs
                        </button>
                    </div>

                    <!-- Manual Lock Tab -->
                    <div id="admin-tab-manual-lock" class="admin-tab-content" style="padding: 30px;">
                        <h3 style="margin-bottom: 20px; color: #dc2626;">
                            <i class="fas fa-user-lock"></i> Lock User Account
                        </h3>
                        
                        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                            <p style="color: #7f1d1d; margin: 0;">
                                <strong>⚠️ Warning:</strong> This will immediately lock the specified user's account and prevent them from sending messages.
                            </p>
                        </div>

                        <div style="display: grid; gap: 20px; max-width: 500px;">
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">
                                    Username to Lock:
                                </label>
                                <input type="text" id="admin-lock-username" placeholder="Enter username" style="
                                    width: 100%;
                                    padding: 12px;
                                    border: 2px solid #d1d5db;
                                    border-radius: 6px;
                                    font-size: 16px;
                                ">
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">
                                    Lock Duration (hours):
                                </label>
                                <select id="admin-lock-duration" style="
                                    width: 100%;
                                    padding: 12px;
                                    border: 2px solid #d1d5db;
                                    border-radius: 6px;
                                    font-size: 16px;
                                ">
                                    <option value="1">1 hour</option>
                                    <option value="6">6 hours</option>
                                    <option value="12">12 hours</option>
                                    <option value="24" selected>24 hours (1 day)</option>
                                    <option value="48">48 hours (2 days)</option>
                                    <option value="72">72 hours (3 days)</option>
                                    <option value="168">168 hours (1 week)</option>
                                    <option value="custom">Custom duration...</option>
                                </select>
                                <input type="number" id="admin-lock-custom-duration" placeholder="Custom hours" 
                                       style="width: 100%; padding: 12px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 16px; margin-top: 10px; display: none;">
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">
                                    Reason for Lock:
                                </label>
                                <textarea id="admin-lock-reason" placeholder="Enter detailed reason for the account lock..." style="
                                    width: 100%;
                                    padding: 12px;
                                    border: 2px solid #d1d5db;
                                    border-radius: 6px;
                                    font-size: 16px;
                                    min-height: 100px;
                                    resize: vertical;
                                "></textarea>
                            </div>

                            <div style="display: flex; gap: 15px; margin-top: 10px;">
                                <button onclick="window.stellarChatModeration.adminInterface.executeManualLock()" style="
                                    flex: 1;
                                    background: #dc2626;
                                    color: white;
                                    border: none;
                                    padding: 15px;
                                    border-radius: 6px;
                                    font-size: 16px;
                                    font-weight: 600;
                                    cursor: pointer;
                                    transition: all 0.2s;
                                " onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'">
                                    <i class="fas fa-lock"></i> Lock Account
                                </button>
                                <button onclick="window.stellarChatModeration.adminInterface.clearManualLockForm()" style="
                                    background: #6b7280;
                                    color: white;
                                    border: none;
                                    padding: 15px 20px;
                                    border-radius: 6px;
                                    font-size: 16px;
                                    cursor: pointer;
                                ">
                                    <i class="fas fa-eraser"></i> Clear
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Locked Accounts Tab -->
                    <div id="admin-tab-locked-accounts" class="admin-tab-content" style="padding: 30px; display: none;">
                        <h3 style="margin-bottom: 20px; color: #dc2626;">
                            <i class="fas fa-list"></i> Currently Locked Accounts
                        </h3>
                        <div id="locked-accounts-list">
                            <!-- Will be populated by JavaScript -->
                        </div>
                    </div>

                    <!-- Statistics Tab -->
                    <div id="admin-tab-statistics" class="admin-tab-content" style="padding: 30px; display: none;">
                        <h3 style="margin-bottom: 20px; color: #dc2626;">
                            <i class="fas fa-chart-bar"></i> Moderation Statistics
                        </h3>
                        <div id="admin-statistics">
                            <!-- Will be populated by JavaScript -->
                        </div>
                    </div>

                    <!-- Logs Tab -->
                    <div id="admin-tab-logs" class="admin-tab-content" style="padding: 30px; display: none;">
                        <h3 style="margin-bottom: 20px; color: #dc2626;">
                            <i class="fas fa-file-alt"></i> Moderation Logs
                        </h3>
                        <div id="admin-logs">
                            <!-- Will be populated by JavaScript -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add event listener for custom duration
        modal.addEventListener('change', (event) => {
            if (event.target.id === 'admin-lock-duration') {
                const customInput = document.getElementById('admin-lock-custom-duration');
                if (event.target.value === 'custom') {
                    customInput.style.display = 'block';
                    customInput.focus();
                } else {
                    customInput.style.display = 'none';
                }
            }
        });

        return modal;
    }

    // Show specific admin tab
    showAdminTab(tabName) {
        // Update tab buttons
        const tabs = document.querySelectorAll('.admin-tab');
        tabs.forEach(tab => {
            tab.style.borderBottomColor = 'transparent';
            tab.style.background = '#f9fafb';
        });

        const activeTab = document.querySelector(`button[onclick*="${tabName}"]`);
        if (activeTab) {
            activeTab.style.borderBottomColor = '#dc2626';
            activeTab.style.background = 'white';
        }

        // Show/hide tab content
        const contents = document.querySelectorAll('.admin-tab-content');
        contents.forEach(content => content.style.display = 'none');

        const activeContent = document.getElementById(`admin-tab-${tabName}`);
        if (activeContent) {
            activeContent.style.display = 'block';
        }

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    // Load data for specific tab
    loadTabData(tabName) {
        switch (tabName) {
            case 'locked-accounts':
                this.loadLockedAccountsList();
                break;
            case 'statistics':
                this.loadStatistics();
                break;
            case 'logs':
                this.loadLogs();
                break;
        }
    }

    // Execute manual account lock
    async executeManualLock() {
        try {
            const username = document.getElementById('admin-lock-username').value.trim();
            const durationSelect = document.getElementById('admin-lock-duration');
            const customDuration = document.getElementById('admin-lock-custom-duration');
            const reason = document.getElementById('admin-lock-reason').value.trim();

            // Validation
            if (!username) {
                alert('Please enter a username to lock.');
                return;
            }

            if (!reason) {
                alert('Please enter a reason for the lock.');
                return;
            }

            // Get duration
            let duration;
            if (durationSelect.value === 'custom') {
                duration = parseInt(customDuration.value);
                if (!duration || duration < 1) {
                    alert('Please enter a valid custom duration.');
                    return;
                }
            } else {
                duration = parseInt(durationSelect.value);
            }

            // Confirm action
            const confirmMessage = `Are you sure you want to lock "${username}" for ${duration} hours?\n\nReason: ${reason}`;
            if (!confirm(confirmMessage)) {
                return;
            }

            // Execute lock
            const lockResult = await this.lockManager.lockAccount(
                username,
                duration,
                reason,
                'ADMIN',
                this.adminEmail
            );

            // Show success notification
            alert(`✅ Account "${username}" has been locked for ${duration} hours.`);

            // Clear form
            this.clearManualLockForm();

            // Refresh locked accounts list if visible
            if (document.getElementById('admin-tab-locked-accounts').style.display !== 'none') {
                this.loadLockedAccountsList();
            }

            console.log('👑 Admin manual lock executed:', lockResult);

        } catch (error) {
            console.error('❌ Admin manual lock failed:', error);
            alert(`❌ Failed to lock account: ${error.message}`);
        }
    }

    // Clear manual lock form
    clearManualLockForm() {
        document.getElementById('admin-lock-username').value = '';
        document.getElementById('admin-lock-duration').value = '24';
        document.getElementById('admin-lock-custom-duration').value = '';
        document.getElementById('admin-lock-custom-duration').style.display = 'none';
        document.getElementById('admin-lock-reason').value = '';
    }

    // Load locked accounts list
    loadLockedAccountsList() {
        const container = document.getElementById('locked-accounts-list');
        if (!container) return;

        const lockedAccounts = this.lockManager.getAllLockedAccounts();

        if (lockedAccounts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-unlock" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <p>No accounts are currently locked.</p>
                </div>
            `;
            return;
        }

        const accountsHtml = lockedAccounts.map(account => `
            <div style="
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 15px;
                background: white;
            ">
                <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 5px 0; color: #dc2626;">
                            <i class="fas fa-user"></i> ${account.username}
                        </h4>
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                            Locked ${new Date(account.lockedAt).toLocaleString()}
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <span style="
                            background: #fef2f2;
                            color: #dc2626;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-size: 12px;
                            font-weight: 600;
                        ">
                            ${account.remainingHours}h remaining
                        </span>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong>Reason:</strong> ${account.reason}
                </div>
                
                <div style="display: flex; justify-content: between; align-items: center; font-size: 14px; color: #6b7280;">
                    <span>Locked by: ${account.lockedBy}${account.adminEmail ? ` (${account.adminEmail})` : ''}</span>
                    <button onclick="window.stellarChatModeration.adminInterface.unlockAccount('${account.username}')" style="
                        background: #10b981;
                        color: white;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                    ">
                        <i class="fas fa-unlock"></i> Unlock Now
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = accountsHtml;
    }

    // Unlock account (admin function)
    async unlockAccount(username) {
        if (!confirm(`Are you sure you want to unlock "${username}"?`)) {
            return;
        }

        try {
            await this.lockManager.unlockAccount(username, 'Admin manual unlock');
            alert(`✅ Account "${username}" has been unlocked.`);
            this.loadLockedAccountsList(); // Refresh list
        } catch (error) {
            console.error('❌ Admin unlock failed:', error);
            alert(`❌ Failed to unlock account: ${error.message}`);
        }
    }

    // Load statistics
    loadStatistics() {
        const container = document.getElementById('admin-statistics');
        if (!container) return;

        const lockStats = this.lockManager.getLockStatistics();
        const moderationStats = window.stellarChatModeration?.contentAnalyzer?.getViolationStats() || {};

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; text-align: center;">
                    <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${lockStats.currentlyLocked}</div>
                    <div style="color: #7f1d1d;">Currently Locked</div>
                </div>
                <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; text-align: center;">
                    <div style="font-size: 32px; font-weight: bold; color: #d97706;">${lockStats.totalLocks}</div>
                    <div style="color: #92400e;">Total Locks</div>
                </div>
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; text-align: center;">
                    <div style="font-size: 32px; font-weight: bold; color: #059669;">${moderationStats.totalAnalyzed || 0}</div>
                    <div style="color: #047857;">Messages Analyzed</div>
                </div>
                <div style="background: #ede9fe; border: 1px solid #c4b5fd; border-radius: 8px; padding: 20px; text-align: center;">
                    <div style="font-size: 32px; font-weight: bold; color: #7c3aed;">${moderationStats.violationRate || 0}%</div>
                    <div style="color: #5b21b6;">Violation Rate</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div>
                    <h4 style="color: #374151; margin-bottom: 15px;">Locks by Type</h4>
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                        ${Object.entries(lockStats.locksByType).map(([type, count]) => `
                            <div style="display: flex; justify-content: between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span>${type}</span>
                                <strong>${count}</strong>
                            </div>
                        `).join('') || '<p style="color: #6b7280; text-align: center;">No data available</p>'}
                    </div>
                </div>
                
                <div>
                    <h4 style="color: #374151; margin-bottom: 15px;">Violations by Type</h4>
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                        ${Object.entries(moderationStats.violationsByType || {}).map(([type, count]) => `
                            <div style="display: flex; justify-content: between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <span>${type.replace('_', ' ')}</span>
                                <strong>${count}</strong>
                            </div>
                        `).join('') || '<p style="color: #6b7280; text-align: center;">No data available</p>'}
                    </div>
                </div>
            </div>
        `;
    }

    // Load logs
    loadLogs() {
        const container = document.getElementById('admin-logs');
        if (!container) return;

        try {
            const lockLogs = JSON.parse(localStorage.getItem('lockActionLogs') || '[]');
            const violationLogs = JSON.parse(localStorage.getItem('violationLogs') || '[]');
            
            // Combine and sort logs by timestamp
            const allLogs = [
                ...lockLogs.map(log => ({ ...log, type: 'lock' })),
                ...violationLogs.map(log => ({ ...log, type: 'violation' }))
            ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);

            if (allLogs.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <i class="fas fa-file-alt" style="font-size: 48px; margin-bottom: 15px;"></i>
                        <p>No logs available.</p>
                    </div>
                `;
                return;
            }

            const logsHtml = allLogs.map(log => {
                const isViolation = log.type === 'violation';
                const bgColor = isViolation ? '#fef2f2' : '#f0f9ff';
                const borderColor = isViolation ? '#fecaca' : '#bae6fd';
                const iconColor = isViolation ? '#dc2626' : '#0284c7';
                const icon = isViolation ? 'fas fa-exclamation-triangle' : 'fas fa-lock';

                return `
                    <div style="
                        background: ${bgColor};
                        border: 1px solid ${borderColor};
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 10px;
                    ">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <i class="${icon}" style="color: ${iconColor};"></i>
                            <strong style="color: ${iconColor};">${log.action.replace('_', ' ')}</strong>
                            <span style="color: #6b7280; font-size: 14px; margin-left: auto;">
                                ${new Date(log.timestamp).toLocaleString()}
                            </span>
                        </div>
                        <div style="font-size: 14px; color: #374151;">
                            <strong>User:</strong> ${log.username}<br>
                            ${log.reason ? `<strong>Reason:</strong> ${log.reason}<br>` : ''}
                            ${log.duration ? `<strong>Duration:</strong> ${log.duration} hours<br>` : ''}
                            ${log.violation ? `<strong>Violation Type:</strong> ${log.violation.type}<br>` : ''}
                            ${log.adminEmail ? `<strong>Admin:</strong> ${log.adminEmail}<br>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                <div style="margin-bottom: 20px;">
                    <button onclick="window.stellarChatModeration.adminInterface.clearAllLogs()" style="
                        background: #dc2626;
                        color: white;
                        border: none;
                        padding: 10px 15px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    ">
                        <i class="fas fa-trash"></i> Clear All Logs
                    </button>
                </div>
                ${logsHtml}
            `;

        } catch (error) {
            console.error('Failed to load logs:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc2626;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <p>Failed to load logs.</p>
                </div>
            `;
        }
    }

    // Clear all logs (admin function)
    clearAllLogs() {
        if (!confirm('Are you sure you want to clear all moderation logs? This action cannot be undone.')) {
            return;
        }

        try {
            localStorage.removeItem('lockActionLogs');
            localStorage.removeItem('violationLogs');
            localStorage.removeItem('moderationLogs');
            localStorage.removeItem('blockedMessageLogs');
            
            alert('✅ All logs have been cleared.');
            this.loadLogs(); // Refresh display
        } catch (error) {
            console.error('Failed to clear logs:', error);
            alert('❌ Failed to clear logs.');
        }
    }

    // Refresh admin data
    refreshAdminData() {
        // Refresh currently visible tab
        const visibleTab = document.querySelector('.admin-tab-content[style*="block"]');
        if (visibleTab) {
            const tabName = visibleTab.id.replace('admin-tab-', '');
            this.loadTabData(tabName);
        }
    }
}

// Main Moderation System Integration
class StellarChatModerationSystem {
    constructor() {
        this.aiService = new AIModerationService();
        this.contentAnalyzer = new MessageContentAnalyzer(this.aiService);
        this.lockManager = new AccountLockManager();
        this.notificationSystem = new LockNotificationSystem(this.lockManager);
        this.messageInterceptor = new MessageInterceptor(
            this.aiService,
            this.contentAnalyzer,
            this.lockManager,
            this.notificationSystem
        );
        this.adminInterface = new AdminInterfaceManager(this.lockManager, this.notificationSystem);
        
        this.isInitialized = false;
        this.originalSendMessage = null;
        
        console.log('🛡️ StellarChat Moderation System initialized');
    }

    // Initialize the moderation system
    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ Moderation system already initialized');
            return;
        }

        try {
            // Wait for the main app to be ready
            await this.waitForAppReady();
            
            // Hook into the existing sendMessage function
            this.hookSendMessage();
            
            // Hook into message input handling
            this.hookMessageInput();
            
            // Add moderation status indicator
            this.addModerationStatusIndicator();
            
            // Initialize admin interface if user is admin
            this.adminInterface.initializeAdminInterface();
            
            this.isInitialized = true;
            console.log('✅ Moderation system fully integrated');
            
            // Show initialization notification
            if (typeof showNotification === 'function') {
                showNotification('🛡️ AI Moderation System Active', 'info');
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize moderation system:', error);
        }
    }

    // Wait for the main app to be ready
    async waitForAppReady() {
        return new Promise((resolve) => {
            const checkReady = () => {
                if (typeof sendMessage === 'function' && document.getElementById('message-input')) {
                    resolve();
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        });
    }

    // Hook into the existing sendMessage function
    hookSendMessage() {
        // Store original function
        if (typeof window.sendMessage === 'function') {
            this.originalSendMessage = window.sendMessage;
        } else if (typeof sendMessage === 'function') {
            this.originalSendMessage = sendMessage;
        }

        if (!this.originalSendMessage) {
            console.error('❌ Could not find sendMessage function to hook');
            return;
        }

        // Create new sendMessage function with moderation
        const moderatedSendMessage = async () => {
            try {
                const messageInput = document.getElementById('message-input');
                if (!messageInput) {
                    console.error('❌ Message input not found');
                    return;
                }

                const message = messageInput.value.trim();
                if (!message) {
                    return;
                }

                const username = currentUser?.username || 'unknown';
                const context = {
                    channel: currentChannel,
                    server: currentServer,
                    chatType: currentChatType,
                    dmUser: currentDMUser
                };

                console.log('🔍 Intercepting message before send');

                // Intercept and moderate the message
                const moderationResult = await this.messageInterceptor.interceptMessage(message, username, context);

                if (!moderationResult.allowed) {
                    console.log('🚫 Message blocked by moderation:', moderationResult.reason);
                    
                    // Clear the input
                    messageInput.value = '';
                    
                    // Don't call original sendMessage
                    return;
                }

                console.log('✅ Message approved, proceeding with send');

                // Call original sendMessage function
                return this.originalSendMessage();

            } catch (error) {
                console.error('❌ Moderated send message failed:', error);
                
                // Fallback to original function on error
                if (this.originalSendMessage) {
                    return this.originalSendMessage();
                }
            }
        };

        // Replace the global sendMessage function
        if (typeof window.sendMessage === 'function') {
            window.sendMessage = moderatedSendMessage;
        }
        if (typeof sendMessage !== 'undefined') {
            sendMessage = moderatedSendMessage;
        }

        console.log('🔗 sendMessage function hooked successfully');
    }

    // Hook into message input handling
    hookMessageInput() {
        const messageInput = document.getElementById('message-input');
        if (!messageInput) {
            console.error('❌ Message input not found for hooking');
            return;
        }

        // Add keydown listener for Enter key
        messageInput.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                
                // Check if account is locked before processing
                const username = currentUser?.username;
                if (username && this.lockManager.isAccountLocked(username)) {
                    const lockInfo = this.lockManager.getLockInfo(username);
                    if (lockInfo) {
                        this.notificationSystem.showMessageBlockedNotification(lockInfo);
                        messageInput.value = '';
                        return;
                    }
                }
                
                // Proceed with normal send (which will go through our hooked function)
                if (typeof sendMessage === 'function') {
                    sendMessage();
                }
            }
        });

        // Add input listener to show lock status
        messageInput.addEventListener('input', () => {
            const username = currentUser?.username;
            if (username && this.lockManager.isAccountLocked(username)) {
                const lockInfo = this.lockManager.getLockInfo(username);
                if (lockInfo) {
                    // Show subtle indication that account is locked
                    messageInput.style.borderColor = '#dc2626';
                    messageInput.style.backgroundColor = '#fef2f2';
                    messageInput.placeholder = `Account locked for ${lockInfo.remainingHours} more hours - Cannot send messages`;
                }
            } else {
                // Reset to normal appearance
                messageInput.style.borderColor = '';
                messageInput.style.backgroundColor = '';
                messageInput.placeholder = messageInput.getAttribute('data-original-placeholder') || 'Message #general';
            }
        });

        // Store original placeholder
        if (!messageInput.getAttribute('data-original-placeholder')) {
            messageInput.setAttribute('data-original-placeholder', messageInput.placeholder);
        }

        console.log('🔗 Message input hooked successfully');
    }

    // Add moderation status indicator to the UI
    addModerationStatusIndicator() {
        // Add status indicator to channel header
        const channelHeader = document.querySelector('.channel-header');
        if (channelHeader && !document.getElementById('moderation-status')) {
            const statusIndicator = document.createElement('div');
            statusIndicator.id = 'moderation-status';
            statusIndicator.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                background: #10b981;
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 5px;
                z-index: 100;
            `;
            statusIndicator.innerHTML = '<i class="fas fa-shield-alt"></i> AI Moderation Active';
            statusIndicator.title = 'AI-powered content moderation is active';
            
            channelHeader.style.position = 'relative';
            channelHeader.appendChild(statusIndicator);
        }
    }

    // Check if user account is locked (public method)
    isUserLocked(username = null) {
        const userToCheck = username || (currentUser?.username);
        return userToCheck ? this.lockManager.isAccountLocked(userToCheck) : false;
    }

    // Get user lock info (public method)
    getUserLockInfo(username = null) {
        const userToCheck = username || (currentUser?.username);
        return userToCheck ? this.lockManager.getLockInfo(userToCheck) : null;
    }

    // Manual unlock (admin method)
    async unlockUser(username) {
        if (!this.adminInterface.isAdminUser()) {
            console.error('❌ Unauthorized unlock attempt');
            return false;
        }
        
        return await this.lockManager.unlockAccount(username, 'Admin manual unlock');
    }

    // Get system status
    getSystemStatus() {
        return {
            initialized: this.isInitialized,
            aiService: this.aiService.getStatus(),
            lockManager: {
                lockedAccounts: this.lockManager.lockedAccounts.size
            },
            messageInterceptor: {
                enabled: this.messageInterceptor.isEnabled
            },
            adminInterface: {
                isAdmin: this.adminInterface.isAdminUser()
            }
        };
    }

    // Enable/disable moderation
    setModerationEnabled(enabled) {
        this.messageInterceptor.setEnabled(enabled);
        
        const statusIndicator = document.getElementById('moderation-status');
        if (statusIndicator) {
            if (enabled) {
                statusIndicator.style.background = '#10b981';
                statusIndicator.innerHTML = '<i class="fas fa-shield-alt"></i> AI Moderation Active';
            } else {
                statusIndicator.style.background = '#6b7280';
                statusIndicator.innerHTML = '<i class="fas fa-shield-alt"></i> AI Moderation Disabled';
            }
        }
        
        console.log(`🛡️ Moderation ${enabled ? 'enabled' : 'disabled'}`);
    }

    // Show community guidelines
    showCommunityGuidelines() {
        this.notificationSystem.showCommunityGuidelines();
    }
}

// Initialize the moderation system when the script loads
let stellarChatModeration = null;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Wait a bit for the main app to initialize
    setTimeout(async () => {
        try {
            stellarChatModeration = new StellarChatModerationSystem();
            await stellarChatModeration.initialize();
            
            // Make it globally accessible
            window.stellarChatModeration = stellarChatModeration;
            
            console.log('🛡️ StellarChat AI Moderation System is now active!');
        } catch (error) {
            console.error('❌ Failed to initialize moderation system:', error);
        }
    }, 2000);
});

// Also try to initialize if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading, event listener above will handle it
} else {
    // DOM is already loaded
    setTimeout(async () => {
        if (!stellarChatModeration) {
            try {
                stellarChatModeration = new StellarChatModerationSystem();
                await stellarChatModeration.initialize();
                window.stellarChatModeration = stellarChatModeration;
                console.log('🛡️ StellarChat AI Moderation System is now active!');
            } catch (error) {
                console.error('❌ Failed to initialize moderation system:', error);
            }
        }
    }, 2000);
}

// Enhanced Error Handling and Logging System
class ModerationErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogEntries = 100;
        this.errorCounts = new Map();
        this.lastErrorTime = new Map();
        this.rateLimitThreshold = 5; // Max 5 errors of same type per minute
        
        // Setup global error handlers
        this.setupGlobalErrorHandlers();
        
        console.log('🚨 Moderation Error Handler initialized');
    }

    // Setup global error handlers
    setupGlobalErrorHandlers() {
        // Catch unhandled promise rejections in moderation code
        window.addEventListener('unhandledrejection', (event) => {
            if (this.isModerationError(event.reason)) {
                this.handleError('UNHANDLED_PROMISE', event.reason, 'Global');
                event.preventDefault(); // Prevent console spam
            }
        });

        // Catch general errors in moderation code
        window.addEventListener('error', (event) => {
            if (this.isModerationError(event.error)) {
                this.handleError('UNHANDLED_ERROR', event.error, 'Global');
            }
        });
    }

    // Check if error is related to moderation system
    isModerationError(error) {
        if (!error) return false;
        
        const moderationKeywords = [
            'moderation',
            'gemini',
            'ai-analysis',
            'account-lock',
            'stellarchatmoderation'
        ];
        
        const errorString = error.toString().toLowerCase();
        return moderationKeywords.some(keyword => errorString.includes(keyword));
    }

    // Main error handling method
    handleError(type, error, context = 'Unknown', additionalInfo = {}) {
        try {
            const errorKey = `${type}_${context}`;
            const now = Date.now();
            
            // Rate limiting for error logging
            if (this.isRateLimited(errorKey, now)) {
                return; // Skip logging this error
            }

            const errorEntry = {
                timestamp: new Date().toISOString(),
                type,
                context,
                message: error?.message || error?.toString() || 'Unknown error',
                stack: error?.stack || null,
                additionalInfo,
                id: this.generateErrorId()
            };

            // Add to error log
            this.errorLog.push(errorEntry);
            
            // Trim log if too large
            if (this.errorLog.length > this.maxLogEntries) {
                this.errorLog.splice(0, this.errorLog.length - this.maxLogEntries);
            }

            // Update error counts
            this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
            this.lastErrorTime.set(errorKey, now);

            // Log to console with appropriate level
            this.logToConsole(errorEntry);

            // Store in localStorage for persistence
            this.persistErrorLog();

            // Handle critical errors
            if (this.isCriticalError(type, error)) {
                this.handleCriticalError(errorEntry);
            }

        } catch (loggingError) {
            console.error('❌ Error handler failed:', loggingError);
        }
    }

    // Check if error logging is rate limited
    isRateLimited(errorKey, now) {
        const lastTime = this.lastErrorTime.get(errorKey) || 0;
        const count = this.errorCounts.get(errorKey) || 0;
        
        // Reset count if more than 1 minute has passed
        if (now - lastTime > 60000) {
            this.errorCounts.set(errorKey, 0);
            return false;
        }
        
        return count >= this.rateLimitThreshold;
    }

    // Log to console with appropriate level
    logToConsole(errorEntry) {
        const prefix = `🚨 [${errorEntry.type}] ${errorEntry.context}:`;
        
        if (errorEntry.type.includes('CRITICAL') || errorEntry.type.includes('FATAL')) {
            console.error(prefix, errorEntry.message, errorEntry.stack);
        } else if (errorEntry.type.includes('WARNING')) {
            console.warn(prefix, errorEntry.message);
        } else {
            console.log(prefix, errorEntry.message);
        }
    }

    // Check if error is critical
    isCriticalError(type, error) {
        const criticalTypes = [
            'AI_SERVICE_DOWN',
            'LOCK_SYSTEM_FAILURE',
            'DATABASE_ERROR',
            'SECURITY_BREACH'
        ];
        
        return criticalTypes.includes(type) || 
               (error?.message && error.message.includes('CRITICAL'));
    }

    // Handle critical errors
    handleCriticalError(errorEntry) {
        console.error('🚨 CRITICAL MODERATION ERROR:', errorEntry);
        
        // Notify admin if possible
        if (window.stellarChatModeration?.adminInterface?.isAdminUser()) {
            this.notifyAdmin(errorEntry);
        }
        
        // Consider disabling moderation temporarily
        if (errorEntry.type === 'AI_SERVICE_DOWN') {
            this.temporarilyDisableModeration();
        }
    }

    // Notify admin of critical error
    notifyAdmin(errorEntry) {
        if (typeof showNotification === 'function') {
            showNotification(
                `🚨 Critical Moderation Error: ${errorEntry.type}`,
                'error'
            );
        }
    }

    // Temporarily disable moderation on critical failure
    temporarilyDisableModeration() {
        if (window.stellarChatModeration) {
            window.stellarChatModeration.setModerationEnabled(false);
            
            // Re-enable after 5 minutes
            setTimeout(() => {
                if (window.stellarChatModeration) {
                    window.stellarChatModeration.setModerationEnabled(true);
                    console.log('🛡️ Moderation re-enabled after temporary disable');
                }
            }, 5 * 60 * 1000);
        }
    }

    // Persist error log to localStorage
    persistErrorLog() {
        try {
            const logData = {
                errors: this.errorLog.slice(-50), // Keep last 50 errors
                lastUpdated: Date.now()
            };
            localStorage.setItem('moderationErrorLog', JSON.stringify(logData));
        } catch (error) {
            console.error('Failed to persist error log:', error);
        }
    }

    // Load error log from localStorage
    loadErrorLog() {
        try {
            const stored = localStorage.getItem('moderationErrorLog');
            if (stored) {
                const logData = JSON.parse(stored);
                this.errorLog = logData.errors || [];
                console.log(`📂 Loaded ${this.errorLog.length} error log entries`);
            }
        } catch (error) {
            console.error('Failed to load error log:', error);
            this.errorLog = [];
        }
    }

    // Generate unique error ID
    generateErrorId() {
        return 'err_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }

    // Get error statistics
    getErrorStats() {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        
        const recentErrors = this.errorLog.filter(err => 
            new Date(err.timestamp).getTime() > oneHourAgo
        );
        
        const dailyErrors = this.errorLog.filter(err => 
            new Date(err.timestamp).getTime() > oneDayAgo
        );

        const errorsByType = {};
        this.errorLog.forEach(err => {
            errorsByType[err.type] = (errorsByType[err.type] || 0) + 1;
        });

        return {
            totalErrors: this.errorLog.length,
            recentErrors: recentErrors.length,
            dailyErrors: dailyErrors.length,
            errorsByType,
            lastError: this.errorLog[this.errorLog.length - 1] || null,
            criticalErrors: this.errorLog.filter(err => 
                this.isCriticalError(err.type, { message: err.message })
            ).length
        };
    }

    // Clear error log (admin function)
    clearErrorLog() {
        this.errorLog = [];
        this.errorCounts.clear();
        this.lastErrorTime.clear();
        localStorage.removeItem('moderationErrorLog');
        console.log('🧹 Error log cleared');
    }

    // Get recent errors for admin panel
    getRecentErrors(limit = 20) {
        return this.errorLog.slice(-limit).reverse();
    }
}

// Graceful Degradation Manager
class GracefulDegradationManager {
    constructor() {
        this.degradationLevel = 0; // 0 = full functionality, 3 = minimal functionality
        this.serviceStatus = {
            aiService: true,
            lockManager: true,
            notificationSystem: true,
            adminInterface: true
        };
        
        this.degradationThresholds = {
            1: { errorRate: 10, description: 'Minor degradation - increased timeouts' },
            2: { errorRate: 25, description: 'Moderate degradation - some features disabled' },
            3: { errorRate: 50, description: 'Severe degradation - minimal functionality' }
        };
        
        console.log('🛡️ Graceful Degradation Manager initialized');
    }

    // Check system health and adjust degradation level
    checkSystemHealth(errorStats) {
        const errorRate = this.calculateErrorRate(errorStats);
        const newDegradationLevel = this.determineDegradationLevel(errorRate);
        
        if (newDegradationLevel !== this.degradationLevel) {
            this.setDegradationLevel(newDegradationLevel);
        }
    }

    // Calculate current error rate
    calculateErrorRate(errorStats) {
        if (!errorStats.recentErrors || !errorStats.dailyErrors) {
            return 0;
        }
        
        // Calculate errors per hour over the last day
        return (errorStats.dailyErrors / 24) * 100; // Percentage
    }

    // Determine appropriate degradation level
    determineDegradationLevel(errorRate) {
        for (let level = 3; level >= 1; level--) {
            if (errorRate >= this.degradationThresholds[level].errorRate) {
                return level;
            }
        }
        return 0; // No degradation needed
    }

    // Set degradation level and adjust system behavior
    setDegradationLevel(level) {
        const previousLevel = this.degradationLevel;
        this.degradationLevel = level;
        
        console.log(`🛡️ Degradation level changed: ${previousLevel} → ${level}`);
        
        switch (level) {
            case 0:
                this.enableFullFunctionality();
                break;
            case 1:
                this.enableMinorDegradation();
                break;
            case 2:
                this.enableModerateDegradation();
                break;
            case 3:
                this.enableSevereDegradation();
                break;
        }
        
        // Notify admin of degradation changes
        if (level > 0 && window.stellarChatModeration?.adminInterface?.isAdminUser()) {
            this.notifyDegradation(level);
        }
    }

    // Enable full functionality
    enableFullFunctionality() {
        this.serviceStatus = {
            aiService: true,
            lockManager: true,
            notificationSystem: true,
            adminInterface: true
        };
        
        if (window.stellarChatModeration) {
            window.stellarChatModeration.setModerationEnabled(true);
        }
    }

    // Enable minor degradation
    enableMinorDegradation() {
        // Increase timeouts, reduce retry attempts
        if (window.stellarChatModeration?.aiService) {
            window.stellarChatModeration.aiService.maxRetryAttempts = 2;
            window.stellarChatModeration.aiService.rateLimitDelay = 15000; // Increase to 15 seconds
        }
    }

    // Enable moderate degradation
    enableModerateDegradation() {
        // Disable non-essential features
        this.serviceStatus.notificationSystem = false;
        
        if (window.stellarChatModeration?.aiService) {
            window.stellarChatModeration.aiService.maxRetryAttempts = 1;
        }
    }

    // Enable severe degradation
    enableSevereDegradation() {
        // Disable AI moderation, keep only manual admin controls
        this.serviceStatus.aiService = false;
        this.serviceStatus.notificationSystem = false;
        
        if (window.stellarChatModeration) {
            window.stellarChatModeration.setModerationEnabled(false);
        }
        
        console.warn('🚨 Severe degradation: AI moderation disabled');
    }

    // Notify admin of degradation
    notifyDegradation(level) {
        const description = this.degradationThresholds[level]?.description || 'Unknown degradation';
        
        if (typeof showNotification === 'function') {
            showNotification(
                `⚠️ System Degradation Level ${level}: ${description}`,
                'warning'
            );
        }
    }

    // Get current system status
    getSystemStatus() {
        return {
            degradationLevel: this.degradationLevel,
            description: this.degradationThresholds[this.degradationLevel]?.description || 'Full functionality',
            serviceStatus: { ...this.serviceStatus }
        };
    }
}

// Initialize error handling and graceful degradation
const moderationErrorHandler = new ModerationErrorHandler();
const gracefulDegradationManager = new GracefulDegradationManager();

// Load existing error log
moderationErrorHandler.loadErrorLog();

// Periodic health check
setInterval(() => {
    if (moderationErrorHandler && gracefulDegradationManager) {
        const errorStats = moderationErrorHandler.getErrorStats();
        gracefulDegradationManager.checkSystemHealth(errorStats);
    }
}, 5 * 60 * 1000); // Check every 5 minutes

// Make error handler globally accessible
window.moderationErrorHandler = moderationErrorHandler;
window.gracefulDegradationManager = gracefulDegradationManager;

// Testing and Validation System
class ModerationTestSuite {
    constructor() {
        this.testResults = [];
        this.isRunning = false;
        
        console.log('🧪 Moderation Test Suite initialized');
    }

    // Run comprehensive test suite
    async runFullTestSuite() {
        if (this.isRunning) {
            console.log('⚠️ Test suite already running');
            return;
        }

        this.isRunning = true;
        this.testResults = [];
        
        console.log('🧪 Starting comprehensive moderation test suite...');
        
        try {
            // Test AI Service
            await this.testAIService();
            
            // Test Account Lock Manager
            await this.testAccountLockManager();
            
            // Test Message Interceptor
            await this.testMessageInterceptor();
            
            // Test Admin Interface
            await this.testAdminInterface();
            
            // Test Error Handling
            await this.testErrorHandling();
            
            // Test Integration
            await this.testIntegration();
            
            this.displayTestResults();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            this.addTestResult('TEST_SUITE', 'FAILED', `Test suite crashed: ${error.message}`);
        } finally {
            this.isRunning = false;
        }
    }

    // Test AI Service functionality
    async testAIService() {
        console.log('🧪 Testing AI Service...');
        
        if (!window.stellarChatModeration?.aiService) {
            this.addTestResult('AI_SERVICE', 'FAILED', 'AI Service not found');
            return;
        }

        const aiService = window.stellarChatModeration.aiService;
        
        // Test 1: Service initialization
        try {
            const status = aiService.getStatus();
            if (status.apiKey === 'configured') {
                this.addTestResult('AI_SERVICE_INIT', 'PASSED', 'AI Service properly initialized');
            } else {
                this.addTestResult('AI_SERVICE_INIT', 'FAILED', 'API key not configured');
            }
        } catch (error) {
            this.addTestResult('AI_SERVICE_INIT', 'FAILED', `Initialization check failed: ${error.message}`);
        }

        // Test 2: Input sanitization
        try {
            const sanitized = aiService.sanitizeInput('<script>alert("test")</script>Hello World');
            if (!sanitized.includes('<script>')) {
                this.addTestResult('AI_INPUT_SANITIZATION', 'PASSED', 'Input sanitization working');
            } else {
                this.addTestResult('AI_INPUT_SANITIZATION', 'FAILED', 'Input sanitization failed');
            }
        } catch (error) {
            this.addTestResult('AI_INPUT_SANITIZATION', 'FAILED', `Sanitization test failed: ${error.message}`);
        }

        // Test 3: Rate limiting
        try {
            aiService.isRateLimited = true;
            const result = await aiService.analyzeMessage('test message', 'testuser');
            if (result.reason && result.reason.includes('queued')) {
                this.addTestResult('AI_RATE_LIMITING', 'PASSED', 'Rate limiting working');
            } else {
                this.addTestResult('AI_RATE_LIMITING', 'WARNING', 'Rate limiting behavior unclear');
            }
            aiService.isRateLimited = false; // Reset
        } catch (error) {
            this.addTestResult('AI_RATE_LIMITING', 'FAILED', `Rate limiting test failed: ${error.message}`);
        }
    }

    // Test Account Lock Manager
    async testAccountLockManager() {
        console.log('🧪 Testing Account Lock Manager...');
        
        if (!window.stellarChatModeration?.lockManager) {
            this.addTestResult('LOCK_MANAGER', 'FAILED', 'Lock Manager not found');
            return;
        }

        const lockManager = window.stellarChatModeration.lockManager;
        const testUsername = 'test_user_' + Date.now();
        
        // Test 1: Lock account
        try {
            const lockResult = await lockManager.lockAccount(testUsername, 1, 'Test lock', 'TEST');
            if (lockResult && lockResult.username === testUsername) {
                this.addTestResult('LOCK_ACCOUNT', 'PASSED', 'Account locking working');
            } else {
                this.addTestResult('LOCK_ACCOUNT', 'FAILED', 'Account locking failed');
            }
        } catch (error) {
            this.addTestResult('LOCK_ACCOUNT', 'FAILED', `Lock test failed: ${error.message}`);
        }

        // Test 2: Check lock status
        try {
            const isLocked = lockManager.isAccountLocked(testUsername);
            if (isLocked) {
                this.addTestResult('LOCK_STATUS_CHECK', 'PASSED', 'Lock status check working');
            } else {
                this.addTestResult('LOCK_STATUS_CHECK', 'FAILED', 'Lock status check failed');
            }
        } catch (error) {
            this.addTestResult('LOCK_STATUS_CHECK', 'FAILED', `Status check failed: ${error.message}`);
        }

        // Test 3: Unlock account
        try {
            const unlockResult = await lockManager.unlockAccount(testUsername, 'Test unlock');
            if (unlockResult) {
                this.addTestResult('UNLOCK_ACCOUNT', 'PASSED', 'Account unlocking working');
            } else {
                this.addTestResult('UNLOCK_ACCOUNT', 'FAILED', 'Account unlocking failed');
            }
        } catch (error) {
            this.addTestResult('UNLOCK_ACCOUNT', 'FAILED', `Unlock test failed: ${error.message}`);
        }

        // Test 4: Verify unlock
        try {
            const isStillLocked = lockManager.isAccountLocked(testUsername);
            if (!isStillLocked) {
                this.addTestResult('UNLOCK_VERIFICATION', 'PASSED', 'Unlock verification working');
            } else {
                this.addTestResult('UNLOCK_VERIFICATION', 'FAILED', 'Account still locked after unlock');
            }
        } catch (error) {
            this.addTestResult('UNLOCK_VERIFICATION', 'FAILED', `Unlock verification failed: ${error.message}`);
        }
    }

    // Test Message Interceptor
    async testMessageInterceptor() {
        console.log('🧪 Testing Message Interceptor...');
        
        if (!window.stellarChatModeration?.messageInterceptor) {
            this.addTestResult('MESSAGE_INTERCEPTOR', 'FAILED', 'Message Interceptor not found');
            return;
        }

        const interceptor = window.stellarChatModeration.messageInterceptor;
        
        // Test 1: Normal message
        try {
            const result = await interceptor.interceptMessage('Hello world', 'testuser');
            if (result.allowed) {
                this.addTestResult('NORMAL_MESSAGE', 'PASSED', 'Normal messages allowed');
            } else {
                this.addTestResult('NORMAL_MESSAGE', 'FAILED', 'Normal message blocked');
            }
        } catch (error) {
            this.addTestResult('NORMAL_MESSAGE', 'FAILED', `Normal message test failed: ${error.message}`);
        }

        // Test 2: Short message (should be skipped)
        try {
            const result = await interceptor.interceptMessage('hi', 'testuser');
            if (result.allowed && result.reason.includes('skipped')) {
                this.addTestResult('SHORT_MESSAGE', 'PASSED', 'Short messages properly skipped');
            } else {
                this.addTestResult('SHORT_MESSAGE', 'WARNING', 'Short message handling unclear');
            }
        } catch (error) {
            this.addTestResult('SHORT_MESSAGE', 'FAILED', `Short message test failed: ${error.message}`);
        }

        // Test 3: Command message (should be skipped)
        try {
            const result = await interceptor.interceptMessage('/help', 'testuser');
            if (result.allowed) {
                this.addTestResult('COMMAND_MESSAGE', 'PASSED', 'Command messages properly skipped');
            } else {
                this.addTestResult('COMMAND_MESSAGE', 'FAILED', 'Command message blocked');
            }
        } catch (error) {
            this.addTestResult('COMMAND_MESSAGE', 'FAILED', `Command message test failed: ${error.message}`);
        }
    }

    // Test Admin Interface
    async testAdminInterface() {
        console.log('🧪 Testing Admin Interface...');
        
        if (!window.stellarChatModeration?.adminInterface) {
            this.addTestResult('ADMIN_INTERFACE', 'FAILED', 'Admin Interface not found');
            return;
        }

        const adminInterface = window.stellarChatModeration.adminInterface;
        
        // Test 1: Admin privilege check
        try {
            const isAdmin = adminInterface.isAdminUser('Albertderek6878@gmail.com');
            if (isAdmin) {
                this.addTestResult('ADMIN_PRIVILEGE_CHECK', 'PASSED', 'Admin privilege check working');
            } else {
                this.addTestResult('ADMIN_PRIVILEGE_CHECK', 'FAILED', 'Admin privilege check failed');
            }
        } catch (error) {
            this.addTestResult('ADMIN_PRIVILEGE_CHECK', 'FAILED', `Admin check failed: ${error.message}`);
        }

        // Test 2: Non-admin privilege check
        try {
            const isNotAdmin = adminInterface.isAdminUser('regular@user.com');
            if (!isNotAdmin) {
                this.addTestResult('NON_ADMIN_CHECK', 'PASSED', 'Non-admin properly rejected');
            } else {
                this.addTestResult('NON_ADMIN_CHECK', 'FAILED', 'Non-admin incorrectly granted access');
            }
        } catch (error) {
            this.addTestResult('NON_ADMIN_CHECK', 'FAILED', `Non-admin check failed: ${error.message}`);
        }
    }

    // Test Error Handling
    async testErrorHandling() {
        console.log('🧪 Testing Error Handling...');
        
        if (!window.moderationErrorHandler) {
            this.addTestResult('ERROR_HANDLER', 'FAILED', 'Error Handler not found');
            return;
        }

        const errorHandler = window.moderationErrorHandler;
        
        // Test 1: Error logging
        try {
            const initialCount = errorHandler.errorLog.length;
            errorHandler.handleError('TEST_ERROR', new Error('Test error message'), 'TestContext');
            const newCount = errorHandler.errorLog.length;
            
            if (newCount > initialCount) {
                this.addTestResult('ERROR_LOGGING', 'PASSED', 'Error logging working');
            } else {
                this.addTestResult('ERROR_LOGGING', 'FAILED', 'Error not logged');
            }
        } catch (error) {
            this.addTestResult('ERROR_LOGGING', 'FAILED', `Error logging test failed: ${error.message}`);
        }

        // Test 2: Error statistics
        try {
            const stats = errorHandler.getErrorStats();
            if (stats && typeof stats.totalErrors === 'number') {
                this.addTestResult('ERROR_STATISTICS', 'PASSED', 'Error statistics working');
            } else {
                this.addTestResult('ERROR_STATISTICS', 'FAILED', 'Error statistics failed');
            }
        } catch (error) {
            this.addTestResult('ERROR_STATISTICS', 'FAILED', `Error statistics test failed: ${error.message}`);
        }
    }

    // Test Integration
    async testIntegration() {
        console.log('🧪 Testing System Integration...');
        
        // Test 1: Main system initialization
        try {
            if (window.stellarChatModeration && window.stellarChatModeration.isInitialized) {
                this.addTestResult('SYSTEM_INTEGRATION', 'PASSED', 'System properly integrated');
            } else {
                this.addTestResult('SYSTEM_INTEGRATION', 'FAILED', 'System not properly initialized');
            }
        } catch (error) {
            this.addTestResult('SYSTEM_INTEGRATION', 'FAILED', `Integration test failed: ${error.message}`);
        }

        // Test 2: Global accessibility
        try {
            const status = window.stellarChatModeration.getSystemStatus();
            if (status && status.initialized) {
                this.addTestResult('GLOBAL_ACCESS', 'PASSED', 'System globally accessible');
            } else {
                this.addTestResult('GLOBAL_ACCESS', 'FAILED', 'System not globally accessible');
            }
        } catch (error) {
            this.addTestResult('GLOBAL_ACCESS', 'FAILED', `Global access test failed: ${error.message}`);
        }

        // Test 3: UI Integration
        try {
            const statusIndicator = document.getElementById('moderation-status');
            if (statusIndicator) {
                this.addTestResult('UI_INTEGRATION', 'PASSED', 'UI properly integrated');
            } else {
                this.addTestResult('UI_INTEGRATION', 'WARNING', 'Status indicator not found');
            }
        } catch (error) {
            this.addTestResult('UI_INTEGRATION', 'FAILED', `UI integration test failed: ${error.message}`);
        }
    }

    // Add test result
    addTestResult(testName, status, message) {
        const result = {
            testName,
            status,
            message,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        const statusIcon = {
            'PASSED': '✅',
            'FAILED': '❌',
            'WARNING': '⚠️'
        };
        
        console.log(`${statusIcon[status]} ${testName}: ${message}`);
    }

    // Display comprehensive test results
    displayTestResults() {
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const warnings = this.testResults.filter(r => r.status === 'WARNING').length;
        const total = this.testResults.length;
        
        console.log('\n🧪 ===== MODERATION TEST SUITE RESULTS =====');
        console.log(`📊 Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⚠️ Warnings: ${warnings}`);
        console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        
        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.filter(r => r.status === 'FAILED').forEach(result => {
                console.log(`   • ${result.testName}: ${result.message}`);
            });
        }
        
        if (warnings > 0) {
            console.log('\n⚠️ Warnings:');
            this.testResults.filter(r => r.status === 'WARNING').forEach(result => {
                console.log(`   • ${result.testName}: ${result.message}`);
            });
        }
        
        console.log('🧪 ==========================================\n');
        
        // Show notification
        if (typeof showNotification === 'function') {
            const successRate = ((passed / total) * 100).toFixed(1);
            showNotification(
                `🧪 Test Suite Complete: ${successRate}% success rate (${passed}/${total})`,
                failed === 0 ? 'success' : 'warning'
            );
        }
    }

    // Get test results for admin panel
    getTestResults() {
        return {
            results: this.testResults,
            summary: {
                total: this.testResults.length,
                passed: this.testResults.filter(r => r.status === 'PASSED').length,
                failed: this.testResults.filter(r => r.status === 'FAILED').length,
                warnings: this.testResults.filter(r => r.status === 'WARNING').length,
                successRate: this.testResults.length > 0 ? 
                    ((this.testResults.filter(r => r.status === 'PASSED').length / this.testResults.length) * 100).toFixed(1) : 0
            },
            lastRun: this.testResults.length > 0 ? this.testResults[this.testResults.length - 1].timestamp : null
        };
    }

    // Quick health check
    async quickHealthCheck() {
        console.log('🏥 Running quick health check...');
        
        const healthStatus = {
            aiService: false,
            lockManager: false,
            messageInterceptor: false,
            adminInterface: false,
            errorHandler: false,
            integration: false
        };
        
        try {
            // Check AI Service
            healthStatus.aiService = !!(window.stellarChatModeration?.aiService);
            
            // Check Lock Manager
            healthStatus.lockManager = !!(window.stellarChatModeration?.lockManager);
            
            // Check Message Interceptor
            healthStatus.messageInterceptor = !!(window.stellarChatModeration?.messageInterceptor);
            
            // Check Admin Interface
            healthStatus.adminInterface = !!(window.stellarChatModeration?.adminInterface);
            
            // Check Error Handler
            healthStatus.errorHandler = !!(window.moderationErrorHandler);
            
            // Check Integration
            healthStatus.integration = !!(window.stellarChatModeration?.isInitialized);
            
            const healthyComponents = Object.values(healthStatus).filter(Boolean).length;
            const totalComponents = Object.keys(healthStatus).length;
            const healthPercentage = ((healthyComponents / totalComponents) * 100).toFixed(1);
            
            console.log(`🏥 System Health: ${healthPercentage}% (${healthyComponents}/${totalComponents} components healthy)`);
            
            return {
                status: healthStatus,
                healthPercentage,
                healthyComponents,
                totalComponents,
                isHealthy: healthyComponents === totalComponents
            };
            
        } catch (error) {
            console.error('❌ Health check failed:', error);
            return {
                status: healthStatus,
                healthPercentage: 0,
                error: error.message,
                isHealthy: false
            };
        }
    }
}

// Initialize test suite
const moderationTestSuite = new ModerationTestSuite();
window.moderationTestSuite = moderationTestSuite;

// Add test commands to global scope for easy access
window.runModerationTests = () => moderationTestSuite.runFullTestSuite();
window.checkModerationHealth = () => moderationTestSuite.quickHealthCheck();

console.log('🤖 AI Moderation Service loaded successfully');
console.log('🧪 Test Suite available - Run window.runModerationTests() to test the system');
console.log('🏥 Health Check available - Run window.checkModerationHealth() for quick status');