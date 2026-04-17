

## Diagnóstico do print

O log mostra o erro real:
```
TypeError: Cannot read properties of undefined (reading 'range')
```

Isso acontece na linha `const sheet = e.range.getSheet();` — o `e` (evento) está `undefined`. Isso significa que **a função foi executada manualmente** (botão "Executar" no editor), não disparada pelo formulário. Quando rodada manualmente, `e` não existe.

**Mas tem outro problema mais importante visível no print:**
- `WEBHOOK_SECRET = 'Otavio@123'` — esse valor precisa ser **idêntico** ao que está no Supabase como `FORM_WEBHOOK_SECRET`. Se não bate, a edge function rejeita com 401.

Por isso o usuário pediu pra gerar um novo secret e atualizar nos dois lados.

## Plano

### 1. Gerar novo WEBHOOK_SECRET forte
Vou gerar um secret aleatório seguro (32+ caracteres, alfanumérico) tipo:
```
fK7mP2xQ9vR4nW8tJ5yH3bN6cL1aZ0sE
```

### 2. Atualizar o secret no Supabase
Usar o tool de adicionar secret pra atualizar `FORM_WEBHOOK_SECRET` no Lovable Cloud com o novo valor.

### 3. Instruir o usuário a atualizar no Apps Script
Trocar a linha:
```javascript
const WEBHOOK_SECRET = 'Otavio@123';
```
por:
```javascript
const WEBHOOK_SECRET = 'NOVO_VALOR_GERADO';
```

### 4. Esclarecer sobre o erro do print
Explicar que o erro `Cannot read properties of undefined (reading 'range')` é **esperado** quando se aperta "Executar" manualmente — não é bug. A função só funciona quando disparada pelo trigger (envio real do formulário). O usuário não precisa rodar manualmente.

### 5. Próximos passos pro usuário
1. Salvar o código com o novo secret
2. Enviar uma resposta de teste pelo Google Form (não apertar "Executar")
3. Confirmar que aparece na aba Requisição de Materiais

### Observação sobre a edge function
A edge function `receive-form-response` lê `Deno.env.get("FORM_WEBHOOK_SECRET")` automaticamente — quando o secret é atualizado no Lovable, a função passa a ler o novo valor sem precisar redeployar.

