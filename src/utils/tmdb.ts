import axios from 'axios';
import { MediaType, StreamingProvider, Review } from '../types';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

// Animation genre ID for detecting anime
const ANIMATION_GENRE_ID = 16;

export interface TMDBMedia {
  id: number;
  title?: string;       // For movies
  name?: string;        // For TV shows
  overview: string;
  release_date?: string; // For movies
  first_air_date?: string; // For TV shows
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  popularity: number;
  genre_ids: number[];
  media_type?: 'movie' | 'tv';
  original_language?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
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

interface WatchProviderRegionData {
  flatrate?: WatchProviderOption[];
  rent?: WatchProviderOption[];
  buy?: WatchProviderOption[];
  free?: WatchProviderOption[];
}

interface WatchProviderResponse {
  results: Record<string, WatchProviderRegionData>;
}

interface MediaVideo {
  key: string;
  name: string;
  type: string;
  site: string;
}

// Genre caches for movie and TV
let movieGenreMap: Record<string, number> | null = null;
let tvGenreMap: Record<string, number> | null = null;
let genreIdToNameCache: Record<number, string> | null = null;

async function getGenreMaps(mediaType: 'movie' | 'tv' = 'movie') {
  const endpoint = mediaType === 'tv' ? 'genre/tv/list' : 'genre/movie/list';

  if (mediaType === 'movie' && movieGenreMap) {
    return { genreMap: movieGenreMap, genreIdToName: genreIdToNameCache };
  }
  if (mediaType === 'tv' && tvGenreMap) {
    return { genreMap: tvGenreMap, genreIdToName: genreIdToNameCache };
  }

  const response = await axios.get<GenreResponse>(
    `${BASE_URL}/${endpoint}?api_key=${TMDB_API_KEY}`
  );

  const genreMap = response.data.genres.reduce((acc: Record<string, number>, genre: Genre) => {
    acc[genre.name.toLowerCase()] = genre.id;
    return acc;
  }, {});

  const idToName = response.data.genres.reduce((acc: Record<number, string>, genre: Genre) => {
    acc[genre.id] = genre.name;
    return acc;
  }, {});

  if (mediaType === 'movie') {
    movieGenreMap = genreMap;
  } else {
    tvGenreMap = genreMap;
  }
  genreIdToNameCache = { ...genreIdToNameCache, ...idToName };

  return { genreMap, genreIdToName: genreIdToNameCache };
}

export interface SearchOptions {
  mediaType: MediaType;
  genres?: string[];
  language?: string;     // e.g., 'hi' for Hindi, 'bn' for Bengali
  region?: string;       // e.g., 'IN' for India
  hiddenGems?: boolean;  // Prioritize high rating, low popularity
  year?: number;
}

/**
 * Search for movies, TV shows, or anime based on query and options
 */
export async function searchMedia(
  query: string,
  options: SearchOptions
): Promise<TMDBMedia[]> {
  const { mediaType, genres = [], language, region, hiddenGems, year } = options;

  // For anime, we search TV with Animation genre
  const tmdbMediaType = mediaType === 'anime' ? 'tv' : mediaType;

  try {
    const { genreMap } = await getGenreMaps(tmdbMediaType);
    if (!genreMap) return [];

    // Convert genre names to IDs
    let genreIds = genres
      .map(genre => genreMap[genre.toLowerCase()])
      .filter(id => id !== undefined);

    // For anime, always include Animation genre
    if (mediaType === 'anime' && !genreIds.includes(ANIMATION_GENRE_ID)) {
      genreIds.push(ANIMATION_GENRE_ID);
    }

    const sortBy = hiddenGems ? 'vote_average.desc' : 'popularity.desc';
    const voteCountMin = hiddenGems ? 50 : 100;

    // Build discover params
    const discoverParams: Record<string, string | number | boolean> = {
      api_key: TMDB_API_KEY,
      sort_by: sortBy,
      'vote_count.gte': voteCountMin,
      page: 1,
      include_adult: false,
    };

    if (genreIds.length > 0) {
      discoverParams.with_genres = genreIds.join(',');
    }

    if (language) {
      discoverParams.with_original_language = language;
    }

    if (region) {
      discoverParams.region = region;
    }

    if (year) {
      if (tmdbMediaType === 'movie') {
        discoverParams.primary_release_year = year;
      } else {
        discoverParams.first_air_date_year = year;
      }
    }

    // For anime, filter to Japanese animation
    if (mediaType === 'anime') {
      discoverParams.with_original_language = 'ja';
    }

    const discoverEndpoint = tmdbMediaType === 'tv' ? 'discover/tv' : 'discover/movie';
    const searchEndpoint = tmdbMediaType === 'tv' ? 'search/tv' : 'search/movie';

    const [discoverResponse, searchResponse] = await Promise.all([
      axios.get<{ results: TMDBMedia[] }>(`${BASE_URL}/${discoverEndpoint}`, {
        params: discoverParams,
      }),
      axios.get<{ results: TMDBMedia[] }>(`${BASE_URL}/${searchEndpoint}`, {
        params: {
          api_key: TMDB_API_KEY,
          query: query,
          language: 'en-US',
          page: 1,
          include_adult: false,
        },
      }),
    ]);

    // Combine and deduplicate
    const mediaSet = new Set<number>();
    const results: TMDBMedia[] = [];

    const allResults = [...discoverResponse.data.results, ...searchResponse.data.results];

    for (const item of allResults) {
      if (mediaSet.has(item.id)) continue;

      // For anime, filter to only Animation genre
      if (mediaType === 'anime' && !item.genre_ids.includes(ANIMATION_GENRE_ID)) {
        continue;
      }

      mediaSet.add(item.id);
      results.push({
        id: item.id,
        title: item.title,
        name: item.name,
        overview: item.overview,
        release_date: item.release_date,
        first_air_date: item.first_air_date,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        vote_average: item.vote_average,
        popularity: item.popularity,
        genre_ids: [...item.genre_ids],
        media_type: tmdbMediaType,
        original_language: item.original_language,
      });
    }

    return results;
  } catch (error) {
    console.error('Error fetching media:', error);
    return [];
  }
}

/**
 * Search for a specific title by name (for AI recommendations)
 */
export async function searchByTitle(
  title: string,
  year?: number,
  mediaType: MediaType = 'movie'
): Promise<TMDBMedia | null> {
  const tmdbMediaType = mediaType === 'anime' ? 'tv' : mediaType;
  const searchEndpoint = tmdbMediaType === 'tv' ? 'search/tv' : 'search/movie';

  try {
    const response = await axios.get<{ results: TMDBMedia[] }>(
      `${BASE_URL}/${searchEndpoint}`,
      {
        params: {
          api_key: TMDB_API_KEY,
          query: title,
          year: year,
          language: 'en-US',
          page: 1,
        },
      }
    );

    if (response.data.results.length === 0) return null;

    const result = response.data.results[0];
    return {
      ...result,
      media_type: tmdbMediaType,
    };
  } catch (error) {
    console.error('Error searching by title:', error);
    return null;
  }
}

/**
 * Get TV show details (seasons/episodes)
 */
export async function getTVDetails(tvId: number): Promise<{ seasons: number; episodes: number } | null> {
  try {
    const response = await axios.get(`${BASE_URL}/tv/${tvId}`, {
      params: { api_key: TMDB_API_KEY },
    });
    return {
      seasons: response.data.number_of_seasons || 0,
      episodes: response.data.number_of_episodes || 0,
    };
  } catch (error) {
    console.error('Error fetching TV details:', error);
    return null;
  }
}

/**
 * Get watch providers with region support
 */
export async function getWatchProviders(
  mediaId: number,
  mediaType: 'movie' | 'tv' = 'movie',
  region: string = 'IN'
): Promise<StreamingProvider[]> {
  try {
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    const response = await axios.get<WatchProviderResponse>(
      `${BASE_URL}/${endpoint}/${mediaId}/watch/providers?api_key=${TMDB_API_KEY}`
    );

    const regionData = response.data.results[region] || response.data.results['US'];
    if (!regionData) return [];

    const providers: StreamingProvider[] = [];
    const seen = new Set<string>();

    const processProviders = (
      options: WatchProviderOption[] | undefined,
      type: StreamingProvider['type']
    ) => {
      if (!options) return;
      for (const provider of options) {
        if (seen.has(provider.provider_name)) continue;
        seen.add(provider.provider_name);
        providers.push({
          name: provider.provider_name,
          logo: `https://image.tmdb.org/t/p/original${provider.logo_path}`,
          type,
        });
      }
    };

    // Priority: free > flatrate > rent > buy
    processProviders(regionData.free, 'free');
    processProviders(regionData.flatrate, 'flatrate');
    processProviders(regionData.rent, 'rent');
    processProviders(regionData.buy, 'buy');

    return providers;
  } catch (error) {
    console.error('Error fetching watch providers:', error);
    return [];
  }
}

/**
 * Get reviews for a movie or TV show
 */
export async function getMediaReviews(
  mediaId: number,
  mediaType: 'movie' | 'tv' = 'movie'
): Promise<Review[]> {
  try {
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    const response = await axios.get(`${BASE_URL}/${endpoint}/${mediaId}/reviews`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US',
        page: 1,
      },
    });
    return response.data.results.slice(0, 3);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

/**
 * Get videos (trailers) for a movie or TV show
 */
export async function getMediaVideos(
  mediaId: number,
  mediaType: 'movie' | 'tv' = 'movie'
): Promise<MediaVideo[]> {
  try {
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    const response = await axios.get(`${BASE_URL}/${endpoint}/${mediaId}/videos`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US',
      },
    });
    return response.data.results
      .filter((video: MediaVideo) => video.site === 'YouTube' && video.type === 'Trailer')
      .slice(0, 1);
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
}

/**
 * Get image URL helper
 */
export function getImageUrl(path: string | null, size: 'poster' | 'backdrop' = 'poster'): string {
  if (!path) return '';
  const baseUrl = 'https://image.tmdb.org/t/p';
  const imageSize = size === 'poster' ? 'w500' : 'w1280';
  return `${baseUrl}/${imageSize}${path}`;
}

/**
 * Get recently released content for context injection
 */
export async function getRecentReleases(
  mediaType: MediaType = 'movie',
  limit: number = 20
): Promise<string[]> {
  const tmdbMediaType = mediaType === 'anime' ? 'tv' : mediaType;
  const endpoint = tmdbMediaType === 'tv' ? 'tv/on_the_air' : 'movie/now_playing';

  try {
    const response = await axios.get<{ results: TMDBMedia[] }>(
      `${BASE_URL}/${endpoint}`,
      {
        params: {
          api_key: TMDB_API_KEY,
          language: 'en-US',
          page: 1,
        },
      }
    );

    return response.data.results.slice(0, limit).map((item) => {
      const title = item.title || item.name || 'Unknown';
      const year = (item.release_date || item.first_air_date || '').slice(0, 4);
      return `${title} (${year})`;
    });
  } catch (error) {
    console.error('Error fetching recent releases:', error);
    return [];
  }
}

// Legacy exports for backward compatibility
export const searchMovies = async (query: string, genres: string[]) => {
  return searchMedia(query, { mediaType: 'movie', genres });
};

export const getMovieReviews = async (movieId: number) => {
  return getMediaReviews(movieId, 'movie');
};

export const getMovieVideos = async (movieId: number) => {
  return getMediaVideos(movieId, 'movie');
};