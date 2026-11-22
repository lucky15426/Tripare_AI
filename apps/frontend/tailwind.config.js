/** @type {import('tailwindcss').Config} */
// Palette: dark teal #172C35, warm ivory #F4F1E9, terracotta #C87952, muted olive #74816A, secondary text #6D7477.
// Legacy token names (navy / brand / saving) are kept so existing components pick up the new identity.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#0f1e25', 900: '#172C35', 800: '#233f4b', 700: '#35545f', 500: '#6D7477', 400: '#98a0a1', 300: '#c4c3b9', 200: '#ddd7c8', 100: '#e8e3d6', 50: '#F4F1E9' },
        brand: { 50: '#f8ece4', 100: '#f1d9ca', 500: '#C87952', 600: '#C87952', 700: '#a65d39' },
        saving: { 50: '#edf0e9', 600: '#74816A', 700: '#59663f' },
        teal: { DEFAULT: '#172C35' },
        ivory: '#F4F1E9',
        terracotta: '#C87952',
        olive: '#74816A',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: { card: '0 1px 0 rgba(23,44,53,0.04)' },
    },
  },
  plugins: [],
};
