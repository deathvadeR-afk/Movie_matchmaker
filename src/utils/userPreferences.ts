import type {
    UserInteraction,
    UserPreferences,
    InteractionType,
    MediaType,
    BehaviorSession,
    SessionInteraction,
    EngagementScore,
    AdaptivePrediction,
    PredictionAccuracy,
    AlgorithmWeights,
    BehaviorPattern,
    TimeOfDay,
    AdaptivePreferences,
    PredictionFactor
} from '../types';

import {
    DEFAULT_ENGAGEMENT_SCORE,
    DEFAULT_PREDICTION_ACCURACY,
    DEFAULT_ALGORITHM_WEIGHTS
} from '../types';

const STORAGE_KEY = 'user_preferences';
const ADAPTIVE_STORAGE_KEY = 'adaptive_learning_data';
const MAX_INTERACTIONS = 1000;
const MAX_SESSIONS = 50;

// Default preferences structure
const createDefaultPreferences = (): UserPreferences => ({
    genreScores: {},
    mediaTypeScores: {
        movie: 0,
        tv: 0,
        anime: 0,
    },
    timePeriodScores: {
        recent: 0,
        classic: 0,
    },
    regionScores: {},
    interactions: [],
    lastUpdated: Date.now(),
});

// Get preferences from localStorage with fallback
const getStoredPreferences = (): UserPreferences => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as UserPreferences;
            // Validate the stored data has required fields
            if (parsed && parsed.interactions && Array.isArray(parsed.interactions)) {
                return parsed;
            }
        }
    } catch (error) {
        console.warn('[userPreferences] Failed to load preferences from localStorage:', error);
    }
    return createDefaultPreferences();
};

// Save preferences to localStorage with error handling
const savePreferences = (prefs: UserPreferences): void => {
    try {
        prefs.lastUpdated = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
        console.warn('[userPreferences] Failed to save preferences to localStorage:', error);
    }
};

// Generate a unique ID for interactions
const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Determine time period from year
const getTimePeriod = (year: number): 'recent' | 'classic' => {
    const currentYear = new Date().getFullYear();
    // Consider movies from the last 10 years as "recent"
    return year >= currentYear - 10 ? 'recent' : 'classic';
};

// Determine time of day from hour
const getTimeOfDay = (hour: number): TimeOfDay => {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
};

// Get current time of day
const getCurrentTimeOfDay = (): TimeOfDay => {
    return getTimeOfDay(new Date().getHours());
};

// Calculate engagement level from score
const calculateEngagementLevel = (score: number): 'high' | 'medium' | 'low' => {
    if (score >= 50) return 'high';
    if (score >= 20) return 'medium';
    return 'low';
};

// Default adaptive preferences
const createDefaultAdaptivePreferences = () => ({
    sessions: [],
    engagementScore: { ...DEFAULT_ENGAGEMENT_SCORE },
    predictionAccuracy: { ...DEFAULT_PREDICTION_ACCURACY },
    algorithmWeights: { ...DEFAULT_ALGORITHM_WEIGHTS },
    learnedPatterns: [],
    timeOfDayPreferences: {
        morning: 0,
        afternoon: 0,
        evening: 0,
        night: 0,
    },
    dayOfWeekPreferences: {
        0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
    },
});

// Get adaptive data from localStorage
const getStoredAdaptiveData = () => {
    try {
        const stored = localStorage.getItem(ADAPTIVE_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.sessions) {
                return parsed;
            }
        }
    } catch (error) {
        console.warn('[userPreferences] Failed to load adaptive data:', error);
    }
    return createDefaultAdaptivePreferences();
};

// Save adaptive data to localStorage
const saveAdaptiveData = (data: ReturnType<typeof createDefaultAdaptivePreferences>): void => {
    try {
        localStorage.setItem(ADAPTIVE_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.warn('[userPreferences] Failed to save adaptive data:', error);
    }
};

// Infer genres from search query (simple keyword matching)
const inferGenresFromQuery = (query: string): string[] => {
    const lowerQuery = query.toLowerCase();
    const genreKeywords: Record<string, string[]> = {
        action: ['action', 'fight', 'action-packed'],
        comedy: ['comedy', 'funny', 'laugh', 'hilarious', 'comedic'],
        drama: ['drama', 'emotional', 'serious'],
        horror: ['horror', 'scary', 'scare', 'terror', 'fright'],
        romance: ['romance', 'romantic', 'love', 'date', 'couple'],
        thriller: ['thriller', 'suspense', 'tension', 'exciting'],
        'sci-fi': ['sci-fi', 'science fiction', 'space', 'future'],
        animation: ['animation', 'animated', 'cartoon'],
        documentary: ['documentary', 'doc'],
        adventure: ['adventure', 'adventurous', 'journey'],
        fantasy: ['fantasy', 'magical', 'magic'],
        mystery: ['mystery', 'mysterious', 'detective'],
    };

    const inferredGenres: string[] = [];
    for (const [genre, keywords] of Object.entries(genreKeywords)) {
        if (keywords.some((keyword) => lowerQuery.includes(keyword))) {
            inferredGenres.push(genre);
        }
    }
    return inferredGenres;
};

// Update scores based on interaction
const updateScores = (
    prefs: UserPreferences,
    type: InteractionType,
    genres: string[] = [],
    mediaType?: MediaType,
    year?: number,
    region?: string
): UserPreferences => {
    // Calculate score change based on interaction type
    const scoreChanges: Record<InteractionType, number> = {
        like: 3,
        click: 2,
        search: 1,
        dismiss: -1,
    };

    const scoreChange = scoreChanges[type];

    // Update genre scores
    if (genres.length > 0) {
        const genreWeight = type === 'search' ? 0.5 : 1; // Search contributes less to genre preference
        genres.forEach(genre => {
            const normalizedGenre = genre.toLowerCase();
            prefs.genreScores[normalizedGenre] = (prefs.genreScores[normalizedGenre] || 0) + scoreChange * genreWeight;
        });
    }

    // Update media type scores
    if (mediaType) {
        prefs.mediaTypeScores[mediaType] = (prefs.mediaTypeScores[mediaType] || 0) + scoreChange;
    }

    // Update time period scores
    if (year) {
        const period = getTimePeriod(year);
        prefs.timePeriodScores[period] = (prefs.timePeriodScores[period] || 0) + scoreChange;
    }

    // Update region scores
    if (region) {
        prefs.regionScores[region] = (prefs.regionScores[region] || 0) + scoreChange;
    }

    return prefs;
};

/**
 * Record a search query
 * @param query - The search query string
 */
export const recordSearch = (query: string): void => {
    if (!query || query.trim().length === 0) return;

    const prefs = getStoredPreferences();
    const inferredGenres = inferGenresFromQuery(query);

    // Create interaction record
    const interaction: UserInteraction = {
        id: generateId(),
        type: 'search',
        timestamp: Date.now(),
        query: query.trim(),
        genres: inferredGenres,
    };

    // Update preferences
    prefs.interactions.push(interaction);
    updateScores(prefs, 'search', inferredGenres);

    // Trim interactions if exceeding max
    if (prefs.interactions.length > MAX_INTERACTIONS) {
        prefs.interactions = prefs.interactions.slice(-MAX_INTERACTIONS);
    }

    savePreferences(prefs);
};

/**
 * Record when user clicks on a recommendation
 * @param mediaId - The TMDB media ID
 * @param genres - Optional genres associated with the media
 * @param mediaType - Optional media type
 * @param year - Optional release year
 * @param region - Optional region code
 */
export const recordClick = (
    mediaId: number,
    genres: string[] = [],
    mediaType?: MediaType,
    year?: number,
    region?: string
): void => {
    const prefs = getStoredPreferences();

    const interaction: UserInteraction = {
        id: generateId(),
        type: 'click',
        mediaId,
        timestamp: Date.now(),
        genres,
        mediaType,
    };

    prefs.interactions.push(interaction);
    updateScores(prefs, 'click', genres, mediaType, year, region);

    if (prefs.interactions.length > MAX_INTERACTIONS) {
        prefs.interactions = prefs.interactions.slice(-MAX_INTERACTIONS);
    }

    savePreferences(prefs);
};

/**
 * Record when user likes a recommendation
 * @param mediaId - The TMDB media ID
 * @param genres - Optional genres associated with the media
 * @param mediaType - Optional media type
 * @param year - Optional release year
 * @param region - Optional region code
 */
export const recordLike = (
    mediaId: number,
    genres: string[] = [],
    mediaType?: MediaType,
    year?: number,
    region?: string
): void => {
    const prefs = getStoredPreferences();

    const interaction: UserInteraction = {
        id: generateId(),
        type: 'like',
        mediaId,
        timestamp: Date.now(),
        genres,
        mediaType,
    };

    prefs.interactions.push(interaction);
    updateScores(prefs, 'like', genres, mediaType, year, region);

    if (prefs.interactions.length > MAX_INTERACTIONS) {
        prefs.interactions = prefs.interactions.slice(-MAX_INTERACTIONS);
    }

    savePreferences(prefs);
};

/**
 * Record when user dismisses a recommendation
 * @param mediaId - The TMDB media ID
 * @param genres - Optional genres associated with the media
 * @param mediaType - Optional media type
 * @param year - Optional release year
 */
export const recordDismiss = (
    mediaId: number,
    genres: string[] = [],
    mediaType?: MediaType,
    year?: number
): void => {
    const prefs = getStoredPreferences();

    const interaction: UserInteraction = {
        id: generateId(),
        type: 'dismiss',
        mediaId,
        timestamp: Date.now(),
        genres,
        mediaType,
    };

    prefs.interactions.push(interaction);
    updateScores(prefs, 'dismiss', genres, mediaType, year);

    if (prefs.interactions.length > MAX_INTERACTIONS) {
        prefs.interactions = prefs.interactions.slice(-MAX_INTERACTIONS);
    }

    savePreferences(prefs);
};

/**
 * Get learned user preferences
 * @returns The user preferences object
 */
export const getPreferences = (): UserPreferences => {
    return getStoredPreferences();
};

/**
 * Get boost score for a genre/mediaType based on history
 * @param genre - The genre to get boost for
 * @param mediaType - The media type to get boost for
 * @returns A boost multiplier between 0.5 and 2.0
 */
export const getPersonalizedBoost = (genre?: string, mediaType?: MediaType): number => {
    const prefs = getStoredPreferences();

    let boost = 1.0;

    // Apply genre boost
    if (genre) {
        const normalizedGenre = genre.toLowerCase();
        const genreScore = prefs.genreScores[normalizedGenre] || 0;
        // Normalize score: 0 = 1.0, positive = up to 2.0, negative = down to 0.5
        if (genreScore > 0) {
            boost *= Math.min(2.0, 1.0 + (genreScore / 10));
        } else if (genreScore < 0) {
            boost *= Math.max(0.5, 1.0 + (genreScore / 10));
        }
    }

    // Apply media type boost
    if (mediaType) {
        const mediaTypeScore = prefs.mediaTypeScores[mediaType] || 0;
        if (mediaTypeScore > 0) {
            boost *= Math.min(1.5, 1.0 + (mediaTypeScore / 15));
        } else if (mediaTypeScore < 0) {
            boost *= Math.max(0.7, 1.0 + (mediaTypeScore / 15));
        }
    }

    // Clamp final boost to reasonable range
    return Math.max(0.5, Math.min(2.0, boost));
};

/**
 * Get time period preference
 * @returns 'recent', 'classic', or 'neutral' based on user history
 */
export const getTimePeriodPreference = (): 'recent' | 'classic' | 'neutral' => {
    const prefs = getStoredPreferences();
    const { recent, classic } = prefs.timePeriodScores;

    if (recent > classic + 3) return 'recent';
    if (classic > recent + 3) return 'classic';
    return 'neutral';
};

/**
 * Get region preference
 * @returns Preferred region code or null if no strong preference
 */
export const getRegionPreference = (): string | null => {
    const prefs = getStoredPreferences();
    const { regionScores } = prefs;

    let maxScore = 0;
    let preferredRegion: string | null = null;

    for (const [region, score] of Object.entries(regionScores)) {
        if (score > maxScore) {
            maxScore = score;
            preferredRegion = region;
        }
    }

    // Only return a preference if score is significant
    return maxScore >= 3 ? preferredRegion : null;
};

/**
 * Get media type preference
 * @returns Preferred media type or null if no strong preference
 */
export const getMediaTypePreference = (): MediaType | null => {
    const prefs = getStoredPreferences();
    const { mediaTypeScores } = prefs;

    let maxScore = 0;
    let preferredType: MediaType | null = null;

    for (const [type, score] of Object.entries(mediaTypeScores)) {
        if (score > maxScore) {
            maxScore = score;
            preferredType = type as MediaType;
        }
    }

    // Only return a preference if score is significant
    return maxScore >= 2 ? preferredType : null;
};

/**
 * Get top genres based on user history
 * @param limit - Number of top genres to return
 * @returns Array of genre names sorted by score
 */
export const getTopGenres = (limit: number = 5): string[] => {
    const prefs = getStoredPreferences();
    const { genreScores } = prefs;

    return Object.entries(genreScores)
        .sort(([, a], [, b]) => b - a)
        .filter(([, score]) => score > 0)
        .slice(0, limit)
        .map(([genre]) => genre);
};

/**
 * Clear all interaction history
 */
export const clearHistory = (): void => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.warn('[userPreferences] Failed to clear preferences from localStorage:', error);
    }
};

/**
 * Get interaction statistics
 * @returns Object with counts of different interaction types
 */
export const getInteractionStats = (): Record<InteractionType, number> => {
    const prefs = getStoredPreferences();
    const stats: Record<InteractionType, number> = {
        search: 0,
        click: 0,
        like: 0,
        dismiss: 0,
    };

    prefs.interactions.forEach(interaction => {
        stats[interaction.type]++;
    });

    return stats;
};

// ============================================
// Adaptive Learning Functions
// ============================================

/**
 * Record detailed session interaction with implicit behavior tracking
 */
export const recordSessionInteraction = (
    type: InteractionType,
    mediaId?: number,
    genres: string[] = [],
    mediaType?: MediaType,
    year?: number,
    region?: string,
    viewDuration?: number,
    scrollPosition?: number,
    timeToAction?: number
): void => {
    try {
        const prefs = getStoredPreferences();
        const adaptiveData = getStoredAdaptiveData();

        // Create detailed session interaction record
        const sessionInteraction: SessionInteraction = {
            id: generateId(),
            type,
            mediaId,
            genres,
            mediaType,
            timestamp: Date.now(),
            viewDuration,
            scrollPosition,
            timeToAction,
        };

        // Find or create current session
        let currentSession = adaptiveData.sessions[adaptiveData.sessions.length - 1];
        if (!currentSession || (Date.now() - currentSession.startTime > 30 * 60 * 1000)) { // 30min timeout
            currentSession = {
                id: generateId(),
                startTime: Date.now(),
                interactions: [],
                totalDuration: 0,
                averageViewTime: 0,
                scrollDepth: 0,
                dismissSpeed: 0,
                timeOfDay: getCurrentTimeOfDay(),
                dayOfWeek: new Date().getDay(),
            };
            adaptiveData.sessions.push(currentSession);
        }

        currentSession.interactions.push(sessionInteraction);
        currentSession.endTime = Date.now();
        currentSession.totalDuration = currentSession.endTime - currentSession.startTime;

        // Calculate session metrics
        const validViewTimes = currentSession.interactions
            .filter((interaction: SessionInteraction) => interaction.viewDuration)
            .map((interaction: SessionInteraction) => interaction.viewDuration!);

        if (validViewTimes.length > 0) {
            currentSession.averageViewTime = validViewTimes.reduce((a: number, b: number) => a + b, 0) / validViewTimes.length;
        }

        const validScrollDepths = currentSession.interactions
            .filter((interaction: SessionInteraction) => interaction.scrollPosition)
            .map((interaction: SessionInteraction) => interaction.scrollPosition!);

        if (validScrollDepths.length > 0) {
            currentSession.scrollDepth = validScrollDepths.reduce((a: number, b: number) => a + b, 0) / validScrollDepths.length;
        }

        const validTimeToActions = currentSession.interactions
            .filter((interaction: SessionInteraction) => interaction.timeToAction)
            .map((interaction: SessionInteraction) => interaction.timeToAction!);

        if (validTimeToActions.length > 0) {
            currentSession.dismissSpeed = validTimeToActions.reduce((a: number, b: number) => a + b, 0) / validTimeToActions.length;
        }

        // Trim sessions if exceeding max
        if (adaptiveData.sessions.length > MAX_SESSIONS) {
            adaptiveData.sessions = adaptiveData.sessions.slice(-MAX_SESSIONS);
        }

        saveAdaptiveData(adaptiveData);

        // Call original record function
        const { interactions } = getStoredPreferences();
        const interaction: UserInteraction = {
            id: sessionInteraction.id,
            type,
            mediaId,
            genres,
            mediaType,
            timestamp: sessionInteraction.timestamp,
        };
        interactions.push(interaction);
        updateScores(prefs, type, genres, mediaType, year, region);
        if (interactions.length > MAX_INTERACTIONS) {
            interactions.splice(0, interactions.length - MAX_INTERACTIONS);
        }
        savePreferences(prefs);

    } catch (error) {
        console.warn('[userPreferences] Failed to record session interaction:', error);
    }
};

/**
 * Calculate engagement score based on user behavior
 */
export const calculateEngagementScore = (): EngagementScore => {
    try {
        const adaptiveData = getStoredAdaptiveData();

        let viewTimeScore = 0;
        let scrollScore = 0;
        let dismissPenalty = 0;
        let sessionDurationScore = 0;
        let timeOfDayScore = 0;

        // Calculate scores from sessions
        adaptiveData.sessions.forEach((session: BehaviorSession) => {
            // View time score (longer view times = higher score)
            viewTimeScore += session.averageViewTime / 1000; // seconds

            // Scroll score (deeper scroll = higher score)
            scrollScore += session.scrollDepth;

            // Session duration score (longer sessions = higher score)
            sessionDurationScore += session.totalDuration / 1000; // seconds

            // Time of day preferences (adjust based on session engagement)
            timeOfDayScore += session.totalDuration / 1000;
            adaptiveData.timeOfDayPreferences[session.timeOfDay] += 1;

            // Day of week preferences
            adaptiveData.dayOfWeekPreferences[session.dayOfWeek] += 1;
        });

        const dismissInteractions = adaptiveData.sessions.flatMap((session: BehaviorSession) =>
            session.interactions.filter((interaction: SessionInteraction) => interaction.type === 'dismiss' && interaction.timeToAction)
        );
        dismissPenalty = dismissInteractions.reduce((penalty: number, interaction: SessionInteraction) => {
            const time = interaction.timeToAction!;
            // Penalty increases for very quick dismissals (< 3 seconds)
            if (time < 3000) {
                penalty += (3000 - time) / 1000;
            }
            return penalty;
        }, 0);

        // Normalize scores
        const totalScore =
            viewTimeScore * 0.4 +
            scrollScore * 0.2 +
            sessionDurationScore * 0.3 -
            dismissPenalty * 0.5;

        const engagementLevel = calculateEngagementLevel(totalScore);

        const engagementScore: EngagementScore = {
            totalScore: Math.max(0, totalScore),
            viewTimeScore,
            scrollScore,
            dismissPenalty,
            sessionDurationScore,
            timeOfDayScore,
            engagementLevel,
            lastCalculated: Date.now(),
        };

        // Update and save
        adaptiveData.engagementScore = engagementScore;
        saveAdaptiveData(adaptiveData);

        return engagementScore;
    } catch (error) {
        console.warn('[userPreferences] Failed to calculate engagement score:', error);
        return { ...DEFAULT_ENGAGEMENT_SCORE };
    }
};

/**
 * Analyze user behavior patterns
 */
export const analyzeBehaviorPatterns = (): BehaviorPattern[] => {
    try {
        const adaptiveData = getStoredAdaptiveData();
        const patterns: BehaviorPattern[] = [];

        // 1. Time of day patterns
        const timeOfDayCounts: [string, number][] = Object.entries(adaptiveData.timeOfDayPreferences);
        if (timeOfDayCounts.length > 0) {
            const maxCount = Math.max(...timeOfDayCounts.map(([, count]) => count as number));
            const peakTime = timeOfDayCounts.find(([, count]) => count === maxCount)![0] as TimeOfDay;
            patterns.push({
                type: 'timeOfDay',
                confidence: 0.7 + Math.random() * 0.3,
                value: peakTime,
                strength: maxCount / adaptiveData.sessions.length,
                sampleSize: adaptiveData.sessions.length,
            });
        }

        // 2. Day of week patterns
        const dayCounts: [string, number][] = Object.entries(adaptiveData.dayOfWeekPreferences);
        if (dayCounts.length > 0) {
            const maxCount = Math.max(...dayCounts.map(([, count]) => count as number));
            const peakDay = dayCounts.find(([, count]) => count === maxCount)![0];
            patterns.push({
                type: 'dayOfWeek',
                confidence: 0.65 + Math.random() * 0.3,
                value: parseInt(peakDay),
                strength: maxCount / adaptiveData.sessions.length,
                sampleSize: adaptiveData.sessions.length,
            });
        }

        // 3. Session duration patterns
        const averageDuration = adaptiveData.sessions.reduce((sum: number, session: BehaviorSession) => sum + session.totalDuration, 0) / adaptiveData.sessions.length;
        patterns.push({
            type: 'session',
            confidence: 0.8,
            value: 'duration',
            strength: averageDuration / 1000, // seconds
            sampleSize: adaptiveData.sessions.length,
        });

        // Update and save learned patterns
        adaptiveData.learnedPatterns = patterns;
        saveAdaptiveData(adaptiveData);

        return patterns;
    } catch (error) {
        console.warn('[userPreferences] Failed to analyze behavior patterns:', error);
        return [];
    }
};

/**
 * Predict user satisfaction with a recommendation
 */
export const predictUserSatisfaction = (
    mediaId: number,
    genres: string[],
    mediaType?: MediaType,
    year?: number
): AdaptivePrediction => {
    try {
        const prefs = getStoredPreferences();
        const adaptiveData = getStoredAdaptiveData();

        let predictedScore = 0.5;
        const factors: PredictionFactor[] = [];

        // Genre matching
        const genreScore = genres.reduce((score, genre) => {
            const normalizedGenre = genre.toLowerCase();
            return score + (prefs.genreScores[normalizedGenre] || 0);
        }, 0);

        predictedScore += (genreScore / 10) * adaptiveData.algorithmWeights.genreWeight;
        factors.push({
            name: 'Genre Match',
            weight: adaptiveData.algorithmWeights.genreWeight,
            value: genreScore,
            description: 'Genre preferences from history',
        });

        // Media type preference
        if (mediaType) {
            const mediaScore = prefs.mediaTypeScores[mediaType] || 0;
            predictedScore += (mediaScore / 15) * adaptiveData.algorithmWeights.mediaTypeWeight;
            factors.push({
                name: 'Media Type Match',
                weight: adaptiveData.algorithmWeights.mediaTypeWeight,
                value: mediaScore,
                description: 'Media type preferences',
            });
        }

        // Time period preference
        if (year) {
            const period = getTimePeriod(year);
            const periodScore = prefs.timePeriodScores[period];
            predictedScore += (periodScore / 10) * adaptiveData.algorithmWeights.timePeriodWeight;
            factors.push({
                name: 'Time Period Match',
                weight: adaptiveData.algorithmWeights.timePeriodWeight,
                value: periodScore,
                description: 'Recent vs classic preferences',
            });
        }

        // Current time context
        const currentTimeOfDay = getCurrentTimeOfDay();
        const timeOfDayScore = adaptiveData.timeOfDayPreferences[currentTimeOfDay];
        const timeOfDayWeight = adaptiveData.algorithmWeights.timeOfDayWeight;

        if (timeOfDayScore > 0) {
            predictedScore += (timeOfDayScore / adaptiveData.sessions.length) * timeOfDayWeight;
            factors.push({
                name: 'Time of Day Match',
                weight: timeOfDayWeight,
                value: timeOfDayScore,
                description: `Active during ${currentTimeOfDay}`,
            });
        }

        // Engagement level
        const engagementLevel = adaptiveData.engagementScore.engagementLevel;
        if (engagementLevel === 'high') {
            predictedScore += 0.1;
        } else if (engagementLevel === 'low') {
            predictedScore -= 0.05;
        }

        // Clamp prediction to 0-1 range
        predictedScore = Math.max(0, Math.min(1, predictedScore));

        const prediction: AdaptivePrediction = {
            predictedSatisfaction: predictedScore,
            confidence: 0.7 + Math.random() * 0.25, // 70-95% confidence
            factors,
            algorithmVersion: '1.0',
            predictedAt: Date.now(),
        };

        return prediction;
    } catch (error) {
        console.warn('[userPreferences] Failed to predict user satisfaction:', error);
        return {
            predictedSatisfaction: 0.5,
            confidence: 0.5,
            factors: [],
            algorithmVersion: '1.0',
            predictedAt: Date.now(),
        };
    }
};

/**
 * Adjust recommendation algorithm weights based on prediction accuracy
 */
export const adjustRecommendationWeights = (): AlgorithmWeights => {
    try {
        const adaptiveData = getStoredAdaptiveData();
        const { predictionAccuracy, algorithmWeights } = adaptiveData;

        // Adjust weights based on recent accuracy
        let adjustedWeights = { ...algorithmWeights };

        if (predictionAccuracy.totalPredictions > 0) {
            const accuracyRate = predictionAccuracy.correctPredictions / predictionAccuracy.totalPredictions;

            // Boost weights that are performing well
            if (accuracyRate > 0.7) {
                adjustedWeights.genreWeight = Math.min(2.0, adjustedWeights.genreWeight * 1.05);
                adjustedWeights.mediaTypeWeight = Math.min(2.0, adjustedWeights.mediaTypeWeight * 1.05);
            }
            // Reduce weights that are underperforming
            else if (accuracyRate < 0.5) {
                adjustedWeights.genreWeight = Math.max(0.5, adjustedWeights.genreWeight * 0.95);
                adjustedWeights.mediaTypeWeight = Math.max(0.5, adjustedWeights.mediaTypeWeight * 0.95);
            }

            // Adjust time-based weights based on seasonality
            const currentMonth = new Date().getMonth();
            if (currentMonth >= 10 || currentMonth <= 1) { // Winter
                adjustedWeights.timeOfDayWeight = Math.min(1.0, adjustedWeights.timeOfDayWeight * 1.1);
            } else if (currentMonth >= 5 && currentMonth <= 8) { // Summer
                adjustedWeights.popularityWeight = Math.min(1.0, adjustedWeights.popularityWeight * 1.1);
            }
        }

        adaptiveData.algorithmWeights = adjustedWeights;
        saveAdaptiveData(adaptiveData);

        return adjustedWeights;
    } catch (error) {
        console.warn('[userPreferences] Failed to adjust recommendation weights:', error);
        return { ...DEFAULT_ALGORITHM_WEIGHTS };
    }
};

/**
 * Learn from prediction accuracy and update algorithm
 */
export const learnFromPrediction = (
    mediaId: number,
    predictedScore: number,
    actualScore: number
): void => {
    try {
        const adaptiveData = getStoredAdaptiveData();

        // Update total predictions and correct predictions
        adaptiveData.predictionAccuracy.totalPredictions++;

        // Determine if prediction was correct (within 0.2 threshold)
        if (Math.abs(predictedScore - actualScore) <= 0.2) {
            adaptiveData.predictionAccuracy.correctPredictions++;
        }

        // Update average error
        const previousErrorSum = adaptiveData.predictionAccuracy.averageError *
            (adaptiveData.predictionAccuracy.totalPredictions - 1);
        const currentError = Math.abs(predictedScore - actualScore);
        adaptiveData.predictionAccuracy.averageError = (previousErrorSum + currentError) /
            adaptiveData.predictionAccuracy.totalPredictions;

        // Update accuracy trend and recent accuracy
        if (adaptiveData.predictionAccuracy.totalPredictions > 20) {
            const recentAccuracy = adaptiveData.predictionAccuracy.correctPredictions /
                adaptiveData.predictionAccuracy.totalPredictions;

            if (recentAccuracy > adaptiveData.predictionAccuracy.recentAccuracy + 0.1) {
                adaptiveData.predictionAccuracy.accuracyTrend = 'improving';
            } else if (recentAccuracy < adaptiveData.predictionAccuracy.recentAccuracy - 0.1) {
                adaptiveData.predictionAccuracy.accuracyTrend = 'declining';
            } else {
                adaptiveData.predictionAccuracy.accuracyTrend = 'stable';
            }

            adaptiveData.predictionAccuracy.recentAccuracy = recentAccuracy;
        }

        adaptiveData.predictionAccuracy.lastUpdated = Date.now();
        saveAdaptiveData(adaptiveData);

        // Auto-adjust weights if needed
        if (adaptiveData.predictionAccuracy.totalPredictions % 10 === 0) {
            adjustRecommendationWeights();
        }
    } catch (error) {
        console.warn('[userPreferences] Failed to learn from prediction:', error);
    }
};

/**
 * Get adaptive recommendations based on learned behavior
 */
export const getAdaptiveSuggestions = (): any[] => {
    try {
        const adaptiveData = getStoredAdaptiveData();
        const patterns = adaptiveData.learnedPatterns;

        // For now, return patterns as suggestions (would integrate with recommendation engine)
        if (patterns.length > 0) {
            return patterns.map((pattern: BehaviorPattern) => ({
                type: pattern.type,
                value: pattern.value,
                confidence: pattern.confidence,
                strength: pattern.strength,
            }));
        }

        // Fallback to default suggestions if no patterns learned
        return [
            { type: 'timeOfDay', value: getCurrentTimeOfDay(), confidence: 0.6, strength: 1 },
            { type: 'session', value: 'recent', confidence: 0.5, strength: 1 },
        ];
    } catch (error) {
        console.warn('[userPreferences] Failed to get adaptive suggestions:', error);
        return [
            { type: 'timeOfDay', value: getCurrentTimeOfDay(), confidence: 0.6, strength: 1 },
        ];
    }
};

/**
 * Analyze current session for patterns
 */
export const learnFromSession = (sessionId?: string): void => {
    try {
        const adaptiveData = getStoredAdaptiveData();

        let sessionToAnalyze = adaptiveData.sessions[adaptiveData.sessions.length - 1];
        if (sessionId) {
            sessionToAnalyze = adaptiveData.sessions.find((session: BehaviorSession) => session.id === sessionId);
        }

        if (sessionToAnalyze) {
            // Extract patterns from session
            const sessionGenres = new Set<string>();
            let mediaTypes = new Set<string>();
            let avgViewTime = 0;
            let totalViewTime = 0;

            sessionToAnalyze.interactions.forEach((interaction: SessionInteraction) => {
                if (interaction.genres) {
                    interaction.genres.forEach((genre: string) => sessionGenres.add(genre.toLowerCase()));
                }
                if (interaction.mediaType) {
                    mediaTypes.add(interaction.mediaType);
                }
                if (interaction.viewDuration) {
                    totalViewTime += interaction.viewDuration;
                }
            });

            avgViewTime = totalViewTime / sessionToAnalyze.interactions.length;

            // Update learned patterns
            sessionGenres.forEach((genre: string) => {
                const existingPattern = adaptiveData.learnedPatterns.find((p: BehaviorPattern) =>
                    p.type === 'genre' && p.value === genre
                );
                if (existingPattern) {
                    existingPattern.strength += avgViewTime / 1000;
                    existingPattern.sampleSize++;
                    existingPattern.confidence = Math.min(0.95, existingPattern.confidence + 0.05);
                } else {
                    adaptiveData.learnedPatterns.push({
                        type: 'genre',
                        confidence: 0.6 + Math.random() * 0.2,
                        value: genre,
                        strength: avgViewTime / 1000,
                        sampleSize: 1,
                    });
                }
            });

            // Calculate season pattern
            const currentMonth = new Date().getMonth();
            const seasonalPattern: 'new_releases' | 'classics' =
                (currentMonth >= 8 && currentMonth <= 10) ? 'new_releases' : 'classics';

            adaptiveData.learnedPatterns.push({
                type: 'seasonal',
                confidence: 0.7,
                value: seasonalPattern,
                strength: 1,
                sampleSize: adaptiveData.sessions.length,
            });

            saveAdaptiveData(adaptiveData);
        }
    } catch (error) {
        console.warn('[userPreferences] Failed to learn from session:', error);
    }
};

/**
 * Determine optimal refresh time for content
 */
export const getOptimalRefreshTime = (): number => {
    try {
        const adaptiveData = getStoredAdaptiveData();

        // Analyze last active times to predict next visit
        const lastActiveHours = adaptiveData.sessions
            .map((session: BehaviorSession) => new Date(session.startTime).getHours())
            .sort();

        if (lastActiveHours.length > 2) {
            const peakHour = lastActiveHours[Math.floor(lastActiveHours.length / 2)];
            const optimalTime = new Date();
            optimalTime.setHours(peakHour, 0, 0, 0);

            if (optimalTime.getTime() <= Date.now()) {
                optimalTime.setDate(optimalTime.getDate() + 1);
            }

            return optimalTime.getTime();
        }

        // Fallback to evening refresh if no pattern
        const fallbackTime = new Date();
        fallbackTime.setHours(19, 0, 0, 0);
        if (fallbackTime.getTime() <= Date.now()) {
            fallbackTime.setDate(fallbackTime.getDate() + 1);
        }

        return fallbackTime.getTime();
    } catch (error) {
        console.warn('[userPreferences] Failed to determine optimal refresh time:', error);
        const fallbackTime = new Date();
        fallbackTime.setHours(19, 0, 0, 0);
        if (fallbackTime.getTime() <= Date.now()) {
            fallbackTime.setDate(fallbackTime.getDate() + 1);
        }
        return fallbackTime.getTime();
    }
};

/**
 * Get adaptive learning data
 */
export const getAdaptiveData = () => {
    try {
        return getStoredAdaptiveData();
    } catch (error) {
        console.warn('[userPreferences] Failed to get adaptive data:', error);
        return createDefaultAdaptivePreferences();
    }
};

/**
 * Clear adaptive learning data
 */
export const clearAdaptiveData = (): void => {
    try {
        localStorage.removeItem(ADAPTIVE_STORAGE_KEY);
    } catch (error) {
        console.warn('[userPreferences] Failed to clear adaptive data:', error);
    }
};

/**
 * Clear all preferences (including adaptive data)
 */
export const clearAllPreferences = (): void => {
    try {
        clearHistory();
        clearAdaptiveData();
    } catch (error) {
        console.warn('[userPreferences] Failed to clear all preferences:', error);
    }
};
