import { describe, it, expect } from 'vitest';
import {
    parseNaturalLanguage,
    extractGenres,
    extractMood,
    extractEntities,
    extractTemporal,
    detectIntent,
    expandQuery,
    analyzeUserInputWithNLP,
    getSearchParams,
    isNLPAvailable,
    normalizeGenre,
} from '../nlpProcessor';

describe('NLP Processor', () => {
    describe('isNLPAvailable', () => {
        it('should return true', () => {
            expect(isNLPAvailable()).toBe(true);
        });
    });

    describe('detectIntent', () => {
        it('should detect recommendation intent', () => {
            const result = detectIntent('I want to watch a comedy movie');
            expect(result.type).toBe('recommendation');
            expect(result.confidence).toBeGreaterThan(0);
        });

        it('should detect search intent', () => {
            const result = detectIntent('Find me action movies');
            expect(result.type).toBe('search');
        });

        it('should detect find_similar intent', () => {
            const result = detectIntent('Similar to Inception');
            expect(result.type).toBe('find_similar');
        });

        it('should detect browse intent', () => {
            const result = detectIntent('Show me what movies are available');
            expect(result.type).toBe('browse');
        });
    });

    describe('extractGenres', () => {
        it('should extract action genre', () => {
            const genres = extractGenres('I want to watch an action movie with explosions');
            expect(genres).toContain('action');
        });

        it('should extract comedy genre', () => {
            const genres = extractGenres('Find me a funny movie that makes me laugh');
            expect(genres).toContain('comedy');
        });

        it('should extract horror genre', () => {
            const genres = extractGenres('I want a scary horror movie');
            expect(genres).toContain('horror');
        });

        it('should extract romance genre', () => {
            const genres = extractGenres('A romantic love story movie');
            expect(genres).toContain('romance');
        });

        it('should extract multiple genres', () => {
            const genres = extractGenres('action comedy romance movie');
            expect(genres).toContain('action');
            expect(genres).toContain('comedy');
            expect(genres).toContain('romance');
        });

        it('should extract sci-fi genre', () => {
            const genres = extractGenres('science fiction space movie');
            expect(genres).toContain('sci-fi');
        });

        it('should extract thriller genre', () => {
            const genres = extractGenres('suspenseful thriller movie');
            expect(genres).toContain('thriller');
        });
    });

    describe('extractMood', () => {
        it('should extract happy mood', () => {
            const moods = extractMood('I want to watch something happy and uplifting');
            expect(moods).toContain('happy');
        });

        it('should extract sad mood', () => {
            const moods = extractMood('I want a movie that will make me cry');
            expect(moods).toContain('sad');
        });

        it('should extract scary mood', () => {
            const moods = extractMood('Something terrifying and scary');
            expect(moods).toContain('scary');
        });

        it('should extract thrilling mood', () => {
            const moods = extractMood('An exciting thriller with lots of suspense');
            expect(moods).toContain('thrilling');
        });

        it('should extract romantic mood', () => {
            const moods = extractMood('A romantic date night movie');
            expect(moods).toContain('romantic');
        });

        it('should extract cozy mood', () => {
            const moods = extractMood('A cozy feel-good movie for relaxing');
            expect(moods).toContain('cozy');
        });

        it('should extract thought_provoking mood', () => {
            const moods = extractMood('A thought-provoking mind bending movie');
            expect(moods).toContain('thought_provoking');
        });
    });

    describe('extractTemporal', () => {
        it('should extract recent temporal', () => {
            const temporal = extractTemporal('latest movies from recent years');
            expect(temporal).toContain('recent');
        });

        it('should extract classic temporal', () => {
            const temporal = extractTemporal('classic old movies from the golden age');
            expect(temporal).toContain('classic');
        });

        it('should extract decade', () => {
            const temporal = extractTemporal('90s movies');
            expect(temporal).toContain('90s');
        });

        it('should extract year', () => {
            const temporal = extractTemporal('movies from 2020');
            expect(temporal).toContain('2020');
        });
    });

    describe('extractEntities', () => {
        it('should extract genres from entities', () => {
            const entities = extractEntities('action horror movie');
            expect(entities.genres).toContain('action');
            expect(entities.genres).toContain('horror');
        });

        it('should extract moods from entities', () => {
            const entities = extractEntities('scary movie that makes me feel afraid');
            expect(entities.moods).toContain('scary');
        });

        it('should extract temporal from entities', () => {
            const entities = extractEntities('recent thriller movies');
            expect(entities.timePeriods).toContain('recent');
        });
    });

    describe('expandQuery', () => {
        it('should expand sci-fi synonyms', () => {
            const expanded = expandQuery('science fiction movie');
            expect(expanded).toContain('sci-fi');
        });

        it('should expand comedy synonyms', () => {
            const expanded = expandQuery('funny movie');
            expect(expanded).toContain('comedy');
        });
    });

    describe('parseNaturalLanguage', () => {
        it('should parse a simple recommendation query', () => {
            const result = parseNaturalLanguage('I want to watch a comedy movie');
            expect(result.success).toBe(true);
            expect(result.parsedQuery).not.toBeNull();
            if (result.parsedQuery) {
                expect(result.parsedQuery.intent.type).toBe('recommendation');
                expect(result.parsedQuery.entities.genres).toContain('comedy');
            }
        });

        it('should handle empty query gracefully', () => {
            const result = parseNaturalLanguage('');
            expect(result.success).toBe(false);
            expect(result.fallbackUsed).toBe(true);
        });

        it('should handle complex comparative query', () => {
            const result = parseNaturalLanguage('Like Inception but scarier');
            expect(result.success).toBe(true);
            if (result.parsedQuery) {
                expect(result.parsedQuery.isComparative).toBe(true);
                expect(result.parsedQuery.comparisonRef).toBeDefined();
            }
        });

        it('should handle mood-based queries', () => {
            const result = parseNaturalLanguage('Movies that make me cry');
            expect(result.success).toBe(true);
            if (result.parsedQuery) {
                expect(result.parsedQuery.entities.moods).toContain('sad');
            }
        });

        it('should handle genre combinations', () => {
            const result = parseNaturalLanguage('action comedy romance movie');
            expect(result.success).toBe(true);
            if (result.parsedQuery) {
                expect(result.parsedQuery.entities.genres).toContain('action');
                expect(result.parsedQuery.entities.genres).toContain('comedy');
                expect(result.parsedQuery.entities.genres).toContain('romance');
            }
        });

        it('should handle temporal queries', () => {
            const result = parseNaturalLanguage('recent action movies');
            expect(result.success).toBe(true);
            if (result.parsedQuery) {
                expect(result.parsedQuery.temporal.type).toBe('recent');
            }
        });

        it('should handle decade queries', () => {
            const result = parseNaturalLanguage('90s classic movies');
            expect(result.success).toBe(true);
            if (result.parsedQuery) {
                expect(result.parsedQuery.temporal.type).toBe('decade');
                expect(result.parsedQuery.temporal.value).toBe('90s');
            }
        });

        it('should handle language queries', () => {
            const result = parseNaturalLanguage('Hindi bollywood movie');
            expect(result.success).toBe(true);
        });
    });

    describe('analyzeUserInputWithNLP', () => {
        it('should analyze user input with NLP', () => {
            const result = analyzeUserInputWithNLP('I want a funny scary movie');
            expect(result.useNLP).toBe(true);
            expect(result.genres).toContain('comedy');
            expect(result.emotions).toContain('scary');
        });

        it('should fall back to basic analysis on error', () => {
            const result = analyzeUserInputWithNLP('');
            expect(result).toBeDefined();
        });
    });

    describe('getSearchParams', () => {
        it('should get search params from query', () => {
            const params = getSearchParams('action movie from 2020');
            expect(params.query).toBeDefined();
            expect(params.genres).toContain('action');
            expect(params.year).toBe(2020);
        });

        it('should get decade from query', () => {
            const params = getSearchParams('comedy movies from the 90s');
            expect(params.decade).toBe('90s');
        });

        it('should get language from query', () => {
            const params = getSearchParams('Hindi movie');
            expect(params.language).toBe('hi');
        });
    });

    describe('normalizeGenre', () => {
        it('should normalize sci-fi', () => {
            expect(normalizeGenre('sci-fi')).toBe('sci-fi');
            expect(normalizeGenre('scifi')).toBe('sci-fi');
            expect(normalizeGenre('science fiction')).toBe('sci-fi');
        });

        it('should normalize romance', () => {
            expect(normalizeGenre('romantic')).toBe('romance');
        });

        it('should normalize animation', () => {
            expect(normalizeGenre('animated')).toBe('animation');
        });
    });

    describe('Fallback mechanisms', () => {
        it('should return fallback when query is invalid', () => {
            const result = parseNaturalLanguage('   ');
            expect(result.fallbackUsed).toBe(true);
            expect(result.success).toBe(false);
        });

        it('should return fallback for unknown intent', () => {
            const result = parseNaturalLanguage('asdfghjkl');
            expect(result.parsedQuery).not.toBeNull();
            if (result.parsedQuery) {
                expect(result.parsedQuery.intent.type).toBe('unknown');
            }
        });
    });

    describe('Complex queries', () => {
        it('should handle "I feel like" queries', () => {
            const result = parseNaturalLanguage('I feel like watching a funny movie');
            expect(result.success).toBe(true);
            if (result.parsedQuery) {
                expect(result.parsedQuery.intent.type).toBe('recommendation');
            }
        });

        it('should handle "I want something" queries', () => {
            const result = parseNaturalLanguage('I want something that makes me happy');
            expect(result.success).toBe(true);
        });

        it('should handle "make me feel" queries', () => {
            const result = parseNaturalLanguage('movies that make me feel excited');
            expect(result.success).toBe(true);
        });
    });

    describe('Edge cases', () => {
        it('should handle queries with only stop words', () => {
            const result = parseNaturalLanguage('the a an');
            expect(result.success).toBe(true);
        });

        it('should handle very long queries', () => {
            const longQuery = 'I want to watch a ' + 'really '.repeat(50) + 'good movie';
            const result = parseNaturalLanguage(longQuery);
            expect(result.success).toBe(true);
        });

        it('should handle queries with special characters', () => {
            const result = parseNaturalLanguage('Action movie!!! @#$%');
            expect(result.success).toBe(true);
        });
    });
});
