import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import * as recommendationEngine from '../utils/recommendationEngine';

vi.mock('../utils/recommendationEngine');

describe('App component', () => {
    it('should render media type buttons', () => {
        render(<App />);
        expect(screen.getByRole('button', { name: /movie/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /tv series/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /anime/i })).toBeInTheDocument();
    });

    it('should switch media types on click', () => {
        render(<App />);
        const tvButton = screen.getByRole('button', { name: /TV Series/i });
        fireEvent.click(tvButton);

        expect(tvButton).toHaveClass('bg-purple-600');
    });

    it('should toggle hidden gems mode', () => {
        render(<App />);
        const hiddenGemsButton = screen.getByRole('button', { name: /Hidden Gems Mode/i });

        // Initial state check
        expect(hiddenGemsButton).not.toHaveClass('bg-amber-500/20');

        fireEvent.click(hiddenGemsButton);
        expect(hiddenGemsButton).toHaveClass('bg-amber-500/20');

        fireEvent.click(hiddenGemsButton);
        expect(hiddenGemsButton).not.toHaveClass('bg-amber-500/20');
    });

    it('should call getRecommendations on form submit', async () => {
        const mockGetRecommendations = vi.mocked(recommendationEngine.getRecommendations);
        mockGetRecommendations.mockResolvedValueOnce([]);

        render(<App />);
        const input = screen.getByPlaceholderText(/Describe your perfect/);
        const submitButton = screen.getByText('Find');

        fireEvent.change(input, { target: { value: 'scary horror movie' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockGetRecommendations).toHaveBeenCalledWith(
                'scary horror movie',
                expect.objectContaining({ mediaType: 'movie' })
            );
        });
    });

    it('should show loading state during search', async () => {
        vi.mocked(recommendationEngine.getRecommendations).mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
        );

        render(<App />);
        const input = screen.getByPlaceholderText(/Describe your perfect/);
        const submitButton = screen.getByText('Find');

        fireEvent.change(input, { target: { value: 'action thriller movie' } });
        fireEvent.click(submitButton);

        expect(screen.getByText('Finding...')).toBeInTheDocument();
        expect(screen.getByText('Searching for perfect matches...')).toBeInTheDocument();
    });

    it('should validate minimum word count', () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

        render(<App />);
        const input = screen.getByPlaceholderText(/Describe your perfect/);
        const submitButton = screen.getByText('Find');

        fireEvent.change(input, { target: { value: 'hi' } });
        fireEvent.click(submitButton);

        expect(alertSpy).toHaveBeenCalledWith(
            expect.stringContaining('at least 3 words')
        );
    });
});
