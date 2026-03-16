/**
 * Analytics Service
 * Provides user analytics and engagement metrics
 */

import { supabase } from '../lib/supabase';

// Types for analytics data
export interface GenreDistribution {
    genre: string;
    count: number;
    percentage: number;
}

export interface MediaTypeDistribution {
    type: 'movie' | 'tv' | 'anime';
    count: number;
    percentage: number;
}

export interface InteractionTrend {
    date: string;
    count: number;
}

export interface ActiveHour {
    hour: number;
    count: number;
}

export interface SessionStats {
    totalSessions: number;
    averageDuration: number; // in minutes
    sessionsPerWeek: number;
    lastSessionDate: string | null;
}

export interface EngagementStats {
    totalInteractions: number;
    uniqueMediaViewed: number;
    searchesPerformed: number;
    recommendationsAccepted: number;
    recommendationsDismissed: number;
    acceptanceRate: number;
}

export interface TopGenre {
    genre: string;
    score: number;
    rank: number;
}

// Local storage key for analytics data when not authenticated
const ANALYTICS_STORAGE_KEY = 'user_analytics_data';

/**
 * Get user ID - either from Supabase auth or generate a local ID
 */
function getUserId(): string | null {
    const stored = localStorage.getItem('movie-recommendation-auth');
    if (stored) {
        try {
            const authData = JSON.parse(stored);
            return authData?.user?.id || null;
        } catch {
            return null;
        }
    }
    return null;
}

/**
 * Store analytics data locally when not authenticated
 */
function getLocalAnalytics(): Record<string, unknown> {
    try {
        const stored = localStorage.getItem(ANALYTICS_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.warn('[analytics] Failed to load local analytics:', error);
    }
    return {
        interactions: [],
        sessions: [],
        lastUpdated: Date.now()
    };
}

function saveLocalAnalytics(data: Record<string, unknown>): void {
    try {
        localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify({
            ...data,
            lastUpdated: Date.now()
        }));
    } catch (error) {
        console.warn('[analytics] Failed to save local analytics:', error);
    }
}

/**
 * Track an interaction locally (fallback when not authenticated)
 */
export async function trackInteractionLocally(interactionType: string, data: Record<string, unknown> = {}): Promise<void> {
    const analytics = getLocalAnalytics();
    const interactions = (analytics.interactions as Record<string, unknown>[]) || [];

    interactions.push({
        type: interactionType,
        ...data,
        timestamp: new Date().toISOString()
    });

    // Keep only last 1000 interactions
    if (interactions.length > 1000) {
        interactions.splice(0, interactions.length - 1000);
    }

    saveLocalAnalytics({ ...analytics, interactions });
}

/**
 * Get user's engagement stats
 */
export async function getUserEngagementStats(userId: string): Promise<EngagementStats> {
    try {
        // Fetch interactions from Supabase
        const { data: interactions, error } = await supabase
            .from('user_interactions')
            .select('interaction_type, media_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) {
            console.warn('[analytics] Failed to fetch engagement stats:', error);
            return getDefaultEngagementStats();
        }

        const totalInteractions = interactions?.length || 0;
        const uniqueMediaViewed = new Set(interactions?.map(i => i.media_id).filter(Boolean)).size;
        const searchesPerformed = interactions?.filter(i =>
            i.interaction_type === 'search' || i.interaction_type === 'query'
        ).length || 0;

        // For acceptance rate, we'd need more detailed feedback data
        // For now, estimate based on watchlist additions vs total recommendations shown
        const recommendationsAccepted = interactions?.filter(i =>
            i.interaction_type === 'add_to_watchlist' || i.interaction_type === 'positive_feedback'
        ).length || 0;

        const recommendationsDismissed = interactions?.filter(i =>
            i.interaction_type === 'dismiss' || i.interaction_type === 'negative_feedback'
        ).length || 0;

        const acceptanceRate = totalInteractions > 0
            ? Math.round((recommendationsAccepted / (recommendationsAccepted + recommendationsDismissed || 1)) * 100)
            : 0;

        return {
            totalInteractions,
            uniqueMediaViewed,
            searchesPerformed,
            recommendationsAccepted,
            recommendationsDismissed,
            acceptanceRate
        };
    } catch (error) {
        console.warn('[analytics] Error getting engagement stats:', error);
        return getDefaultEngagementStats();
    }
}

function getDefaultEngagementStats(): EngagementStats {
    return {
        totalInteractions: 0,
        uniqueMediaViewed: 0,
        searchesPerformed: 0,
        recommendationsAccepted: 0,
        recommendationsDismissed: 0,
        acceptanceRate: 0
    };
}

/**
 * Get genre distribution from user interactions
 */
export async function getGenreDistribution(userId: string): Promise<GenreDistribution[]> {
    try {
        const { data: interactions, error } = await supabase
            .from('user_interactions')
            .select('genre_tags')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) {
            console.warn('[analytics] Failed to fetch genre distribution:', error);
            return getLocalGenreDistribution();
        }

        // Count genres from all interactions
        const genreCounts: Record<string, number> = {};
        let totalCount = 0;

        interactions?.forEach(interaction => {
            if (interaction.genre_tags && Array.isArray(interaction.genre_tags)) {
                interaction.genre_tags.forEach((genre: string) => {
                    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                    totalCount++;
                });
            }
        });

        // Convert to array and sort by count
        const distribution: GenreDistribution[] = Object.entries(genreCounts)
            .map(([genre, count]) => ({
                genre,
                count,
                percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 genres

        return distribution.length > 0 ? distribution : getLocalGenreDistribution();
    } catch (error) {
        console.warn('[analytics] Error getting genre distribution:', error);
        return getLocalGenreDistribution();
    }
}

function getLocalGenreDistribution(): GenreDistribution[] {
    const analytics = getLocalAnalytics();
    const interactions = (analytics.interactions as Record<string, unknown>[]) || [];

    const genreCounts: Record<string, number> = {};
    let totalCount = 0;

    interactions.forEach(interaction => {
        const genres = interaction.genres as string[] | undefined;
        if (genres && Array.isArray(genres)) {
            genres.forEach(genre => {
                genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                totalCount++;
            });
        }
    });

    return Object.entries(genreCounts)
        .map(([genre, count]) => ({
            genre,
            count,
            percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
}

/**
 * Get interaction trends over time (weekly/monthly)
 */
export async function getInteractionTrends(userId: string, days: number = 30): Promise<InteractionTrend[]> {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data: interactions, error } = await supabase
            .from('user_interactions')
            .select('created_at')
            .eq('user_id', userId)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });

        if (error) {
            console.warn('[analytics] Failed to fetch interaction trends:', error);
            return getLocalInteractionTrends(days);
        }

        // Group by date
        const trendsMap: Record<string, number> = {};

        interactions?.forEach(interaction => {
            const date = new Date(interaction.created_at).toISOString().split('T')[0];
            trendsMap[date] = (trendsMap[date] || 0) + 1;
        });

        // Fill in missing dates
        const trends: InteractionTrend[] = [];
        const currentDate = new Date(startDate);
        const endDate = new Date();

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            trends.push({
                date: dateStr,
                count: trendsMap[dateStr] || 0
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return trends;
    } catch (error) {
        console.warn('[analytics] Error getting interaction trends:', error);
        return getLocalInteractionTrends(days);
    }
}

function getLocalInteractionTrends(days: number): InteractionTrend[] {
    const analytics = getLocalAnalytics();
    const interactions = (analytics.interactions as Record<string, unknown>[]) || [];

    const trendsMap: Record<string, number> = {};
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    interactions.forEach(interaction => {
        const timestamp = interaction.timestamp as string;
        if (timestamp && new Date(timestamp) >= startDate) {
            const date = new Date(timestamp).toISOString().split('T')[0];
            trendsMap[date] = (trendsMap[date] || 0) + 1;
        }
    });

    const trends: InteractionTrend[] = [];
    const currentDate = new Date(startDate);
    const endDate = new Date();

    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        trends.push({
            date: dateStr,
            count: trendsMap[dateStr] || 0
        });
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return trends;
}

/**
 * Get media type distribution (Movie vs TV vs Anime)
 */
export async function getMediaTypeDistribution(userId: string): Promise<MediaTypeDistribution[]> {
    try {
        const { data: interactions, error } = await supabase
            .from('user_interactions')
            .select('media_type')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) {
            console.warn('[analytics] Failed to fetch media type distribution:', error);
            return getLocalMediaTypeDistribution();
        }

        const typeCounts: Record<string, number> = {
            movie: 0,
            tv: 0,
            anime: 0
        };
        let totalCount = 0;

        interactions?.forEach(interaction => {
            const mediaType = interaction.media_type as string;
            if (mediaType && typeCounts.hasOwnProperty(mediaType)) {
                typeCounts[mediaType]++;
                totalCount++;
            }
        });

        return [
            { type: 'movie' as const, count: typeCounts.movie, percentage: totalCount > 0 ? Math.round((typeCounts.movie / totalCount) * 100) : 0 },
            { type: 'tv' as const, count: typeCounts.tv, percentage: totalCount > 0 ? Math.round((typeCounts.tv / totalCount) * 100) : 0 },
            { type: 'anime' as const, count: typeCounts.anime, percentage: totalCount > 0 ? Math.round((typeCounts.anime / totalCount) * 100) : 0 }
        ].filter(t => t.count > 0);
    } catch (error) {
        console.warn('[analytics] Error getting media type distribution:', error);
        return getLocalMediaTypeDistribution();
    }
}

function getLocalMediaTypeDistribution(): MediaTypeDistribution[] {
    const analytics = getLocalAnalytics();
    const interactions = (analytics.interactions as Record<string, unknown>[]) || [];

    const typeCounts: Record<string, number> = {
        movie: 0,
        tv: 0,
        anime: 0
    };
    let totalCount = 0;

    interactions.forEach(interaction => {
        const mediaType = interaction.mediaType as string;
        if (mediaType && typeCounts.hasOwnProperty(mediaType)) {
            typeCounts[mediaType]++;
            totalCount++;
        }
    });

    return [
        { type: 'movie' as const, count: typeCounts.movie, percentage: totalCount > 0 ? Math.round((typeCounts.movie / totalCount) * 100) : 0 },
        { type: 'tv' as const, count: typeCounts.tv, percentage: totalCount > 0 ? Math.round((typeCounts.tv / totalCount) * 100) : 0 },
        { type: 'anime' as const, count: typeCounts.anime, percentage: totalCount > 0 ? Math.round((typeCounts.anime / totalCount) * 100) : 0 }
    ].filter(t => t.count > 0);
}

/**
 * Get active hours - when user is most active
 */
export async function getActiveHours(userId: string): Promise<ActiveHour[]> {
    try {
        const { data: interactions, error } = await supabase
            .from('user_interactions')
            .select('created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) {
            console.warn('[analytics] Failed to fetch active hours:', error);
            return getLocalActiveHours();
        }

        const hourCounts: number[] = new Array(24).fill(0);

        interactions?.forEach(interaction => {
            const hour = new Date(interaction.created_at).getHours();
            hourCounts[hour]++;
        });

        return hourCounts.map((count, hour) => ({
            hour,
            count
        }));
    } catch (error) {
        console.warn('[analytics] Error getting active hours:', error);
        return getLocalActiveHours();
    }
}

function getLocalActiveHours(): ActiveHour[] {
    const analytics = getLocalAnalytics();
    const interactions = (analytics.interactions as Record<string, unknown>[]) || [];

    const hourCounts: number[] = new Array(24).fill(0);

    interactions.forEach(interaction => {
        const timestamp = interaction.timestamp as string;
        if (timestamp) {
            const hour = new Date(timestamp).getHours();
            hourCounts[hour]++;
        }
    });

    return hourCounts.map((count, hour) => ({
        hour,
        count
    }));
}

/**
 * Get recommendation acceptance rate
 */
export async function getRecommendationAcceptanceRate(userId: string): Promise<number> {
    try {
        const { data: interactions, error } = await supabase
            .from('user_interactions')
            .select('interaction_type')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) {
            console.warn('[analytics] Failed to fetch acceptance rate:', error);
            return getLocalAcceptanceRate();
        }

        const accepted = interactions?.filter(i =>
            i.interaction_type === 'add_to_watchlist' ||
            i.interaction_type === 'positive_feedback' ||
            i.interaction_type === 'accepted'
        ).length || 0;

        const dismissed = interactions?.filter(i =>
            i.interaction_type === 'dismiss' ||
            i.interaction_type === 'negative_feedback' ||
            i.interaction_type === 'dismissed'
        ).length || 0;

        const total = accepted + dismissed;
        return total > 0 ? Math.round((accepted / total) * 100) : 0;
    } catch (error) {
        console.warn('[analytics] Error getting acceptance rate:', error);
        return getLocalAcceptanceRate();
    }
}

function getLocalAcceptanceRate(): number {
    const analytics = getLocalAnalytics();
    const interactions = (analytics.interactions as Record<string, unknown>[]) || 0;

    const accepted = interactions.filter((i: Record<string, unknown>) =>
        i.type === 'add_to_watchlist' || i.type === 'accepted'
    ).length;

    const dismissed = interactions.filter((i: Record<string, unknown>) =>
        i.type === 'dismiss' || i.type === 'dismissed'
    ).length;

    const total = accepted + dismissed;
    return total > 0 ? Math.round((accepted / total) * 100) : 0;
}

/**
 * Get session stats - duration and frequency
 */
export async function getSessionStats(userId: string): Promise<SessionStats> {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: interactions, error } = await supabase
            .from('user_interactions')
            .select('created_at, session_id')
            .eq('user_id', userId)
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: true });

        if (error) {
            console.warn('[analytics] Failed to fetch session stats:', error);
            return getLocalSessionStats();
        }

        // Group interactions by session
        const sessions = new Map<string, Date[]>();

        interactions?.forEach(interaction => {
            const sessionId = interaction.session_id || 'default';
            const timestamp = new Date(interaction.created_at);

            if (!sessions.has(sessionId)) {
                sessions.set(sessionId, []);
            }
            sessions.get(sessionId)!.push(timestamp);
        });

        // Calculate session durations
        let totalDuration = 0;
        let sessionCount = 0;
        let lastSessionDate: string | null = null;

        sessions.forEach(timestamps => {
            if (timestamps.length > 1) {
                const duration = (timestamps[timestamps.length - 1].getTime() - timestamps[0].getTime()) / 60000; // minutes
                totalDuration += duration;
                sessionCount++;
            }
        });

        if (sessions.size > 0) {
            const lastSession = sessions.values().next().value;
            if (lastSession && lastSession.length > 0) {
                lastSessionDate = lastSession[lastSession.length - 1].toISOString();
            }
        }

        const averageDuration = sessionCount > 0 ? Math.round(totalDuration / sessionCount) : 0;
        const sessionsPerWeek = Math.round((sessions.size / 30) * 7);

        return {
            totalSessions: sessions.size,
            averageDuration,
            sessionsPerWeek,
            lastSessionDate
        };
    } catch (error) {
        console.warn('[analytics] Error getting session stats:', error);
        return getLocalSessionStats();
    }
}

function getLocalSessionStats(): SessionStats {
    const analytics = getLocalAnalytics();
    const sessions = (analytics.sessions as Record<string, unknown>[]) || [];

    if (sessions.length === 0) {
        return {
            totalSessions: 0,
            averageDuration: 0,
            sessionsPerWeek: 0,
            lastSessionDate: null
        };
    }

    const lastSession = sessions[sessions.length - 1] as Record<string, unknown>;

    return {
        totalSessions: sessions.length,
        averageDuration: (lastSession?.duration as number) || 0,
        sessionsPerWeek: Math.round(sessions.length / 4),
        lastSessionDate: (lastSession?.endTime as string) || null
    };
}

/**
 * Get top genres with scores from user preferences
 */
export async function getTopGenres(userId: string): Promise<TopGenre[]> {
    try {
        const { data: preferences, error } = await supabase
            .from('user_preferences')
            .select('genre_scores')
            .eq('user_id', userId)
            .single();

        if (error || !preferences?.genre_scores) {
            console.warn('[analytics] Failed to fetch genre scores:', error);
            return getLocalTopGenres();
        }

        const genreScores = preferences.genre_scores as Record<string, number>;

        const topGenres: TopGenre[] = Object.entries(genreScores)
            .map(([genre, score], index) => ({
                genre,
                score,
                rank: index + 1
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        return topGenres;
    } catch (error) {
        console.warn('[analytics] Error getting top genres:', error);
        return getLocalTopGenres();
    }
}

function getLocalTopGenres(): TopGenre[] {
    const analytics = getLocalAnalytics();
    const genreScores = (analytics.genreScores as Record<string, number>) || {};

    return Object.entries(genreScores)
        .map(([genre, score], index) => ({
            genre,
            score,
            rank: index + 1
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
}

/**
 * Get all analytics data at once
 * Uses Promise.allSettled to handle individual function failures gracefully
 */
export async function getAllAnalytics(userId: string): Promise<{
    engagement: EngagementStats;
    genres: GenreDistribution[];
    trends: InteractionTrend[];
    mediaTypes: MediaTypeDistribution[];
    activeHours: ActiveHour[];
    acceptanceRate: number;
    sessions: SessionStats;
    topGenres: TopGenre[];
}> {
    // Use Promise.allSettled to handle individual failures
    const results = await Promise.allSettled([
        getUserEngagementStats(userId),
        getGenreDistribution(userId),
        getInteractionTrends(userId),
        getMediaTypeDistribution(userId),
        getActiveHours(userId),
        getRecommendationAcceptanceRate(userId),
        getSessionStats(userId),
        getTopGenres(userId)
    ]);

    // Extract values, using defaults for any that failed
    const [engagementRes, genresRes, trendsRes, mediaTypesRes, activeHoursRes, acceptanceRateRes, sessionsRes, topGenresRes] = results;

    return {
        engagement: engagementRes.status === 'fulfilled' ? engagementRes.value : getDefaultEngagementStats(),
        genres: genresRes.status === 'fulfilled' ? genresRes.value : [],
        trends: trendsRes.status === 'fulfilled' ? trendsRes.value : [],
        mediaTypes: mediaTypesRes.status === 'fulfilled' ? mediaTypesRes.value : [],
        activeHours: activeHoursRes.status === 'fulfilled' ? activeHoursRes.value : [],
        acceptanceRate: acceptanceRateRes.status === 'fulfilled' ? acceptanceRateRes.value : 0,
        sessions: sessionsRes.status === 'fulfilled' ? sessionsRes.value : {
            totalSessions: 0,
            averageDuration: 0,
            sessionsPerWeek: 0,
            lastSessionDate: null
        },
        topGenres: topGenresRes.status === 'fulfilled' ? topGenresRes.value : []
    };
}

export default {
    getUserEngagementStats,
    getGenreDistribution,
    getInteractionTrends,
    getMediaTypeDistribution,
    getActiveHours,
    getRecommendationAcceptanceRate,
    getSessionStats,
    getTopGenres,
    getAllAnalytics,
    trackInteractionLocally
};
