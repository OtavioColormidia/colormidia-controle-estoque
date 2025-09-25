import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cnpj } = await req.json()
    
    // Tentar buscar na API BrasilAPI (gratuita)
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
    
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
          cep: data.cep
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