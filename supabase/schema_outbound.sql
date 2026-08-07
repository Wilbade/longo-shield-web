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
    status_dmarc TEXT DEFAULT 'Ausente',
    status_spf TEXT DEFAULT 'Incompleto',
    status_ssl TEXT DEFAULT 'Desconhecido',
    score_resiliencia TEXT DEFAULT 'Pendente',
    provedor_email TEXT,
    vulnerabilidades_resumo TEXT,
    email_prospeccao_gerado TEXT,
    dossie_markdown TEXT,
    status_prospeccao TEXT DEFAULT 'Auditado', -- 'Varrendo', 'Auditado', 'Email_Enviado', 'Convertido'
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilita a Segurança em Nível de Linha (RLS)
ALTER TABLE prospects_outbound ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS:
-- Permite leitura e inserção de dados para usuários autenticados (Painel CRM)
CREATE POLICY "Permite leitura autenticada de prospects" 
ON prospects_outbound FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permite insercao autenticada de prospects" 
ON prospects_outbound FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Permite atualizacao autenticada de prospects" 
ON prospects_outbound FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Permite exclusao autenticada de prospects" 
ON prospects_outbound FOR DELETE TO authenticated USING (true);

-- 4. Índice para busca rápida por domínio e status
CREATE INDEX IF NOT EXISTS idx_prospects_dominio ON prospects_outbound(dominio);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects_outbound(status_prospeccao);

COMMENT ON TABLE prospects_outbound IS 'Tabela de armazenamento de leads e prospecções ativas capturadas pelo Modo Agêntico Outbound WL TEC';
