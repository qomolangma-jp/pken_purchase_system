/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mos-green': {
          DEFAULT: '#00873c',
          light: '#00a84d',
          dark: '#006b30',
        },
        'accent': {
          DEFAULT: '#FF5722', // 例：鮮やかなオレンジ
          light: '#FF7043',
          dark: '#E64A19',
        },
      },
      spacing: {
        'responsive-px': 'clamp(1rem, 4vw, 2rem)',
      },
    },
  },
  plugins: [],
}
