/**
 * Fallback Manager - Comprehensive fallback mechanisms and graceful degradation
 * for all AI features when services are unavailable.
 */

import type {
    FallbackMode,
    FallbackFeature,
    FallbackConfig,
    FallbackStatus,
    FallbackFeatureStatus,
    CircuitBreakerState,
    RetryAttempt,
    MediaRecommendation,
    SentimentResult,
    UserPreferences,
} from '../types';
import { DEFAULT_FALLBACK_CONFIG } from '../types';

// ============================================
// State Management
// ============================================

class FallbackManager {
    private config: FallbackConfig;
    private status: FallbackStatus;
    private circuitBreakers: Map<FallbackFeature, CircuitBreakerState>;
    private retryQueue: Map<string, RetryAttempt>;
    private listeners: Set<(status: FallbackStatus) => void>;
    private checkIntervals: Map<string, number>;

    constructor() {
        this.config = { ...DEFAULT_FALLBACK_CONFIG };
        this.circuitBreakers = new Map();
        this.retryQueue = new Map();
        this.listeners = new Set();
        this.checkIntervals = new Map();

        // Initialize fallback feature statuses
        this.status = this.initializeStatus();

        // Initialize circuit breakers for each feature
        this.initializeCircuitBreakers();

        // Start periodic availability checks
        this.startAvailabilityChecks();
    }

    private initializeStatus(): FallbackStatus {
        return {
            mode: this.config.mode,
            isAIAvailable: false,
            isVoiceAvailable: false,
            isNotificationAvailable: false,
            features: this.getDefaultFeatureStatuses(),
            circuitBreakerOpen: false,
            lastRecoveryAttempt: 0,
            totalFallbackCount: 0,
        };
    }

    private getDefaultFeatureStatuses(): FallbackFeatureStatus[] {
        return [
            { feature: 'nlp', isAvailable: false, isUsingFallback: false, fallbackCount: 0, lastChecked: 0 },
            { feature: 'sentiment', isAvailable: false, isUsingFallback: false, fallbackCount: 0, lastChecked: 0 },
            { feature: 'voiceSearch', isAvailable: false, isUsingFallback: false, fallbackCount: 0, lastChecked: 0 },
            { feature: 'recommendations', isAvailable: false, isUsingFallback: false, fallbackCount: 0, lastChecked: 0 },
            { feature: 'userPreferences', isAvailable: false, isUsingFallback: false, fallbackCount: 0, lastChecked: 0 },
            { feature: 'cache', isAvailable: false, isUsingFallback: false, fallbackCount: 0, lastChecked: 0 },
            { feature: 'autoRefresh', isAvailable: false, isUsingFallback: false, fallbackCount: 0, lastChecked: 0 },
            { feature: 'notifications', isAvailable: false, isUsingFallback: false, fallbackCount: 0, lastChecked: 0 },
        ];
    }

    private initializeCircuitBreakers(): void {
        const features: FallbackFeature[] = [
            'nlp',
            'sentiment',
            'voiceSearch',
            'recommendations',
            'userPreferences',
            'cache',
            'autoRefresh',
            'notifications',
        ];

        features.forEach((feature) => {
            this.circuitBreakers.set(feature, {
                feature,
                failureCount: 0,
                lastFailureTime: 0,
                isOpen: false,
                nextAttempt: 0,
            });
        });
    }

    // ============================================
    // Fallback Detection Methods
    // ============================================

    /**
     * Check if Gemini AI is available
     */
    async checkAIAvailability(): Promise<boolean> {
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                console.warn('[FallbackManager] Gemini API key not configured');
                this.updateFeatureStatus('nlp', false);
                this.updateFeatureStatus('sentiment', false);
                this.updateFeatureStatus('recommendations', false);
                return false;
            }

            // Try a simple test request to verify AI is working
            const testResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
            );

            if (testResponse.ok) {
                this.updateFeatureStatus('nlp', true);
                this.updateFeatureStatus('sentiment', true);
                this.updateFeatureStatus('recommendations', true);
                return true;
            }

            this.updateFeatureStatus('nlp', false);
            this.updateFeatureStatus('sentiment', false);
            this.updateFeatureStatus('recommendations', false);
            return false;
        } catch (error) {
            console.warn('[FallbackManager] AI availability check failed:', error);
            this.updateFeatureStatus('nlp', false);
            this.updateFeatureStatus('sentiment', false);
            this.updateFeatureStatus('recommendations', false);
            return false;
        }
    }

    /**
     * Check if voice recognition is available
     */
    checkVoiceAvailability(): boolean {
        const isAvailable =
            'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

        this.updateFeatureStatus('voiceSearch', isAvailable);
        return isAvailable;
    }

    /**
     * Check if browser notifications work
     */
    checkNotificationAvailability(): boolean {
        if (!('Notification' in window)) {
            this.updateFeatureStatus('notifications', false);
            return false;
        }

        const isAvailable = Notification.permission === 'granted';
        this.updateFeatureStatus('notifications', isAvailable);
        return isAvailable;
    }

    /**
     * Check if cache is available (localStorage)
     */
    checkCacheAvailability(): boolean {
        try {
            const testKey = '__fallback_test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            this.updateFeatureStatus('cache', true);
            return true;
        } catch {
            this.updateFeatureStatus('cache', false);
            return false;
        }
    }

    /**
     * Check if user preferences storage is available
     */
    checkUserPreferencesAvailability(): boolean {
        try {
            const testKey = '__prefs_test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            this.updateFeatureStatus('userPreferences', true);
            return true;
        } catch {
            this.updateFeatureStatus('userPreferences', false);
            return false;
        }
    }

    /**
     * Run all availability checks
     */
    async runAllAvailabilityChecks(): Promise<void> {
        await this.checkAIAvailability();
        this.checkVoiceAvailability();
        this.checkNotificationAvailability();
        this.checkCacheAvailability();
        this.checkUserPreferencesAvailability();

        // Update overall status
        this.status.isAIAvailable = this.status.features.find((f) => f.feature === 'nlp')?.isAvailable ?? false;
        this.status.isVoiceAvailable = this.status.features.find((f) => f.feature === 'voiceSearch')?.isAvailable ?? false;
        this.status.isNotificationAvailable = this.status.features.find((f) => f.feature === 'notifications')?.isAvailable ?? false;

        this.notifyListeners();
    }

    private startAvailabilityChecks(): void {
        // Initial check
        this.runAllAvailabilityChecks();

        // Periodic checks every 60 seconds
        const intervalId = window.setInterval(() => {
            this.runAllAvailabilityChecks();
        }, 60000);

        // Store interval for cleanup
        this.checkIntervals.set('availability', intervalId);
    }

    // ============================================
    // Graceful Degradation Methods
    // ============================================

    /**
     * Get current fallback mode
     */
    getFallbackMode(): FallbackMode {
        return this.status.mode;
    }

    /**
     * Set fallback mode manually
     */
    setFallbackMode(mode: FallbackMode): void {
        this.status.mode = mode;
        this.config.mode = mode;
        this.notifyListeners();
        console.log(`[FallbackManager] Fallback mode set to: ${mode}`);
    }

    /**
     * Determine if AI should be used based on availability
     */
    shouldUseAI(feature: FallbackFeature): boolean {
        // Check if feature is disabled in config
        if (!this.config.features[feature]) {
            return false;
        }

        // Check if circuit breaker is open
        const breaker = this.circuitBreakers.get(feature);
        if (breaker?.isOpen) {
            // Check if it's time to retry
            if (Date.now() >= breaker.nextAttempt) {
                // Try to close the circuit (half-open state)
                return true;
            }
            return false;
        }

        // Check if feature is available
        const featureStatus = this.status.features.find((f) => f.feature === feature);
        if (!featureStatus?.isAvailable) {
            return false;
        }

        // Check mode-based restrictions
        if (this.status.mode === 'minimal') {
            return feature === 'recommendations';
        }

        if (this.status.mode === 'disabled') {
            return false;
        }

        return true;
    }

    /**
     * Get fallback response for a feature
     */
    getFallbackResponse(feature: FallbackFeature): unknown {
        // Mark that we're using fallback
        this.recordFallbackUsage(feature);

        switch (feature) {
            case 'nlp':
                return this.getNLPFallback();
            case 'sentiment':
                return this.getSentimentFallback();
            case 'voiceSearch':
                return this.getVoiceSearchFallback();
            case 'recommendations':
                return this.getRecommendationsFallback();
            case 'userPreferences':
                return this.getUserPreferencesFallback();
            case 'cache':
                return this.getCacheFallback();
            case 'autoRefresh':
                return this.getAutoRefreshFallback();
            case 'notifications':
                return this.getNotificationsFallback();
            default:
                return null;
        }
    }

    // ============================================
    // Fallback Strategies for Each Feature
    // ============================================

    /**
     * NLP Fallback - Keyword-based analysis
     */
    private getNLPFallback(): Record<string, unknown> {
        return {
            fallback: true,
            message: 'Using basic keyword analysis instead of AI-powered NLP',
            keywords: [],
            categories: [],
            entities: [],
        };
    }

    /**
     * Sentiment Fallback - Return neutral sentiment
     */
    getSentimentFallback(): SentimentResult {
        return {
            sentiment: 'neutral',
            score: 0,
            confidence: 0,
            keywords: [],
        };
    }

    /**
     * Voice Search Fallback - Show message
     */
    private getVoiceSearchFallback(): Record<string, unknown> {
        return {
            error: 'Voice search is not available',
            message: 'Please use text search instead',
            fallback: true,
        };
    }

    /**
     * Recommendations Fallback - Heuristic-based recommendations
     */
    private getRecommendationsFallback(): MediaRecommendation[] {
        // Return trending/popular movies as fallback
        // This will be filled in by actual trending data from TMDB
        return [];
    }

    /**
     * User Preferences Fallback - Use default preferences
     */
    getUserPreferencesFallback(): UserPreferences {
        return {
            genreScores: {},
            mediaTypeScores: {
                movie: 0.5,
                tv: 0.3,
                anime: 0.2,
            },
            timePeriodScores: {
                recent: 0.6,
                classic: 0.4,
            },
            regionScores: {},
            interactions: [],
            lastUpdated: Date.now(),
        };
    }

    /**
     * Cache Fallback - Continue without cache
     */
    private getCacheFallback(): Record<string, unknown> {
        return {
            fallback: true,
            message: 'Operating without cache - requests may be slower',
            cacheEnabled: false,
        };
    }

    /**
     * Auto Refresh Fallback - Disable gracefully
     */
    private getAutoRefreshFallback(): Record<string, unknown> {
        return {
            fallback: true,
            message: 'Auto-refresh disabled - content will not update automatically',
            enabled: false,
        };
    }

    /**
     * Notifications Fallback - Use in-app only
     */
    private getNotificationsFallback(): Record<string, unknown> {
        return {
            fallback: true,
            message: 'Browser notifications disabled - using in-app notifications only',
            browserNotificationsEnabled: false,
            inAppNotificationsEnabled: true,
        };
    }

    // ============================================
    // Circuit Breaker Methods
    // ============================================

    /**
     * Record a failure for a feature
     */
    recordFailure(feature: FallbackFeature): void {
        const breaker = this.circuitBreakers.get(feature);
        if (!breaker) return;

        breaker.failureCount++;
        breaker.lastFailureTime = Date.now();

        if (breaker.failureCount >= this.config.circuitBreakerThreshold) {
            breaker.isOpen = true;
            breaker.nextAttempt = Date.now() + this.config.circuitBreakerTimeoutMs;
            this.status.circuitBreakerOpen = true;
            console.warn(`[FallbackManager] Circuit breaker opened for ${feature}`);
        }

        this.notifyListeners();
    }

    /**
     * Record a success for a feature (resets circuit breaker)
     */
    recordSuccess(feature: FallbackFeature): void {
        const breaker = this.circuitBreakers.get(feature);
        if (!breaker) return;

        breaker.failureCount = 0;
        breaker.isOpen = false;
        breaker.nextAttempt = 0;

        // Check if all circuit breakers are closed
        let anyOpen = false;
        this.circuitBreakers.forEach((b) => {
            if (b.isOpen) anyOpen = true;
        });
        this.status.circuitBreakerOpen = anyOpen;

        this.notifyListeners();
    }

    /**
     * Check if circuit breaker allows request
     */
    canAttempt(feature: FallbackFeature): boolean {
        const breaker = this.circuitBreakers.get(feature);
        if (!breaker) return true;

        if (!breaker.isOpen) return true;

        // Half-open state: allow one attempt
        return Date.now() >= breaker.nextAttempt;
    }

    // ============================================
    // Retry Logic with Exponential Backoff
    // ============================================

    /**
     * Execute a function with retry logic
     */
    async executeWithRetry<T>(
        feature: FallbackFeature,
        fn: () => Promise<T>,
        onFallback?: () => T
    ): Promise<{ result: T; usedFallback: boolean }> {
        let attempt = 0;
        let lastError: Error | null = null;

        while (attempt < this.config.retryAttempts) {
            // Check circuit breaker
            if (!this.canAttempt(feature)) {
                console.log(`[FallbackManager] Circuit breaker open for ${feature}, using fallback`);
                if (onFallback) {
                    return { result: onFallback(), usedFallback: true };
                }
                throw new Error(`Circuit breaker open for ${feature}`);
            }

            try {
                const result = await fn();
                this.recordSuccess(feature);
                return { result, usedFallback: false };
            } catch (error) {
                lastError = error as Error;
                this.recordFailure(feature);
                attempt++;

                if (attempt < this.config.retryAttempts) {
                    // Exponential backoff
                    const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
                    console.log(`[FallbackManager] Retry ${attempt}/${this.config.retryAttempts} for ${feature} after ${delay}ms`);
                    await this.sleep(delay);
                }
            }
        }

        // All retries failed
        console.error(`[FallbackManager] All retries failed for ${feature}:`, lastError);

        if (onFallback) {
            return { result: onFallback(), usedFallback: true };
        }

        throw lastError;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // ============================================
    // Recovery Detection
    // ============================================

    /**
     * Attempt to recover AI features
     */
    async attemptRecovery(): Promise<void> {
        this.status.lastRecoveryAttempt = Date.now();
        console.log('[FallbackManager] Attempting to recover AI features...');

        await this.runAllAvailabilityChecks();

        // Reset circuit breakers
        this.circuitBreakers.forEach((breaker) => {
            breaker.failureCount = 0;
            breaker.isOpen = false;
            breaker.nextAttempt = 0;
        });
        this.status.circuitBreakerOpen = false;

        this.notifyListeners();
    }

    /**
     * Check if recovery is possible
     */
    canAttemptRecovery(): boolean {
        const timeSinceLastAttempt = Date.now() - this.status.lastRecoveryAttempt;
        return timeSinceLastAttempt >= this.config.recoveryCheckIntervalMs;
    }

    // ============================================
    // Status Updates
    // ============================================

    private updateFeatureStatus(feature: FallbackFeature, isAvailable: boolean): void {
        const featureStatus = this.status.features.find((f) => f.feature === feature);
        if (featureStatus) {
            const wasUsingFallback = featureStatus.isUsingFallback;
            featureStatus.isAvailable = isAvailable;
            featureStatus.isUsingFallback = !isAvailable && this.config.features[feature];
            featureStatus.lastChecked = Date.now();

            // Increment fallback count if we just switched to fallback
            if (!isAvailable && !wasUsingFallback && this.config.features[feature]) {
                featureStatus.fallbackCount++;
                this.status.totalFallbackCount++;
            }
        }
    }

    private recordFallbackUsage(feature: FallbackFeature): void {
        const featureStatus = this.status.features.find((f) => f.feature === feature);
        if (featureStatus) {
            featureStatus.fallbackCount++;
            this.status.totalFallbackCount++;
        }
    }

    // ============================================
    // Event Listeners
    // ============================================

    subscribe(listener: (status: FallbackStatus) => void): () => void {
        this.listeners.add(listener);
        // Immediately call with current status
        listener(this.status);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners(): void {
        this.listeners.forEach((listener) => listener(this.status));
    }

    // ============================================
    // Public Getters
    // ============================================

    getStatus(): FallbackStatus {
        return { ...this.status };
    }

    getConfig(): FallbackConfig {
        return { ...this.config };
    }

    getFeatureStatus(feature: FallbackFeature): FallbackFeatureStatus | undefined {
        return this.status.features.find((f) => f.feature === feature);
    }

    isAnyFallbackActive(): boolean {
        return this.status.features.some((f) => f.isUsingFallback);
    }

    // ============================================
    // Cleanup
    // ============================================

    destroy(): void {
        this.checkIntervals.forEach((intervalId) => {
            window.clearInterval(intervalId);
        });
        this.checkIntervals.clear();
        this.listeners.clear();
    }
}

// Singleton instance
let fallbackManagerInstance: FallbackManager | null = null;

/**
 * Get the fallback manager singleton instance
 */
export function getFallbackManager(): FallbackManager {
    if (!fallbackManagerInstance) {
        fallbackManagerInstance = new FallbackManager();
    }
    return fallbackManagerInstance;
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Check if AI is available
 */
export async function checkAIAvailability(): Promise<boolean> {
    return getFallbackManager().checkAIAvailability();
}

/**
 * Check if voice recognition is available
 */
export function checkVoiceAvailability(): boolean {
    return getFallbackManager().checkVoiceAvailability();
}

/**
 * Check if notifications are available
 */
export function checkNotificationAvailability(): boolean {
    return getFallbackManager().checkNotificationAvailability();
}

/**
 * Get current fallback mode
 */
export function getFallbackMode(): FallbackMode {
    return getFallbackManager().getFallbackMode();
}

/**
 * Set fallback mode
 */
export function setFallbackMode(mode: FallbackMode): void {
    getFallbackManager().setFallbackMode(mode);
}

/**
 * Check if AI should be used for a feature
 */
export function shouldUseAI(feature: FallbackFeature): boolean {
    return getFallbackManager().shouldUseAI(feature);
}

/**
 * Get fallback response for a feature
 */
export function getFallbackResponse<T = unknown>(feature: FallbackFeature): T {
    return getFallbackManager().getFallbackResponse(feature) as T;
}

/**
 * Get current fallback status
 */
export function getFallbackStatus(): FallbackStatus {
    return getFallbackManager().getStatus();
}

/**
 * Subscribe to fallback status changes
 */
export function subscribeToFallbackStatus(
    listener: (status: FallbackStatus) => void
): () => void {
    return getFallbackManager().subscribe(listener);
}

/**
 * Execute with retry and fallback
 */
export async function executeWithRetry<T>(
    feature: FallbackFeature,
    fn: () => Promise<T>,
    onFallback?: () => T
): Promise<{ result: T; usedFallback: boolean }> {
    return getFallbackManager().executeWithRetry(feature, fn, onFallback);
}

/**
 * Record a failure for circuit breaker
 */
export function recordFailure(feature: FallbackFeature): void {
    getFallbackManager().recordFailure(feature);
}

/**
 * Record a success for circuit breaker
 */
export function recordSuccess(feature: FallbackFeature): void {
    getFallbackManager().recordSuccess(feature);
}

/**
 * Attempt to recover AI features
 */
export async function attemptRecovery(): Promise<void> {
    return getFallbackManager().attemptRecovery();
}

/**
 * Check if any fallback is currently active
 */
export function isAnyFallbackActive(): boolean {
    return getFallbackManager().isAnyFallbackActive();
}

/**
 * Run all availability checks
 */
export async function runAvailabilityChecks(): Promise<void> {
    return getFallbackManager().runAllAvailabilityChecks();
}
