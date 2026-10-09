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

    const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    const get = async (url: string) => {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
        return r.ok ? await r.json() : null
      } catch { return null }
    }

    // 1) BrasilAPI
    const b = await get(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
    if (b?.razao_social) {
      return json({
        razao_social: b.razao_social, nome_fantasia: b.nome_fantasia, email: b.email,
        telefone: b.ddd_telefone_1 ? `${b.ddd_telefone_1}` : '',
        logradouro: b.logradouro, numero: b.numero, municipio: b.municipio, uf: b.uf, cep: b.cep,
      })
    }

    // 2) CNPJá (open)
    const c = await get(`https://open.cnpja.com/office/${digits}`)
    if (c?.company?.name) {
      const p = c.phones?.[0]
      return json({
        razao_social: c.company.name, nome_fantasia: c.alias ?? '', email: c.emails?.[0]?.address ?? '',
        telefone: p ? `${p.area}${p.number}` : '',
        logradouro: c.address?.street ?? '', numero: c.address?.number ?? '',
        municipio: c.address?.city ?? '', uf: c.address?.state ?? '', cep: c.address?.zip ?? '',
      })
    }

    // 3) ReceitaWS
    const r = await get(`https://receitaws.com.br/v1/cnpj/${digits}`)
    if (r?.nome && r.status !== 'ERROR') {
      return json({
        razao_social: r.nome, nome_fantasia: r.fantasia, email: r.email,
        telefone: (r.telefone ?? '').replace(/\D/g, '').slice(0, 11),
        logradouro: r.logradouro, numero: r.numero, municipio: r.municipio, uf: r.uf,
        cep: (r.cep ?? '').replace(/\D/g, ''),
      })
    }

    return json({ error: 'CNPJ não encontrado' }, 404)
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
