// Cargos e EPIs sugeridos conforme NR-06 (ICS – Engenharia de Segurança do Trabalho)

export const EMPLOYEE_ROLES: string[] = [
  'Serralheiro',
  'Soldador',
  'Pintor',
  'Operador de Máquina',
  'Montador',
  '💼 Montador Nível 1',
  '💼💼 Montador Nível 2',
  'Ajudante Montador',
  'Auxiliar de Estoque',
  'Auxiliar de Produção',
  'Adesivador',
  'Operador de Acabamento',
  'Auxiliar de Impressão',
  'Vendedor',
  'Assistente de Marketing',
  'Arte Finalista',
  // Cargos em branco para edição futura
  'Cargo em Branco 1',
  'Cargo em Branco 2',
];

/**
 * Mapeia cada cargo aos nomes de EPIs (devem bater com `epis.name` no banco).
 * Cargos administrativos (Vendedor, Marketing, Arte) não exigem EPIs no dia a dia.
 */
export const EPI_BY_ROLE: Record<string, string[]> = {
  Serralheiro: [
    'Máscara de Solda',
    'Luva de Raspa ou Vaqueta',
    'Avental de Raspa',
    'Bota de Segurança',
    'Óculos de Segurança Incolor',
    'Protetor Auricular Plug ou Concha',
  ],
  Soldador: [
    'Máscara Semi Facial Respirador',
    'Luva de Raspa ou Vaqueta',
    'Avental de Raspa',
    'Bota de Segurança',
    'Óculos de Segurança Incolor',
    'Protetor Auricular Plug ou Concha',
  ],
  Pintor: [
    'Máscara Semi Facial Respirador',
    'Luva Látex / Neoprene',
    'Macacão Impermeável',
    'Bota de Segurança',
    'Óculos de Segurança Incolor',
    'Protetor Auricular Plug ou Concha',
  ],
  'Operador de Máquina': [
    'Luva PU Multitato',
    'Bota de Segurança',
    'Óculos de Segurança Incolor',
    'Protetor Auricular Plug ou Concha',
  ],
  Montador: [
    'Luva PU Multitato',
    'Capacete com Jugular',
    'Cinto de Segurança com Talabarte',
    'Bota de Segurança',
    'Óculos de Segurança Incolor',
    'Protetor Auricular Plug ou Concha',
  ],
  '💼 Montador Nível 1': [
    'Luva PU Multitato',
    'Capacete com Jugular',
    'Cinto de Segurança com Talabarte',
    'Bota de Segurança',
    'Óculos de Segurança Incolor',
    'Protetor Auricular Plug ou Concha',
  ],
  '💼💼 Montador Nível 2': [
    'Luva PU Multitato',
    'Capacete com Jugular',
    'Cinto de Segurança com Talabarte',
    'Bota de Segurança',
    'Óculos de Segurança Incolor',
    'Protetor Auricular Plug ou Concha',
  ],
  'Ajudante Montador': [
    'Luva PU Multitato',
    'Capacete com Jugular',
    'Cinto de Segurança com Talabarte',
    'Bota de Segurança',
    'Óculos de Segurança Incolor',
    'Protetor Auricular Plug ou Concha',
  ],
  'Auxiliar de Estoque': [
    'Bota de Segurança',
    'Óculos de Segurança Incolor',
    'Protetor Auricular Plug ou Concha',
  ],
  'Auxiliar de Produção': [
    'Luva Anticorte',
    'Bota de Segurança',
    'Óculos de Segurança Incolor',
  ],
  Adesivador: [
    'Luva Anticorte',
    'Bota de Segurança',
    'Óculos de Segurança Incolor',
  ],
  'Operador de Acabamento': [
    'Luva Anticorte',
    'Bota de Segurança',
    'Óculos de Segurança Incolor',
  ],
  'Auxiliar de Impressão': [
    'Luva Látex',
    'Respirador Purificador de Ar PFF2',
    'Bota de Segurança',
    'Óculos de Segurança Incolor',
  ],
  Vendedor: [],
  'Assistente de Marketing': [],
  'Arte Finalista': [],
  'Cargo em Branco 1': [],
  'Cargo em Branco 2': [],
};

export const EPI_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', '36', '37', '38', '39', '40', '41', '42', '43', '44'];
