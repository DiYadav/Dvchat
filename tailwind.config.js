module.exports = {
  content: [
    './templates/**/*.html',       // <– You said your HTMLs are here
    './static/src/**/*.js',        // optional if JS uses Tailwind
  ],
  darkMode: 'class',
  theme: {
     extend: {
      colors: {
        'accent-blue': '#48dbfb',
        'dark-bg': '#1a202c',
        'dark-card': '#2d3748',
        'dark-border': '#4a5568',
      }
    }
  },
  plugins: [
    require('tailwind-scrollbar-hide')
  ],
}
