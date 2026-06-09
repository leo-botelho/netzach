import type { MatrizDestino } from '../types';

interface Props {
  matriz: MatrizDestino;
}

export const MatrizMandala = ({ matriz }: Props) => {
  const size = 820;
  const cx = size / 2;   // 410
  const cy = size / 2;   // 410

  // ── Raios ──────────────────────────────────────────────
  const r1 = 265;  // pontas externas
  const r2 = 175;  // círculos médios
  const r3 = 108;  // círculos internos
  const rHex = 345;

  // ── Pontas do LOSANGO (cardeais — 3, 22, 5, 16) ────────
  const top    = { x: cx,       y: cy - r1 };
  const right  = { x: cx + r1,  y: cy      };
  const bottom = { x: cx,       y: cy + r1 };
  const left   = { x: cx - r1,  y: cy      };

  // ── Pontas do QUADRADO (diagonais — 19, 7, 9, 21) ──────
  const d1 = r1 * 0.7071;
  const topLeft     = { x: cx - d1, y: cy - d1 };
  const topRight    = { x: cx + d1, y: cy - d1 };
  const bottomRight = { x: cx + d1, y: cy + d1 };
  const bottomLeft  = { x: cx - d1, y: cy + d1 };

  // ── Anel médio ──────────────────────────────────────────
  const d2 = r2 * 0.7071;
  const topMid         = { x: cx,       y: cy - r2 };
  const rightMid       = { x: cx + r2,  y: cy      };
  const bottomMid      = { x: cx,       y: cy + r2 };
  const leftMid        = { x: cx - r2,  y: cy      };
  const topLeftMid     = { x: cx - d2,  y: cy - d2 };
  const topRightMid    = { x: cx + d2,  y: cy - d2 };
  const bottomRightMid = { x: cx + d2,  y: cy + d2 };
  const bottomLeftMid  = { x: cx - d2,  y: cy + d2 };

  // ── Anel interno ────────────────────────────────────────
  const d3 = r3 * 0.7071;
  const topIn         = { x: cx,       y: cy - r3 };
  const rightIn       = { x: cx + r3,  y: cy      };
  const bottomIn      = { x: cx,       y: cy + r3 };
  const leftIn        = { x: cx - r3,  y: cy      };
  const topLeftIn     = { x: cx - d3,  y: cy - d3 };
  const topRightIn    = { x: cx + d3,  y: cy - d3 };
  const bottomRightIn = { x: cx + d3,  y: cy + d3 };
  const bottomLeftIn  = { x: cx - d3,  y: cy + d3 };

  // ── Hexágono ────────────────────────────────────────────
  const hexPts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return { x: cx + rHex * Math.cos(a), y: cy + rHex * Math.sin(a) };
  });
  const hexPath = hexPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // ── Componente círculo preenchido ────────────────────────
  const FC = ({
    x, y, num, r = 26,
    fill = '#1e0f35',
    stroke = '#c5a059',
    sw = 2,
  }: { x: number; y: number; num: number | string; r?: number; fill?: string; stroke?: string; sw?: number }) => (
    <g>
      <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth={sw} />
      <text
        x={x} y={y} fill="#fff"
        fontSize={r >= 32 ? '20' : r >= 24 ? '16' : r >= 19 ? '13' : '11'}
        fontWeight="bold" textAnchor="middle" dominantBaseline="middle"
      >{num}</text>
    </g>
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>

      {/* ── Defs: setas ── */}
      <defs>
        <marker id="arrowM" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="#a78bfa" />
        </marker>
        <marker id="arrowF" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="#f87171" />
        </marker>
      </defs>

      {/* ── Hexágono externo ── */}
      <path d={hexPath} fill="none" stroke="#3d2060" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.5" />

      {/* ── Rótulos de idade (junto às pontas externas) ── */}
      {[
        { label: '0 anos',  x: left.x - 52,        y: left.y          },
        { label: '10 anos', x: topLeft.x - 36,      y: topLeft.y - 28  },
        { label: '20 anos', x: top.x,               y: top.y - 48      },
        { label: '30 anos', x: topRight.x + 36,     y: topRight.y - 28 },
        { label: '40 anos', x: right.x + 52,        y: right.y         },
        { label: '50 anos', x: bottomRight.x + 36,  y: bottomRight.y + 28 },
        { label: '60 anos', x: bottom.x,            y: bottom.y + 48   },
        { label: '70 anos', x: bottomLeft.x - 36,   y: bottomLeft.y + 28 },
      ].map(({ label, x, y }) => (
        <text key={label} x={x} y={y} fill="#6b7280" fontSize="10" textAnchor="middle" dominantBaseline="middle">{label}</text>
      ))}

      {/* ════════════════════════════════════════════════
          LINHAS ESTRUTURAIS
          ════════════════════════════════════════════════ */}

      {/* Losango: 4 lados conectando os cardeais (3-22-5-16) */}
      <line x1={top.x}    y1={top.y}    x2={right.x}  y2={right.y}  stroke="#7c3aed" strokeWidth="2"   opacity="0.65" />
      <line x1={right.x}  y1={right.y}  x2={bottom.x} y2={bottom.y} stroke="#7c3aed" strokeWidth="2"   opacity="0.65" />
      <line x1={bottom.x} y1={bottom.y} x2={left.x}   y2={left.y}   stroke="#7c3aed" strokeWidth="2"   opacity="0.65" />
      <line x1={left.x}   y1={left.y}   x2={top.x}    y2={top.y}    stroke="#7c3aed" strokeWidth="2"   opacity="0.65" />

      {/* Quadrado: 4 lados conectando os diagonais (19-7-9-21) */}
      <line x1={topLeft.x}     y1={topLeft.y}     x2={topRight.x}    y2={topRight.y}    stroke="#374151" strokeWidth="1.5" opacity="0.6" />
      <line x1={topRight.x}    y1={topRight.y}    x2={bottomRight.x} y2={bottomRight.y} stroke="#374151" strokeWidth="1.5" opacity="0.6" />
      <line x1={bottomRight.x} y1={bottomRight.y} x2={bottomLeft.x}  y2={bottomLeft.y}  stroke="#374151" strokeWidth="1.5" opacity="0.6" />
      <line x1={bottomLeft.x}  y1={bottomLeft.y}  x2={topLeft.x}     y2={topLeft.y}     stroke="#374151" strokeWidth="1.5" opacity="0.6" />

      {/* Eixo vertical e horizontal (cruzam pelo centro) */}
      <line x1={top.x}  y1={top.y}  x2={bottom.x} y2={bottom.y} stroke="#4b5563" strokeWidth="1" opacity="0.35" />
      <line x1={left.x} y1={left.y} x2={right.x}  y2={right.y}  stroke="#4b5563" strokeWidth="1" opacity="0.35" />

      {/* ── Linha de geração MASCULINA (topLeft → bottomRight, roxo) ── */}
      <line
        x1={topLeft.x} y1={topLeft.y}
        x2={bottomRight.x} y2={bottomRight.y}
        stroke="#a78bfa" strokeWidth="2.5" opacity="0.75"
        markerEnd="url(#arrowM)"
      />
      <text
        x={cx - 140} y={cy - 60}
        fill="#a78bfa" fontSize="11" fontStyle="italic" opacity="0.95"
        textAnchor="middle"
        transform={`rotate(-45, ${cx - 140}, ${cy - 60})`}
      >
        linha de geração masculina
      </text>

      {/* ── Linha de geração FEMININA (topRight → bottomLeft, vermelho) ── */}
      <line
        x1={topRight.x} y1={topRight.y}
        x2={bottomLeft.x} y2={bottomLeft.y}
        stroke="#f87171" strokeWidth="2.5" opacity="0.75"
        markerEnd="url(#arrowF)"
      />
      <text
        x={cx + 140} y={cy - 60}
        fill="#f87171" fontSize="11" fontStyle="italic" opacity="0.95"
        textAnchor="middle"
        transform={`rotate(45, ${cx + 140}, ${cy - 60})`}
      >
        linha de geração feminina
      </text>

      {/* ── Símbolos decorativos ── */}
      <text x={cx + 68} y={cy + 12} fill="#4ade80" fontSize="16" textAnchor="middle" dominantBaseline="middle" opacity="0.8">$</text>
      <text x={cx - 8}  y={cy + 78} fill="#ec4899" fontSize="18" textAnchor="middle" dominantBaseline="middle" opacity="0.8">♥</text>

      {/* ════════════════════════════════════════════════
          CAMADA 1 — PONTAS EXTERNAS (r1)
          ════════════════════════════════════════════════ */}

      {/* Losango: violeta (topo/esq) · vermelho (dir/base) */}
      <FC x={top.x}    y={top.y}    num={matriz.topo.maior.arcano}            r={35} fill="#5b21b6" stroke="#a78bfa" sw={3} />
      <FC x={right.x}  y={right.y}  num={matriz.lateralDireita.maior.arcano}  r={35} fill="#991b1b" stroke="#f87171" sw={3} />
      <FC x={bottom.x} y={bottom.y} num={matriz.base.maior.arcano}            r={35} fill="#991b1b" stroke="#f87171" sw={3} />
      <FC x={left.x}   y={left.y}   num={matriz.lateralEsquerda.maior.arcano} r={35} fill="#5b21b6" stroke="#a78bfa" sw={3} />

      {/* Quadrado: topLeft âmbar, demais branco/outline */}
      <FC x={topLeft.x}     y={topLeft.y}     num={matriz.diagonalSuperiorEsquerda.maior.arcano} r={29} fill="#78350f" stroke="#f59e0b" sw={2} />
      <FC x={topRight.x}    y={topRight.y}    num={matriz.diagonalSuperiorDireita.maior.arcano}  r={29} fill="#1a0d2e" stroke="#d1d5db" sw={2} />
      <FC x={bottomRight.x} y={bottomRight.y} num={matriz.diagonalInferiorDireita.maior.arcano}  r={29} fill="#1a0d2e" stroke="#d1d5db" sw={2} />
      <FC x={bottomLeft.x}  y={bottomLeft.y}  num={matriz.diagonalInferiorEsquerda.maior.arcano} r={29} fill="#1a0d2e" stroke="#d1d5db" sw={2} />

      {/* ════════════════════════════════════════════════
          CAMADA 2 — CÍRCULOS MÉDIOS (r2)
          ════════════════════════════════════════════════ */}

      <FC x={topMid.x}         y={topMid.y}         num={matriz.topo.intermediario.arcano}            r={24} fill="#1e3a8a" stroke="#60a5fa" />
      <FC x={rightMid.x}       y={rightMid.y}       num={matriz.lateralDireita.intermediario.arcano}  r={24} fill="#78350f" stroke="#f59e0b" />
      <FC x={bottomMid.x}      y={bottomMid.y}      num={matriz.base.intermediario.arcano}            r={24} fill="#7c2d12" stroke="#fb923c" />
      <FC x={leftMid.x}        y={leftMid.y}        num={matriz.lateralEsquerda.intermediario.arcano} r={24} fill="#1e3a8a" stroke="#60a5fa" />

      <FC x={topLeftMid.x}     y={topLeftMid.y}     num={matriz.diagonalSuperiorEsquerda.meio.arcano} r={21} fill="#1a0d2e" stroke="#d1d5db" />
      <FC x={topRightMid.x}    y={topRightMid.y}    num={matriz.diagonalSuperiorDireita.meio.arcano}  r={21} fill="#1a0d2e" stroke="#d1d5db" />
      <FC x={bottomRightMid.x} y={bottomRightMid.y} num={matriz.diagonalInferiorDireita.meio.arcano}  r={21} fill="#1a0d2e" stroke="#d1d5db" />
      <FC x={bottomLeftMid.x}  y={bottomLeftMid.y}  num={matriz.diagonalInferiorEsquerda.meio.arcano} r={21} fill="#1a0d2e" stroke="#d1d5db" />

      {/* ════════════════════════════════════════════════
          CAMADA 3 — CÍRCULOS INTERNOS (r3)
          ════════════════════════════════════════════════ */}

      <FC x={topIn.x}         y={topIn.y}         num={matriz.topo.menor.arcano}            r={19} fill="#14532d" stroke="#4ade80" />
      <FC x={rightIn.x}       y={rightIn.y}       num={matriz.lateralDireita.menor.arcano}  r={19} fill="#14532d" stroke="#4ade80" />
      <FC x={bottomIn.x}      y={bottomIn.y}      num={matriz.base.menor.arcano}            r={19} fill="#14532d" stroke="#4ade80" />
      <FC x={leftIn.x}        y={leftIn.y}        num={matriz.lateralEsquerda.menor.arcano} r={19} fill="#14532d" stroke="#4ade80" />

      <FC x={topLeftIn.x}     y={topLeftIn.y}     num={matriz.diagonalSuperiorEsquerda.menor.arcano} r={17} fill="#14532d" stroke="#4ade80" />
      <FC x={topRightIn.x}    y={topRightIn.y}    num={matriz.diagonalSuperiorDireita.menor.arcano}  r={17} fill="#14532d" stroke="#4ade80" />
      <FC x={bottomRightIn.x} y={bottomRightIn.y} num={matriz.diagonalInferiorDireita.menor.arcano}  r={17} fill="#14532d" stroke="#4ade80" />
      <FC x={bottomLeftIn.x}  y={bottomLeftIn.y}  num={matriz.diagonalInferiorEsquerda.menor.arcano} r={17} fill="#14532d" stroke="#4ade80" />

      {/* ════════════════════════════════════════════════
          CENTRO
          ════════════════════════════════════════════════ */}

      {/* Central maior — amarelo */}
      <FC x={cx}       y={cy}       num={matriz.central.maior.arcano} r={37} fill="#92400e" stroke="#fbbf24" sw={3} />
      {/* Central médio — laranja */}
      <FC x={cx + 60}  y={cy}       num={matriz.central.medio.arcano} r={25} fill="#9a3412" stroke="#fb923c" />
      {/* Central menor — dourado */}
      <FC x={cx}       y={cy + 60}  num={matriz.central.menor.arcano} r={22} fill="#78350f" stroke="#f59e0b" />

      {/* Verdes centrais */}
      <FC x={cx - 60}  y={cy}       num={matriz.circuloVerdeCentralEsquerda.arcano} r={19} fill="#14532d" stroke="#4ade80" />
      <FC x={cx}       y={cy - 60}  num={matriz.circuloVerdeCentralTopo.arcano}     r={19} fill="#14532d" stroke="#4ade80" />

      {/* ════════════════════════════════════════════════
          LINHA DO DINHEIRO (pink)
          ════════════════════════════════════════════════ */}
      {matriz.linhaPontilhada && (
        <>
          <FC x={cx + 28}  y={cx + 97}  num={matriz.linhaPontilhada.menorBase.arcano}       r={17} fill="#831843" stroke="#ec4899" />
          <FC x={cx + 66}  y={cy + 66}  num={matriz.linhaPontilhada.meio.arcano}            r={17} fill="#831843" stroke="#ec4899" />
          <FC x={cx + 97}  y={cy + 28}  num={matriz.linhaPontilhada.primeiroDireita.arcano} r={17} fill="#831843" stroke="#ec4899" />
        </>
      )}

      {/* ── Labels topo e base ── */}
      <text x={cx} y={44}        fill="#c5a059" fontSize="14" textAnchor="middle" fontWeight="700" letterSpacing="1">Dons e Talentos</text>
      <text x={cx} y={size - 40} fill="#c5a059" fontSize="14" textAnchor="middle" fontWeight="700" letterSpacing="1">Zona Cármica</text>
    </svg>
  );
};
