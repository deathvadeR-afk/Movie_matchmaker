# Supabase Backend Integration Plan

## Comprehensive Implementation for Movie Recommendation App

---

## Executive Summary

This document outlines a comprehensive plan to integrate Supabase as a backend for the movie recommendation application. The implementation includes:

1. OAuth Authentication (Google, GitHub, Email/Password)
2. User API Key Management System
3. Subscription/Payment Preference System
4. Enhanced Recommendation Engine with User Data Storage

---

## Phase 1: Database Schema Design

### 1.1 Core Tables

```sql
-- =============================================
-- AUTHENTICATION & USER MANAGEMENT
-- =============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    is_premium BOOLEAN DEFAULT FALSE,
    subscription_status TEXT DEFAULT 'free',
    subscription_tier TEXT DEFAULT 'free',
    subscription_start_date TIMESTAMPTZ,
    subscription_end_date TIMESTAMPTZ,
    payment_customer_id TEXT,
    metadata JSONB DEFAULT '{}'
);

-- User API Keys (encrypted storage)
CREATE TABLE public.user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'gemini', 'openai', etc.
    encrypted_key TEXT NOT NULL,
    key_hash TEXT NOT NULL, -- For validation without decryption
    key_name TEXT, -- User-defined name like "My API Key"
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    monthly_limit INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    UNIQUE(user_id, provider)
);

-- Session management
CREATE TABLE public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    device_info JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- =============================================
-- SUBSCRIPTION & PAYMENT
-- =============================================

-- Subscription preferences (opt-in for paid tier)
CREATE TABLE public.subscription_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    willing_to_pay BOOLEAN DEFAULT FALSE,
    preferred_price_point INTEGER DEFAULT 30, -- Rs. 30/month
    payment_method_interest JSONB DEFAULT '[]', -- ['upi', 'card', 'upi']
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription plans (for future use)
CREATE TABLE public.subscription_plans (
    id TEXT PRIMARY KEY, -- 'free', 'basic', 'premium'
    name TEXT NOT NULL,
    price_inr INTEGER NOT NULL,
    monthly_api_quota INTEGER,
    features JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment history (for future Stripe/Razorpay integration)
CREATE TABLE public.payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_plan_id TEXT REFERENCES public.subscription_plans(id),
    payment_id TEXT UNIQUE,
    amount INTEGER NOT NULL, -- In paise
    currency TEXT DEFAULT 'INR',
    status TEXT NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
    payment_method TEXT,
    transaction_id TEXT,
    invoice_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RECOMMENDATION & USER DATA
-- =============================================

-- User preferences (enhanced from current)
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    genre_scores JSONB DEFAULT '{}',
    media_type_scores JSONB DEFAULT '{"movie": 0, "tv": 0, "anime": 0}',
    time_period_scores JSONB DEFAULT '{"recent": 0, "classic": 0}',
    region_scores JSONB DEFAULT '{}',
    language_preferences TEXT[] DEFAULT ARRAY[]::TEXT[],
    content_filters JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt history (all AI interactions)
CREATE TABLE public.prompt_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_text TEXT NOT NULL,
    prompt_type TEXT NOT NULL, -- 'mood', 'search', 'conversation', 'refinement'
    media_type TEXT, -- 'movie', 'tv', 'anime'
    response_text TEXT,
    recommendations_count INTEGER,
    model_used TEXT,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User interactions (clicks, likes, dismissals)
CREATE TABLE public.user_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL, -- 'search', 'click', 'like', 'dismiss', 'share', 'regenerate'
    media_id INTEGER,
    media_title TEXT,
    media_type TEXT,
    genre_tags TEXT[],
    query_text TEXT,
    session_id UUID,
    page_url TEXT,
    referrer_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlist/Favorites
CREATE TABLE public.watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_id INTEGER NOT NULL,
    media_type TEXT NOT NULL,
    media_title TEXT NOT NULL,
    poster_url TEXT,
    backdrop_url TEXT,
    year INTEGER,
    rating REAL,
    genres TEXT[],
    added_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    status TEXT DEFAULT 'watching', -- 'watching', 'completed', 'dropped', 'plan_to_watch'
    user_rating INTEGER,
    UNIQUE(user_id, media_id)
);

-- Session data
CREATE TABLE public.user_sessions_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    page_views INTEGER DEFAULT 0,
    searches_count INTEGER DEFAULT 0,
    recommendations_shown INTEGER DEFAULT 0,
    interactions_count INTEGER DEFAULT 0,
    device_type TEXT,
    platform TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recommendation cache (personalized)
CREATE TABLE public.recommendation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cache_key TEXT NOT NULL,
    recommendations JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, cache_key)
);

-- Feedback signals
CREATE TABLE public.feedback_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL, -- 'positive', 'negative', 'neutral'
    recommendation_id TEXT, -- Reference to cached recommendation
    media_id INTEGER,
    media_title TEXT,
    feedback_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 Indexes for Performance

```sql
-- Authentication performance
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_created ON public.user_profiles(created_at DESC);

-- API Key lookups
CREATE INDEX idx_user_api_keys_user ON public.user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_hash ON public.user_api_keys(key_hash);

-- Recommendation data queries
CREATE INDEX idx_prompt_history_user ON public.prompt_history(user_id, created_at DESC);
CREATE INDEX idx_prompt_history_type ON public.prompt_history(prompt_type, created_at DESC);
CREATE INDEX idx_interactions_user_type ON public.user_interactions(user_id, interaction_type, created_at DESC);
CREATE INDEX idx_interactions_media ON public.user_interactions(media_id, media_type);
CREATE INDEX idx_watchlist_user_status ON public.watchlist(user_id, status, added_at DESC);
CREATE INDEX idx_recommendation_cache_user ON public.recommendation_cache(user_id, expires_at);

-- Analytics
CREATE INDEX idx_sessions_data_user ON public.user_sessions_data(user_id, created_at DESC);
CREATE INDEX idx_feedback_user ON public.feedback_signals(user_id, created_at DESC);
```

### 1.3 Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_cache ENABLE ROW LEVEL SECURITY;

-- User profiles: users can read/update their own
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- API Keys: only owner can access
CREATE POLICY "Users can manage own API keys" ON public.user_api_keys
    FOR ALL USING (auth.uid() = user_id);

-- Preferences: only owner
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Prompt history: only owner
CREATE POLICY "Users can manage own prompt history" ON public.prompt_history
    FOR ALL USING (auth.uid() = user_id);

-- Interactions: only owner
CREATE POLICY "Users can manage own interactions" ON public.user_interactions
    FOR ALL USING (auth.uid() = user_id);

-- Watchlist: only owner
CREATE POLICY "Users can manage own watchlist" ON public.watchlist
    FOR ALL USING (auth.uid() = user_id);

-- Subscription preferences: only owner
CREATE POLICY "Users can manage own subscription" ON public.subscription_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Public read for recommendation cache (user-specific)
CREATE POLICY "Users can read own cache" ON public.recommendation_cache
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own cache" ON public.recommendation_cache
    FOR ALL USING (auth.uid() = user_id);
```

---

## Phase 2: API Endpoint Specifications

### 2.1 Authentication Endpoints

```
POST /api/auth/signup
Request: { email, password, fullName?, redirectUrl }
Response: { user, session, message }

POST /api/auth/login  
Request: { email, password }
Response: { user, session, accessToken, refreshToken }

POST /api/auth/oauth/{provider}
Request: { provider: 'google' | 'github' }
Response: { url: OAuthRedirectURL }

POST /api/auth/oauth/callback
Request: { code, state }
Response: { user, session }

POST /api/auth/logout
Request: {}
Response: { success }

POST /api/auth/reset-password
Request: { email }
Response: { success }

POST /api/auth/refresh-session
Request: { refreshToken }
Response: { session }

GET  /api/auth/me
Response: { user, profile }
```

### 2.2 API Key Management Endpoints

```
POST /api/keys
Request: { provider: 'gemini', apiKey: string, keyName?: string }
Response: { id, provider, keyName, createdAt }
Notes: Encrypts key before storage using Supabase Vault or AES-256

GET  /api/keys
Response: { keys: [{ id, provider, keyName, isActive, usageCount, createdAt }] }

PUT /api/keys/{id}
Request: { apiKey?: string, keyName?: string, isActive?: boolean }
Response: { success }

DELETE /api/keys/{id}
Response: { success }

POST /api/keys/{id}/validate
Request: {}
Response: { isValid: boolean, message }

GET  /api/keys/{id}/usage
Response: { usageCount, monthlyLimit, resetDate }
```

### 2.3 User Preferences Endpoints

```
GET  /api/preferences
Response: { preferences: UserPreferences }

PUT  /api/preferences
Request: { genreScores?, mediaTypeScores?, regionScores?, languagePreferences? }
Response: { preferences }

GET  /api/preferences/analysis
Response: { topGenres: [], preferredMediaType, preferredTimePeriod, regionAffinity }
```

### 2.4 Interaction & History Endpoints

```
POST /api/interactions
Request: { type, mediaId?, mediaTitle?, mediaType?, queryText?, metadata? }
Response: { id, createdAt }

GET  /api/interactions
Query: { type?, limit?, offset?, startDate?, endDate? }
Response: { interactions: [], total }

GET  /api/history/prompts
Query: { limit?, offset? }
Response: { prompts: [], total }

GET  /api/history/watchlist
Query: { status?, limit?, offset? }
Response: { watchlist: [], total }

POST /api/history/watchlist
Request: { mediaId, mediaType, mediaTitle, posterUrl?, backdropUrl?, year?, rating?, genres? }
Response: { id, status: 'watching' }

PUT  /api/history/watchlist/{id}
Request: { status?, notes?, userRating? }
Response: { success }

DELETE /api/history/watchlist/{id}
Response: { success }
```

### 2.5 Subscription Endpoints

```
GET  /api/subscription/preference
Response: { willingToPay, preferredPricePoint, paymentMethods, notifiedAt }

PUT  /api/subscription/preference
Request: { willingToPay: boolean, preferredPricePoint?: number, paymentMethodInterest?: string[] }
Response: { success }

GET  /api/subscription/plans
Response: { plans: [{ id, name, priceInr, features, isActive }] }

GET  /api/subscription/status
Response: { status, tier, startDate, endDate, features }

POST /api/subscription/checkout
Request: { planId: string, paymentMethod: string }
Response: { checkoutUrl, sessionId } -- For Stripe/Razorpay

GET  /api/subscription/invoices
Response: { invoices: [{ id, amount, status, date, invoiceUrl }] }
```

### 2.6 Recommendations Endpoints

```
POST /api/recommendations/personalized
Request: { prompt, mediaType?, includeHistory?, limit? }
Response: { recommendations: [], context: { basedOn: [] } }

GET  /api/recommendations/insights
Response: { 
  preferredGenres: [], 
  viewingPatterns: {}, 
  engagementScore: number,
  similarUsersLike: [],
  recommendationsForYou: []
}

POST /api/recommendations/feedback
Request: { recommendationId, signal: 'positive' | 'negative' | 'neutral', feedbackText? }
Response: { success }
```

---

## Phase 3: Frontend Implementation

### 3.1 Authentication Flow

```typescript
// Auth Context Structure
interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Login Component Flow
1. User clicks "Login with Google" or "Login with GitHub"
2. Redirect to Supabase OAuth
3. Handle callback with auth code
4. Create/update user profile
5. Store session in localStorage/cookies
6. Redirect to app with personalized experience
```

### 3.2 API Key Modal Component

```typescript
// API Key Input Modal Props
interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: (keyId: string) => void;
}

// Modal Flow
1. Show welcome message explaining why API key is needed
2. Input field for API key with paste support
3. Optional: Name the key ("My Gemini Key")
4. "Save & Continue" button
5. Validate key with test request
6. Show success/error feedback
7. Store encrypted in Supabase

// Key Features
- Input validation (format check)
- Show/hide toggle for key
- Usage tracking display
- "Remove Key" option in settings
- Fallback prompt if no key provided
```

### 3.3 Subscription Preference UI

```typescript
// Subscription Preference Flow
1. First-time users without API key see:
   - "Bring your own API key" (free)
   - "Use ours - Rs 30/month" (premium)
   
2. UI Elements:
   - Modal with clear pricing
   - "Yes, I'm willing to pay Rs 30/month" button
   - "No, I'll bring my own API key" button
   - Future: Payment integration when threshold reached

3. Settings page shows:
   - Current subscription status
   - Usage statistics
   - Upgrade/downgrade options
```

### 3.4 Personalized Recommendations UI

```typescript
// Recommendation Display Components
- "Recommended for You" section
- "Because you liked X" sections
- "Trending among similar users"
- Genre-based suggestions based on history
- Time-based recommendations (evening vs morning)

- Interactive feedback buttons:
  - 👍 Like
  - 👎 Not interested
  - 🔄 Show similar
  - 📝 Tell us why
```

---

## Phase 4: Security Implementation

### 4.1 API Key Encryption

```typescript
// Option A: Supabase Vault (Recommended)
const { data, error } = await supabase.rpc('encrypt_api_key', {
  key_text: apiKey,
  user_id: userId
});

// Option B: AES-256 Encryption
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const [ivHex, encrypted] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### 4.2 Rate Limiting

```typescript
// Server-side rate limiting using Upstash Redis or Supabase
const RATE_LIMIT_WINDOW = 60; // seconds
const MAX_REQUESTS = 100;

async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `rate_limit:${userId}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, RATE_LIMIT_WINDOW);
  }
  
  return current <= MAX_REQUESTS;
}
```

### 4.3 Input Validation

```typescript
// Zod schemas for validation
import { z } from 'zod';

const apiKeySchema = z.object({
  provider: z.enum(['gemini', 'openai']),
  apiKey: z.string().min(10).max200(),
  keyName: z.string().max(50).optional()
});

const preferencesSchema = z.object({
  genreScores: z.record(z.number()),
  mediaTypeScores: z.object({
    movie: z.number().min(0).max(100),
    tv: z.number().min(0).max(100),
    anime: z.number().min(0).max(100)
  })
});
```

---

## Phase 5: Recommendation Engine Enhancement

### 5.1 Data Collection Pipeline

```typescript
// Interaction Tracking
async function trackInteraction(type: InteractionType, data: InteractionData) {
  await supabase.from('user_interactions').insert({
    user_id: currentUser.id,
    interaction_type: type,
    media_id: data.mediaId,
    media_title: data.title,
    media_type: data.type,
    query_text: data.query,
    metadata: {
      timestamp: Date.now(),
      page: window.location.pathname,
      referrer: document.referrer
    }
  });
}

// Prompt History Tracking
async function logPrompt(prompt: string, type: PromptType, response: AIResponse) {
  await supabase.from('prompt_history').insert({
    user_id: currentUser.id,
    prompt_text: prompt,
    prompt_type: type,
    response_text: response.text,
    recommendations_count: response.count,
    response_time_ms: response.latency
  });
}
```

### 5.2 Personalized Recommendation Algorithm

```typescript
// Hybrid Recommendation Approach
interface RecommendationInput {
  userId: string;
  prompt?: string;
  mediaType?: MediaType;
  limit?: number;
}

async function getPersonalizedRecommendations(input: RecommendationInput) {
  // 1. Fetch user preference profile
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', input.userId)
    .single();
  
  // 2. Get recent interactions
  const { data: interactions } = await supabase
    .from('user_interactions')
    .select('*')
    .eq('user_id', input.userId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  // 3. Calculate genre affinity scores
  const genreScores = calculateGenreAffinity(interactions);
  
  // 4. Build personalized prompt
  const personalizedPrompt = buildPrompt(input.prompt, {
    preferredGenres: genreScores,
    preferredMediaType: preferences?.media_type_scores,
    recentLikes: getRecentLikes(interactions),
    avoidGenres: getDislikedGenres(interactions)
  });
  
  // 5. Call Gemini with personalized context
  const recommendations = await getAIRecommendations(personalizedPrompt, input.mediaType);
  
  // 6. Cache results
  await cacheRecommendations(input.userId, recommendations);
  
  return recommendations;
}
```

---

## Phase 6: Implementation Timeline

### Phase 6.1: Foundation (Week 1-2)

- [ ] Set up Supabase project
- [ ] Create database schema
- [ ] Configure RLS policies
- [ ] Set up authentication providers
- [ ] Install Supabase client

### Phase 6.2: Authentication (Week 2-3)

- [ ] Implement OAuth login (Google, GitHub)
- [ ] Implement email/password auth
- [ ] Create auth context and hooks
- [ ] Build login/signup UI components
- [ ] Add session management

### Phase 6.3: API Key System (Week 3-4)

- [ ] Build API key storage with encryption
- [ ] Create key validation endpoint
- [ ] Build API key modal component
- [ ] Integrate with Gemini service
- [ ] Add usage tracking

### Phase 6.4: Subscription UI (Week 4-5)

- [ ] Create subscription preference modal
- [ ] Build preference storage
- [ ] Design pricing display
- [ ] Prepare for future payment integration

### Phase 6.5: Recommendation Data (Week 5-7)

- [ ] Implement interaction tracking
- [ ] Build prompt history storage
- [ ] Create watchlist functionality
- [ ] Build recommendation caching
- [ ] Implement preference learning

### Phase 6.6: Personalized Recommendations (Week 7-8)

- [ ] Update recommendation engine
- [ ] Build personalization pipeline
- [ ] Create "For You" UI section
- [ ] Add feedback collection
- [ ] A/B testing setup

---

## Potential Challenges & Mitigation

### Challenge 1: API Key Security

**Risk**: Storing API keys in database
**Mitigation**: Use Supabase Vault or AES-256 encryption with secure key management

### Challenge 2: Rate Limiting

**Risk**: Users exceeding API quotas
**Mitigation**: Implement usage tracking, alerts, and fallback to cached results

### Challenge 3: Migration of Existing Users

**Risk**: How to handle users without accounts
**Mitigation**: Guest session with localStorage, prompt for signup with data migration

### Challenge 4: Subscription Payment Integration

**Risk**: PCI compliance for payments
**Mitigation**: Use Stripe/Razorpay (they handle PCI), only store payment references

### Challenge 5: Recommendation Quality

**Risk**: Cold start problem for new users
**Mitigation**: Use collaborative filtering, popularity-based fallback, progressive learning

---

## Future Scaling Recommendations

### 1. Database

- Consider PostgreSQL read replicas for high traffic
- Implement connection pooling
- Use Supabase's built-in caching

### 2. Recommendation Engine

- Move ML inference to serverless functions
- Consider vector embeddings for semantic search
- Implement Redis for real-time caching
- Build user similarity matrix for collaborative filtering

### 3. Payment

- Integrate Stripe for international payments
- Add Razorpay for India (UPI, cards)
- Implement subscription webhooks

### 4. Analytics

- Add event tracking (Mixpanel/Amplitude)
- Build dashboards for user insights
- A/B testing framework

---

## Summary

This implementation plan provides a complete backend infrastructure using Supabase, enabling:

1. **Secure OAuth authentication** with multiple providers
2. **Flexible API key management** - users bring their own keys or opt for subscription
3. **Rich user data storage** for personalized recommendations
4. **Subscription-ready architecture** for future monetization

The phased approach allows for incremental development while maintaining a working application throughout the process.
