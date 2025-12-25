import { MediaRecommendation, MediaType, Review } from '../types';
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

interface AnalyzedInput {
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

function detectLanguage(text: string): string | undefined {
    const lowerText = text.toLowerCase();
    for (const [keyword, langCode] of Object.entries(languageKeywords)) {
        if (lowerText.includes(keyword)) {
            return langCode;
        }
    }
    return undefined;
}

function detectRecency(text: string): boolean {
    const recencyWords = ['new', 'latest', 'recent', '2024', '2025', 'current', 'this year', 'now playing'];
    const lowerText = text.toLowerCase();
    return recencyWords.some((word) => lowerText.includes(word));
}

function analyzeUserInput(input: string): AnalyzedInput {
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
}

/**
 * Main recommendation function with AI + heuristic fallback
 */
export async function getRecommendations(
    userInput: string,
    options: RecommendationOptions = { mediaType: 'movie', hiddenGems: false, region: 'IN' }
): Promise<MediaRecommendation[]> {
    const { mediaType, hiddenGems, region } = options;
    const analysis = analyzeUserInput(userInput);

    // Get fresh context if user wants recent content
    let freshContext: string[] | undefined;
    if (analysis.wantsRecent) {
        freshContext = await getRecentReleases(mediaType, 15);
    }

    // Try AI recommendations first
    const aiResult = await getAIRecommendations(userInput, mediaType, hiddenGems, freshContext);

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
            options
        );

        // Merge without duplicates
        const existingIds = new Set(recommendations.map((r) => r.id));
        for (const result of heuristicResults) {
            if (!existingIds.has(result.id)) {
                recommendations.push(result);
            }
        }
    }

    return recommendations
        .filter((r) => r.matchPercentage > 30)
        .sort((a, b) => b.matchPercentage - a.matchPercentage)
        .slice(0, 7);
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
 */
async function getHeuristicRecommendations(
    query: string,
    analysis: AnalyzedInput,
    options: RecommendationOptions
): Promise<MediaRecommendation[]> {
    const { mediaType, hiddenGems, region } = options;

    const searchOptions: SearchOptions = {
        mediaType,
        genres: analysis.genres,
        language: analysis.language,
        region,
        hiddenGems,
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
 * Build a full MediaRecommendation from TMDB data
 */
async function buildRecommendation(
    media: TMDBMedia,
    mediaType: MediaType,
    region: string,
    aiExplanation?: string
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
            matchPercentage: aiExplanation ? 85 : 70, // AI matches get higher base score
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
    return getRecommendations(input, { mediaType: 'movie', hiddenGems: false, region: 'IN' });
};
