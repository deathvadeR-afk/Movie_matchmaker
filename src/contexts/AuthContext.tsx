/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, UserProfile } from '../lib/supabase';
import * as auth from '../lib/auth';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    session: Session | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
    signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error: Error | null }>;
    isPremium: boolean;
    refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPremium, setIsPremium] = useState(false);

    // Initialize auth state
    useEffect(() => {
        initAuth();
    }, []);

    async function initAuth() {
        try {
            const { user: currentUser, profile: currentProfile } = await auth.getCurrentUser();
            setUser(currentUser);
            setProfile(currentProfile);

            // Get session
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            setSession(currentSession);

            // Check premium status
            if (currentProfile) {
                setIsPremium(currentProfile.is_premium || currentProfile.subscription_status === 'premium');
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
        } finally {
            setIsLoading(false);
        }
    }

    // Listen for auth changes
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChange(async (event, session) => {
            setSession(session);
            setUser(session?.user || null);

            if (session?.user) {
                const { profile: userProfile } = await auth.getCurrentUser();
                setProfile(userProfile);
                setIsPremium(userProfile?.is_premium || userProfile?.subscription_status === 'premium');
            } else {
                setProfile(null);
                setIsPremium(false);
            }

            setIsLoading(false);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        const { error } = await auth.signInWithEmail({ email, password });
        return { error: error ? new Error(error.message) : null };
    };

    const signUp = async (email: string, password: string, fullName?: string) => {
        const { error } = await auth.signUpWithEmail({ email, password, fullName });
        return { error: error ? new Error(error.message) : null };
    };

    const signInWithOAuth = async (provider: 'google' | 'github') => {
        const { url, error } = await auth.signInWithOAuth(provider);
        if (url) {
            // Redirect to OAuth provider
            window.location.href = url;
        }
        return { error: error ? new Error(error.message) : null };
    };

    const signOut = async () => {
        await auth.signOut();
        setUser(null);
        setProfile(null);
        setSession(null);
        setIsPremium(false);
    };

    const updateProfile = async (updates: Partial<UserProfile>) => {
        const result = await auth.updateProfile(updates);
        if (result.success) {
            setProfile(prev => prev ? { ...prev, ...updates } : null);
        }
        return result;
    };

    const refreshAuth = async () => {
        await initAuth();
    };

    const value: AuthContextType = {
        user,
        profile,
        session,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signInWithOAuth,
        signOut,
        updateProfile,
        isPremium,
        refreshAuth,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
