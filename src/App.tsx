import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Temple from './pages/Temple'; // <--- Importe o Templo

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/portal" element={<Login />} />
        <Route path="/iniciacao" element={<Register />} />
        
        {/* Rota Principal */}
        <Route path="/templo" element={<Temple />} /> 

        <Route path="*" element={<div className="p-10 text-center text-netzach-muted">Caminho desconhecido.</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;