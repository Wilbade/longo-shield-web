-- ============================================================
-- WL TEC — Telemetria de Tráfego & Analytics (site_visits)
-- Executar este SQL no SQL Editor do seu projeto Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS site_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL,
    pagina TEXT NOT NULL,
    referrer TEXT,
    origem_tipo TEXT NOT NULL, -- 'Pesquisa Orgânica', 'Pesquisa IA (GEO)', 'Redes Sociais', 'Direto / Outros'
    origem_nome TEXT NOT NULL, -- 'Google', 'Bing', 'ChatGPT', 'Perplexity', 'Google Gemini', 'Claude', 'Instagram', 'WhatsApp', 'Direto'
    dispositivo TEXT DEFAULT 'Desktop', -- 'Mobile', 'Desktop'
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;

-- Política de inserção pública (permite que qualquer visitante grave a visita anonimamente)
CREATE POLICY "Permite insercao publica de visitas" 
ON site_visits FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Política de leitura pública/autenticada para alimentar o painel seo-geo.html
CREATE POLICY "Permite leitura publica de metricas de visitas" 
ON site_visits FOR SELECT TO anon, authenticated USING (true);
