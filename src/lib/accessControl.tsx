/**
 * Complete Hybrid API Key & Subscription System
 * Default: Users bring their own key
 * Premium: We provide the API key
 */

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import {
    getApiKeys,
    getActiveApiKey,
    saveApiKey,
    deleteApiKey,
    validateApiKeyFormat,
    testApiKey,
    getDecryptedApiKey
} from '../lib/apiKeyManager';
import {
    getSubscriptionPreference,
    saveSubscriptionPreference,
    checkPremiumStatus
} from '../lib/subscription';
import { supabase, UserApiKey, UserProfile } from '../lib/supabase';

/**
 * User subscription tier type
 */
export type SubscriptionTier = 'free' | 'premium';

/**
 * Complete user access state
 */
export interface UserAccessState {
    isAuthenticated: boolean;
    hasApiKey: boolean;
    isPremium: boolean;
    tier: SubscriptionTier;
    apiKeyProvider: string | null;
    subscriptionPreference: 'api' | 'premium' | null;
    isLoading: boolean;
    needsOnboarding: boolean;
}

/**
 * Access context
 */
interface AccessContextType extends UserAccessState {
    refreshAccess: () => Promise<void>;
    saveUserApiKey: (key: string, name?: string) => Promise<{ success: boolean; error?: string }>;
    removeUserApiKey: () => Promise<void>;
    setSubscriptionPreference: (pref: 'api' | 'premium') => Promise<void>;
    getGeminiKey: () => Promise<string | null>;
}

const AccessContext = createContext<AccessContextType | undefined>(undefined);

/**
 * Access Provider - wrap your app with this
 */
export function AccessProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<UserAccessState>({
        isAuthenticated: false,
        hasApiKey: false,
        isPremium: false,
        tier: 'free',
        apiKeyProvider: null,
        subscriptionPreference: null,
        isLoading: true,
        needsOnboarding: true,
    });

    /**
     * Refresh all access state
     */
    async function refreshAccess() {
        setState(prev => ({ ...prev, isLoading: true }));

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setState({
                    isAuthenticated: false,
                    hasApiKey: false,
                    isPremium: false,
                    tier: 'free',
                    apiKeyProvider: null,
                    subscriptionPreference: null,
                    isLoading: false,
                    needsOnboarding: false,
                });
                return;
            }

            // Get user profile for premium status
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('subscription_status, subscription_tier')
                .eq('id', user.id)
                .single();

            const isPremium = profile?.subscription_status === 'premium';

            // Get subscription preference
            const { data: subPref } = await supabase
                .from('subscription_preferences')
                .select('willing_to_pay')
                .eq('user_id', user.id)
                .single();

            // Get API keys
            const { data: apiKeys } = await supabase
                .from('user_api_keys')
                .select('provider, is_active')
                .eq('user_id', user.id)
                .eq('is_active', true);

            const hasApiKey = (apiKeys?.length || 0) > 0;
            const apiKeyProvider = apiKeys?.[0]?.provider || null;

            setState({
                isAuthenticated: true,
                hasApiKey,
                isPremium,
                tier: isPremium ? 'premium' : 'free',
                apiKeyProvider,
                subscriptionPreference: subPref?.willing_to_pay === true ? 'premium' : (hasApiKey ? 'api' : null),
                isLoading: false,
                needsOnboarding: !subPref && !hasApiKey,
            });
        } catch (error) {
            console.error('Error refreshing access:', error);
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }

    /**
     * Save user's API key
     */
    async function saveUserApiKey(key: string, name?: string): Promise<{ success: boolean; error?: string }> {
        try {
            const validation = validateApiKeyFormat('gemini', key);
            if (!validation.valid) {
                return { success: false, error: validation.message };
            }

            // Test the key first
            const testResult = await testApiKey('gemini', key);
            if (!testResult.success) {
                return { success: false, error: testResult.message };
            }

            // Save to database
            await saveApiKey('gemini', key, name || 'My API Key');

            // Update local state
            await refreshAccess();

            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Failed to save API key' };
        }
    }

    /**
     * Remove user's API key
     */
    async function removeUserApiKey(): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: keys } = await supabase
            .from('user_api_keys')
            .select('id')
            .eq('user_id', user.id)
            .eq('provider', 'gemini');

        if (keys?.[0]) {
            await deleteApiKey(keys[0].id);
        }

        await refreshAccess();
    }

    /**
     * Set subscription preference
     */
    async function setSubscriptionPreference(pref: 'api' | 'premium'): Promise<void> {
        await saveSubscriptionPreference(
            pref === 'premium',
            pref === 'premium' ? 30 : 0,
            []
        );
        await refreshAccess();
    }

    /**
     * Get Gemini API key (either user's or premium)
     */
    async function getGeminiKey(): Promise<string | null> {
        // If premium, we need to provide our own key (future implementation)
        if (state.isPremium) {
            // For now, return null - premium users will need server-side API
            return null;
        }

        // For free users, use their provided key
        return await getDecryptedApiKey('gemini');
    }

    const value: AccessContextType = {
        ...state,
        refreshAccess,
        saveUserApiKey,
        removeUserApiKey,
        setSubscriptionPreference,
        getGeminiKey,
    };

    return (
        <AccessContext.Provider value= { value } >
        { children }
        </AccessContext.Provider>
  );
}

/**
 * Hook to use access context
 */
export function useAccess() {
    const context = useContext(AccessContext);
    if (!context) {
        throw new Error('useAccess must be used within AccessProvider');
    }
    return context;
}

/**
 * Higher-order component for premium-only features
 */
export function PremiumOnly({ children, fallback = null }: {
    children: ReactNode;
    fallback?: ReactNode;
}) {
    const { isPremium, isLoading } = useAccess();

    if (isLoading) {
        return <>{ fallback } </>;
    }

    return isPremium ? <>{ children } < /> : <>{fallback}</ >;
}

/**
 * Hook to check if feature is available
 */
export function useFeatureAccess(feature: 'personalized_recommendations' | 'analytics' | 'priority' | 'ai_content') {
    const { isPremium, hasApiKey, isLoading } = useAccess();

    // While loading, return false
    if (isLoading) {
        return { allowed: false, reason: 'loading' };
    }

    // Premium users get everything
    if (isPremium) {
        return { allowed: true, reason: null };
    }

    // Feature-specific access for free users with API key
    const featureAccess: Record<string, { allowed: boolean; reason: string }> = {
        personalized_recommendations: {
            allowed: false,
            reason: 'Upgrade to Premium for personalized recommendations'
        },
        analytics: {
            allowed: false,
            reason: 'Upgrade to Premium for advanced analytics'
        },
        priority: {
            allowed: false,
            reason: 'Upgrade to Premium for priority processing'
        },
        ai_content: {
            allowed: false,
            reason: 'Upgrade to Premium for AI-generated content'
        },
    };

    return featureAccess[feature] || { allowed: false, reason: 'Unknown feature' };
}

export default AccessProvider;
