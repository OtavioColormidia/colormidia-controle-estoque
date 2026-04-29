import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "vehicle-odometer";

function decodeBase64(b64: string): Uint8Array {
  // strip data URL prefix if present
  const cleaned = b64.includes(",") ? b64.split(",")[1] : b64;
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function extractDriveId(url: string): string | null {
  if (!url) return null;
  // patterns: /file/d/<id>/, ?id=<id>, open?id=<id>, uc?id=<id>
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  return null;
}

async function uploadPhoto(
  supabase: ReturnType<typeof createClient>,
  photo: { base64?: string; url?: string; mimeType?: string; name?: string } | null | undefined,
  prefix: string,
): Promise<string | null> {
  if (!photo) return null;
  try {
    let bytes: Uint8Array | null = null;
    let mime = photo.mimeType || "image/jpeg";

    if (photo.base64) {
      bytes = decodeBase64(photo.base64);
    } else if (photo.url) {
      // try direct download (works for public files / uc?export=download links)
      const driveId = extractDriveId(photo.url);
      const downloadUrl = driveId
        ? `https://drive.google.com/uc?export=download&id=${driveId}`
        : photo.url;
      const resp = await fetch(downloadUrl, { redirect: "follow" });
      if (!resp.ok) {
        console.warn("Photo download failed", resp.status, downloadUrl);
        return null;
      }
      const ct = resp.headers.get("content-type");
      if (ct && !ct.includes("text/html")) mime = ct;
      bytes = new Uint8Array(await resp.arrayBuffer());
    } else {
      return null;
    }

    const ext = mime.split("/")[1]?.split(";")[0] || "jpg";
    const path = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: mime, upsert: false });

    if (upErr) {
      console.error("Storage upload error:", upErr);
      return null;
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return pub.publicUrl;
  } catch (e) {
    console.error("uploadPhoto error:", e);
    return null;
  }
}

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
    const expectedSecret = Deno.env.get("VEHICLE_TRIP_WEBHOOK_SECRET");
    const providedSecret = req.headers.get("x-webhook-secret");

    if (!expectedSecret) {
      console.error("VEHICLE_TRIP_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!providedSecret || providedSecret !== expectedSecret) {
      console.warn("Invalid webhook secret attempt");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      driver_name,
      vehicle_label,
      vehicle_plate,
      date,
      destination,
      km_start,
      km_end,
      notes,
      odometer_start,
      odometer_end,
    } = body ?? {};

    if (!driver_name || typeof driver_name !== "string") {
      return new Response(JSON.stringify({ error: "driver_name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (km_start === undefined || km_start === null || isNaN(Number(km_start))) {
      return new Response(JSON.stringify({ error: "km_start is required and must be numeric" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve vehicle_id by plate when possible
    let vehicleId: string | null = null;
    let resolvedLabel = vehicle_label || vehicle_plate || null;
    if (vehicle_plate && typeof vehicle_plate === "string") {
      const { data: veh } = await supabase
        .from("vehicles")
        .select("id, plate, model, brand")
        .ilike("plate", vehicle_plate.trim())
        .maybeSingle();
      if (veh) {
        vehicleId = veh.id;
        resolvedLabel = `${veh.plate} - ${veh.brand ?? ""} ${veh.model}`.trim();
      }
    }

    // Upload photos in parallel
    const [startUrl, endUrl] = await Promise.all([
      uploadPhoto(supabase, odometer_start, "start"),
      uploadPhoto(supabase, odometer_end, "end"),
    ]);

    const hasEnd = km_end !== undefined && km_end !== null && !isNaN(Number(km_end));

    const { data: inserted, error } = await supabase
      .from("vehicle_trips")
      .insert({
        driver_name: String(driver_name).trim(),
        vehicle_id: vehicleId,
        vehicle_label: resolvedLabel,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        destination: destination ?? null,
        km_start: Number(km_start),
        km_end: hasEnd ? Number(km_end) : null,
        odometer_start_url: startUrl,
        odometer_end_url: endUrl,
        notes: notes ?? null,
        status: hasEnd ? "completed" : "in_progress",
      })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Vehicle trip saved:", inserted.id);
    return new Response(
      JSON.stringify({ success: true, id: inserted.id, vehicle_matched: !!vehicleId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
