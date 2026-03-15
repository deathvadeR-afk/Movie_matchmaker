# Movie Matchmaker 2.0

A premium, AI-powered movie, TV series, and anime discovery platform built with **React**, **TypeScript**, and **Vite**. Using **Google's Gemini 2.0 Flash**, it provides semantic recommendations that understand your "vibe," not just keywords.

![App Screenshot](file:///C:/Users/ASUS/.gemini/antigravity/brain/2b2b1868-6153-4bc5-bcd0-279e222ef16a/app_demo.webp)

## 🚀 Key Features

* **🤖 AI-Powered Semantic Search**: Uses Gemini AI to understand complex requests like *"Show me a sad sci-fi movie about isolation."*
* **🧠 Hybrid Recommendation Engine**: Intelligent fallback system that uses AI first, and gracefully degrades to robust heuristic keywords if the AI is unavailable.
* **📺 Multi-Media Support**: Toggle between **Movies**, **TV Series**, and **Anime**.
* **😂 Mood Chips**: Quick-select buttons for instant recommendations based on your desired feeling.
* **💎 Hidden Gems Mode**: A toggle to prioritize underrated, critically acclaimed masterpieces over mainstream blockbusters.
* **🇮🇳 India-Specific Localization**:
  * Showcases streaming availability on Indian providers (JioCinema, Hotstar, Zee5, etc.)
  * Localized language support (Hindi, Bengali, Telugu, etc.)
* **🎬 Cinematic Noir Design**: Premium dark theme with gold accents, elegant serif typography, and film grain textures
* **👤 User Authentication**: Secure OAuth login with Supabase (Google, GitHub)
* **💳 Subscription Management**: Three-tier subscription plans (Free, Pro, Premium) with enhanced features
* **🔑 API Key Management**: Users can manage their own Gemini API keys with usage tracking
* **📊 Admin Dashboard**: Comprehensive analytics for user management, subscription stats, and system health
* **⚡ Redis Caching**: High-performance caching layer for API responses and recommendations

---

## 🧠 Machine Learning & AI Features

### NLP Processing Engine

Advanced natural language understanding for conversational queries:

* **Intent Detection**: Recognizes user intent (recommendation, search, browse, find_similar)
* **Entity Extraction**: Identifies genres, actors, directors, moods, themes, and time periods
* **Temporal Analysis**: Detects recent releases, classics, specific decades, or years
* **Comparative Queries**: Handles "like X but with Y" style requests
* **Query Expansion**: Uses synonyms and related terms for better results
* **Multi-language Support**: Processes queries in Hindi, Bengali, Telugu, Tamil, Korean, Japanese, and more

### Hybrid Recommendation System

Smart two-tier recommendation approach:

1. **AI-First Layer**: Uses Gemini 2.0 Flash for semantic understanding
2. **Heuristic Fallback**: Keyword matching + TMDB Discover API when AI is unavailable
3. **Match Scoring**: Calculates percentage match based on genres, ratings, and popularity

### Sentiment Analysis

Analyzes movie reviews for sentiment:

* **Positive/Negative Word Detection**: Extensive lexicon of sentiment words
* **Emoji/Emoticon Analysis**: Detects sentiment from emoticons
* **Multilingual**: Supports English and Chinese sentiment keywords
* **Review Summarization**: Aggregates sentiments into overall media sentiment

### Anomaly Detection

API health monitoring system:

* **Response Time Tracking**: Monitors average, min, and max response times
* **Error Rate Monitoring**: Tracks failed requests per endpoint
* **Automatic Fallbacks**: Triggers heuristic mode when anomalies detected
* **Severity Classification**: Categorizes issues as low, medium, or critical

### Adaptive User Preferences

Machine learning for personalized recommendations:

* **Genre Scoring**: Tracks user preferences across genres
* **Mood Patterns**: Learns preferred emotional tones
* **Time-of-Day Analysis**: Adapts recommendations based on viewing time
* **Behavior Sessions**: Groups interactions into sessions for pattern analysis
* **Prediction Accuracy**: Continuously improves recommendation accuracy

### Conversation Context

Maintains conversational memory:

* **Context Window**: Remembers previous queries within a session
* **Reference Resolution**: Understands "that movie" or "the one you mentioned"
* **Intent Chaining**: Supports follow-up questions like "more like that" or "but not horror"

---

## 🎨 Visual Design - Cinematic Noir Theme

The application features a complete aesthetic overhaul with our **Cinematic Noir** design system:

* **Color Palette**:
  * Deep black/gray backgrounds (`cinema-950`, `cinema-800`)
  * Warm gold/amber accents (`gold-600`, `gold-400`) for premium elements
  * Burgundy CTA buttons (`premium-600`) for calls-to-action
  * Cream text (`cream-100`) for optimal readability

* **Typography**:
  * Cormorant Garamond (elegant serif) for headings
  * DM Sans for body text
  * JetBrains Mono for code/API keys

* **Visual Effects**:
  * Film grain texture overlay
  * Subtle glow effects on interactive elements
  * Smooth fade-in and slide-up animations
  * Glassmorphic modal overlays

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: React 18, Vite, TypeScript
* **Styling**: Tailwind CSS with custom Cinematic Noir theme
* **AI**: Google Generative AI (Gemini 2.0 Flash)
* **Data Source**: The Movie Database (TMDB) API
* **Icons**: Lucide React

### Backend

- **Runtime**: Node.js with Express
* **Database**: Supabase (PostgreSQL)
* **Cache**: Redis (Upstash)
* **Authentication**: Supabase Auth (OAuth + Email)

---

## 🚦 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (v18+)
* [npm](https://www.npmjs.com/)
* **VPN**: A VPN set to **USA** is required for TMDB API requests to function globally.

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/deathvadeR-afk/Movie_matchmaker.git
   cd Movie_matchmaker
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:

   ```env
   VITE_TMDB_API_KEY=your_tmdb_api_key
   VITE_GEMINI_API_KEY=your_gemini_api_key
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   > You can get a free Gemini key at [Google AI Studio](https://aistudio.google.com/).

4. **Set up the backend server:**

   ```bash
   cd server
   npm install
   ```

   Create a `.env` file in the server directory:

   ```env
   PORT=3001
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   REDIS_URL=your_redis_upstash_url
   JWT_SECRET=your_jwt_secret
   ```

5. **Start the development server:**

   ```bash
   npm run dev
   ```

6. **Start the backend server (optional, for Redis caching):**

   ```bash
   cd server
   npm run dev
   ```

---

## 📁 Project Structure

```
Movie_matchmaker/
├── src/
│   ├── components/
│   │   ├── ui/                    # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── Skeleton.tsx
│   │   ├── AdminDashboard.tsx     # Admin analytics dashboard
│   │   ├── ApiKeyModal.tsx        # API key management
│   │   ├── OnboardingFlow.tsx    # User onboarding
│   │   └── SubscriptionModal.tsx # Subscription plans
│   ├── contexts/
│   │   └── AuthContext.tsx        # Authentication context
│   ├── lib/
│   │   ├── accessControl.tsx     # Role-based access
│   │   ├── apiKeyManager.ts       # API key management
│   │   ├── auth.ts                # Auth utilities
│   │   ├── subscription.ts       # Subscription handling
│   │   └── supabase.ts           # Supabase client
│   ├── pages/
│   │   └── AdminPage.tsx          # Admin page
│   ├── utils/
│   │   ├── gemini.ts              # Google Generative AI
│   │   ├── tmdb.ts                # TMDB API wrapper
│   │   ├── recommendationEngine.ts # Hybrid AI + Heuristic
│   │   ├── nlpProcessor.ts        # NLP query processing
│   │   ├── sentimentAnalyzer.ts   # Review sentiment analysis
│   │   ├── anomalyDetector.ts     # API anomaly monitoring
│   │   ├── userPreferences.ts    # Adaptive learning
│   │   ├── conversationManager.ts # Context management
│   │   ├── cacheManager.ts        # Redis caching
│   │   └── ...
│   ├── App.tsx                   # Main application
│   ├── AppRouter.tsx             # Routing
│   ├── types.ts                  # TypeScript types
│   └── index.css                 # Global styles (Cinematic Noir)
├── server/
│   ├── src/
│   │   ├── index.ts              # Express server
│   │   └── redis.ts              # Redis client
│   └── package.json
├── supabase/
│   └── migrations/               # Database migrations
├── tailwind.config.js            # Custom theme config
└── readme.md
```

---

## 🔧 Configuration

### Redis Cache (Upstash)

The application uses Redis for high-performance caching. To set up:

1. Create a free account at [Upstash](https://upstash.com/)
2. Create a new Redis database
3. Copy the `REDIS_URL` to your server's `.env`

### Supabase Setup

1. Create a project at [Supabase](https://supabase.com/)
2. Run migrations from `supabase/migrations/`
3. Configure OAuth providers in Supabase dashboard

---

## 📋 Subscription Plans

| Feature | Free | Pro | Premium |
|---------|------|-----|---------|
| AI Recommendations | ✅ | ✅ | ✅ |
| Daily Requests | 10 | 50 | Unlimited |
| Hidden Gems Mode | ❌ | ✅ | ✅ |
| Voice Search | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |

---

## 🤝 Contribution Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🛡️ License

This project is licensed under the MIT License.

---

**Built with ❤️ for movie buffs who hate scrolling for hours.**
