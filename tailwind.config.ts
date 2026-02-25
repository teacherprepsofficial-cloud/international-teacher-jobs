import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      colors: {
        bg: '#f4f4f4',
        'card-bg': '#ffffff',
        'card-border': '#e0e0e0',
        'text-primary': '#1a1a1a',
        'text-muted': '#666666',
        'accent-red': '#dc2626',
        'accent-blue': '#2563eb',
        premium: '#fbbf24',
        featured: '#a78bfa',
      },
    },
  },
  plugins: [],
}
export default config
