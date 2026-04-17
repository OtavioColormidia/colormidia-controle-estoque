

O usuário quer:
1. Apagar todas as respostas que já foram importadas pra tabela `form_responses`
2. Não rodar mais o `importarHistorico` — só manter o trigger automático (`onFormSubmit`) pras respostas novas

Razão: a planilha tem várias abas com dados de anos antigos (até 2022) e o script importou tudo, o que não é desejado.

## Plano

### 1. Limpar a tabela `form_responses`
Executar um `DELETE` simples removendo todas as linhas da tabela. Como a tabela só guarda respostas de formulário (não tem FKs apontando pra ela), é seguro apagar tudo. Vou usar a ferramenta de insert/delete (não migration, pois é operação de dados, não de schema).

```sql
DELETE FROM public.form_responses;
```

### 2. Instruir o usuário a remover (ou não rodar mais) a função `importarHistorico` no Apps Script
A função `onFormSubmit` continua ativa via trigger e vai capturar respostas novas automaticamente. A função `importarHistorico` pode:
- Ser apagada do editor (recomendado, pra evitar execução acidental no futuro), OU
- Ser deixada lá sem rodar (já que precisa ser executada manualmente — não tem trigger)

### 3. (Opcional, mas recomendado) Limitar o trigger a uma aba específica
Se a planilha tem várias abas e o trigger `onFormSubmit` está conectado à planilha inteira, ele já filtra automaticamente porque o evento `Ao enviar formulário` só dispara quando uma resposta de formulário chega — e isso só acontece na aba vinculada ao Form. Então não precisa mexer.

Mas vale confirmar com o usuário: o trigger atual está vinculado ao Google Form correto? Se sim, só respostas novas desse form vão chegar.

### Não precisa de mudança no código do projeto
O componente `FormResponses.tsx`, a edge function e o índice único continuam todos funcionando. A única ação no banco é o DELETE.

### Ordem de execução

1. Executar `DELETE FROM public.form_responses` via insert tool
2. Confirmar pro usuário que a tabela está vazia
3. Instruir ele a apagar a função `importarHistorico` do Apps Script (ou só não rodar mais)
4. Confirmar que o trigger `onFormSubmit` continua ativo pra respostas novas

