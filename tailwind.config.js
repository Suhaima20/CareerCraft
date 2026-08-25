/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Light theme
        primary: {
          DEFAULT: '#403D88',
          dark: '#1F150C',
        },
        secondary: {
          DEFAULT: '#8B639B',
        },
        accent: {
          DEFAULT: '#AF719D',
        },
        surface: {
          DEFAULT: '#E8D1C5',
        },
        cream: {
          DEFAULT: '#F3E8DF',
        },
        ink: {
          DEFAULT: '#1F150C',
          muted: '#57595B',
        },
        // Dark theme
        darkbg: {
          DEFAULT: '#0a0a0a',
          card: '#1F150C',
          elevated: '#412D15',
        },
        darkplum: '#452829',
        darktext: {
          DEFAULT: '#F3E8DF',
          muted: '#E8D1C5',
        },
        // Semantic
        success: '#3B7A57',
        warning: '#C99A2E',
        error: '#B5444B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
      },
      borderRadius: {
        'xl2': '1.25rem',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card': '0 4px 16px rgba(0,0,0,0.08)',
        'lift': '0 8px 24px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};
