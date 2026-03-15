/**
 * Supabase Client Configuration
 * Connects to your Supabase project for authentication and database
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Get Supabase credentials from environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate credentials
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️  Supabase credentials not configured. Authentication will not work.');
}

/**
 * Supabase client instance
 * Use this for all Supabase operations
 */
export const supabase: SupabaseClient = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storage: localStorage,
            storageKey: 'movie-recommendation-auth',
        },
        global: {
            headers: {
                'x-client-info': 'movie-recommendation-app',
            },
        },
    }
);

/**
 * Types for our database tables
 */
export interface Database {
    public: {
        Tables: {
            user_profiles: {
                Row: {
                    id: string;
                    email: string;
                    full_name: string | null;
                    avatar_url: string | null;
                    created_at: string;
                    updated_at: string;
                    last_login_at: string | null;
                    is_premium: boolean;
                    subscription_status: string;
                    subscription_tier: string;
                    subscription_start_date: string | null;
                    subscription_end_date: string | null;
                    payment_customer_id: string | null;
                    metadata: Record<string, unknown>;
                };
                Insert: {
                    id: string;
                    email: string;
                    full_name?: string | null;
                    avatar_url?: string | null;
                };
                Update: {
                    full_name?: string | null;
                    avatar_url?: string | null;
                    is_premium?: boolean;
                    subscription_status?: string;
                    subscription_tier?: string;
                };
            };
            user_api_keys: {
                Row: {
                    id: string;
                    user_id: string;
                    provider: string;
                    encrypted_key: string;
                    key_hash: string;
                    key_name: string | null;
                    is_active: boolean;
                    usage_count: number;
                    monthly_limit: number | null;
                    created_at: string;
                    last_used_at: string | null;
                    expires_at: string | null;
                };
                Insert: {
                    user_id: string;
                    provider: string;
                    encrypted_key: string;
                    key_hash: string;
                    key_name?: string | null;
                    monthly_limit?: number | null;
                };
                Update: {
                    is_active?: boolean;
                    usage_count?: number;
                    last_used_at?: string;
                };
            };
            user_preferences: {
                Row: {
                    id: string;
                    user_id: string;
                    genre_scores: Record<string, number>;
                    media_type_scores: Record<string, number>;
                    time_period_scores: Record<string, number>;
                    region_scores: Record<string, number>;
                    language_preferences: string[];
                    content_filters: Record<string, unknown>;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    user_id: string;
                };
                Update: {
                    genre_scores?: Record<string, number>;
                    media_type_scores?: Record<string, number>;
                };
            };
            prompt_history: {
                Row: {
                    id: string;
                    user_id: string;
                    prompt_text: string;
                    prompt_type: string;
                    media_type: string | null;
                    response_text: string | null;
                    recommendations_count: number | null;
                    model_used: string | null;
                    response_time_ms: number | null;
                    created_at: string;
                };
                Insert: {
                    user_id: string;
                    prompt_text: string;
                    prompt_type: string;
                    media_type?: string | null;
                    response_text?: string | null;
                    recommendations_count?: number | null;
                    model_used?: string | null;
                    response_time_ms?: number | null;
                };
                Update: {};
            };
            user_interactions: {
                Row: {
                    id: string;
                    user_id: string;
                    interaction_type: string;
                    media_id: number | null;
                    media_title: string | null;
                    media_type: string | null;
                    genre_tags: string[] | null;
                    query_text: string | null;
                    session_id: string | null;
                    page_url: string | null;
                    referrer_url: string | null;
                    metadata: Record<string, unknown>;
                    created_at: string;
                };
                Insert: {
                    user_id: string;
                    interaction_type: string;
                    media_id?: number | null;
                    media_title?: string | null;
                    media_type?: string | null;
                    genre_tags?: string[] | null;
                    query_text?: string | null;
                    session_id?: string | null;
                    page_url?: string | null;
                    referrer_url?: string | null;
                    metadata?: Record<string, unknown>;
                };
                Update: {};
            };
            watchlist: {
                Row: {
                    id: string;
                    user_id: string;
                    media_id: number;
                    media_type: string;
                    media_title: string;
                    poster_url: string | null;
                    backdrop_url: string | null;
                    year: number | null;
                    rating: number | null;
                    genres: string[] | null;
                    added_at: string;
                    notes: string | null;
                    status: string;
                    user_rating: number | null;
                };
                Insert: {
                    user_id: string;
                    media_id: number;
                    media_type: string;
                    media_title: string;
                    poster_url?: string | null;
                    backdrop_url?: string | null;
                    year?: number | null;
                    rating?: number | null;
                    genres?: string[] | null;
                    notes?: string | null;
                    status?: string;
                };
                Update: {
                    status?: string;
                    notes?: string | null;
                    user_rating?: number | null;
                };
            };
            subscription_preferences: {
                Row: {
                    id: string;
                    user_id: string;
                    willing_to_pay: boolean;
                    preferred_price_point: number;
                    payment_method_interest: string[];
                    notified_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    user_id: string;
                    willing_to_pay?: boolean;
                    preferred_price_point?: number;
                    payment_method_interest?: string[];
                };
                Update: {
                    willing_to_pay?: boolean;
                    preferred_price_point?: number;
                    payment_method_interest?: string[];
                };
            };
            recommendation_cache: {
                Row: {
                    id: string;
                    user_id: string;
                    cache_key: string;
                    recommendations: unknown[];
                    expires_at: string;
                    created_at: string;
                };
                Insert: {
                    user_id: string;
                    cache_key: string;
                    recommendations: unknown[];
                    expires_at: string;
                };
                Update: {
                    recommendations?: unknown[];
                    expires_at?: string;
                };
            };
            feedback_signals: {
                Row: {
                    id: string;
                    user_id: string;
                    signal_type: string;
                    recommendation_id: string | null;
                    media_id: number | null;
                    media_title: string | null;
                    feedback_text: string | null;
                    created_at: string;
                };
                Insert: {
                    user_id: string;
                    signal_type: string;
                    recommendation_id?: string | null;
                    media_id?: number | null;
                    media_title?: string | null;
                    feedback_text?: string | null;
                };
                Update: {};
            };
            conversation_history: {
                Row: {
                    id: string;
                    user_id: string;
                    session_id: string;
                    message_type: string;
                    content: string;
                    media_type: string | null;
                    metadata: Record<string, unknown>;
                    created_at: string;
                };
                Insert: {
                    user_id: string;
                    session_id: string;
                    message_type: string;
                    content: string;
                    media_type?: string | null;
                    metadata?: Record<string, unknown>;
                };
                Update: {};
            };
            conversation_summaries: {
                Row: {
                    id: string;
                    user_id: string;
                    session_id: string;
                    original_query: string;
                    summary_text: string | null;
                    genres_mentioned: string[] | null;
                    media_type: string | null;
                    movie_titles: string[] | null;
                    accepted_movies: unknown[];
                    rejected_movies: unknown[];
                    total_messages: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    user_id: string;
                    session_id: string;
                    original_query: string;
                    summary_text?: string | null;
                    genres_mentioned?: string[] | null;
                    media_type?: string | null;
                    movie_titles?: string[] | null;
                    accepted_movies?: unknown[];
                    rejected_movies?: unknown[];
                    total_messages?: number;
                };
                Update: {
                    summary_text?: string | null;
                    genres_mentioned?: string[] | null;
                    movie_titles?: string[] | null;
                    accepted_movies?: unknown[];
                    rejected_movies?: unknown[];
                    total_messages?: number;
                    updated_at?: string;
                };
            };
            user_memory: {
                Row: {
                    id: string;
                    user_id: string;
                    memory_type: string;
                    entity_name: string;
                    entity_type: string | null;
                    confidence_score: number;
                    occurrence_count: number;
                    context_text: string | null;
                    created_at: string;
                };
                Insert: {
                    user_id: string;
                    memory_type: string;
                    entity_name: string;
                    entity_type?: string | null;
                    context_text?: string | null;
                };
                Update: {
                    confidence_score?: number;
                    occurrence_count?: number;
                    context_text?: string | null;
                    last_mentioned_at?: string;
                };
            };
        };
    };
}

/**
 * Type helper to get user profile
 */
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];
export type UserApiKey = Database['public']['Tables']['user_api_keys']['Row'];
export type PromptHistory = Database['public']['Tables']['prompt_history']['Row'];
export type UserInteraction = Database['public']['Tables']['user_interactions']['Row'];
export type WatchlistItem = Database['public']['Tables']['watchlist']['Row'];
export type SubscriptionPreference = Database['public']['Tables']['subscription_preferences']['Row'];
export type ConversationHistory = Database['public']['Tables']['conversation_history']['Row'];
export type ConversationSummary = Database['public']['Tables']['conversation_summaries']['Row'];
export type UserMemory = Database['public']['Tables']['user_memory']['Row'];

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
    return !!(supabaseUrl && supabaseAnonKey);
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
    await supabase.auth.signOut();
}

export default supabase;
