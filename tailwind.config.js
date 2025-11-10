/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Important: Disable preflight to avoid conflicts with MUI
  corePlugins: {
    preflight: false, // Disable Tailwind's base styles to avoid conflicts with MUI
  },
  theme: {
    extend: {
      colors: {
        // MUI primary color integration
        primary: {
          DEFAULT: '#1976d2',
          light: '#42a5f5',
          dark: '#1565c0',
        },
      },
    },
  },
  plugins: [],
  // Dark mode support (works with MUI theme)
  darkMode: 'class',
}
