/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#10B981',
        'primary-dark': '#059669',
        'primary-light': '#D1FAE5',
        'primary-lighter': '#ECFDF5',
        danger: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        surface: '#FFFFFF',
        background: '#F8FAFC',
        border: '#E2E8F0',
        muted: '#94A3B8',
        subtle: '#64748B',
      },
    },
  },
  plugins: [],
};
