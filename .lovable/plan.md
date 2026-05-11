# Remover Controle de Veículos + Atalho Requisição no Dashboard

## 1. Remover Controle de Veículos (frontend)

- `src/components/layout/AppSidebar.tsx`: remover a seção `Frota` inteira (item "Controle de Veículos" e import do ícone `Car`).
- `src/App.tsx`: remover import `VehiclesPage` e a rota `/veiculos`.
- `src/pages/RoutePages.tsx`: remover import de `VehicleControl` e o export `VehiclesPage`.
- Excluir o arquivo `src/components/VehicleControl.tsx`.

## 2. Adicionar atalho "Requisição de Materiais" no Dashboard

Em `src/components/Dashboard.tsx`, no array `quickAccessCards`, adicionar (logo após "Compras") um novo card:

- id: `form-responses` (já mapeado em `tabToRoute` para `/requisicoes`)
- label: "Requisição de Materiais"
- description: "Pedidos recebidos via formulário"
- icon: `FileText` (lucide)
- gradient: `from-fuchsia-500 to-pink-500`
- allowedRoles: `["admin", "compras", "almoxarife"]`

Nenhuma mudança de rota necessária — `/requisicoes` já existe.

## 3. Backend (NÃO incluído neste plano)

A edge function `receive-vehicle-trip` e as tabelas `vehicles` / `vehicle_trips` no Supabase **não serão removidas** nesta etapa para evitar perda de dados. Se quiser que eu também apague (edge function + migration para dropar as tabelas + remover secret `VEHICLE_TRIP_WEBHOOK_SECRET`), me confirme depois.

## Detalhes técnicos

- O id `form-responses` no card aciona `onTabChange("form-responses")` que o `DashboardPage` traduz via `tabToRoute` para `navigate("/requisicoes")`.
- A sidebar não muda para Requisições (já existe na seção "Compras").
- Após remover a seção Frota, a sidebar fica sem a label "Frota" e sem o item — comportamento esperado.
