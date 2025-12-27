import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { searchByTitle, getWatchProviders } from '../tmdb';
import { mockTMDBMovie, mockWatchProviders } from '../../test/mocks/tmdb';

vi.mock('axios');

describe('TMDB API integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('searchByTitle', () => {
        it('should find movie by title and year', async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                data: { results: [mockTMDBMovie] },
            });

            const result = await searchByTitle('Fight Club', 1999, 'movie');

            expect(result).toBeDefined();
            expect(result?.title).toBe('Fight Club');
            expect(result?.id).toBe(550);
        });

        it('should return null when no results found', async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                data: { results: [] },
            });

            const result = await searchByTitle('Nonexistent Movie', 2025);
            expect(result).toBeNull();
        });

        it('should handle API errors gracefully', async () => {
            vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

            const result = await searchByTitle('Test', 2020);
            expect(result).toBeNull();
        });
    });

    describe('getWatchProviders', () => {
        it('should return Indian streaming providers', async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                data: mockWatchProviders,
            });

            const providers = await getWatchProviders(550, 'movie', 'IN');

            expect(providers).toHaveLength(1);
            expect(providers[0].name).toBe('Netflix');
            expect(providers[0].type).toBe('flatrate');
        });

        it('should fallback to US providers if region unavailable', async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                data: {
                    results: {
                        US: {
                            flatrate: [{ provider_name: 'Hulu', logo_path: '/test.jpg' }],
                        },
                    },
                },
            });

            const providers = await getWatchProviders(550, 'movie', 'XY');
            expect(providers[0].name).toBe('Hulu');
        });
    });
});
