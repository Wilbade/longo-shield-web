-- ============================================================
-- WL TEC — Agendamento de Execução 24/7 do Agente (pg_cron)
-- Executar este SQL no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Habilitar as extensões necessárias para execução agendada na nuvem
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Agendar a Edge Function agente-247 para rodar automaticamente a cada 6 horas
-- Substitua <SEU_ANON_KEY> pela sua Publishable / Anon Key do Supabase se necessário
SELECT cron.schedule(
    'agente-247-prospeccao-auto', -- Nome único do job
    '0 */6 * * *',                -- Executa a cada 6 horas (00:00, 06:00, 12:00, 18:00)
    $$
    SELECT net.http_post(
        url:='https://giikoiqpnzgmhcqiuvhs.supabase.co/functions/v1/agente-247',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{}'::jsonb
    ) AS request_id;
    $$
);

-- 3. Para verificar se o agendamento está ativo:
-- SELECT * FROM cron.job;
