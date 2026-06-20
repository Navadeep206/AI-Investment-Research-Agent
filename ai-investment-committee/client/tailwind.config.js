/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#090D1A',
        cardBg: '#13192B',
        panelBg: '#1C253D',
        accentPrimary: '#6366F1', // indigo
        accentSecondary: '#8B5CF6', // violet
        accentCyan: '#06B6D4', // cyan
        accentGreen: '#10B981', // emerald/green
        borderDark: '#202C45',
        textMuted: '#94A3B8',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'neon': '0 0 15px rgba(99, 102, 241, 0.4)',
        'neon-cyan': '0 0 15px rgba(6, 182, 212, 0.4)',
      }
    },
  },
  plugins: [],
}
