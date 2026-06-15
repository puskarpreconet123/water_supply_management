/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        marine: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38a9f8',
          500: '#0ea5e9',
          600: '#0286c7',
          700: '#036ba1',
          800: '#075a85',
          900: '#0c4a6e',
          950: '#030d1d', // Very dark deep ocean bottom
          card: '#08172c', // Sleek dark card background
          sidebar: '#050f1f', // Darker sidebar
        },
        accent: {
          teal: '#14b8a6', // Water green-teal for positive events
          cyan: '#06b6d4',
          blue: '#2563eb'
        }
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'liquid': 'liquid 8s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.8', filter: 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.4))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 12px rgba(20, 184, 166, 0.7))' },
        },
        liquid: {
          '0%, 100%': { 'border-radius': '60% 40% 70% 30% / 40% 50% 60% 50%' },
          '50%': { 'border-radius': '40% 60% 30% 70% / 50% 60% 40% 50%' },
        }
      }
    },
  },
  plugins: [],
}
