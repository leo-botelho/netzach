import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sparkles, ArrowRight, Star, Bot } from 'lucide-react';
import CosmicCanvas from '../components/CosmicCanvas';

// ── Scroll reveal hook ───────────────────────────────────────────
function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, visible] as const;
}

// ── Animated headline with per-character reveal ──────────────────
function SplitTitle({ text, delay = 0, className = '' }: { text: string; delay?: number; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {text.split('').map((ch, i) => (
        <span
          key={i}
          className="inline-block char-reveal"
          style={{ animationDelay: `${delay + i * 0.038}s` }}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  );
}

// ── Data ─────────────────────────────────────────────────────────
const FEATURES = [
  {
    glyph: '☽',
    title: 'Mapa Celeste',
    desc: 'Seu horóscopo solar, lunar e ascendente em um só lugar. Orientações semanais alinhadas com o céu do momento.',
  },
  {
    glyph: '⊕',
    title: 'Ciclo Sagrado',
    desc: 'Acompanhe seu ciclo com sabedoria arquetípica. Entenda cada fase e alinhe sua energia com os ciclos da Lua.',
  },
  {
    glyph: '✦',
    title: 'Sacerdotisa Netzach',
    desc: 'Sua guia espiritual com IA. Pergunte sobre banhos, cristais, florais de Bach e rituais — respostas personalizadas.',
  },
];

const STEPS = [
  { n: '01', title: 'Crie seu perfil', desc: 'Configure seu signo solar, lunar, ascendente e data de nascimento para personalizar sua experiência.' },
  { n: '02', title: 'Acesse seu templo', desc: 'Veja suas orientações diárias, fase da lua, carta do tarot da semana e seu ciclo sagrado.' },
  { n: '03', title: 'Desperte sua magia', desc: 'Consulte a Sacerdotisa Netzach, explore sua Matriz da Alma e aprofunde seu autoconhecimento.' },
];

// ── Component ────────────────────────────────────────────────────
export default function Home() {
  const heroContentRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [featRef, featVisible] = useReveal(0.08);
  const [stepsRef, stepsVisible] = useReveal(0.08);
  const [ctaRef, ctaVisible] = useReveal(0.15);

  // ── Hero parallax on scroll ──────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      if (!heroContentRef.current) return;
      const y = window.scrollY;
      heroContentRef.current.style.transform = `translateY(${y * 0.28}px)`;
      heroContentRef.current.style.opacity = String(1 - y * 0.002);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Custom cursor (desktop only) ─────────────────────────────
  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    let cx = -100, cy = -100;
    let tx = -100, ty = -100;
    let rafId: number;

    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };
    window.addEventListener('mousemove', onMove);

    const tick = () => {
      cx += (tx - cx) * 0.14;
      cy += (ty - cy) * 0.14;
      cursor.style.transform = `translate(${cx - 5}px, ${cy - 5}px)`;
      rafId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // ── Card 3D tilt on hover ────────────────────────────────────
  const onCardMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rx = ((y - cy) / cy) * -6;
    const ry = ((x - cx) / cx) * 6;
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
  };
  const onCardLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)';
  };

  return (
    <div className="has-custom-cursor min-h-screen bg-netzach-bg text-netzach-text font-sans overflow-x-hidden select-none">

      {/* Custom cursor — hidden on touch devices via CSS */}
      <div
        ref={cursorRef}
        className="cursor-dot fixed w-2.5 h-2.5 rounded-full bg-netzach-gold pointer-events-none z-[9999] opacity-60"
        style={{ willChange: 'transform', top: 0, left: 0 }}
      />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col overflow-hidden">

        {/* Three.js sacred geometry + particles */}
        <CosmicCanvas />

        {/* Gradient veil for text legibility */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-netzach-bg/20 via-transparent to-netzach-bg" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#0F0518_80%)]" />
        </div>

        {/* Nav */}
        <nav className="relative z-10 px-6 py-6 flex justify-between items-center">
          <div className="font-mystic text-netzach-gold text-xl tracking-widest flex items-center gap-2 font-bold">
            <Moon size={20} strokeWidth={1.5} /> NETZACH
          </div>
          <Link
            to="/portal"
            className="text-netzach-muted hover:text-netzach-gold border border-netzach-border hover:border-netzach-gold/60 px-5 py-2.5 rounded-full text-[11px] uppercase tracking-widest transition-all duration-300 hover:bg-netzach-gold/5 backdrop-blur-sm"
          >
            Área da Iniciada
          </Link>
        </nav>

        {/* Hero content with scroll parallax */}
        <div
          ref={heroContentRef}
          className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pb-28"
          style={{ willChange: 'transform, opacity' }}
        >
          {/* Badge */}
          <div
            className="char-reveal inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-netzach-border/80 bg-netzach-card/50 backdrop-blur-md mb-10"
            style={{ animationDelay: '0.2s' }}
          >
            <Sparkles size={12} className="text-netzach-gold" />
            <span className="text-[9px] uppercase tracking-[0.28em] text-netzach-muted">Clube de Estudos Místicos</span>
          </div>

          {/* H1 — per-character reveal */}
          <h1
            className="font-mystic font-bold leading-[1.05] mb-8"
            style={{ fontSize: 'clamp(2.8rem, 8vw, 6rem)', letterSpacing: '-0.02em' }}
          >
            <SplitTitle
              text="Desperte sua"
              delay={0.38}
              className="block text-netzach-gold drop-shadow-[0_0_40px_rgba(197,160,89,0.35)]"
            />
            <SplitTitle
              text="Deusa Interior"
              delay={0.78}
              className="block text-white/90"
            />
          </h1>

          <p
            className="char-reveal text-base md:text-lg text-netzach-text/55 max-w-[42ch] mb-12 leading-relaxed font-light"
            style={{ animationDelay: '1.35s' }}
          >
            Uma jornada diária de autoconhecimento através da Astrologia,<br className="hidden md:block" /> Tarô e da sabedoria do seu Ciclo Menstrual.
          </p>

          <div className="char-reveal flex flex-col sm:flex-row gap-4" style={{ animationDelay: '1.55s' }}>
            <Link
              to="/assinar"
              className="group relative bg-netzach-gold text-netzach-bg px-9 py-4 rounded-xl font-mystic font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 hover:bg-white shadow-[0_0_35px_rgba(197,160,89,0.22)] hover:shadow-[0_0_60px_rgba(197,160,89,0.5)] overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                Iniciar Jornada
                <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform duration-300" />
              </span>
              {/* Shimmer on hover */}
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out" />
            </Link>
            <a
              href="#detalhes"
              className="px-9 py-4 rounded-xl border border-netzach-border text-netzach-muted hover:text-netzach-gold hover:border-netzach-gold/50 transition-all duration-300 text-[11px] uppercase tracking-[0.18em] flex items-center justify-center hover:bg-netzach-card/40"
            >
              Descobrir Mais
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="char-reveal absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
          style={{ animationDelay: '2s' }}
        >
          <span className="text-[8px] uppercase tracking-[0.35em] text-netzach-muted/60">Rolar</span>
          <div className="w-px h-10 bg-gradient-to-b from-netzach-gold/40 to-transparent scroll-drop" />
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="detalhes" className="relative py-28 md:py-36 px-6">
        <div ref={featRef} className="max-w-5xl mx-auto">

          <div className={`text-center mb-20 transition-all duration-700 ${featVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <p className="text-[9px] uppercase tracking-[0.35em] text-netzach-gold mb-5">Seu Templo Digital</p>
            <h2 className="font-mystic text-3xl md:text-4xl text-white font-normal leading-snug">
              Tudo que você precisa<br />para sua jornada espiritual
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 md:gap-6" style={{ perspective: '1400px' }}>
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                onMouseMove={onCardMove}
                onMouseLeave={onCardLeave}
                className={`relative group bg-netzach-card border border-netzach-border rounded-2xl p-8 transition-all duration-700 hover:border-netzach-gold/35 hover:shadow-[0_20px_60px_rgba(112,11,151,0.15),0_0_40px_rgba(197,160,89,0.06)] cursor-default ${featVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
                style={{ transitionDelay: `${i * 0.13}s`, transformStyle: 'preserve-3d' }}
              >
                {/* Top shimmer line */}
                <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-netzach-gold/0 to-transparent group-hover:via-netzach-gold/45 transition-all duration-500" />

                {/* Glyph */}
                <div className="font-mystic text-4xl text-netzach-gold/60 group-hover:text-netzach-gold mb-5 transition-colors duration-300 leading-none">
                  {f.glyph}
                </div>

                <h3 className="font-mystic text-[1.15rem] text-white mb-3 tracking-wide">{f.title}</h3>
                <p className="text-sm text-netzach-muted leading-relaxed font-light">{f.desc}</p>

                <div className="mt-7 flex items-center gap-1.5 text-netzach-gold/0 group-hover:text-netzach-gold/65 transition-all duration-300 text-[10px] uppercase tracking-widest">
                  Explorar <ArrowRight size={11} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="relative py-24 px-6">
        {/* Horizontal rule */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-netzach-border/60 to-transparent" />

        <div ref={stepsRef} className="max-w-4xl mx-auto">

          <div className={`text-center mb-20 transition-all duration-700 ${stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <p className="text-[9px] uppercase tracking-[0.35em] text-netzach-gold mb-5">Como Funciona</p>
            <h2 className="font-mystic text-3xl md:text-4xl text-white font-normal leading-snug">
              Três passos para<br />despertar sua magia
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-16 md:gap-8 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-8 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-netzach-border via-netzach-border to-netzach-border opacity-40" />

            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className={`relative text-center md:text-left transition-all duration-700 ${stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 0.16}s` }}
              >
                {/* Number circle */}
                <div className="w-16 h-16 mx-auto md:mx-0 mb-6 rounded-full border border-netzach-border bg-netzach-card flex items-center justify-center relative z-10">
                  <span className="font-mystic text-sm text-netzach-gold tracking-widest">{s.n}</span>
                </div>

                <h3 className="font-mystic text-lg text-netzach-gold mb-2">{s.title}</h3>
                <p className="text-sm text-netzach-muted leading-relaxed font-light">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SACERDOTISA CTA ───────────────────────────────────── */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-netzach-border/60 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-netzach-border/60 to-transparent" />
        </div>

        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10 md:gap-16">
          {/* Icon side */}
          <div className="shrink-0">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border border-netzach-gold/25 bg-gradient-to-br from-netzach-card to-[#200940] flex items-center justify-center shadow-[0_0_50px_rgba(112,11,151,0.25)]">
              <Bot size={36} className="text-netzach-gold" strokeWidth={1.5} />
            </div>
          </div>
          {/* Text side */}
          <div className="text-center md:text-left flex-1">
            <p className="text-[9px] uppercase tracking-[0.35em] text-netzach-gold mb-3">Novo Recurso</p>
            <h2 className="font-mystic text-2xl md:text-3xl text-white font-normal mb-3">
              Sacerdotisa Netzach
            </h2>
            <p className="text-sm text-netzach-muted leading-relaxed mb-6 max-w-md">
              Sua própria guia espiritual com inteligência artificial. Consulte sobre banhos energéticos, óleos essenciais, cristais, florais de Bach e rituais — tudo personalizado para seu momento.
            </p>
            <Link
              to="/assinar"
              className="inline-flex items-center gap-2 text-netzach-gold border border-netzach-gold/40 px-6 py-3 rounded-lg text-sm font-bold hover:bg-netzach-gold hover:text-netzach-bg transition-all duration-300"
            >
              Conhecer a Sacerdotisa <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <section className="relative py-36 px-6 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full bg-netzach-accent/8 blur-[100px]" />
          <div className="w-64 h-64 rounded-full bg-netzach-gold/5 blur-[60px] absolute" />
        </div>

        <div
          ref={ctaRef}
          className={`relative max-w-2xl mx-auto text-center transition-all duration-1000 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
        >
          <div className="w-14 h-14 mx-auto mb-8 rounded-full border border-netzach-gold/30 bg-netzach-card flex items-center justify-center shadow-[0_0_30px_rgba(197,160,89,0.12)]">
            <Star size={22} className="text-netzach-gold" strokeWidth={1.5} />
          </div>

          <h2 className="font-mystic text-4xl md:text-5xl text-white font-normal mb-4 leading-[1.1]" style={{ letterSpacing: '-0.01em' }}>
            Pronta para iniciar<br />sua jornada?
          </h2>
          <p className="text-netzach-muted text-sm mb-12 leading-relaxed max-w-sm mx-auto">
            Junte-se ao clube e tenha acesso ao seu templo pessoal, à Sacerdotisa Netzach e à sua Matriz da Alma.
          </p>

          <Link
            to="/assinar"
            className="group inline-flex items-center gap-3 bg-netzach-gold text-netzach-bg px-10 py-5 rounded-xl font-mystic font-bold text-lg hover:bg-white transition-all duration-300 shadow-[0_0_50px_rgba(197,160,89,0.2)] hover:shadow-[0_0_80px_rgba(197,160,89,0.45)] relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-3">
              Iniciar minha jornada
              <ArrowRight size={19} className="group-hover:translate-x-1 transition-transform duration-300" />
            </span>
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-netzach-border to-transparent" />

      {/* Footer */}
      <footer className="py-10 px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="font-mystic text-netzach-gold text-sm tracking-widest flex items-center gap-2">
          <Moon size={15} strokeWidth={1.5} /> NETZACH
        </div>
        <p className="text-netzach-muted/60 text-[10px] tracking-widest uppercase">
          &copy; {new Date().getFullYear()} Raquel Basan • Terapia Holística
        </p>
        <Link to="/portal" className="text-[10px] text-netzach-muted hover:text-netzach-gold transition-colors uppercase tracking-widest">
          Área da Iniciada
        </Link>
      </footer>
    </div>
  );
}
