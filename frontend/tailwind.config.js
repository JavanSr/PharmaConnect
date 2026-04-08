/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pc: {
          50:  '#EDF7F3',
          100: '#D6F0E8',
          200: '#AADDD0',
          300: '#7DC9B6',
          400: '#4FB49A',
          500: '#2A9478',
          600: '#1A6B5C',   // primary
          700: '#145748',
          800: '#0D4035',   // dark
          900: '#062820',
        },
        // Keep these aliases for backward compat during transition
        teal: {
          DEFAULT: '#1A6B5C',
          lt:  '#D6F0E8',
          dk:  '#0D4035',
          mid: '#2A9478',
        },
        amber: {
          DEFAULT: '#D97706',
          lt: '#FEF3C7',
          dk: '#633806',
        },
        coral: {
          DEFAULT: '#DC2626',
          lt: '#FEE2E2',
        },
        brand: {
          text:   '#0D4035',
          muted:  '#64748B',
          bg:     '#EDF7F3',
          border: '#D6F0E8',
        },
      },
      fontFamily: {
        sans:    ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['DM Serif Display', 'Georgia', 'serif'],
        mono:    ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      borderRadius: {
        sm:   '6px',
        md:   '8px',
        lg:   '12px',
        card: '16px',
        xl:   '16px',
        '2xl':'24px',
        pill: '9999px',
      },
      boxShadow: {
        sm:   '0 1px 3px rgba(13,64,53,0.08)',
        md:   '0 4px 12px rgba(13,64,53,0.10)',
        lg:   '0 8px 32px rgba(13,64,53,0.12)',
        card: '0 2px 8px rgba(13,64,53,0.06)',
      },
      spacing: {
        '4.5': '18px',
        '13':  '52px',
        '15':  '60px',
        '18':  '72px',
      },
      animation: {
        'slide-in-right': 'slideInRight 0.3s ease',
        'slide-out-right': 'slideOutRight 0.3s ease',
        'fade-in': 'fadeIn 0.2s ease',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          from: { transform: 'translateX(0)', opacity: '1' },
          to: { transform: 'translateX(100%)', opacity: '0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
