import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRecommendations } from '../recommendationEngine';
import * as gemini from '../gemini';
import * as tmdb from '../tmdb';
import { mockGeminiRecommendations } from '../../test/mocks/gemini';
import { mockTMDBMovie } from '../../test/mocks/tmdb';

vi.mock('../gemini');
vi.mock('../tmdb');

describe('Hybrid recommendation engine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock implementation to avoid undefined errors
        vi.mocked(tmdb.searchMedia).mockResolvedValue([]);
    });

    it('should use AI recommendations when available', async () => {
        vi.mocked(gemini.getAIRecommendations).mockResolvedValueOnce({
            recommendations: mockGeminiRecommendations,
            success: true,
        });

        vi.mocked(tmdb.searchByTitle).mockResolvedValue(mockTMDBMovie);
        vi.mocked(tmdb.getWatchProviders).mockResolvedValue([]);
        vi.mocked(tmdb.getMediaReviews).mockResolvedValue([]);
        vi.mocked(tmdb.getMediaVideos).mockResolvedValue([]);

        const results = await getRecommendations('sci-fi thriller', {
            mediaType: 'movie',
            hiddenGems: false,
            region: 'IN',
        });

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].aiExplanation).toBeDefined();
    });

    it('should fallback to heuristics when AI fails', async () => {
        vi.mocked(gemini.getAIRecommendations).mockResolvedValueOnce({
            recommendations: [],
            success: false,
            error: 'API rate limit',
        });

        vi.mocked(tmdb.searchMedia).mockResolvedValue([mockTMDBMovie]);
        vi.mocked(tmdb.getWatchProviders).mockResolvedValue([]);
        vi.mocked(tmdb.getMediaReviews).mockResolvedValue([]);
        vi.mocked(tmdb.getMediaVideos).mockResolvedValue([]);

        const results = await getRecommendations('action movie', {
            mediaType: 'movie',
            hiddenGems: false,
            region: 'IN',
        });

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].aiExplanation).toBeUndefined();
    });

    it('should deduplicate results from AI and heuristics', async () => {
        // Test that same movie from both sources only appears once
        vi.mocked(gemini.getAIRecommendations).mockResolvedValueOnce({
            recommendations: [mockGeminiRecommendations[0]],
            success: true,
        });

        vi.mocked(tmdb.searchByTitle).mockResolvedValue(mockTMDBMovie);
        vi.mocked(tmdb.searchMedia).mockResolvedValue([mockTMDBMovie]);
        vi.mocked(tmdb.getWatchProviders).mockResolvedValue([]);
        vi.mocked(tmdb.getMediaReviews).mockResolvedValue([]);
        vi.mocked(tmdb.getMediaVideos).mockResolvedValue([]);

        const results = await getRecommendations('thriller', {
            mediaType: 'movie',
            hiddenGems: false,
            region: 'IN',
        });

        const ids = results.map((r) => r.id);
        const uniqueIds = new Set(ids);
        expect(ids.length).toBe(uniqueIds.size); // No duplicates
    });
});
