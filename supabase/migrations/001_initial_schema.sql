-- =============================================
-- SUPABASE DATABASE MIGRATION
-- Movie Recommendation App - Initial Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USER PROFILES (extends auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
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
    metadata JSONB DEFAULT '{}'::JSONB
);

-- =============================================
-- USER API KEYS (encrypted)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    monthly_limit INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    UNIQUE(user_id, provider)
);

-- =============================================
-- USER PREFERENCES
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    genre_scores JSONB DEFAULT '{}'::JSONB,
    media_type_scores JSONB DEFAULT '{"movie": 0, "tv": 0, "anime": 0}'::JSONB,
    time_period_scores JSONB DEFAULT '{"recent": 0, "classic": 0}'::JSONB,
    region_scores JSONB DEFAULT '{}'::JSONB,
    language_preferences TEXT[] DEFAULT ARRAY[]::TEXT[],
    content_filters JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PROMPT HISTORY
-- =============================================
CREATE TABLE IF NOT EXISTS public.prompt_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_text TEXT NOT NULL,
    prompt_type TEXT NOT NULL,
    media_type TEXT,
    response_text TEXT,
    recommendations_count INTEGER,
    model_used TEXT,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER INTERACTIONS
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL,
    media_id INTEGER,
    media_title TEXT,
    media_type TEXT,
    genre_tags TEXT[],
    query_text TEXT,
    session_id UUID,
    page_url TEXT,
    referrer_url TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- WATCHLIST
-- =============================================
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    status TEXT DEFAULT 'watching',
    user_rating INTEGER,
    UNIQUE(user_id, media_id)
);

-- =============================================
-- SUBSCRIPTION PREFERENCES
-- =============================================
CREATE TABLE IF NOT EXISTS public.subscription_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    willing_to_pay BOOLEAN DEFAULT FALSE,
    preferred_price_point INTEGER DEFAULT 30,
    payment_method_interest TEXT[] DEFAULT ARRAY[]::TEXT[],
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTION PLANS (for future use)
-- =============================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_inr INTEGER NOT NULL,
    monthly_api_quota INTEGER,
    features JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO public.subscription_plans (id, name, price_inr, monthly_api_quota, features) VALUES
('free', 'Free', 0, 50, '{"ai_recommendations": true, "api_key_needed": true}'),
('premium', 'Premium', 30, 500, '{"ai_recommendations": true, "api_key_needed": false, "priority_support": true}')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- RECOMMENDATION CACHE
-- =============================================
CREATE TABLE IF NOT EXISTS public.recommendation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cache_key TEXT NOT NULL,
    recommendations JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, cache_key)
);

-- =============================================
-- FEEDBACK SIGNALS
-- =============================================
CREATE TABLE IF NOT EXISTS public.feedback_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL,
    recommendation_id TEXT,
    media_id INTEGER,
    media_title TEXT,
    feedback_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON public.user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_hash ON public.user_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_prompt_history_user ON public.prompt_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_user ON public.user_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON public.user_interactions(interaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON public.watchlist(user_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_user ON public.recommendation_cache(user_id, expires_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_signals ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can view subscription plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view subscription plans" ON public.subscription_plans
    FOR SELECT USING (true);

-- API Keys Policies (only owner can access)
DROP POLICY IF EXISTS "Users can manage own API keys" ON public.user_api_keys;
CREATE POLICY "Users can manage own API keys" ON public.user_api_keys
    FOR ALL USING (auth.uid() = user_id);

-- Preferences Policies
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Prompt History Policies
DROP POLICY IF EXISTS "Users can manage own prompt history" ON public.prompt_history;
CREATE POLICY "Users can manage own prompt history" ON public.prompt_history
    FOR ALL USING (auth.uid() = user_id);

-- Interactions Policies
DROP POLICY IF EXISTS "Users can manage own interactions" ON public.user_interactions;
CREATE POLICY "Users can manage own interactions" ON public.user_interactions
    FOR ALL USING (auth.uid() = user_id);

-- Watchlist Policies
DROP POLICY IF EXISTS "Users can manage own watchlist" ON public.watchlist;
CREATE POLICY "Users can manage own watchlist" ON public.watchlist
    FOR ALL USING (auth.uid() = user_id);

-- Subscription Preferences Policies
DROP POLICY IF EXISTS "Users can manage own subscription" ON public.subscription_preferences;
CREATE POLICY "Users can manage own subscription" ON public.subscription_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Recommendation Cache Policies
DROP POLICY IF EXISTS "Users can manage own cache" ON public.recommendation_cache;
CREATE POLICY "Users can manage own cache" ON public.recommendation_cache
    FOR ALL USING (auth.uid() = user_id);

-- Feedback Signals Policies
DROP POLICY IF EXISTS "Users can manage own feedback" ON public.feedback_signals;
CREATE POLICY "Users can manage own feedback" ON public.feedback_signals
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile
    INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Create empty preferences
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- COMPLETE!
-- =============================================
