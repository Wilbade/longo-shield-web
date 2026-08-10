-- ============================================================================
-- SCRIPT SQL: ESTRUTURA DO MÓDULO AGÊNTICO OUTBOUND (WL TEC LONGO SHIELD)
-- Execute este script no SQL Editor do seu painel Supabase (https://supabase.com/dashboard)
-- ============================================================================

-- 1. Criação da Tabela de Prospects Outbound (Varredura Ativa)
CREATE TABLE IF NOT EXISTS prospects_outbound (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dominio TEXT NOT NULL UNIQUE,
    nome_empresa TEXT,
    nicho_cidade TEXT,
    email_comercial TEXT,
    whatsapp_contato TEXT,
    google_maps_url TEXT,
    status_dmarc TEXT DEFAULT 'Ausente',
    status_spf TEXT DEFAULT 'Incompleto',
    status_ssl TEXT DEFAULT 'Desconhecido',
    score_resiliencia TEXT DEFAULT 'Pendente',
    provedor_email TEXT,
    vulnerabilidades_resumo TEXT,
    email_prospeccao_gerado TEXT,
    dossie_markdown TEXT,
    lp_html TEXT,
    status_prospeccao TEXT DEFAULT 'Auditado', -- 'Varrendo', 'Auditado', 'Email_Enviado', 'Convertido', 'Domínio Morto (Google Ativo)', '👁️ LP Visualizada'
    lp_visualizada BOOLEAN DEFAULT FALSE,
    lp_visualizada_em TIMESTAMPTZ,
    lp_acessos_count INTEGER DEFAULT 0,
    lp_ultimo_ip TEXT,
    lp_ultima_localizacao TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 1.1 Adiciona colunas em tabelas existentes sem perda de dados
ALTER TABLE prospects_outbound ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
ALTER TABLE prospects_outbound ADD COLUMN IF NOT EXISTS lp_html TEXT;
ALTER TABLE prospects_outbound ADD COLUMN IF NOT EXISTS lp_visualizada BOOLEAN DEFAULT FALSE;
ALTER TABLE prospects_outbound ADD COLUMN IF NOT EXISTS lp_visualizada_em TIMESTAMPTZ;
ALTER TABLE prospects_outbound ADD COLUMN IF NOT EXISTS lp_acessos_count INTEGER DEFAULT 0;
ALTER TABLE prospects_outbound ADD COLUMN IF NOT EXISTS lp_ultimo_ip TEXT;
ALTER TABLE prospects_outbound ADD COLUMN IF NOT EXISTS lp_ultima_localizacao TEXT;

-- 2. Habilita a Segurança em Nível de Linha (RLS)
ALTER TABLE prospects_outbound ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS:
-- Remove políticas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "Permite leitura autenticada de prospects" ON prospects_outbound;
DROP POLICY IF EXISTS "Permite insercao autenticada de prospects" ON prospects_outbound;
DROP POLICY IF EXISTS "Permite atualizacao autenticada de prospects" ON prospects_outbound;
DROP POLICY IF EXISTS "Permite exclusao autenticada de prospects" ON prospects_outbound;
DROP POLICY IF EXISTS "Permite leitura publica e crm de prospects" ON prospects_outbound;
DROP POLICY IF EXISTS "Permite insercao publica e crm de prospects" ON prospects_outbound;
DROP POLICY IF EXISTS "Permite atualizacao publica e crm de prospects" ON prospects_outbound;
DROP POLICY IF EXISTS "Permite exclusao publica e crm de prospects" ON prospects_outbound;

-- Permite leitura, inserção, atualização e exclusão para anon (telemetria de preview e robô) e authenticated (painel CRM)
CREATE POLICY "Permite leitura publica e crm de prospects" 
ON prospects_outbound FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Permite insercao publica e crm de prospects" 
ON prospects_outbound FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Permite atualizacao publica e crm de prospects" 
ON prospects_outbound FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Permite exclusao publica e crm de prospects" 
ON prospects_outbound FOR DELETE TO anon, authenticated USING (true);

-- 4. Índice para busca rápida por domínio e status
CREATE INDEX IF NOT EXISTS idx_prospects_dominio ON prospects_outbound(dominio);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects_outbound(status_prospeccao);

COMMENT ON TABLE prospects_outbound IS 'Tabela de armazenamento de leads e prospecções ativas capturadas pelo Modo Agêntico Outbound WL TEC';
