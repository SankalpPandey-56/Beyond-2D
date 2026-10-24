/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        blender: {
          dark: '#1e1e1e',
          panel: '#282828',
          header: '#303030',
          border: '#3c3c3c',
          accent: '#eb7724', // classic Blender orange accent
          accentHover: '#f38938',
          text: '#cfcfcf',
          muted: '#808080',
          active: '#4772b3', // Blender blue selection
        }
      }
    },
  },
  plugins: [],
};
