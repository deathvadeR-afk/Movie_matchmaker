# Movie Matchmaker 2.0

A premium, AI-powered movie, TV series, and anime discovery platform built with **React**, **TypeScript**, and **Vite**. Using **Google's Gemini 2.0 Flash**, it provides semantic recommendations that understand your "vibe," not just keywords.

![App Screenshot](file:///C:/Users/ASUS/.gemini/antigravity/brain/2b2b1868-6153-4bc5-bcd0-279e222ef16a/app_demo.webp)

## 🚀 Key Features

*   **🤖 AI-Powered Semantic Search**: Uses Gemini AI to understand complex requests like *"Show me a sad sci-fi movie about isolation."*
*   **🧠 Hybrid Recommendation Engine**: Intelligent fallback system that uses AI first, and gracefully degrades to robust heuristic keywords if the AI is unavailable.
*   **📺 Multi-Media Support**: Toggle between **Movies**, **TV Series**, and **Anime**.
*   **😂 Mood Chips**: Quick-select buttons for instant recommendations based on your desired feeling.
*   **💎 Hidden Gems Mode**: A toggle to prioritize underrated, critically acclaimed masterpieces over mainstream blockbusters.
*   **🇮🇳 India-Specific Localization**: 
    *   Showcases streaming availability on Indian providers (JioCinema, Hotstar, Zee5, etc.).
    *   Localized language support (Hindi, Bengali, Telugu, etc.).
*   **✨ Premium UI**: Modern glassmorphic design, vibrant gradients, and smooth micro-animations.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS
- **AI**: Google Generative AI (Gemini 2.0 Flash)
- **Data Source**: The Movie Database (TMDB) API
- **Icons**: Lucide React

---

## 🚦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/)
- **VPN**: A VPN set to **USA** is required for TMDB API requests to function globally.

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
   ```
   > You can get a free Gemini key at [Google AI Studio](https://aistudio.google.com/).

4. **Start the development server:**
   ```bash
   npm run dev
   ```

---

## 📁 Project Structure

```
├── src/
│   ├── utils/
│   │   ├── gemini.ts            # Google Generative AI integration
│   │   ├── tmdb.ts              # TMDB API wrapper (TV/Movie/Search)
│   │   └── recommendationEngine.ts # Hybrid AI + Heuristic logic
│   ├── App.tsx                  # Main application & premium UI
│   ├── types.ts                 # Unified media & recommendation types
│   └── main.tsx                 # Entry point
├── .env                         # API Keys (Ignored by git)
└── tailwind.config.js           # Design system configuration
```

---

## 🛡️ License

This project is licensed under the MIT License.

---

**Built with ❤️ for movie buffs who hate scrolling for hours.**