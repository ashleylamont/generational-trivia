/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Dark charcoal base UI — reads well in a lamp-lit lounge room.
        ink: {
          900: '#0d0f14',
          800: '#151821',
          700: '#1e222e',
          600: '#2a2f3d',
          500: '#3a4150',
        },
      },
      fontFamily: {
        // One characterful display face for titles/badges; one clean body face.
        display: ['"Baloo 2"', '"Fredoka"', 'system-ui', 'sans-serif'],
        body: ['"Nunito Sans"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        popIn: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        flyUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        riseUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        popIn: 'popIn 350ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        flyUp: 'flyUp 300ms ease-out both',
        riseUp: 'riseUp 600ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
