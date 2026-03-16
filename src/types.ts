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

export type ProviderType = 'flatrate' | 'rent' | 'buy' | 'free';

// OTT Platform definitions with TMDB provider IDs
export interface OTTPlatform {
  id: string;
  name: string;
  logo: string;
  providerId: number; // TMDB provider ID for API lookup
  color: string; // Brand color for UI
}

export const OTT_PLATFORMS: OTTPlatform[] = [
  { id: 'netflix', name: 'Netflix', logo: 'N', providerId: 8, color: '#E50914' },
  { id: 'prime', name: 'Prime Video', logo: 'PV', providerId: 119, color: '#00A8E1' },
  { id: 'disney', name: 'Disney+', logo: 'D+', providerId: 337, color: '#113CCF' },
  { id: 'hotstar', name: 'Hotstar', logo: 'HS', providerId: 1229, color: '#094099' },
  { id: 'hbo', name: 'HBO Max', logo: 'HBO', providerId: 384, color: '#5822B4' },
  { id: 'hulu', name: 'Hulu', logo: 'Hulu', providerId: 15, color: '#1CE783' },
  { id: 'apple', name: 'Apple TV+', logo: 'TV+', providerId: 350, color: '#000000' },
  { id: 'peacock', name: 'Peacock', logo: 'P', providerId: 387, color: '#000000' },
  { id: 'paramount', name: 'Paramount+', logo: 'P+', providerId: 531, color: '#0064FF' },
  { id: 'sonylive', name: 'SonyLIV', logo: 'SL', providerId: 412, color: '#000000' },
  { id: 'zee', name: 'ZEE5', logo: 'Z5', providerId: 1256, color: '#CB2929' },
  { id: 'viu', name: 'Viu', logo: 'Viu', providerId: 307, color: '#F40000' },
];

export function getOTTPlatformById(id: string): OTTPlatform | undefined {
  return OTT_PLATFORMS.find(p => p.id === id);
}

export function getOTTPlatformByName(name: string): OTTPlatform | undefined {
  return OTT_PLATFORMS.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
}

export interface RegionProviders {
  region: string;
  flatrate?: StreamingProvider[];
  rent?: StreamingProvider[];
  buy?: StreamingProvider[];
  free?: StreamingProvider[];
}

export interface WatchProvidersResponse {
  providers: RegionProviders;
  lastUpdated: number;
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

// Pagination info returned with search results
export interface PaginationInfo {
  totalPages: number;
  currentPage: number;
  totalResults: number;
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
  { id: 'laugh', label: 'Need a Laugh', prompt: 'funny hilarious comedy that will make me laugh out loud', icon: '😂' },
  { id: 'cry', label: 'Good Cry', prompt: 'sad emotional touching drama that will make me cry happy or sad tears', icon: '😢' },
  { id: 'thrill', label: 'Adrenaline Rush', prompt: 'thrilling intense exciting action thriller with adrenaline rush', icon: '⚡' },
  { id: 'think', label: 'Mind Bender', prompt: 'thought-provoking complex mind-bending intellectual movie with twist ending', icon: '🧠' },
  { id: 'cozy', label: 'Cozy Night', prompt: 'cozy comforting feel-good wholesome heartwarming relaxing movie for a chill night', icon: '🛋️' },
  { id: 'scare', label: 'Scare Me', prompt: 'scary terrifying horror frightening creepy spooky movie that will scare me', icon: '👻' },
  { id: 'romance', label: 'Date Night', prompt: 'romantic love passionate passionate date night movie perfect for couples', icon: '❤️' },
  { id: 'epic', label: 'Epic Adventure', prompt: 'epic grand adventure amazing visuals spectacular magical fantasy world-building', icon: '🏔️' },
  { id: 'dark', label: 'Dark & Gritty', prompt: 'dark gritty serious mature noir thriller crime drama', icon: '🌑' },
  { id: 'inspiring', label: 'Inspiring', prompt: 'inspiring uplifting motivational triumphant inspirational story of overcoming odds', icon: '💪' },
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
  { code: 'CA', name: 'Canada', language: 'en' },
  { code: 'AU', name: 'Australia', language: 'en' },
  { code: 'DE', name: 'Germany', language: 'de' },
  { code: 'FR', name: 'France', language: 'fr' },
  { code: 'ES', name: 'Spain', language: 'es' },
  { code: 'BR', name: 'Brazil', language: 'pt' },
  { code: 'MX', name: 'Mexico', language: 'es' },
];

// Get default region from environment variable, fallback to 'IN' if not set
const getDefaultRegion = (): string => {
  const envRegion = import.meta.env.VITE_DEFAULT_REGION;
  // Validate that the region is supported
  if (envRegion && SUPPORTED_REGIONS.some(r => r.code === envRegion)) {
    return envRegion;
  }
  return 'IN'; // Default to India if not set or not supported
};

export const DEFAULT_REGION = getDefaultRegion();

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

// User interaction types for preference learning
export type InteractionType = 'search' | 'click' | 'like' | 'dismiss';

export interface UserInteraction {
  id: string;
  type: InteractionType;
  mediaId?: number;
  genres?: string[];
  mediaType?: MediaType;
  timestamp: number;
  query?: string;
}

export interface UserPreferences {
  genreScores: Record<string, number>;
  mediaTypeScores: Record<MediaType, number>;
  timePeriodScores: {
    recent: number;
    classic: number;
  };
  regionScores: Record<string, number>;
  interactions: UserInteraction[];
  lastUpdated: number;
}

// Sentiment analysis types
export type SentimentType = 'positive' | 'negative' | 'neutral';

export interface SentimentResult {
  sentiment: SentimentType;
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  keywords: string[]; // positive/negative words found
}

export interface MediaSentimentSummary {
  overallSentiment: SentimentType;
  averageScore: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  reviewCount: number;
}

// TMDB Review type (for API responses)
export interface TMDBReview {
  author: string;
  content: string;
  created_at: string;
  rating?: number;
}

// Cache entry for storing cached data with expiration
export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  expiresAt: number;
  hitCount: number;
  metadata?: CacheMetadata;
}

// Cache metadata for tracking usage patterns
export interface CacheMetadata {
  query?: string;
  mediaType?: MediaType;
  page?: number;
  genres?: string[];
  region?: string;
}

// Cache statistics for monitoring
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  hitRate: number;
  avgHitTime: number;
}

// Prefetch request for predictive prefetching
export interface PrefetchRequest {
  id: string;
  type: 'nextPage' | 'similar' | 'trending' | 'recommendations' | 'details';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  params: PrefetchParams;
  cancel: () => void;
}

// Parameters for prefetch requests
export interface PrefetchParams {
  query?: string;
  currentPage?: number;
  mediaId?: number;
  mediaType?: MediaType;
  genres?: string[];
  region?: string;
  preferences?: UserPreferences;
}

// User browsing pattern for predictive prefetching
export interface BrowsingPattern {
  recentSearches: SearchPattern[];
  viewedItems: number[];
  pageHistory: PageHistory[];
  lastActivity: number;
  idleTime: number;
}

// Search pattern for tracking user search behavior
export interface SearchPattern {
  query: string;
  page: number;
  timestamp: number;
  completed: boolean; // Whether user viewed multiple pages
}

// Page history for pagination prediction
export interface PageHistory {
  query: string;
  page: number;
  timestamp: number;
}

// Cache TTL configuration by content type
export interface CacheTTLConfig {
  trending: number;    // 15 minutes
  search: number;      // 30 minutes
  details: number;     // 1 hour
  recommendations: number; // 1 hour
  similar: number;      // 30 minutes
  providers: number;   // 24 hours
}

// Default TTL configuration (in milliseconds)
export const DEFAULT_CACHE_TTL: CacheTTLConfig = {
  trending: 15 * 60 * 1000,    // 15 minutes
  search: 30 * 60 * 1000,       // 30 minutes
  details: 60 * 60 * 1000,      // 1 hour
  recommendations: 60 * 60 * 1000, // 1 hour
  similar: 30 * 60 * 1000,      // 30 minutes
  providers: 24 * 60 * 60 * 1000, // 24 hours
};

// ============================================
// Anomaly Detection Types
// ============================================

export enum AnomalyType {
  SLOW_RESPONSE = 'SLOW_RESPONSE',
  UNEXPECTED_STRUCTURE = 'UNEXPECTED_STRUCTURE',
  MISSING_FIELDS = 'MISSING_FIELDS',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_DATA = 'INVALID_DATA',
  EMPTY_RESPONSE = 'EMPTY_RESPONSE',
  MALFORMED_DATA = 'MALFORMED_DATA',
  HIGH_ERROR_RATE = 'HIGH_ERROR_RATE',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AnomalyResult {
  detected: boolean;
  type?: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
  shouldFallback: boolean;
  shouldRetry: boolean;
  retryAfter?: number; // milliseconds to wait before retry
}

export interface AnomalyContext {
  endpoint: string;
  expectedFields?: string[];
  dataType?: 'movie' | 'search' | 'recommendations' | 'details' | 'reviews' | 'gemini';
  timeout?: number;
  maxRetries?: number;
}

export interface APIMetric {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  lastRequestTime: number;
  errorRate: number;
  rateLimitHits: number;
  recentResponseTimes: number[]; // Last 10 response times for rolling average
}

// Configuration for anomaly detection thresholds
export interface AnomalyThresholds {
  slowResponseMs: number;
  criticalResponseMs: number;
  maxErrorRate: number;
  maxRateLimitHits: number;
  minSuccessRate: number;
  rollingWindowSize: number;
}

export const DEFAULT_ANOMALY_THRESHOLDS: AnomalyThresholds = {
  slowResponseMs: 5000,        // Consider slow if > 5 seconds
  criticalResponseMs: 10000,  // Critical if > 10 seconds
  maxErrorRate: 0.5,           // 50% error rate threshold
  maxRateLimitHits: 3,        // Max rate limit hits before flagging
  minSuccessRate: 0.7,         // 70% minimum success rate
  rollingWindowSize: 10,       // Track last 10 requests
};

// ============================================
// Voice Search Types
// ============================================

// Supported languages for voice recognition
export type VoiceLanguage = 'en-US' | 'en-GB' | 'hi-IN' | 'ja-JP' | 'ko-KR' | 'fr-FR' | 'de-DE' | 'es-ES';

// Voice recognition options
export interface VoiceOptions {
  language?: VoiceLanguage;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  confidenceThreshold?: number;
}

// Voice recognition state
export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

// Voice command definition
export interface VoiceCommand {
  phrase: string;
  callback: (params: string) => void;
  patterns: RegExp[];
}

// Voice recognition result
export interface VoiceResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  language: VoiceLanguage;
  timestamp: number;
}

// Speech recognition event types (Web Speech API)
export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Base speech recognition interface
export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Global declaration for window properties
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Default voice options
export const DEFAULT_VOICE_OPTIONS: VoiceOptions = {
  language: 'en-US',
  continuous: true,
  interimResults: true,
  maxAlternatives: 1,
  confidenceThreshold: 0.5,
};

// Supported voice languages with display names
export const SUPPORTED_VOICE_LANGUAGES: { code: VoiceLanguage; name: string }[] = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'es-ES', name: 'Spanish' },
];

// ============================================
// Adaptive Learning Types
// ============================================

// Time period of day for pattern analysis
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

// Season for pattern analysis
export type SeasonPattern = 'new_releases' | 'classics' | 'mixed';

// Session engagement level
export type EngagementLevel = 'high' | 'medium' | 'low';

// ============================================
// Auto-Refresh Types
// ============================================

// Configuration for auto-refresh system
export interface RefreshConfig {
  enabled?: boolean;
  intervalMs?: number; // Base refresh interval in milliseconds
  idleTimeoutMs?: number; // Time before considering user as idle
  returnRefreshDelayMs?: number; // Delay after user returns from idle
  batchRequests?: boolean; // Whether to batch multiple refresh requests
  maxBatchSize?: number; // Maximum number of requests to batch
  batchDelayMs?: number; // Delay before processing batch
  prefetchEnabled?: boolean; // Whether to prefetch content
  onRefresh?: (results: RefreshResult) => void; // Callback when new content is available
  onError?: (error: Error) => void; // Callback when refresh fails
}

// Current status of the auto-refresh system
export interface RefreshStatus {
  isRunning: boolean;
  isRefreshing: boolean;
  lastRefreshTime: number | null;
  nextRefreshTime: number | null;
  isUserActive: boolean;
  isUserIdle: boolean;
  contentStale: boolean;
  newContentAvailable: boolean;
  pendingRefreshCount: number;
}

// Result of a refresh operation
export interface RefreshResult {
  success: boolean;
  timestamp: number;
  newItems: MediaRecommendation[];
  updatedItems: MediaRecommendation[];
  totalResults: number;
  refreshReason: RefreshReason;
  error?: string;
}

// Reasons why a refresh was triggered
export type RefreshReason =
  | 'time_based'        // Regular time-based refresh
  | 'user_returned'     // User returned after being idle
  | 'visibility_change' // Tab became visible
  | 'network_reconnect' // Network connection restored
  | 'manual'           // User manually triggered
  | 'content_stale';   // Content detected as stale

// Activity state tracking
export interface ActivityState {
  lastActivityTime: number;
  isActive: boolean;
  isIdle: boolean; // Whether user is currently idle
  wasIdle: boolean;
  idleStartTime: number | null;
  sessionStartTime: number;
  interactionCount: number;
}

// User behavior pattern for smart refresh
export interface RefreshPattern {
  averageSessionLength: number;
  averageIdleTime: number;
  peakActiveHours: number[];
  preferredRefreshTimes: number[];
  refreshCount: number;
  dismissCount: number;
}

// Default refresh configuration
export const DEFAULT_REFRESH_CONFIG: RefreshConfig = {
  enabled: true,
  intervalMs: 5 * 60 * 1000, // 5 minutes
  idleTimeoutMs: 2 * 60 * 1000, // 2 minutes
  returnRefreshDelayMs: 500, // 500ms after user returns
  batchRequests: true,
  maxBatchSize: 3,
  batchDelayMs: 1000,
  prefetchEnabled: true,
};

// User behavior session for tracking session-level metrics
export interface BehaviorSession {
  id: string;
  startTime: number;
  endTime?: number;
  interactions: SessionInteraction[];
  totalDuration: number; // milliseconds
  averageViewTime: number; // average time spent on movie details
  scrollDepth: number; // 0-100 percentage
  dismissSpeed: number; // average time before dismiss in ms
  timeOfDay: TimeOfDay;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
}

// Individual interaction within a session
export interface SessionInteraction {
  id: string;
  type: InteractionType;
  mediaId?: number;
  genres?: string[];
  mediaType?: MediaType;
  timestamp: number;
  viewDuration?: number; // Time spent on details page in ms
  scrollPosition?: number; // 0-100 percentage
  timeToAction?: number; // Time from seeing item to taking action in ms
}

// Engagement score metrics
export interface EngagementScore {
  totalScore: number;
  viewTimeScore: number; // Based on time spent viewing details
  scrollScore: number; // Based on scroll depth
  dismissPenalty: number; // Negative score for quick dismissals
  sessionDurationScore: number; // Based on session length
  timeOfDayScore: number; // Based on preferred time of day
  engagementLevel: EngagementLevel;
  lastCalculated: number;
}

// Adaptive prediction for recommendations
export interface AdaptivePrediction {
  predictedSatisfaction: number; // 0-1 predicted satisfaction score
  confidence: number; // 0-1 confidence in prediction
  factors: PredictionFactor[];
  algorithmVersion: string;
  predictedAt: number;
}

// Factor contributing to prediction
export interface PredictionFactor {
  name: string;
  weight: number;
  value: number;
  description: string;
}

// Prediction accuracy tracking
export interface PredictionAccuracy {
  totalPredictions: number;
  correctPredictions: number;
  averageError: number; // Difference between predicted and actual
  recentAccuracy: number; // Last 20 predictions accuracy
  accuracyTrend: 'improving' | 'stable' | 'declining';
  lastUpdated: number;
}

// Algorithm weights for recommendation adjustment
export interface AlgorithmWeights {
  genreWeight: number;
  mediaTypeWeight: number;
  timePeriodWeight: number;
  timeOfDayWeight: number;
  engagementWeight: number;
  popularityWeight: number;
  recencyWeight: number;
}

// User pattern analysis result
export interface BehaviorPattern {
  type: 'genre' | 'mediaType' | 'timeOfDay' | 'dayOfWeek' | 'session' | 'seasonal';
  confidence: number; // 0-1 how confident we are in this pattern
  value: string | number;
  strength: number; // How strong the pattern is
  sampleSize: number; // How many data points support this
}

// Enhanced user preferences with adaptive learning
export interface AdaptivePreferences {
  // Basic preferences from original UserPreferences
  genreScores: Record<string, number>;
  mediaTypeScores: Record<MediaType, number>;
  timePeriodScores: {
    recent: number;
    classic: number;
  };
  regionScores: Record<string, number>;
  interactions: UserInteraction[];
  lastUpdated: number;

  // Adaptive learning fields
  sessions: BehaviorSession[];
  engagementScore: EngagementScore;
  predictionAccuracy: PredictionAccuracy;
  algorithmWeights: AlgorithmWeights;
  learnedPatterns: BehaviorPattern[];
  timeOfDayPreferences: Record<TimeOfDay, number>;
  dayOfWeekPreferences: Record<number, number>; // 0-6
}

// Default algorithm weights
export const DEFAULT_ALGORITHM_WEIGHTS: AlgorithmWeights = {
  genreWeight: 1.0,
  mediaTypeWeight: 0.8,
  timePeriodWeight: 0.5,
  timeOfDayWeight: 0.3,
  engagementWeight: 0.6,
  popularityWeight: 0.4,
  recencyWeight: 0.5,
};

// Default engagement score
export const DEFAULT_ENGAGEMENT_SCORE: EngagementScore = {
  totalScore: 0,
  viewTimeScore: 0,
  scrollScore: 0,
  dismissPenalty: 0,
  sessionDurationScore: 0,
  timeOfDayScore: 0,
  engagementLevel: 'medium',
  lastCalculated: Date.now(),
};

// Default prediction accuracy
export const DEFAULT_PREDICTION_ACCURACY: PredictionAccuracy = {
  totalPredictions: 0,
  correctPredictions: 0,
  averageError: 0,
  recentAccuracy: 0,
  accuracyTrend: 'stable',
  lastUpdated: Date.now(),
};

// ============================================
// Smart Notification Types
// ============================================

// Notification type enum
export type NotificationType =
  | 'new_release'
  | 'trending'
  | 'similar_to_liked'
  | 'seasonal_recommendation'
  | 'watchlist_update'
  | 'system';

// Notification priority level
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

// Browser notification permission status
export type NotificationPermission = 'default' | 'granted' | 'denied';

// Notification options for browser/in-app notifications
export interface NotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
  silent?: boolean;
  actions?: NotificationAction[];
}

// Notification action button
export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// Scheduled notification
export interface ScheduledNotification {
  id: string;
  title: string;
  options: NotificationOptions;
  scheduledTime: number;
  type: NotificationType;
  priority: NotificationPriority;
  mediaId?: number;
  mediaType?: MediaType;
}

// Notification preferences
export interface NotificationPreferences {
  enabled: boolean;
  emailEnabled: boolean;
  emailAddress?: string;
  types: Record<NotificationType, boolean>;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm format
  quietHoursEnd: string; // HH:mm format
  frequencyLimit: 'realtime' | 'hourly' | 'daily';
  maxDailyNotifications: number;
  smartTimingEnabled: boolean;
  clickActionEnabled: boolean;
  showDismissSnooze: boolean;
}

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  emailEnabled: false,
  emailAddress: undefined,
  types: {
    new_release: true,
    trending: true,
    similar_to_liked: true,
    seasonal_recommendation: true,
    watchlist_update: true,
    system: true,
  },
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  frequencyLimit: 'hourly',
  maxDailyNotifications: 10,
  smartTimingEnabled: true,
  clickActionEnabled: true,
  showDismissSnooze: true,
};

// Individual notification record
export interface Notification {
  id: string;
  title: string;
  body?: string;
  type: NotificationType;
  priority: NotificationPriority;
  timestamp: number;
  read: boolean;
  dismissed: boolean;
  snoozedUntil?: number;
  mediaId?: number;
  mediaType?: MediaType;
  data?: Record<string, unknown>;
  clicked?: boolean;
}

// Notification history storage
export interface NotificationHistory {
  notifications: Notification[];
  lastChecked: number;
  lastNotificationTime: number;
}

// Media release for new release checking
export interface MediaRelease {
  id: number;
  title: string;
  mediaType: MediaType;
  releaseDate: string;
  genres: string[];
  posterUrl: string;
  rating: number;
  matchPercentage?: number;
}

// ============================================
// Fallback System Types
// ============================================

// Fallback mode levels
export type FallbackMode = 'full' | 'partial' | 'minimal' | 'disabled';

// Feature that can use fallback
export type FallbackFeature =
  | 'nlp'
  | 'sentiment'
  | 'voiceSearch'
  | 'recommendations'
  | 'userPreferences'
  | 'cache'
  | 'autoRefresh'
  | 'notifications';

// Configuration for fallback system
export interface FallbackConfig {
  mode: FallbackMode;
  features: Record<FallbackFeature, boolean>;
  retryAttempts: number;
  retryDelayMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeoutMs: number;
  recoveryCheckIntervalMs: number;
}

// Status of each fallback feature
export interface FallbackFeatureStatus {
  feature: FallbackFeature;
  isAvailable: boolean;
  isUsingFallback: boolean;
  lastError?: string;
  fallbackCount: number;
  lastChecked: number;
}

// Overall fallback system status
export interface FallbackStatus {
  mode: FallbackMode;
  isAIAvailable: boolean;
  isVoiceAvailable: boolean;
  isNotificationAvailable: boolean;
  features: FallbackFeatureStatus[];
  circuitBreakerOpen: boolean;
  lastRecoveryAttempt: number;
  totalFallbackCount: number;
}

// Default fallback configuration
export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  mode: 'full',
  features: {
    nlp: true,
    sentiment: true,
    voiceSearch: true,
    recommendations: true,
    userPreferences: true,
    cache: true,
    autoRefresh: true,
    notifications: true,
  },
  retryAttempts: 3,
  retryDelayMs: 1000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeoutMs: 30000,
  recoveryCheckIntervalMs: 60000,
};

// Circuit breaker state
export interface CircuitBreakerState {
  feature: FallbackFeature;
  failureCount: number;
  lastFailureTime: number;
  isOpen: boolean;
  nextAttempt: number;
}

// Retry attempt tracking
export interface RetryAttempt {
  feature: FallbackFeature;
  attemptNumber: number;
  maxAttempts: number;
  delayMs: number;
  startedAt: number;
}

// ============================================
// Conversation Manager Types
// ============================================

// Message role in conversation
export type ConversationRole = 'user' | 'assistant' | 'system';

// Single message in conversation
export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  content: string;
  timestamp: number;
  metadata?: {
    modificationType?: ModificationType;
    removedMovies?: number[];
    addedMovies?: number[];
    confidence?: number;
  };
}

// State of conversation session
export interface ConversationState {
  sessionId: string;
  messages: ConversationMessage[];
  currentRecommendations: MediaRecommendation[];
  originalQuery: string;
  acceptedMovies: number[]; // IDs of movies user liked
  rejectedMovies: number[]; // IDs of movies user dismissed
  createdAt: number;
  lastUpdated: number;
  isActive: boolean;
}

// Types of modifications user can request
export type ModificationType =
  | 'remove'           // Remove specific movies
  | 'add'              // Add more recommendations
  | 'change'           // Change genre/mood
  | 'expand'           // Expand to similar movies
  | 'narrow'           // Narrow down criteria
  | 'similar'          // Find similar to a movie
  | 'different'        // Find different from current
  | 'more_like'        // More like specific movie
  | 'less_like'        // Less like specific movie
  | 'clarify';         // Need clarification

// Parsed modification request
export interface ParsedModification {
  type: ModificationType;
  confidence: number;
  targetMovieIds: number[]; // Movies user is referring to
  targetGenres: string[];   // Genres mentioned
  targetTimePeriod: {
    type: 'recent' | 'classic' | 'decade' | 'year' | 'range' | 'any';
    value?: string;
    startYear?: number;
    endYear?: number;
  };
  targetEmotions: string[];  // Emotions requested
  excludedGenres: string[]; // Genres to exclude
  excludedMovieIds: number[]; // Movies to exclude
  addCount: number;         // How many more to add
  clarificationNeeded?: string; // If we need more info
  isContradictory: boolean;  // If request contradicts itself
  contradictionDetails?: string;
}

// Constraints for regenerating recommendations
export interface RecommendationConstraints {
  includedGenres: string[];
  excludedGenres: string[];
  includedMovieIds: number[];  // Similar to these
  excludedMovieIds: number[];    // Not similar to these
  timePeriod?: {
    type: 'recent' | 'classic' | 'decade' | 'year' | 'range' | 'any';
    value?: string;
    startYear?: number;
    endYear?: number;
  };
  emotions: string[];
  intensity?: {
    min?: number;
    max?: number;
  };
  mediaType?: MediaType;
  minRating?: number;
  limit?: number;
  offset?: number;
}

// Quick action suggestion
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  modificationType: ModificationType;
}