/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lato', 'sans-serif'], 
        mystic: ['Cinzel', 'serif'],
      },
      colors: {
        netzach: {
          bg: '#1C0A38',       // Violeta Escuro (Fundo)
          card: '#2C1452',     // Violeta Médio (Cards)
          gold: '#C5A059',     // Dourado Antigo (Texto destaque)
          text: '#EFE6F7',     // Lavanda Claro (Texto comum)
          muted: '#9E87BB',    // Violeta Suave (Texto secundário)
          border: '#4D2B78',   // Borda Violeta
          accent: '#8B1FC8',   // Violeta Vibrante (Botões)
        }
      },
      backgroundImage: {
        'stars': "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
      }
    },
  },
  plugins: [],
}