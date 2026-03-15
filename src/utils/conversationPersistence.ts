/**
 * Conversation Persistence Service
 * Handles saving and retrieving conversation history from Supabase
 * Provides semantic search capabilities for finding similar past conversations
 */

import { supabase } from '../lib/supabase';
import type { ConversationState, MediaRecommendation } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface ConversationMessageRow {
    id: string;
    user_id: string;
    session_id: string;
    message_type: 'user_query' | 'ai_response' | 'system';
    content: string;
    media_type: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
}

export interface ConversationSummaryRow {
    id: string;
    user_id: string;
    session_id: string;
    original_query: string;
    summary_text: string | null;
    genres_mentioned: string[] | null;
    media_type: string | null;
    movie_titles: string[] | null;
    accepted_movies: { title: string }[];
    rejected_movies: { title: string }[];
    total_messages: number;
    created_at: string;
    updated_at: string;
}

export interface UserMemoryRow {
    id: string;
    user_id: string;
    memory_type: string;
    entity_name: string;
    entity_type: string | null;
    confidence_score: number;
    occurrence_count: number;
    context_text: string | null;
    created_at: string;
}

export interface ConversationContext {
    sessionId: string;
    originalQuery: string;
    summaryText: string | null;
    genresMentioned: string[];
    movieTitles: string[];
}

export interface SimilarConversation {
    id: string;
    content: string;
    createdAt: string;
    sessionId: string;
    rank: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a consistent session ID or create a new one
 */
function getOrCreateSessionId(): string {
    const stored = sessionStorage.getItem('conversation_session_id');
    if (stored) return stored;

    const newId = crypto.randomUUID();
    sessionStorage.setItem('conversation_session_id', newId);
    return newId;
}

/**
 * Clear the current session ID (for new conversation)
 */
export function clearSessionId(): void {
    sessionStorage.removeItem('conversation_session_id');
}

// ============================================================================
// Conversation History Operations
// ============================================================================

/**
 * Save a message to conversation history
 */
export async function saveMessage(
    userId: string,
    messageType: 'user_query' | 'ai_response' | 'system',
    content: string,
    mediaType?: string,
    metadata: Record<string, unknown> = {}
): Promise<string | null> {
    const sessionId = getOrCreateSessionId();

    const { data, error } = await supabase
        .from('conversation_history')
        .insert({
            user_id: userId,
            session_id: sessionId,
            message_type: messageType,
            content,
            media_type: mediaType || null,
            metadata
        })
        .select('id')
        .single();

    if (error) {
        console.error('Error saving conversation message:', error);
        return null;
    }

    return data?.id || null;
}

/**
 * Save a user query message
 */
export async function saveUserQuery(
    userId: string,
    query: string,
    mediaType?: string
): Promise<string | null> {
    return saveMessage(userId, 'user_query', query, mediaType);
}

/**
 * Save an AI response message
 */
export async function saveAIResponse(
    userId: string,
    response: string,
    mediaType?: string,
    recommendations?: MediaRecommendation[]
): Promise<string | null> {
    return saveMessage(
        userId,
        'ai_response',
        response,
        mediaType,
        { recommendations: recommendations || [] }
    );
}

/**
 * Get conversation history for a session
 */
export async function getSessionHistory(
    userId: string,
    sessionId: string
): Promise<ConversationMessageRow[]> {
    const { data, error } = await supabase
        .from('conversation_history')
        .select('*')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching session history:', error);
        return [];
    }

    return data || [];
}

/**
 * Get all conversation sessions for a user
 */
export async function getUserSessions(
    userId: string,
    limit: number = 10
): Promise<ConversationSummaryRow[]> {
    const { data, error } = await supabase
        .from('conversation_summaries')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching user sessions:', error);
        return [];
    }

    return data || [];
}

// ============================================================================
// Conversation Summary Operations
// ============================================================================

/**
 * Save or update a conversation summary
 */
export async function saveConversationSummary(
    userId: string,
    conversationState: ConversationState
): Promise<void> {
    const sessionId = getOrCreateSessionId();

    // Extract genres from recommendations
    const genres = new Set<string>();
    const movieTitles: string[] = [];

    conversationState.currentRecommendations.forEach(rec => {
        rec.genres?.forEach(g => genres.add(g));
        movieTitles.push(rec.title);
    });

    // Get accepted/rejected movie IDs
    const acceptedMovieIds = conversationState.acceptedMovies || [];
    const rejectedMovieIds = conversationState.rejectedMovies || [];

    // Map IDs to titles from currentRecommendations
    const acceptedTitles = conversationState.currentRecommendations
        .filter(rec => acceptedMovieIds.includes(rec.id))
        .map(rec => rec.title);
    const rejectedTitles = conversationState.currentRecommendations
        .filter(rec => rejectedMovieIds.includes(rec.id))
        .map(rec => rec.title);

    const { error } = await supabase
        .from('conversation_summaries')
        .upsert({
            user_id: userId,
            session_id: sessionId,
            original_query: conversationState.originalQuery,
            summary_text: generateSummaryText(acceptedTitles, rejectedTitles),
            genres_mentioned: Array.from(genres),
            media_type: 'movie',
            movie_titles: movieTitles,
            accepted_movies: acceptedTitles.map(title => ({ title })),
            rejected_movies: rejectedTitles.map(title => ({ title })),
            total_messages: conversationState.messages.length,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id, session_id'
        });

    if (error) {
        console.error('Error saving conversation summary:', error);
    }
}

/**
 * Generate a text summary from conversation state
 */
function generateSummaryText(acceptedTitles: string[], rejectedTitles: string[]): string {
    const parts: string[] = [];

    if (acceptedTitles.length > 0) {
        parts.push(`Accepted: ${acceptedTitles.join(', ')}`);
    }

    if (rejectedTitles.length > 0) {
        parts.push(`Rejected: ${rejectedTitles.join(', ')}`);
    }

    return parts.join('. ') || 'Empty conversation';
}

// ============================================================================
// Semantic Search (Text-based for free tier)
// ============================================================================

/**
 * Search similar past conversations
 */
export async function searchSimilarConversations(
    userId: string,
    query: string,
    limit: number = 3
): Promise<SimilarConversation[]> {
    // Use Supabase's text search function
    const { data, error } = await supabase
        .rpc('search_past_conversations', {
            p_user_id: userId,
            p_query: query,
            p_limit: limit
        });

    if (error) {
        // Fallback: simple LIKE search if RPC fails
        console.warn('Text search failed, using fallback:', error);
        return searchSimilarConversationsFallback(userId, query, limit);
    }

    return (data || []).map((row: { id: string; content: string; created_at: string; session_id: string; rank: number }) => ({
        id: row.id,
        content: row.content,
        createdAt: row.created_at,
        sessionId: row.session_id,
        rank: row.rank
    }));
}

/**
 * Fallback search using basic LIKE matching
 */
async function searchSimilarConversationsFallback(
    userId: string,
    query: string,
    limit: number
): Promise<SimilarConversation[]> {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    if (keywords.length === 0) return [];

    const { data, error } = await supabase
        .from('conversation_history')
        .select('id, content, created_at, session_id')
        .eq('user_id', userId)
        .eq('message_type', 'user_query')
        .limit(50);

    if (error || !data) return [];

    // Score by keyword matches
    const scored = data
        .map(row => {
            const content = row.content.toLowerCase();
            const matches = keywords.filter(k => content.includes(k)).length;
            return {
                id: row.id,
                content: row.content,
                createdAt: row.created_at,
                sessionId: row.session_id,
                rank: matches / keywords.length
            };
        })
        .filter(r => r.rank > 0)
        .sort((a, b) => b.rank - a.rank)
        .slice(0, limit);

    return scored;
}

// ============================================================================
// User Memory / Learned Preferences
// ============================================================================

/**
 * Get learned user preferences from conversations
 */
export async function getUserMemory(
    userId: string,
    memoryType?: string
): Promise<UserMemoryRow[]> {
    const { data, error } = await supabase
        .from('user_memory')
        .select('*')
        .eq('user_id', userId)
        .order('confidence_score', { ascending: false });

    if (error) {
        console.error('Error fetching user memory:', error);
        return [];
    }

    let filtered = data || [];

    if (memoryType) {
        filtered = filtered.filter(m => m.memory_type === memoryType);
    }

    return filtered;
}

/**
 * Extract and save entities from a conversation to user memory
 */
export async function extractAndSaveMemory(
    userId: string,
    conversationState: ConversationState
): Promise<void> {
    // Extract genres from recommendations
    const genreCounts = new Map<string, number>();

    conversationState.currentRecommendations.forEach(rec => {
        rec.genres?.forEach(genre => {
            genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
        });
    });

    const movieTitles = conversationState.currentRecommendations.map(rec => rec.title);

    // Save genre preferences
    for (const [genre, count] of genreCounts) {
        await updateUserMemory(userId, 'genre_preference', genre, 'genre');
    }

    // Save movie titles as watched history
    for (const title of movieTitles) {
        await updateUserMemory(userId, 'watched_movie', title, 'movie');
    }
}

/**
 * Update or insert user memory
 */
async function updateUserMemory(
    userId: string,
    memoryType: string,
    entityName: string,
    entityType?: string,
    context?: string
): Promise<void> {
    const { error } = await supabase
        .rpc('update_user_memory', {
            p_user_id: userId,
            p_memory_type: memoryType,
            p_entity_name: entityName,
            p_entity_type: entityType,
            p_context: context
        });

    if (error) {
        console.warn('Could not update user memory:', error);
        // Silent fail - memory is nice-to-have, not critical
    }
}

// ============================================================================
// Context Retrieval for AI
// ============================================================================

/**
 * Get conversation context to include in AI prompts
 */
export async function getConversationContextForAI(
    userId: string,
    limit: number = 5
): Promise<ConversationContext[]> {
    const sessions = await getUserSessions(userId, limit);

    return sessions.map(session => ({
        sessionId: session.session_id,
        originalQuery: session.original_query,
        summaryText: session.summary_text,
        genresMentioned: session.genres_mentioned || [],
        movieTitles: session.movie_titles || []
    }));
}

/**
 * Get user preferences learned from past conversations
 */
export async function getLearnedPreferences(
    userId: string
): Promise<{
    genres: { name: string; confidence: number }[];
    actors: { name: string; confidence: number }[];
    directors: { name: string; confidence: number }[];
    watchedMovies: { name: string; confidence: number }[];
}> {
    const memories = await getUserMemory(userId);

    const genres: { name: string; confidence: number }[] = [];
    const actors: { name: string; confidence: number }[] = [];
    const directors: { name: string; confidence: number }[] = [];
    const watchedMovies: { name: string; confidence: number }[] = [];

    memories.forEach(m => {
        const entry = { name: m.entity_name, confidence: m.confidence_score };

        if (m.memory_type === 'genre_preference') {
            genres.push(entry);
        } else if (m.memory_type === 'actor_preference') {
            actors.push(entry);
        } else if (m.memory_type === 'director_preference') {
            directors.push(entry);
        } else if (m.memory_type === 'watched_movie') {
            watchedMovies.push(entry);
        }
    });

    return { genres, actors, directors, watchedMovies };
}

/**
 * Build context string for AI prompt from learned preferences
 */
export function buildContextString(
    preferences: Awaited<ReturnType<typeof getLearnedPreferences>>
): string {
    const parts: string[] = [];

    if (preferences.genres.length > 0) {
        const topGenres = preferences.genres.slice(0, 5).map(g => g.name).join(', ');
        parts.push(`User prefers genres: ${topGenres}`);
    }

    if (preferences.actors.length > 0) {
        const topActors = preferences.actors.slice(0, 3).map(a => a.name).join(', ');
        parts.push(`User likes actors: ${topActors}`);
    }

    if (preferences.directors.length > 0) {
        const topDirectors = preferences.directors.slice(0, 3).map(d => d.name).join(', ');
        parts.push(`User likes directors: ${topDirectors}`);
    }

    if (preferences.watchedMovies.length > 0) {
        const recentWatched = preferences.watchedMovies.slice(0, 5).map(m => m.name).join(', ');
        parts.push(`Recently watched: ${recentWatched}`);
    }

    return parts.length > 0 ? '\n\nUser history:\n' + parts.join('\n') : '';
}
