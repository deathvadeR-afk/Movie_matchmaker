import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock environment variables
vi.stubEnv('VITE_TMDB_API_KEY', 'test-tmdb-key');
vi.stubEnv('VITE_GEMINI_API_KEY', 'test-gemini-key');

// Mock fetch globally
global.fetch = vi.fn();

// Mock window.scrollTo since it's not implemented in jsdom
Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });
