

## Painel de Controle - Tela inicial com atalhos rapidos

### O que sera feito
Transformar o Dashboard atual em um "Painel de Controle" com cards de acesso rapido as areas do sistema (similar a imagem de referencia), mantendo a secao de atividades recentes abaixo. Ao clicar em um card, navega para a aba correspondente.

### Como vai funcionar
- Ao entrar no site ou dar F5, o usuario ve o Dashboard com cards grandes organizados em grid (4 por linha no desktop, 2 no mobile)
- Cada card mostra icone, titulo e descricao curta, com seta indicando navegacao
- Abaixo dos cards, uma secao "Atividades Recentes" com as ultimas movimentacoes
- Os cards respeitam as permissoes do usuario (mesmo filtro de roles do menu lateral)
- Clicar no card muda a aba ativa (usa o `onTabChange` ja existente)

### Cards planejados (baseados nos menus existentes)
| Card | Descricao |
|------|-----------|
| Controle de Estoque | Estoque atual e alertas |
| Controle de Trelica | Gerenciar trelicas |
| Entrada de Material | Registrar entradas |
| Saida de Material | Registrar saidas |
| Compras | Pedidos e anexos |
| Cadastro de Produtos | Gerenciar produtos |
| Fornecedores | Gerenciar fornecedores |
| Usuarios | Gestao de acessos (admin) |

### Detalhes tecnicos

**Arquivo alterado**: `src/components/Dashboard.tsx`

1. Adicionar prop `onTabChange` ao componente Dashboard
2. Criar array de cards com id, label, descricao, icone e roles permitidas (reaproveitando do Layout)
3. Renderizar grid de cards clicaveis no topo com design similar a imagem (borda suave, icone azul, seta chevron)
4. Manter graficos e metricas existentes abaixo
5. Adicionar secao "Atividades Recentes" com ultimas 5 movimentacoes

**Arquivo alterado**: `src/pages/Index.tsx`
- Passar `onTabChange={setActiveTab}` para o componente Dashboard

### Visual
- Cards com `border rounded-xl p-4` e hover sutil
- Icone em azul escuro (cor do tema)
- Grid responsivo: `grid-cols-2 md:grid-cols-4`
- Secao atividades recentes com card separado abaixo

