## Problema
Chris consegue logar no PC mas recebe "senha inválida" no celular usando a mesma senha. Senha foi validada colando o texto, então não é erro de digitação.

## Causa provável
O campo de email em `src/pages/Auth.tsx` não desativa autocorreção/autocapitalização e não normaliza o valor antes de enviar. Em teclados mobile (iOS e Android), a primeira letra do email é capitalizada automaticamente e às vezes um espaço é adicionado no final. O Supabase Auth trata `Chris@x.com` e `chris@x.com` como contas diferentes e retorna `Invalid login credentials`.

## Correção
Ajustar apenas o formulário de login/cadastro em `src/pages/Auth.tsx`:

1. Nos `<Input type="email">` (login e signup), adicionar atributos mobile:
   - `autoCapitalize="none"`
   - `autoCorrect="off"`
   - `spellCheck={false}`
   - `inputMode="email"`

2. No `handleSignIn` e `handleSignUp`, normalizar antes de chamar o Supabase:
   ```ts
   const normalizedEmail = email.trim().toLowerCase();
   ```
   e usar `normalizedEmail` no `signInWithPassword` / `signUp`.

3. Melhorar a mensagem de erro quando o Supabase retornar "Invalid login credentials" para deixar claro que pode ser o email digitado errado (não só a senha).

## Verificação
Pedir ao Chris para tentar novamente no celular após o deploy. Se ainda falhar, próximo passo é resetar a senha dele pelo painel admin (provavelmente a conta dele foi criada no PC com email em letra minúscula e algum login antigo no celular ficou cacheado).

## Fora de escopo
- Não mexer em RLS, roles, edge functions ou em outras páginas.
- Não alterar fluxo de autorização do `is_authorized`.