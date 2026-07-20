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
  name: "list_material_requests",
  title: "Listar requisições de material",
  description:
    "Lista requisições recebidas (form_responses), com status pendente / realizado / entregue.",
  inputSchema: {
    bucket: z.enum(["pending", "ordered", "completed", "all"]).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bucket, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("form_responses")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(limit ?? 50);
    if (bucket === "completed") q = q.eq("completed", true);
    else if (bucket === "ordered") q = q.eq("ordered", true).eq("completed", false);
    else if (bucket === "pending") q = q.eq("ordered", false).eq("completed", false);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { requests: data ?? [] },
    };
  },
});
