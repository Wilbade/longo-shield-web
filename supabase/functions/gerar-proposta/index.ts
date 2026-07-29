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

    const promptText = `Aja como um engenheiro de segurança sênior. 
Analise os dados deste Lead (Domínio auditado) e crie um parágrafo técnico, persuasivo e altamente profissional que possa ser enviado no corpo de um e-mail. 
Não use saudações, vá direto ao ponto técnico focando na gravidade e na venda da nossa solução de Blindagem Digital (WL TEC).
Dados:
- Domínio: ${lead.dominio}
- Score Final: ${lead.score}
- Reputação/Vírus: ${lead.reputacao}
- SSL Ativo: ${lead.status_ssl}
- Velocidade: ${lead.velocidade}
- Plataforma/Servidor: ${lead.plataforma}`;

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
