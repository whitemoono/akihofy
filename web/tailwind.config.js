/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff5f7',
          100: '#ffecf0',
          200: '#ffd9e3',
          300: '#ffb3cc',
          400: '#ff8ab8',
          500: '#ff6b9d',
          600: '#f85c8c',
          700: '#d44a7a',
          800: '#b33d68',
          900: '#963358',
        },
        sakura: '#ffb7c5',
        mint: '#98d8c8',
        sky: '#87ceeb',
        cream: '#fef6e4',
        peach: '#ffdab9',
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        glass: {
          bg: 'rgba(255, 255, 255, 0.45)',
          border: 'rgba(255, 255, 255, 0.7)',
          input: 'rgba(255, 255, 255, 0.6)',
        },
        dark: {
          100: '#2d2d4a',
          200: '#25253d',
          300: '#1a1a2e',
          400: '#15152a',
        },
        table: {
          header: 'rgba(248, 250, 252, 0.8)',
          row: {
            even: 'rgba(255, 255, 255, 0.4)',
            odd: 'rgba(248, 250, 252, 0.3)',
            hover: 'rgba(139, 92, 246, 0.08)',
            selected: 'rgba(139, 92, 246, 0.15)',
          },
          border: 'rgba(226, 232, 240, 0.6)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Noto Sans SC', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(255, 107, 157, 0.15)',
        'glow': '0 0 20px rgba(255, 107, 157, 0.4)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'glass': '0 12px 40px 0 rgba(31, 38, 135, 0.05)',
        'glass-panel': '-10px 12px 40px rgba(31, 38, 135, 0.03)',
        'table': '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        'table-hover': '0 0 0 2px rgba(139, 92, 246, 0.15)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'bounce-soft': 'bounce-soft 2s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'ambient-float': 'ambientFloat 10s infinite ease-in-out alternate',
        'table-row-enter': 'tableRowEnter 0.3s ease-out forwards',
        'table-sort': 'tableSort 0.2s ease-out',
      },
      keyframes: {
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.1)' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'ambientFloat': {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '100%': { transform: 'translate(3vw, 2vh) scale(1.05)' },
        },
        'tableRowEnter': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'tableSort': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      transitionDuration: {
        '400': '400ms',
      },
      zIndex: {
        'table': '10',
        'table-header': '20',
        'table-dropdown': '30',
        'table-modal': '40',
      },
    },
  },
  plugins: [],
}
