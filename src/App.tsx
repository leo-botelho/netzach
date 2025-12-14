import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Temple from './pages/Temple';
import AdminPanel from './pages/AdminPanel';
import Services from './pages/Services';
import Rituals from './pages/Rituals';
// Importe a Matriz aqui
import  MatrizDestinoPage  from './pages/MatrizDestinoPage'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/portal" element={<Login />} />
        <Route path="/iniciacao" element={<Register />} />
        
        <Route path="/templo" element={<Temple />} />
        <Route path="/servicos" element={<Services />} />
        <Route path="/rituais" element={<Rituals />} />
        
        {/* NOVA ROTA AQUI */}
        <Route path="/matriz" element={<MatrizDestinoPage />} />
        
        <Route path="/admin" element={<AdminPanel />} />

        <Route path="*" element={<div className="min-h-screen bg-[#0F0518] flex items-center justify-center text-gray-500">Caminho desconhecido.</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;