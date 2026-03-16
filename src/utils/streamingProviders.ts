/**
 * Streaming Providers Service
 * 
 * Fetches streaming availability data from TMDB API.
 * Provides information about where movies/TV shows are available to stream, rent, or buy.
 * Results are cached for 24 hours.
 */

import axios from 'axios';
import {
    StreamingProvider,
    ProviderType,
    RegionProviders,
    WatchProvidersResponse,
    MediaType,
    DEFAULT_CACHE_TTL
} from '../types';
import { getCached, setCache, generateCacheKey } from './cacheManager';

// Check for runtime API key - prioritize localStorage
function getTmdbApiKey(): string {
    const localKey = localStorage.getItem('tmdb_api_key');
    if (localKey) return localKey;
    return import.meta.env.VITE_TMDB_API_KEY || '';
}

const TMDB_API_KEY = getTmdbApiKey();
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/original';
const DEFAULT_REGION = 'IN'; // Default to India, fallback to US
const FALLBACK_REGION = 'US';

// TMDB Watch Providers API response types
interface TMDBWatchProviderOption {
    provider_id: number;
    provider_name: string;
    logo_path: string;
    display_priority: number;
}

interface TMDBWatchProviderRegionData {
    link?: string;
    flatrate?: TMDBWatchProviderOption[];
    rent?: TMDBWatchProviderOption[];
    buy?: TMDBWatchProviderOption[];
    free?: TMDBWatchProviderOption[];
    ads?: TMDBWatchProviderOption[];
}

interface TMDBWatchProvidersResponse {
    id: number;
    results: Record<string, TMDBWatchProviderRegionData>;
}

/**
 * Convert TMDB provider option to our StreamingProvider format
 */
function convertProvider(
    tmdbProvider: TMDBWatchProviderOption,
    type: ProviderType
): StreamingProvider {
    return {
        name: tmdbProvider.provider_name,
        logo: tmdbProvider.logo_path
            ? `${TMDB_IMAGE_BASE}${tmdbProvider.logo_path}`
            : '',
        type
    };
}

/**
 * Get the appropriate region based on user preference or defaults
 */
export function getRegion(): string {
    // Try to get from localStorage first (user's saved preference)
    const savedRegion = localStorage.getItem('preferredRegion');
    if (savedRegion) {
        return savedRegion;
    }

    // Default to India, fallback to US
    return DEFAULT_REGION;
}

/**
 * Save user's preferred region
 */
export function setPreferredRegion(region: string): void {
    localStorage.setItem('preferredRegion', region);
}

/**
 * Fetch watch providers for a movie or TV show from TMDB API
 * Results are cached for 24 hours
 * 
 * @param tmdbId - The TMDB ID of the movie or TV show
 * @param mediaType - 'movie' or 'tv'
 * @param region - Optional region code (defaults to user's preferred region)
 * @returns WatchProvidersResponse with providers by type
 */
export async function getWatchProviders(
    tmdbId: number,
    mediaType: MediaType,
    region?: string
): Promise<WatchProvidersResponse | null> {
    const targetRegion = region || getRegion();

    // Generate cache key
    const cacheKey = generateCacheKey('providers', {
        id: tmdbId,
        type: mediaType,
        region: targetRegion
    });

    // Try to get from cache first
    const cached = await getCached<WatchProvidersResponse>(cacheKey);
    if (cached) {
        console.log(`[Streaming] Cache HIT for ${mediaType}/${tmdbId} in ${targetRegion}`);
        return cached;
    }

    // Fetch from TMDB API
    const endpoint = mediaType === 'tv'
        ? `https://api.themoviedb.org/3/tv/${tmdbId}/watch/providers`
        : `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers`;

    try {
        const response = await axios.get<TMDBWatchProvidersResponse>(endpoint, {
            params: {
                api_key: TMDB_API_KEY
            },
            timeout: 10000
        });

        // Get the region data (try preferred region first, then fallback)
        const regionData = response.data.results[targetRegion]
            || response.data.results[FALLBACK_REGION]
            || response.data.results['US']  // Last resort
            || null;

        if (!regionData) {
            console.log(`[Streaming] No providers found for ${mediaType}/${tmdbId}`);
            // Cache the "no providers" result for shorter time (1 hour)
            const noProvidersResult: WatchProvidersResponse = {
                providers: {
                    region: targetRegion,
                    flatrate: [],
                    rent: [],
                    buy: [],
                    free: []
                },
                lastUpdated: Date.now()
            };

            await setCache(cacheKey, noProvidersResult, DEFAULT_CACHE_TTL.details);
            return noProvidersResult;
        }

        // Convert TMDB response to our format
        const providers: RegionProviders = {
            region: targetRegion,
            flatrate: regionData.flatrate?.map(p => convertProvider(p, 'flatrate')) || [],
            rent: regionData.rent?.map(p => convertProvider(p, 'rent')) || [],
            buy: regionData.buy?.map(p => convertProvider(p, 'buy')) || [],
            free: regionData.free?.map(p => convertProvider(p, 'free')) || []
        };

        const result: WatchProvidersResponse = {
            providers,
            lastUpdated: Date.now()
        };

        // Cache for 24 hours
        await setCache(cacheKey, result, DEFAULT_CACHE_TTL.providers);
        console.log(`[Streaming] Cached providers for ${mediaType}/${tmdbId} in ${targetRegion}`);

        return result;
    } catch (error) {
        console.error(`[Streaming] Failed to fetch providers for ${mediaType}/${tmdbId}:`, error);
        return null;
    }
}

/**
 * Get flatrate (streaming) providers only
 */
export async function getStreamingProviders(
    tmdbId: number,
    mediaType: MediaType,
    region?: string
): Promise<StreamingProvider[]> {
    const result = await getWatchProviders(tmdbId, mediaType, region);
    return result?.providers.flatrate || [];
}

/**
 * Get rent providers only
 */
export async function getRentProviders(
    tmdbId: number,
    mediaType: MediaType,
    region?: string
): Promise<StreamingProvider[]> {
    const result = await getWatchProviders(tmdbId, mediaType, region);
    return result?.providers.rent || [];
}

/**
 * Get buy providers only
 */
export async function getBuyProviders(
    tmdbId: number,
    mediaType: MediaType,
    region?: string
): Promise<StreamingProvider[]> {
    const result = await getWatchProviders(tmdbId, mediaType, region);
    return result?.providers.buy || [];
}

/**
 * Get all providers grouped by type
 */
export async function getAllProviders(
    tmdbId: number,
    mediaType: MediaType,
    region?: string
): Promise<RegionProviders | null> {
    const result = await getWatchProviders(tmdbId, mediaType, region);
    return result?.providers || null;
}

/**
 * Check if content is available to stream in the given region
 */
export async function isAvailableToStream(
    tmdbId: number,
    mediaType: MediaType,
    region?: string
): Promise<boolean> {
    const streamingProviders = await getStreamingProviders(tmdbId, mediaType, region);
    return streamingProviders.length > 0;
}

/**
 * Get a summary string describing availability
 */
export async function getAvailabilitySummary(
    tmdbId: number,
    mediaType: MediaType,
    region?: string
): Promise<string> {
    const result = await getWatchProviders(tmdbId, mediaType, region);

    if (!result) {
        return 'Availability unknown';
    }

    const { flatrate, rent, buy, free } = result.providers;
    const parts: string[] = [];

    if (flatrate && flatrate.length > 0) {
        const names = flatrate.slice(0, 3).map(p => p.name).join(', ');
        parts.push(`Stream: ${names}${flatrate.length > 3 ? ' +more' : ''}`);
    }

    if (rent && rent.length > 0) {
        const names = rent.slice(0, 2).map(p => p.name).join(', ');
        parts.push(`Rent: ${names}${rent.length > 2 ? ' +more' : ''}`);
    }

    if (buy && buy.length > 0) {
        const names = buy.slice(0, 2).map(p => p.name).join(', ');
        parts.push(`Buy: ${names}${buy.length > 2 ? ' +more' : ''}`);
    }

    if (parts.length === 0) {
        return 'Not available to stream';
    }

    return parts.join(' | ');
}

/**
 * Get display-friendly provider list for UI
 * Returns top providers with their logo URLs
 */
export async function getDisplayProviders(
    tmdbId: number,
    mediaType: MediaType,
    region?: string,
    maxProviders: number = 4
): Promise<StreamingProvider[]> {
    const result = await getWatchProviders(tmdbId, mediaType, region);

    if (!result) {
        return [];
    }

    // Combine all providers, prioritizing flatrate
    const allProviders: StreamingProvider[] = [
        ...(result.providers.flatrate || []),
        ...(result.providers.rent || []),
        ...(result.providers.buy || []),
        ...(result.providers.free || [])
    ];

    // Remove duplicates by name
    const seen = new Set<string>();
    const uniqueProviders: StreamingProvider[] = [];

    for (const provider of allProviders) {
        if (!seen.has(provider.name)) {
            seen.add(provider.name);
            uniqueProviders.push(provider);
        }
    }

    return uniqueProviders.slice(0, maxProviders);
}
