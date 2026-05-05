/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        bg: '#0a0a0f',
        surface: '#12121a',
        card: '#1a1a26',
        border: '#252535',
        accent: {
          DEFAULT: '#7c6aff',
          light: '#a89aff',
          dim: '#3d2fa0',
        },
        gold: '#f5c542',
        green: {
          DEFAULT: '#34d399',
          dim: '#0d3d2d',
        },
        red: {
          DEFAULT: '#f87171',
          dim: '#3d0d0d',
        },
        text: {
          primary: '#f0f0ff',
          secondary: '#9090b8',
          muted: '#5a5a80',
        },
      },
    },
  },
  plugins: [],
};
