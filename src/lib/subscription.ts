/**
 * Subscription Service
 * Handles subscription preferences and future payment integration
 */

import { supabase, SubscriptionPreference } from './supabase';
import { User } from '@supabase/supabase-js';

/**
 * Get user's subscription preference
 */
export async function getSubscriptionPreference(): Promise<SubscriptionPreference | null> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
        .from('subscription_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
    }

    return data;
}

/**
 * Save subscription preference
 */
export async function saveSubscriptionPreference(
    willingToPay: boolean,
    preferredPricePoint: number = 30,
    paymentMethodInterest: string[] = []
): Promise<SubscriptionPreference> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
        .from('subscription_preferences')
        .upsert({
            user_id: user.id,
            willing_to_pay: willingToPay,
            preferred_price_point: preferredPricePoint,
            payment_method_interest: paymentMethodInterest,
            notified_at: willingToPay ? new Date().toISOString() : null,
        }, {
            onConflict: 'user_id',
        })
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

/**
 * Get subscription plans
 */
export async function getSubscriptionPlans() {
    const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_inr', { ascending: true });

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

/**
 * Check if user is premium
 */
export async function checkPremiumStatus(): Promise<{
    isPremium: boolean;
    tier: string;
    status: string;
    endDate: string | null;
}> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { isPremium: false, tier: 'free', status: 'none', endDate: null };
    }

    const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('is_premium, subscription_tier, subscription_status, subscription_end_date')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error checking premium status:', error);
        return { isPremium: false, tier: 'free', status: 'none', endDate: null };
    }

    return {
        isPremium: profile?.is_premium || false,
        tier: profile?.subscription_tier || 'free',
        status: profile?.subscription_status || 'none',
        endDate: profile?.subscription_end_date || null,
    };
}

/**
 * Count users willing to pay (for admin/analytics)
 */
export async function countWillingToPayUsers(): Promise<number> {
    const { count, error } = await supabase
        .from('subscription_preferences')
        .select('*', { count: 'exact', head: true })
        .eq('willing_to_pay', true);

    if (error) {
        throw new Error(error.message);
    }

    return count || 0;
}

/**
 * Get subscription stats for admin
 */
export async function getSubscriptionStats(): Promise<{
    totalUsers: number;
    freeUsers: number;
    premiumUsers: number;
    willingToPay: number;
    averagePrice: number;
}> {
    // Get total users
    const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

    // Get premium users
    const { count: premiumUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_premium', true);

    // Get willing to pay
    const willingToPay = await countWillingToPayUsers();

    // Get average price point
    const { data: preferences } = await supabase
        .from('subscription_preferences')
        .select('preferred_price_point')
        .eq('willing_to_pay', true);

    const averagePrice = preferences?.length
        ? preferences.reduce((sum, p) => sum + p.preferred_price_point, 0) / preferences.length
        : 0;

    return {
        totalUsers: totalUsers || 0,
        freeUsers: (totalUsers || 0) - (premiumUsers || 0),
        premiumUsers: premiumUsers || 0,
        willingToPay,
        averagePrice: Math.round(averagePrice),
    };
}

export default {
    getSubscriptionPreference,
    saveSubscriptionPreference,
    getSubscriptionPlans,
    checkPremiumStatus,
    countWillingToPayUsers,
    getSubscriptionStats,
};
