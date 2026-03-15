/**
 * Intelligent Auto-Refresh Utility
 * 
 * Monitors user activity and behavior to determine when to refresh content:
 * - Time-based refresh (when content becomes stale)
 * - Activity-based refresh (user returns after being away)
 * - Pattern-based refresh (based on user session patterns)
 * - Content-based refresh (new content available)
 */

import {
    RefreshConfig,
    RefreshStatus,
    RefreshResult,
    RefreshReason,
    ActivityState,
    RefreshPattern,
    DEFAULT_REFRESH_CONFIG,
    MediaRecommendation,
} from '../types';

// ============================================
// State Management
// ============================================

// Current configuration
let config: RefreshConfig = { ...DEFAULT_REFRESH_CONFIG };

// Current status
let status: RefreshStatus = {
    isRunning: false,
    isRefreshing: false,
    lastRefreshTime: null,
    nextRefreshTime: null,
    isUserActive: true,
    isUserIdle: false,
    contentStale: false,
    newContentAvailable: false,
    pendingRefreshCount: 0,
};

// Activity tracking
let activityState: ActivityState = {
    lastActivityTime: Date.now(),
    isActive: true,
    isIdle: false,
    wasIdle: false,
    idleStartTime: null,
    sessionStartTime: Date.now(),
    interactionCount: 0,
};

// User behavior patterns
let refreshPattern: RefreshPattern = {
    averageSessionLength: 0,
    averageIdleTime: 0,
    peakActiveHours: [],
    preferredRefreshTimes: [],
    refreshCount: 0,
    dismissCount: 0,
};

// Timers and event listeners
let refreshIntervalId: ReturnType<typeof setInterval> | null = null;
let idleCheckIntervalId: ReturnType<typeof setInterval> | null = null;
let batchTimeoutId: ReturnType<typeof setTimeout> | null = null;
let pendingRefreshCallbacks: Array<() => Promise<MediaRecommendation[]>> = [];

// Visibility change handler
let visibilityChangeHandler: (() => void) | null = null;

// Network status handler
let networkOnlineHandler: (() => void) | null = null;

// Current content reference for comparison
let currentResults: MediaRecommendation[] = [];

// ============================================
// Utility Functions
// ============================================

/**
 * Get current timestamp
 */
const now = (): number => Date.now();

/**
 * Check if we're in a browser environment
 */
const isBrowser = (): boolean => typeof window !== 'undefined';

/**
 * Deep compare two arrays of recommendations
 */
const hasNewContent = (
    oldResults: MediaRecommendation[],
    newResults: MediaRecommendation[]
): boolean => {
    if (oldResults.length !== newResults.length) return true;

    const oldIds = new Set(oldResults.map(r => r.id));
    return newResults.some(r => !oldIds.has(r.id));
};

// ============================================
// Refresh Management
// ============================================

/**
 * Start the auto-refresh system with optional configuration
 */
export const startAutoRefresh = (config?: RefreshConfig): void => {
    // Merge provided config with defaults
    if (config) {
        config = { ...DEFAULT_REFRESH_CONFIG, ...config };
    } else {
        config = { ...DEFAULT_REFRESH_CONFIG };
    }

    // Don't start if already running
    if (status.isRunning) {
        console.warn('[AutoRefresh] Already running. Call stopAutoRefresh() first.');
        return;
    }

    // Set up event listeners
    setupVisibilityHandler();
    setupNetworkHandler();
    setupActivityListeners();

    // Start idle check interval
    idleCheckIntervalId = setInterval(checkIdleState, 1000);

    // Start main refresh interval
    if (config.intervalMs && config.intervalMs > 0) {
        refreshIntervalId = setInterval(
            () => triggerRefresh('time_based'),
            config.intervalMs!
        );
        status.nextRefreshTime = now() + config.intervalMs!;
    }

    status.isRunning = true;
    console.log('[AutoRefresh] Started with config:', config);
};

/**
 * Stop all auto-refresh activities
 */
export const stopAutoRefresh = (): void => {
    // Clear all intervals
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
    }

    if (idleCheckIntervalId) {
        clearInterval(idleCheckIntervalId);
        idleCheckIntervalId = null;
    }

    if (batchTimeoutId) {
        clearTimeout(batchTimeoutId);
        batchTimeoutId = null;
    }

    // Remove event listeners
    if (visibilityChangeHandler && isBrowser()) {
        document.removeEventListener('visibilitychange', visibilityChangeHandler);
        visibilityChangeHandler = null;
    }

    if (networkOnlineHandler && isBrowser()) {
        window.removeEventListener('online', networkOnlineHandler);
        networkOnlineHandler = null;
    }

    // Remove activity listeners
    if (isBrowser()) {
        window.removeEventListener('mousemove', handleUserActivity);
        window.removeEventListener('keydown', handleUserActivity);
        window.removeEventListener('click', handleUserActivity);
        window.removeEventListener('scroll', handleUserActivity);
        window.removeEventListener('touchstart', handleUserActivity);
    }

    // Clear pending callbacks
    pendingRefreshCallbacks = [];

    status = {
        ...status,
        isRunning: false,
        isRefreshing: false,
        nextRefreshTime: null,
    };

    console.log('[AutoRefresh] Stopped');
};

/**
 * Force an immediate refresh
 */
export const refreshNow = async (): Promise<RefreshResult> => {
    return triggerRefresh('manual');
};

/**
 * Get current refresh status
 */
export const getRefreshStatus = (): RefreshStatus => {
    return { ...status };
};

/**
 * Update the configuration
 */
export const updateConfig = (newConfig: Partial<RefreshConfig>): void => {
    config = { ...config, ...newConfig };

    // If interval changed and we're running, restart the interval
    if (status.isRunning && newConfig.intervalMs && refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = setInterval(
            () => triggerRefresh('time_based'),
            config.intervalMs!
        );
    }
};

// ============================================
// Activity Monitoring
// ============================================

/**
 * Track user activity
 */
export const trackUserActivity = (): void => {
    activityState.lastActivityTime = now();
    activityState.interactionCount++;

    if (activityState.isIdle || !activityState.isActive) {
        // User returned from idle
        activityState.isActive = true;
        activityState.isIdle = false;
        activityState.wasIdle = true;

        if (activityState.idleStartTime) {
            const idleDuration = now() - activityState.idleStartTime;
            refreshPattern.averageIdleTime =
                (refreshPattern.averageIdleTime * (refreshPattern.refreshCount) + idleDuration) /
                (refreshPattern.refreshCount + 1);
        }

        activityState.idleStartTime = null;

        // Trigger refresh after returning from idle
        if (config.enabled && config.returnRefreshDelayMs) {
            setTimeout(() => triggerRefresh('user_returned'), config.returnRefreshDelayMs);
        }
    }
};

/**
 * Detect when user returns after being away
 */
export const detectReturnFromIdle = (): boolean => {
    if (activityState.wasIdle && activityState.isActive) {
        activityState.wasIdle = false;
        return true;
    }
    return false;
};

/**
 * Calculate optimal refresh time based on user patterns
 */
export const calculateOptimalRefreshTime = (): number => {
    const currentHour = new Date().getHours();

    // Adjust interval based on user's peak hours
    if (refreshPattern.peakActiveHours.includes(currentHour)) {
        // User is more active, refresh more frequently
        return Math.max(config.intervalMs! * 0.5, 60000); // At least 1 minute
    }

    // Default to configured interval
    return config.intervalMs || DEFAULT_REFRESH_CONFIG.intervalMs!;
};

/**
 * Determine if refresh is needed
 */
export const shouldRefresh = (): boolean => {
    // Don't refresh if disabled
    if (!config.enabled) return false;

    // Don't refresh if already refreshing
    if (status.isRefreshing) return false;

    // Don't refresh if user is actively interacting
    if (activityState.isActive && !activityState.wasIdle) {
        const timeSinceLastActivity = now() - activityState.lastActivityTime;
        if (timeSinceLastActivity < 5000) return false; // Active in last 5 seconds
    }

    return true;
};

// ============================================
// Background Refresh
// ============================================

/**
 * Register a refresh callback to be called when content should be refreshed
 */
export const registerRefreshCallback = (
    callback: () => Promise<MediaRecommendation[]>
): void => {
    pendingRefreshCallbacks.push(callback);

    // Process batch if enabled
    if (config.batchRequests && config.batchDelayMs) {
        if (batchTimeoutId) clearTimeout(batchTimeoutId);
        batchTimeoutId = setTimeout(processBatch, config.batchDelayMs);
    }
};

/**
 * Set current results for comparison
 */
export const setCurrentResults = (results: MediaRecommendation[]): void => {
    currentResults = [...results];
};

/**
 * Process batched refresh requests
 */
const processBatch = async (): Promise<void> => {
    if (pendingRefreshCallbacks.length === 0) return;

    const callbacks = [...pendingRefreshCallbacks];
    pendingRefreshCallbacks = [];

    // Take up to maxBatchSize callbacks
    const toProcess = callbacks.slice(0, config.maxBatchSize);

    try {
        status.isRefreshing = true;

        // Execute all callbacks and collect results
        const allResults = await Promise.all(
            toProcess.map(cb => cb().catch(err => {
                console.error('[AutoRefresh] Callback error:', err);
                return [];
            }))
        );

        // Merge results
        const mergedResults = allResults.flat();

        if (mergedResults.length > 0) {
            const hasNew = hasNewContent(currentResults, mergedResults);

            if (hasNew) {
                status.newContentAvailable = true;

                // Notify via callback if provided
                if (config.onRefresh) {
                    const result: RefreshResult = {
                        success: true,
                        timestamp: now(),
                        newItems: mergedResults.filter(
                            n => !currentResults.some(c => c.id === n.id)
                        ),
                        updatedItems: mergedResults,
                        totalResults: mergedResults.length,
                        refreshReason: 'time_based',
                    };
                    config.onRefresh(result);
                }
            }
        }

        status.lastRefreshTime = now();

        // Update next refresh time
        if (config.intervalMs) {
            status.nextRefreshTime = now() + config.intervalMs;
        }

    } catch (error) {
        console.error('[AutoRefresh] Batch processing error:', error);

        if (config.onError && error instanceof Error) {
            config.onError(error);
        }
    } finally {
        status.isRefreshing = false;
        status.pendingRefreshCount = 0;
    }
};

/**
 * Prefetch updated content in the background
 */
export const prefetchUpdatedContent = async (): Promise<MediaRecommendation[]> => {
    if (!shouldRefresh()) return [];

    try {
        status.isRefreshing = true;

        // Call registered callbacks
        const results = await Promise.all(
            pendingRefreshCallbacks.map(cb => cb().catch(() => []))
        );

        const mergedResults = results.flat();

        if (mergedResults.length > 0 && hasNewContent(currentResults, mergedResults)) {
            status.newContentAvailable = true;
        }

        status.lastRefreshTime = now();
        refreshPattern.refreshCount++;

        return mergedResults;

    } catch (error) {
        console.error('[AutoRefresh] Prefetch error:', error);
        return [];
    } finally {
        status.isRefreshing = false;
    }
};

/**
 * Update results that are stale
 */
export const updateStaleResults = async (): Promise<RefreshResult> => {
    const reason: RefreshReason = detectReturnFromIdle() ? 'user_returned' : 'content_stale';
    return triggerRefresh(reason);
};

/**
 * Merge new results without disrupting user
 */
export const mergeNewResults = (
    newResults: MediaRecommendation[]
): { merged: MediaRecommendation[]; hasChanges: boolean } => {
    const merged = [...currentResults];
    let hasChanges = false;

    for (const newItem of newResults) {
        const existingIndex = merged.findIndex(m => m.id === newItem.id);

        if (existingIndex === -1) {
            // New item, add it
            merged.push(newItem);
            hasChanges = true;
        } else if (JSON.stringify(merged[existingIndex]) !== JSON.stringify(newItem)) {
            // Updated item, update it
            merged[existingIndex] = newItem;
            hasChanges = true;
        }
    }

    // Update current results
    currentResults = merged;

    // Clear new content flag after merge
    status.newContentAvailable = false;

    return { merged, hasChanges };
};

// ============================================
// Internal Handlers
// ============================================

/**
 * Handle user activity events
 */
const handleUserActivity = (): void => {
    trackUserActivity();
    status.isUserActive = true;
    status.isUserIdle = false;
};

/**
 * Check idle state
 */
const checkIdleState = (): void => {
    const timeSinceLastActivity = now() - activityState.lastActivityTime;
    const idleThreshold = config.idleTimeoutMs || DEFAULT_REFRESH_CONFIG.idleTimeoutMs!;

    if (timeSinceLastActivity > idleThreshold && !activityState.isIdle) {
        activityState.isIdle = true;
        activityState.idleStartTime = now();
        status.isUserIdle = true;
        status.isUserActive = false;
    }
};

/**
 * Trigger a refresh with the given reason
 */
const triggerRefresh = async (reason: RefreshReason): Promise<RefreshResult> => {
    if (!shouldRefresh()) {
        return {
            success: false,
            timestamp: now(),
            newItems: [],
            updatedItems: [],
            totalResults: 0,
            refreshReason: reason,
            error: 'Refresh skipped: conditions not met',
        };
    }

    try {
        status.isRefreshing = true;
        status.pendingRefreshCount++;

        // Process pending callbacks
        await processBatch();

        return {
            success: true,
            timestamp: now(),
            newItems: [],
            updatedItems: [],
            totalResults: 0,
            refreshReason: reason,
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (config.onError && error instanceof Error) {
            config.onError(error);
        }

        return {
            success: false,
            timestamp: now(),
            newItems: [],
            updatedItems: [],
            totalResults: 0,
            refreshReason: reason,
            error: errorMessage,
        };
    }
};

/**
 * Set up visibility change handler
 */
const setupVisibilityHandler = (): void => {
    if (!isBrowser()) return;

    visibilityChangeHandler = () => {
        if (document.visibilityState === 'visible') {
            // User returned to the tab
            if (config.enabled) {
                triggerRefresh('visibility_change');
            }
        }
    };

    document.addEventListener('visibilitychange', visibilityChangeHandler);
};

/**
 * Set up network status handler
 */
const setupNetworkHandler = (): void => {
    if (!isBrowser()) return;

    networkOnlineHandler = () => {
        // Network connection restored
        if (config.enabled) {
            triggerRefresh('network_reconnect');
        }
    };

    window.addEventListener('online', networkOnlineHandler);
};

/**
 * Set up activity listeners
 */
const setupActivityListeners = (): void => {
    if (!isBrowser()) return;

    // Track various user activities
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
};

// ============================================
// Pattern Learning
// ============================================

/**
 * Record when user dismisses content (for pattern learning)
 */
export const recordDismiss = (): void => {
    refreshPattern.dismissCount++;
};

/**
 * Get refresh patterns
 */
export const getRefreshPattern = (): RefreshPattern => {
    return { ...refreshPattern };
};

/**
 * Update pattern based on session data
 */
export const updatePattern = (sessionLength: number): void => {
    const currentHour = new Date().getHours();

    // Update average session length
    const totalSessions = refreshPattern.refreshCount + refreshPattern.dismissCount;
    if (totalSessions > 0) {
        refreshPattern.averageSessionLength =
            (refreshPattern.averageSessionLength * totalSessions + sessionLength) /
            (totalSessions + 1);
    } else {
        refreshPattern.averageSessionLength = sessionLength;
    }

    // Track peak hours
    if (!refreshPattern.peakActiveHours.includes(currentHour)) {
        refreshPattern.peakActiveHours.push(currentHour);
        refreshPattern.peakActiveHours.sort((a, b) => a - b);
    }
};

// ============================================
// Cleanup
// ============================================

/**
 * Clean up all resources
 */
export const cleanup = (): void => {
    stopAutoRefresh();

    // Reset state
    activityState = {
        lastActivityTime: now(),
        isActive: true,
        isIdle: false,
        wasIdle: false,
        idleStartTime: null,
        sessionStartTime: now(),
        interactionCount: 0,
    };

    currentResults = [];

    console.log('[AutoRefresh] Cleaned up');
};
