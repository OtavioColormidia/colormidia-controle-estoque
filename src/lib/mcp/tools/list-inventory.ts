import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_inventory",
  title: "Listar estoque",
  description:
    "Lista produtos do estoque com nome, categoria, quantidade atual e mínimo. Suporta filtro por texto e limite.",
  inputSchema: {
    search: z.string().trim().optional().describe("Filtro por nome ou categoria."),
    limit: z.number().int().min(1).max(200).optional().describe("Máximo de itens (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("products")
      .select("id,name,category,quantity,minimum_stock,unit,average_cost")
      .order("name")
      .limit(limit ?? 50);
    if (search) q = q.or(`name.ilike.%${search}%,category.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { products: data ?? [] },
    };
  },
});
