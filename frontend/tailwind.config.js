/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        term: {
          bg: '#080b0a',
          panel: '#0d1411',
          border: '#1b2a22',
          green: '#22ff9c',
          dim: '#3ba676',
          cyan: '#22d3ee',
          amber: '#fbbf24',
          red: '#ff5c66',
          text: '#c7f9e0',
          muted: '#5c7d6c',
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        blink: { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '0' } },
        thinking: {
          '0%,80%,100%': { transform: 'scaleY(0.35)', opacity: '0.35' },
          '40%': { transform: 'scaleY(1)', opacity: '1' },
        },
        glowPulse: {
          '0%,100%': { boxShadow: '0 0 0 1px rgba(34,255,156,0.25)' },
          '50%': { boxShadow: '0 0 24px -2px rgba(34,255,156,0.55)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        scan: { from: { transform: 'translateY(-120%)' }, to: { transform: 'translateY(120%)' } },
      },
      animation: {
        blink: 'blink 1s steps(1) infinite',
        thinking: 'thinking 1s infinite ease-in-out',
        glowPulse: 'glowPulse 1.8s ease-in-out infinite',
        fadeIn: 'fadeIn 0.3s ease both',
        scan: 'scan 3.5s linear infinite',
      },
    },
  },
  plugins: [],
}
