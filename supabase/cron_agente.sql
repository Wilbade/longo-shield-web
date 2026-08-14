-- ============================================================
-- WL TEC — Agendamento de Execução 24/7 do Agente (pg_cron)
-- Executar este SQL no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Habilitar as extensões necessárias para execução agendada na nuvem
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Limpar agendamento anterior (se existir) para evitar duplicidade
DO $$
BEGIN
    PERFORM cron.unschedule('agente-247-prospeccao-auto');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Agendar a Edge Function agente-247 para rodar automaticamente a cada 6 horas
-- ⚠️ IMPORTANTE: Substitua SUA_ANON_KEY_AQUI pela sua chave 'anon' (Project Settings -> API)
SELECT cron.schedule(
    'agente-247-prospeccao-auto', -- Nome único do job
    '0 */6 * * *',                -- Executa a cada 6 horas (00:00, 06:00, 12:00, 18:00)
    $$
    SELECT net.http_post(
        url:='https://giikoiqpnzgmhcqiuvhs.supabase.co/functions/v1/agente-247',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_ANON_KEY_AQUI"}'::jsonb,
        body:='{}'::jsonb
    ) AS request_id;
    $$
);

-- 4. Para verificar os agendamentos ativos no Supabase:
-- SELECT * FROM cron.job;
