-- ==============================================================================
-- WL TEC OFERTAS - ESTRUTURA DO BANCO DE DADOS (SUPABASE)
-- Módulo de Afiliados Multi-Lojas (Mercado Livre, Amazon, Shopee e AliExpress)
-- ==============================================================================

-- 1. Tabela de Configurações Globais (Seus IDs de Afiliado e Bots)
CREATE TABLE IF NOT EXISTS afiliados_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amazon_tag TEXT DEFAULT 'wilbade09-20',
    shopee_app_id TEXT DEFAULT '18349700720',
    ml_tracking_id TEXT DEFAULT 'wilbade',
    aliexpress_id TEXT DEFAULT 'wilbade',
    telegram_bot_token TEXT,
    telegram_chat_id TEXT,
    whatsapp_grupo_link TEXT DEFAULT 'https://chat.whatsapp.com/exemplo-wltec',
    dias_poda_algoritmica INT DEFAULT 45,
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração inicial se não existir
INSERT INTO afiliados_config (amazon_tag, shopee_app_id, ml_tracking_id, aliexpress_id)
SELECT 'wilbade09-20', '18349700720', 'wilbade', 'wilbade'
WHERE NOT EXISTS (SELECT 1 FROM afiliados_config);

-- 2. Tabela de Produtos, Reviews e Comparador 4 em 1
CREATE TABLE IF NOT EXISTS afiliados_produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    categoria TEXT NOT NULL, -- 'tecnologia', 'casa', 'moda', 'acessorios', 'apostas'
    subtitulo TEXT,
    imagem_url TEXT NOT NULL,
    badge TEXT DEFAULT 'WL TEC Verificado', -- 'Menor Preço', 'Mais Vendido', 'Destaque 48h', etc.
    avaliacao_estrelas NUMERIC(2,1) DEFAULT 4.8,
    total_avaliacoes INT DEFAULT 120,
    preco_estimado NUMERIC(10,2) NOT NULL,
    preco_antigo NUMERIC(10,2),
    
    -- Links e Preços Multi-Lojas (Preenchidos pela busca cruzada)
    link_mercadolivre TEXT,
    preco_mercadolivre NUMERIC(10,2),
    destaque_mercadolivre TEXT DEFAULT 'Entrega Full (Chega Rápido)',
    
    link_shopee TEXT,
    preco_shopee NUMERIC(10,2),
    destaque_shopee TEXT DEFAULT 'Cupons de Frete Grátis & Moedas',
    
    link_amazon TEXT,
    preco_amazon NUMERIC(10,2),
    destaque_amazon TEXT DEFAULT 'Entrega Prime & Garantia',
    
    link_aliexpress TEXT,
    preco_aliexpress NUMERIC(10,2),
    destaque_aliexpress TEXT DEFAULT 'Importação Direta & Descontos',

    -- Conteúdo Rico para SEO e E-E-A-T
    veredito_rapido TEXT,
    especificacoes_tecnicas JSONB DEFAULT '[]'::jsonb,
    pros JSONB DEFAULT '[]'::jsonb,
    contras JSONB DEFAULT '[]'::jsonb,
    faq JSONB DEFAULT '[]'::jsonb,
    fontes_citadas JSONB DEFAULT '[]'::jsonb,
    
    -- Status e Regras de Negócio
    status TEXT DEFAULT 'rascunho', -- 'rascunho', 'publicado', 'arquivado'
    is_aposta_alta BOOLEAN DEFAULT false,
    alerta_estoque BOOLEAN DEFAULT false,
    
    -- Métricas e Telemetria
    total_visitas INT DEFAULT 0,
    total_cliques INT DEFAULT 0,
    cliques_ml INT DEFAULT 0,
    cliques_shopee INT DEFAULT 0,
    cliques_amazon INT DEFAULT 0,
    cliques_ali INT DEFAULT 0,
    ultimo_acesso TIMESTAMPTZ,
    
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Cupons Ativos (Página Permanente /cupons)
CREATE TABLE IF NOT EXISTS afiliados_cupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja TEXT NOT NULL, -- 'mercadolivre', 'shopee', 'amazon', 'aliexpress'
    codigo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    desconto_texto TEXT NOT NULL, -- 'R$ 30 OFF acima de R$ 150'
    link_destino TEXT NOT NULL,
    valido_ate DATE,
    ativo BOOLEAN DEFAULT true,
    total_usos INT DEFAULT 0,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Telemetria de Acessos
CREATE TABLE IF NOT EXISTS afiliados_acessos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_slug TEXT REFERENCES afiliados_produtos(slug) ON DELETE CASCADE,
    origem TEXT DEFAULT 'direto', -- 'google', 'whatsapp', 'telegram', 'direto'
    dispositivo TEXT DEFAULT 'mobile', -- 'mobile', 'desktop'
    loja_clicada TEXT, -- 'mercadolivre', 'shopee', 'amazon', 'aliexpress', null
    ip_hash TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_afiliados_produtos_slug ON afiliados_produtos(slug);
CREATE INDEX IF NOT EXISTS idx_afiliados_produtos_status ON afiliados_produtos(status);
CREATE INDEX IF NOT EXISTS idx_afiliados_produtos_categoria ON afiliados_produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_afiliados_acessos_origem ON afiliados_acessos(origem);

-- 5. Políticas de Segurança (Row Level Security)
ALTER TABLE afiliados_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE afiliados_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE afiliados_cupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE afiliados_acessos ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura Pública
CREATE POLICY "Leitura pública de produtos publicados" 
ON afiliados_produtos FOR SELECT TO anon, authenticated 
USING (status = 'publicado');

CREATE POLICY "Leitura pública de cupons ativos" 
ON afiliados_cupons FOR SELECT TO anon, authenticated 
USING (ativo = true);

CREATE POLICY "Registro público de telemetria" 
ON afiliados_acessos FOR INSERT TO anon, authenticated 
WITH CHECK (true);

-- Políticas Administrativas (Acesso total para autenticados)
CREATE POLICY "Gestão total de config para autenticados" 
ON afiliados_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Gestão total de produtos para autenticados" 
ON afiliados_produtos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Gestão total de cupons para autenticados" 
ON afiliados_cupons FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Leitura total de acessos para autenticados" 
ON afiliados_acessos FOR SELECT TO authenticated USING (true);
