-- Expande o CHECK constraint de category na knowledge_base
-- para suportar todas as categorias de conteúdo dos livros e módulos

-- Remove o constraint antigo
ALTER TABLE knowledge_base
  DROP CONSTRAINT IF EXISTS knowledge_base_category_check;

-- Adiciona o constraint expandido
ALTER TABLE knowledge_base
  ADD CONSTRAINT knowledge_base_category_check
  CHECK (category IN (
    'banho',
    'oleo',
    'floral',
    'cristal',
    'ritual',
    'numerologia',
    'astrologia',
    'ciclo_feminino',
    'chakra',
    'tarot',
    'ervas',
    'hooponopono',
    'relacionamento',
    'lei_atracao',
    'crianca_interior',
    'geral'
  ));

-- rollback: ALTER TABLE knowledge_base DROP CONSTRAINT knowledge_base_category_check; ALTER TABLE knowledge_base ADD CONSTRAINT knowledge_base_category_check CHECK (category IN ('banho','oleo','floral','cristal','ritual','geral'));
