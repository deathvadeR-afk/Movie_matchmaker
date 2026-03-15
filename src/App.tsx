import React, { useState } from 'react';
import { Search, Sparkles, Film, Tv, PlayCircle, ChevronDown, ChevronUp, ExternalLink, Mic, Loader2, LogOut, User, Settings } from 'lucide-react';
import { MediaRecommendation, MediaType, MOOD_CHIPS, Review, StreamingProvider } from './types';
import { getRecommendations, RecommendationOptions } from './utils/recommendationEngine';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Badge } from './components/ui/Badge';
import { useAuth } from './contexts/AuthContext';

function App() {
  const [input, setInput] = useState('');
  const [recommendations, setRecommendations] = useState<MediaRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mediaType, setMediaType] = useState<MediaType>('movie');
  const [hiddenGems, setHiddenGems] = useState(false);
  const [region] = useState('IN'); // Default to India
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { user, signOut, profile } = useAuth();

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
      setRecommendations(results.recommendations);
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
    <div className="min-h-screen bg-cinema-950 text-cream-100 font-body">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(212,168,83,0.05)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,41,66,0.05)_0%,transparent_50%)]" />
      </div>

      {/* Header */}
      <header className="relative z-20 py-4 border-b border-cinema-800/50">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-cream-100">CineMatch</h1>
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-cinema-800/50 hover:bg-cinema-700/50 rounded-lg transition-colors"
            >
              <User className="w-5 h-5 text-gold-500" />
              <span className="text-sm text-cream-200">
                {profile?.full_name || user?.email?.split('@')[0] || 'User'}
              </span>
            </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-cinema-800 border border-cinema-700 rounded-lg shadow-elevated overflow-hidden">
                <div className="px-4 py-3 border-b border-cinema-700">
                  <p className="text-sm text-cream-200 truncate">{user?.email}</p>
                  {profile?.is_premium && (
                    <Badge variant="premium" className="mt-1">Premium</Badge>
                  )}
                </div>
                <button
                  onClick={() => signOut()}
                  className="w-full px-4 py-3 text-left text-sm text-cream-300 hover:bg-cinema-700/50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 py-16 relative">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-display font-bold mb-4 text-cream-100 animate-fade-in">
              CineMatch
            </h1>
            <p className="text-xl text-cream-300 font-body animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Describe your vibe. We'll find your next obsession.
            </p>
          </div>

          {/* Media Type Selector */}
          <div className="flex justify-center gap-3 mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {(['movie', 'tv', 'anime'] as MediaType[]).map((type) => (
              <button
                key={type}
                onClick={() => setMediaType(type)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${mediaType === type
                  ? 'bg-gold-600 text-cinema-950 shadow-glow scale-105'
                  : 'bg-cinema-800 text-cream-300 hover:bg-cinema-700 hover:text-cream-100 border border-transparent hover:border-gold-600/30'
                  }`}
              >
                {getMediaTypeIcon(type)}
                <span className="capitalize">{type === 'tv' ? 'TV Series' : type}</span>
              </button>
            ))}
          </div>

          {/* Hidden Gems Toggle */}
          <div className="flex justify-center mb-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={() => setHiddenGems(!hiddenGems)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${hiddenGems
                ? 'bg-gold-600/20 text-gold-500 border border-gold-600/50 shadow-glow'
                : 'bg-cinema-800/50 text-cream-400 border border-cinema-700/50 hover:border-gold-600/30 hover:text-gold-500'
                }`}
            >
              <Sparkles className={`w-4 h-4 ${hiddenGems ? 'animate-pulse text-gold-500' : ''}`} />
              Hidden Gems Mode
            </button>
          </div>

          {/* Mood Chips */}
          <div className="flex flex-wrap justify-center gap-3 mb-10 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            {MOOD_CHIPS.map((chip, index) => (
              <button
                key={chip.id}
                onClick={() => handleMoodClick(chip.prompt)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-cinema-800/60 hover:bg-cinema-700/80 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-glow disabled:opacity-50 disabled:hover:scale-100 border border-cinema-700/50 hover:border-gold-600/30 group"
                style={{ animationDelay: `${0.5 + index * 0.05}s` }}
              >
                <span className="text-base group-hover:scale-110 transition-transform">{chip.icon}</span>
                <span className="text-cream-200 group-hover:text-gold-500 transition-colors">{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.6s' }}>
            <div className="relative group">
              {/* Glow effect on focus */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-gold-600/50 to-gold-400/50 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />

              <div className="relative flex gap-3 p-2 bg-cinema-900/90 rounded-xl border border-cinema-700/50 group-focus-within:border-gold-600/50 transition-colors">
                <div className="flex-1 flex items-center bg-cinema-800/50 rounded-lg">
                  <Search className="ml-4 text-gold-600/60" />
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Describe your perfect ${mediaType === 'tv' ? 'show' : mediaType}...`}
                    className="w-full px-4 py-4 bg-transparent focus:outline-none text-cream-100 placeholder-cream-400 font-body"
                  />
                  <button
                    type="button"
                    className="mr-2 p-2 text-cream-400 hover:text-gold-500 transition-colors"
                    title="Voice Search"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  leftIcon={isLoading ? undefined : <Search className="w-5 h-5" />}
                >
                  {isLoading ? 'Finding...' : 'Find'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-gold-600/20 border-t-gold-600 rounded-full animate-spin" />
              <div className="absolute inset-0 w-20 h-20 border-4 border-gold-400/10 rounded-full animate-ping" />
            </div>
            <p className="mt-6 text-cream-300 text-lg">Searching for perfect matches...</p>
          </div>
        ) : recommendations.length > 0 ? (
          <div className="space-y-6">
            <h2 className="text-3xl font-display font-semibold text-center text-cream-100 animate-slide-up">
              Found {recommendations.length} {mediaType === 'tv' ? 'shows' : `${mediaType}s`} for you
            </h2>

            {recommendations.map((item, index) => (
              <div
                key={item.id}
                className="group relative bg-cinema-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-cinema-700/50 hover:border-gold-600/50 hover:shadow-glow transition-all duration-500 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Poster */}
                  <div className="md:w-56 flex-shrink-0 relative overflow-hidden">
                    {item.posterUrl ? (
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full h-80 md:h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-80 md:h-full bg-cinema-700 flex items-center justify-center">
                        <Film className="w-16 h-16 text-cinema-500" />
                      </div>
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-cinema-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-2xl font-display font-semibold text-cream-100">
                            {item.title}
                            <span className="text-cream-400 font-normal ml-2 text-lg">({item.year})</span>
                          </h3>
                          <a
                            href={getTMDBUrl(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gold-600 hover:text-gold-500 transition-colors"
                            title="View on TMDB"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        </div>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="flex items-center gap-1 text-gold-500 font-medium">
                            ★ {item.rating.toFixed(1)}
                          </span>
                          <span className="h-4 w-px bg-cinema-600" />
                          <Badge variant={item.matchPercentage >= 70 ? 'success' : item.matchPercentage >= 50 ? 'warning' : 'default'}>
                            {item.matchPercentage}% Match
                          </Badge>
                          {item.mediaType !== 'movie' && item.numberOfSeasons && (
                            <>
                              <span className="h-4 w-px bg-cinema-600" />
                              <span className="text-cream-400 text-sm">
                                {item.numberOfSeasons} Season{item.numberOfSeasons > 1 ? 's' : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleCard(item.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-cinema-700/50 hover:bg-cinema-600/50 rounded-lg transition-all duration-300 text-cream-200 hover:text-gold-500"
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
                      <div className="mb-4 p-4 bg-gold-600/10 border border-gold-600/30 rounded-lg">
                        <p className="text-sm text-gold-400">
                          <span className="font-semibold">Why this?</span> {item.aiExplanation}
                        </p>
                      </div>
                    )}

                    {/* Plot */}
                    <p className="text-cream-300 mb-5 line-clamp-3 leading-relaxed">{item.plot}</p>

                    {/* Streaming Providers */}
                    {item.streamingProviders && item.streamingProviders.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-cream-400 mb-3">Where to Watch</h4>
                        <div className="flex flex-wrap gap-2">
                          {item.streamingProviders.slice(0, 6).map((provider, idx) => (
                            <a
                              key={idx}
                              href={getStreamingUrl(provider.name, item.title)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 bg-cinema-700/50 hover:bg-cinema-600/70 rounded-lg transition-all duration-300 cursor-pointer group border border-transparent hover:border-gold-600/30"
                              title={`Watch on ${provider.name}`}
                            >
                              {provider.logo ? (
                                <img src={provider.logo} alt={provider.name} className="w-5 h-5 rounded object-contain bg-white/10" />
                              ) : (
                                <PlayCircle className="w-5 h-5 text-gold-500" />
                              )}
                              <span className="text-sm text-cream-200 group-hover:text-gold-400 transition-colors">{provider.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${provider.type === 'free' ? 'bg-green-500/20 text-green-400' :
                                provider.type === 'flatrate' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-cinema-600/50 text-cream-400'
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
                      <div className="mt-6 pt-6 border-t border-cinema-700/50">
                        {/* Trailer */}
                        {item.trailerKey && (
                          <div className="mb-6">
                            <iframe
                              width="100"
                              height="280"
                              src={`https://www.youtube.com/embed/${item.trailerKey}`}
                              title={`${item.title} trailer`}
                              className="w-full rounded-lg"
                              allowFullScreen
                            />
                          </div>
                        )}

                        {/* Reviews */}
                        {item.reviews && item.reviews.length > 0 && (
                          <div className="pt-4 border-t border-cinema-700/50">
                            <h4 className="text-sm font-medium text-cream-400 mb-4">Reviews</h4>
                            <div className="space-y-3">
                              {item.reviews.slice(0, 2).map((review: Review, idx: number) => (
                                <div key={idx} className="p-4 bg-cinema-700/30 rounded-lg border border-cinema-700/30">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="font-medium text-sm text-cream-100">{review.author}</span>
                                    {review.rating && (
                                      <span className="text-gold-500 text-xs">★ {review.rating}</span>
                                    )}
                                  </div>
                                  <p className="text-cream-300 text-sm leading-relaxed line-clamp-2">{review.content}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
