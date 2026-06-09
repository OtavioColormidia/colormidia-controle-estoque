import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const SYSTEM_PROMPT = `Você é um assistente especializado em extrair dados estruturados de Notas Fiscais brasileiras (NF-e/DANFE) a partir de imagens ou PDFs.

Extraia APENAS estes campos da NF e retorne SOMENTE um JSON válido (sem markdown, sem comentários):

{
  "supplierName": "razão social do EMITENTE/fornecedor",
  "supplierCnpj": "CNPJ do emitente, formato 00.000.000/0000-00 ou apenas dígitos",
  "documentNumber": "número da NF",
  "expectedDeliveryDate": "AAAA-MM-DD ou null (data prevista de entrega, se houver)",
  "ipi": número (valor total do IPI em R$, 0 se não houver),
  "frete": número (valor do frete em R$, 0 se não houver),
  "discount": número (valor de desconto total em R$, 0 se não houver),
  "items": [
    { "productName": "descrição do produto", "quantity": número, "unitPrice": número }
  ]
}

Regras:
- Use ponto como separador decimal.
- Para itens, use a descrição, quantidade e valor unitário (não o total).
- Se algum campo não estiver visível, use null (ou 0 para os valores numéricos opcionais).
- NÃO invente dados. NÃO inclua texto fora do JSON.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { fileBase64, mimeType } = await req.json();
    if (!fileBase64 || !mimeType) {
      return new Response(JSON.stringify({ error: 'fileBase64 e mimeType são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isPdf = mimeType === 'application/pdf';
    const userContent: any[] = [
      { type: 'text', text: 'Extraia os dados desta Nota Fiscal e retorne SOMENTE o JSON conforme as instruções.' },
    ];
    if (isPdf) {
      userContent.push({
        type: 'file',
        file: { filename: 'nf.pdf', file_data: `data:${mimeType};base64,${fileBase64}` },
      });
    } else {
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${fileBase64}` },
      });
    }

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: 'Limite de requisições. Tente novamente em instantes.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos no workspace.' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: 'Falha na IA', detail: text }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiRes.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? '';

    // Strip markdown fences if present
    const cleaned = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: any = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('Resposta da IA não é JSON válido');
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Erro desconhecido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
