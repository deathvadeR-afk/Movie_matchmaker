/**
 * API Key Management Service
 * Handles storing, retrieving, and validating user API keys
 */

import { supabase, UserApiKey } from './supabase';
import { User } from '@supabase/supabase-js';

/**
 * Simple hash function for API key validation
 * Note: For production, use a proper cryptographic hash
 */
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

/**
 * Get all API keys for the current user
 */
export async function getApiKeys(): Promise<UserApiKey[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    return data || [];
}

/**
 * Get active API key for a specific provider
 */
export async function getActiveApiKey(provider: string): Promise<UserApiKey | null> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', provider)
        .eq('is_active', true)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(error.message);
    }

    return data;
}

/**
 * Save API key (encrypted)
 */
export async function saveApiKey(
    provider: string,
    apiKey: string,
    keyName?: string,
    monthlyLimit?: number
): Promise<UserApiKey> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Not authenticated');
    }

    // Create hash for validation without decryption
    const keyHash = simpleHash(apiKey);

    // In production, encrypt this with AES-256
    // For now, we'll use base64 encoding (not secure for production!)
    const encryptedKey = btoa(apiKey);

    const { data, error } = await supabase
        .from('user_api_keys')
        .upsert({
            user_id: user.id,
            provider,
            encrypted_key: encryptedKey,
            key_hash: keyHash,
            key_name: keyName || `${provider} key`,
            monthly_limit: monthlyLimit,
            is_active: true,
        }, {
            onConflict: 'user_id,provider',
        })
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

/**
 * Delete API key
 */
export async function deleteApiKey(keyId: string): Promise<void> {
    const { error } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('id', keyId);

    if (error) {
        throw new Error(error.message);
    }
}

/**
 * Deactivate API key (soft delete)
 */
export async function deactivateApiKey(keyId: string): Promise<void> {
    const { error } = await supabase
        .from('user_api_keys')
        .update({ is_active: false })
        .eq('id', keyId);

    if (error) {
        throw new Error(error.message);
    }
}

/**
 * Get decrypted API key
 * Note: In production, decrypt using AES-256
 */
export async function getDecryptedApiKey(provider: string): Promise<string | null> {
    const key = await getActiveApiKey(provider);

    if (!key) {
        return null;
    }

    // In production, decrypt using AES-256
    // For now, we decode from base64
    try {
        return atob(key.encrypted_key);
    } catch {
        return key.encrypted_key;
    }
}

/**
 * Validate API key format
 */
export function validateApiKeyFormat(provider: string, apiKey: string): { valid: boolean; message: string } {
    if (!apiKey || apiKey.trim().length < 10) {
        return { valid: false, message: 'API key is too short' };
    }

    switch (provider) {
        case 'gemini':
            // Gemini keys typically start with "AIza"
            if (!apiKey.startsWith('AIza')) {
                return { valid: false, message: 'Invalid Gemini API key format (should start with AIza)' };
            }
            break;
        case 'openai':
            // OpenAI keys start with "sk-"
            if (!apiKey.startsWith('sk-')) {
                return { valid: false, message: 'Invalid OpenAI API key format (should start with sk-)' };
            }
            break;
        default:
            // No specific format validation for other providers
            break;
    }

    return { valid: true, message: 'Valid' };
}

/**
 * Update API key usage count
 */
export async function incrementUsageCount(keyId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_api_key_usage', {
        key_id: keyId,
    });

    // If RPC function doesn't exist, do it manually
    if (error) {
        const { data } = await supabase
            .from('user_api_keys')
            .select('usage_count')
            .eq('id', keyId)
            .single();

        await supabase
            .from('user_api_keys')
            .update({
                usage_count: (data?.usage_count || 0) + 1,
                last_used_at: new Date().toISOString(),
            })
            .eq('id', keyId);
    }
}

/**
 * Test API key by making a simple request
 */
export async function testApiKey(provider: string, apiKey: string): Promise<{ success: boolean; message: string }> {
    if (provider === 'gemini') {
        try {
            // Import dynamically to avoid issues
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

            // Make a simple request
            const result = await model.generateContent('Say "test successful"');
            const text = result.response.text();

            if (text && text.length > 0) {
                return { success: true, message: 'API key is valid and working!' };
            }

            return { success: false, message: 'API key response was empty' };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, message: `API key validation failed: ${message}` };
        }
    }

    return { success: false, message: `Provider ${provider} validation not implemented yet` };
}

export default {
    getApiKeys,
    getActiveApiKey,
    saveApiKey,
    deleteApiKey,
    deactivateApiKey,
    getDecryptedApiKey,
    validateApiKeyFormat,
    incrementUsageCount,
    testApiKey,
};
