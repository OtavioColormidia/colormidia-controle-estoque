

## Adicionar botao de visualizacao de PDF nos anexos

### O que sera feito
Adicionar um botao de "olho" (Eye icon) ao lado do botao de download em cada anexo, que abre o arquivo em uma nova aba do navegador para visualizacao.

### Detalhes tecnicos

1. **Importar icone `Eye`** do lucide-react na linha de imports
2. **Criar funcao `handlePreviewAttachment`** que gera uma URL publica do Supabase Storage e abre em nova aba (`window.open`)
3. **Adicionar botao de preview** entre o nome do arquivo e o botao de download, com o icone `Eye`

A URL publica sera obtida via `supabase.storage.from("purchase-attachments").getPublicUrl(path)`. Se o bucket nao for publico, usaremos `createSignedUrl` com tempo de expiracao.

### Arquivos alterados
- `src/components/Purchases.tsx` - adicionar icone, funcao e botao

