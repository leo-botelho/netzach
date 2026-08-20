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
        // Paleta oficial do documento do portal (§13 Identidade Visual).
        // As 5 cores nomeadas no documento entram com o hex exato; os demais
        // tons são derivados delas e validados em contraste WCAG 2.2 AA.
        netzach: {
          deep: '#1B1238',        // Derivado — campos de formulário e overlays
          bg: '#2E1F5E',          // Noite sagrada (documento)
          card: '#3B2A70',        // Derivado — superfície de cards
          card2: '#372667',       // Derivado — fim do gradiente dos cards
          border: '#4E3A8E',      // Derivado — bordas decorativas
          'border-field': '#8674C6', // Derivado — contorno de campos (3.6:1 sobre bg, WCAG 1.4.11)
          text: '#EFE6F7',        // Derivado — texto principal (11.8:1 sobre bg)
          muted: '#B3A1CC',       // Derivado — texto secundário (6.0:1 sobre bg)
          gold: '#C9A84C',        // Dourado lunar (documento)
          accent: '#8B5CF6',      // Violeta sacerdotisa (documento)
          'accent-deep': '#7A46E8', // Derivado — botão sólido com texto branco (5.4:1)
          'accent-soft': '#A78BFA', // Derivado — violeta como texto sobre fundo escuro (5.2:1)
          cream: '#F5F0E8',       // Creme ritualístico (documento)
          rose: '#D4A5C9',        // Rosa cíclico (documento)
        }
      },
      backgroundImage: {
        'stars': "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
      }
    },
  },
  plugins: [],
}