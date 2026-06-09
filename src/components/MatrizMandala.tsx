import type { MatrizDestino } from '../types';

interface Props {
  matriz: MatrizDestino;
}

export const MatrizMandala = ({ matriz }: Props) => {
  const size = 800;
  const center = size / 2;

  const r1 = 260; // círculos externos (pontas)
  const r2 = 175; // círculos médios
  const r3 = 95;  // círculos internos
  const rHex = 330; // hexágono externo

  // 4 CARDEAIS externos
  const top         = { x: center,       y: center - r1 };
  const right       = { x: center + r1,  y: center      };
  const bottom      = { x: center,       y: center + r1 };
  const left        = { x: center - r1,  y: center      };

  // 4 DIAGONAIS externos
  const a1 = r1 * 0.7071;
  const topRight    = { x: center + a1, y: center - a1 };
  const topLeft     = { x: center - a1, y: center - a1 };
  const bottomRight = { x: center + a1, y: center + a1 };
  const bottomLeft  = { x: center - a1, y: center + a1 };

  // 4 CARDEAIS médios
  const a2 = r2 * 0.7071;
  const topMid         = { x: center,       y: center - r2 };
  const rightMid       = { x: center + r2,  y: center      };
  const bottomMid      = { x: center,       y: center + r2 };
  const leftMid        = { x: center - r2,  y: center      };
  const topRightMid    = { x: center + a2,  y: center - a2 };
  const topLeftMid     = { x: center - a2,  y: center - a2 };
  const bottomRightMid = { x: center + a2,  y: center + a2 };
  const bottomLeftMid  = { x: center - a2,  y: center + a2 };

  // 4 CARDEAIS internos
  const a3 = r3 * 0.7071;
  const topIn         = { x: center,       y: center - r3 };
  const rightIn       = { x: center + r3,  y: center      };
  const bottomIn      = { x: center,       y: center + r3 };
  const leftIn        = { x: center - r3,  y: center      };
  const topRightIn    = { x: center + a3,  y: center - a3 };
  const topLeftIn     = { x: center - a3,  y: center - a3 };
  const bottomRightIn = { x: center + a3,  y: center + a3 };
  const bottomLeftIn  = { x: center - a3,  y: center + a3 };

  // Hexágono externo
  const hexPts = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return { x: center + rHex * Math.cos(angle), y: center + rHex * Math.sin(angle) };
  });
  const hexPath = hexPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Octógono (conecta as 8 pontas externas em sequência)
  const octPts = [top, topRight, right, bottomRight, bottom, bottomLeft, left, topLeft];
  const octPath = octPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Componente círculo preenchido
  const FC = ({
    x, y, num, r = 26,
    fill = '#2d1b4e',
    stroke = '#c5a059',
    sw = 2,
  }: {
    x: number; y: number; num: number | string;
    r?: number; fill?: string; stroke?: string; sw?: number;
  }) => (
    <g>
      <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth={sw} />
      <text
        x={x} y={y}
        fill="#ffffff"
        fontSize={r >= 32 ? '20' : r >= 24 ? '16' : r >= 19 ? '13' : '11'}
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {num}
      </text>
    </g>
  );

  // Marcações de anos ao redor do hexágono
  const yearLabels = [
    { label: '0',  side: 'anos', angle: Math.PI },
    { label: '10', side: 'anos', angle: Math.PI * 1.25 },
    { label: '20', side: 'anos', angle: Math.PI * 1.5  },
    { label: '30', side: 'anos', angle: Math.PI * 1.75 },
    { label: '40', side: 'anos', angle: 0              },
    { label: '50', side: 'anos', angle: Math.PI * 0.25 },
    { label: '60', side: 'anos', angle: Math.PI * 0.5  },
    { label: '70', side: 'anos', angle: Math.PI * 0.75 },
  ];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>

      {/* ── Hexágono tracejado ── */}
      <path d={hexPath} fill="none" stroke="#4b2d7a" strokeWidth="1.5" strokeDasharray="8,4" opacity="0.5" />

      {/* ── Marcações de anos ── */}
      {yearLabels.map(({ label, angle }) => {
        const rm = rHex + 30;
        const x = center + rm * Math.cos(angle);
        const y = center + rm * Math.sin(angle);
        return (
          <text key={`yr-${label}`} x={x} y={y} fill="#6b7280" fontSize="11" textAnchor="middle" dominantBaseline="middle">
            {label}
          </text>
        );
      })}

      {/* ── Octógono externo ── */}
      <path d={octPath} fill="none" stroke="#6b21a8" strokeWidth="1.5" opacity="0.55" />

      {/* ── Quadrado 1 (eixos cardeais) ── */}
      <line x1={top.x}  y1={top.y}  x2={bottom.x} y2={bottom.y} stroke="#6b21a8" strokeWidth="1.5" opacity="0.4" />
      <line x1={left.x} y1={left.y} x2={right.x}  y2={right.y}  stroke="#6b21a8" strokeWidth="1.5" opacity="0.4" />

      {/* ── Quadrado 2 (diagonais) ── */}
      <line x1={topLeft.x}  y1={topLeft.y}  x2={bottomRight.x} y2={bottomRight.y} stroke="#6b21a8" strokeWidth="1.5" opacity="0.4" />
      <line x1={topRight.x} y1={topRight.y} x2={bottomLeft.x}  y2={bottomLeft.y}  stroke="#6b21a8" strokeWidth="1.5" opacity="0.4" />

      {/* ── Linha de geração masculina (diagonal ↙) ── */}
      <text
        x={center - 60} y={center - 60}
        fill="#a78bfa" fontSize="12" fontStyle="italic" opacity="0.85"
        textAnchor="middle"
        transform={`rotate(-45, ${center - 60}, ${center - 60})`}
      >
        linha de geração masculina
      </text>

      {/* ── Linha de geração feminina (diagonal ↘) ── */}
      <text
        x={center + 60} y={center - 60}
        fill="#f9a8d4" fontSize="12" fontStyle="italic" opacity="0.85"
        textAnchor="middle"
        transform={`rotate(45, ${center + 60}, ${center - 60})`}
      >
        linha de geração feminina
      </text>

      {/* ── Símbolos centrais decorativos ── */}
      <text x={center - 18} y={center + 55} fill="#ec4899" fontSize="19" textAnchor="middle" dominantBaseline="middle" opacity="0.75">♥</text>
      <text x={center + 34} y={center - 14} fill="#4ade80" fontSize="17" textAnchor="middle" dominantBaseline="middle" opacity="0.75">$</text>

      {/* ════════════════════════════════════════════
          CAMADA 1 — PONTAS EXTERNAS (8 círculos)
          ════════════════════════════════════════════ */}

      {/* Cardeais: violeta (topo/esquerda) e vermelho (direita/base) */}
      <FC x={top.x}    y={top.y}    num={matriz.topo.maior.arcano}              r={34} fill="#5b21b6" stroke="#a78bfa" sw={3} />
      <FC x={right.x}  y={right.y}  num={matriz.lateralDireita.maior.arcano}    r={34} fill="#991b1b" stroke="#f87171" sw={3} />
      <FC x={bottom.x} y={bottom.y} num={matriz.base.maior.arcano}              r={34} fill="#991b1b" stroke="#f87171" sw={3} />
      <FC x={left.x}   y={left.y}   num={matriz.lateralEsquerda.maior.arcano}   r={34} fill="#5b21b6" stroke="#a78bfa" sw={3} />

      {/* Diagonais: âmbar/dourado */}
      <FC x={topRight.x}    y={topRight.y}    num={matriz.diagonalSuperiorDireita.maior.arcano}    r={28} fill="#78350f" stroke="#f59e0b" />
      <FC x={topLeft.x}     y={topLeft.y}     num={matriz.diagonalSuperiorEsquerda.maior.arcano}   r={28} fill="#78350f" stroke="#f59e0b" />
      <FC x={bottomRight.x} y={bottomRight.y} num={matriz.diagonalInferiorDireita.maior.arcano}    r={28} fill="#78350f" stroke="#f59e0b" />
      <FC x={bottomLeft.x}  y={bottomLeft.y}  num={matriz.diagonalInferiorEsquerda.maior.arcano}   r={28} fill="#78350f" stroke="#f59e0b" />

      {/* ════════════════════════════════════════════
          CAMADA 2 — CÍRCULOS MÉDIOS
          ════════════════════════════════════════════ */}

      <FC x={topMid.x}    y={topMid.y}    num={matriz.topo.intermediario.arcano}             r={24} fill="#1e3a8a" stroke="#60a5fa" />
      <FC x={rightMid.x}  y={rightMid.y}  num={matriz.lateralDireita.intermediario.arcano}   r={24} fill="#78350f" stroke="#f59e0b" />
      <FC x={bottomMid.x} y={bottomMid.y} num={matriz.base.intermediario.arcano}             r={24} fill="#7c2d12" stroke="#fb923c" />
      <FC x={leftMid.x}   y={leftMid.y}   num={matriz.lateralEsquerda.intermediario.arcano}  r={24} fill="#1e3a8a" stroke="#60a5fa" />

      <FC x={topRightMid.x}    y={topRightMid.y}    num={matriz.diagonalSuperiorDireita.meio.arcano}   r={21} fill="#365314" stroke="#86efac" />
      <FC x={topLeftMid.x}     y={topLeftMid.y}     num={matriz.diagonalSuperiorEsquerda.meio.arcano}  r={21} fill="#365314" stroke="#86efac" />
      <FC x={bottomRightMid.x} y={bottomRightMid.y} num={matriz.diagonalInferiorDireita.meio.arcano}   r={21} fill="#365314" stroke="#86efac" />
      <FC x={bottomLeftMid.x}  y={bottomLeftMid.y}  num={matriz.diagonalInferiorEsquerda.meio.arcano}  r={21} fill="#365314" stroke="#86efac" />

      {/* ════════════════════════════════════════════
          CAMADA 3 — CÍRCULOS INTERNOS (verdes)
          ════════════════════════════════════════════ */}

      <FC x={topIn.x}    y={topIn.y}    num={matriz.topo.menor.arcano}             r={19} fill="#14532d" stroke="#4ade80" />
      <FC x={rightIn.x}  y={rightIn.y}  num={matriz.lateralDireita.menor.arcano}   r={19} fill="#14532d" stroke="#4ade80" />
      <FC x={bottomIn.x} y={bottomIn.y} num={matriz.base.menor.arcano}             r={19} fill="#14532d" stroke="#4ade80" />
      <FC x={leftIn.x}   y={leftIn.y}   num={matriz.lateralEsquerda.menor.arcano}  r={19} fill="#14532d" stroke="#4ade80" />

      <FC x={topRightIn.x}    y={topRightIn.y}    num={matriz.diagonalSuperiorDireita.menor.arcano}   r={17} fill="#14532d" stroke="#4ade80" />
      <FC x={topLeftIn.x}     y={topLeftIn.y}     num={matriz.diagonalSuperiorEsquerda.menor.arcano}  r={17} fill="#14532d" stroke="#4ade80" />
      <FC x={bottomRightIn.x} y={bottomRightIn.y} num={matriz.diagonalInferiorDireita.menor.arcano}   r={17} fill="#14532d" stroke="#4ade80" />
      <FC x={bottomLeftIn.x}  y={bottomLeftIn.y}  num={matriz.diagonalInferiorEsquerda.menor.arcano}  r={17} fill="#14532d" stroke="#4ade80" />

      {/* ════════════════════════════════════════════
          CENTRO
          ════════════════════════════════════════════ */}

      {/* Central maior — amarelo */}
      <FC x={center}      y={center}      num={matriz.central.maior.arcano}  r={36} fill="#92400e" stroke="#fbbf24" sw={3} />
      {/* Central médio — laranja */}
      <FC x={center + 60} y={center}      num={matriz.central.medio.arcano}  r={26} fill="#9a3412" stroke="#fb923c" />
      {/* Central menor — dourado */}
      <FC x={center}      y={center + 60} num={matriz.central.menor.arcano}  r={23} fill="#78350f" stroke="#f59e0b" />

      {/* Círculos verdes centrais */}
      <FC x={center - 60} y={center}      num={matriz.circuloVerdeCentralEsquerda.arcano} r={19} fill="#14532d" stroke="#4ade80" />
      <FC x={center}      y={center - 60} num={matriz.circuloVerdeCentralTopo.arcano}     r={19} fill="#14532d" stroke="#4ade80" />

      {/* ════════════════════════════════════════════
          LINHA DO DINHEIRO (rosa/pink)
          ════════════════════════════════════════════ */}
      {matriz.linhaPontilhada && (
        <>
          <FC x={center + 30}  y={center + 100} num={matriz.linhaPontilhada.menorBase.arcano}      r={17} fill="#831843" stroke="#ec4899" />
          <FC x={center + 70}  y={center + 70}  num={matriz.linhaPontilhada.meio.arcano}           r={17} fill="#831843" stroke="#ec4899" />
          <FC x={center + 100} y={center + 30}  num={matriz.linhaPontilhada.primeiroDireita.arcano} r={17} fill="#831843" stroke="#ec4899" />
        </>
      )}

      {/* ── Labels ── */}
      <text x={center} y={46}        fill="#c5a059" fontSize="14" textAnchor="middle" fontWeight="700" letterSpacing="1">Dons e Talentos</text>
      <text x={center} y={size - 44} fill="#c5a059" fontSize="14" textAnchor="middle" fontWeight="700" letterSpacing="1">Zona Cármica</text>
    </svg>
  );
};
