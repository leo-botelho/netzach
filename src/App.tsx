import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import SubscriptionGuard from './components/SubscriptionGuard';
import AdminGuard from './components/AdminGuard';
import Home from './pages/Home';
import Login from './pages/Login';

/**
 * Só a landing e o login vêm no pacote inicial. O resto é carregado
 * quando a rota é aberta: antes as 24 telas, o three.js e o painel
 * administrativo inteiro iam num arquivo único de 1,2 MB, baixado por
 * toda visitante que abrisse a home no celular.
 */
const Register           = lazy(() => import('./pages/Register'));
const Checkout           = lazy(() => import('./pages/checkout'));
const Temple             = lazy(() => import('./pages/Temple'));
const Services           = lazy(() => import('./pages/Services'));
const Rituals            = lazy(() => import('./pages/Rituals'));
const MatrizDestinoPage  = lazy(() => import('./pages/MatrizDestinoPage'));
const Sacerdotisa        = lazy(() => import('./pages/Sacerdotisa'));
const DailyCheckin       = lazy(() => import('./pages/DailyCheckin'));
const ProfilePage        = lazy(() => import('./pages/Profile'));
const BanhoPersonalizado = lazy(() => import('./pages/BanhoPersonalizado'));
const ChakraDiagnostico  = lazy(() => import('./pages/ChakraDiagnostico'));
const MagiaLunar         = lazy(() => import('./pages/MagiaLunar'));
const RodaDaVida         = lazy(() => import('./pages/RodaDaVida'));
const Retrospectiva      = lazy(() => import('./pages/Retrospectiva'));
const Numerologia        = lazy(() => import('./pages/Numerologia'));
const SagradoFeminino    = lazy(() => import('./pages/SagradoFeminino'));
const Florais            = lazy(() => import('./pages/Florais'));
const LeiAtracao         = lazy(() => import('./pages/LeiAtracao'));
const Relacionamento     = lazy(() => import('./pages/Relacionamento'));
const MandalaDoMes       = lazy(() => import('./pages/MandalaDoMes'));
const MandalaLunar       = lazy(() => import('./pages/MandalaLunar'));
const DiarioSonhos       = lazy(() => import('./pages/DiarioSonhos'));
const CeuDaSemana        = lazy(() => import('./pages/CeuDaSemana'));
const QuadroDosSonhos    = lazy(() => import('./pages/QuadroDosSonhos'));
const AdminPanel         = lazy(() => import('./pages/AdminPanel'));

/** Mesma linguagem do guard, para a troca de tela não piscar outro texto. */
function Sintonizando() {
  return (
    <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-gold animate-pulse font-mystic text-xl">
      Sintonizando...
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<Sintonizando />}>
            <Routes>
              {/* PÚBLICO */}
              <Route path="/" element={<Home />} />
              <Route path="/assinar" element={<Checkout />} />
              <Route path="/portal" element={<Login />} />
              <Route path="/iniciacao" element={<Register />} />

              {/* PRIVADO — exige sessão; bloqueado se a assinatura expirou */}
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
                <Route path="/mandala-mes" element={<MandalaDoMes />} />
                <Route path="/mandala-lunar" element={<MandalaLunar />} />
                <Route path="/sonhos" element={<DiarioSonhos />} />
                <Route path="/ceu" element={<CeuDaSemana />} />
                <Route path="/quadro-dos-sonhos" element={<QuadroDosSonhos />} />
              </Route>

              {/* ADMIN — verificado antes de montar a página */}
              <Route element={<AdminGuard />}>
                <Route path="/admin" element={<AdminPanel />} />
              </Route>

              <Route path="*" element={
                <div className="min-h-screen bg-netzach-bg flex items-center justify-center text-netzach-muted font-sans">
                  Caminho desconhecido.
                </div>
              } />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
