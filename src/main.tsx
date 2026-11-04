import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css' // <--- ESSA LINHA FAZ O TAILWIND FUNCIONAR
import { instalarRecargaAoAtualizar } from './lib/atualizacaoDoApp'

// Abre a versão nova assim que o service worker a assume; ver o arquivo.
if ('serviceWorker' in navigator) {
  const CHAVE = 'netzach_ultima_recarga'
  instalarRecargaAoAtualizar({
    sw: navigator.serviceWorker,
    documento: document,
    janela: window,
    recarregar: () => window.location.reload(),
    guardarRecarga: {
      ler: () => { try { return Number(sessionStorage.getItem(CHAVE) ?? 0) } catch { return 0 } },
      gravar: (agora) => { try { sessionStorage.setItem(CHAVE, String(agora)) } catch { /* sem armazenamento */ } },
    },
    agora: () => Date.now(),
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)