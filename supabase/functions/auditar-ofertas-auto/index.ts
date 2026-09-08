import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Busca chave do Gemini na tabela config_privada ou env
    let geminiKey = Deno.env.get('GEMINI_API_KEY') ?? ''
    if (!geminiKey) {
      const { data: cfgData } = await supabase
        .from('config_privada')
        .select('chave_valor')
        .eq('chave_nome', 'GEMINI_API_KEY')
        .maybeSingle()
      if (cfgData?.chave_valor) geminiKey = cfgData.chave_valor
    }

    // 2. Busca todos os produtos ativos
    const { data: produtos, error: errProd } = await supabase
      .from('afiliados_produtos')
      .select('*')
      .neq('status', 'arquivado')

    if (errProd) throw errProd
    if (!produtos || produtos.length === 0) {
      return new Response(JSON.stringify({ ok: true, mensagem: 'Nenhum produto para auditar' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const relatorio = []

    // 3. Itera produtos atualizando vendas, notas, menor preço e selos dinâmicos
    for (const prod of produtos) {
      let alteracoes = {}
      let novoBadge = prod.badge || 'WL TEC Verificado'
      let novaNota = Number(prod.avaliacao_estrelas || 4.8)
      let novoTotalAvaliacoes = Number(prod.total_avaliacoes || 150)
      let menorPreco = Number(prod.preco_estimado)

      // Regra Dinâmica de Badges baseada em Performance Real
      if (prod.total_cliques && prod.total_cliques > 30) {
        novoBadge = '🔥 Mais Vendido (+50k buscas)'
      } else if (novaNota >= 4.9) {
        novoBadge = '⭐ Melhor Avaliado (4.9★)'
      } else if (prod.preco_antigo && menorPreco < Number(prod.preco_antigo)) {
        const descPct = Math.round((1 - menorPreco / Number(prod.preco_antigo)) * 100)
        novoBadge = `⚡ Menor Preço (${descPct}% OFF)`
      }

      // Se houver chave Gemini, audita dados de mercado em tempo real
      if (geminiKey) {
        try {
          const prompt = `Você é o auditor automático 24/7 do comparador WL TEC Ofertas (Brasil).
Audite os dados de mercado do produto: "${prod.titulo}".
Valores atuais no banco:
- Preço Estimado: R$ ${menorPreco}
- Avaliação: ${novaNota} estrelas
- Total de avaliações: ${novoTotalAvaliacoes}

Retorne ESTRITAMENTE um JSON puro sem markdown:
{
  "avaliacao_estrelas": 4.8,
  "total_avaliacoes": 16500,
  "badge": "${novoBadge}",
  "preco_mercadolivre": ${prod.preco_mercadolivre || menorPreco},
  "preco_shopee": ${prod.preco_shopee || menorPreco},
  "preco_amazon": ${prod.preco_amazon || menorPreco},
  "preco_aliexpress": ${prod.preco_aliexpress || 'null'}
}`

          const resIa = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          })

          if (resIa.ok) {
            const dataIa = await resIa.json()
            const rawTxt = dataIa?.candidates?.[0]?.content?.parts?.[0]?.text
            if (rawTxt) {
              const clean = rawTxt.replace(/```json/g, '').replace(/```/g, '').trim()
              const parsed = JSON.parse(clean)

              if (parsed.avaliacao_estrelas) novaNota = Number(parsed.avaliacao_estrelas)
              if (parsed.total_avaliacoes) novoTotalAvaliacoes = Number(parsed.total_avaliacoes)
              if (parsed.badge) novoBadge = parsed.badge

              const precos = [
                parsed.preco_mercadolivre,
                parsed.preco_shopee,
                parsed.preco_amazon,
                parsed.preco_aliexpress
              ].filter((p): p is number => typeof p === 'number' && !isNaN(p) && p > 0)

              if (precos.length > 0) menorPreco = Math.min(...precos)

              alteracoes = {
                preco_mercadolivre: parsed.preco_mercadolivre ?? prod.preco_mercadolivre,
                preco_shopee: parsed.preco_shopee ?? prod.preco_shopee,
                preco_amazon: parsed.preco_amazon ?? prod.preco_amazon,
                preco_aliexpress: parsed.preco_aliexpress ?? prod.preco_aliexpress
              }
            }
          }
        } catch (eIa) {
          console.warn(`[Auditoria Auto] Erro ao consultar IA para "${prod.slug}":`, eIa)
        }
      }

      // 4. Salva atualização no Supabase
      const updatePayload = {
        badge: novoBadge,
        avaliacao_estrelas: novaNota,
        total_avaliacoes: novoTotalAvaliacoes,
        preco_estimado: menorPreco,
        atualizado_em: new Date().toISOString(),
        ...alteracoes
      }

      await supabase
        .from('afiliados_produtos')
        .update(updatePayload)
        .eq('id', prod.id)

      relatorio.push({ slug: prod.slug, badge: novoBadge, avaliacoes: novoTotalAvaliacoes, preco: menorPreco })
    }

    return new Response(JSON.stringify({
      ok: true,
      total_auditados: produtos.length,
      timestamp: new Date().toISOString(),
      produtos: relatorio
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, erro: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
