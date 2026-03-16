import { MediaRecommendation, MediaType, Review, PaginationInfo } from '../types';
import { getAIRecommendations, AIRecommendation } from './gemini';
import {
    searchMedia,
    searchByTitle,
    getWatchProviders,
    getMediaReviews,
    getMediaVideos,
    getImageUrl,
    getRecentReleases,
    getTVDetails,
    TMDBMedia,
    SearchOptions,
} from './tmdb';
import {
    analyzeUserInputWithNLP,
    getSearchParams,
    parseNaturalLanguage,
    EnhancedAnalyzedInput,
    NLPAnalysisResult,
    isNLPAvailable,
} from './nlpProcessor';

// Keyword dictionaries for heuristic fallback
const genreKeywords: Record<string, string[]> = {
    action: ['action', 'fight', 'explosion', 'adventure', 'exciting', 'battle'],
    thriller: ['thriller', 'suspense', 'tension', 'mystery', 'nail-biting'],
    drama: ['drama', 'emotional', 'life', 'relationship', 'touching', 'powerful'],
    'sci-fi': ['sci-fi', 'science fiction', 'future', 'space', 'technology', 'dystopia'],
    horror: ['horror', 'scary', 'frightening', 'terrifying', 'spooky', 'creepy'],
    comedy: ['comedy', 'funny', 'hilarious', 'laugh', 'humorous', 'witty'],
    romance: ['romance', 'love', 'romantic', 'relationship', 'dating', 'heart'],
    fantasy: ['fantasy', 'magical', 'mythical', 'supernatural', 'enchanted', 'wizard'],
    animation: ['animation', 'animated', 'cartoon', 'pixar', 'disney', 'anime'],
    documentary: ['documentary', 'real', 'true story', 'historical', 'educational'],
    crime: ['crime', 'detective', 'murder', 'investigation', 'police', 'heist'],
    family: ['family', 'kids', 'children', 'wholesome', 'all ages'],
};

const emotionKeywords: Record<string, string[]> = {
    suspense: ['suspense', 'tension', 'nail-biting', 'thrilling', 'edge'],
    hope: ['hope', 'uplifting', 'inspiring', 'positive', 'optimistic'],
    fear: ['scary', 'frightening', 'horror', 'terrifying', 'creepy'],
    joy: ['happy', 'joyful', 'fun', 'upbeat', 'cheerful', 'laugh'],
    sadness: ['sad', 'emotional', 'touching', 'moving', 'tearjerker', 'cry'],
    anger: ['angry', 'revenge', 'vengeance', 'fury', 'rage'],
    wonder: ['amazing', 'wonderful', 'magical', 'spectacular', 'mindblowing'],
};

// Mood to Genre mapping for mood-based recommendations
const MOOD_TO_GENRE_MAP: Record<string, string[]> = {
    // Feel-good moods
    happy: ['comedy', 'animation', 'family', 'romance'],
    joyful: ['comedy', 'animation', 'family'],
    fun: ['comedy', 'action', 'animation'],
    upbeat: ['comedy', 'music', 'romance'],
    cheerful: ['comedy', 'family', 'animation'],

    // Uplifting moods
    inspiring: ['drama', 'biography', 'documentary'],
    uplifting: ['comedy', 'drama', 'romance'],
    motivating: ['drama', 'sport', 'biography'],

    // Emotional moods
    sad: ['drama', 'romance', 'war'],
    emotional: ['drama', 'romance', 'thriller'],
    touching: ['drama', 'romance', 'family'],
    tearjerker: ['drama', 'romance'],
    bittersweet: ['drama', 'romance'],

    // Thriller/Action moods
    thrilling: ['thriller', 'action', 'horror'],
    suspenseful: ['thriller', 'mystery', 'crime'],
    action: ['action', 'adventure', 'thriller'],
    exciting: ['action', 'adventure', 'sci-fi'],
    intense: ['action', 'thriller', 'crime'],
    adrenaline: ['action', 'sport', 'thriller'],

    // Romance moods
    romantic: ['romance', 'drama', 'comedy'],
    love: ['romance', 'drama', 'comedy'],
    passionate: ['romance', 'drama', 'action'],

    // Scary moods
    scary: ['horror', 'thriller', 'mystery'],
    frightening: ['horror', 'thriller'],
    terrifying: ['horror'],
    creepy: ['horror', 'thriller', 'mystery'],
    horror: ['horror', 'thriller'],
    spooky: ['horror', 'fantasy'],

    // Dark moods
    dark: ['thriller', 'crime', 'drama'],
    noir: ['thriller', 'crime', 'mystery'],
    gritty: ['crime', 'drama', 'action'],
    serious: ['drama', 'thriller', 'crime'],
    mature: ['drama', 'thriller', 'crime'],

    // Comedy moods
    funny: ['comedy'],
    hilarious: ['comedy'],
    witty: ['comedy', 'romance'],
    absurd: ['comedy'],

    // Cozy/Relaxing moods
    cozy: ['comedy', 'family', 'romance'],
    comforting: ['comedy', 'family', 'drama'],
    feelgood: ['comedy', 'family', 'romance'],
    wholesome: ['family', 'animation', 'comedy'],
    heartwarming: ['drama', 'family', 'romance'],
    relaxing: ['documentary', 'drama', 'comedy'],
    calming: ['drama', 'documentary', 'family'],
    peaceful: ['drama', 'documentary', 'family'],
    gentle: ['drama', 'family', 'romance'],

    // Intellectual moods
    thoughtprovoking: ['drama', 'sci-fi', 'mystery'],
    mindbending: ['sci-fi', 'thriller', 'mystery'],
    complex: ['drama', 'thriller', 'mystery'],
    intellectual: ['drama', 'documentary', 'mystery'],
    philosophical: ['drama', 'sci-fi'],
    cerebral: ['sci-fi', 'thriller', 'mystery'],
    twist: ['thriller', 'mystery', 'drama'],

    // Relaxing/ Easy watching
    chill: ['comedy', 'drama', 'romance'],
    slowpaced: ['drama', 'documentary'],
    meditative: ['documentary', 'drama'],
};

// Normalize mood key for lookup
function normalizeMoodKey(mood: string): string {
    return mood.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
}

// Convert detected moods to genres
function moodsToGenres(moods: string[]): string[] {
    const genreSet = new Set<string>();

    for (const mood of moods) {
        const normalizedMood = normalizeMoodKey(mood);

        // Direct lookup in the map
        if (MOOD_TO_GENRE_MAP[normalizedMood]) {
            MOOD_TO_GENRE_MAP[normalizedMood].forEach(g => genreSet.add(g));
            continue;
        }

        // Partial match - check if any key is contained in the mood
        for (const [key, genres] of Object.entries(MOOD_TO_GENRE_MAP)) {
            if (normalizedMood.includes(key) || key.includes(normalizedMood)) {
                genres.forEach(g => genreSet.add(g));
            }
        }
    }

    return Array.from(genreSet);
}

// Language detection keywords
const languageKeywords: Record<string, string> = {
    hindi: 'hi',
    bengali: 'bn',
    bangla: 'bn',
    telugu: 'te',
    tollywood: 'te',
    tamil: 'ta',
    kollywood: 'ta',
    malayalam: 'ml',
    kannada: 'kn',
    marathi: 'mr',
    punjabi: 'pa',
    korean: 'ko',
    japanese: 'ja',
    bollywood: 'hi',
    indian: 'hi',
};

export interface AnalyzedInput {
    genres: string[];
    emotions: string[];
    intensity: number;
    language?: string;
    wantsRecent: boolean;
}

function findKeywordMatches(text: string, dictionary: Record<string, string[]>): string[] {
    const words = text.toLowerCase().split(/\s+/);
    return Object.entries(dictionary)
        .filter(([_, keywords]) =>
            keywords.some((keyword) => words.some((word) => word.includes(keyword.toLowerCase())))
        )
        .map(([key]) => key);
}

export function detectLanguage(text: string): string | undefined {
    const lowerText = text.toLowerCase();
    for (const [keyword, langCode] of Object.entries(languageKeywords)) {
        if (lowerText.includes(keyword)) {
            return langCode;
        }
    }
    return undefined;
}

export function detectRecency(text: string): boolean {
    const recencyWords = ['new', 'latest', 'recent', '2024', '2025', 'current', 'this year', 'now playing'];
    const lowerText = text.toLowerCase();
    return recencyWords.some((word) => lowerText.includes(word));
}

export function analyzeUserInput(input: string): AnalyzedInput {
    // Try NLP-based analysis first
    if (isNLPAvailable()) {
        const nlpAnalysis = analyzeUserInputWithNLP(input);

        // Map NLP analysis to AnalyzedInput format
        return {
            genres: nlpAnalysis.genres,
            emotions: nlpAnalysis.emotions,
            intensity: nlpAnalysis.intensity,
            language: nlpAnalysis.language,
            wantsRecent: nlpAnalysis.wantsRecent,
        };
    }

    // Fallback to basic keyword matching
    const analysis: AnalyzedInput = {
        genres: findKeywordMatches(input, genreKeywords),
        emotions: findKeywordMatches(input, emotionKeywords),
        intensity: 5,
        language: detectLanguage(input),
        wantsRecent: detectRecency(input),
    };

    const intensityWords = {
        high: ['intense', 'brutal', 'extreme', 'violent', 'action-packed', 'gory', 'dark'],
        low: ['mild', 'gentle', 'calm', 'peaceful', 'slow-paced', 'cozy', 'light'],
    };

    if (intensityWords.high.some((word) => input.toLowerCase().includes(word))) {
        analysis.intensity = 8;
    }
    if (intensityWords.low.some((word) => input.toLowerCase().includes(word))) {
        analysis.intensity = 3;
    }

    return analysis;
}

export interface RecommendationOptions {
    mediaType: MediaType;
    hiddenGems: boolean;
    region: string;
    language?: string; // Language code (e.g., 'hi' for Hindi)
    page?: number; // Page number for pagination (default: 1)
    recentOnly?: boolean; // Filter for recent releases (past year)
    preferredProviders?: string[]; // Filter by streaming providers (OTT platforms)
}

/**
 * Main recommendation function with AI + heuristic fallback
 */
export async function getRecommendations(
    userInput: string,
    options: RecommendationOptions = { mediaType: 'movie', hiddenGems: false, region: 'IN' }
): Promise<{ recommendations: MediaRecommendation[]; pagination: PaginationInfo }> {
    const { mediaType, hiddenGems, region, page = 1, recentOnly = false, preferredProviders } = options;

    // Get the current year for recent filtering
    const currentYear = new Date().getFullYear();
    const recentYear = recentOnly ? currentYear : undefined;

    // Get enhanced NLP analysis
    let nlpAnalysis: EnhancedAnalyzedInput | undefined;
    if (isNLPAvailable()) {
        nlpAnalysis = analyzeUserInputWithNLP(userInput);
    }

    const analysis = analyzeUserInput(userInput);

    // Get fresh context if user wants recent content
    let freshContext: string[] | undefined;
    if (analysis.wantsRecent || recentOnly) {
        freshContext = await getRecentReleases(mediaType, 15);
    }

    // Try AI recommendations first
    const aiResult = await getAIRecommendations(userInput, mediaType, hiddenGems, freshContext, recentOnly);

    let recommendations: MediaRecommendation[] = [];

    if (aiResult.success && aiResult.recommendations.length > 0) {
        // AI succeeded - look up each title in TMDB
        recommendations = await processAIRecommendations(
            aiResult.recommendations,
            mediaType,
            region
        );
    }

    // If AI failed or returned too few results, fall back to heuristics
    if (recommendations.length < 3) {
        console.log('Falling back to heuristic search...');
        const heuristicResults = await getHeuristicRecommendations(
            userInput,
            analysis,
            options,
            nlpAnalysis
        );

        // Merge without duplicates
        const existingIds = new Set(recommendations.map((r) => r.id));
        for (const result of heuristicResults) {
            if (!existingIds.has(result.id)) {
                recommendations.push(result);
            }
        }
    }

    return {
        recommendations: recommendations
            .filter((r) => {
                // Filter by match percentage
                if (r.matchPercentage <= 30) return false;

                // Filter by preferred providers if specified (OR logic - available on ANY selected platform)
                if (preferredProviders && preferredProviders.length > 0) {
                    const availablePlatforms = r.streamingPlatforms.map(p => p.toLowerCase());
                    const hasProvider = preferredProviders.some(provider =>
                        availablePlatforms.some(platform =>
                            platform.includes(provider.toLowerCase())
                        )
                    );
                    if (!hasProvider) return false;
                }

                return true;
            })
            .sort((a, b) => b.matchPercentage - a.matchPercentage)
            .slice(0, 7),
        pagination: { totalPages: 1, currentPage: page, totalResults: recommendations.length }
    };
}

/**
 * Process AI recommendations by looking up each title in TMDB
 */
async function processAIRecommendations(
    aiRecs: AIRecommendation[],
    mediaType: MediaType,
    region: string
): Promise<MediaRecommendation[]> {
    const results: MediaRecommendation[] = [];

    for (const rec of aiRecs) {
        const media = await searchByTitle(rec.title, rec.year, mediaType);
        if (!media) continue;

        const fullRec = await buildRecommendation(media, mediaType, region, rec.explanation);
        if (fullRec) {
            results.push(fullRec);
        }
    }

    return results;
}

/**
 * Heuristic-based recommendations (keyword matching + TMDB discover)
 * Enhanced with NLP for better entity extraction
 */
async function getHeuristicRecommendations(
    query: string,
    analysis: AnalyzedInput,
    options: RecommendationOptions,
    nlpAnalysis?: EnhancedAnalyzedInput
): Promise<MediaRecommendation[]> {
    const { mediaType, hiddenGems, region, page = 1, recentOnly = false } = options;

    // Get current year for recent filtering
    const currentYear = new Date().getFullYear();
    const recentYear = recentOnly ? currentYear : undefined;

    // Use NLP-enhanced parameters if available
    let genres = nlpAnalysis?.genres || analysis.genres;
    const language = nlpAnalysis?.language || analysis.language;
    const temporal = nlpAnalysis?.temporal;

    // If no genres found, try converting moods/emotions to genres
    if (genres.length === 0) {
        const emotions = nlpAnalysis?.emotions || analysis.emotions;
        if (emotions.length > 0) {
            const moodGenres = moodsToGenres(emotions);
            if (moodGenres.length > 0) {
                genres = moodGenres;
                console.log(`[Mood-Based] Converted moods ${emotions.join(', ')} to genres: ${genres.join(', ')}`);
            }
        }
    }

    const searchOptions: SearchOptions = {
        mediaType,
        genres,
        language,
        region,
        hiddenGems,
        page,
        // Add year filter for recent releases
        ...(recentYear && { year: recentYear }),
        // Add year/decade filters from NLP temporal extraction (prefer NLP if available)
        ...(temporal?.startYear && temporal?.type === 'year' && { year: temporal.startYear }),
        ...(temporal?.value && temporal?.type === 'decade' && { decade: parseInt(temporal.value) }),
    };

    const mediaItems = await searchMedia(query, searchOptions);

    const results: MediaRecommendation[] = [];
    for (const media of mediaItems.slice(0, 10)) {
        const fullRec = await buildRecommendation(media, mediaType, region);
        if (fullRec) {
            // Calculate match score based on heuristics
            let score = 60;
            score += Math.min(20, media.vote_average * 2);
            score += Math.min(20, media.popularity / 100);
            fullRec.matchPercentage = Math.round(Math.min(100, score));
            results.push(fullRec);
        }
    }

    return results;
}

/**
 * Calculate dynamic match score based on multiple factors
 */
function calculateMatchScore(
    media: TMDBMedia,
    nlpGenres: string[],
    userGenreScores: Record<string, number> = {}
): number {
    // TMDB genre IDs to names mapping
    const genreIdMap: Record<number, string> = {
        28: 'action', 12: 'adventure', 16: 'animation', 35: 'comedy', 80: 'crime',
        99: 'documentary', 18: 'drama', 10751: 'family', 14: 'fantasy', 36: 'history',
        27: 'horror', 10402: 'music', 9648: 'mystery', 10749: 'romance', 878: 'science fiction',
        10770: 'tv movie', 53: 'thriller', 10752: 'war', 37: 'western',
        10759: 'action & adventure', 10762: 'kids', 10763: 'news', 10764: 'reality',
        10765: 'sci-fi & fantasy', 10766: 'soap', 10767: 'talk', 10768: 'war & politics'
    };

    // Convert genre IDs to names
    const mediaGenreNames = (media.genre_ids || []).map((id: number) => genreIdMap[id] || '').filter(Boolean);

    let score = 40; // Base score

    // 1. Genre matching (up to +30 points)
    if (nlpGenres.length > 0 && mediaGenreNames.length > 0) {
        const genreMatches = nlpGenres.filter((g: string) =>
            mediaGenreNames.some((mg: string) =>
                mg.toLowerCase().includes(g.toLowerCase()) ||
                g.toLowerCase().includes(mg.toLowerCase())
            )
        );
        const genreScore = Math.min(30, (genreMatches.length / nlpGenres.length) * 30);
        score += genreScore;
    } else if (Object.keys(userGenreScores).length > 0 && mediaGenreNames.length > 0) {
        // Fallback to user preferences
        const genreScore = mediaGenreNames.reduce((acc: number, g: string) =>
            acc + (userGenreScores[g.toLowerCase()] || 0), 0
        );
        score += Math.min(30, genreScore);
    }

    // 2. Rating bonus (up to +15 points)
    score += Math.min(15, (media.vote_average || 0) * 1.5);

    // 3. Popularity bonus (up to +10 points)
    score += Math.min(10, (media.popularity || 0) / 500);

    // 4. Recency bonus (up to +5 points)
    const releaseYear = new Date(media.release_date || media.first_air_date || '').getFullYear();
    const currentYear = new Date().getFullYear();
    const yearsOld = currentYear - releaseYear;
    if (yearsOld <= 1) score += 5;
    else if (yearsOld <= 3) score += 3;
    else if (yearsOld <= 5) score += 1;

    return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Build a full MediaRecommendation from TMDB data
 */
async function buildRecommendation(
    media: TMDBMedia,
    mediaType: MediaType,
    region: string,
    aiExplanation?: string,
    nlpGenres?: string[],
    userGenreScores?: Record<string, number>
): Promise<MediaRecommendation | null> {
    const tmdbType = mediaType === 'anime' ? 'tv' : mediaType;
    const title = media.title || media.name || 'Unknown';
    const releaseDate = media.release_date || media.first_air_date || '';
    const year = releaseDate ? new Date(releaseDate).getFullYear() : 0;

    try {
        const [providers, reviews, videos, tvDetails] = await Promise.all([
            getWatchProviders(media.id, tmdbType, region),
            getMediaReviews(media.id, tmdbType),
            getMediaVideos(media.id, tmdbType),
            tmdbType === 'tv' ? getTVDetails(media.id) : Promise.resolve(null),
        ]);

        // Calculate dynamic match score
        const matchScore = calculateMatchScore(media, nlpGenres || [], userGenreScores);

        return {
            id: media.id,
            title,
            year,
            plot: media.overview || 'No description available.',
            genres: [],
            rating: media.vote_average || 0,
            streamingPlatforms: providers.map((p) => p.name),
            streamingLogos: providers.map((p) => p.logo),
            streamingProviders: providers,
            posterUrl: getImageUrl(media.poster_path, 'poster'),
            backdropUrl: getImageUrl(media.backdrop_path, 'backdrop'),
            reviews: reviews as Review[],
            trailerKey: videos[0]?.key,
            intensity: 5,
            emotions: [],
            themes: [],
            matchPercentage: matchScore, // Dynamic calculation
            mediaType,
            aiExplanation,
            numberOfSeasons: tvDetails?.seasons,
            numberOfEpisodes: tvDetails?.episodes,
        };
    } catch (error) {
        console.error(`Error building recommendation for ${title}:`, error);
        return null;
    }
}

// Legacy export for backward compatibility
export const getMovieRecommendations = async (input: string) => {
    const result = await getRecommendations(input, { mediaType: 'movie', hiddenGems: false, region: 'IN' });
    return result.recommendations;
};

// Re-export NLP functions for convenience
export { analyzeUserInputWithNLP, getSearchParams, parseNaturalLanguage };
export type { EnhancedAnalyzedInput, NLPAnalysisResult } from './nlpProcessor';
