/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: 'rgb(var(--dap-brand-400) / <alpha-value>)',
          500: 'rgb(var(--dap-brand-500) / <alpha-value>)',
          600: 'rgb(var(--dap-brand-600) / <alpha-value>)',
          700: 'rgb(var(--dap-brand-700) / <alpha-value>)',
          800: '#155e75',
          900: 'rgb(var(--dap-brand-900) / <alpha-value>)',
        },
        primary: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        dark: {
          bg: 'rgb(var(--dap-bg) / <alpha-value>)',
          card: 'rgb(var(--dap-card) / <alpha-value>)',
          border: 'rgb(var(--dap-border) / <alpha-value>)',
          hover: 'rgb(var(--dap-hover) / <alpha-value>)',
          text: 'rgb(var(--dap-text) / <alpha-value>)',
          muted: 'rgb(var(--dap-muted) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
