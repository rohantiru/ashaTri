/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        asha: {
          orange: '#F4622A',
          orangeLight: '#FF8A5C',
          orangeDim: '#FDE8DF',
          dark: '#1A1208',
          mid: '#3D2E1E',
          muted: '#8C7B6B',
          cream: '#FAF6F1',
          card: '#FFFFFF',
          border: '#EDE5DB',
        },
        asphalt: {
          900: '#0F0F13',
          800: '#18181F',
          700: '#242430',
          600: '#2E2E3C',
        },
        neon: '#00E5CC',
      },
    },
  },
  plugins: [],
}
