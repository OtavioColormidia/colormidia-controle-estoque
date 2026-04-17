

O usuário quer importar **apenas algumas colunas** específicas da planilha (as visíveis na print: Carimbo de data/hora, Tipo, Solicitante, O.S. nº, Materiais, Quantidade, Produção em), e **ignorar** as colunas extras que existem na planilha mas não são respostas do formulário (Valor, Observações, Status, Comprador, Entrega Prevista).

Essas colunas extras provavelmente foram adicionadas manualmente na planilha pelo time de compras pra controle interno — não fazem parte do Google Form.

## Plano

### Opção escolhida: filtrar no Apps Script (na origem)

Filtrar **antes** de enviar pra Edge Function é melhor que filtrar no banco/frontend porque:
- Não polui o banco com dados que não interessam
- Reduz tráfego de rede
- Mantém a Edge Function genérica (não precisa saber de regras específicas dessa planilha)

### Como fazer: lista branca de colunas

Vou ajustar a função `onFormSubmit` no Apps Script pra incluir uma constante `COLUNAS_PERMITIDAS` com os nomes exatos dos cabeçalhos que devem ser enviados. Qualquer coluna fora dessa lista é descartada antes do `data` ser montado.

```javascript
const COLUNAS_PERMITIDAS = [
  'Carimbo de data/hora',
  'Tipo',
  'Solicitante',
  'O.S. nº',
  'Materiais',
  'Quantidade',
  'Produção em'
];
```

### Vantagens dessa abordagem

1. **Fácil de manter**: se amanhã o formulário ganhar uma pergunta nova, basta adicionar o nome dela na lista
2. **À prova de mudança de ordem**: filtra por nome do cabeçalho, não por índice de coluna — se alguém mover colunas na planilha, continua funcionando
3. **Tolerante a colunas extras**: o time de compras pode adicionar quantas colunas de controle interno quiser na planilha sem afetar o que vai pro site

### Cuidado importante

Os nomes na lista precisam ser **idênticos** aos cabeçalhos da linha 1 da planilha (incluindo acentos, maiúsculas/minúsculas, espaços e pontuação). Por exemplo, se na planilha está `O.S. nº` (com º minúsculo), tem que ser exatamente assim na lista.

### Não precisa mexer em nada do Lovable

- Edge Function: continua igual (recebe qualquer estrutura em `data`)
- Tabela `form_responses`: campo `data` é JSONB, aceita qualquer formato
- Componente `FormResponses.tsx`: já renderiza dinamicamente as chaves do JSON, então só vai mostrar o que vier

### Entregáveis

Vou te entregar **o código completo atualizado da `onFormSubmit`** com o filtro embutido, prontinho pra você substituir o que está no Apps Script. Junto com instruções claras de:
1. Como confirmar os nomes exatos dos cabeçalhos da sua planilha
2. Onde colar o código
3. Como testar

