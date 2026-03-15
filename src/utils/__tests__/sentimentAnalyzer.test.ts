import { describe, it, expect, vi } from 'vitest';
import {
    analyzeReviewSentiment,
    analyzeMediaSentiment,
    getSentimentDescription,
    filterBySentiment,
    boostBySentiment,
    getRecommendationSentiment
} from '../sentimentAnalyzer';
import { TMDBReview, MediaRecommendation } from '../../types';

describe('sentimentAnalyzer', () => {
    describe('analyzeReviewSentiment', () => {
        it('should return neutral for empty review', () => {
            const result = analyzeReviewSentiment('');
            expect(result.sentiment).toBe('neutral');
            expect(result.score).toBe(0);
            expect(result.confidence).toBe(0);
            expect(result.keywords).toEqual([]);
        });

        it('should detect positive sentiment', () => {
            const result = analyzeReviewSentiment('This movie was amazing and excellent!');
            expect(result.sentiment).toBe('positive');
            expect(result.score).toBeGreaterThan(0);
            expect(result.confidence).toBeGreaterThan(0);
        });

        it('should detect negative sentiment', () => {
            const result = analyzeReviewSentiment('This movie was terrible and boring.');
            expect(result.sentiment).toBe('negative');
            expect(result.score).toBeLessThan(0);
            expect(result.confidence).toBeGreaterThan(0);
        });

        it('should detect negation (not good)', () => {
            const result = analyzeReviewSentiment('This movie was not good at all.');
            expect(result.sentiment).toBe('negative');
            expect(result.keywords).toContain('not');
        });

        it('should detect negation (not bad - positive)', () => {
            const result = analyzeReviewSentiment('The movie was not bad actually.');
            expect(result.sentiment).toBe('positive');
        });

        it('should detect positive emoticons', () => {
            const result = analyzeReviewSentiment('Great movie! :)');
            expect(result.sentiment).toBe('positive');
            expect(result.keywords).toContain(':)');
        });

        it('should detect negative emoticons', () => {
            const result = analyzeReviewSentiment('Terrible movie :(');
            expect(result.sentiment).toBe('negative');
            expect(result.keywords).toContain(':(');
        });

        it('should handle intensifiers', () => {
            const result = analyzeReviewSentiment('This was really amazing!');
            expect(result.sentiment).toBe('positive');
            expect(result.keywords).toContain('really');
        });

        it('should handle exclamation marks', () => {
            const result = analyzeReviewSentiment('Great movie!!!');
            expect(result.sentiment).toBe('positive');
            expect(result.score).toBeGreaterThan(0);
        });

        it('should return neutral for non-string input', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = analyzeReviewSentiment(null as any);
            expect(result.sentiment).toBe('neutral');
        });

        it('should handle long reviews with multiple sentiments', () => {
            const review = `I absolutely loved this movie! The acting was superb and the plot was compelling.
      However, the pacing was a bit slow in the middle. But overall, it was a great experience. 
      I would definitely recommend it to others!`;
            const result = analyzeReviewSentiment(review);
            expect(result.sentiment).toBe('positive');
            expect(result.keywords.length).toBeGreaterThan(0);
        });
    });

    describe('analyzeMediaSentiment', () => {
        it('should return neutral for empty reviews array', () => {
            const result = analyzeMediaSentiment([]);
            expect(result.overallSentiment).toBe('neutral');
            expect(result.reviewCount).toBe(0);
        });

        it('should calculate overall sentiment correctly', () => {
            const reviews: TMDBReview[] = [
                { author: 'User1', content: 'Amazing movie!', created_at: '2024-01-01' },
                { author: 'User2', content: 'Great film!', created_at: '2024-01-02' },
                { author: 'User3', content: 'Terrible and boring.', created_at: '2024-01-03' }
            ];
            const result = analyzeMediaSentiment(reviews);
            expect(result.reviewCount).toBe(3);
            expect(result.positivePercentage).toBeGreaterThan(0);
            expect(result.negativePercentage).toBeGreaterThan(0);
            expect(result.averageScore).toBeGreaterThan(0); // 2 positive, 1 negative
        });

        it('should handle reviews without content', () => {
            const reviews: TMDBReview[] = [
                { author: 'User1', content: '', created_at: '2024-01-01' }
            ];
            const result = analyzeMediaSentiment(reviews);
            expect(result.overallSentiment).toBe('neutral');
            expect(result.neutralPercentage).toBe(100);
        });
    });

    describe('getSentimentDescription', () => {
        it('should return correct descriptions for scores', () => {
            expect(getSentimentDescription(0.9)).toBe('Exceptionally positive');
            expect(getSentimentDescription(0.5)).toBe('Positive');
            expect(getSentimentDescription(0.2)).toBe('Slightly positive');
            expect(getSentimentDescription(0)).toBe('Neutral to slightly positive');
            expect(getSentimentDescription(-0.2)).toBe('Neutral to slightly negative');
            expect(getSentimentDescription(-0.5)).toBe('Negative');
            expect(getSentimentDescription(-0.9)).toBe('Exceptionally negative');
        });

        it('should handle invalid input', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(getSentimentDescription(NaN)).toBe('Unable to analyze sentiment');
        });
    });

    describe('filterBySentiment', () => {
        const mockRecommendations: MediaRecommendation[] = [
            {
                id: 1,
                title: 'Movie 1',
                year: 2024,
                plot: 'Great movie',
                genres: ['Action'],
                rating: 8.5,
                streamingPlatforms: [],
                streamingLogos: [],
                streamingProviders: [],
                posterUrl: '',
                backdropUrl: '',
                intensity: 5,
                emotions: [],
                themes: [],
                matchPercentage: 90,
                reviews: [
                    { author: 'User1', content: 'Amazing!', created_at: '2024-01-01' }
                ] as TMDBReview[],
                mediaType: 'movie'
            },
            {
                id: 2,
                title: 'Movie 2',
                year: 2024,
                plot: 'Bad movie',
                genres: ['Drama'],
                rating: 4.5,
                streamingPlatforms: [],
                streamingLogos: [],
                streamingProviders: [],
                posterUrl: '',
                backdropUrl: '',
                intensity: 3,
                emotions: [],
                themes: [],
                matchPercentage: 70,
                reviews: [
                    { author: 'User1', content: 'Terrible!', created_at: '2024-01-01' }
                ] as TMDBReview[],
                mediaType: 'movie'
            }
        ];

        it('should filter recommendations by minimum score', () => {
            const result = filterBySentiment(mockRecommendations, 0.3);
            expect(result.length).toBe(1);
            expect(result[0].title).toBe('Movie 1');
        });

        it('should return empty array for invalid input', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(filterBySentiment(null as any, 0)).toEqual([]);
        });

        it('should include all when minScore is very low', () => {
            const result = filterBySentiment(mockRecommendations, -1);
            expect(result.length).toBe(2);
        });

        it('should include all when minScore is invalid', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = filterBySentiment(mockRecommendations, NaN);
            expect(result.length).toBe(2);
        });
    });

    describe('boostBySentiment', () => {
        const mockRecommendations: MediaRecommendation[] = [
            {
                id: 1,
                title: 'Movie 1',
                year: 2024,
                plot: 'Great movie',
                genres: ['Action'],
                rating: 8.5,
                streamingPlatforms: [],
                streamingLogos: [],
                streamingProviders: [],
                posterUrl: '',
                backdropUrl: '',
                intensity: 5,
                emotions: [],
                themes: [],
                matchPercentage: 80,
                reviews: [
                    { author: 'User1', content: 'Amazing!', created_at: '2024-01-01' }
                ] as TMDBReview[],
                mediaType: 'movie'
            },
            {
                id: 2,
                title: 'Movie 2',
                year: 2024,
                plot: 'Bad movie',
                genres: ['Drama'],
                rating: 4.5,
                streamingPlatforms: [],
                streamingLogos: [],
                streamingProviders: [],
                posterUrl: '',
                backdropUrl: '',
                intensity: 3,
                emotions: [],
                themes: [],
                matchPercentage: 80,
                reviews: [
                    { author: 'User1', content: 'Terrible!', created_at: '2024-01-01' }
                ] as TMDBReview[],
                mediaType: 'movie'
            }
        ];

        it('should boost positive sentiment recommendations', () => {
            const result = boostBySentiment(mockRecommendations);
            const positiveMovie = result.find(r => r.title === 'Movie 1');
            expect(positiveMovie?.matchPercentage).toBeGreaterThan(80);
        });

        it('should reduce negative sentiment recommendations', () => {
            const result = boostBySentiment(mockRecommendations);
            const negativeMovie = result.find(r => r.title === 'Movie 2');
            expect(negativeMovie?.matchPercentage).toBeLessThan(80);
        });

        it('should add sentiment data to recommendations', () => {
            const result = boostBySentiment(mockRecommendations);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((result[0] as any).sentiment).toBeDefined();
        });

        it('should handle empty array', () => {
            const result = boostBySentiment([]);
            expect(result).toEqual([]);
        });

        it('should handle invalid input', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = boostBySentiment(null as any);
            expect(result).toEqual([]);
        });
    });

    describe('getRecommendationSentiment', () => {
        it('should return sentiment summary for recommendation', () => {
            const recommendation: MediaRecommendation = {
                id: 1,
                title: 'Test Movie',
                year: 2024,
                plot: 'Test plot',
                genres: ['Action'],
                rating: 8.0,
                streamingPlatforms: [],
                streamingLogos: [],
                streamingProviders: [],
                posterUrl: '',
                backdropUrl: '',
                intensity: 5,
                emotions: [],
                themes: [],
                matchPercentage: 90,
                reviews: [
                    { author: 'User1', content: 'Great movie!', created_at: '2024-01-01' }
                ] as TMDBReview[],
                mediaType: 'movie'
            };

            const result = getRecommendationSentiment(recommendation);
            expect(result.overallSentiment).toBe('positive');
            expect(result.reviewCount).toBe(1);
        });

        it('should handle recommendation without reviews', () => {
            const recommendation: MediaRecommendation = {
                id: 1,
                title: 'Test Movie',
                year: 2024,
                plot: 'Test plot',
                genres: ['Action'],
                rating: 8.0,
                streamingPlatforms: [],
                streamingLogos: [],
                streamingProviders: [],
                posterUrl: '',
                backdropUrl: '',
                intensity: 5,
                emotions: [],
                themes: [],
                matchPercentage: 90,
                reviews: [],
                mediaType: 'movie'
            };

            const result = getRecommendationSentiment(recommendation);
            expect(result.overallSentiment).toBe('neutral');
            expect(result.reviewCount).toBe(0);
        });
    });
});
