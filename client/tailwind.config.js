/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          website: {
            blue: '#223d66',
            gold: '#cca43b',
            darkGold: '#bc9631',
            lightGray: '#e5e5e5',
            darkGray: '#363636'
          }
        }
      },
    },
    plugins: [],
  }