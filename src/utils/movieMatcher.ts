import { MovieRecommendation } from '../types';
import { getMovieReviews, getMovieVideos, getWatchProviders, getImageUrl, searchMovies } from './tmdb';

interface AnalyzedInput {
  genres: string[];
  emotions: string[];
  themes: string[];
  intensity: number;
}

const genreKeywords = {
  'action': ['action', 'fight', 'explosion', 'adventure', 'exciting'],
  'thriller': ['thriller', 'suspense', 'tension', 'mystery', 'nail-biting'],
  'drama': ['drama', 'emotional', 'life', 'relationship', 'touching'],
  'sci-fi': ['sci-fi', 'science fiction', 'future', 'space', 'technology'],
  'horror': ['horror', 'scary', 'frightening', 'terrifying', 'spooky'],
  'comedy': ['comedy', 'funny', 'hilarious', 'laugh', 'humorous'],
  'romance': ['romance', 'love', 'romantic', 'relationship', 'dating'],
  'fantasy': ['fantasy', 'magical', 'mythical', 'supernatural', 'enchanted'],
  'animation': ['animation', 'animated', 'cartoon', 'pixar', 'disney'],
  'documentary': ['documentary', 'real', 'true story', 'historical', 'educational']
};

const emotionKeywords = {
  'suspense': ['suspense', 'tension', 'nail-biting', 'thrilling', 'edge'],
  'hope': ['hope', 'uplifting', 'inspiring', 'positive', 'optimistic'],
  'fear': ['scary', 'frightening', 'horror', 'terrifying', 'creepy'],
  'joy': ['happy', 'joyful', 'fun', 'upbeat', 'cheerful'],
  'sadness': ['sad', 'emotional', 'touching', 'moving', 'tearjerker'],
  'anger': ['angry', 'revenge', 'vengeance', 'fury', 'rage'],
  'wonder': ['amazing', 'wonderful', 'magical', 'spectacular', 'mindblowing']
};

function findKeywordMatches(text: string, dictionary: Record<string, string[]>): string[] {
  const words = text.toLowerCase().split(/\s+/);
  return Object.entries(dictionary)
    .filter(([_, keywords]) => 
      keywords.some(keyword => 
        words.some(word => word.includes(keyword.toLowerCase()))
      )
    )
    .map(([key]) => key);
}

function analyzeUserInput(input: string): AnalyzedInput {
  const analysis: AnalyzedInput = {
    genres: [],
    emotions: [],
    themes: [],
    intensity: 5
  };

  analysis.genres = findKeywordMatches(input, genreKeywords);
  analysis.emotions = findKeywordMatches(input, emotionKeywords);

  const intensityWords = {
    high: ['intense', 'brutal', 'extreme', 'violent', 'action-packed'],
    low: ['mild', 'gentle', 'calm', 'peaceful', 'slow-paced']
  };

  if (intensityWords.high.some(word => input.toLowerCase().includes(word))) {
    analysis.intensity = 8;
  }
  if (intensityWords.low.some(word => input.toLowerCase().includes(word))) {
    analysis.intensity = 3;
  }

  return analysis;
}

export async function getMovieRecommendations(input: string): Promise<MovieRecommendation[]> {
  const analysis = analyzeUserInput(input);
  
  // Get movies from TMDB
  const movies = await searchMovies(input, analysis.genres);
  
  // Process each movie
  const recommendations = await Promise.all(
    movies.map(async (movie: any) => {
      const [providers, reviews, videos] = await Promise.all([
        getWatchProviders(movie.id),
        getMovieReviews(movie.id),
        getMovieVideos(movie.id)
      ]);
      
      let score = 60;
      score += Math.min(20, (movie.vote_average * 2));
      score += Math.min(20, (movie.popularity / 100));
      
      return {
        id: movie.id,
        title: movie.title,
        year: new Date(movie.release_date).getFullYear(),
        plot: movie.overview,
        genres: [],
        rating: movie.vote_average,
        streamingPlatforms: providers.map(p => p.name),
        streamingLogos: providers.map(p => p.logo),
        posterUrl: getImageUrl(movie.poster_path, 'poster'),
        backdropUrl: getImageUrl(movie.backdrop_path, 'backdrop'),
        reviews: reviews,
        trailerKey: videos[0]?.key,
        intensity: analysis.intensity,
        emotions: analysis.emotions,
        themes: [],
        matchPercentage: Math.round(Math.min(100, score))
      } as MovieRecommendation;
    })
  );
  
  return recommendations
    .filter((movie: MovieRecommendation) => movie.matchPercentage > 30)
    .sort((a: MovieRecommendation, b: MovieRecommendation) => b.matchPercentage - a.matchPercentage)
    .slice(0, 7);
}