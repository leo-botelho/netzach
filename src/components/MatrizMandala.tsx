import type { MatrizDestino } from '../types';

interface Props {
  matriz: MatrizDestino;
}

export const MatrizMandala = ({ matriz }: Props) => {
  const S  = 840;          // tamanho do SVG
  const cx = S / 2;        // 420
  const cy = S / 2;        // 420

  // ── Raios ──────────────────────────────────────────────────────────
  const r1 = 270;   // pontas externas
  const r2 = 178;   // círculos médios
  const r3 = 108;   // círculos internos
  const rC = 55;    // offset círculos de centro

  // ── Pontas do LOSANGO (cardeais: topo/dir/base/esq) ────────────────
  const top    = { x: cx,       y: cy - r1 };
  const right  = { x: cx + r1,  y: cy };
  const bottom = { x: cx,       y: cy + r1 };
  const left   = { x: cx - r1,  y: cy };

  // ── Pontas do QUADRADO (diagonais: topLeft/topRight/bottomRight/bottomLeft) ─
  const d1 = r1 * 0.7071;
  const tL = { x: cx - d1, y: cy - d1 };   // topLeft
  const tR = { x: cx + d1, y: cy - d1 };   // topRight
  const bR = { x: cx + d1, y: cy + d1 };   // bottomRight
  const bL = { x: cx - d1, y: cy + d1 };   // bottomLeft

  // ── Anel médio ─────────────────────────────────────────────────────
  const d2 = r2 * 0.7071;
  const topM   = { x: cx,       y: cy - r2 };
  const rightM = { x: cx + r2,  y: cy };
  const botM   = { x: cx,       y: cy + r2 };
  const leftM  = { x: cx - r2,  y: cy };
  const tLM    = { x: cx - d2,  y: cy - d2 };
  const tRM    = { x: cx + d2,  y: cy - d2 };
  const bRM    = { x: cx + d2,  y: cy + d2 };
  const bLM    = { x: cx - d2,  y: cy + d2 };

  // ── Anel interno ───────────────────────────────────────────────────
  const d3 = r3 * 0.7071;
  const topI   = { x: cx,       y: cy - r3 };
  const rightI = { x: cx + r3,  y: cy };
  const botI   = { x: cx,       y: cy + r3 };
  const leftI  = { x: cx - r3,  y: cy };
  const tLI    = { x: cx - d3,  y: cy - d3 };
  const tRI    = { x: cx + d3,  y: cy - d3 };
  const bRI    = { x: cx + d3,  y: cy + d3 };
  const bLI    = { x: cx - d3,  y: cy + d3 };

  // ── Componente círculo preenchido ───────────────────────────────────
  type FCProps = { x:number; y:number; num:number|string; r?:number; fill?:string; stroke?:string; sw?:number };
  const FC = ({ x, y, num, r=24, fill='#1e0f35', stroke='#c5a059', sw=2 }: FCProps) => (
    <g>
      <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth={sw}/>
      <text x={x} y={y} fill="#fff"
        fontSize={r>=32?'20':r>=24?'16':r>=19?'13':'11'}
        fontWeight="bold" textAnchor="middle" dominantBaseline="middle">{num}</text>
    </g>
  );

  // ── IDs dos caminhos para textPath ─────────────────────────────────
  const mPath = `M ${tL.x} ${tL.y} L ${bR.x} ${bR.y}`;
  const fPath = `M ${tR.x} ${tR.y} L ${bL.x} ${bL.y}`;

  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>

      {/* ── Defs: setas + caminhos de texto ─────────────────────────── */}
      <defs>
        <marker id="arrowM" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="#a78bfa"/>
        </marker>
        <marker id="arrowF" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="#f87171"/>
        </marker>
        <path id="mPath" d={mPath}/>
        <path id="fPath" d={fPath}/>
      </defs>

      {/* ══════════════════════════════════════════════════════════════
          LINHAS ESTRUTURAIS
          ══════════════════════════════════════════════════════════════ */}

      {/* Losango: 4 lados conectando os cardeais */}
      <line x1={top.x}    y1={top.y}    x2={right.x}  y2={right.y}  stroke="#7c3aed" strokeWidth="2"   opacity="0.65"/>
      <line x1={right.x}  y1={right.y}  x2={bottom.x} y2={bottom.y} stroke="#7c3aed" strokeWidth="2"   opacity="0.65"/>
      <line x1={bottom.x} y1={bottom.y} x2={left.x}   y2={left.y}   stroke="#7c3aed" strokeWidth="2"   opacity="0.65"/>
      <line x1={left.x}   y1={left.y}   x2={top.x}    y2={top.y}    stroke="#7c3aed" strokeWidth="2"   opacity="0.65"/>

      {/* Quadrado: 4 lados conectando os diagonais */}
      <line x1={tL.x} y1={tL.y} x2={tR.x} y2={tR.y} stroke="#374151" strokeWidth="1.5" opacity="0.6"/>
      <line x1={tR.x} y1={tR.y} x2={bR.x} y2={bR.y} stroke="#374151" strokeWidth="1.5" opacity="0.6"/>
      <line x1={bR.x} y1={bR.y} x2={bL.x} y2={bL.y} stroke="#374151" strokeWidth="1.5" opacity="0.6"/>
      <line x1={bL.x} y1={bL.y} x2={tL.x} y2={tL.y} stroke="#374151" strokeWidth="1.5" opacity="0.6"/>

      {/* Eixo vertical e horizontal */}
      <line x1={top.x}  y1={top.y}  x2={bottom.x} y2={bottom.y} stroke="#4b5563" strokeWidth="1" opacity="0.3"/>
      <line x1={left.x} y1={left.y} x2={right.x}  y2={right.y}  stroke="#4b5563" strokeWidth="1" opacity="0.3"/>

      {/* Linha de geração MASCULINA (tL → bR) com seta e label no caminho */}
      <line x1={tL.x} y1={tL.y} x2={bR.x} y2={bR.y}
        stroke="#a78bfa" strokeWidth="2.5" opacity="0.7" markerEnd="url(#arrowM)"/>
      <text fontSize="11" fontStyle="italic" fill="#a78bfa" opacity="0.9">
        <textPath href="#mPath" startOffset="8%">linha de geração masculina</textPath>
      </text>

      {/* Linha de geração FEMININA (tR → bL) com seta e label no caminho */}
      <line x1={tR.x} y1={tR.y} x2={bL.x} y2={bL.y}
        stroke="#f87171" strokeWidth="2.5" opacity="0.7" markerEnd="url(#arrowF)"/>
      <text fontSize="11" fontStyle="italic" fill="#f87171" opacity="0.9">
        <textPath href="#fPath" startOffset="8%">linha de geração feminina</textPath>
      </text>

      {/* ── Símbolos decorativos ──────────────────────────────────────── */}
      <text x={cx+68} y={cy+14} fill="#4ade80" fontSize="16" textAnchor="middle" dominantBaseline="middle" opacity="0.8">$</text>
      <text x={cx-10} y={cy+80} fill="#ec4899" fontSize="18" textAnchor="middle" dominantBaseline="middle" opacity="0.8">♥</text>

      {/* ══════════════════════════════════════════════════════════════
          CAMADA 1 — PONTAS EXTERNAS (r1)
          ══════════════════════════════════════════════════════════════ */}

      {/* Losango: violeta (topo/esq) · vermelho (dir/base) */}
      <FC x={top.x}    y={top.y}    num={matriz.topo.maior.arcano}            r={34} fill="#5b21b6" stroke="#a78bfa" sw={3}/>
      <FC x={right.x}  y={right.y}  num={matriz.lateralDireita.maior.arcano}  r={34} fill="#991b1b" stroke="#f87171" sw={3}/>
      <FC x={bottom.x} y={bottom.y} num={matriz.base.maior.arcano}            r={34} fill="#991b1b" stroke="#f87171" sw={3}/>
      <FC x={left.x}   y={left.y}   num={matriz.lateralEsquerda.maior.arcano} r={34} fill="#5b21b6" stroke="#a78bfa" sw={3}/>

      {/* Quadrado: topLeft âmbar, demais branco/outline */}
      <FC x={tL.x} y={tL.y} num={matriz.diagonalSuperiorEsquerda.maior.arcano} r={29} fill="#78350f" stroke="#f59e0b" sw={2}/>
      <FC x={tR.x} y={tR.y} num={matriz.diagonalSuperiorDireita.maior.arcano}  r={29} fill="#1a0d2e" stroke="#d1d5db" sw={2}/>
      <FC x={bR.x} y={bR.y} num={matriz.diagonalInferiorDireita.maior.arcano}  r={29} fill="#1a0d2e" stroke="#d1d5db" sw={2}/>
      <FC x={bL.x} y={bL.y} num={matriz.diagonalInferiorEsquerda.maior.arcano} r={29} fill="#1a0d2e" stroke="#d1d5db" sw={2}/>

      {/* Rótulos de idade — junto às pontas externas */}
      {[
        { label:'0 anos',  x:left.x-52,    y:left.y        },
        { label:'10 anos', x:tL.x-34,      y:tL.y-26       },
        { label:'20 anos', x:top.x,        y:top.y-48      },
        { label:'30 anos', x:tR.x+34,      y:tR.y-26       },
        { label:'40 anos', x:right.x+52,   y:right.y       },
        { label:'50 anos', x:bR.x+34,      y:bR.y+26       },
        { label:'60 anos', x:bottom.x,     y:bottom.y+48   },
        { label:'70 anos', x:bL.x-34,      y:bL.y+26       },
      ].map(({ label, x, y }) => (
        <text key={label} x={x} y={y} fill="#6b7280" fontSize="10"
          textAnchor="middle" dominantBaseline="middle">{label}</text>
      ))}

      {/* ══════════════════════════════════════════════════════════════
          CAMADA 2 — CÍRCULOS MÉDIOS (r2)
          ══════════════════════════════════════════════════════════════ */}

      <FC x={topM.x}  y={topM.y}  num={matriz.topo.intermediario.arcano}            r={23} fill="#1e3a8a" stroke="#60a5fa"/>
      <FC x={rightM.x} y={rightM.y} num={matriz.lateralDireita.intermediario.arcano} r={23} fill="#78350f" stroke="#f59e0b"/>
      <FC x={botM.x}  y={botM.y}  num={matriz.base.intermediario.arcano}            r={23} fill="#7c2d12" stroke="#fb923c"/>
      <FC x={leftM.x} y={leftM.y} num={matriz.lateralEsquerda.intermediario.arcano} r={23} fill="#1e3a8a" stroke="#60a5fa"/>

      <FC x={tLM.x} y={tLM.y} num={matriz.diagonalSuperiorEsquerda.meio.arcano} r={20} fill="#1a0d2e" stroke="#d1d5db"/>
      <FC x={tRM.x} y={tRM.y} num={matriz.diagonalSuperiorDireita.meio.arcano}  r={20} fill="#1a0d2e" stroke="#d1d5db"/>
      <FC x={bRM.x} y={bRM.y} num={matriz.diagonalInferiorDireita.meio.arcano}  r={20} fill="#1a0d2e" stroke="#d1d5db"/>
      <FC x={bLM.x} y={bLM.y} num={matriz.diagonalInferiorEsquerda.meio.arcano} r={20} fill="#1a0d2e" stroke="#d1d5db"/>

      {/* ══════════════════════════════════════════════════════════════
          CAMADA 3 — CÍRCULOS INTERNOS (r3) — verdes
          ══════════════════════════════════════════════════════════════ */}

      <FC x={topI.x}  y={topI.y}  num={matriz.topo.menor.arcano}            r={18} fill="#14532d" stroke="#4ade80"/>
      <FC x={rightI.x} y={rightI.y} num={matriz.lateralDireita.menor.arcano} r={18} fill="#14532d" stroke="#4ade80"/>
      <FC x={botI.x}  y={botI.y}  num={matriz.base.menor.arcano}            r={18} fill="#14532d" stroke="#4ade80"/>
      <FC x={leftI.x} y={leftI.y} num={matriz.lateralEsquerda.menor.arcano} r={18} fill="#14532d" stroke="#4ade80"/>

      <FC x={tLI.x} y={tLI.y} num={matriz.diagonalSuperiorEsquerda.menor.arcano} r={16} fill="#14532d" stroke="#4ade80"/>
      <FC x={tRI.x} y={tRI.y} num={matriz.diagonalSuperiorDireita.menor.arcano}  r={16} fill="#14532d" stroke="#4ade80"/>
      <FC x={bRI.x} y={bRI.y} num={matriz.diagonalInferiorDireita.menor.arcano}  r={16} fill="#14532d" stroke="#4ade80"/>
      <FC x={bLI.x} y={bLI.y} num={matriz.diagonalInferiorEsquerda.menor.arcano} r={16} fill="#14532d" stroke="#4ade80"/>

      {/* ══════════════════════════════════════════════════════════════
          CENTRO — amarelo grande + círculos orbitais
          ══════════════════════════════════════════════════════════════ */}

      {/* Verde acima */}
      <FC x={cx}        y={cy-rC}  num={matriz.circuloVerdeCentralTopo.arcano}     r={17} fill="#14532d" stroke="#4ade80"/>
      {/* Verde à esquerda */}
      <FC x={cx-rC}     y={cy}     num={matriz.circuloVerdeCentralEsquerda.arcano} r={17} fill="#14532d" stroke="#4ade80"/>
      {/* Central menor (abaixo) */}
      <FC x={cx}        y={cy+rC}  num={matriz.central.menor.arcano}               r={20} fill="#78350f" stroke="#f59e0b"/>
      {/* Central médio (direita) */}
      <FC x={cx+rC}     y={cy}     num={matriz.central.medio.arcano}               r={22} fill="#9a3412" stroke="#fb923c"/>
      {/* Central maior — por último para ficar na frente */}
      <FC x={cx}        y={cy}     num={matriz.central.maior.arcano}               r={36} fill="#92400e" stroke="#fbbf24" sw={3}/>

      {/* ══════════════════════════════════════════════════════════════
          LINHA DO DINHEIRO — linha pontilhada diagonal (sem círculos extras)
          Apenas uma linha visual indicativa entre rightI e botI
          ══════════════════════════════════════════════════════════════ */}
      <line
        x1={rightI.x} y1={rightI.y}
        x2={botI.x}   y2={botI.y}
        stroke="#ec4899" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6"
      />

      {/* ── Labels topo e base ─────────────────────────────────────── */}
      <text x={cx} y={40}      fill="#c5a059" fontSize="14" textAnchor="middle" fontWeight="700" letterSpacing="1">Dons e Talentos</text>
      <text x={cx} y={S - 36}  fill="#c5a059" fontSize="14" textAnchor="middle" fontWeight="700" letterSpacing="1">Zona Cármica</text>
    </svg>
  );
};
