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

Escreva uma abordagem comercial DIRETA E CURTA (máximo de 3 a 4 parágrafos) para o domínio **${lead.dominio}**. 
O objetivo é colar este texto diretamente no CORPO DE UM E-MAIL (Cold Mail) para o diretor da empresa. NÃO seja prolixo, não crie documentos longos nem listas gigantes.

Dados:
- Domínio: ${lead.dominio}
- Score Final: ${lead.score}
- Reputação/Vírus: ${lead.reputacao}
- SSL Ativo: ${lead.status_ssl}
- Plataforma e Infraestrutura (MUITO IMPORTANTE): ${lead.plataforma}

Regras de Ouro:
1. Vá direto ao ponto: cite o domínio do cliente e destaque os riscos mais críticos que você encontrou na variável Plataforma (ex: falta de SPF, falta de BIMI, uso de WordPress vulnerável, ausência de DMARC).
2. Apresente a WL TEC e a nossa solução de Blindagem Digital como a resolução rápida para esses riscos.
3. Termine com uma Chamada para Ação (Call to Action) chamativa para o cliente responder o e-mail ou chamar no WhatsApp.
4. Assine como William Longo no final. Use Markdown apenas para colocar termos-chave em **negrito**.`;

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
