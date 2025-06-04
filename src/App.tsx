import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { MovieRecommendation, Review } from './types';
import { getMovieRecommendations } from './utils/movieMatcher';

function App() {
  const [input, setInput] = useState('');
  const [recommendations, setRecommendations] = useState<MovieRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim().split(' ').length < 5) {
      alert('Please provide a more detailed description (at least 5 words)');
      return;
    }
    
    setIsLoading(true);
    try {
      const results = await getMovieRecommendations(input);
      setRecommendations(results);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      alert('Failed to fetch movie recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Movie Matchmaker</h1>
          <p className="text-gray-300">
            Describe your perfect movie experience and let us find your next favorite film
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., 'I want to see a nail-biting thriller with lots of plot twists and intense action'"
              className="w-full pl-12 pr-4 py-4 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none text-white placeholder-gray-400"
              minLength={5}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {isLoading ? 'Finding matches...' : 'Find Movies'}
          </button>
        </form>

        {isLoading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : recommendations.length > 0 ? (
          <div className="space-y-6">
            {recommendations.map((movie) => (
              <div key={movie.id} className="bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex gap-6">
                  <img 
                    src={movie.posterUrl} 
                    alt={`${movie.title} poster`} 
                    className="w-48 h-72 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold mb-2">
                          {movie.title} ({movie.year})
                        </h2>
                        <div className="flex items-center mb-4">
                          <span className="text-yellow-400 text-lg mr-2">★ {movie.rating.toFixed(1)}</span>
                          <div className="h-5 w-[1px] bg-gray-600 mx-3"></div>
                          <span className="text-green-400">{movie.matchPercentage}% Match</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-300 mb-4">{movie.plot}</p>

                    {movie.trailerKey && (
                      <div className="mb-4">
                        <iframe
                          width="100%"
                          height="315"
                          src={`https://www.youtube.com/embed/${movie.trailerKey}`}
                          title={`${movie.title} trailer`}
                          className="rounded-lg"
                          allowFullScreen
                        ></iframe>
                      </div>
                    )}

                    {movie.reviews && movie.reviews.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-xl font-semibold mb-3">Reviews</h3>
                        <div className="space-y-3">
                          {movie.reviews.map((review: Review, index: number) => (
                            <div key={index} className="bg-gray-700 p-4 rounded-lg">
                              <div className="flex items-center mb-2">
                                <span className="font-semibold">{review.author}</span>
                                {review.rating && (
                                  <span className="text-yellow-400 ml-2">★ {review.rating}</span>
                                )}
                              </div>
                              <p className="text-gray-300 text-sm line-clamp-3">{review.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {movie.streamingPlatforms.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">Available on:</h3>
                        <div className="flex gap-2">
                          {movie.streamingLogos.map((logo, index) => (
                            <img
                              key={index}
                              src={logo}
                              alt={movie.streamingPlatforms[index]}
                              className="w-8 h-8 rounded"
                              title={movie.streamingPlatforms[index]}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default App;