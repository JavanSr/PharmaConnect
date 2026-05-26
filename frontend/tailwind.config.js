/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Material-inspired APOTEKH reskin tokens
        'surface': '#f7faf9',
        'surface-dim': '#d7dbda',
        'surface-bright': '#f7faf9',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f1f4f3',
        'surface-container': '#ebeeed',
        'surface-container-high': '#e6e9e8',
        'surface-container-highest': '#e0e3e2',
        'on-surface': '#181c1c',
        'on-surface-variant': '#3e4946',
        'inverse-surface': '#2d3131',
        'inverse-on-surface': '#eef1f0',
        'outline': '#6e7a76',
        'outline-variant': '#bdc9c5',
        'primary': '#1A6B5C',
        'on-primary': '#ffffff',
        'primary-container': '#EDF7F3',
        'on-primary-container': '#0D4035',
        'inverse-primary': '#7ECFB4',
        'surface-tint': '#1A6B5C',
        'secondary': '#2A9478',
        'on-secondary': '#ffffff',
        'secondary-container': '#D6F0E8',
        'on-secondary-container': '#0D4035',
        'tertiary': '#734a00',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#946000',
        'on-tertiary-container': '#ffe9d2',
        'error': '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
        'background': '#f7faf9',
        'on-background': '#181c1c',
        'surface-variant': '#e0e3e2',
        // ── 3-state interactive palette ──────────────────────────────────
        // Use only these three states for all nav, button, and list interactions:
        //   hover-fill   → light green bg on hover
        //   active-fill  → solid teal bg when item is selected / current page
        //   gold         → amber accent for badges, highlights, indicators
        'hover-fill':  '#D6F0E8',   // pc-100  light green hover background
        'hover-text':  '#0D4035',   // pc-800  dark teal text on hover
        'active-fill': '#1A6B5C',   // pc-600  brand teal active background
        'active-text': '#ffffff',   // white   text on active
        'gold':        '#E8A020',   // amber   accent (logo right node)
        'on-gold':     '#0D4035',   // pc-800  dark text on gold background
        // ─────────────────────────────────────────────────────────────────
        'aware-access': '#2e7d32',
        'aware-watch': '#e65100',
        'aware-reserve': '#b71c1c',
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
      spacing: {
        'touch-target-min': '48px',
        'gutter':           '16px',
        'margin-mobile':    '16px',
        'margin-tablet':    '24px',
        'stack-sm':         '8px',
        'stack-md':         '16px',
        'stack-lg':         '24px',
      },
      fontSize: {
        'display-lg':        ['57px',  { lineHeight: '64px',  letterSpacing: '-0.25px', fontWeight: '400' }],
        'headline-lg':       ['32px',  { lineHeight: '40px',  fontWeight: '600' }],
        'headline-md':       ['28px',  { lineHeight: '36px',  fontWeight: '600' }],
        'headline-lg-mobile':['28px',  { lineHeight: '34px',  fontWeight: '600' }],
        'title-lg':          ['22px',  { lineHeight: '28px',  fontWeight: '500' }],
        'title-md':          ['16px',  { lineHeight: '24px',  letterSpacing: '0.15px', fontWeight: '600' }],
        'body-lg':           ['16px',  { lineHeight: '24px',  letterSpacing: '0.5px',  fontWeight: '400' }],
        'body-md':           ['14px',  { lineHeight: '20px',  letterSpacing: '0.25px', fontWeight: '400' }],
        'label-lg':          ['14px',  { lineHeight: '20px',  letterSpacing: '0.1px',  fontWeight: '500' }],
        'label-md':          ['12px',  { lineHeight: '16px',  letterSpacing: '0.5px',  fontWeight: '500' }],
      },
      boxShadow: {
        sm:  '0 1px 3px rgba(13,64,53,0.08)',
        md:  '0 4px 12px rgba(13,64,53,0.12)',
        lg:  '0 8px 24px rgba(13,64,53,0.16)',
        xl:  '0 16px 48px rgba(13,64,53,0.20)',
      },
      borderRadius: {
        'DEFAULT': '0.25rem',
        'md':      '0.5rem',
        'lg':      '1rem',
        'xl':      '1.5rem',
        'full':    '9999px',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
