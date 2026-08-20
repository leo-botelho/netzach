import ConsultaModule from '../components/ConsultaModule';

const SUGESTOES = [
  'Amor e relacionamento',
  'Abundância financeira',
  'Saúde e vitalidade',
  'Propósito e carreira',
  'Paz interior',
  'Autoconfiança',
  'Oportunidades novas',
  'Cura e transformação',
];

export default function LeiAtracao() {
  return (
    <ConsultaModule
      moduleKey="lei_atracao"
      titulo="Lei da Atração"
      subtitulo="Afirmação, visualização e ancoragem"
      pergunta="O que você quer atrair?"
      sugestoes={SUGESTOES}
      placeholder="Ex: Quero atrair um relacionamento amoroso com alguém que me completa e me respeita..."
      acao={'Criar meu guia'}
      mensagemLimite="O plano Ísis traz três guias por semana, se quiser se aprofundar ainda mais."
    />
  );
}
