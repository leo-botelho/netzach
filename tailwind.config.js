/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mystic: ['Cormorant Garamond', 'serif'],
        script: ['Lavishly Yours', 'cursive'],
      },
      colors: {
        netzach: {
          bg: '#1C0A38',       // Noite sagrada (fundo escuro)
          card: '#2C1452',     // Violeta médio (cards)
          gold: '#C5A059',     // Dourado terroso (destaque)
          text: '#EFE6F7',     // Lavanda claro (texto)
          muted: '#9E87BB',    // Violeta suave (texto secundário)
          border: '#4D2B78',   // Borda violeta
          accent: '#8B1FC8',   // Violeta sacerdotisa (botões/CTAs)
          cream: '#F5F0E8',    // Creme ritualístico (fundos claros)
          rose: '#D4A5C9',     // Rosa cíclico (emoção, ciclo)
        }
      },
      backgroundImage: {
        'stars': "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
      }
    },
  },
  plugins: [],
}