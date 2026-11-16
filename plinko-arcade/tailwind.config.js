/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        xs: '440px',
      },
      colors: {
        night: '#0B0B16',
        panel: '#29243E',
        panel2: '#211C35',
        arcade: {
          purple: '#8B5CF6',
          pink: '#FF6FA9',
          gold: '#FFC94A',
          green: '#35D399',
          cyan: '#48D8FF',
        },
      },
      fontFamily: {
        arcade: ['"Lilita One"', 'Bungee', 'system-ui', 'sans-serif'],
        display: ['Bungee', '"Lilita One"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glowGold: '0 0 22px rgba(255,201,74,.45)',
        glowPurple: '0 0 22px rgba(139,92,246,.5)',
        glowPink: '0 0 22px rgba(255,111,169,.45)',
      },
    },
  },
  plugins: [],
};
