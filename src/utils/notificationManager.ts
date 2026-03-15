/**
 * Smart Notification Manager
 * Handles browser notifications, in-app toasts, and smart notification logic
 */

import {
    Notification,
    NotificationOptions,
    NotificationPermission,
    NotificationPreferences,
    NotificationPriority,
    NotificationType,
    ScheduledNotification,
    MediaRelease,
    DEFAULT_NOTIFICATION_PREFERENCES,
    MediaType,
} from '../types';

// ============================================
// Storage Keys
// ============================================

const NOTIFICATION_PREFS_KEY = 'notification_preferences';
const NOTIFICATION_HISTORY_KEY = 'notification_history';
const LAST_NOTIFICATION_CHECK_KEY = 'last_notification_check';

// ============================================
// State Management
// ============================================

let currentPermission: NotificationPermission = 'default';
let preferences: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
let toastListeners: ((notifications: Notification[]) => void)[] = [];
let scheduledNotifications: Map<string, number> = new Map();
let notificationHistory: Notification[] = [];
let frequencyLimitCache: { count: number; resetTime: number } = { count: 0, resetTime: 0 };
let initialized = false;

// ============================================
// Initialization
// ============================================

/**
 * Initialize the notification manager
 * Load preferences and history from localStorage
 */
export function initializeNotificationManager(): void {
    if (initialized) return;

    try {
        // Load preferences
        const savedPrefs = localStorage.getItem(NOTIFICATION_PREFS_KEY);
        if (savedPrefs) {
            preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(savedPrefs) };
        }

        // Load history
        const savedHistory = localStorage.getItem(NOTIFICATION_HISTORY_KEY);
        if (savedHistory) {
            const parsed = JSON.parse(savedHistory);
            notificationHistory = parsed.notifications || [];
        }

        // Check browser permission
        if (typeof window !== 'undefined' && 'Notification' in window) {
            currentPermission = window.Notification.permission as NotificationPermission;
        }

        // Load frequency limit cache
        const savedFrequency = localStorage.getItem('notification_frequency_cache');
        if (savedFrequency) {
            frequencyLimitCache = JSON.parse(savedFrequency);
        }

        initialized = true;
    } catch (error) {
        console.warn('[NotificationManager] Failed to initialize:', error);
        // Silently degrade - use defaults
        preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
        notificationHistory = [];
    }
}

// ============================================
// Permission Management
// ============================================

/**
 * Request browser notification permission
 * @returns Promise<NotificationPermission>
 */
export async function requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        console.warn('[NotificationManager] Browser notifications not supported');
        return 'denied';
    }

    try {
        const permission = await window.Notification.requestPermission();
        currentPermission = permission as NotificationPermission;
        return currentPermission;
    } catch (error) {
        console.warn('[NotificationManager] Failed to request permission:', error);
        return 'denied';
    }
}

/**
 * Check current permission status
 * @returns NotificationPermission
 */
export function checkPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'denied';
    }
    return window.Notification.permission as NotificationPermission;
}

/**
 * Get whether notifications are permitted
 * @returns boolean
 */
export function isPermissionGranted(): boolean {
    return currentPermission === 'granted';
}

// ============================================
// Notification Sending
// ============================================

/**
 * Send a browser notification
 * @param title - Notification title
 * @param options - Notification options
 * @returns boolean success
 */
export function sendNotification(
    title: string,
    options?: NotificationOptions
): boolean {
    // Check if we should send (smart filtering)
    if (!shouldSendNotification()) {
        return false;
    }

    // Check permission
    if (currentPermission !== 'granted') {
        // Fall back to in-app notification
        return sendInAppNotification(title, options);
    }

    try {
        const notification = new window.Notification(title, {
            icon: options?.icon || '/favicon.ico',
            badge: options?.badge,
            body: options?.body,
            tag: options?.tag,
            data: options?.data,
            requireInteraction: options?.requireInteraction,
            silent: options?.silent,
        });

        // Handle click
        if (options?.data?.onClick) {
            notification.onclick = () => {
                window.focus();
                (options.data?.onClick as () => void)();
                notification.close();
            };
        }

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);

        // Also show in-app toast
        sendInAppNotification(title, options);

        // Update frequency cache
        updateFrequencyCache();

        return true;
    } catch (error) {
        console.warn('[NotificationManager] Failed to send notification:', error);
        // Fall back to in-app
        return sendInAppNotification(title, options);
    }
}

/**
 * Send in-app toast notification (always works)
 * @param title - Notification title
 * @param options - Notification options
 * @returns boolean success
 */
function sendInAppNotification(
    title: string,
    options?: NotificationOptions
): boolean {
    try {
        const notification: Notification = {
            id: generateId(),
            title,
            body: options?.body,
            type: (options?.data?.type as NotificationType) || 'system',
            priority: (options?.data?.priority as NotificationPriority) || 'medium',
            timestamp: Date.now(),
            read: false,
            dismissed: false,
            mediaId: options?.data?.mediaId as number | undefined,
            mediaType: options?.data?.mediaType as MediaType | undefined,
            data: options?.data,
        };

        // Add to history
        addToHistory(notification);

        // Notify listeners
        notifyToastListeners([notification]);

        return true;
    } catch (error) {
        console.warn('[NotificationManager] Failed to send in-app notification:', error);
        return false;
    }
}

/**
 * Add listener for toast notifications
 * @param listener - Callback function
 * @returns unsubscribe function
 */
export function addToastListener(
    listener: (notifications: Notification[]) => void
): () => void {
    toastListeners.push(listener);
    return () => {
        toastListeners = toastListeners.filter(l => l !== listener);
    };
}

/**
 * Notify all toast listeners
 */
function notifyToastListeners(notifications: Notification[]): void {
    toastListeners.forEach(listener => {
        try {
            listener(notifications);
        } catch (error) {
            console.warn('[NotificationManager] Toast listener error:', error);
        }
    });
}

// ============================================
// Scheduling
// ============================================

/**
 * Schedule a notification for later
 * @param notification - Scheduled notification config
 * @returns string - Scheduled notification ID
 */
export function scheduleNotification(notification: ScheduledNotification): string {
    const delay = notification.scheduledTime - Date.now();

    if (delay <= 0) {
        // Already past scheduled time, send immediately
        sendNotification(notification.title, {
            ...notification.options,
            data: {
                ...notification.options.data,
                type: notification.type,
                priority: notification.priority,
                mediaId: notification.mediaId,
                mediaType: notification.mediaType,
            },
        });
        return notification.id;
    }

    try {
        const timeoutId = window.setTimeout(() => {
            sendNotification(notification.title, {
                ...notification.options,
                data: {
                    ...notification.options.data,
                    type: notification.type,
                    priority: notification.priority,
                    mediaId: notification.mediaId,
                    mediaType: notification.mediaType,
                },
            });
            scheduledNotifications.delete(notification.id);
        }, delay);

        scheduledNotifications.set(notification.id, timeoutId);
        return notification.id;
    } catch (error) {
        console.warn('[NotificationManager] Failed to schedule notification:', error);
        return notification.id;
    }
}

/**
 * Cancel a scheduled notification
 * @param id - Scheduled notification ID
 */
export function cancelNotification(id: string): void {
    const timeoutId = scheduledNotifications.get(id);
    if (timeoutId) {
        window.clearTimeout(timeoutId);
        scheduledNotifications.delete(id);
    }
}

/**
 * Cancel all scheduled notifications
 */
export function cancelAllScheduledNotifications(): void {
    scheduledNotifications.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
    });
    scheduledNotifications.clear();
}

// ============================================
// Smart Notification Logic
// ============================================

/**
 * Check if we should send a notification
 * @returns boolean
 */
function shouldSendNotification(): boolean {
    // Check if notifications are enabled
    if (!preferences.enabled) {
        return false;
    }

    // Check quiet hours
    if (preferences.quietHoursEnabled && isInQuietHours()) {
        return false;
    }

    // Check frequency limit
    if (!checkFrequencyLimit()) {
        return false;
    }

    return true;
}

/**
 * Check if currently in quiet hours
 * @returns boolean
 */
function isInQuietHours(): boolean {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const start = preferences.quietHoursStart;
    const end = preferences.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (start > end) {
        return currentTime >= start || currentTime <= end;
    }

    return currentTime >= start && currentTime <= end;
}

/**
 * Check frequency limit
 * @returns boolean
 */
function checkFrequencyLimit(): boolean {
    const now = Date.now();

    // Reset if past reset time
    const resetInterval = getFrequencyResetInterval();
    if (now > frequencyLimitCache.resetTime) {
        frequencyLimitCache = { count: 0, resetTime: now + resetInterval };
        saveFrequencyCache();
    }

    return frequencyLimitCache.count < preferences.maxDailyNotifications;
}

/**
 * Update frequency limit cache
 */
function updateFrequencyCache(): void {
    frequencyLimitCache.count++;
    saveFrequencyCache();
}

/**
 * Get frequency reset interval based on preference
 */
function getFrequencyResetInterval(): number {
    switch (preferences.frequencyLimit) {
        case 'realtime':
            return 60 * 1000; // 1 minute
        case 'hourly':
            return 60 * 60 * 1000; // 1 hour
        case 'daily':
            return 24 * 60 * 60 * 1000; // 24 hours
        default:
            return 60 * 60 * 1000;
    }
}

/**
 * Save frequency cache to localStorage
 */
function saveFrequencyCache(): void {
    try {
        localStorage.setItem('notification_frequency_cache', JSON.stringify(frequencyLimitCache));
    } catch (error) {
        console.warn('[NotificationManager] Failed to save frequency cache:', error);
    }
}

/**
 * Calculate optimal notification time based on user activity
 * Returns timestamp when user is likely to see the notification
 */
export function calculateOptimalTime(): number {
    if (!preferences.smartTimingEnabled) {
        return Date.now();
    }

    const now = new Date();
    const hour = now.getHours();

    // Smart timing: notify during peak usage hours
    // Morning: 7-9 AM
    // Evening: 7-10 PM
    if (hour >= 7 && hour <= 9) {
        return Date.now() + (7 - hour) * 60 * 60 * 1000;
    }
    if (hour >= 19 && hour <= 22) {
        return Date.now() + (19 - hour) * 60 * 60 * 1000;
    }

    // Default to next hour
    return now.getTime() + 60 * 60 * 1000;
}

/**
 * Check for new releases matching user preferences
 * This is a placeholder - in a real app, this would call an API
 * @param userPreferences - User preference scores
 * @returns MediaRelease[]
 */
export async function checkForNewReleases(
    userPreferences: Record<string, number> = {}
): Promise<MediaRelease[]> {
    // This would normally fetch from an API
    // For now, return empty array as placeholder
    // In production, this would call TMDB or similar API
    console.log('[NotificationManager] Checking for new releases...');

    // Simulate API call
    return [];
}

/**
 * Determine if user should be notified about a release
 * @param release - Media release
 * @returns boolean
 */
export function shouldNotify(release: MediaRelease): boolean {
    // Check notification type is enabled
    if (!preferences.types.new_release) {
        return false;
    }

    // Check if already notified recently
    const recentNotification = notificationHistory.find(
        n => n.mediaId === release.id &&
            Date.now() - n.timestamp < 24 * 60 * 60 * 1000 // 24 hours
    );

    if (recentNotification) {
        return false;
    }

    // Check if matches user preferences (high match percentage)
    if (release.matchPercentage !== undefined && release.matchPercentage < 70) {
        return false;
    }

    return true;
}

/**
 * Calculate notification priority score
 * @param release - Media release
 * @returns number - Priority score (higher = more important)
 */
export function calculateNotificationPriority(release: MediaRelease): number {
    let score = 0;

    // Rating factor (0-30 points)
    score += Math.min(release.rating / 10 * 30, 30);

    // Match percentage factor (0-40 points)
    if (release.matchPercentage) {
        score += (release.matchPercentage / 100) * 40;
    }

    // Recency factor (0-20 points)
    const daysSinceRelease = Math.floor(
        (Date.now() - new Date(release.releaseDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceRelease <= 7) {
        score += 20;
    } else if (daysSinceRelease <= 30) {
        score += 10;
    }

    // Genre popularity factor (0-10 points)
    const popularGenres = ['Action', 'Comedy', 'Drama', 'Thriller', 'Horror'];
    if (release.genres.some(g => popularGenres.includes(g))) {
        score += 10;
    }

    return score;
}

/**
 * Filter notifications based on user settings
 * @param notifications - Array of notifications
 * @returns Filtered notifications
 */
export function filterNotifications(
    notifications: Notification[]
): Notification[] {
    return notifications.filter(notification => {
        // Filter by type
        if (!preferences.types[notification.type]) {
            return false;
        }

        // Filter by read status if needed
        // (keep all for now, let UI handle filtering)

        // Filter out snoozed
        if (notification.snoozedUntil && notification.snoozedUntil > Date.now()) {
            return false;
        }

        // Filter out dismissed
        if (notification.dismissed) {
            return false;
        }

        return true;
    });
}

// ============================================
// Notification History
// ============================================

/**
 * Get notification history
 * @returns Notification[]
 */
export function getNotificationHistory(): Notification[] {
    return [...notificationHistory];
}

/**
 * Get unread notification count
 * @returns number
 */
export function getUnreadCount(): number {
    return notificationHistory.filter(n => !n.read && !n.dismissed).length;
}

/**
 * Mark notification as read
 * @param id - Notification ID
 */
export function markAsRead(id: string): void {
    const notification = notificationHistory.find(n => n.id === id);
    if (notification) {
        notification.read = true;
        saveHistory();
    }
}

/**
 * Mark all notifications as read
 */
export function markAllAsRead(): void {
    notificationHistory.forEach(n => {
        n.read = true;
    });
    saveHistory();
}

/**
 * Dismiss a notification
 * @param id - Notification ID
 */
export function dismissNotification(id: string): void {
    const notification = notificationHistory.find(n => n.id === id);
    if (notification) {
        notification.dismissed = true;
        saveHistory();
    }
}

/**
 * Snooze a notification
 * @param id - Notification ID
 * @param duration - Snooze duration in milliseconds
 */
export function snoozeNotification(id: string, duration: number = 60 * 60 * 1000): void {
    const notification = notificationHistory.find(n => n.id === id);
    if (notification) {
        notification.snoozedUntil = Date.now() + duration;
        saveHistory();
    }
}

/**
 * Clear all notification history
 */
export function clearHistory(): void {
    notificationHistory = [];
    saveHistory();
}

/**
 * Add notification to history
 */
function addToHistory(notification: Notification): void {
    notificationHistory.unshift(notification);

    // Keep only last 50 notifications
    if (notificationHistory.length > 50) {
        notificationHistory = notificationHistory.slice(0, 50);
    }

    saveHistory();
}

/**
 * Save history to localStorage
 */
function saveHistory(): void {
    try {
        localStorage.setItem(
            NOTIFICATION_HISTORY_KEY,
            JSON.stringify({ notifications: notificationHistory })
        );
    } catch (error) {
        console.warn('[NotificationManager] Failed to save history:', error);
    }
}

// ============================================
// Preferences Management
// ============================================

/**
 * Get notification preferences
 * @returns NotificationPreferences
 */
export function getPreferences(): NotificationPreferences {
    return { ...preferences };
}

/**
 * Update notification preferences
 * @param newPrefs - New preferences
 */
export function updatePreferences(newPrefs: Partial<NotificationPreferences>): void {
    preferences = { ...preferences, ...newPrefs };
    savePreferences();
}

/**
 * Save preferences to localStorage
 */
function savePreferences(): void {
    try {
        localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(preferences));
    } catch (error) {
        console.warn('[NotificationManager] Failed to save preferences:', error);
    }
}

/**
 * Reset preferences to defaults
 */
export function resetPreferences(): void {
    preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
    savePreferences();
}

// ============================================
// Utility Functions
// ============================================

/**
 * Generate unique ID
 */
function generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create notification from media release
 */
export function createReleaseNotification(release: MediaRelease): Notification {
    const priority = calculateNotificationPriority(release);

    return {
        id: generateId(),
        title: `New ${release.mediaType}: ${release.title}`,
        body: release.genres.join(', '),
        type: 'new_release',
        priority: priority >= 70 ? 'high' : priority >= 40 ? 'medium' : 'low',
        timestamp: Date.now(),
        read: false,
        dismissed: false,
        mediaId: release.id,
        mediaType: release.mediaType,
    };
}

/**
 * Create trending notification
 */
export function createTrendingNotification(
    title: string,
    mediaId: number,
    mediaType: MediaType
): Notification {
    return {
        id: generateId(),
        title: `Trending: ${title}`,
        body: 'This is trending now based on your interests',
        type: 'trending',
        priority: 'medium',
        timestamp: Date.now(),
        read: false,
        dismissed: false,
        mediaId,
        mediaType,
    };
}

/**
 * Create similar content notification
 */
export function createSimilarNotification(
    title: string,
    similarTo: string,
    mediaId: number,
    mediaType: MediaType
): Notification {
    return {
        id: generateId(),
        title: `Similar to "${similarTo}"`,
        body: `You might also like: ${title}`,
        type: 'similar_to_liked',
        priority: 'medium',
        timestamp: Date.now(),
        read: false,
        dismissed: false,
        mediaId,
        mediaType,
    };
}

/**
 * Create seasonal recommendation notification
 */
export function createSeasonalNotification(
    title: string,
    season: string,
    mediaId: number,
    mediaType: MediaType
): Notification {
    return {
        id: generateId(),
        title: `${season} Pick: ${title}`,
        body: 'Perfect for this time of year!',
        type: 'seasonal_recommendation',
        priority: 'low',
        timestamp: Date.now(),
        read: false,
        dismissed: false,
        mediaId,
        mediaType,
    };
}

/**
 * Send new release notification
 */
export function notifyNewRelease(release: MediaRelease): boolean {
    if (!shouldNotify(release)) {
        return false;
    }

    const priority = calculateNotificationPriority(release);

    return sendNotification(`New ${release.mediaType}: ${release.title}`, {
        body: release.genres.join(', '),
        data: {
            type: 'new_release',
            priority: priority >= 70 ? 'high' : priority >= 40 ? 'medium' : 'low',
            mediaId: release.id,
            mediaType: release.mediaType,
        },
    });
}

/**
 * Send trending notification
 */
export function notifyTrending(title: string, mediaId: number, mediaType: MediaType): boolean {
    if (!preferences.types.trending) {
        return false;
    }

    return sendNotification(`Trending: ${title}`, {
        body: 'This is trending now based on your interests',
        data: {
            type: 'trending',
            priority: 'medium',
            mediaId,
            mediaType,
        },
    });
}

/**
 * Send similar content notification
 */
export function notifySimilar(
    title: string,
    similarTo: string,
    mediaId: number,
    mediaType: MediaType
): boolean {
    if (!preferences.types.similar_to_liked) {
        return false;
    }

    return sendNotification(`Similar to "${similarTo}"`, {
        body: `You might also like: ${title}`,
        data: {
            type: 'similar_to_liked',
            priority: 'medium',
            mediaId,
            mediaType,
        },
    });
}

/**
 * Send seasonal recommendation notification
 */
export function notifySeasonal(
    title: string,
    season: string,
    mediaId: number,
    mediaType: MediaType
): boolean {
    if (!preferences.types.seasonal_recommendation) {
        return false;
    }

    return sendNotification(`${season} Pick: ${title}`, {
        body: 'Perfect for this time of year!',
        data: {
            type: 'seasonal_recommendation',
            priority: 'low',
            mediaId,
            mediaType,
        },
    });
}

// ============================================
// Cleanup
// ============================================

/**
 * Cleanup notification manager
 */
export function cleanupNotificationManager(): void {
    cancelAllScheduledNotifications();
    toastListeners = [];
    initialized = false;
}

// ============================================
// Export Toast Component for React
// ============================================

/**
 * Toast notification component props
 */
export interface ToastProps {
    notification: Notification;
    onDismiss: (id: string) => void;
    onClick: (notification: Notification) => void;
    duration?: number;
}

/**
 * Default toast component renderer
 * This can be overridden in React integration
 */
export let ToastRenderer: React.FC<ToastProps> | null = null;

/**
 * Set custom toast renderer
 */
export function setToastRenderer(renderer: React.FC<ToastProps>): void {
    ToastRenderer = renderer;
}

// Initialize on module load
if (typeof window !== 'undefined') {
    initializeNotificationManager();
}

export default {
    initializeNotificationManager,
    requestPermission,
    checkPermission,
    isPermissionGranted,
    sendNotification,
    scheduleNotification,
    cancelNotification,
    cancelAllScheduledNotifications,
    addToastListener,
    getNotificationHistory,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    snoozeNotification,
    clearHistory,
    getPreferences,
    updatePreferences,
    resetPreferences,
    checkForNewReleases,
    shouldNotify,
    calculateNotificationPriority,
    calculateOptimalTime,
    filterNotifications,
    createReleaseNotification,
    createTrendingNotification,
    createSimilarNotification,
    createSeasonalNotification,
    notifyNewRelease,
    notifyTrending,
    notifySimilar,
    notifySeasonal,
    cleanupNotificationManager,
    setToastRenderer,
};