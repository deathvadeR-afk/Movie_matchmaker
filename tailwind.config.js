/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base backgrounds
        'cinema': {
          950: '#0a0a0a', // Primary bg
          900: '#121212', // Secondary bg
          800: '#1a1a1a', // Card bg
          700: '#252525', // Elevated
          600: '#2a2a2a', // Hover
          500: '#3a3a3a', // Border darker
        },
        // Amber/Gold accents
        'gold': {
          600: '#d4a853', // Primary accent
          500: '#f5c761', // Secondary accent
          400: '#e8b974', // Hover
          300: '#a68a4b', // Muted
          200: '#8a7240', // Subtle
        },
        // Premium burgundy
        'premium': {
          600: '#8b2942',
          500: '#a83254',
          400: '#c43d66',
        },
        // Text colors
        'cream': {
          100: '#f5f0e6', // Primary text
          200: '#e8e2d6', // Secondary
          300: '#b8b0a4', // Muted
          400: '#8a847a', // Subtle
        },
      },
      fontFamily: {
        'display': ['"Cormorant Garamond"', 'serif'],
        'body': ['"DM Sans"', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0, 0, 0, 0.6)',
        'elevated': '0 8px 40px rgba(0, 0, 0, 0.8)',
        'glow': '0 0 30px rgba(212, 168, 83, 0.3)',
        'glow-lg': '0 0 50px rgba(212, 168, 83, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(212, 168, 83, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'slide-down': 'slideDown 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212, 168, 83, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(212, 168, 83, 0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}
