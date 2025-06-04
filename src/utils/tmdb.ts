import axios from 'axios';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  popularity: number;
  genre_ids: number[];
}

interface Genre {
  id: number;
  name: string;
}

interface GenreResponse {
  genres: Genre[];
}

interface WatchProviderOption {
  provider_name: string;
  logo_path: string;
}

interface WatchProviderResponse {
  results: {
    US?: {
      flatrate?: WatchProviderOption[];
      rent?: WatchProviderOption[];
      buy?: WatchProviderOption[];
    };
  };
}

interface MovieReview {
  author: string;
  content: string;
  created_at: string;
  rating?: number;
}

interface MovieVideo {
  key: string;
  name: string;
  type: string;
  site: string;
}

// Change Map caches to plain objects
let genreMapCache: Record<string, number> | null = null;
let genreIdToNameCache: Record<number, string> | null = null;

async function getGenreMaps() {
  if (genreMapCache && genreIdToNameCache) {
    return { genreMap: genreMapCache, genreIdToName: genreIdToNameCache };
  }

  const response = await axios.get<GenreResponse>(
    `${BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`
  );

  genreMapCache = response.data.genres.reduce((acc: Record<string, number>, genre: Genre) => {
    acc[genre.name.toLowerCase()] = genre.id;
    return acc;
  }, {});

  genreIdToNameCache = response.data.genres.reduce((acc: Record<number, string>, genre: Genre) => {
    acc[genre.id] = genre.name;
    return acc;
  }, {});

  return { genreMap: genreMapCache, genreIdToName: genreIdToNameCache };
}

export async function searchMovies(query: string, genres: string[]): Promise<TMDBMovie[]> {
  try {
    const { genreMap } = await getGenreMaps();
    if (!genreMap) return [];

    // Convert genre names to IDs
    const genreIds = genres
      .map(genre => genreMap[genre.toLowerCase()])
      .filter(id => id !== undefined);

    // Search movies using both discover and search endpoints
    const [discoverResponse, searchResponse] = await Promise.all([
      axios.get<{ results: TMDBMovie[] }>(
        `${BASE_URL}/discover/movie`,
        {
          params: {
            api_key: TMDB_API_KEY,
            with_genres: genreIds.join(','),
            sort_by: 'popularity.desc',
            'vote_count.gte': 100,
            language: 'en-US',
            page: 1
          }
        }
      ),
      axios.get<{ results: TMDBMovie[] }>(
        `${BASE_URL}/search/movie`,
        {
          params: {
            api_key: TMDB_API_KEY,
            query: query,
            language: 'en-US',
            page: 1,
            include_adult: false
          }
        }
      )
    ]);

    // Combine and deduplicate results using a plain object
    const movieSet = new Set<number>();
    const movies: TMDBMovie[] = [];
    
    [...discoverResponse.data.results, ...searchResponse.data.results].forEach(movie => {
      if (!movieSet.has(movie.id)) {
        movieSet.add(movie.id);
        // Ensure we're only including cloneable properties
        movies.push({
          id: movie.id,
          title: movie.title,
          overview: movie.overview,
          release_date: movie.release_date,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          vote_average: movie.vote_average,
          popularity: movie.popularity,
          genre_ids: [...movie.genre_ids]
        });
      }
    });

    return movies;
  } catch (error) {
    console.error('Error fetching movies:', error);
    return [];
  }
}

export async function getWatchProviders(movieId: number): Promise<{ name: string; logo: string; }[]> {
  try {
    const response = await axios.get<WatchProviderResponse>(
      `${BASE_URL}/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`
    );

    const usProviders = response.data.results.US;
    if (!usProviders) return [];

    const providers: Record<string, { name: string; logo: string }> = {};
    
    ['flatrate', 'rent', 'buy'].forEach(type => {
      const options = usProviders[type as keyof typeof usProviders];
      if (options) {
        options.forEach((provider: WatchProviderOption) => {
          if (!providers[provider.provider_name]) {
            providers[provider.provider_name] = {
              name: provider.provider_name,
              logo: `https://image.tmdb.org/t/p/original${provider.logo_path}`
            };
          }
        });
      }
    });

    return Object.values(providers);
  } catch (error) {
    console.error('Error fetching watch providers:', error);
    return [];
  }
}

export async function getMovieReviews(movieId: number): Promise<MovieReview[]> {
  try {
    const response = await axios.get(`${BASE_URL}/movie/${movieId}/reviews`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US',
        page: 1
      }
    });
    return response.data.results.slice(0, 3); // Return top 3 reviews
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

export async function getMovieVideos(movieId: number): Promise<MovieVideo[]> {
  try {
    const response = await axios.get(`${BASE_URL}/movie/${movieId}/videos`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US'
      }
    });
    // Filter for trailers from YouTube
    return response.data.results.filter(
      (video: MovieVideo) => video.site === 'YouTube' && video.type === 'Trailer'
    ).slice(0, 1); // Get the first trailer
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
}

export function getImageUrl(path: string | null, size: 'poster' | 'backdrop' = 'poster'): string {
  if (!path) return '';
  const baseUrl = 'https://image.tmdb.org/t/p';
  const imageSize = size === 'poster' ? 'w500' : 'w1280';
  return `${baseUrl}/${imageSize}${path}`;
}