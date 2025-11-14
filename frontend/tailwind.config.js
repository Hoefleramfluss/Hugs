/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#22c55e', // green-500
        'primary-dark': '#16a34a', // green-600
        'secondary': '#f97316', // orange-500
        'background': '#f8fafc', // slate-50
        'surface': '#ffffff',
        'surface-light': '#f1f5f9', // slate-100
        'on-surface': '#0f172a', // slate-900
        'on-surface-variant': '#64748b', // slate-500
      },
      keyframes: {
        'slide-in-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in-up': {
            '0%': {
                opacity: '0',
                transform: 'translateY(10px)'
            },
            '100%': {
                opacity: '1',
                transform: 'translateY(0)'
            },
        },
      },
      animation: {
        'slide-in-up': 'slide-in-up 0.5s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.5s ease-in-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
};
