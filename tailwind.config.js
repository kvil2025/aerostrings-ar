/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#050508',
          card: 'rgba(13, 37, 96, 0.25)',
          border: 'rgba(0, 242, 255, 0.2)',
          cyan: '#00f2ff',
          'cyan-glow': 'rgba(0, 242, 255, 0.4)',
          orange: '#EF3800',
          navy: '#0D2560',
          gold: '#f59e0b',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', filter: 'drop-shadow(0 0 8px rgba(0, 242, 255, 0.6))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 16px rgba(0, 242, 255, 0.9))' },
        }
      }
    },
  },
  plugins: [],
}
