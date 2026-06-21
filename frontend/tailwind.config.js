/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#1e2a3a',
        surface2: '#243447',
        border: '#2f4460',
        accent: '#3d7ab5',
        text: '#f0f4f8',
        muted: '#8fa8c0'
      },
      boxShadow: {
        soft: '0 4px 20px rgba(0,0,0,0.25)'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
