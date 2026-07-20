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
  name: "low_stock_products",
  title: "Produtos com estoque baixo",
  description:
    "Retorna produtos cuja quantidade em estoque está abaixo ou próxima do mínimo (crítico/atenção).",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("products")
      .select("id,name,category,quantity,minimum_stock,unit")
      .order("quantity")
      .limit(limit ?? 100);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const low = (data ?? []).filter(
      (p: any) => Number(p.quantity ?? 0) <= Number(p.minimum_stock ?? 0) * 1.5,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(low) }],
      structuredContent: { products: low },
    };
  },
});
