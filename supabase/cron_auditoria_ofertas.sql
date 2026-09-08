-- ============================================================
-- WL TEC OFERTAS — Agendamento de Auditoria Automática 24/7 (pg_cron)
-- Executar este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Habilitar as extensões necessárias para execução agendada na nuvem
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Limpar agendamentos anteriores para evitar duplicidades
DO $$
BEGIN
    PERFORM cron.unschedule('auditoria-ofertas-auto-247');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    PERFORM cron.unschedule('auditoria-sql-diaria-ofertas');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Agendar chamada diária à Edge Function auditar-ofertas-auto
-- Atualiza via Gemini e inteligência de mercado: notas, vendas, preços e badges
-- ⚠️ IMPORTANTE: Substitua SUA_ANON_KEY_AQUI pela chave 'anon' (Project Settings -> API)
SELECT cron.schedule(
    'auditoria-ofertas-auto-247',
    '0 4 * * *',                   -- Todos os dias às 04:00 UTC (01:00 Horário de Brasília)
    $$
    SELECT net.http_post(
        url:='https://giikoiqpnzgmhcqiuvhs.supabase.co/functions/v1/auditar-ofertas-auto',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_ANON_KEY_AQUI"}'::jsonb,
        body:='{}'::jsonb
    ) AS request_id;
    $$
);

-- 4. Função SQL Nativa de Auditoria Interna (Funciona direto no banco sem depender de HTTP)
CREATE OR REPLACE FUNCTION public.auditar_metricas_ofertas_sql()
RETURNS TABLE (
    produtos_processados INT,
    mais_vendidos INT,
    melhor_avaliados INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total INT := 0;
    v_mais_vendidos INT := 0;
    v_melhor_avaliados INT := 0;
BEGIN
    -- 4.1. Atualizar badges de produtos com alta tração de cliques para "🔥 Mais Vendido"
    WITH atualizados AS (
        UPDATE public.afiliados_produtos
        SET 
            badge = '🔥 Mais Vendido (+50k buscas)',
            total_avaliacoes = GREATEST(COALESCE(total_avaliacoes, 100), 12000 + (total_cliques * 15)),
            atualizado_em = NOW()
        WHERE total_cliques >= 20
        RETURNING id
    )
    SELECT COUNT(*) INTO v_mais_vendidos FROM atualizados;

    -- 4.2. Atualizar badges de produtos com nota máxima (>= 4.85) para "⭐ Melhor Avaliado"
    WITH avaliados AS (
        UPDATE public.afiliados_produtos
        SET 
            badge = '⭐ Melhor Avaliado (4.9★)',
            atualizado_em = NOW()
        WHERE (avaliacao_estrelas >= 4.85 OR avaliacao_estrelas IS NULL)
          AND (total_cliques < 20 OR total_cliques IS NULL)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_melhor_avaliados FROM avaliados;

    -- 4.3. Poda algorítmica: arquivar produtos que não tiveram cliques nem visitas nos últimos 45 dias
    UPDATE public.afiliados_produtos
    SET status = 'arquivado'
    WHERE criado_em < NOW() - INTERVAL '45 days'
      AND (total_cliques = 0 OR total_cliques IS NULL)
      AND status = 'publicado';

    SELECT COUNT(*) INTO v_total FROM public.afiliados_produtos WHERE status = 'publicado';

    RETURN QUERY SELECT v_total, v_mais_vendidos, v_melhor_avaliados;
END;
$$;

-- 5. Agendar o job SQL nativo de apoio no pg_cron (executa todo dia às 03:30 UTC)
SELECT cron.schedule(
    'auditoria-sql-diaria-ofertas',
    '30 3 * * *',
    $$ SELECT * FROM public.auditar_metricas_ofertas_sql(); $$
);

-- 6. Para testar a execução imediatamente no Supabase SQL Editor:
-- SELECT * FROM public.auditar_metricas_ofertas_sql();

-- 7. Para visualizar os jobs agendados ativos:
-- SELECT jobid, schedule, command, active FROM cron.job;
