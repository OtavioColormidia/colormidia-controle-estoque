
O usuário quer seguir com a Opção 3 (webhook do Apps Script para Supabase). Ele também perguntou onde fica o editor de scripts — isso fica no Google Sheets (não no Forms), em **Extensões → Apps Script**, exatamente na aba que ele mostrou na print ("Extensões" está visível no menu superior).

Vou apresentar plano completo de implementação + instruções passo-a-passo de onde acessar o editor.

## Plano: Aba "Requisição de Materiais" via Webhook

### Onde acessar o editor de scripts (na sua planilha)

Na print que você enviou, você já está na planilha certa ("Requisição de Materiais (respostas)"). Para abrir o editor:

1. Na barra de menus superior, clique em **Extensões**
2. No submenu, clique em **Apps Script**
3. Vai abrir uma nova aba com o editor de código do Google
4. Lá vou te passar o código pronto pra colar

### O que vou implementar

**1. Banco de dados (migration)**
Criar tabela `form_responses`:
- `id` (uuid, PK)
- `form_name` (text) — identifica qual formulário (ex: "requisicao-materiais")
- `submitted_at` (timestamptz) — data da resposta
- `data` (jsonb) — todas as respostas em formato livre (Tipo, Solicitante, O.S., Materiais, Quantidade, etc.)
- `sheet_row` (int, opcional) — linha na planilha original
- `created_at` (timestamptz, default now())
- RLS: leitura para usuários autorizados (admin, compras, almoxarife); insert apenas via service role (edge function)
- Habilitar Realtime + REPLICA IDENTITY FULL

**2. Edge Function `receive-form-response`**
- Pública (sem JWT), valida header `x-webhook-secret`
- Recebe POST com `{ form_name, submitted_at, data, sheet_row? }`
- Insere na tabela usando service role
- Retorna 200 ou erro detalhado
- Secret `FORM_WEBHOOK_SECRET` (vou pedir pra você gerar e cadastrar)

**3. Sidebar (`Layout.tsx`)**
- Novo item: "Requisição de Materiais" (ícone `ClipboardList` ou `FileText`)
- Permissões: admin, compras, almoxarife
- Grupo: novo grupo "formularios" (ou junto de "movimentacao")

**4. Componente `FormResponses.tsx`**
- Lista todas as respostas em tabela responsiva
- Colunas dinâmicas baseadas nas chaves do `data` (Carimbo, Tipo, Solicitante, O.S., Materiais, Quantidade, etc.)
- Campo de busca (filtra por qualquer texto)
- Filtro por "Tipo" (Estoque / Material Especial) com dropdown
- Filtro por "Solicitante" com dropdown
- Realtime: ouve `INSERT` na tabela `form_responses` e atualiza a lista instantaneamente
- Mobile: cards empilhados em vez de tabela
- Contador de respostas no topo
- Botão pra exportar CSV (opcional, posso adicionar depois)

**5. Roteamento (`Index.tsx`)**
- Novo case `'form-responses'` renderizando o componente

### O código do Apps Script que você vai colar

Depois de aprovar este plano e eu criar a infraestrutura, vou te entregar algo assim (já com a URL preenchida):

```javascript
function onFormSubmit(e) {
  const SECRET = 'COLOCAR_SEU_SECRET_AQUI';
  const URL = 'https://xmaeixjvbpgwkhipaxys.supabase.co/functions/v1/receive-form-response';
  
  const headers = e.values; // array com valores na ordem das colunas
  const sheet = e.range.getSheet();
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const data = {};
  headerRow.forEach((col, i) => { if (col) data[col] = headers[i]; });
  
  UrlFetchApp.fetch(URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-webhook-secret': SECRET },
    payload: JSON.stringify({
      form_name: 'requisicao-materiais',
      submitted_at: new Date().toISOString(),
      data: data,
      sheet_row: e.range.getRow()
    }),
    muteHttpExceptions: true
  });
}
```

E depois você configura o trigger:
- No editor: ícone de relógio (Triggers) → Adicionar acionador
- Função: `onFormSubmit`
- Evento: "Da planilha" → "Ao enviar formulário"
- Salvar e autorizar

### Importação das respostas existentes

Você já tem várias respostas históricas (vi 14+ na print). Tenho duas opções:
- **(A)** Começar do zero — só novas respostas a partir de agora aparecem
- **(B)** Importar o histórico — você baixa a planilha como CSV e eu crio um script de importação que sobe tudo de uma vez

Vou assumir **(B)** no plano, mas se preferir (A), me avise.

### Ordem de execução depois da aprovação

1. Criar tabela + RLS + realtime (migration)
2. Pedir você cadastrar o secret `FORM_WEBHOOK_SECRET` (qualquer string aleatória forte)
3. Criar a edge function
4. Criar a aba e o componente
5. Te entregar o código exato do Apps Script já com a URL
6. (Opcional B) Importar histórico via CSV
7. Testar juntos enviando uma resposta de teste no formulário
