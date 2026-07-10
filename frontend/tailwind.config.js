/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        term: {
          bg: 'rgb(var(--term-bg) / <alpha-value>)',
          panel: 'rgb(var(--term-panel) / <alpha-value>)',
          border: 'rgb(var(--term-border) / <alpha-value>)',
          green: 'rgb(var(--term-green) / <alpha-value>)',
          dim: 'rgb(var(--term-dim) / <alpha-value>)',
          cyan: 'rgb(var(--term-cyan) / <alpha-value>)',
          amber: 'rgb(var(--term-amber) / <alpha-value>)',
          red: 'rgb(var(--term-red) / <alpha-value>)',
          text: 'rgb(var(--term-text) / <alpha-value>)',
          muted: 'rgb(var(--term-muted) / <alpha-value>)',
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
