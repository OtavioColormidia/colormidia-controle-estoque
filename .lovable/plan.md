

## Plano: Importar histórico de respostas do Google Sheets

### Estratégia

Criar uma função **dentro do mesmo Apps Script** que você já configurou, que lê todas as linhas da planilha e envia uma por uma para a mesma Edge Function `receive-form-response`. Como a Edge Function já está pronta e validando o secret, não precisa mexer em nada do lado do Lovable.

### Por que dentro do Apps Script?

- Já tem acesso autorizado à planilha (não precisa baixar CSV)
- Já tem o secret configurado lá
- Roda uma vez só, manualmente, e pronto
- Mantém o mesmo formato de dados das respostas novas (consistência total)

### Código que vou te entregar

Uma função extra `importarHistorico()` que você cola **abaixo** da `onFormSubmit` no mesmo arquivo. Ela vai:

1. Ler todas as linhas da planilha (da linha 2 até a última)
2. Pegar os cabeçalhos da linha 1
3. Pra cada linha, montar o mesmo payload `{ form_name, submitted_at, data, sheet_row }`
4. Enviar via POST pra Edge Function (uma por uma, com pequena pausa pra não sobrecarregar)
5. Logar quantas foram importadas com sucesso e quantas falharam
6. Usar a coluna "Carimbo de data/hora" como `submitted_at` (preservando data/hora original)

### Proteção contra duplicatas

Vou adicionar no plano uma **migration leve** no Supabase: índice único em `(form_name, sheet_row)` quando `sheet_row` não for nulo. Assim:
- Se você rodar a importação 2x por engano, não duplica
- Se uma resposta nova chegar via trigger e você importar de novo, não duplica
- A Edge Function vai precisar de um pequeno ajuste pra retornar 200 (em vez de 500) quando o erro for "duplicate key", tratando como "já existe, tudo certo"

### Como você vai rodar

1. Cola o código da função `importarHistorico` no editor
2. No topo do editor, seleciona `importarHistorico` no dropdown de funções
3. Clica em **Executar** (botão de play)
4. Autoriza (pode pedir de novo)
5. Aguarda ~30 segundos a 2 minutos (depende de quantas linhas tem)
6. Vê o log: "Importadas X de Y respostas"
7. Atualiza a aba no site → todas as respostas históricas aparecem

### Ordem de execução

1. Migration no Supabase: índice único `(form_name, sheet_row)` + ajuste pequeno na Edge Function pra tratar duplicatas como sucesso
2. Te entrego o código completo do `importarHistorico` pra colar no Apps Script
3. Você roda manualmente
4. Confere o resultado no site
5. (Se quiser depois) remove a função `importarHistorico` do Apps Script — ela só serve uma vez

### Observação importante

A coluna "Carimbo de data/hora" do Google vem em formato brasileiro (ex: `15/04/2026 14:30:22`). Vou tratar isso no script pra converter corretamente pra ISO 8601 antes de enviar. Se não tratar, viraria string solta no JSON e perderia a ordenação por data.

