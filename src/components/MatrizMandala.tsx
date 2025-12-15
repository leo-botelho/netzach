import type { MatrizDestino } from '../types';

interface Props {
  matriz: MatrizDestino;
}

export const MatrizMandala = ({ matriz }: Props) => {
  const size = 800;
  const center = size / 2;
  
  // Raios
  const r1 = 280; // Círculos externos (pontas da estrela)
  const r2 = 200; // Círculos médios
  const r3 = 120; // Círculos internos
  const rHex = 340; // Raio do hexágono externo
  
  // Posições cardeais (4 direções principais)
  const top = { x: center, y: center - r1 };
  const right = { x: center + r1, y: center };
  const bottom = { x: center, y: center + r1 };
  const left = { x: center - r1, y: center };
  
  // Diagonais (para formar estrela de 8 pontas)
  const topRight = { x: center + r1 * 0.707, y: center - r1 * 0.707 };
  const topLeft = { x: center - r1 * 0.707, y: center - r1 * 0.707 };
  const bottomRight = { x: center + r1 * 0.707, y: center + r1 * 0.707 };
  const bottomLeft = { x: center - r1 * 0.707, y: center + r1 * 0.707 };
  
  // Círculos médios
  const topMid = { x: center, y: center - r2 };
  const rightMid = { x: center + r2, y: center };
  const bottomMid = { x: center, y: center + r2 };
  const leftMid = { x: center - r2, y: center };
  
  const topRightMid = { x: center + r2 * 0.707, y: center - r2 * 0.707 };
  const topLeftMid = { x: center - r2 * 0.707, y: center - r2 * 0.707 };
  const bottomRightMid = { x: center + r2 * 0.707, y: center + r2 * 0.707 };
  const bottomLeftMid = { x: center - r2 * 0.707, y: center + r2 * 0.707 };
  
  // Círculos internos
  const topIn = { x: center, y: center - r3 };
  const rightIn = { x: center + r3, y: center };
  const bottomIn = { x: center, y: center + r3 };
  const leftIn = { x: center - r3, y: center };
  
  // Hexágono externo (6 pontos)
  const hexPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return {
      x: center + rHex * Math.cos(angle),
      y: center + rHex * Math.sin(angle)
    };
  });
  
  const hexPath = hexPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  
  // Componente de círculo
  const Circle = ({ x, y, num, r = 28, color = '#c5a059', strokeWidth = 2 }: any) => (
    <g>
      <circle cx={x} cy={y} r={r} fill="#1a0b2e" stroke={color} strokeWidth={strokeWidth} />
      <text x={x} y={y} fill={color} fontSize="20" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
        {num}
      </text>
    </g>
  );
  
  // Marcações de anos no hexágono
  const yearMarks = [];
  for (let i = 0; i <= 60; i++) {
    const angle = (Math.PI / 3) * (i / 10) - Math.PI / 2;
    const rMark = rHex + 15;
    const x = center + rMark * Math.cos(angle);
    const y = center + rMark * Math.sin(angle);
    
    if (i % 5 === 0) {
      yearMarks.push(
        <text key={`year-${i}`} x={x} y={y} fill="#c5a059" fontSize="10" textAnchor="middle" dominantBaseline="middle">
          {i}
        </text>
      );
    }
  }
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Hexágono tracejado externo */}
      <path d={hexPath} fill="none" stroke="#2d1b4e" strokeWidth="2" strokeDasharray="10,5" opacity="0.6" />
      
      {/* Marcações de anos */}
      {yearMarks}
      
      {/* Quadrado principal (linhas cardeais) */}
      <line x1={center} y1={center} x2={top.x} y2={top.y} stroke="#c5a059" strokeWidth="2" />
      <line x1={center} y1={center} x2={right.x} y2={right.y} stroke="#c5a059" strokeWidth="2" />
      <line x1={center} y1={center} x2={bottom.x} y2={bottom.y} stroke="#c5a059" strokeWidth="2" />
      <line x1={center} y1={center} x2={left.x} y2={left.y} stroke="#c5a059" strokeWidth="2" />
      
      {/* Quadrado rotacionado (diagonais) */}
      <line x1={center} y1={center} x2={topRight.x} y2={topRight.y} stroke="#c5a059" strokeWidth="2" />
      <line x1={center} y1={center} x2={topLeft.x} y2={topLeft.y} stroke="#c5a059" strokeWidth="2" />
      <line x1={center} y1={center} x2={bottomRight.x} y2={bottomRight.y} stroke="#c5a059" strokeWidth="2" />
      <line x1={center} y1={center} x2={bottomLeft.x} y2={bottomLeft.y} stroke="#c5a059" strokeWidth="2" />
      
      {/* Conectar pontas formando estrela */}
      <line x1={top.x} y1={top.y} x2={topRight.x} y2={topRight.y} stroke="#2d1b4e" strokeWidth="1" opacity="0.5" />
      <line x1={topRight.x} y1={topRight.y} x2={right.x} y2={right.y} stroke="#2d1b4e" strokeWidth="1" opacity="0.5" />
      <line x1={right.x} y1={right.y} x2={bottomRight.x} y2={bottomRight.y} stroke="#2d1b4e" strokeWidth="1" opacity="0.5" />
      <line x1={bottomRight.x} y1={bottomRight.y} x2={bottom.x} y2={bottom.y} stroke="#2d1b4e" strokeWidth="1" opacity="0.5" />
      <line x1={bottom.x} y1={bottom.y} x2={bottomLeft.x} y2={bottomLeft.y} stroke="#2d1b4e" strokeWidth="1" opacity="0.5" />
      <line x1={bottomLeft.x} y1={bottomLeft.y} x2={left.x} y2={left.y} stroke="#2d1b4e" strokeWidth="1" opacity="0.5" />
      <line x1={left.x} y1={left.y} x2={topLeft.x} y2={topLeft.y} stroke="#2d1b4e" strokeWidth="1" opacity="0.5" />
      <line x1={topLeft.x} y1={topLeft.y} x2={top.x} y2={top.y} stroke="#2d1b4e" strokeWidth="1" opacity="0.5" />
      
      {/* PONTAS CARDEAIS (4 principais) */}
      <Circle x={top.x} y={top.y} num={matriz.topo.maior.arcano} r={32} color="#a78bfa" />
      <Circle x={right.x} y={right.y} num={matriz.lateralDireita.maior.arcano} r={32} color="#f87171" />
      <Circle x={bottom.x} y={bottom.y} num={matriz.base.maior.arcano} r={32} color="#f87171" />
      <Circle x={left.x} y={left.y} num={matriz.lateralEsquerda.maior.arcano} r={32} color="#a78bfa" />
      
      {/* PONTAS DIAGONAIS */}
      <Circle x={topRight.x} y={topRight.y} num={matriz.diagonalSuperiorDireita.maior.arcano} r={28} />
      <Circle x={topLeft.x} y={topLeft.y} num={matriz.diagonalSuperiorEsquerda.maior.arcano} r={28} />
      <Circle x={bottomRight.x} y={bottomRight.y} num={matriz.diagonalInferiorDireita.maior.arcano} r={28} />
      <Circle x={bottomLeft.x} y={bottomLeft.y} num={matriz.diagonalInferiorEsquerda.maior.arcano} r={28} />
      
      {/* CÍRCULOS MÉDIOS (cardeais) */}
      <Circle x={topMid.x} y={topMid.y} num={matriz.topo.intermediario.arcano} r={24} color="#60a5fa" />
      <Circle x={rightMid.x} y={rightMid.y} num={matriz.lateralDireita.intermediario.arcano} r={24} />
      <Circle x={bottomMid.x} y={bottomMid.y} num={matriz.base.intermediario.arcano} r={24} />
      <Circle x={leftMid.x} y={leftMid.y} num={matriz.lateralEsquerda.intermediario.arcano} r={24} />
      
      {/* CÍRCULOS MÉDIOS (diagonais) */}
      <Circle x={topRightMid.x} y={topRightMid.y} num={matriz.diagonalSuperiorDireita.meio.arcano} r={22} />
      <Circle x={topLeftMid.x} y={topLeftMid.y} num={matriz.diagonalSuperiorEsquerda.meio.arcano} r={22} />
      <Circle x={bottomRightMid.x} y={bottomRightMid.y} num={matriz.diagonalInferiorDireita.meio.arcano} r={22} />
      <Circle x={bottomLeftMid.x} y={bottomLeftMid.y} num={matriz.diagonalInferiorEsquerda.meio.arcano} r={22} />
      
      {/* CÍRCULOS INTERNOS (cardeais) */}
      <Circle x={topIn.x} y={topIn.y} num={matriz.topo.menor.arcano} r={20} color="#4ade80" />
      <Circle x={rightIn.x} y={rightIn.y} num={matriz.lateralDireita.menor.arcano} r={20} color="#4ade80" />
      <Circle x={bottomIn.x} y={bottomIn.y} num={matriz.base.menor.arcano} r={20} color="#4ade80" />
      <Circle x={leftIn.x} y={leftIn.y} num={matriz.lateralEsquerda.menor.arcano} r={20} color="#4ade80" />
      
      {/* CENTRO (Essência) */}
      <Circle x={center} y={center} num={matriz.central.maior.arcano} r={38} color="#fbbf24" strokeWidth={3} />
      <Circle x={center + 65} y={center} num={matriz.central.medio.arcano} r={26} color="#fb923c" />
      <Circle x={center} y={center + 65} num={matriz.central.menor.arcano} r={22} />
      
      {/* Círculos especiais */}
      <Circle x={center - 90} y={center} num={matriz.circuloVerdeCentralEsquerda.arcano} r={20} color="#4ade80" />
      <Circle x={center} y={center - 90} num={matriz.circuloVerdeCentralTopo.arcano} r={20} color="#4ade80" />
      
      {/* Linha do dinheiro (linha pontilhada inferior direita) */}
      {matriz.linhaPontilhada && (
        <>
          <Circle x={center + 40} y={center + 130} num={matriz.linhaPontilhada.menorBase.arcano} r={18} color="#ec4899" />
          <Circle x={center + 80} y={center + 100} num={matriz.linhaPontilhada.primeiroEsquerda.arcano} r={18} color="#ec4899" />
          <Circle x={center + 120} y={center + 70} num={matriz.linhaPontilhada.meio.arcano} r={18} color="#ec4899" />
        </>
      )}
      
      {/* Labels */}
      <text x={center} y={50} fill="#c5a059" fontSize="14" textAnchor="middle" fontWeight="bold">
        Dons e Talentos
      </text>
      <text x={center} y={size - 50} fill="#c5a059" fontSize="14" textAnchor="middle" fontWeight="bold">
        Zona Cármica
      </text>
    </svg>
  );
};