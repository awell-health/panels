import type { Config } from 'tailwindcss'

const config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
  daisyui: {
    themes: [
      {
        'github-light': {
          primary: '#0969da',
          'primary-content': '#ffffff',
          secondary: '#656d76',
          'secondary-content': '#ffffff',
          accent: '#0550ae',
          'accent-content': '#ffffff',
          neutral: '#d0d7de',
          'neutral-content': '#24292f',
          'base-100': '#ffffff',
          'base-200': '#f6f8fa',
          'base-300': '#e1e4e8',
          'base-content': '#24292f',
          info: '#0969da',
          'info-content': '#ffffff',
          success: '#1a7f37',
          'success-content': '#ffffff',
          warning: '#bf8700',
          'warning-content': '#24292f',
          error: '#cf222e',
          'error-content': '#ffffff',
          '--rounded-box': '0.5rem',
          '--rounded-btn': '0.375rem',
          '--rounded-badge': '1.9rem',
          '--animation-btn': '0.25s',
          '--animation-input': '0.2s',
          '--btn-focus-scale': '0.95',
          '--border-btn': '1px',
          '--tab-border': '1px',
          '--tab-radius': '0.5rem',
        },
      },
      'light',
      'dark',
    ],
  },
}

export default config
