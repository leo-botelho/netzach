import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Temple from './pages/Temple';
import AdminPanel from './pages/AdminPanel';
import Services from './pages/Services';
import Rituals from './pages/Rituals';
import MatrizDestinoPage from './pages/MatrizDestinoPage';
import Checkout from './pages/checkout'; // Importe a página nova

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PÚBLICO */}
        <Route path="/" element={<Home />} />
        
        {/* NOVA ROTA DE PAGAMENTO */}
        <Route path="/assinar" element={<Checkout />} />

        {/* Autenticação */}
        <Route path="/portal" element={<Login />} />
        <Route path="/iniciacao" element={<Register />} />
        
        {/* LOGADO (ALUNA) */}
        <Route path="/templo" element={<Temple />} />
        <Route path="/servicos" element={<Services />} />
        <Route path="/rituais" element={<Rituals />} />
        <Route path="/matriz" element={<MatrizDestinoPage />} />
        
        {/* ADMIN */}
        <Route path="/admin" element={<AdminPanel />} />

        <Route path="*" element={<div className="min-h-screen bg-[#0F0518] flex items-center justify-center text-gray-500">Caminho desconhecido.</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;