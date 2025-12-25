export type MediaType = 'movie' | 'tv' | 'anime';

export interface Movie {
  id: number;
  title: string;
  year: number;
  plot: string;
  genres: string[];
  rating: number;
  streamingPlatforms: string[];
  streamingLogos: string[];
  posterUrl: string;
  backdropUrl: string;
  intensity: number;
  emotions: string[];
  themes: string[];
}

export interface Review {
  author: string;
  content: string;
  created_at: string;
  rating?: number;
}

export interface StreamingProvider {
  name: string;
  logo: string;
  type: 'flatrate' | 'rent' | 'buy' | 'free';
}

export interface MediaRecommendation {
  id: number;
  title: string;
  year: number;
  plot: string;
  genres: string[];
  rating: number;
  streamingPlatforms: string[];
  streamingLogos: string[];
  streamingProviders: StreamingProvider[];
  posterUrl: string;
  backdropUrl: string;
  intensity: number;
  emotions: string[];
  themes: string[];
  matchPercentage: number;
  reviews: Review[];
  trailerKey?: string;
  mediaType: MediaType;
  aiExplanation?: string;
  // TV-specific fields
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
}

// Keep backward compatibility
export type MovieRecommendation = MediaRecommendation;

export interface MoodChip {
  id: string;
  label: string;
  prompt: string;
  icon: string;
}

export const MOOD_CHIPS: MoodChip[] = [
  { id: 'laugh', label: 'Need a Laugh', prompt: 'funny comedy that will make me laugh out loud', icon: '😂' },
  { id: 'cry', label: 'Good Cry', prompt: 'emotional drama that will make me cry happy or sad tears', icon: '😢' },
  { id: 'thrill', label: 'Adrenaline Rush', prompt: 'intense action thriller with exciting sequences', icon: '⚡' },
  { id: 'think', label: 'Mind Bender', prompt: 'thought-provoking movie with plot twists and deep themes', icon: '🧠' },
  { id: 'cozy', label: 'Cozy Night', prompt: 'feel-good heartwarming movie perfect for relaxing', icon: '🛋️' },
  { id: 'scare', label: 'Scare Me', prompt: 'scary horror movie that will terrify me', icon: '👻' },
  { id: 'romance', label: 'Date Night', prompt: 'romantic movie perfect for couples', icon: '❤️' },
  { id: 'epic', label: 'Epic Adventure', prompt: 'grand epic adventure with amazing visuals and world-building', icon: '🏔️' },
];

export interface RegionConfig {
  code: string;
  name: string;
  language: string;
}

export const SUPPORTED_REGIONS: RegionConfig[] = [
  { code: 'IN', name: 'India', language: 'hi' },
  { code: 'US', name: 'United States', language: 'en' },
  { code: 'GB', name: 'United Kingdom', language: 'en' },
  { code: 'JP', name: 'Japan', language: 'ja' },
  { code: 'KR', name: 'South Korea', language: 'ko' },
];

export const INDIAN_LANGUAGES = [
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'te', name: 'Telugu' },
  { code: 'ta', name: 'Tamil' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'kn', name: 'Kannada' },
  { code: 'pa', name: 'Punjabi' },
];