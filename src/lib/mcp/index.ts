import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listInventory from "./tools/list-inventory";
import lowStock from "./tools/low-stock";
import listSuppliers from "./tools/list-suppliers";
import listPurchases from "./tools/list-purchases";
import listRequests from "./tools/list-requests";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "colormidia-mcp",
  title: "ColorMídia - Controle de Estoque",
  version: "0.1.0",
  instructions:
    "Ferramentas para consultar o sistema de Controle de Estoque / Compras da ColorMídia: estoque, produtos com estoque baixo, fornecedores, compras e requisições de material. Todas as chamadas respeitam as permissões (RLS) do usuário conectado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listInventory, lowStock, listSuppliers, listPurchases, listRequests],
});
