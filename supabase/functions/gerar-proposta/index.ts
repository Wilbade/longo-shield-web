import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuração do CORS para ser chamado pelo Frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Tratamento da requisição OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Apenas usuários autenticados (Admin) podem chamar essa função
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verifica sessão ativa
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Não autorizado. Apenas admins logados podem gerar relatórios.')
    }

    const { lead } = await req.json()
    if (!lead || !lead.dominio) {
      throw new Error('Dados do lead incompletos.')
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) {
      throw new Error('Chave do Gemini não configurada no Supabase (Secrets).')
    }

    const promptText = `Atue como Wiliam Longo, Especialista em Cibersegurança da WL TEC.
Telefone/WhatsApp: 11 99531-4831 | Email: contato@wl.tec.br | Site: wl.tec.br

Escreva um dossiê técnico e comercial contendo EXATAMENTE 3 seções, rigorosamente separadas pela tag secreta [DIVISAO_WL]. Não escreva nada antes da primeira tag.

[DIVISAO_WL]
1. E-MAIL DE PROSPECÇÃO (Cold Mail)
Escreva um e-mail persuasivo, agressivo comercialmente e curto (máx 3 parágrafos) para o diretor da empresa dona do domínio **${lead.dominio}**. Vá direto ao ponto, cite os riscos encontrados na plataforma (ex: falta de SPF/BIMI) e chame para uma reunião da WL TEC. Assine como William Longo.

[DIVISAO_WL]
2. PROPOSTA COMERCIAL COMPLETA (PDF)
Escreva uma proposta estruturada e formal contendo: Diagnóstico Técnico Detalhado, Riscos Identificados de forma técnica, Plano de Ação (solução Blindagem Digital) e Investimento sugerido. Use Markdown.

[DIVISAO_WL]
3. GUIA TÉCNICO INTERNO DE CORREÇÃO (SOP)
Crie um passo-a-passo técnico (Standard Operating Procedure) do que eu (Especialista) devo fazer na prática no painel do cliente para corrigir essas vulnerabilidades assim que o contrato for assinado.

Dados para basear toda a análise:
- Data Atual: ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
- Score Final: ${lead.score}
- SSL Ativo: ${lead.status_ssl}
- Reputação/Vírus: ${lead.reputacao}
- Plataforma/DNS (CRÍTICO): ${lead.plataforma}`;

    // Request ao Google Gemini com suporte a retry em 429 e fallback de modelo
    const modelos = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'];
    let respostaTexto = '';

    for (const modelo of modelos) {
      let delay = 2000;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1/models/${modelo}:generateContent?key=${geminiKey}`;
          const geminiRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
              generationConfig: { temperature: 0.3 }
            })
          });

          if (geminiRes.status === 429) {
            console.warn(`[Edge Gemini 429] Model ${modelo}, attempt ${attempt + 1}. Waiting ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
            continue;
          }

          if (!geminiRes.ok) break;

          const geminiData = await geminiRes.json();
          if (geminiData.candidates && geminiData.candidates[0]?.content?.parts[0]?.text) {
            respostaTexto = geminiData.candidates[0].content.parts[0].text;
            break;
          }
        } catch (e) {
          console.warn(`[Edge Gemini Error] ${modelo}:`, e);
          break;
        }
      }
      if (respostaTexto) break;
    }

    if (!respostaTexto) {
       throw new Error('A API do Gemini não retornou conteúdo devido a limite de taxa ou indisponibilidade.');
    }

    return new Response(
      JSON.stringify({ texto: respostaTexto }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
