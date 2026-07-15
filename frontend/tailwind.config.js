/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        devanagari: ['"Noto Sans Devanagari"', 'ui-serif', 'system-ui', 'sans-serif']
      },
      /* Palette aligned with landing sage/forest green */
      colors: {
        brand: {
          deep: '#1a301a',
          navy: '#1a301a',
          royal: '#2d5a3d',
          sky: '#3d7350',
          gold: '#c9a43a',
          'gold-bright': '#e8c547',
          surface: '#f2f8ee'
        },
        primary: '#2d5a3d',
        ink: '#1a301a',
        muted: '#3d5c4a'
      },
      boxShadow: {
        soft: '0 18px 50px rgba(26, 48, 26, 0.1)',
        card: '0 20px 50px rgba(26, 48, 26, 0.14)'
      }
    }
  },
  plugins: []
};
