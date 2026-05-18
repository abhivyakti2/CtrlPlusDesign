/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0f0f0f',
        secondary: '#1a1a1a',
        tertiary: '#252525',
        hover: '#3a3a3a',
        'text-primary': '#ffffff',
        'text-secondary': '#b4b4b4',
        'text-muted': '#7c7c7c',
        border: '#2d2d2d',
        'border-light': '#3a3a3a',
        accent: '#5b7fff',
        'accent-hover': '#4965dd',
        'accent-glow': 'rgba(91, 127, 255, 0.08)',
        error: '#ff5c5c',
        success: '#3ecf8e',
        warning: '#f5a623',
        purple: '#a78bfa',
        'canvas-bg': '#1a1a1a',
      },
      fontFamily: {
        serif: ['Instrument Serif', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.2)',
        'lg-glow': '0 10px 15px rgba(91, 127, 255, 0.1)',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
};
