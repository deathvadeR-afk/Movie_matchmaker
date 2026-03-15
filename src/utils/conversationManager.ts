/**
 * Conversation Manager for Movie Recommendations
 * Handles conversational modification of recommendations through natural language.
 */

import {
    MediaRecommendation,
    ConversationState,
    ConversationMessage,
    ConversationRole,
    ParsedModification,
    ModificationType,
    RecommendationConstraints,
    QuickAction,
    MediaType,
} from '../types';
import { analyzeUserInputWithNLP, EnhancedAnalyzedInput } from './nlpProcessor';
import { getRecommendations, RecommendationOptions } from './recommendationEngine';
import { getCurrentUser } from '../lib/supabase';
import {
    saveUserQuery,
    saveAIResponse,
    saveConversationSummary,
    getLearnedPreferences,
    buildContextString,
    clearSessionId
} from './conversationPersistence';

// ============================================================================
// State Management
// ============================================================================

let currentConversation: ConversationState | null = null;

// Generate unique ID
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Conversation Management Functions
// ============================================================================

/**
 * Start a new conversation session
 */
export function startConversation(
    originalQuery: string,
    initialRecommendations: MediaRecommendation[] = []
): ConversationState {
    currentConversation = {
        sessionId: generateId(),
        messages: [],
        currentRecommendations: [...initialRecommendations],
        originalQuery,
        acceptedMovies: [],
        rejectedMovies: [],
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        isActive: true,
    };

    // Add welcome message
    const welcomeMessage: ConversationMessage = {
        id: generateId(),
        role: 'assistant',
        content: getWelcomeMessage(initialRecommendations.length),
        timestamp: Date.now(),
    };
    currentConversation.messages.push(welcomeMessage);

    return currentConversation;
}

/**
 * Add a message to the conversation history
 */
export function addMessage(
    role: ConversationRole,
    content: string,
    metadata?: ConversationMessage['metadata']
): ConversationMessage {
    if (!currentConversation) {
        throw new Error('No active conversation. Call startConversation() first.');
    }

    const message: ConversationMessage = {
        id: generateId(),
        role,
        content,
        timestamp: Date.now(),
        metadata,
    };

    currentConversation.messages.push(message);
    currentConversation.lastUpdated = Date.now();

    return message;
}

/**
 * Get the full conversation history
 */
export function getHistory(): ConversationMessage[] {
    if (!currentConversation) {
        return [];
    }
    return [...currentConversation.messages];
}

/**
 * Get the current conversation state
 */
export function getConversationState(): ConversationState | null {
    return currentConversation;
}

/**
 * Clear the current conversation session
 */
export function clearConversation(): void {
    currentConversation = null;
}

/**
 * Update current recommendations
 */
export function updateRecommendations(recommendations: MediaRecommendation[]): void {
    if (!currentConversation) {
        throw new Error('No active conversation. Call startConversation() first.');
    }
    currentConversation.currentRecommendations = recommendations;
    currentConversation.lastUpdated = Date.now();
}

/**
 * Mark a movie as accepted/liked
 */
export function acceptMovie(movieId: number): void {
    if (!currentConversation) return;

    if (!currentConversation.acceptedMovies.includes(movieId)) {
        currentConversation.acceptedMovies.push(movieId);
    }
    // Remove from rejected if present
    currentConversation.rejectedMovies = currentConversation.rejectedMovies.filter(id => id !== movieId);
    currentConversation.lastUpdated = Date.now();
}

/**
 * Mark a movie as rejected/dismissed
 */
export function rejectMovie(movieId: number): void {
    if (!currentConversation) return;

    if (!currentConversation.rejectedMovies.includes(movieId)) {
        currentConversation.rejectedMovies.push(movieId);
    }
    // Remove from accepted if present
    currentConversation.acceptedMovies = currentConversation.acceptedMovies.filter(id => id !== movieId);
    currentConversation.lastUpdated = Date.now();
}

// ============================================================================
// Modification Parsing Functions
// ============================================================================

/**
 * Parse user's modification request
 */
export async function parseModificationRequest(
    userInput: string,
    currentRecommendations: MediaRecommendation[]
): Promise<ParsedModification> {
    // Detect the type of modification
    const modificationType = detectModificationType(userInput);

    // Extract movie references
    const targetMovieIds = extractMovieReferences(userInput, currentRecommendations);

    // Extract genre changes
    const { added: targetGenres, removed: excludedGenres } = extractGenreChanges(userInput);

    // Extract time period changes
    const targetTimePeriod = extractTimePeriodChanges(userInput);

    // Extract emotions
    const targetEmotions = extractEmotions(userInput);

    // Determine how many to add
    const addCount = extractAddCount(userInput);

    // Check for contradictory requests
    const { isContradictory, details: contradictionDetails } = checkForContradictions(
        userInput,
        targetGenres,
        excludedGenres
    );

    // Check if clarification is needed
    const clarificationNeeded = checkClarificationNeeded(
        userInput,
        modificationType,
        targetMovieIds,
        currentRecommendations
    );

    return {
        type: modificationType,
        confidence: calculateConfidence(userInput, modificationType),
        targetMovieIds,
        targetGenres,
        targetTimePeriod,
        targetEmotions,
        excludedGenres,
        excludedMovieIds: [],
        addCount,
        clarificationNeeded,
        isContradictory,
        contradictionDetails,
    };
}

/**
 * Detect the type of modification from user input
 */
export function detectModificationType(input: string): ModificationType {
    const lowerInput = input.toLowerCase();

    // Remove patterns
    if (
        /remove|delete|hide|don'?t show|get rid of|exclude|no\s+(more|thank)/i.test(lowerInput) ||
        /take out|without|skip/i.test(lowerInput)
    ) {
        return 'remove';
    }

    // Add patterns
    if (
        /add|more|extra|another|give me (more|another)|show (more|another)/i.test(lowerInput) ||
        /i want (more|another)|find (more|another)/i.test(lowerInput)
    ) {
        return 'add';
    }

    // Change patterns
    if (
        /change|switch|instead|rather|but|i want|convert/i.test(lowerInput) ||
        /different from|instead of/i.test(lowerInput)
    ) {
        return 'change';
    }

    // Expand patterns
    if (
        /expand|broaden|widen|broader|more options|more choices/i.test(lowerInput) ||
        /similar to|like this|more like/i.test(lowerInput)
    ) {
        return 'expand';
    }

    // Narrow patterns
    if (
        /narrow|restrict|limit|filter|fewer|more specific|less options/i.test(lowerInput) ||
        /only|just|exactly/i.test(lowerInput)
    ) {
        return 'narrow';
    }

    // Similar patterns
    if (
        /similar|like|more like|same (style|genre|vibe)/i.test(lowerInput) ||
        /recommend.*similar/i.test(lowerInput)
    ) {
        return 'similar';
    }

    // Different patterns
    if (
        /different|not like|opposite|instead|contrast/i.test(lowerInput) ||
        /not this|unlike/i.test(lowerInput)
    ) {
        return 'different';
    }

    // More like patterns
    if (/more like|less like/i.test(lowerInput)) {
        return /more like/i.test(lowerInput) ? 'more_like' : 'less_like';
    }

    // Check if clarification is needed
    if (
        /which|what do you mean|can you explain|i don'?t understand|clarify/i.test(lowerInput) ||
        /not sure|maybe|i don'?t know/i.test(lowerInput)
    ) {
        return 'clarify';
    }

    // Default to 'change' for any other modification
    return 'change';
}

/**
 * Extract movie references from user input
 */
export function extractMovieReferences(
    input: string,
    recommendations: MediaRecommendation[]
): number[] {
    const lowerInput = input.toLowerCase();
    const foundIds: number[] = [];

    // Try to find movie titles in the input
    for (const movie of recommendations) {
        const titleLower = movie.title.toLowerCase();

        // Check for exact title match
        if (lowerInput.includes(titleLower)) {
            foundIds.push(movie.id);
            continue;
        }

        // Check for partial title match
        const titleWords = titleLower.split(/\s+/).filter(w => w.length > 3);
        for (const word of titleWords) {
            if (lowerInput.includes(word) && word.length > 3) {
                foundIds.push(movie.id);
                break;
            }
        }
    }

    // Also check for positional references
    const positionPatterns = [
        /first|one|1st/i,
        /second|two|2nd/i,
        /third|three|3rd/i,
        /fourth|four|4th/i,
        /fifth|five|5th/i,
        /last|final/i,
    ];

    for (let i = 0; i < positionPatterns.length; i++) {
        if (positionPatterns[i].test(lowerInput) && recommendations[i]) {
            if (!foundIds.includes(recommendations[i].id)) {
                foundIds.push(recommendations[i].id);
            }
        }
    }

    return foundIds;
}

/**
 * Extract genre preference changes from user input
 */
export function extractGenreChanges(input: string): { added: string[]; removed: string[] } {
    const lowerInput = input.toLowerCase();

    // Common genre keywords
    const genreKeywords: Record<string, string[]> = {
        action: ['action', 'fight', 'adventure', 'explosion', 'combat'],
        thriller: ['thriller', 'suspense', 'mystery', 'tension'],
        drama: ['drama', 'dramatic', 'emotional'],
        comedy: ['comedy', 'funny', 'hilarious', 'humor', 'laugh'],
        horror: ['horror', 'scary', 'frightening', 'terrifying'],
        romance: ['romance', 'romantic', 'love'],
        'sci-fi': ['sci-fi', 'science fiction', 'space', 'future'],
        fantasy: ['fantasy', 'magical', 'fantasy'],
        animation: ['animation', 'animated', 'cartoon'],
        documentary: ['documentary', 'documentaries'],
        crime: ['crime', 'criminal', 'detective'],
        family: ['family', 'kids', 'children'],
    };

    const added: string[] = [];
    const removed: string[] = [];

    // Check for genre mentions
    for (const [genre, keywords] of Object.entries(genreKeywords)) {
        const hasKeyword = keywords.some(kw => lowerInput.includes(kw));
        const hasNoKeyword = new RegExp(`no\\s+${genre}|without\\s+${genre}|exclude\\s+${genre}`).test(lowerInput) ||
            keywords.some(kw => lowerInput.includes(`not ${kw}`));

        if (hasKeyword && !hasNoKeyword) {
            added.push(genre);
        } else if (hasNoKeyword) {
            removed.push(genre);
        }
    }

    // Also check for explicit "more X" or "less X" patterns
    const moreGenrePattern = /more\s+(\w+)|add\s+(\w+)/gi;
    let match;
    while ((match = moreGenrePattern.exec(lowerInput)) !== null) {
        const genre = match[1] || match[2];
        if (genre && !added.includes(genre)) {
            added.push(genre);
        }
    }

    const lessGenrePattern = /less\s+(\w+)|fewer\s+(\w+)/gi;
    while ((match = lessGenrePattern.exec(lowerInput)) !== null) {
        const genre = match[1] || match[2];
        if (genre && !removed.includes(genre)) {
            removed.push(genre);
        }
    }

    return { added, removed };
}

/**
 * Extract time period changes from user input
 */
export function extractTimePeriodChanges(input: string): ParsedModification['targetTimePeriod'] {
    const lowerInput = input.toLowerCase();

    // Recent patterns
    if (/recent|latest|new|current|now|this year|recently/i.test(lowerInput)) {
        return { type: 'recent' };
    }

    // Classic patterns
    if (/classic|old|vintage|retro|80s|90s|70s|oldies/i.test(lowerInput)) {
        // Extract specific decade if mentioned
        const decadeMatch = lowerInput.match(/(\d{2})s/);
        if (decadeMatch) {
            const startYear = 1900 + parseInt(decadeMatch[1]);
            return { type: 'decade', startYear, endYear: startYear + 9, value: `${decadeMatch[1]}s` };
        }
        return { type: 'classic' };
    }

    // Year range patterns
    const rangeMatch = lowerInput.match(/(\d{4})\s*[-–]\s*(\d{4})/);
    if (rangeMatch) {
        return {
            type: 'range',
            startYear: parseInt(rangeMatch[1]),
            endYear: parseInt(rangeMatch[2]),
        };
    }

    // Specific year
    const yearMatch = lowerInput.match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch) {
        return { type: 'year', value: yearMatch[1], startYear: parseInt(yearMatch[1]) };
    }

    return { type: 'any' };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract emotions from user input
 */
function extractEmotions(input: string): string[] {
    const lowerInput = input.toLowerCase();
    const emotions: string[] = [];

    const emotionKeywords: Record<string, string[]> = {
        suspense: ['suspense', 'suspenseful', 'thrilling', 'edge'],
        hope: ['hopeful', 'uplifting', 'inspiring', 'positive'],
        fear: ['scary', 'frightening', 'fear', 'terrifying'],
        joy: ['happy', 'joyful', 'fun', 'cheerful', 'laugh'],
        sadness: ['sad', 'emotional', 'touching', 'tearjerker'],
        anger: ['angry', 'revenge', 'fury', 'rage'],
        wonder: ['amazing', 'wonderful', 'magical', 'spectacular'],
        tension: ['tense', 'tension', 'stress', 'stressful'],
        relaxation: ['relaxing', 'calm', 'peaceful', 'cozy'],
    };

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
        if (keywords.some(kw => lowerInput.includes(kw))) {
            emotions.push(emotion);
        }
    }

    return emotions;
}

/**
 * Extract how many more to add
 */
function extractAddCount(input: string): number {
    const lowerInput = input.toLowerCase();

    // Number patterns
    const numMatch = lowerInput.match(/(\d+)\s*(more|additional|extra)?/);
    if (numMatch) {
        return parseInt(numMatch[1]);
    }

    // Quantity words
    if (/a few|few/i.test(lowerInput)) return 3;
    if (/several/i.test(lowerInput)) return 5;
    if (/many|lots|a lot/i.test(lowerInput)) return 10;
    if (/some/i.test(lowerInput)) return 2;

    // Default
    return 5;
}

/**
 * Check for contradictory requests
 */
function checkForContradictions(
    input: string,
    addedGenres: string[],
    removedGenres: string[]
): { isContradictory: boolean; details?: string } {
    const lowerInput = input.toLowerCase();

    // Check genre contradictions
    const commonGenres = addedGenres.filter(g => removedGenres.includes(g));
    if (commonGenres.length > 0) {
        return {
            isContradictory: true,
            details: `You mentioned both wanting and not wanting ${commonGenres.join(', ')}`,
        };
    }

    // Check for "more X but less X" patterns
    const moreLessPattern = /more\s+(\w+).*less\s+(\w+)|less\s+(\w+).*more\s+(\w+)/i;
    const match = lowerInput.match(moreLessPattern);
    if (match) {
        return {
            isContradictory: true,
            details: 'Your request contains contradictory genre preferences',
        };
    }

    return { isContradictory: false };
}

/**
 * Check if clarification is needed
 */
function checkClarificationNeeded(
    input: string,
    modificationType: ModificationType,
    targetMovieIds: number[],
    recommendations: MediaRecommendation[]
): string | undefined {
    const lowerInput = input.toLowerCase();

    // If removing specific movies but none found
    if (modificationType === 'remove' && targetMovieIds.length === 0 && recommendations.length > 0) {
        return 'Which movie(s) would you like me to remove? You can say "the first one" or mention a movie title.';
    }

    // If similar but no reference
    if ((modificationType === 'similar' || modificationType === 'more_like') && targetMovieIds.length === 0) {
        return 'Which movie would you like me to find similar ones to?';
    }

    // If ambiguous
    if (modificationType === 'change' && targetMovieIds.length === 0) {
        return 'What would you like to change about the recommendations?';
    }

    // If request is too vague
    if (input.split(/\s+/).length < 3 && modificationType === 'change') {
        return 'Could you be more specific about what you want?';
    }

    return undefined;
}

/**
 * Calculate confidence in the parsed modification
 */
function calculateConfidence(input: string, modificationType: ModificationType): number {
    let confidence = 0.5;

    // More words = more confident
    const wordCount = input.split(/\s+/).length;
    if (wordCount > 10) confidence += 0.2;
    else if (wordCount > 5) confidence += 0.1;

    // Clear modification keywords increase confidence
    const clearKeywords = [
        /remove|add|change|similar|different/i,
        /more|less|expand|narrow/i,
    ];

    if (clearKeywords.some(r => r.test(input))) {
        confidence += 0.2;
    }

    // Specific movie mentions increase confidence
    if (/\d+(st|nd|rd|th)/i.test(input) || /first|second|third/i.test(input)) {
        confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
}

// ============================================================================
// Constraint Building Functions
// ============================================================================

/**
 * Build recommendation constraints from parsed modification
 */
export function buildConstraints(
    modification: ParsedModification,
    currentRecommendations: MediaRecommendation[]
): RecommendationConstraints {
    const constraints: RecommendationConstraints = {
        includedGenres: [...modification.targetGenres],
        excludedGenres: [...modification.excludedGenres],
        includedMovieIds: [],
        excludedMovieIds: [...modification.excludedMovieIds],
        timePeriod: modification.targetTimePeriod.type !== 'any' ? modification.targetTimePeriod : undefined,
        emotions: [...modification.targetEmotions],
        intensity: undefined,
        mediaType: undefined,
        minRating: undefined,
        limit: modification.addCount > 0 ? modification.addCount : undefined,
        offset: undefined,
    };

    // Handle similar to movies
    if (
        modification.type === 'similar' ||
        modification.type === 'more_like' ||
        modification.type === 'expand'
    ) {
        constraints.includedMovieIds = [...modification.targetMovieIds];
    }

    // Handle different from movies
    if (modification.type === 'different' || modification.type === 'less_like' || modification.type === 'remove') {
        constraints.excludedMovieIds = [
            ...constraints.excludedMovieIds,
            ...modification.targetMovieIds,
            ...currentRecommendations.map(r => r.id),
        ];
    }

    // Add currently rejected movies to exclusions
    if (currentConversation) {
        constraints.excludedMovieIds = [
            ...constraints.excludedMovieIds,
            ...currentConversation.rejectedMovies,
        ];
    }

    // Remove duplicates
    constraints.excludedMovieIds = [...new Set(constraints.excludedMovieIds)];
    constraints.includedGenres = [...new Set(constraints.includedGenres)];
    constraints.excludedGenres = [...new Set(constraints.excludedGenres)];

    return constraints;
}

/**
 * Merge modification constraints with original query
 */
export function mergeWithOriginalQuery(
    originalQuery: string,
    constraints: RecommendationConstraints
): string {
    let mergedQuery = originalQuery;

    // Add genre preferences
    if (constraints.includedGenres.length > 0) {
        mergedQuery += ` ${constraints.includedGenres.join(' ')}`;
    }

    // Add exclusion keywords
    if (constraints.excludedGenres.length > 0) {
        mergedQuery += ` no ${constraints.excludedGenres.join(' ')}`;
    }

    // Add time period
    if (constraints.timePeriod) {
        switch (constraints.timePeriod.type) {
            case 'recent':
                mergedQuery += ' recent';
                break;
            case 'classic':
                mergedQuery += ' classic';
                break;
            case 'decade':
                if (constraints.timePeriod.value) {
                    mergedQuery += ` ${constraints.timePeriod.value}`;
                }
                break;
            case 'year':
                if (constraints.timePeriod.value) {
                    mergedQuery += ` ${constraints.timePeriod.value}`;
                }
                break;
            case 'range':
                if (constraints.timePeriod.startYear && constraints.timePeriod.endYear) {
                    mergedQuery += ` ${constraints.timePeriod.startYear}-${constraints.timePeriod.endYear}`;
                }
                break;
        }
    }

    // Add emotion keywords
    if (constraints.emotions.length > 0) {
        mergedQuery += ` ${constraints.emotions.join(' ')}`;
    }

    return mergedQuery.trim();
}

// ============================================================================
// Recommendation Modification Functions
// ============================================================================

/**
 * Apply modification to recommendations
 */
export async function applyModification(
    modification: ParsedModification,
    originalQuery: string,
    mediaType: MediaType,
    region: string,
    hiddenGems: boolean
): Promise<{
    success: boolean;
    recommendations: MediaRecommendation[];
    error?: string;
}> {
    try {
        // Get current recommendations
        const currentRecs = currentConversation?.currentRecommendations || [];

        // Build constraints
        const constraints = buildConstraints(modification, currentRecs);

        // Merge with original query
        const mergedQuery = mergeWithOriginalQuery(originalQuery, constraints);

        // Get new recommendations
        const options: RecommendationOptions = {
            mediaType,
            hiddenGems,
            region,
            page: 1,
        };

        const result = await getRecommendations(mergedQuery, options);

        // Update conversation state
        if (currentConversation) {
            // Track removed movies
            if (modification.type === 'remove' || modification.type === 'different') {
                for (const id of modification.targetMovieIds) {
                    rejectMovie(id);
                }
            }

            // Track accepted movies
            if (modification.type === 'similar' || modification.type === 'more_like') {
                for (const id of modification.targetMovieIds) {
                    acceptMovie(id);
                }
            }

            // Update recommendations
            currentConversation.currentRecommendations = result.recommendations;
            currentConversation.lastUpdated = Date.now();
        }

        return {
            success: true,
            recommendations: result.recommendations,
        };
    } catch (error) {
        return {
            success: false,
            recommendations: [],
            error: error instanceof Error ? error.message : 'Failed to apply modification',
        };
    }
}

// ============================================================================
// Response Generation Functions
// ============================================================================

/**
 * Generate a user-friendly response
 */
export function generateResponse(
    modification: ParsedModification,
    newResults: MediaRecommendation[]
): string {
    // Handle contradictory requests
    if (modification.isContradictory && modification.contradictionDetails) {
        return `I noticed a contradiction in your request: ${modification.contradictionDetails}. Could you clarify what you prefer?`;
    }

    // Handle clarification needed
    if (modification.clarificationNeeded) {
        return modification.clarificationNeeded;
    }

    // Handle empty results
    if (newResults.length === 0) {
        return getEmptyResultsMessage(modification.type);
    }

    // Generate appropriate response based on modification type
    switch (modification.type) {
        case 'remove':
            return generateRemoveResponse(modification, newResults.length);
        case 'add':
            return generateAddResponse(newResults);
        case 'change':
            return generateChangeResponse(modification, newResults);
        case 'expand':
            return generateExpandResponse(modification, newResults);
        case 'narrow':
            return generateNarrowResponse(modification, newResults);
        case 'similar':
        case 'more_like':
            return generateSimilarResponse(modification, newResults);
        case 'different':
        case 'less_like':
            return generateDifferentResponse(modification, newResults);
        default:
            return generateChangeResponse(modification, newResults);
    }
}

/**
 * Explain what changed between old and new recommendations
 */
export function explainChanges(
    removed: MediaRecommendation[],
    added: MediaRecommendation[]
): string {
    const parts: string[] = [];

    if (removed.length > 0) {
        const titles = removed.map(r => r.title).join(', ');
        parts.push(`Removed: ${titles}`);
    }

    if (added.length > 0) {
        const titles = added.map(r => r.title).join(', ');
        parts.push(`Added: ${titles}`);
    }

    if (parts.length === 0) {
        return 'The recommendations have been updated.';
    }

    return parts.join('. ');
}

/**
 * Generate quick action suggestions
 */
export function generateSuggestions(): QuickAction[] {
    const suggestions: QuickAction[] = [
        {
            id: 'more-action',
            label: 'More Action',
            icon: '💥',
            prompt: 'add more action movies',
            modificationType: 'add',
        },
        {
            id: 'different-genre',
            label: 'Try Different Genre',
            icon: '🔄',
            prompt: 'show me something different',
            modificationType: 'change',
        },
        {
            id: 'similar-to-favorite',
            label: 'Like My Favorite',
            icon: '❤️',
            prompt: 'more like the first one',
            modificationType: 'similar',
        },
        {
            id: 'recent-releases',
            label: 'Latest Movies',
            icon: '🆕',
            prompt: 'show me recent releases',
            modificationType: 'change',
        },
        {
            id: 'less-violence',
            label: 'Less Intense',
            icon: '😌',
            prompt: 'less violent content',
            modificationType: 'narrow',
        },
        {
            id: 'expand-options',
            label: 'More Options',
            icon: '📚',
            prompt: 'show me more options',
            modificationType: 'expand',
        },
    ];

    return suggestions;
}

// ============================================================================
// Private Helper Functions
// ============================================================================

function getWelcomeMessage(recommendationCount: number): string {
    if (recommendationCount === 0) {
        return "Welcome! I'm here to help you find the perfect movie. Try describing what you're in the mood for!";
    }

    return `I've found ${recommendationCount} movie recommendations for you. You can:
• Ask me to show more or different movies
• Tell me what to add or remove
• Ask for similar movies to any you like
• Change the genre or mood
• Just chat with me about what you want!`;
}

function getEmptyResultsMessage(modificationType: ModificationType): string {
    const messages: Record<ModificationType, string> = {
        remove: "I couldn't find any more movies to remove with that criteria.",
        add: "I couldn't find any more movies to add. Try broadening your search.",
        change: "I couldn't find movies matching that criteria. Try something different!",
        expand: "I couldn't expand the results further.",
        narrow: "I couldn't find movies with those specific criteria. Try being less specific.",
        similar: "I couldn't find similar movies to that one.",
        different: "I couldn't find different movies with that criteria.",
        more_like: "I couldn't find more movies like that.",
        less_like: "I couldn't filter out those movies.",
        clarify: "Could you clarify what you'd like?",
    };

    return messages[modificationType] || "I couldn't find any matching movies. Try a different request!";
}

function generateRemoveResponse(modification: ParsedModification, remainingCount: number): string {
    const count = modification.targetMovieIds.length;
    if (count === 0) {
        return "I've updated the list. Let me know if there's anything else you want to remove!";
    }
    return `Removed ${count} movie${count > 1 ? 's' : ''} from your recommendations. Showing ${remainingCount} remaining.`;
}

function generateAddResponse(newResults: MediaRecommendation[]): string {
    const count = newResults.length;
    if (count === 0) {
        return "I couldn't find any more movies to add. Try a different search!";
    }
    return `Found ${count} more movie${count > 1 ? 's' : ''} for you! Here are the new recommendations.`;
}

function generateChangeResponse(modification: ParsedModification, newResults: MediaRecommendation[]): string {
    const genreText = modification.targetGenres.length > 0
        ? ` with ${modification.targetGenres.join(', ')}`
        : '';
    const emotionText = modification.targetEmotions.length > 0
        ? ` focusing on ${modification.targetEmotions.join(', ')}`
        : '';

    return `Here are some ${genreText}${emotionText} movie recommendations instead!`;
}

function generateExpandResponse(modification: ParsedModification, newResults: MediaRecommendation[]): string {
    return `Expanded your results with ${newResults.length} more options! Here are additional movies you might enjoy.`;
}

function generateNarrowResponse(modification: ParsedModification, newResults: MediaRecommendation[]): string {
    return `Narrowed down to ${newResults.length} movie${newResults.length > 1 ? 's' : ''} matching your specific criteria.`;
}

function generateSimilarResponse(modification: ParsedModification, newResults: MediaRecommendation[]): string {
    if (modification.targetMovieIds.length > 0 && currentConversation) {
        const movie = currentConversation.currentRecommendations.find(
            r => r.id === modification.targetMovieIds[0]
        );
        if (movie) {
            return `Here are movies similar to "${movie.title}" that you might enjoy!`;
        }
    }
    return `Found ${newResults.length} similar movie${newResults.length > 1 ? 's' : ''} for you!`;
}

function generateDifferentResponse(modification: ParsedModification, newResults: MediaRecommendation[]): string {
    return `Here are some different movie options for you!`;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if conversation is active
 */
export function isConversationActive(): boolean {
    return currentConversation !== null && currentConversation.isActive;
}

/**
 * Get conversation session ID
 */
export function getSessionId(): string | null {
    return currentConversation?.sessionId || null;
}

/**
 * Get current recommendations from conversation
 */
export function getCurrentRecommendations(): MediaRecommendation[] {
    return currentConversation?.currentRecommendations || [];
}

/**
 * Get accepted movie IDs
 */
export function getAcceptedMovies(): number[] {
    return currentConversation?.acceptedMovies || [];
}

/**
 * Get rejected movie IDs
 */
export function getRejectedMovies(): number[] {
    return currentConversation?.rejectedMovies || [];
}

/**
 * Get original query
 */
export function getOriginalQuery(): string {
    return currentConversation?.originalQuery || '';
}

// ============================================================================
// Supabase Persistence Functions
// ============================================================================

/**
 * Save current conversation to Supabase (for persistence)
 * Call this when user accepts/rejects movies or ends a conversation session
 */
export async function persistConversation(): Promise<void> {
    if (!currentConversation) return;

    try {
        const user = await getCurrentUser();
        if (!user) {
            console.log('No user logged in, skipping conversation persistence');
            return;
        }

        // Save conversation summary
        await saveConversationSummary(user.id, currentConversation);
        console.log('Conversation persisted successfully');
    } catch (error) {
        console.warn('Failed to persist conversation:', error);
    }
}

/**
 * Save a user message to conversation history
 */
export async function persistUserMessage(content: string, mediaType?: string): Promise<void> {
    if (!currentConversation) return;

    try {
        const user = await getCurrentUser();
        if (!user) return;

        await saveUserQuery(user.id, content, mediaType);
    } catch (error) {
        console.warn('Failed to persist user message:', error);
    }
}

/**
 * Save an AI response to conversation history
 */
export async function persistAIResponse(
    content: string,
    mediaType?: string,
    recommendations?: MediaRecommendation[]
): Promise<void> {
    if (!currentConversation) return;

    try {
        const user = await getCurrentUser();
        if (!user) return;

        await saveAIResponse(user.id, content, mediaType, recommendations);
    } catch (error) {
        console.warn('Failed to persist AI response:', error);
    }
}

/**
 * Get learned user preferences from past conversations
 * Use this to personalize AI recommendations
 */
export async function getUserPreferencesFromHistory(): Promise<string> {
    try {
        const user = await getCurrentUser();
        if (!user) return '';

        const preferences = await getLearnedPreferences(user.id);
        return buildContextString(preferences);
    } catch (error) {
        console.warn('Failed to get user preferences:', error);
        return '';
    }
}

/**
 * Start a new conversation session (clears previous session ID)
 */
export function startNewSession(): void {
    clearSessionId();
}
