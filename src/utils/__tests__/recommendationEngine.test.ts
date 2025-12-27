import { describe, it, expect } from 'vitest';
import { detectLanguage, detectRecency, analyzeUserInput } from '../recommendationEngine';

describe('recommendationEngine utilities', () => {
    describe('detectLanguage', () => {
        it('should detect Hindi from "bollywood"', () => {
            expect(detectLanguage('Show me bollywood movies')).toBe('hi');
        });

        it('should detect Bengali from "bangla"', () => {
            expect(detectLanguage('I want bangla films')).toBe('bn');
        });

        it('should detect Korean', () => {
            expect(detectLanguage('korean drama recommendations')).toBe('ko');
        });

        it('should return undefined for no language match', () => {
            expect(detectLanguage('action thriller')).toBeUndefined();
        });
    });

    describe('detectRecency', () => {
        it('should detect recency keywords', () => {
            expect(detectRecency('latest movies 2024')).toBe(true);
            expect(detectRecency('new releases this year')).toBe(true);
            expect(detectRecency('now playing')).toBe(true);
        });

        it('should return false for no recency keywords', () => {
            expect(detectRecency('classic films')).toBe(false);
        });
    });

    describe('analyzeUserInput', () => {
        it('should extract genres and emotions', () => {
            const result = analyzeUserInput('scary horror movie with suspense');
            expect(result.genres).toContain('horror');
            expect(result.emotions).toContain('fear');
            expect(result.emotions).toContain('suspense');
        });

        it('should detect high intensity', () => {
            const result = analyzeUserInput('intense action-packed thriller');
            expect(result.intensity).toBe(8);
        });

        it('should detect low intensity', () => {
            const result = analyzeUserInput('calm peaceful drama');
            expect(result.intensity).toBe(3);
        });
    });
});
