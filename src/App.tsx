import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Temple from './pages/Temple';
import AdminPanel from './pages/AdminPanel';
import Services from './pages/Services';
import Rituals from './pages/Rituals';
import Oracle from './pages/Oracle'; // Opcional, se você fundiu com o Templo pode remover
import Sky from './pages/Sky';       // Opcional, se você fundiu com o Templo pode remover

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PÚBLICO */}
        <Route path="/" element={<Home />} />
        <Route path="/portal" element={<Login />} />
        <Route path="/iniciacao" element={<Register />} />
        
        {/* LOGADO (ALUNA) */}
        <Route path="/templo" element={<Temple />} />
        <Route path="/servicos" element={<Services />} />
        <Route path="/rituais" element={<Rituals />} />
        
        {/* Rotas extras (Opcionais se já estão integradas no Templo) */}
        <Route path="/oraculo" element={<Oracle />} />
        <Route path="/ceu" element={<Sky />} />
        
        {/* ADMIN (Sacerdotisa) */}
        <Route path="/admin" element={<AdminPanel />} />

        {/* 404 */}
        <Route path="*" element={<div className="min-h-screen bg-[#0F0518] flex items-center justify-center text-gray-500">Caminho desconhecido.</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;