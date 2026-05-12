/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pc: {
          50:  '#EDF7F3',
          100: '#D6F0E8',
          200: '#AFDFD3',
          300: '#7ECABB',
          400: '#4EB4A2',
          500: '#2A9478',
          600: '#1A6B5C',
          700: '#145748',
          800: '#0D4035',
          900: '#082B23',
        },
        teal: {
          DEFAULT: '#1A6B5C',
          mid:     '#2A9478',
          dk:      '#0D4035',
        },
        brand: {
          text:   '#0D4035',
          bg:     '#EDF7F3',
          border: '#D6F0E8',
        },
      },
      fontFamily: {
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['DM Serif Display', 'Georgia', 'serif'],
        mono:    ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        sm:  '0 1px 3px rgba(13,64,53,0.08)',
        md:  '0 4px 12px rgba(13,64,53,0.12)',
        lg:  '0 8px 24px rgba(13,64,53,0.16)',
        xl:  '0 16px 48px rgba(13,64,53,0.20)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
