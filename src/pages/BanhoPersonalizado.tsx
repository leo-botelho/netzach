import ConsultaModule from '../components/ConsultaModule';

const SUGESTOES = [
  'Limpeza energética e proteção',
  'Abertura de caminhos',
  'Amor e atração',
  'Cura emocional',
  'Prosperidade e abundância',
  'Paz e equilíbrio',
  'Força e confiança',
  'Desapego e perdão',
];

export default function BanhoPersonalizado() {
  return (
    <ConsultaModule
      moduleKey="banho_personalizado"
      titulo="Banho Personalizado"
      subtitulo="Ritual criado pela sua sacerdotisa"
      pergunta="Qual é a sua intenção?"
      sugestoes={SUGESTOES}
      placeholder="Ex: Estou me sentindo pesada e quero limpar o que não é mais meu..."
      acao={'Receber meu banho'}
      mensagemLimite="O plano Ísis traz três banhos por semana, se quiser se aprofundar ainda mais no seu cuidado."
    />
  );
}
