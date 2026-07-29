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

    // Request direto ao Google Gemini usando a chave do servidor, sem expor no frontend
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.3 }
      })
    });

    const geminiData = await geminiRes.json();
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
       throw new Error('A API do Gemini não retornou conteúdo.');
    }

    const respostaTexto = geminiData.candidates[0].content.parts[0].text;

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
