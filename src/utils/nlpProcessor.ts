/**
 * NLP Processor for Conversational Movie Queries
 * Provides advanced natural language processing to understand user intent,
 * extract entities, detect moods, and handle complex queries.
 */

import { MediaType } from '../types';

// ============================================================================
// Type Definitions
// ============================================================================

export type IntentType = 'recommendation' | 'search' | 'browse' | 'find_similar' | 'unknown';

export interface ParsedIntent {
    type: IntentType;
    confidence: number;
    primaryQuery: string;
    modifiers: string[];
}

export interface ExtractedEntities {
    genres: string[];
    actors: string[];
    directors: string[];
    moods: string[];
    themes: string[];
    timePeriods: string[];
}

export interface TemporalInfo {
    type: 'recent' | 'classic' | 'decade' | 'year' | 'range' | 'unknown';
    value?: string;
    startYear?: number;
    endYear?: number;
}

export interface ParsedQuery {
    intent: ParsedIntent;
    entities: ExtractedEntities;
    temporal: TemporalInfo;
    originalQuery: string;
    expandedQuery: string;
    isComparative: boolean;
    comparisonRef?: string;
    isComplex: boolean;
    moodConstraints?: string[];
    excludeTerms: string[];
}

export interface NLPAnalysisResult {
    success: boolean;
    parsedQuery: ParsedQuery | null;
    error?: string;
    fallbackUsed: boolean;
}

// ============================================================================
// Intent Detection Patterns
// ============================================================================

const INTENT_PATTERNS: { intent: IntentType; patterns: RegExp[]; confidence: number }[] = [
    {
        intent: 'recommendation',
        patterns: [
            /recommend/i,
            /suggest/i,
            /i (want|need|feel like|would like|am in the mood for)/i,
            /can you (find|get|show) me/i,
            /what should i (watch|see)/i,
            /looking for/i,
            /i'm looking for/i,
            /find me/i,
            /give me (some|a|any)/i,
        ],
        confidence: 0.9,
    },
    {
        intent: 'search',
        patterns: [
            /search/i,
            /find (a |an )?/i,
            /lookup/i,
            /look for/i,
            /show me (all |the )?/i,
        ],
        confidence: 0.85,
    },
    {
        intent: 'browse',
        patterns: [
            /browse/i,
            /explore/i,
            /list/i,
            /what (are|is) (available|there)/i,
            /show (me )?what/i,
            /just browsing/i,
        ],
        confidence: 0.8,
    },
    {
        intent: 'find_similar',
        patterns: [
            /similar to/i,
            /like (.*) but/i,
            /same as/i,
            /same kind/i,
            /more like/i,
            /other (movies?|films?|shows?)/i,
            /if i liked/i,
            /after watching/i,
        ],
        confidence: 0.95,
    },
];

// ============================================================================
// Genre Keywords Dictionary
// ============================================================================

const GENRE_KEYWORDS: Record<string, string[]> = {
    action: [
        'action', 'fight', 'explosion', 'adventure', 'exciting', 'battle', 'war',
        'combat', 'chase', 'mission', 'hero', 'superhero', 'marvel', 'dc', 'fast',
        'furious', 'james bond', 'transformers', 'avengers'
    ],
    thriller: [
        'thriller', 'suspense', 'tension', 'mystery', 'nail-biting', 'gripping',
        'edge of seat', 'suspenseful', 'psychological', 'twist'
    ],
    drama: [
        'drama', 'emotional', 'life', 'relationship', 'touching', 'powerful',
        'serious', 'realistic', 'biopic', 'period'
    ],
    'sci-fi': [
        'sci-fi', 'science fiction', 'future', 'space', 'technology', 'dystopia',
        'alien', 'robot', 'ai', 'space travel', 'interstellar', 'mars', 'galaxy'
    ],
    horror: [
        'horror', 'scary', 'frightening', 'terrifying', 'spooky', 'creepy',
        'fright', 'terror', 'ghost', 'supernatural', 'demon', 'vampire', 'zombie',
        'haunted', 'jump scare'
    ],
    comedy: [
        'comedy', 'funny', 'hilarious', 'laugh', 'humorous', 'witty', 'comedic',
        'stand-up', 'rom-com', 'slapstick', 'spoof', 'parody', 'laugh out loud'
    ],
    romance: [
        'romance', 'love', 'romantic', 'relationship', 'dating', 'heart',
        'love story', 'couple', 'passion', 'wedding', 'crush', 'date night'
    ],
    fantasy: [
        'fantasy', 'magical', 'mythical', 'supernatural', 'enchanted', 'wizard',
        'magic', 'dragon', 'fairy', 'elf', 'kingdom', 'harry potter', 'lord of the rings'
    ],
    animation: [
        'animation', 'animated', 'cartoon', 'pixar', 'disney', 'anime', 'manga',
        'animated film', 'family friendly'
    ],
    documentary: [
        'documentary', 'real story', 'true story', 'historical', 'educational',
        'true events', 'biography', 'docuseries'
    ],
    crime: [
        'crime', 'detective', 'murder', 'investigation', 'police', 'heist',
        'gangster', 'mafia', 'serial killer', 'cop', 'law enforcement'
    ],
    family: [
        'family', 'kids', 'children', 'wholesome', 'all ages', 'kids movie',
        'animated', 'children\'s', 'family friendly', 'for the whole family'
    ],
    mystery: [
        'mystery', 'mysterious', 'puzzle', 'clue', 'whodunit', 'secret',
        'investigation', 'detective', 'unsolved'
    ],
    war: [
        'war', 'military', 'soldier', 'battle', 'army', 'wwii', 'ww2', 'vietnam',
        'world war', 'combat', 'troop'
    ],
    music: [
        'music', 'musical', 'singer', 'band', 'concert', 'song', 'dance',
        'musician', 'singing', 'dancing'
    ],
    sport: [
        'sport', 'sports', 'athletic', 'football', 'basketball', 'soccer',
        'baseball', 'tennis', 'golf', 'championship', 'tournament'
    ],
    western: [
        'western', 'cowboy', 'old west', 'frontier', 'sheriff', 'gunslinger'
    ],
};

// ============================================================================
// Mood/Emotion Keywords
// ============================================================================

const MOOD_KEYWORDS: Record<string, string[]> = {
    happy: [
        'happy', 'joyful', 'fun', 'upbeat', 'cheerful', 'laugh', 'hilarious',
        'feel good', 'uplifting', 'positive', 'optimistic', 'joy', 'delight'
    ],
    sad: [
        'sad', 'emotional', 'touching', 'moving', 'tearjerker', 'cry', 'tears',
        'heartbreaking', 'melancholy', 'sorrow', 'grief', 'tragic', 'bittersweet'
    ],
    thrilling: [
        'thrilling', 'exciting', 'intense', 'suspenseful', 'adrenaline',
        'edge of seat', 'gripping', 'nail-biting', 'heart pounding', 'suspense'
    ],
    romantic: [
        'romantic', 'love', 'passionate', 'love story', 'romance', 'date night',
        'couple', 'lover', 'affection', 'heart'
    ],
    scary: [
        'scary', 'frightening', 'horror', 'terrifying', 'creepy', 'spooky',
        'fright', 'terror', 'scare', 'fear', 'horror movie', 'dark'
    ],
    thought_provoking: [
        'thought provoking', 'mind bending', 'complex', 'deep', 'intellectual',
        'philosophical', 'meaningful', 'cerebral', 'smart', 'twist ending'
    ],
    inspiring: [
        'inspiring', 'uplifting', 'motivational', 'inspirational', 'triumphant',
        'overcoming', 'against all odds', 'rags to riches', 'hero journey'
    ],
    cozy: [
        'cozy', 'comforting', 'feel good', 'wholesome', 'heartwarming', 'relaxing',
        'peaceful', 'gentle', 'comfy', 'cozy night', 'comfort food movie'
    ],
    dark: [
        'dark', 'dark movie', 'gothic', 'noir', 'grim', 'bleak', 'serious',
        'mature', 'adult', 'heavy'
    ],
    funny: [
        'funny', 'hilarious', 'comedy', 'laugh', 'humor', 'comedic', 'witty',
        'silly', 'absurd', 'cringe comedy', 'dark comedy'
    ],
    action: [
        'action packed', 'explosive', 'high octane', 'non-stop action',
        'fight scenes', 'stunts', 'adrenaline rush', 'fast paced'
    ],
    relaxing: [
        'relaxing', 'calm', 'peaceful', 'gentle', 'slow paced', 'meditative',
        'easy watching', 'laid back', 'chill'
    ],
};

// ============================================================================
// Temporal Expressions
// ============================================================================

const TEMPORAL_PATTERNS: { type: TemporalInfo['type']; patterns: RegExp[]; value: string }[] = [
    {
        type: 'recent',
        patterns: [
            /recent(ly)?/i,
            /latest/i,
            /new(est)?/i,
            /current/i,
            /this year/i,
            /now playing/i,
            /just released/i,
            /coming out/i,
        ],
        value: 'recent',
    },
    {
        type: 'classic',
        patterns: [
            /classic/i,
            /old(er)?/i,
            /vintage/i,
            /timeless/i,
            /golden age/i,
            /retro/i,
        ],
        value: 'classic',
    },
    {
        type: 'decade',
        patterns: [
            /\b(19|20)\d{0}s\b/,
            /\b(50s|60s|70s|80s|90s|00s|10s|20s)\b/i,
        ],
        value: 'decade',
    },
    {
        type: 'year',
        patterns: [
            /\b(19|20)\d{2}\b/,
        ],
        value: 'year',
    },
];

// ============================================================================
// Comparative Query Patterns
// ============================================================================

const COMPARATIVE_PATTERNS = [
    /like\s+(.+?)\s+but/i,
    /similar to\s+(.+)/i,
    /same (kind|type) (as|of)\s+(.+)/i,
    /better than\s+(.+)/i,
    /worse than\s+(.+)/i,
    /if you liked\s+(.+)/i,
    /after watching\s+(.+)/i,
    /more like\s+(.+)/i,
    /unlike\s+(.+)/i,
    /opposite of\s+(.+)/i,
];

// ============================================================================
// Complex Query Patterns
// ============================================================================

const COMPLEX_QUERY_PATTERNS = [
    /make[s]?\s+me\s+feel/i,
    /i\s+want\s+something\s+(that|which)/i,
    /looking for\s+something/i,
    /but with/i,
    /and also/i,
    /however/i,
    /although/i,
];

// ============================================================================
// Mood Constraint Patterns
// ============================================================================

const MOOD_CONSTRAINT_PATTERNS = [
    { pattern: /but (not |no |without )(.*)/i, type: 'exclude' },
    { pattern: /not (.*?),? (but|however)/i, type: 'exclude' },
    { pattern: /with (.*?)(?=\s+but|\s+and|\s+\w+\s+feels)/i, type: 'include' },
];

// ============================================================================
// Genre Synonyms for Query Expansion
// ============================================================================

const GENRE_SYNONYMS: Record<string, string[]> = {
    'sci-fi': ['science fiction', 'scifi', 'scifi'],
    'science fiction': ['sci-fi', 'scifi'],
    'horror': ['scary', 'fright'],
    'comedy': ['funny', 'laugh'],
    'romance': ['love', 'romantic'],
    'action': ['fight', 'adventure'],
    'thriller': ['suspense', 'mystery'],
    'drama': ['emotional', 'serious'],
    'animation': ['animated', 'cartoon'],
    'documentary': ['doc', 'doco'],
};

// ============================================================================
// Main NLP Functions
// ============================================================================

/**
 * Detects the user's intent from the text
 */
export function detectIntent(text: string): ParsedIntent {
    const lowerText = text.toLowerCase();

    let bestIntent: IntentType = 'unknown';
    let bestConfidence = 0;
    let primaryQuery = text;
    const modifiers: string[] = [];

    // Check each intent pattern
    for (const { intent, patterns, confidence } of INTENT_PATTERNS) {
        for (const pattern of patterns) {
            if (pattern.test(lowerText)) {
                if (confidence > bestConfidence) {
                    bestConfidence = confidence;
                    bestIntent = intent;
                }
            }
        }
    }

    // Extract modifiers
    if (/hidden gem/i.test(lowerText)) modifiers.push('hidden_gem');
    if (/underrated/i.test(lowerText)) modifiers.push('underrated');
    if (/popular/i.test(lowerText)) modifiers.push('popular');
    if (/award/i.test(lowerText)) modifiers.push('award_winning');
    if (/Oscar/i.test(lowerText)) modifiers.push('oscar');
    if (/Netflix|Amazon|Hulu|Disney/gi.test(lowerText)) {
        const platform = lowerText.match(/(Netflix|Amazon|Hulu|Disney)\+/i)?.[1];
        if (platform) modifiers.push(`streaming:${platform.toLowerCase()}`);
    }

    // Extract primary query (remove intent words)
    let query = lowerText
        .replace(/recommend|suggest|i want|i need|i feel like|can you (find|show) me|looking for/gi, '')
        .replace(/what should i watch|find me|give me some/gi, '')
        .trim();

    if (query.length > 0) {
        primaryQuery = query;
    }

    return {
        type: bestIntent,
        confidence: bestConfidence,
        primaryQuery,
        modifiers,
    };
}

/**
 * Extracts genre information from text
 */
export function extractGenres(text: string): string[] {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);
    const foundGenres: string[] = [];

    for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
        for (const keyword of keywords) {
            // Check for keyword matches
            if (words.some(word => word.includes(keyword.toLowerCase()))) {
                if (!foundGenres.includes(genre)) {
                    foundGenres.push(genre);
                }
                break;
            }
        }
    }

    return foundGenres;
}

/**
 * Extracts mood/emotion from text
 */
export function extractMood(text: string): string[] {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);
    const foundMoods: string[] = [];

    for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
        for (const keyword of keywords) {
            if (words.some(word => word.includes(keyword.toLowerCase()))) {
                if (!foundMoods.includes(mood)) {
                    foundMoods.push(mood);
                }
                break;
            }
        }
    }

    return foundMoods;
}

/**
 * Extracts named entities (actors, directors) from text
 * This is a simple keyword-based extraction
 */
export function extractEntities(text: string): ExtractedEntities {
    // Common actor/director name patterns (simplified)
    const actorPatterns = [
        /actor(s)?\s+(.+?)(?=\s+or|\s+and|$)/gi,
        /starring\s+(.+?)(?=\s+or|\s+and|$)/gi,
        /with\s+(.+?)(?=\s+in|\s+as|$)/gi,
        /featuring\s+(.+?)(?=\s+in|$)/gi,
    ];

    const directorPatterns = [
        /directed by\s+(.+?)(?=\s+or|\s+and|$)/gi,
        /director\s+(.+?)(?=\s+or|\s+and|$)/gi,
    ];

    const entities: ExtractedEntities = {
        genres: [],
        actors: [],
        directors: [],
        moods: [],
        themes: [],
        timePeriods: [],
    };

    // Extract genres
    entities.genres = extractGenres(text);

    // Extract moods
    entities.moods = extractMood(text);

    // Extract temporal info
    entities.timePeriods = extractTemporal(text);

    // Try to extract actor names (simplified - would need NLP model for proper NER)
    const actorMatch = text.match(/starring\s+([^,]+)/i);
    if (actorMatch) {
        const actorNames = actorMatch[1].split(/,|and/).map(n => n.trim()).filter(n => n.length > 2);
        entities.actors = actorNames;
    }

    // Try to extract director
    const directorMatch = text.match(/directed by\s+([^,]+)/i);
    if (directorMatch) {
        const directorNames = directorMatch[1].split(/,|and/).map(n => n.trim()).filter(n => n.length > 2);
        entities.directors = directorNames;
    }

    // Extract themes
    const themeKeywords = ['friendship', 'family', 'love', 'betrayal', 'revenge', 'survival',
        'coming of age', 'identity', 'redemption', 'justice', 'power', 'corruption'];
    const lowerText = text.toLowerCase();
    for (const theme of themeKeywords) {
        if (lowerText.includes(theme)) {
            entities.themes.push(theme);
        }
    }

    return entities;
}

/**
 * Extracts temporal expressions from text
 */
export function extractTemporal(text: string): string[] {
    const periods: string[] = [];
    const lowerText = text.toLowerCase();

    for (const { type, patterns, value } of TEMPORAL_PATTERNS) {
        for (const pattern of patterns) {
            if (pattern.test(lowerText)) {
                if (!periods.includes(value)) {
                    periods.push(value);
                }
            }
        }
    }

    // Extract decade references
    const decadeMatches = lowerText.match(/\b(19|20)\d{0}s\b/g);
    if (decadeMatches) {
        for (const match of decadeMatches) {
            if (!periods.includes(match)) {
                periods.push(match);
            }
        }
    }

    // Extract specific years
    const yearMatches = lowerText.match(/\b(19|20)\d{2}\b/g);
    if (yearMatches) {
        for (const match of yearMatches) {
            if (!periods.includes(match)) {
                periods.push(match);
            }
        }
    }

    return periods;
}

/**
 * Extracts temporal information with parsed values
 */
export function extractTemporalInfo(text: string): TemporalInfo {
    const periods = extractTemporal(text);
    const lowerText = text.toLowerCase();

    // Determine primary temporal type
    if (periods.includes('recent') || /new|latest|current/i.test(lowerText)) {
        return { type: 'recent', value: 'recent' };
    }

    if (periods.includes('classic') || /old|classic|vintage/i.test(lowerText)) {
        return { type: 'classic', value: 'classic' };
    }

    // Check for decade
    const decadeMatch = lowerText.match(/\b(19|20)\d{0}s\b/);
    if (decadeMatch) {
        const decade = decadeMatch[0];
        const startYear = parseInt(decade.substring(0, 3) + '0');
        return {
            type: 'decade',
            value: decade,
            startYear,
            endYear: startYear + 9
        };
    }

    // Check for specific year
    const yearMatch = lowerText.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
        return {
            type: 'year',
            value: yearMatch[0],
            startYear: parseInt(yearMatch[0]),
            endYear: parseInt(yearMatch[0])
        };
    }

    return { type: 'unknown' };
}

/**
 * Checks if the query is comparative
 */
export function isComparativeQuery(text: string): { isComparative: boolean; reference?: string } {
    for (const pattern of COMPARATIVE_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            return {
                isComparative: true,
                reference: match[1] || match[0],
            };
        }
    }
    return { isComparative: false };
}

/**
 * Checks if the query is complex (multiple conditions)
 */
export function isComplexQuery(text: string): boolean {
    return COMPLEX_QUERY_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Extracts mood constraints (includes/excludes)
 */
export function extractMoodConstraints(text: string): { include: string[]; exclude: string[] } {
    const result = { include: [] as string[], exclude: [] as string[] };
    const moods = extractMood(text);

    // Check for negation patterns
    const excludePatterns = [
        /not\s+(.*?)(?=\s+but|,|\s+however|\s+although|$)/gi,
        /without\s+(.*?)(?=\s+but|,|\s+however|\s+although|$)/gi,
        /but\s+(?:not|no|without)\s+(.*?)(?=\s+but|,|\s+however|\s+although|$)/gi,
    ];

    const lowerText = text.toLowerCase();

    // Check for "but not" patterns
    for (const pattern of excludePatterns) {
        const matches = lowerText.match(pattern);
        if (matches) {
            for (const match of matches) {
                const excludedMoods = extractMood(match.replace(/not|without|but/gi, '').trim());
                result.exclude.push(...excludedMoods);
            }
        }
    }

    // If there's "but" with mood change, the first part is include
    if (/but/i.test(text)) {
        const parts = text.split(/but/i);
        if (parts.length > 1) {
            const firstPart = parts[0];
            const firstMoods = extractMood(firstPart);
            result.include = firstMoods.filter(m => !result.exclude.includes(m));
        }
    } else {
        result.include = moods.filter(m => !result.exclude.includes(m));
    }

    return result;
}

/**
 * Expands a query with synonyms
 */
export function expandQuery(query: string): string {
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(/\s+/);
    const expandedWords: string[] = [...words];

    for (const [genre, synonyms] of Object.entries(GENRE_SYNONYMS)) {
        for (const word of words) {
            if (word === genre || synonyms.includes(word)) {
                // Add genre and its synonyms
                if (!expandedWords.includes(genre)) {
                    expandedWords.push(genre);
                }
                for (const synonym of synonyms) {
                    if (!expandedWords.includes(synonym)) {
                        expandedWords.push(synonym);
                    }
                }
            }
        }
    }

    return expandedWords.join(' ');
}

/**
 * Extracts exclude terms from the query
 */
export function extractExcludeTerms(text: string): string[] {
    const excludeTerms: string[] = [];
    const lowerText = text.toLowerCase();

    // Common exclusion patterns
    const exclusionPatterns = [
        /not\s+(.*?)(?=\s+but|,|\s+however|\s+although|\s+and\s+not|$)/gi,
        /without\s+(.*?)(?=\s+but|,|\s+however|\s+although|\s+and\s+not|$)/gi,
        /but\s+(?:not|no)\s+(.*?)(?=\s+but|,|\s+however|\s+although|$)/gi,
        /except\s+(.*?)(?=\s+but|,|$)/gi,
    ];

    for (const pattern of exclusionPatterns) {
        const matches = lowerText.match(pattern);
        if (matches) {
            for (const match of matches) {
                // Extract the excluded terms
                const cleaned = match
                    .replace(/not|without|but|except/gi, '')
                    .trim();
                if (cleaned.length > 2) {
                    excludeTerms.push(cleaned);
                }
            }
        }
    }

    return excludeTerms;
}

/**
 * Main parsing function - parses natural language query and returns structured intent
 */
export function parseNaturalLanguage(query: string): NLPAnalysisResult {
    try {
        // Handle empty or invalid input
        if (!query || typeof query !== 'string') {
            return {
                success: false,
                parsedQuery: null,
                error: 'Invalid query: query must be a non-empty string',
                fallbackUsed: true,
            };
        }

        const trimmedQuery = query.trim();

        if (trimmedQuery.length === 0) {
            return {
                success: false,
                parsedQuery: null,
                error: 'Invalid query: empty query',
                fallbackUsed: true,
            };
        }

        // Detect intent
        const intent = detectIntent(trimmedQuery);

        // Extract entities
        const entities = extractEntities(trimmedQuery);

        // Extract temporal info
        const temporal = extractTemporalInfo(trimmedQuery);

        // Check for comparative query
        const comparative = isComparativeQuery(trimmedQuery);

        // Check for complex query
        const complex = isComplexQuery(trimmedQuery);

        // Extract mood constraints
        const moodConstraints = extractMoodConstraints(trimmedQuery);

        // Extract exclude terms
        const excludeTerms = extractExcludeTerms(trimmedQuery);

        // Expand query
        const expandedQuery = expandQuery(trimmedQuery);

        const parsedQuery: ParsedQuery = {
            intent,
            entities,
            temporal,
            originalQuery: trimmedQuery,
            expandedQuery,
            isComparative: comparative.isComparative,
            comparisonRef: comparative.reference,
            isComplex: complex,
            moodConstraints: moodConstraints.include.length > 0 ? moodConstraints.include : undefined,
            excludeTerms,
        };

        return {
            success: true,
            parsedQuery,
            fallbackUsed: false,
        };
    } catch (error) {
        console.error('NLP parsing error:', error);
        return {
            success: false,
            parsedQuery: null,
            error: error instanceof Error ? error.message : 'Unknown NLP error',
            fallbackUsed: true,
        };
    }
}

/**
 * Enhanced analyzeUserInput that uses NLP
 * This integrates with the existing recommendation engine
 */
export interface EnhancedAnalyzedInput {
    genres: string[];
    emotions: string[];
    intensity: number;
    language?: string;
    wantsRecent: boolean;
    temporal: TemporalInfo;
    entities: ExtractedEntities;
    intent: ParsedIntent;
    useNLP: boolean;
}

/**
 * Analyzes user input using NLP with fallback to basic keyword matching
 */
export function analyzeUserInputWithNLP(input: string): EnhancedAnalyzedInput {
    // Default basic analysis (fallback)
    const defaultAnalysis: EnhancedAnalyzedInput = {
        genres: [],
        emotions: [],
        intensity: 5,
        language: undefined,
        wantsRecent: false,
        temporal: { type: 'unknown' },
        entities: {
            genres: [],
            actors: [],
            directors: [],
            moods: [],
            themes: [],
            timePeriods: [],
        },
        intent: { type: 'unknown', confidence: 0, primaryQuery: input, modifiers: [] },
        useNLP: false,
    };

    // Try NLP parsing
    const nlpResult = parseNaturalLanguage(input);

    if (nlpResult.success && nlpResult.parsedQuery) {
        const parsed = nlpResult.parsedQuery;

        // Extract genres from NLP result
        const genres = parsed.entities.genres || [];

        // Extract moods/emotions
        const emotions = parsed.entities.moods || [];

        // Detect language
        const language = detectLanguageFromQuery(input);

        // Detect recency
        const wantsRecent = parsed.temporal.type === 'recent' ||
            /recent|latest|new|this year/i.test(input);

        // Detect intensity
        const intensity = detectIntensity(input);

        return {
            genres,
            emotions,
            intensity,
            language,
            wantsRecent,
            temporal: parsed.temporal,
            entities: parsed.entities,
            intent: parsed.intent,
            useNLP: true,
        };
    }

    // Fallback to basic keyword matching
    return {
        ...defaultAnalysis,
        ...basicKeywordAnalysis(input),
    };
}

/**
 * Detects language from query keywords
 */
function detectLanguageFromQuery(text: string): string | undefined {
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
        chinese: 'zh',
        bollywood: 'hi',
        indian: 'hi',
    };

    const lowerText = text.toLowerCase();
    for (const [keyword, langCode] of Object.entries(languageKeywords)) {
        if (lowerText.includes(keyword)) {
            return langCode;
        }
    }
    return undefined;
}

/**
 * Detects intensity from query keywords
 */
function detectIntensity(text: string): number {
    const lowerText = text.toLowerCase();

    const highIntensity = ['intense', 'brutal', 'extreme', 'violent', 'action-packed',
        'gory', 'dark', 'gritty', 'hard', 'strong'];
    const lowIntensity = ['mild', 'gentle', 'calm', 'peaceful', 'slow-paced',
        'cozy', 'light', 'easy', 'relaxing'];

    if (highIntensity.some(word => lowerText.includes(word))) {
        return 8;
    }
    if (lowIntensity.some(word => lowerText.includes(word))) {
        return 3;
    }
    return 5;
}

/**
 * Basic keyword analysis as fallback
 */
function basicKeywordAnalysis(input: string): Partial<EnhancedAnalyzedInput> {
    const genres = extractGenres(input);
    const emotions = extractMood(input);
    const language = detectLanguageFromQuery(input);
    const wantsRecent = /recent|latest|new|this year/i.test(input);
    const intensity = detectIntensity(input);
    const temporal = extractTemporalInfo(input);

    return {
        genres,
        emotions,
        language,
        wantsRecent,
        intensity,
        temporal,
    };
}

/**
 * Process a query with NLP and return formatted search parameters
 */
export interface SearchParams {
    query: string;
    genres: string[];
    language?: string;
    year?: number;
    decade?: string;
    mediaType: MediaType;
    actors?: string[];
    directors?: string[];
    moods?: string[];
}

export function getSearchParams(query: string, mediaType: MediaType = 'movie'): SearchParams {
    const analysis = analyzeUserInputWithNLP(query);

    // Extract year from temporal
    let year: number | undefined;
    let decade: string | undefined;

    if (analysis.temporal.startYear && analysis.temporal.endYear) {
        if (analysis.temporal.type === 'year') {
            year = analysis.temporal.startYear;
        } else if (analysis.temporal.type === 'decade') {
            decade = analysis.temporal.value;
        }
    }

    return {
        query: analysis.intent.primaryQuery || query,
        genres: analysis.genres,
        language: analysis.language,
        year,
        decade,
        mediaType,
        actors: analysis.entities.actors.length > 0 ? analysis.entities.actors : undefined,
        directors: analysis.entities.directors.length > 0 ? analysis.entities.directors : undefined,
        moods: analysis.emotions.length > 0 ? analysis.emotions : undefined,
    };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates and normalizes genre names
 */
export function normalizeGenre(genre: string): string {
    const normalized = genre.toLowerCase().trim();

    // Map common variations to standard genres
    const genreMap: Record<string, string> = {
        'sci-fi': 'sci-fi',
        'scifi': 'sci-fi',
        'science fiction': 'sci-fi',
        'horror': 'horror',
        'comedy': 'comedy',
        'romance': 'romance',
        'romantic': 'romance',
        'action': 'action',
        'thriller': 'thriller',
        'drama': 'drama',
        'animation': 'animation',
        'animated': 'animation',
        'documentary': 'documentary',
        'doc': 'documentary',
        'family': 'family',
        'fantasy': 'fantasy',
        'mystery': 'mystery',
        'crime': 'crime',
        'war': 'war',
        'music': 'music',
        'musical': 'music',
        'sport': 'sport',
        'western': 'western',
    };

    return genreMap[normalized] || normalized;
}

/**
 * Checks if NLP is available (always true in this implementation)
 */
export function isNLPAvailable(): boolean {
    return true;
}

/**
 * Gets confidence level for NLP processing
 */
export function getNLPConfidence(analysis: EnhancedAnalyzedInput): 'high' | 'medium' | 'low' {
    if (analysis.useNLP && analysis.intent.confidence >= 0.8) {
        return 'high';
    }
    if (analysis.genres.length > 0 || analysis.emotions.length > 0) {
        return 'medium';
    }
    return 'low';
}
