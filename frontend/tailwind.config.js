/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nutrition: {
          protein: '#10b981', // Emerald
          carbs: '#f59e0b',   // Amber
          fat: '#f43f5e',     // Rose
          fiber: '#14b8a6',   // Teal
          calories: '#6366f1' // Indigo
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
