/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        editor: {
          bg: '#0b1020',
          panel: '#11182c',
          border: '#1f2a44',
          text: '#e2e8f0',
          dim: '#94a3b8',
          accent: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};
