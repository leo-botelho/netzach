import type { MatrizDestino } from '../types';

interface Props {
  matriz: MatrizDestino;
}

export const MatrizMandala = ({ matriz }: Props) => {
  const size = 800;
  const center = size / 2;
  
  // Raios ajustados conforme a imagem de referência
  const r1 = 260; // Pontas principais (grandes círculos coloridos)
  const r2 = 180; // Círculos médios
  const r3 = 100; // Círculos internos pequenos
  const rHex = 330; // Hexágono externo
  
  // 4 PONTAS PRINCIPAIS (cardeais)
  const top = { x: center, y: center - r1 };
  const right = { x: center + r1, y: center };
  const bottom = { x: center, y: center + r1 };
  const left = { x: center - r1, y: center };
  
  // 4 PONTAS DIAGONAIS (estrela de 8 pontas)
  const angle45 = r1 * 0.707;
  const topRight = { x: center + angle45, y: center - angle45 };
  const topLeft = { x: center - angle45, y: center - angle45 };
  const bottomRight = { x: center + angle45, y: center + angle45 };
  const bottomLeft = { x: center - angle45, y: center + angle45 };
  
  // CÍRCULOS MÉDIOS (entre pontas e centro)
  const angle45Mid = r2 * 0.707;
  const topMid = { x: center, y: center - r2 };
  const rightMid = { x: center + r2, y: center };
  const bottomMid = { x: center, y: center + r2 };
  const leftMid = { x: center - r2, y: center };
  
  const topRightMid = { x: center + angle45Mid, y: center - angle45Mid };
  const topLeftMid = { x: center - angle45Mid, y: center - angle45Mid };
  const bottomRightMid = { x: center + angle45Mid, y: center + angle45Mid };
  const bottomLeftMid = { x: center - angle45Mid, y: center + angle45Mid };
  
  // CÍRCULOS INTERNOS (perto do centro)
  const angle45In = r3 * 0.707;
  const topIn = { x: center, y: center - r3 };
  const rightIn = { x: center + r3, y: center };
  const bottomIn = { x: center, y: center + r3 };
  const leftIn = { x: center - r3, y: center };
  
  const topRightIn = { x: center + angle45In, y: center - angle45In };
  const topLeftIn = { x: center - angle45In, y: center - angle45In };
  const bottomRightIn = { x: center + angle45In, y: center + angle45In };
  const bottomLeftIn = { x: center - angle45In, y: center + angle45In };
  
  // Hexágono
  const hexPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return {
      x: center + rHex * Math.cos(angle),
      y: center + rHex * Math.sin(angle)
    };
  });
  
  const hexPath = hexPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  
  // Componente círculo
  const Circle = ({ x, y, num, r = 26, color = '#c5a059', strokeWidth = 2 }: any) => (
    <g>
      <circle cx={x} cy={y} r={r} fill="#1a0b2e" stroke={color} strokeWidth={strokeWidth} />
      <text x={x} y={y} fill={color} fontSize="18" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
        {num}
      </text>
    </g>
  );
  
  // Marcações de anos
  const yearMarks = [];
  for (let i = 0; i <= 60; i += 5) {
    const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
    const rMark = rHex + 20;
    const x = center + rMark * Math.cos(angle);
    const y = center + rMark * Math.sin(angle);
    
    yearMarks.push(
      <text key={`year-${i}`} x={x} y={y} fill="#6b7280" fontSize="11" textAnchor="middle" dominantBaseline="middle">
        {i}
      </text>
    );
  }
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Hexágono tracejado */}
      <path d={hexPath} fill="none" stroke="#374151" strokeWidth="1.5" strokeDasharray="8,4" opacity="0.4" />
      
      {/* Marcações de anos */}
      {yearMarks}
      
      {/* Linhas principais (quadrado vertical) */}
      <line x1={top.x} y1={top.y} x2={bottom.x} y2={bottom.y} stroke="#4b5563" strokeWidth="1" opacity="0.3" />
      <line x1={left.x} y1={left.y} x2={right.x} y2={right.y} stroke="#4b5563" strokeWidth="1" opacity="0.3" />
      
      {/* Linhas diagonais (quadrado rotacionado) */}
      <line x1={topLeft.x} y1={topLeft.y} x2={bottomRight.x} y2={bottomRight.y} stroke="#4b5563" strokeWidth="1" opacity="0.3" />
      <line x1={topRight.x} y1={topRight.y} x2={bottomLeft.x} y2={bottomLeft.y} stroke="#4b5563" strokeWidth="1" opacity="0.3" />
      
      {/* Linhas do centro para as pontas */}
      <line x1={center} y1={center} x2={top.x} y2={top.y} stroke="#c5a059" strokeWidth="1.5" opacity="0.4" />
      <line x1={center} y1={center} x2={right.x} y2={right.y} stroke="#c5a059" strokeWidth="1.5" opacity="0.4" />
      <line x1={center} y1={center} x2={bottom.x} y2={bottom.y} stroke="#c5a059" strokeWidth="1.5" opacity="0.4" />
      <line x1={center} y1={center} x2={left.x} y2={left.y} stroke="#c5a059" strokeWidth="1.5" opacity="0.4" />
      <line x1={center} y1={center} x2={topRight.x} y2={topRight.y} stroke="#c5a059" strokeWidth="1.5" opacity="0.4" />
      <line x1={center} y1={center} x2={topLeft.x} y2={topLeft.y} stroke="#c5a059" strokeWidth="1.5" opacity="0.4" />
      <line x1={center} y1={center} x2={bottomRight.x} y2={bottomRight.y} stroke="#c5a059" strokeWidth="1.5" opacity="0.4" />
      <line x1={center} y1={center} x2={bottomLeft.x} y2={bottomLeft.y} stroke="#c5a059" strokeWidth="1.5" opacity="0.4" />
      
      {/* === CAMADA 1: PONTAS PRINCIPAIS (8 círculos grandes) === */}
      
      {/* Cardeais (4 principais - roxo e vermelho) */}
      <Circle x={top.x} y={top.y} num={matriz.topo.maior.arcano} r={34} color="#a78bfa" strokeWidth={3} />
      <Circle x={right.x} y={right.y} num={matriz.lateralDireita.maior.arcano} r={34} color="#f87171" strokeWidth={3} />
      <Circle x={bottom.x} y={bottom.y} num={matriz.base.maior.arcano} r={34} color="#f87171" strokeWidth={3} />
      <Circle x={left.x} y={left.y} num={matriz.lateralEsquerda.maior.arcano} r={34} color="#a78bfa" strokeWidth={3} />
      
      {/* Diagonais (4 círculos dourados menores) */}
      <Circle x={topRight.x} y={topRight.y} num={matriz.diagonalSuperiorDireita.maior.arcano} r={28} />
      <Circle x={topLeft.x} y={topLeft.y} num={matriz.diagonalSuperiorEsquerda.maior.arcano} r={28} />
      <Circle x={bottomRight.x} y={bottomRight.y} num={matriz.diagonalInferiorDireita.maior.arcano} r={28} />
      <Circle x={bottomLeft.x} y={bottomLeft.y} num={matriz.diagonalInferiorEsquerda.maior.arcano} r={28} />
      
      {/* === CAMADA 2: CÍRCULOS MÉDIOS === */}
      
      {/* Médios cardeais (azul no topo, dourado nos outros) */}
      <Circle x={topMid.x} y={topMid.y} num={matriz.topo.intermediario.arcano} r={24} color="#60a5fa" />
      <Circle x={rightMid.x} y={rightMid.y} num={matriz.lateralDireita.intermediario.arcano} r={24} />
      <Circle x={bottomMid.x} y={bottomMid.y} num={matriz.base.intermediario.arcano} r={24} color="#fb923c" />
      <Circle x={leftMid.x} y={leftMid.y} num={matriz.lateralEsquerda.intermediario.arcano} r={24} color="#60a5fa" />
      
      {/* Médios diagonais */}
      <Circle x={topRightMid.x} y={topRightMid.y} num={matriz.diagonalSuperiorDireita.meio.arcano} r={22} />
      <Circle x={topLeftMid.x} y={topLeftMid.y} num={matriz.diagonalSuperiorEsquerda.meio.arcano} r={22} />
      <Circle x={bottomRightMid.x} y={bottomRightMid.y} num={matriz.diagonalInferiorDireita.meio.arcano} r={22} />
      <Circle x={bottomLeftMid.x} y={bottomLeftMid.y} num={matriz.diagonalInferiorEsquerda.meio.arcano} r={22} />
      
      {/* === CAMADA 3: CÍRCULOS INTERNOS (verdes) === */}
      
      <Circle x={topIn.x} y={topIn.y} num={matriz.topo.menor.arcano} r={20} color="#4ade80" />
      <Circle x={rightIn.x} y={rightIn.y} num={matriz.lateralDireita.menor.arcano} r={20} color="#4ade80" />
      <Circle x={bottomIn.x} y={bottomIn.y} num={matriz.base.menor.arcano} r={20} color="#4ade80" />
      <Circle x={leftIn.x} y={leftIn.y} num={matriz.lateralEsquerda.menor.arcano} r={20} color="#4ade80" />
      
      <Circle x={topRightIn.x} y={topRightIn.y} num={matriz.diagonalSuperiorDireita.menor.arcano} r={18} color="#4ade80" />
      <Circle x={topLeftIn.x} y={topLeftIn.y} num={matriz.diagonalSuperiorEsquerda.menor.arcano} r={18} color="#4ade80" />
      <Circle x={bottomRightIn.x} y={bottomRightIn.y} num={matriz.diagonalInferiorDireita.menor.arcano} r={18} color="#4ade80" />
      <Circle x={bottomLeftIn.x} y={bottomLeftIn.y} num={matriz.diagonalInferiorEsquerda.menor.arcano} r={18} color="#4ade80" />
      
      {/* === CENTRO === */}
      
      {/* Centro principal (amarelo grande) */}
      <Circle x={center} y={center} num={matriz.central.maior.arcano} r={36} color="#fbbf24" strokeWidth={3} />
      
      {/* Centro direita (laranja) */}
      <Circle x={center + 60} y={center} num={matriz.central.medio.arcano} r={26} color="#fb923c" />
      
      {/* Centro baixo */}
      <Circle x={center} y={center + 60} num={matriz.central.menor.arcano} r={24} />
      
      {/* Verde esquerda */}
      <Circle x={center - 60} y={center} num={matriz.circuloVerdeCentralEsquerda.arcano} r={20} color="#4ade80" />
      
      {/* Verde topo */}
      <Circle x={center} y={center - 60} num={matriz.circuloVerdeCentralTopo.arcano} r={20} color="#4ade80" />
      
      {/* === LINHA DO DINHEIRO (rosa/vermelho - diagonal inferior direita) === */}
      {matriz.linhaPontilhada && (
        <>
          <Circle x={center + 30} y={center + 100} num={matriz.linhaPontilhada.menorBase.arcano} r={18} color="#ec4899" />
          <Circle x={center + 70} y={center + 70} num={matriz.linhaPontilhada.meio.arcano} r={18} color="#ec4899" />
          <Circle x={center + 100} y={center + 30} num={matriz.linhaPontilhada.primeiroDireita.arcano} r={18} color="#ec4899" />
        </>
      )}
      
      {/* Labels */}
      <text x={center} y={60} fill="#c5a059" fontSize="13" textAnchor="middle" fontWeight="600">
        Dons e Talentos
      </text>
      <text x={center} y={size - 60} fill="#c5a059" fontSize="13" textAnchor="middle" fontWeight="600">
        Zona Cármica
      </text>
    </svg>
  );
};