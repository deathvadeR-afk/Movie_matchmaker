/**
 * Intelligent Cache Manager with Predictive Prefetching
 * 
 * Provides smart caching for TMDB API responses with:
 * - Different TTL for different content types (trending=15min, search=30min, details=1hr)
 * - Predictive prefetching based on user browsing patterns
 * - Cache warming on app load
 * - Graceful fallback when caching fails
 * - Redis backend support with in-memory fallback
 */

import axios from 'axios';
import {
    CacheEntry,
    CacheStats,
    PrefetchRequest,
    PrefetchParams,
    BrowsingPattern,
    SearchPattern,
    PageHistory,
    CacheTTLConfig,
    DEFAULT_CACHE_TTL,
    MediaType,
    UserPreferences,
    PaginationInfo,
    MediaRecommendation
} from '../types';

// ============ Redis Backend Configuration ============

const REDIS_API_URL = import.meta.env.VITE_REDIS_API_URL || 'http://localhost:3001/api';
let redisAvailable = false;
let redisCheckPromise: Promise<boolean> | null = null;

/**
 * Check if Redis backend is available
 */
async function checkRedisAvailable(): Promise<boolean> {
    if (redisCheckPromise) return redisCheckPromise;

    redisCheckPromise = (async () => {
        try {
            const response = await axios.get(`${REDIS_API_URL}/health`, { timeout: 3000 });
            redisAvailable = response.data?.redis?.status === 'connected';
            console.log('[Cache] Redis status:', redisAvailable ? 'Connected' : 'Unavailable');
            return redisAvailable;
        } catch {
            redisAvailable = false;
            console.log('[Cache] Redis unavailable, using in-memory cache');
            return false;
        } finally {
            redisCheckPromise = null;
        }
    })();

    return redisCheckPromise;
}

/**
 * Get data from Redis backend
 */
async function getRedisData<T>(key: string): Promise<T | null> {
    try {
        const response = await axios.get(`${REDIS_API_URL}/cache/${encodeURIComponent(key)}`, { timeout: 5000 });
        if (response.data?.found) {
            return response.data.data as T;
        }
        return null;
    } catch (error) {
        console.warn('[Cache] Redis get failed:', error);
        return null;
    }
}

/**
 * Set data in Redis backend
 */
async function setRedisData<T>(key: string, data: T, ttl?: number): Promise<boolean> {
    try {
        await axios.post(`${REDIS_API_URL}/cache`, { key, data, ttl }, { timeout: 5000 });
        return true;
    } catch (error) {
        console.warn('[Cache] Redis set failed:', error);
        return false;
    }
}

/**
 * Delete data from Redis backend
 */
async function deleteRedisData(key: string): Promise<boolean> {
    try {
        await axios.delete(`${REDIS_API_URL}/cache/${encodeURIComponent(key)}`, { timeout: 5000 });
        return true;
    } catch (error) {
        console.warn('[Cache] Redis delete failed:', error);
        return false;
    }
}

/**
 * Clear all data from Redis backend
 */
async function clearRedisData(): Promise<boolean> {
    try {
        await axios.delete(`${REDIS_API_URL}/cache`, { timeout: 5000 });
        return true;
    } catch (error) {
        console.warn('[Cache] Redis clear failed:', error);
        return false;
    }
}

// Simple hash function for generating cache keys
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

// Generate smart cache key based on request parameters
export function generateCacheKey(
    type: 'trending' | 'search' | 'details' | 'recommendations' | 'similar' | 'providers',
    params: Record<string, unknown>
): string {
    const base = `cache:${type}`;

    // Sort keys for consistent hashing
    const sortedKeys = Object.keys(params).sort();
    const paramString = sortedKeys
        .map(key => `${key}=${JSON.stringify(params[key])}`)
        .join('&');

    const hash = simpleHash(paramString);
    return `${base}:${hash}`;
}

// In-memory cache storage
const cacheStore = new Map<string, CacheEntry>();
const pendingPrefetches = new Map<string, PrefetchRequest>();

// Cache statistics
const stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    hitRate: 0,
    avgHitTime: 0
};

let totalHitTime = 0;
let hitCount = 0;

// User browsing pattern storage
let browsingPattern: BrowsingPattern = {
    recentSearches: [],
    viewedItems: [],
    pageHistory: [],
    lastActivity: Date.now(),
    idleTime: 0
};

// Configuration
let config: CacheTTLConfig = { ...DEFAULT_CACHE_TTL };
const MAX_CACHE_SIZE = 100; // Maximum number of cache entries
const MAX_PREFETCH_QUEUE = 10; // Maximum concurrent prefetches
const IDLE_THRESHOLD = 30000; // 30 seconds for idle detection

/**
 * Initialize cache - check Redis availability
 */
export async function initCache(): Promise<void> {
    await checkRedisAvailable();
}

/**
 * Get cached data if valid (checks Redis first, then falls back to memory)
 * @param key - Cache key to retrieve
 * @returns Cached data or null if expired/not found
 */
export async function getCached<T = unknown>(key: string): Promise<T | null> {
    const startTime = performance.now();

    // Try Redis first if available
    if (redisAvailable) {
        const redisData = await getRedisData<T>(key);
        if (redisData !== null) {
            // Update stats
            stats.hits++;
            const elapsed = performance.now() - startTime;
            totalHitTime += elapsed;
            hitCount++;
            stats.avgHitTime = totalHitTime / hitCount;
            updateHitRate();
            console.log(`[Cache] Redis HIT: movie_cache:${key}`);
            return redisData;
        }
        stats.misses++;
        updateHitRate();
    }

    // Fallback to in-memory cache
    try {
        const entry = cacheStore.get(key);

        if (!entry) {
            stats.misses++;
            updateHitRate();
            return null;
        }

        const now = Date.now();

        // Check if expired
        if (now > entry.expiresAt) {
            cacheStore.delete(key);
            stats.misses++;
            updateHitRate();
            return null;
        }

        // Update hit count and stats
        entry.hitCount++;
        stats.hits++;

        const elapsed = performance.now() - startTime;
        totalHitTime += elapsed;
        hitCount++;
        stats.avgHitTime = totalHitTime / hitCount;

        updateHitRate();
        console.log(`[Cache] Memory HIT: ${key}`);
        return entry.data as T;
    } catch (error) {
        console.warn('Cache read failed, falling back to network:', error);
        stats.misses++;
        updateHitRate();
        return null;
    }
}

/**
 * Store data in cache with TTL (writes to both Redis and memory)
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttl - Optional custom TTL in milliseconds
 * @param metadata - Optional metadata for the cache entry
 */
export async function setCache<T = unknown>(
    key: string,
    data: T,
    ttl?: number,
    metadata?: Record<string, unknown>
): Promise<boolean> {
    const now = Date.now();
    const effectiveTTL = ttl || DEFAULT_CACHE_TTL.search;

    // Write to Redis if available (async, don't await for performance)
    if (redisAvailable) {
        setRedisData(key, data, effectiveTTL).then((success) => {
            if (success) {
                console.log(`[Cache] Redis SET: movie_cache:${key} (TTL: ${effectiveTTL}ms)`);
            } else {
                console.warn(`[Cache] Redis SET failed: movie_cache:${key}`);
            }
        }).catch(err => console.warn('[Cache] Redis set error:', err));
    }

    // Always write to memory as fallback
    try {
        // Evict oldest entries if cache is full
        if (cacheStore.size >= MAX_CACHE_SIZE) {
            evictOldestEntry();
        }

        const entry: CacheEntry<T> = {
            data,
            timestamp: now,
            ttl: effectiveTTL,
            expiresAt: now + effectiveTTL,
            hitCount: 0,
            metadata: metadata as CacheEntry['metadata']
        };

        cacheStore.set(key, entry);
        stats.totalSize = cacheStore.size;
        console.log(`[Cache] Memory SET: ${key} (TTL: ${effectiveTTL}ms)`);

        return true;
    } catch (error) {
        console.warn('Cache write failed, continuing without cache:', error);
        return false;
    }
}

/**
 * Clear cache for specific key or all cache (clears both Redis and memory)
 * @param key - Optional specific key to clear
 */
export async function clearCache(key?: string): Promise<void> {
    // Clear from Redis if available
    if (redisAvailable && key) {
        await deleteRedisData(key);
    } else if (redisAvailable && !key) {
        await clearRedisData();
    }

    // Always clear from memory
    if (key) {
        cacheStore.delete(key);
    } else {
        cacheStore.clear();
    }
    stats.totalSize = cacheStore.size;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
    return { ...stats };
}

/**
 * Update cache hit rate
 */
function updateHitRate(): void {
    const total = stats.hits + stats.misses;
    stats.hitRate = total > 0 ? stats.hits / total : 0;
}

/**
 * Evict the oldest/least used cache entry
 */
function evictOldestEntry(): void {
    let oldestKey: string | null = null;
    let oldestScore = Infinity;

    for (const [key, entry] of cacheStore.entries()) {
        // Prioritize by age and hit count (lower score = more eligible for eviction)
        const score = entry.timestamp - (entry.hitCount * 1000);
        if (score < oldestScore) {
            oldestScore = score;
            oldestKey = key;
        }
    }

    if (oldestKey) {
        cacheStore.delete(oldestKey);
        stats.evictions++;
    }
}

/**
 * Check if cache entry is stale and needs refresh
 * @param key - Cache key to check
 * @param freshnessThreshold - Optional threshold for freshness (default: 50% of TTL)
 */
export function isCacheStale(key: string, freshnessThreshold = 0.5): boolean {
    const entry = cacheStore.get(key);
    if (!entry) return true;

    const now = Date.now();
    const age = now - entry.timestamp;
    const threshold = entry.ttl * freshnessThreshold;

    return age > threshold;
}

/**
 * Get TTL for specific content type
 */
export function getTTLForType(
    type: 'trending' | 'search' | 'details' | 'recommendations' | 'similar'
): number {
    return config[type];
}

/**
 * Update cache configuration
 */
export function updateCacheConfig(newConfig: Partial<CacheTTLConfig>): void {
    config = { ...config, ...newConfig };
}

// ============ Predictive Prefetching Functions ============

/**
 * Generate unique ID for prefetch request
 */
function generatePrefetchId(): string {
    return `prefetch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Prefetch next page based on current search
 * @param query - Current search query
 * @param currentPage - Current page number
 * @param options - Additional search options
 */
export async function prefetchNextPage(
    query: string,
    currentPage: number,
    options?: {
        mediaType?: MediaType;
        genres?: string[];
        region?: string;
    }
): Promise<PrefetchRequest | null> {
    const nextPage = currentPage + 1;

    // Track the search pattern
    const searchPattern: SearchPattern = {
        query,
        page: currentPage,
        timestamp: Date.now(),
        completed: false
    };
    browsingPattern.recentSearches.push(searchPattern);

    // Keep only recent searches
    if (browsingPattern.recentSearches.length > 10) {
        browsingPattern.recentSearches = browsingPattern.recentSearches.slice(-10);
    }

    // Check cache first
    const cacheKey = generateCacheKey('search', {
        query,
        page: nextPage,
        ...options
    });

    const cachedData = await getCached(cacheKey);
    if (cachedData) {
        // Already cached, no need to prefetch
        return null;
    }

    // Create prefetch request
    const requestId = generatePrefetchId();
    let cancelled = false;

    const prefetchRequest: PrefetchRequest = {
        id: requestId,
        type: 'nextPage',
        priority: 'medium',
        status: 'pending',
        createdAt: Date.now(),
        params: {
            query,
            currentPage,
            ...options
        },
        cancel: () => {
            cancelled = true;
            prefetchRequest.status = 'cancelled';
        }
    };

    pendingPrefetches.set(requestId, prefetchRequest);

    // Execute prefetch
    executePrefetch(prefetchRequest, async () => {
        if (cancelled) return;

        try {
            // Dynamically import to avoid circular dependencies
            const { searchMedia } = await import('./tmdb');

            const result = await searchMedia(query, {
                mediaType: options?.mediaType || 'movie',
                genres: options?.genres,
                region: options?.region,
                page: nextPage
            });

            if (!cancelled && result.results.length > 0) {
                setCache(cacheKey, result, config.search, {
                    query,
                    page: nextPage,
                    ...options
                });
            }
        } catch (error) {
            console.warn('Prefetch next page failed:', error);
        }
    });

    return prefetchRequest;
}

/**
 * Prefetch similar content to a viewed item
 * @param mediaId - The media ID to find similar content for
 * @param mediaType - Type of media (movie/tv/anime)
 */
export async function prefetchSimilar(
    mediaId: number,
    mediaType: MediaType = 'movie'
): Promise<PrefetchRequest | null> {
    // Track viewed item
    if (!browsingPattern.viewedItems.includes(mediaId)) {
        browsingPattern.viewedItems.push(mediaId);
        if (browsingPattern.viewedItems.length > 20) {
            browsingPattern.viewedItems = browsingPattern.viewedItems.slice(-20);
        }
    }

    // Check cache first
    const cacheKey = generateCacheKey('similar', { mediaId, mediaType });
    const cachedData = await getCached(cacheKey);
    if (cachedData) {
        return null;
    }

    const requestId = generatePrefetchId();
    let cancelled = false;

    const prefetchRequest: PrefetchRequest = {
        id: requestId,
        type: 'similar',
        priority: 'low',
        status: 'pending',
        createdAt: Date.now(),
        params: {
            mediaId,
            mediaType
        },
        cancel: () => {
            cancelled = true;
            prefetchRequest.status = 'cancelled';
        }
    };

    pendingPrefetches.set(requestId, prefetchRequest);

    executePrefetch(prefetchRequest, async () => {
        if (cancelled) return;

        try {
            const { searchMedia } = await import('./tmdb');

            // Use search with empty query to get popular content as fallback
            const result = await searchMedia('', {
                mediaType: mediaType as 'movie',
                page: 1
            });

            if (!cancelled && result.results.length > 0) {
                // Store top results as "similar" content
                const similarResults = result.results.slice(0, 10);
                setCache(cacheKey, { results: similarResults }, config.similar, {
                    mediaId,
                    mediaType
                });
            }
        } catch (error) {
            console.warn('Prefetch similar failed:', error);
        }
    });

    return prefetchRequest;
}

/**
 * Prefetch trending content
 * @param mediaType - Type of media to prefetch
 */
export async function prefetchTrending(
    mediaType: MediaType = 'movie'
): Promise<PrefetchRequest | null> {
    const cacheKey = generateCacheKey('trending', { mediaType });
    const cachedData = await getCached(cacheKey);
    if (cachedData) {
        return null;
    }

    const requestId = generatePrefetchId();
    let cancelled = false;

    const prefetchRequest: PrefetchRequest = {
        id: requestId,
        type: 'trending',
        priority: 'high',
        status: 'pending',
        createdAt: Date.now(),
        params: { mediaType },
        cancel: () => {
            cancelled = true;
            prefetchRequest.status = 'cancelled';
        }
    };

    pendingPrefetches.set(requestId, prefetchRequest);

    executePrefetch(prefetchRequest, async () => {
        if (cancelled) return;

        try {
            const { searchMedia } = await import('./tmdb');

            const result = await searchMedia('', {
                mediaType,
                page: 1
            });

            if (!cancelled && result.results.length > 0) {
                setCache(cacheKey, result, config.trending, { mediaType });
            }
        } catch (error) {
            console.warn('Prefetch trending failed:', error);
        }
    });

    return prefetchRequest;
}

/**
 * Prefetch content based on user preferences
 * @param preferences - User preferences object
 */
export async function prefetchRecommendations(
    preferences: UserPreferences
): Promise<PrefetchRequest | null> {
    const topGenres = Object.entries(preferences.genreScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([genre]) => genre);

    if (topGenres.length === 0) {
        return null;
    }

    const cacheKey = generateCacheKey('recommendations', {
        genres: topGenres,
        mediaType: 'movie'
    });

    const cachedData = await getCached(cacheKey);
    if (cachedData) {
        return null;
    }

    const requestId = generatePrefetchId();
    let cancelled = false;

    const prefetchRequest: PrefetchRequest = {
        id: requestId,
        type: 'recommendations',
        priority: 'medium',
        status: 'pending',
        createdAt: Date.now(),
        params: {
            genres: topGenres,
            preferences
        },
        cancel: () => {
            cancelled = true;
            prefetchRequest.status = 'cancelled';
        }
    };

    pendingPrefetches.set(requestId, prefetchRequest);

    executePrefetch(prefetchRequest, async () => {
        if (cancelled) return;

        try {
            const { searchMedia } = await import('./tmdb');

            const result = await searchMedia('', {
                mediaType: 'movie',
                genres: topGenres,
                page: 1
            });

            if (!cancelled && result.results.length > 0) {
                setCache(cacheKey, result, config.recommendations, {
                    genres: topGenres
                });
            }
        } catch (error) {
            console.warn('Prefetch recommendations failed:', error);
        }
    });

    return prefetchRequest;
}

/**
 * Cancel a prefetch request
 * @param requestId - ID of the prefetch request to cancel
 */
export function cancelPrefetch(requestId: string): boolean {
    const request = pendingPrefetches.get(requestId);
    if (request) {
        request.cancel();
        pendingPrefetches.delete(requestId);
        return true;
    }
    return false;
}

/**
 * Execute prefetch with priority and concurrency control
 */
function executePrefetch(
    request: PrefetchRequest,
    fetchFn: () => Promise<void>
): void {
    const activeCount = Array.from(pendingPrefetches.values())
        .filter(r => r.status === 'active').length;

    if (activeCount >= MAX_PREFETCH_QUEUE) {
        // Wait for a slot to become available
        setTimeout(() => executePrefetch(request, fetchFn), 1000);
        return;
    }

    request.status = 'active';
    request.startedAt = Date.now();

    fetchFn().then(() => {
        request.status = 'completed';
        request.completedAt = Date.now();
        pendingPrefetches.delete(request.id);
    }).catch((error) => {
        console.warn('Prefetch error:', error);
        request.status = 'completed';
        pendingPrefetches.delete(request.id);
    });
}

/**
 * Get all pending prefetch requests
 */
export function getPendingPrefetches(): PrefetchRequest[] {
    return Array.from(pendingPrefetches.values());
}

// ============ User Browsing Pattern Tracking ============

/**
 * Record user page view for pattern analysis
 */
export function recordPageView(query: string, page: number): void {
    const pageHistory: PageHistory = {
        query,
        page,
        timestamp: Date.now()
    };

    browsingPattern.pageHistory.push(pageHistory);
    browsingPattern.lastActivity = Date.now();
    browsingPattern.idleTime = 0;

    // Keep only recent page history
    if (browsingPattern.pageHistory.length > 50) {
        browsingPattern.pageHistory = browsingPattern.pageHistory.slice(-50);
    }
}

/**
 * Update idle state
 */
export function updateIdleState(): void {
    const now = Date.now();
    const timeSinceActivity = now - browsingPattern.lastActivity;

    if (timeSinceActivity > IDLE_THRESHOLD) {
        browsingPattern.idleTime = timeSinceActivity;
    }
}

/**
 * Get current browsing pattern
 */
export function getBrowsingPattern(): BrowsingPattern {
    return { ...browsingPattern };
}

/**
 * Predict next likely page based on browsing patterns
 */
export function predictNextPage(): { query: string; page: number } | null {
    const recentPages = browsingPattern.pageHistory.slice(-5);

    if (recentPages.length < 2) {
        return null;
    }

    // Find pattern in pagination
    for (let i = recentPages.length - 1; i >= 1; i--) {
        const current = recentPages[i];
        const previous = recentPages[i - 1];

        if (current.query === previous.query && current.page > previous.page) {
            // User is paginating through results
            return {
                query: current.query,
                page: current.page + 1
            };
        }
    }

    // Return last search as fallback
    const lastSearch = browsingPattern.recentSearches[browsingPattern.recentSearches.length - 1];
    if (lastSearch) {
        return {
            query: lastSearch.query,
            page: lastSearch.page + 1
        };
    }

    return null;
}

/**
 * Check if user is idle and should trigger prefetching
 */
export function shouldPrefetchOnIdle(): boolean {
    updateIdleState();
    return browsingPattern.idleTime > IDLE_THRESHOLD;
}

// ============ Cache Warming ============

/**
 * Warm cache with trending content on app load
 */
export async function warmCacheOnLoad(): Promise<void> {
    try {
        // Prefetch trending for all media types
        await Promise.all([
            prefetchTrending('movie'),
            prefetchTrending('tv'),
            prefetchTrending('anime')
        ]);

        console.log('Cache warmed with trending content');
    } catch (error) {
        console.warn('Cache warming failed:', error);
    }
}

/**
 * Warm cache with user preference content
 */
export async function warmCacheWithPreferences(
    preferences: UserPreferences
): Promise<void> {
    try {
        // Get top genres from preferences
        const topGenres = Object.entries(preferences.genreScores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([genre]) => genre);

        if (topGenres.length > 0) {
            await prefetchRecommendations(preferences);
            console.log('Cache warmed with preference content');
        }
    } catch (error) {
        console.warn('Preference cache warming failed:', error);
    }
}

/**
 * Initialize idle detection for prefetching
 */
let idleInterval: ReturnType<typeof setInterval> | null = null;

export function startIdleDetection(): void {
    if (idleInterval) return;

    idleInterval = setInterval(() => {
        updateIdleState();

        if (shouldPrefetchOnIdle()) {
            // Prefetch trending content when idle
            prefetchTrending('movie').catch(() => { });
        }
    }, 10000); // Check every 10 seconds
}

export function stopIdleDetection(): void {
    if (idleInterval) {
        clearInterval(idleInterval);
        idleInterval = null;
    }
}

/**
 * Clear all pending prefetches
 */
export function clearAllPrefetches(): void {
    for (const request of pendingPrefetches.values()) {
        request.cancel();
    }
    pendingPrefetches.clear();
}

// ============ Export ============

export default {
    // Cache management
    generateCacheKey,
    getCached,
    setCache,
    clearCache,
    getCacheStats,
    isCacheStale,
    getTTLForType,
    updateCacheConfig,

    // Predictive prefetching
    prefetchNextPage,
    prefetchSimilar,
    prefetchTrending,
    prefetchRecommendations,
    cancelPrefetch,
    getPendingPrefetches,

    // Browsing patterns
    recordPageView,
    updateIdleState,
    getBrowsingPattern,
    predictNextPage,
    shouldPrefetchOnIdle,

    // Cache warming
    warmCacheOnLoad,
    warmCacheWithPreferences,

    // Idle detection
    startIdleDetection,
    stopIdleDetection,
    clearAllPrefetches
};
