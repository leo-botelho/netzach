import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Temple from './pages/Temple';
import AdminPanel from './pages/AdminPanel';
import Services from './pages/Services';
import Rituals from './pages/Rituals';
import MatrizDestinoPage from './pages/MatrizDestinoPage';
import Checkout from './pages/checkout';
import Sacerdotisa from './pages/Sacerdotisa';
import DailyCheckin from './pages/DailyCheckin';
import ProfilePage from './pages/Profile';
import BanhoPersonalizado from './pages/BanhoPersonalizado';
import ChakraDiagnostico from './pages/ChakraDiagnostico';
import MagiaLunar from './pages/MagiaLunar';
import RodaDaVida from './pages/RodaDaVida';
import Retrospectiva from './pages/Retrospectiva';
import Numerologia from './pages/Numerologia';
import SagradoFeminino from './pages/SagradoFeminino';
import Florais from './pages/Florais';
import LeiAtracao from './pages/LeiAtracao';
import Relacionamento from './pages/Relacionamento';
import Hooponopono from './pages/Hooponopono';
import CriancaInterior from './pages/CriancaInterior';
import MandalaDoMes from './pages/MandalaDoMes';
import MandalaLunar from './pages/MandalaLunar';
import SubscriptionGuard from './components/SubscriptionGuard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PÚBLICO */}
        <Route path="/" element={<Home />} />
        <Route path="/assinar" element={<Checkout />} />
        <Route path="/portal" element={<Login />} />
        <Route path="/iniciacao" element={<Register />} />

        {/* PRIVADO — bloqueado se assinatura expirou */}
        <Route element={<SubscriptionGuard />}>
          <Route path="/templo" element={<Temple />} />
          <Route path="/servicos" element={<Services />} />
          <Route path="/rituais" element={<Rituals />} />
          <Route path="/matriz" element={<MatrizDestinoPage />} />
          <Route path="/sacerdotisa" element={<Sacerdotisa />} />
          <Route path="/checkin" element={<DailyCheckin />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/banho" element={<BanhoPersonalizado />} />
          <Route path="/chakras" element={<ChakraDiagnostico />} />
          <Route path="/lua" element={<MagiaLunar />} />
          <Route path="/roda-da-vida" element={<RodaDaVida />} />
          <Route path="/retrospectiva" element={<Retrospectiva />} />
          <Route path="/numerologia" element={<Numerologia />} />
          <Route path="/sagrado-feminino" element={<SagradoFeminino />} />
          <Route path="/florais" element={<Florais />} />
          <Route path="/lei-atracao" element={<LeiAtracao />} />
          <Route path="/relacionamento" element={<Relacionamento />} />
          <Route path="/hooponopono" element={<Hooponopono />} />
          <Route path="/crianca-interior" element={<CriancaInterior />} />
          <Route path="/mandala-mes" element={<MandalaDoMes />} />
          <Route path="/mandala-lunar" element={<MandalaLunar />} />
        </Route>

        {/* ADMIN */}
        <Route path="/admin" element={<AdminPanel />} />

        <Route path="*" element={<div className="min-h-screen bg-netzach-bg flex items-center justify-center text-gray-500">Caminho desconhecido.</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
