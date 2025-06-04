import { Movie } from '../types';

export const movies: Movie[] = [
  {
    id: 1,
    title: "Inception",
    year: 2010,
    plot: "A thief who enters the dreams of others to steal secrets from their subconscious.",
    genres: ["Action", "Sci-Fi", "Thriller"],
    rating: 8.8,
    streamingPlatforms: ["Netflix", "Amazon Prime"],
    intensity: 8,
    emotions: ["suspense", "wonder", "confusion"],
    themes: ["dreams", "reality", "heist"]
  },
  {
    id: 2,
    title: "The Shawshank Redemption",
    year: 1994,
    plot: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
    genres: ["Drama"],
    rating: 9.3,
    streamingPlatforms: ["HBO Max", "Netflix"],
    intensity: 6,
    emotions: ["hope", "friendship", "perseverance"],
    themes: ["prison", "justice", "redemption"]
  },
  {
    id: 3,
    title: "John Wick",
    year: 2014,
    plot: "An ex-hitman comes out of retirement to track down the gangsters that killed his dog and took everything from him.",
    genres: ["Action", "Thriller"],
    rating: 7.4,
    streamingPlatforms: ["Netflix", "Hulu"],
    intensity: 9,
    emotions: ["revenge", "anger", "determination"],
    themes: ["vengeance", "loss", "redemption"]
  },
  // Add more movies as needed
];