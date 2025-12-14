export type NumberMeaning = {
  expression: string;
  soul: string;
  personality: string;
  destiny: string;
}

export const meanings: Record<number, NumberMeaning> = {
  1: {
    expression: "Você é uma mulher original e criativa. Tem o dom de liderar, abrir caminhos e fazer as coisas acontecerem.",
    soul: "Seu coração deseja liberdade e independência. Você quer ser a 'capitã' da sua própria vida e ser reconhecida por sua individualidade.",
    personality: "Você transmite uma imagem de força, autoconfiança e determinação. As pessoas sentem que podem contar com a sua coragem.",
    destiny: "Seu caminho é aprender a confiar em si mesma e inovar. Você veio para liderar pelo exemplo e iniciar novos projetos."
  },
  2: {
    expression: "Seu talento é harmonizar ambientes e relacionamentos. Você é a amiga que sabe ouvir e traz paz onde há conflito.",
    soul: "Você anseia por amor, companhia e tranquilidade. Seu maior desejo é compartilhar a vida e sentir-se amada e segura.",
    personality: "Você passa uma imagem gentil, acolhedora e feminina. As pessoas se sentem confortáveis e compreendidas ao seu lado.",
    destiny: "Sua missão é a cooperação. Você veio para ensinar o poder da gentileza, da paciência e trabalhar em parceria com os outros."
  },
  3: {
    expression: "Você nasceu para brilhar e se comunicar! Seja falando, escrevendo ou através da arte, seu talento é inspirar e divertir as pessoas.",
    soul: "Sua alma quer ser ouvida e vista. Você deseja levar beleza e otimismo ao mundo e evitar a rotina monótona.",
    personality: "Você é vista como alguém carismática, sociável e cheia de charme. Seu sorriso é o seu cartão de visitas.",
    destiny: "Seu caminho é o da autoexpressão. Você veio para trazer leveza à vida, socializar e usar sua criatividade para curar."
  },
  4: {
    expression: "Você é organizada e prática. Seu talento é transformar sonhos em realidade através do trabalho e da disciplina. Você é o pilar de sustentação.",
    soul: "Você busca segurança e estabilidade. Seu coração fica em paz quando tudo está em ordem e o futuro está planejado.",
    personality: "As pessoas te veem como alguém séria, confiável e 'pé no chão'. Sabem que você cumpre o que promete.",
    destiny: "Sua missão é construir bases sólidas (seja uma família, uma empresa ou uma obra). Você veio para ensinar o valor da persistência."
  },
  5: {
    expression: "Você é versátil e se adapta a qualquer situação. Seu talento é lidar com o público, vender ideias e abraçar o novo.",
    soul: "Sua alma grita por liberdade! Você quer viajar, experimentar coisas novas e não suporta sentir-se presa ou limitada.",
    personality: "Você transmite uma imagem magnética, moderna e cheia de energia. As pessoas te acham interessante e antenada.",
    destiny: "Seu caminho é aceitar as mudanças. Você veio para aprender a flexibilidade, viver aventuras e mostrar que a vida é um movimento constante."
  },
  6: {
    expression: "Você é a 'mãe' do grupo (mesmo que não tenha filhos). Seu talento é cuidar, nutrir, aconselhar e deixar tudo bonito e justo.",
    soul: "Você deseja harmonia no lar e na família. Seu sonho é ter um ninho seguro onde todos se amem e se respeitem.",
    personality: "Você passa uma imagem protetora, elegante e responsável. As pessoas te procuram quando precisam de colo ou conselho.",
    destiny: "Sua missão é o serviço amoroso. Você veio para aprender a equilibrar o cuidar dos outros com o cuidar de si mesma."
  },
  7: {
    expression: "Você é uma pensadora profunda. Seu talento é analisar, investigar e descobrir verdades que ninguém mais vê. Tem um refinamento natural.",
    soul: "Você precisa de momentos de silêncio e solidão para se reconectar. Sua alma busca conhecimento, espiritualidade e respostas para a vida.",
    personality: "Você pode parecer um pouco misteriosa, reservada ou muito inteligente. Há um ar de elegância e distinção em você.",
    destiny: "Seu caminho é o do autoconhecimento. Você veio para desenvolver sua espiritualidade, sua intuição e compartilhar sabedoria."
  },
  8: {
    expression: "Você tem um talento executivo nato. Sabe gerenciar, comandar e fazer o dinheiro render. É uma mulher de visão ampla.",
    soul: "Você deseja segurança material e reconhecimento pelo seu esforço. Quer sentir que tem poder para mudar sua vida e ajudar os outros.",
    personality: "Você transmite autoridade, competência e força. As pessoas sentem que você é uma mulher de sucesso e bem-sucedida.",
    destiny: "Sua missão é lidar com o mundo material e o poder de forma ética. Você veio para prosperar e empoderar quem está ao seu redor."
  },
  9: {
    expression: "Você é carismática e compreensiva. Seu talento é ver o bem em todos e ajudar sem olhar a quem. Tem uma alma artística e sensível.",
    soul: "Seu desejo é fazer do mundo um lugar melhor. Você quer se sentir útil à humanidade e praticar o desapego e o amor incondicional.",
    personality: "As pessoas te veem como generosa, bondosa e 'amiga de todos'. Você tem uma aura de quem acolhe o mundo.",
    destiny: "Seu caminho é inspirar os outros e fechar ciclos. Você veio para ensinar a compaixão, a arte e a universalidade do amor."
  },
  11: {
    expression: "Você é inspiradora e visionária. Seu talento é elevar o espírito das pessoas ao seu redor com suas ideias idealistas.",
    soul: "Você busca iluminação espiritual e quer ser um canal de paz e intuição para o mundo.",
    personality: "Você tem um magnetismo diferente, quase 'mágico'. As pessoas sentem que você vê além do óbvio.",
    destiny: "Sua missão é ser um farol de luz. Você veio para inspirar os outros através da sua intuição aguçada e espiritualidade."
  },
  22: {
    expression: "Você tem o poder de realizar sonhos impossíveis. Consegue unir o idealismo com a prática para criar projetos que beneficiam muitos.",
    soul: "Você quer deixar um legado duradouro no mundo. Pensa grande e quer realizar grandes feitos.",
    personality: "Transmite uma competência extrema e uma força poderosa. As pessoas confiam que você consegue fazer qualquer coisa.",
    destiny: "Sua missão é materializar grandes sonhos. Você veio para construir estruturas que sirvam à humanidade em larga escala."
  },
  33: {
    expression: "Você é puro amor em ação. Seu talento é cuidar do mundo com uma compaixão e sabedoria raras.",
    soul: "Seu desejo é curar a dor do mundo através do amor incondicional. Você coloca o bem-estar coletivo acima do seu.",
    personality: "Você emana uma energia maternal e compassiva muito forte. As pessoas se sentem abençoadas na sua presença.",
    destiny: "Sua missão é o serviço altruísta total. Você é uma professora do amor e veio para ensinar a compaixão em sua forma mais pura."
  }
};