// src/components/MatrizMandala.tsx

import type { MatrizDestino } from '../types';

interface Props {
  matriz: MatrizDestino;
}

export const MatrizMandala = ({ matriz }: Props) => {
  // Tamanho do SVG
  const width = 800;
  const height = 800;
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Raios para diferentes níveis
  const radiusOuter = 350; // Heptágono externo
  const radiusMain = 280; // Círculos principais
  const radiusMid = 200; // Círculos médios
  const radiusInner = 120; // Círculos internos
  
  // Tamanho dos círculos
  const circleSize = 35;
  const circleSizeMid = 30;
  const circleSizeSmall = 25;
  
  // Função para calcular ponto em círculo
  const getPointOnCircle = (angle: number, radius: number) => ({
    x: centerX + radius * Math.cos((angle - 90) * Math.PI / 180),
    y: centerY + radius * Math.sin((angle - 90) * Math.PI / 180)
  });
  
  // Função para criar heptágono (7 lados)
  const createHeptagon = () => {
    const points: string[] = [];
    const chakraNames = ['Sahashara', 'Ajna', 'Vishuddha', 'Anahata', 'Manipura', 'Svadhishthana', 'Muladhara'];
    
    for (let i = 0; i < 7; i++) {
      const angle = (360 / 7) * i;
      const point = getPointOnCircle(angle, radiusOuter);
      points.push(`${point.x},${point.y}`);
    }
    
    return (
      <>
        <polygon
          points={points.join(' ')}
          fill="none"
          stroke="#2d1b4e"
          strokeWidth="2"
        />
        {/* Marcações dos chakras */}
        {chakraNames.map((name, i) => {
          const angle = (360 / 7) * i;
          const point = getPointOnCircle(angle, radiusOuter + 30);
          return (
            <text
              key={name}
              x={point.x}
              y={point.y}
              fill="#c5a059"
              fontSize="12"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {name}
            </text>
          );
        })}
      </>
    );
  };
  
  const Circle = ({
    x,
    y,
    value,
    size = circleSize,
    color = '#1a0b2e'
  }: {
    x: number;
    y: number;
    value: number;
    size?: number;
    color?: string;
  }) => (
    <g>
      <circle
        cx={x}
        cy={y}
        r={size}
        fill={color}
        stroke="#c5a059"
        strokeWidth="2"
      />
      <text
        x={x}
        y={y}
        fill="#c5a059"
        fontSize="18"
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {value}
      </text>
    </g>
  );
  
  // Posições dos círculos principais (baseado no livro)
  const topPos = getPointOnCircle(0, radiusMain);
  const rightPos = getPointOnCircle(90, radiusMain);
  const bottomPos = getPointOnCircle(180, radiusMain);
  const leftPos = getPointOnCircle(270, radiusMain);
  
  // Posições intermediárias
  const topMidPos = getPointOnCircle(0, radiusMid);
  const rightMidPos = getPointOnCircle(90, radiusMid);
  const bottomMidPos = getPointOnCircle(180, radiusMid);
  const leftMidPos = getPointOnCircle(270, radiusMid);
  
  // Posições internas
  const topInnerPos = getPointOnCircle(0, radiusInner);
  const rightInnerPos = getPointOnCircle(90, radiusInner);
  const bottomInnerPos = getPointOnCircle(180, radiusInner);
  const leftInnerPos = getPointOnCircle(270, radiusInner);
  
  // Diagonais
  const topRightDiagPos = getPointOnCircle(45, radiusMain * 0.7);
  const topLeftDiagPos = getPointOnCircle(315, radiusMain * 0.7);
  const bottomRightDiagPos = getPointOnCircle(135, radiusMain * 0.7);
  const bottomLeftDiagPos = getPointOnCircle(225, radiusMain * 0.7);
  
  return (
    <svg width={width} height={height} className="mx-auto">
      {/* Heptágono externo */}
      {createHeptagon()}
      
      {/* Linhas de conexão principais */}
      <line x1={centerX} y1={centerY} x2={topPos.x} y2={topPos.y} stroke="#2d1b4e" strokeWidth="2" />
      <line x1={centerX} y1={centerY} x2={rightPos.x} y2={rightPos.y} stroke="#2d1b4e" strokeWidth="2" />
      <line x1={centerX} y1={centerY} x2={bottomPos.x} y2={bottomPos.y} stroke="#2d1b4e" strokeWidth="2" />
      <line x1={centerX} y1={centerY} x2={leftPos.x} y2={leftPos.y} stroke="#2d1b4e" strokeWidth="2" />
      
      {/* Linhas diagonais */}
      <line x1={topPos.x} y1={topPos.y} x2={leftPos.x} y2={leftPos.y} stroke="#2d1b4e" strokeWidth="1.5" strokeDasharray="5,5" />
      <line x1={topPos.x} y1={topPos.y} x2={rightPos.x} y2={rightPos.y} stroke="#2d1b4e" strokeWidth="1.5" strokeDasharray="5,5" />
      <line x1={bottomPos.x} y1={bottomPos.y} x2={leftPos.x} y2={leftPos.y} stroke="#2d1b4e" strokeWidth="1.5" strokeDasharray="5,5" />
      <line x1={bottomPos.x} y1={bottomPos.y} x2={rightPos.x} y2={rightPos.y} stroke="#2d1b4e" strokeWidth="1.5" strokeDasharray="5,5" />
      
      {/* Linha pontilhada (Amor e Dinheiro) */}
      <line x1={bottomInnerPos.x} y1={bottomInnerPos.y} x2={rightInnerPos.x} y2={rightInnerPos.y} 
        stroke="#c5a059" strokeWidth="2" strokeDasharray="3,3" />
      
      {/* ===== CÍRCULO CENTRAL (ESSÊNCIA) ===== */}
      <Circle x={centerX} y={centerY} value={matriz.central.maior.arcano} size={40} />
      <Circle x={centerX + 50} y={centerY} value={matriz.central.medio.arcano} size={circleSizeMid} />
      <Circle x={centerX + 50} y={centerY + 35} value={matriz.central.menor.arcano} size={circleSizeSmall} />
      
      {/* ===== TOPO (DONS E TALENTOS) ===== */}
      <Circle x={topPos.x} y={topPos.y} value={matriz.topo.maior.arcano} />
      <Circle x={topMidPos.x} y={topMidPos.y} value={matriz.topo.intermediario.arcano} size={circleSizeMid} />
      <Circle x={topInnerPos.x} y={topInnerPos.y} value={matriz.topo.menor.arcano} size={circleSizeSmall} />
      
      {/* ===== BASE (ZONA CÁRMICA) ===== */}
      <Circle x={bottomPos.x} y={bottomPos.y} value={matriz.base.maior.arcano} />
      <Circle x={bottomMidPos.x} y={bottomMidPos.y} value={matriz.base.intermediario.arcano} size={circleSizeMid} />
      <Circle x={bottomInnerPos.x} y={bottomInnerPos.y} value={matriz.base.menor.arcano} size={circleSizeSmall} />
      
      {/* ===== LATERAL DIREITA (CARMA MATERIAL) ===== */}
      <Circle x={rightPos.x} y={rightPos.y} value={matriz.lateralDireita.maior.arcano} />
      <Circle x={rightMidPos.x} y={rightMidPos.y} value={matriz.lateralDireita.intermediario.arcano} size={circleSizeMid} />
      <Circle x={rightInnerPos.x} y={rightInnerPos.y} value={matriz.lateralDireita.menor.arcano} size={circleSizeSmall} />
      
      {/* ===== LATERAL ESQUERDA (CARMA PAIS/FILHOS) ===== */}
      <Circle x={leftPos.x} y={leftPos.y} value={matriz.lateralEsquerda.maior.arcano} />
      <Circle x={leftMidPos.x} y={leftMidPos.y} value={matriz.lateralEsquerda.intermediario.arcano} size={circleSizeMid} />
      <Circle x={leftInnerPos.x} y={leftInnerPos.y} value={matriz.lateralEsquerda.menor.arcano} size={circleSizeSmall} />
      
      {/* ===== CÍRCULOS VERDES ===== */}
      <Circle 
        x={getPointOnCircle(315, radiusInner * 0.8).x} 
        y={getPointOnCircle(315, radiusInner * 0.8).y} 
        value={matriz.circuloVerdeCentralEsquerda.arcano} 
        size={circleSizeSmall}
        color="#1a4d2e"
      />
      <Circle 
        x={getPointOnCircle(0, radiusInner * 0.8).x} 
        y={getPointOnCircle(0, radiusInner * 0.8).y} 
        value={matriz.circuloVerdeCentralTopo.arcano} 
        size={circleSizeSmall}
        color="#1a4d2e"
      />
      
      {/* ===== DIAGONAIS SUPERIORES (DONS) ===== */}
      {/* Superior Esquerda (Paterna) */}
      <Circle x={topLeftDiagPos.x} y={topLeftDiagPos.y} value={matriz.diagonalSuperiorEsquerda.maior.arcano} size={circleSizeMid} />
      <Circle x={topLeftDiagPos.x - 30} y={topLeftDiagPos.y + 30} value={matriz.diagonalSuperiorEsquerda.meio.arcano} size={circleSizeSmall} />
      <Circle x={topLeftDiagPos.x - 50} y={topLeftDiagPos.y + 50} value={matriz.diagonalSuperiorEsquerda.menor.arcano} size={circleSizeSmall} />
      
      {/* Superior Direita (Materna) */}
      <Circle x={topRightDiagPos.x} y={topRightDiagPos.y} value={matriz.diagonalSuperiorDireita.maior.arcano} size={circleSizeMid} />
      <Circle x={topRightDiagPos.x + 30} y={topRightDiagPos.y + 30} value={matriz.diagonalSuperiorDireita.meio.arcano} size={circleSizeSmall} />
      <Circle x={topRightDiagPos.x + 50} y={topRightDiagPos.y + 50} value={matriz.diagonalSuperiorDireita.menor.arcano} size={circleSizeSmall} />
      
      {/* ===== DIAGONAIS INFERIORES (DÍVIDAS) ===== */}
      {/* Inferior Esquerda */}
      <Circle x={bottomLeftDiagPos.x} y={bottomLeftDiagPos.y} value={matriz.diagonalInferiorEsquerda.maior.arcano} size={circleSizeMid} />
      <Circle x={bottomLeftDiagPos.x - 30} y={bottomLeftDiagPos.y - 30} value={matriz.diagonalInferiorEsquerda.meio.arcano} size={circleSizeSmall} />
      <Circle x={bottomLeftDiagPos.x - 50} y={bottomLeftDiagPos.y - 50} value={matriz.diagonalInferiorEsquerda.menor.arcano} size={circleSizeSmall} />
      
      {/* Inferior Direita */}
      <Circle x={bottomRightDiagPos.x} y={bottomRightDiagPos.y} value={matriz.diagonalInferiorDireita.maior.arcano} size={circleSizeMid} />
      <Circle x={bottomRightDiagPos.x + 30} y={bottomRightDiagPos.y - 30} value={matriz.diagonalInferiorDireita.meio.arcano} size={circleSizeSmall} />
      <Circle x={bottomRightDiagPos.x + 50} y={bottomRightDiagPos.y - 50} value={matriz.diagonalInferiorDireita.menor.arcano} size={circleSizeSmall} />
      
      {/* ===== LINHA PONTILHADA (AMOR E DINHEIRO) ===== */}
      <Circle 
        x={(bottomInnerPos.x + rightInnerPos.x) / 2 - 40} 
        y={(bottomInnerPos.y + rightInnerPos.y) / 2} 
        value={matriz.linhaPontilhada.primeiroEsquerda.arcano} 
        size={circleSizeSmall}
      />
      <Circle 
        x={(bottomInnerPos.x + rightInnerPos.x) / 2} 
        y={(bottomInnerPos.y + rightInnerPos.y) / 2} 
        value={matriz.linhaPontilhada.meio.arcano} 
        size={circleSizeSmall}
      />
      <Circle 
        x={(bottomInnerPos.x + rightInnerPos.x) / 2 + 40} 
        y={(bottomInnerPos.y + rightInnerPos.y) / 2} 
        value={matriz.linhaPontilhada.primeiroDireita.arcano} 
        size={circleSizeSmall}
      />
      
      {/* Ícones de Coração e Cifrão */}
      <text 
        x={(bottomInnerPos.x + rightInnerPos.x) / 2 - 40} 
        y={(bottomInnerPos.y + rightInnerPos.y) / 2 - 30} 
        fontSize="20"
      >
        ❤️
      </text>
      <text 
        x={(bottomInnerPos.x + rightInnerPos.x) / 2 + 40} 
        y={(bottomInnerPos.y + rightInnerPos.y) / 2 - 30} 
        fontSize="20"
      >
        💰
      </text>
      
      {/* Labels das Diagonais */}
      <text x={topLeftDiagPos.x - 100} y={topLeftDiagPos.y - 40} fill="#c5a059" fontSize="11" textAnchor="middle">
        Linha de Geração Paterna
      </text>
      <text x={topRightDiagPos.x + 100} y={topRightDiagPos.y - 40} fill="#c5a059" fontSize="11" textAnchor="middle">
        Linha de Geração Materna
      </text>
    </svg>
  );
};