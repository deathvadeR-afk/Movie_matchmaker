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

export interface MovieRecommendation {
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
  matchPercentage: number;
  reviews: Review[];
  trailerKey?: string;
}