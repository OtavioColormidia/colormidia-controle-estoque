## Objetivo

Salvar a personalização da sidebar (ordem das seções, ordem dos itens dentro de cada seção e quais seções estão abertas/fechadas) **por usuário** no Supabase. Cada usuário vê seu próprio layout em qualquer dispositivo; usuários sem preferência salva continuam vendo o padrão original.

## O que muda

### 1. Banco de dados (nova tabela)

Criar `user_sidebar_preferences`:

- `user_id` (uuid, único) — dono da preferência
- `section_order` (jsonb) — array com a ordem das seções (ex: `["Principal","Compras","Serviço",...]`)
- `item_orders` (jsonb) — objeto `{ "Principal": ["Dashboard"], "Compras": ["Compras","Requisição"], ... }`
- `open_sections` (jsonb) — objeto `{ "Principal": true, "Compras": true, ... }`
- timestamps padrão

**RLS:** cada usuário só lê/escreve a própria linha (`auth.uid() = user_id`). Sem acesso de admin a preferências de outros — é dado pessoal de UI.

### 2. Frontend — `src/components/layout/AppSidebar.tsx`

- Ao montar: buscar a linha do usuário em `user_sidebar_preferences`. Se existir, hidratar `sectionOrder`, `itemOrders` e `openSections` com os valores salvos. Se não existir, usar o padrão atual (comportamento de hoje para todo mundo).
- Após qualquer reorder (seção ou item) ou toggle de abrir/fechar seção: fazer `upsert` na tabela com debounce (~500 ms) para não spammar.
- Remover a persistência atual de `openSections` em `localStorage` (substituída pelo Supabase). Manter fallback de leitura única do localStorage só para migrar usuários que já tinham seções abertas/fechadas salvas.
- Sem botão de reset (conforme escolhido).

### Comportamento resultante

- **Seu usuário** (após arrastar uma vez): layout fica salvo e aparece igual em qualquer PC/celular.
- **Outros usuários**: como nunca tiveram nada salvo, abrem no padrão original. Se um dia arrastarem algo, salva só pra eles.
- **Refresh**: agora respeita o salvo (antes voltava ao padrão). Isso muda a regra anterior de "ao atualizar a página volta ao padrão" — confirme se está OK, já que era exatamente o oposto do que foi pedido antes.

## Detalhes técnicos

- Tabela nova com RLS estrita por `auth.uid()`.
- Upsert com `onConflict: 'user_id'`.
- Debounce no salvamento via `setTimeout` + ref, evitando recarregar React Query (não há cache compartilhado aqui).
- Sem mudanças em PDF, permissões de app, ou outras telas.