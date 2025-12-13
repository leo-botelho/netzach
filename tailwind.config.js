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
          bg: '#0F0518',       // Roxo Quase Preto (Fundo)
          card: '#1A0B2E',     // Roxo Profundo (Cards)
          gold: '#C5A059',     // Dourado Antigo (Texto destaque)
          text: '#EFE6F7',     // Lavanda Claro (Texto comum)
          muted: '#88769D',    // Roxo Acinzentado (Texto secundário)
          border: '#362052',   // Borda Roxa
          accent: '#700B97',   // Roxo Vibrante (Botões)
        }
      },
      backgroundImage: {
        'stars': "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
      }
    },
  },
  plugins: [],
}