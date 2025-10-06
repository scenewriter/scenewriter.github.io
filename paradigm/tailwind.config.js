/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // you don’t need `theme.extend.colors` etc. in v4 — those come from @theme in CSS
  theme: {
    extend: {},
  },
  plugins: [
    // still works fine for utilities like animations
    require("tailwindcss-animate"),
  ],
}
