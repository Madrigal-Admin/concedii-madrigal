/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1c2230',
        slate: {
          925: '#0f1420',
        },
        brand: {
          50: '#f0f5ff',
          100: '#dbe7fe',
          200: '#bcd2fe',
          300: '#8db3fd',
          400: '#5a8bfa',
          500: '#3566f0',
          600: '#254bd4',
          700: '#1f3caa',
          800: '#1f3488',
          900: '#1e2e6e',
        },
        clay: {
          500: '#c96f4a',
          600: '#b25a37',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
