import { describe, it, expect } from 'vitest';
import { getImageUrl } from '../tmdb';

describe('tmdb utilities', () => {
    describe('getImageUrl', () => {
        it('should generate correct poster URL', () => {
            const url = getImageUrl('/abc123.jpg', 'poster');
            expect(url).toBe('https://image.tmdb.org/t/p/w500/abc123.jpg');
        });

        it('should generate correct backdrop URL', () => {
            const url = getImageUrl('/xyz789.jpg', 'backdrop');
            expect(url).toBe('https://image.tmdb.org/t/p/w1280/xyz789.jpg');
        });

        it('should return empty string for null path', () => {
            const url = getImageUrl(null);
            expect(url).toBe('');
        });
    });
});
