

## Entendi os 3 ajustes

### 1. Remover coluna "Carimbo de data/hora"
A tabela já mostra a coluna "Data" (de `submitted_at`). O "Carimbo de data/hora" vem dentro do `data` JSON e fica duplicado. Vou ocultar essa chave da renderização (filtrar do `allKeys`).

### 2. Materiais sem truncamento
Hoje a coluna usa `truncate` + `max-w-xs` → corta com "...". Vou remover o truncate da coluna "Materiais" especificamente (ou de todas), permitindo quebra de linha (`whitespace-pre-wrap break-words`) pra ver o pedido completo.

### 3. Marcar como "Pedido feito" (controle visual)
Adicionar um status persistente por requisição pra evitar duplicidade entre usuários:
- **Botão "Marcar como pedido feito"** em cada linha/card
- Quando marcado: linha fica com fundo verde claro + badge "✓ Pedido feito" + nome de quem marcou + data/hora
- Botão pra desmarcar (caso erro)
- Sincroniza em tempo real entre todos os usuários (já existe realtime na tabela)

#### Mudanças no banco
Adicionar 3 colunas em `form_responses`:
- `ordered` (boolean, default false)
- `ordered_by` (uuid, FK lógica pra profiles)
- `ordered_at` (timestamptz)

E atualizar RLS pra permitir UPDATE dessas colunas por usuários autorizados (admin/compras/almoxarife).

#### Mudanças no frontend (`FormResponses.tsx`)
- Filtrar `Carimbo de data/hora` (e variações) da lista de colunas exibidas
- Remover truncate da coluna Materiais — usar `whitespace-pre-wrap break-words`
- Adicionar coluna "Status" com botão verde "Marcar pedido feito" / badge "✓ Pedido por {nome} em {data}"
- Linhas com `ordered = true` recebem fundo verde sutil (`bg-green-500/5`) e texto levemente apagado
- Adicionar filtro: "Todos / Pendentes / Pedido feito" no topo
- Buscar `display_name` do `ordered_by` via join com `profiles`

### Arquivos afetados
- Migração SQL: adicionar 3 colunas + policy de UPDATE em `form_responses`
- `src/components/FormResponses.tsx`: ocultar carimbo, sem truncate, botão de status, filtro, fundo verde
- Sem mudança no Apps Script (não mexe)

### Resultado visual esperado
```
[Filtro: Pendentes ▾]  [Buscar...]

| Data       | Tipo    | Solicitante | Materiais (texto completo)        | Status                          |
|------------|---------|-------------|-----------------------------------|---------------------------------|
| 17/04 13:16| Pedido  | Otavio      | 1 chapa 1,22 acm preto fosco...   | [✓ Marcar pedido feito]         |
| 16/04 09:00| Pedido  | Danilo      | 2 lonas 3x2 brancas...            | ✓ Feito por Maria · 16/04 14:20 |  ← linha verde
```

