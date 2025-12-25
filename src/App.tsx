import React, { useState } from 'react';
import { Search, Sparkles, Film, Tv, PlayCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { MediaRecommendation, MediaType, MOOD_CHIPS, Review, StreamingProvider } from './types';
import { getRecommendations, RecommendationOptions } from './utils/recommendationEngine';

function App() {
  const [input, setInput] = useState('');
  const [recommendations, setRecommendations] = useState<MediaRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mediaType, setMediaType] = useState<MediaType>('movie');
  const [hiddenGems, setHiddenGems] = useState(false);
  const [region] = useState('IN'); // Default to India
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim().split(' ').length < 3) {
      alert('Please provide a more detailed description (at least 3 words)');
      return;
    }
    await fetchRecommendations(input);
  };

  const handleMoodClick = async (prompt: string) => {
    setInput(prompt);
    await fetchRecommendations(prompt);
  };

  const fetchRecommendations = async (query: string) => {
    setIsLoading(true);
    try {
      const options: RecommendationOptions = { mediaType, hiddenGems, region };
      const results = await getRecommendations(query, options);
      setRecommendations(results);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      alert('Failed to fetch recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getMediaTypeIcon = (type: MediaType) => {
    switch (type) {
      case 'movie': return <Film className="w-4 h-4" />;
      case 'tv': return <Tv className="w-4 h-4" />;
      case 'anime': return <PlayCircle className="w-4 h-4" />;
    }
  };

  const getProviderTypeLabel = (type: StreamingProvider['type']) => {
    switch (type) {
      case 'free': return 'Free';
      case 'flatrate': return 'Stream';
      case 'rent': return 'Rent';
      case 'buy': return 'Buy';
    }
  };

  const toggleCard = (id: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  const getTMDBUrl = (item: MediaRecommendation) => {
    const type = item.mediaType === 'anime' ? 'tv' : item.mediaType;
    return `https://www.themoviedb.org/${type}/${item.id}`;
  };

  const getStreamingUrl = (providerName: string, title: string) => {
    // Common streaming provider search URLs
    const providers: Record<string, string> = {
      'Netflix': `https://www.netflix.com/search?q=${encodeURIComponent(title)}`,
      'Amazon Prime Video': `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(title)}`,
      'Disney Plus': `https://www.disneyplus.com/search?q=${encodeURIComponent(title)}`,
      'Hotstar': `https://www.hotstar.com/in/search?q=${encodeURIComponent(title)}`,
      'Zee5': `https://www.zee5.com/search?q=${encodeURIComponent(title)}`,
      'SonyLIV': `https://www.sonyliv.com/search/${encodeURIComponent(title)}`,
      'JioCinema': `https://www.jiocinema.com/search/${encodeURIComponent(title)}`,
      'Crunchyroll': `https://www.crunchyroll.com/search?q=${encodeURIComponent(title)}`,
    };

    return providers[providerName] || `https://www.google.com/search?q=${encodeURIComponent(providerName + ' ' + title)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent" />

        <div className="max-w-5xl mx-auto px-6 py-12 relative">
          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              Movie Matchmaker
            </h1>
            <p className="text-gray-400 text-lg">
              Describe your vibe. We'll find your next obsession.
            </p>
          </div>

          {/* Media Type Selector */}
          <div className="flex justify-center gap-2 mb-6">
            {(['movie', 'tv', 'anime'] as MediaType[]).map((type) => (
              <button
                key={type}
                onClick={() => setMediaType(type)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all ${mediaType === type
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white'
                  }`}
              >
                {getMediaTypeIcon(type)}
                <span className="capitalize">{type === 'tv' ? 'TV Series' : type}</span>
              </button>
            ))}
          </div>

          {/* Hidden Gems Toggle */}
          <div className="flex justify-center mb-6">
            <button
              onClick={() => setHiddenGems(!hiddenGems)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${hiddenGems
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                : 'bg-gray-800/30 text-gray-500 border border-gray-700/50 hover:border-gray-600'
                }`}
            >
              <Sparkles className={`w-4 h-4 ${hiddenGems ? 'animate-pulse' : ''}`} />
              Hidden Gems Mode
            </button>
          </div>

          {/* Mood Chips */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {MOOD_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => handleMoodClick(chip.prompt)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-800/60 hover:bg-gray-700/80 rounded-full text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 border border-gray-700/50 hover:border-purple-500/50"
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition" />
              <div className="relative flex gap-3 p-2 bg-gray-800/90 rounded-xl border border-gray-700/50">
                <div className="flex-1 flex items-center">
                  <Search className="ml-3 text-gray-500" />
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Describe your perfect ${mediaType === 'tv' ? 'show' : mediaType}...`}
                    className="w-full px-4 py-3 bg-transparent focus:outline-none text-white placeholder-gray-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-purple-500/25"
                >
                  {isLoading ? 'Finding...' : 'Find'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            <p className="mt-4 text-gray-400">Searching for perfect matches...</p>
          </div>
        ) : recommendations.length > 0 ? (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-center text-gray-300">
              Found {recommendations.length} {mediaType === 'tv' ? 'shows' : `${mediaType}s`} for you
            </h2>

            {recommendations.map((item) => (
              <div
                key={item.id}
                className="group relative bg-gray-800/50 backdrop-blur rounded-2xl overflow-hidden border border-gray-700/50 hover:border-purple-500/50 transition-all"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Poster */}
                  <div className="md:w-56 flex-shrink-0">
                    {item.posterUrl ? (
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full h-80 md:h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-80 md:h-full bg-gray-700 flex items-center justify-center">
                        <Film className="w-16 h-16 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-2xl font-bold text-white">
                            {item.title}
                            <span className="text-gray-500 font-normal ml-2">({item.year})</span>
                          </h3>
                          <a
                            href={getTMDBUrl(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="View on TMDB"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-yellow-400">
                            ★ {item.rating.toFixed(1)}
                          </span>
                          <span className="h-4 w-px bg-gray-600" />
                          <span className="text-emerald-400 font-medium">
                            {item.matchPercentage}% Match
                          </span>
                          {item.mediaType !== 'movie' && item.numberOfSeasons && (
                            <>
                              <span className="h-4 w-px bg-gray-600" />
                              <span className="text-gray-400 text-sm">
                                {item.numberOfSeasons} Season{item.numberOfSeasons > 1 ? 's' : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleCard(item.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors text-sm"
                      >
                        {expandedCards.has(item.id) ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            <span>Less</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            <span>More</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* AI Explanation */}
                    {item.aiExplanation && (
                      <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <p className="text-sm text-purple-300">
                          <span className="font-semibold">Why this?</span> {item.aiExplanation}
                        </p>
                      </div>
                    )}

                    {/* Plot */}
                    <p className="text-gray-400 mb-4 line-clamp-3">{item.plot}</p>

                    {/* Streaming Providers */}
                    {item.streamingProviders && item.streamingProviders.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Where to Watch (India)</h4>
                        <div className="flex flex-wrap gap-2">
                          {item.streamingProviders.slice(0, 6).map((provider, index) => (
                            <a
                              key={index}
                              href={getStreamingUrl(provider.name, item.title)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/70 rounded-full transition-colors cursor-pointer group"
                              title={`Watch on ${provider.name}`}
                            >
                              <img
                                src={provider.logo}
                                alt={provider.name}
                                className="w-5 h-5 rounded"
                              />
                              <span className="text-xs text-gray-300 group-hover:text-white">{provider.name}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${provider.type === 'free' ? 'bg-green-500/20 text-green-400' :
                                  provider.type === 'flatrate' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-gray-600/50 text-gray-400'
                                }`}>
                                {getProviderTypeLabel(provider.type)}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expandable Content */}
                    {expandedCards.has(item.id) && (
                      <>
                        {/* Trailer */}
                        {item.trailerKey && (
                          <div className="mb-4">
                            <iframe
                              width="100%"
                              height="250"
                              src={`https://www.youtube.com/embed/${item.trailerKey}`}
                              title={`${item.title} trailer`}
                              className="rounded-lg"
                              allowFullScreen
                            />
                          </div>
                        )}

                        {/* Reviews */}
                        {item.reviews && item.reviews.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-700/50">
                            <h4 className="text-sm font-semibold text-gray-400 mb-3">Reviews</h4>
                            <div className="space-y-3">
                              {item.reviews.slice(0, 2).map((review: Review, index: number) => (
                                <div key={index} className="p-3 bg-gray-700/30 rounded-lg">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm text-white">{review.author}</span>
                                    {review.rating && (
                                      <span className="text-yellow-400 text-xs">★ {review.rating}</span>
                                    )}
                                  </div>
                                  <p className="text-gray-400 text-sm line-clamp-2">{review.content}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
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