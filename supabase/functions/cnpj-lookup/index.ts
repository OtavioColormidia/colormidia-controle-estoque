import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- AuthN: require a valid signed-in user ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- Input validation: CNPJ must be exactly 14 digits ---
    const body = await req.json().catch(() => ({}))
    const raw = body?.cnpj
    const digits = String(raw ?? '').replace(/\D/g, '')
    if (!/^\d{14}$/.test(digits)) {
      return new Response(
        JSON.stringify({ error: 'CNPJ inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)

    if (response.ok) {
      const data = await response.json()
      return new Response(
        JSON.stringify({
          razao_social: data.razao_social,
          nome_fantasia: data.nome_fantasia,
          email: data.email,
          telefone: data.ddd_telefone_1 ? `${data.ddd_telefone_1}` : '',
          logradouro: data.logradouro,
          numero: data.numero,
          municipio: data.municipio,
          uf: data.uf,
          cep: data.cep,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'CNPJ não encontrado' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
