import ConsultaModule from '../components/ConsultaModule';

const SUGESTOES = [
  'Atrair um novo amor',
  'Melhorar o relacionamento atual',
  'Superar um término',
  'Perdoar e liberar',
  'Amor próprio primeiro',
  'Comunicação no casal',
  'Padrões a transformar',
  'Abrir o coração',
];

export default function Relacionamento() {
  return (
    <ConsultaModule
      moduleKey="relacionamento"
      titulo="Relacionamento Amoroso"
      subtitulo="Carta do amor e orientação sagrada"
      pergunta="Qual tema do amor chama você agora?"
      sugestoes={SUGESTOES}
      placeholder="Ex: Tenho dificuldade de confiar nas pessoas e isso afasta quem eu amo..."
      mensagemLimite="O plano Ísis traz três orientações por semana, se quiser se aprofundar ainda mais."
    />
  );
}
