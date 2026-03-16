import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Film, Tv, PlayCircle, ChevronDown, ChevronUp, ExternalLink, Mic, Loader2, LogOut, User, Settings, MicOff, Globe, Languages, Calendar, Star, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MediaRecommendation, MediaType, MOOD_CHIPS, Review, StreamingProvider, VoiceState } from './types';
import { getRecommendations, RecommendationOptions } from './utils/recommendationEngine';
import { startListening, stopListening, isVoiceSupported, setOnResult, setOnStateChange } from './utils/voiceSearch';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Badge } from './components/ui/Badge';
import { StreamingBadge, StreamingBadgeList, StreamingAvailability, StreamingIndicator } from './components/ui/StreamingBadge';
import { OTTSelector } from './components/ui/OTTSelector';
import { useAuth } from './contexts/AuthContext';

// Region and Language options for TMDB
const REGIONS = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'kn', name: 'Kannada' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
];

// Keyword mappings for auto-detection from search text
const LANGUAGE_KEYWORDS: Record<string, string> = {
  'hindi': 'hi', 'bollywood': 'hi', 'bolly': 'hi',
  'bengali': 'bn', 'bangla': 'bn',
  'tamil': 'ta',
  'telugu': 'te',
  'malayalam': 'ml',
  'kannada': 'kn',
  'marathi': 'mr',
  'japanese': 'ja', 'anime': 'ja', 'japan': 'ja',
  'korean': 'ko', 'kdrama': 'ko', 'korea': 'ko',
  'chinese': 'zh', 'china': 'zh',
  'spanish': 'es', 'español': 'es',
  'french': 'fr', 'français': 'fr',
  'german': 'de', 'deutsch': 'de',
  'english': 'en',
};

const REGION_KEYWORDS: Record<string, string> = {
  'india': 'IN', 'indian': 'IN', 'bollywood': 'IN',
  'united states': 'US', 'usa': 'US', 'america': 'US', 'american': 'US',
  'uk': 'GB', 'united kingdom': 'GB', 'british': 'GB', 'england': 'GB',
  'japan': 'JP', 'japanese': 'JP', 'tokyo': 'JP',
  'korea': 'KR', 'korean': 'KR', 'seoul': 'KR',
  'canada': 'CA', 'canadian': 'CA',
  'australia': 'AU', 'australian': 'AU',
  'germany': 'DE', 'german': 'DE', 'berlin': 'DE',
  'france': 'FR', 'french': 'FR', 'paris': 'FR',
  'spain': 'ES', 'spanish': 'ES', 'madrid': 'ES',
  'italy': 'IT', 'italian': 'IT', 'rome': 'IT',
  'brazil': 'BR', 'brazilian': 'BR',
  'mexico': 'MX', 'mexican': 'MX',
};

// Detect language code from search text
function detectLanguage(text: string): string | null {
  const lowerText = text.toLowerCase();
  for (const [keyword, code] of Object.entries(LANGUAGE_KEYWORDS)) {
    if (lowerText.includes(keyword)) {
      return code;
    }
  }
  return null;
}

// Detect region code from search text
function detectRegion(text: string): string | null {
  const lowerText = text.toLowerCase();
  for (const [keyword, code] of Object.entries(REGION_KEYWORDS)) {
    if (lowerText.includes(keyword)) {
      return code;
    }
  }
  return null;
}

function App() {
  const [input, setInput] = useState('');
  const [recommendations, setRecommendations] = useState<MediaRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mediaType, setMediaType] = useState<MediaType>('movie');
  const [hiddenGems, setHiddenGems] = useState(false);
  const [latestReleases, setLatestReleases] = useState(false);
  const [region, setRegion] = useState('IN'); // Default to India
  const [language, setLanguage] = useState(''); // Empty means all languages
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]); // OTT platform filter
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRefineListening, setIsRefineListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<'main' | 'refine'>('main');
  const [refineInput, setRefineInput] = useState('');

  const { user, signOut, profile } = useAuth();
  const navigate = useNavigate();

  // Check voice support on mount
  useEffect(() => {
    setVoiceSupported(isVoiceSupported());

    // Set up voice result callback
    setOnResult((result) => {
      if (result.transcript) {
        if (voiceTarget === 'refine') {
          setRefineInput(result.transcript);
        } else {
          setInput(result.transcript);
          // Auto-submit after voice input for main search
          fetchRecommendations(result.transcript);
        }
        setIsListening(false);
        setIsRefineListening(false);
      }
    });

    // Set up voice state callback
    setOnStateChange((state) => {
      const isListening = state === 'listening';
      setIsListening(isListening);
      setIsRefineListening(isListening);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim().split(' ').length < 3) {
      alert('Please provide a more detailed description (at least 3 words)');
      return;
    }

    // Auto-detect language and region from search text
    const detectedLanguage = detectLanguage(input);
    const detectedRegion = detectRegion(input);

    // Update selectors if detected (only if user hasn't manually set them)
    if (detectedLanguage && !language) {
      setLanguage(detectedLanguage);
    }
    if (detectedRegion && !region) {
      setRegion(detectedRegion);
    }

    await fetchRecommendations(input);
  };

  const handleMoodClick = async (prompt: string) => {
    setInput(prompt);
    // Auto-detect language and region from prompt
    const detectedLanguage = detectLanguage(prompt);
    const detectedRegion = detectRegion(prompt);
    if (detectedLanguage && !language) setLanguage(detectedLanguage);
    if (detectedRegion && !region) setRegion(detectedRegion);
    await fetchRecommendations(prompt);
  };

  // Handle refine recommendations
  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refineInput.trim()) return;

    // Combine original query with refinement
    const refinedQuery = `${input} but ${refineInput}`;
    await fetchRecommendations(refinedQuery);
    setRefineInput('');
  };

  const toggleVoiceSearch = () => {
    setVoiceTarget('main');
    if (isListening) {
      stopListening();
      setIsListening(false);
    } else {
      if (voiceSupported) {
        startListening();
        setIsListening(true);
      } else {
        alert('Voice recognition is not supported in your browser.');
      }
    }
  };

  const toggleRefineVoiceSearch = () => {
    setVoiceTarget('refine');
    if (isRefineListening) {
      stopListening();
      setIsRefineListening(false);
    } else {
      if (voiceSupported) {
        startListening();
        setIsRefineListening(true);
      } else {
        alert('Voice recognition is not supported in your browser.');
      }
    }
  };

  const fetchRecommendations = async (query: string, detectedLanguage?: string, detectedRegion?: string) => {
    setIsLoading(true);

    // Timeout after 30 seconds to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      alert('Request timed out. Please try again.');
    }, 30000);

    try {
      // Use detected values if provided, otherwise fall back to state values
      const langToUse = detectedLanguage || language;
      const regionToUse = detectedRegion || region;
      const options: RecommendationOptions = {
        mediaType,
        hiddenGems,
        region: regionToUse,
        language: langToUse || undefined,
        recentOnly: latestReleases,
        preferredProviders: selectedPlatforms.length > 0 ? selectedPlatforms : undefined
      };
      const results = await getRecommendations(query, options);

      clearTimeout(timeoutId);

      if (results.recommendations.length === 0) {
        alert('No recommendations found. This might be due to API limitations. Please try a different search term.');
        setIsLoading(false);
        return;
      }
      setRecommendations(results.recommendations);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error fetching recommendations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to fetch recommendations: ${errorMessage}`);
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
        <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-cream-100">CineMatch</h1>
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-cinema-800/50 hover:bg-cinema-700/50 rounded-lg transition-colors"
            >
              <User className="w-5 h-5 text-gold-500" />
              <span className="text-sm text-cream-200">
                {profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
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
                  onClick={() => navigate('/analytics')}
                  className="w-full px-4 py-3 text-left text-sm text-cream-300 hover:bg-cinema-700/50 flex items-center gap-2 transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </button>
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
      <div className="relative overflow-visible">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-16 relative">
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

          {/* Hidden Gems and Latest Releases Toggles */}
          <div className="flex justify-center gap-4 mb-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={() => setHiddenGems(!hiddenGems)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${hiddenGems
                ? 'bg-gold-600/20 text-gold-500 border border-gold-600/50 shadow-glow'
                : 'bg-cinema-800/50 text-cream-400 border border-cinema-700/50 hover:border-gold-600/30 hover:text-gold-500'
                }`}
            >
              <Sparkles className={`w-4 h-4 ${hiddenGems ? 'animate-pulse text-gold-500' : ''}`} />
              Hidden Gems
            </button>
            <button
              onClick={() => setLatestReleases(!latestReleases)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${latestReleases
                ? 'bg-gold-600/20 text-gold-500 border border-gold-600/50 shadow-glow'
                : 'bg-cinema-800/50 text-cream-400 border border-cinema-700/50 hover:border-gold-600/30 hover:text-gold-500'
                }`}
            >
              <Calendar className={`w-4 h-4 ${latestReleases ? 'animate-pulse text-gold-500' : ''}`} />
              Latest Releases
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
          <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto px-4 sm:px-0 animate-slide-up" style={{ animationDelay: '0.6s' }}>
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
                    onClick={toggleVoiceSearch}
                    disabled={!voiceSupported}
                    className={`mr-2 p-2 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-cream-400 hover:text-gold-500'
                      }`}
                    title={voiceSupported ? (isListening ? 'Stop Voice Search' : 'Voice Search') : 'Voice Search Not Supported'}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
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

          {/* Region and Language Selectors - Below Search */}
          <div className="flex justify-center gap-4 mt-6 animate-slide-up" style={{ animationDelay: '0.7s' }}>
            {/* Region Selector */}
            <div className="relative">
              <button
                onClick={() => { setShowRegionDropdown(!showRegionDropdown); setShowLanguageDropdown(false); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cinema-800/50 text-cream-300 border border-cinema-700/50 hover:border-gold-600/30 hover:text-gold-500 transition-all duration-300"
              >
                <Globe className="w-4 h-4" />
                <span>{REGIONS.find(r => r.code === region)?.name || 'Region'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showRegionDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showRegionDropdown && (
                <div className="absolute top-full mt-2 left-0 w-64 bg-cinema-800 border border-cinema-700 rounded-lg shadow-elevated z-[100] max-h-96 overflow-y-auto">
                  {REGIONS.map((r) => (
                    <button
                      key={r.code}
                      onClick={() => { setRegion(r.code); setShowRegionDropdown(false); }}
                      className={`w-full block text-left px-4 py-3 hover:bg-cinema-700 transition-colors ${region === r.code ? 'text-gold-500 bg-cinema-700' : 'text-cream-300'
                        }`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => { setShowLanguageDropdown(!showLanguageDropdown); setShowRegionDropdown(false); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cinema-800/50 text-cream-300 border border-cinema-700/50 hover:border-gold-600/30 hover:text-gold-500 transition-all duration-300"
              >
                <Languages className="w-4 h-4" />
                <span>{LANGUAGES.find(l => l.code === language)?.name || 'All Languages'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showLanguageDropdown && (
                <div className="absolute top-full mt-2 left-0 w-64 bg-cinema-800 border border-cinema-700 rounded-lg shadow-elevated z-[100] max-h-96 overflow-y-auto">
                  <button
                    onClick={() => { setLanguage(''); setShowLanguageDropdown(false); }}
                    className={`w-full block text-left px-4 py-3 hover:bg-cinema-700 transition-colors ${language === '' ? 'text-gold-500 bg-cinema-700' : 'text-cream-300'}`}
                  >
                    All Languages
                  </button>
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLanguage(l.code); setShowLanguageDropdown(false); }}
                      className={`w-full block text-left px-4 py-3 hover:bg-cinema-700 transition-colors ${language === l.code ? 'text-gold-500 bg-cinema-700' : 'text-cream-300'
                        }`}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* OTT Platform Selector */}
            <OTTSelector
              selectedPlatforms={selectedPlatforms}
              onChange={setSelectedPlatforms}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-8 sm:pb-16">
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

            {/* Refine Recommendations */}
            <form onSubmit={handleRefine} className="max-w-2xl mx-auto animate-slide-up">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-gold-600/30 to-gold-400/30 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
                <div className="relative flex gap-2 p-2 bg-cinema-800/80 rounded-xl border border-cinema-700/50 group-focus-within:border-gold-600/50">
                  <input
                    type="text"
                    value={refineInput}
                    onChange={(e) => setRefineInput(e.target.value)}
                    placeholder="Refine recommendations: e.g., make it darker, more romantic..."
                    className="flex-1 px-4 py-3 bg-transparent focus:outline-none text-cream-100 placeholder-cream-500"
                  />
                  <button
                    type="button"
                    onClick={toggleRefineVoiceSearch}
                    disabled={!voiceSupported}
                    className={`mr-2 p-2 transition-colors ${isRefineListening ? 'text-red-500 animate-pulse' : 'text-cream-400 hover:text-gold-500'
                      }`}
                    title={voiceSupported ? (isRefineListening ? 'Stop Voice Search' : 'Voice Search') : 'Voice Search Not Supported'}
                  >
                    {isRefineListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <Button type="submit" variant="primary" size="md">
                    Refine
                  </Button>
                </div>
              </div>
            </form>

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
                    {/* Streaming indicator */}
                    <div className="absolute top-2 left-2">
                      <StreamingIndicator
                        hasStreaming={item.streamingProviders && item.streamingProviders.length > 0}
                      />
                    </div>
                    {/* Rating badge */}
                    {item.rating > 0 && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-cinema-950/80 backdrop-blur-sm rounded-lg">
                        <Star className="w-3.5 h-3.5 text-gold-500 fill-gold-500" />
                        <span className="text-sm font-medium text-cream-100">{item.rating.toFixed(1)}</span>
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
                    {item.streamingProviders && item.streamingProviders.length > 0 ? (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-cream-400 mb-3">Where to Watch</h4>
                        <StreamingAvailability
                          providers={item.streamingProviders}
                          region={region}
                          className="mb-3"
                        />
                        {/* Clickable provider links */}
                        <div className="flex flex-wrap gap-2">
                          {item.streamingProviders.slice(0, 4).map((provider, idx) => (
                            <a
                              key={idx}
                              href={getStreamingUrl(provider.name, item.title)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-1.5 bg-cinema-700/50 hover:bg-cinema-600/70 rounded-lg transition-all duration-300 cursor-pointer group border border-transparent hover:border-gold-600/30"
                              title={`Watch on ${provider.name}`}
                            >
                              {provider.logo ? (
                                <img src={provider.logo} alt={provider.name} className="w-4 h-4 rounded object-contain bg-white/10" />
                              ) : (
                                <PlayCircle className="w-4 h-4 text-gold-500" />
                              )}
                              <span className="text-xs text-cream-200 group-hover:text-gold-400 transition-colors">{provider.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 flex items-center gap-2 text-cream-500">
                        <span>📡</span>
                        <span className="text-sm">Not available to stream</span>
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
