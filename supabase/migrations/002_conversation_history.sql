-- =============================================
-- SUPABASE DATABASE MIGRATION
-- Conversation History with Semantic Search
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable vector extension for embeddings (if using pgvector)
-- Note: Supabase Free tier may not have pgvector enabled
-- We'll use a text-based approach as fallback

-- =============================================
-- CONVERSATION HISTORY
-- =============================================
CREATE TABLE IF NOT EXISTS public.conversation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    message_type TEXT NOT NULL, -- 'user_query', 'ai_response', 'system'
    content TEXT NOT NULL,
    media_type TEXT, -- 'movie', 'tv', 'anime'
    metadata JSONB DEFAULT '{}'::JSONB,
    -- Store embedding as a simple array for future vector search
    -- Using text search as fallback for free tier
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', content || ' ' || COALESCE(metadata->>'mediaType', ''))
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CONVERSATION SUMMARIES (for quick context retrieval)
-- =============================================
CREATE TABLE IF NOT EXISTS public.conversation_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    original_query TEXT NOT NULL,
    summary_text TEXT,
    genres_mentioned TEXT[],
    media_type TEXT,
    movie_titles TEXT[],
    accepted_movies JSONB DEFAULT '[]'::JSONB,
    rejected_movies JSONB DEFAULT '[]'::JSONB,
    total_messages INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, session_id)
);

-- =============================================
-- USER MEMORY (long-term preferences learned from conversations)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_type TEXT NOT NULL, -- 'genre_preference', 'actor_preference', 'director_preference', 'mood_preference'
    entity_name TEXT NOT NULL,
    entity_type TEXT, -- 'genre', 'actor', 'director', 'mood', 'movie'
    confidence_score REAL DEFAULT 1.0,
    occurrence_count INTEGER DEFAULT 1,
    last_mentioned_at TIMESTAMPTZ DEFAULT NOW(),
    context_text TEXT, -- Example of how it was mentioned
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, memory_type, entity_name)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_conversation_history_user ON public.conversation_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_history_session ON public.conversation_history(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_conversation_history_search ON public.conversation_history USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user ON public.conversation_summaries(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_memory_user ON public.user_memory(user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_user_memory_entity ON public.user_memory(user_id, entity_name);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

-- Users can only see their own conversations
CREATE POLICY "Users can view own conversation_history"
    ON public.conversation_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation_history"
    ON public.conversation_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own conversation_summaries"
    ON public.conversation_summaries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation_summaries"
    ON public.conversation_summaries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversation_summaries"
    ON public.conversation_summaries FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own user_memory"
    ON public.user_memory FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own user_memory"
    ON public.user_memory FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own user_memory"
    ON public.user_memory FOR UPDATE
    USING (auth.uid() = user_id);

-- =============================================
-- FUNCTION: Get conversation context for AI
-- =============================================
CREATE OR REPLACE FUNCTION get_conversation_context(p_user_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
    session_id UUID,
    original_query TEXT,
    summary_text TEXT,
    genres_mentioned TEXT[],
    movie_titles TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.session_id,
        cs.original_query,
        cs.summary_text,
        cs.genres_mentioned,
        cs.movie_titles
    FROM public.conversation_summaries cs
    WHERE cs.user_id = p_user_id
    ORDER BY cs.updated_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Get user memory/preferences
-- =============================================
CREATE OR REPLACE FUNCTION get_user_memory(p_user_id UUID, p_memory_type TEXT DEFAULT NULL)
RETURNS TABLE (
    memory_type TEXT,
    entity_name TEXT,
    entity_type TEXT,
    confidence_score REAL,
    occurrence_count INTEGER,
    context_text TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        um.memory_type,
        um.entity_name,
        um.entity_type,
        um.confidence_score,
        um.occurrence_count,
        um.context_text
    FROM public.user_memory um
    WHERE um.user_id = p_user_id
      AND (p_memory_type IS NULL OR um.memory_type = p_memory_type)
    ORDER BY um.confidence_score DESC, um.occurrence_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Search similar past conversations (text-based)
-- =============================================
CREATE OR REPLACE FUNCTION search_past_conversations(
    p_user_id UUID, 
    p_query TEXT, 
    p_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    created_at TIMESTAMPTZ,
    session_id UUID,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ch.id,
        ch.content,
        ch.created_at,
        ch.session_id,
        ts_rank(ch.search_vector, plainto_tsquery('english', p_query)) as rank
    FROM public.conversation_history ch
    WHERE ch.user_id = p_user_id
      AND ch.search_vector @@ plainto_tsquery('english', p_query)
    ORDER BY rank DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Update memory confidence based on new interaction
-- =============================================
CREATE OR REPLACE FUNCTION update_user_memory(
    p_user_id UUID,
    p_memory_type TEXT,
    p_entity_name TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_context TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.user_memory (user_id, memory_type, entity_name, entity_type, context_text)
    VALUES (p_user_id, p_memory_type, p_entity_name, p_entity_type, p_context)
    ON CONFLICT (user_id, memory_type, entity_name)
    DO UPDATE SET
        occurrence_count = user_memory.occurrence_count + 1,
        confidence_score = LEAST(1.0, user_memory.confidence_score + 0.1),
        last_mentioned_at = NOW(),
        context_text = COALESCE(p_context, user_memory.context_text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENT
-- =============================================
COMMENT ON TABLE public.conversation_history IS 'Stores individual messages in conversations for semantic search';
COMMENT ON TABLE public.conversation_summaries IS 'High-level summaries of conversation sessions';
COMMENT ON TABLE public.user_memory IS 'Learned user preferences from conversation history';
