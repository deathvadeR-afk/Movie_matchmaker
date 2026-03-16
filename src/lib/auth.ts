/**
 * Authentication Service
 * Handles OAuth and email/password authentication with Supabase
 */

import { supabase, UserProfile } from './supabase';
import { User, Session, AuthError } from '@supabase/supabase-js';

/**
 * Auth state
 */
export interface AuthState {
    user: User | null;
    profile: UserProfile | null;
    session: Session | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
    email: string;
    password: string;
}

/**
 * Signup credentials
 */
export interface SignupCredentials {
    email: string;
    password: string;
    fullName?: string;
}

/**
 * OAuth provider type
 */
export type OAuthProvider = 'google' | 'github';

/**
 * Sign in with email and password
 */
export async function signInWithEmail(credentials: LoginCredentials): Promise<{ user: User | null; session: Session | null; error: AuthError | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
    });

    if (!error && data.user) {
        // Update last login
        await updateLastLogin(data.user.id);
    }

    return { user: data?.user || null, session: data?.session || null, error };
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(credentials: SignupCredentials): Promise<{ user: User | null; session: Session | null; error: AuthError | null }> {
    const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
            data: {
                full_name: credentials.fullName || '',
            },
        },
    });

    return { user: data?.user || null, session: data?.session || null, error };
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(provider: OAuthProvider): Promise<{ url: string | null; error: AuthError | null }> {
    const redirectUrl = `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: redirectUrl,
            scopes: provider === 'google' ? 'email profile' : 'user:email',
        },
    });

    return { url: data?.url || null, error };
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut();
    return { error };
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<{ user: User | null; profile: UserProfile | null }> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { user: null, profile: null };
    }

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    return { user, profile };
}

/**
 * Update user profile
 */
export async function updateProfile(updates: Partial<UserProfile>): Promise<{ success: boolean; error: Error | null }> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: new Error('Not authenticated') };
    }

    const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);

    return { success: !error, error: error ? new Error(error.message) : null };
}

/**
 * Update last login timestamp
 */
async function updateLastLogin(userId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('user_profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) {
            console.error('Failed to update last login timestamp:', error.message);
        }
    } catch (err) {
        console.error('Error updating last login timestamp:', err);
    }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<{ success: boolean; error: AuthError | null }> {
    const redirectUrl = `${window.location.origin}/auth/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
    });

    return { success: !error, error };
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string): Promise<{ success: boolean; error: AuthError | null }> {
    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    return { success: !error, error };
}

/**
 * Get session from URL (for OAuth callback)
 */
export async function getSessionFromUrl(): Promise<{ session: Session | null; error: AuthError | null }> {
    const { data, error } = await supabase.auth.getSession();
    return { session: data?.session || null, error };
}

/**
 * Listen to auth changes
 */
export function onAuthStateChange(
    callback: (event: string, session: Session | null) => void
): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);

    // Return unsubscribe function
    return () => {
        subscription.unsubscribe();
    };
}

/**
 * Check if user is premium
 */
export async function isUserPremium(): Promise<boolean> {
    const { user } = await getCurrentUser();

    if (!user) {
        return false;
    }

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_premium, subscription_status')
        .eq('id', user.id)
        .single();

    return profile?.is_premium === true || profile?.subscription_status === 'premium';
}

/**
 * Refresh session
 */
export async function refreshSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    const { data, error } = await supabase.auth.refreshSession();
    return { session: data?.session || null, error };
}

export default {
    signInWithEmail,
    signUpWithEmail,
    signInWithOAuth,
    signOut,
    getCurrentUser,
    updateProfile,
    resetPassword,
    updatePassword,
    getSessionFromUrl,
    onAuthStateChange,
    isUserPremium,
    refreshSession,
};
