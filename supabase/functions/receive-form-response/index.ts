import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Validate webhook secret
    const expectedSecret = Deno.env.get("FORM_WEBHOOK_SECRET");
    const providedSecret = req.headers.get("x-webhook-secret");

    if (!expectedSecret) {
      console.error("FORM_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!providedSecret || providedSecret !== expectedSecret) {
      console.warn("Invalid webhook secret attempt");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const body = await req.json();
    const { form_name, submitted_at, data, sheet_row } = body ?? {};

    if (!form_name || typeof form_name !== "string") {
      return new Response(
        JSON.stringify({ error: "form_name is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!data || typeof data !== "object") {
      return new Response(
        JSON.stringify({ error: "data must be an object" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert via service role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: inserted, error } = await supabase
      .from("form_responses")
      .insert({
        form_name,
        submitted_at: submitted_at ?? new Date().toISOString(),
        data,
        sheet_row: typeof sheet_row === "number" ? sheet_row : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Form response saved:", inserted.id);

    return new Response(
      JSON.stringify({ success: true, id: inserted.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
