# Vite React TypeScript Movie App

This project is a modern web application for browsing and discovering movies, built with **React**, **TypeScript**, and **Vite**. It fetches movie data from [The Movie Database (TMDB)](https://www.themoviedb.org/) and displays information such as titles, ratings, and trailers. The app uses **Tailwind CSS** for styling and follows best practices with **ESLint** and **TypeScript** configurations.

> **Important:**  
> You must use a VPN set to the **USA** for the app to work. Without a USA-based VPN, the app will not function correctly due to TMDB API restrictions.

---

## Features

- Browse and search for movies using TMDB data
- View movie details, ratings, and trailers (YouTube embeds)
- Responsive and modern UI with Tailwind CSS
- Fast development experience with Vite
- TypeScript for type safety
- Linting with ESLint

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A VPN service (set to USA)

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

   The project uses a `.env` file for the TMDB API key.  
   By default, a sample `.env` is provided:

   ```
   VITE_TMDB_API_KEY=your_tmdb_api_key_here
   ```

   Replace `your_tmdb_api_key_here` with your own TMDB API key if needed.

4. **Connect your VPN and set it to the USA.**

   > The app will not work unless your VPN is set to a USA location.

5. **Start the development server:**

   ```bash
   npm run dev
   ```

6. **Open your browser:**

   Visit [http://localhost:3000](http://localhost:3000) (or the URL shown in your terminal).

---

## Scripts

- `npm run dev` — Start the development server
- `npm run build` — Build the app for production
- `npm run preview` — Preview the production build
- `npm run lint` — Lint the codebase

---

## Project Structure

```
├── src/                # React source code
│   ├── components/     # React components
│   ├── utils/          # Utility functions (TMDB API, movie matcher, etc.)
│   └── main.tsx        # App entry point
├── public/             # Static assets
├── index.html          # Main HTML file
├── tailwind.config.js  # Tailwind CSS configuration
├── vite.config.ts      # Vite configuration
├── .env                # Environment variables (TMDB API key)
├── package.json        # Project metadata and scripts
└── ...                 # Other config files
```

---

## Notes

- The app uses the TMDB API and may be subject to their usage limits and regional restrictions.
- Make sure your VPN is active and set to the USA before using the app.
- For any issues or feature requests, please open an issue on the repository.

---

## License

This project is licensed under the MIT License.

---

**Enjoy discovering movies!**