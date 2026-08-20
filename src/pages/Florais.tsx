import ConsultaModule from '../components/ConsultaModule';

const SUGESTOES = [
  'Ansiedade e agitação',
  'Tristeza e melancolia',
  'Medo e insegurança',
  'Raiva e irritação',
  'Esgotamento emocional',
  'Baixa autoestima',
  'Luto e perda',
  'Confusão e indecisão',
];

export default function Florais() {
  return (
    <ConsultaModule
      moduleKey="florais"
      titulo="Florais & Óleos"
      subtitulo="Recomendação personalizada pela sacerdotisa"
      pergunta="Como você está se sentindo?"
      sugestoes={SUGESTOES}
      placeholder="Ex: Estou me sentindo presa, com medo de tomar decisões importantes..."
      mensagemLimite="O plano Ísis traz três indicações por semana, se quiser se aprofundar ainda mais no seu cuidado."
    />
  );
}
