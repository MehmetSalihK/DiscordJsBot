/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cyanGlass: {
          50: '#E6FFFB',
          100: '#C3FFF5',
          200: '#9BFFEE',
          300: '#6AFAE3',
          400: '#3EEED7',
          500: '#17E0CA',
          600: '#12B6A6',
          700: '#0E8D83',
          800: '#0A635F',
          900: '#073E3C',
        },
      },
      boxShadow: {
        glass: '0 8px 30px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
};