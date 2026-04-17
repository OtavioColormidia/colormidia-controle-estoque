

## Análise dos dois problemas

### Problema 1: Resposta nova não chegou no site

A linha 147 da planilha mostra a resposta de teste (Otavio, 17/04/2026 09:42:45), mas não apareceu na aba Requisição de Materiais do site. Isso indica que o webhook não foi disparado ou falhou. Causas possíveis:

1. **Trigger `onFormSubmit` não está ativo** — sem trigger, a função não roda quando uma resposta chega
2. **Erro no código do Apps Script** — ex: `WEBHOOK_SECRET` ainda com valor placeholder `'SEU_SECRET_AQUI'`, ou erro de sintaxe
3. **Edge function rejeitou** — ex: secret inválido, payload malformado
4. **Índice único bloqueou** — a tabela tem constraint único em `(form_name, sheet_row)`. Se a linha 147 já existia antes (de uma importação anterior) e foi deletada, pode haver conflito? Não — DELETE remove o registro, então não bloqueia nova inserção.

Vou checar logs da edge function pra ver se ela foi chamada e o que aconteceu.

### Problema 2: Ordem invertida (mais antigas no topo)

Olhando o `FormResponses.tsx` linha 75-82, a query já ordena `submitted_at DESC` (mais recentes primeiro). Então o problema NÃO está no fetch inicial.

Suspeita: ao receber resposta nova via realtime (linha 110), o código faz `setResponses((prev) => [payload.new, ...prev])` — adiciona no topo. Isso está certo.

**Mas** — quando o `importarHistorico` rodou anteriormente, ele importou linhas 1, 2, 3... 146 em ordem cronológica crescente. O campo `submitted_at` recebeu o "Carimbo de data/hora" de cada linha. Se as datas estiverem corretas (2022, 2023, 2024...), o `ORDER BY submitted_at DESC` deveria mostrar 2026 primeiro, depois 2025, etc.

Possibilidade: se o `submitted_at` foi salvo como string (não como timestamp ISO), ou se o "Carimbo de data/hora" da planilha veio em formato brasileiro `dd/mm/yyyy hh:mm:ss` e foi salvo como string solta, a ordenação fica alfabética (`01/...` antes de `12/...`) — explicando por que parece "ao contrário".

Vou consultar o banco pra confirmar como o `submitted_at` está armazenado.

## Plano de investigação e correção

### Passo 1: Diagnóstico (vou fazer agora antes de propor solução final)
- Consultar `form_responses` no banco pra ver formato de `submitted_at` das respostas atuais
- Checar logs da edge function `receive-form-response` pra ver se a resposta de teste do Otavio chegou
- Verificar como o componente exibe a ordem

### Passo 2: Corrigir Problema 1 (resposta não chega)

Dependendo do que os logs mostrarem:
- **Se a edge function NÃO foi chamada**: trigger desativado ou erro no Apps Script. Vou pedir pra você abrir o menu Acionadores (⏰) e mandar print, e também ver as Execuções (menu de relógio com histórico) pra ver se houve erro.
- **Se foi chamada e falhou**: corrigir o erro específico (provavelmente secret errado).
- **Se foi chamada e sucesso, mas não aparece**: problema de realtime/filtro no frontend.

### Passo 3: Corrigir Problema 2 (ordem)

Se o `submitted_at` está como string brasileira:
- **Causa**: o Apps Script atual usa `submittedAt = data['Carimbo de data/hora']`, mas como esse campo está dentro do `data` filtrado, ele guarda o valor já convertido pra ISO (porque o loop converte `Date` → ISO antes). Então deveria estar OK pras respostas novas.
- Mas as respostas antigas importadas pelo `importarHistorico` (que você rodou antes) podem ter sido salvas com formato diferente.

Como você apagou tudo (DELETE FROM form_responses) e estamos começando do zero, esse problema só existirá se a resposta nova foi salva errada. Vou confirmar consultando o banco.

### Solução provável (a confirmar após diagnóstico)

1. **Corrigir Apps Script**: garantir que `submitted_at` enviado pra edge function é sempre ISO 8601 válido (não string brasileira)
2. **Corrigir frontend (defensivo)**: adicionar parsing tolerante a formato brasileiro no sort, caso já exista dado ruim
3. **Reativar/verificar trigger** se necessário

### O que vou pedir ao aprovar

Consulta SQL ao banco + leitura de logs da edge function pra diagnóstico preciso, depois aplico a correção exata. Não vou chutar — o diagnóstico vai dizer se é problema de trigger, secret, formato de data, ou frontend.

