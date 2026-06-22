/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#061827',
          900: '#082636',
          800: '#0B1020',
          700: '#0f1e2e',
        },
      },
      backgroundImage: {
        'gradient-navy': 'linear-gradient(135deg, #061827 0%, #082636 50%, #0B1020 100%)',
      },
    },
  },
  plugins: [],
}

