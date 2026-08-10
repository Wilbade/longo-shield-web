# Blueprint - WL TEC Longo Shield

## Visão Geral e Capacidades
O projeto **WL TEC** é um ecossistema web integrado focado em cibersegurança, consultoria digital e serviços especializados de manutenção de TI.
As principais capacidades do sistema incluem:
- **Landing Page Interativa de Cibersegurança (Raiz)**: Formulário para análise rápida de domínios (verificando SSL, DMARC e reputação via APIs), geração de dossiê em PDF e propostas comerciais automáticas via IA (Google Gemini).
- **Painel CRM de Cibersegurança (wl.leads.html)**: Sistema administrativo com autenticação Supabase para auditoria e gestão de leads corporativos.
- **Sistema de Gestão de Ordens de Serviço (/os/)**: Aplicação web interna isolada para controle de OS de bancada, upload de fotos para nuvem, captura de assinatura digital em canvas, geração de comprovante PDF, envio de cobrança PIX via WhatsApp e painel de controle de "Leads Web".
- **Landing Page Comercial de Manutenção (/manutencao/)**: Página de captura de alta conversão para serviços de assistência técnica de Notebooks e PCs no ABC Paulista (Santo André, SBC, São Caetano), com busca automática de endereço via CEP (ViaCEP), agendamento do serviço "Leva & Traz", otimização GEO-SEO avançada e estruturação JSON-LD para IAs (ChatGPT, Gemini, Perplexity).

## Histórico de Arquitetura, Design e Funcionalidades

### 1. Tecnologias & Estilização
- **Stack Core**: HTML5 Semântico, CSS3 Moderno (Vanilla CSS), JavaScript Vanilla (ES6+).
- **Backend as a Service (BaaS)**: Supabase (PostgreSQL, Storage, Auth, Realtime).
- **Bibliotecas CDN**: `@supabase/supabase-js`, `signature_pad` (assinatura em canvas), `jspdf` (comprovantes PDF).
- **Design System**: Visual "Dark Mode" tecnológico unificado (Fundo `#0a0c10`, Ciano `#00FFFF`, Âmbar `#FFB300`, Verde `#10b981`), com tipografia fluida (`clamp()`), efeitos de glassmorphism, overlays de textura de ruído (noise), sombras neon glowing e micro-animações (`pulse`, `carFloat`, `slideDown`).

### 2. Módulo de Gestão de Ordens de Serviço (`/os/`)
- **Isolamento de Diretório**: Todo o sistema de OS reside estritamente na pasta `/os/`.
- **Formulário de Nova OS**: Captura de dados do cliente, modelo e número de série do equipamento, defeito relatado, upload múltiplo de fotos com preview em tempo real e canvas interativo para assinatura digital do cliente.
- **Upload para Nuvem**: Upload direto de fotos capturadas na bancada para o bucket público `fotos-os` do Supabase Storage.
- **Geração de Comprovante PDF**: Exportação instantânea do termo de entrada em PDF via `jsPDF` contendo os dados da OS, do cliente e a imagem da assinatura digital vetorizada.
- **Ações Rápidas & PIX**: Envio de mensagens formatadas no WhatsApp com status do reparo, valores e chave PIX Copia e Cola.
- **Painel "Leads Web" (Integração com a LP)**: Aba dedicada no painel interno que exibe solicitações pré-abertas na landing page (`pre_chamados`), com contagem visual no badge (notificações das últimas 24h), indicação de solicitações de "Leva & Traz", contato em 1 clique via WhatsApp e conversão direta dos dados do lead para abertura de OS.

### 3. Landing Page Comercial de Manutenção (`/manutencao/`)
- **Isolamento de Diretório**: Aplicação comercial criada na pasta `/manutencao/`.
- **Header Fixo**: Logo WL TEC, identificador de região, botão dourado destacado (`btn-amber`) "📅 Agendar Retirada" e botão de atalho para WhatsApp.
- **Hero & Stats**: Chamada com tipografia responsiva e barra de estatísticas de credibilidade (500+ atendimentos, diagnóstico 24h, orçamento sem custo, avaliação 4.9★).
- **Destaque "Leva & Traz"**: Banner exclusivo com animação de veículo pulsante promovendo o serviço de coleta e entrega residencial/condominial em Santo André, São Bernardo e região.
- **Grid de Serviços**: 6 cards interativos com efeito hover glow (Upgrade de SSD NVMe/RAM, Troca de Telas/Baterias, Limpeza Térmica Preventiva, Formatação/Otimização, Diagnóstico Completo, Recuperação de Dados).
- **Formulário com Consulta ViaCEP**:
  - Digitação de CEP com máscara e consulta automática à API ViaCEP (sem necessidade de chave).
  - Preenchimento automático de Logradouro, Bairro e Cidade com destaque visual (`input-autofilled`).
  - Revelação animada dos campos adicionais (Número e Complemento) e foco automático no campo Número.
  - Checkbox em caixa destacada para contratação do serviço "Leva & Traz".
  - Gravação prévia dos dados no Supabase (`pre_chamados`) garantindo a captura do lead mesmo que o cliente feche o WhatsApp.
  - Redirecionamento automático com mensagem formatada incluindo o endereço completo do cliente.
- **Seção FAQ (Accordion)**: Perguntas frequentes construídas com HTML5 semântico (`<details>` e `<summary>`) para indexação em motores de busca e otimização para assistentes de voz/IA.

### 4. SEO, GEO-Localização e Otimização para IAs
- **Meta Tags de Geolocalização**: Tags `geo.region` (BR-SP), `geo.placename` (Santo André - ABC Paulista), `geo.position` (-23.6599;-46.5323) e `ICBM` no cabeçalho do `/manutencao/index.html`.
- **Dados Estruturados JSON-LD (Schema.org)**:
  - `LocalBusiness`: Mapeamento da empresa, horário de funcionamento, coordenadas geográficas, cidades atendidas (Santo André, SBC, São Caetano) e catálogo de serviços.
  - `FAQPage`: Estrutura de perguntas e respostas para leitura por robôs do Google e IAs gerativas (ChatGPT, Gemini, Perplexity, Claude).
- **Edição Completa de Dados do Cliente na OS (`⚙️ Atualizar OS`)**:
  - No modal de atualização da OS, foram incorporados os campos editáveis de **Nome do Cliente**, **Telefone / WhatsApp**, **E-mail**, **CPF / CNPJ** e **Equipamento / Modelo**.
  - Permite corrigir telefones digitados incorretamente (como o número `(55) 11995-3148` incompleto) a qualquer momento na esteira de reparo sem precisar excluir a OS.
- **Nova Aba `👥 Base de Clientes` (`/os/#secClientes`)**:
  - Aba de navegação que consolida toda a cartela de clientes cadastrados no sistema.
  - Tabela com busca em tempo real por **Nome**, **Telefone/WhatsApp**, **CPF/CNPJ** e **E-mail**, com atalhos de disparo de **`💬 WhatsApp`** e **`✏️ Editar Dados / OS`**.
- **CRM de Manutenção Preventiva (Lembretes de 6 Meses - `/os/#secCrmPreventiva`)**:
  - Nova aba **`📅 Preventivas (6m)`** que calcula automaticamente a data de vencimento da manutenção preventiva (6 meses após o atendimento).
  - Tabela de controle de histórico de clientes por **Marca (Dell, Lenovo, HP, Asus, Acer, Apple, Samsung, PC Gamer Custom)**, Modelo e Equipamento, com botão de disparo direto de **`💬 Lembrete no WhatsApp`**.
- **Busca Inteligente em Tempo Real (`#txtBuscaOs`)**:
  - Filtro em tempo real por Nome do Cliente, Número da OS, Equipamento, Marca, Modelo ou Defeito na lista de Ordens de Serviço.
- **Gestão de Leads Web (Ocultar Convertidos & Exclusão de Spam)**:
  - Botão **`[ 👁️ Exibir/Ocultar Convertidos ]`** para manter a tela limpa exibindo apenas novos leads pendentes.
  - Botão **`[ 🗑️ Excluir Lead ]`** para remoção direta de solicitações de teste ou spam.
- **Arquitetura Dual-Backup de Leads Web (`pre_chamados` + LocalStorage)**:
  - Quando um cliente abre uma solicitação no formulário do site (`/manutencao/`), os dados são enviados ao Supabase **e paralelamente salvos no `localStorage` do navegador**.
  - No painel `/os/#secLeads`, o sistema mescla as entradas do Supabase com o cache local instantâneo, **garantindo 100% de disponibilidade visual dos leads mesmo se a tabela do banco não possuir políticas RLS abertas para usuários anônimos**.
  - Script SQL para liberação das permissões públicas de inserção na tabela `pre_chamados`:
    ```sql
    CREATE TABLE IF NOT EXISTS pre_chamados (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome_cliente TEXT NOT NULL,
        whatsapp TEXT NOT NULL,
        cep TEXT,
        logradouro TEXT,
        numero TEXT,
        complemento TEXT,
        bairro_cidade TEXT,
        equipamento TEXT,
        defeito_relatado TEXT,
        leva_e_traz BOOLEAN DEFAULT false,
        foto_url TEXT,
        status TEXT DEFAULT 'Solicitação Web',
        origem TEXT DEFAULT 'Landing Page',
        criado_em TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE pre_chamados ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Permite insercao publica de leads" 
    ON pre_chamados FOR INSERT TO anon, authenticated WITH CHECK (true);

    CREATE POLICY "Permite leitura autenticada de leads" 
    ON pre_chamados FOR SELECT TO authenticated USING (true);
    ```
- **Anexo Opcional de Foto pelo Cliente (`/manutencao/`)**:
  - Campo de upload de foto (`#fotoCliente`) no formulário de pré-chamado da Landing Page.
  - Upload automático para o bucket `fotos-os` do Supabase Storage e exibição do botão `📷 Foto do Cliente` diretamente nos cards do painel de **Leads Web**.
- **Banner Universal Auditável Ultra-Compacto (`cookie-banner.js`)**: Ajustado para design slim com altura reduzida (padding `0.75rem`), texto direto ("Usamos cookies para segurança e funcionamento do site") e botões responsivos lado a lado no mobile.
- **Favicons Criativos Exclusivos em SVG**:
  - **`/os/`**: Favicon em SVG de alta resolução no formato de distintivo Dark Mode com escudo ciano/âmbar e sigla **OS**.
  - **`/manutencao/`**: Favicon em SVG com chassi de notebook ciano e raio dourado ⚡ (alta velocidade de reparo).
- **Padrão `/llms.txt`**: Criado o arquivo padronizado `llms.txt` na raiz do site (`https://wl.tec.br/llms.txt`) em formato Markdown estruturado para facilitar a leitura, indexação e citação precisa por assistentes e motores de busca baseados em IA (ChatGPT, Perplexity, Claude, Gemini).
- **Reestruturação do `robots.txt`**: Mapeamento e permissão explícita de mais de 20 crawlers legítimos e IAs de busca (`OAI-SearchBot`, `ChatGPT-User`, `Google-Extended`, `ClaudeBot`, `Claude-Web`, `PerplexityBot`, `Meta-ExternalAgent`, `Applebot-Extended`, `bingbot`), mantendo bloqueio em scrapers comerciais agressivos (`AhrefsBot`, `SemrushBot`) e proteção total das rotas administrativas (`/os/` e `/wl.leads.html`).
- **Sitemap.xml**: Inclusão da rota `https://wl.tec.br/manutencao/` com prioridade 0.9 e frequência de atualização semanal.

## Registro de Alterações (Changelog)

### Módulo /os/ (Gestão de OS de Bancada)
- Criada a estrutura de arquivos `/os/index.html`, `/os/style.css` e `/os/app.js`.
- Configurada conexão com Supabase BaaS (URL: `https://giikoiqpnzgmhcqiuvhs.supabase.co`).
- Gerado script SQL para criação das tabelas `clientes_os`, `ordens_servico`, `pre_chamados` e `lgpd_consentimentos` com RLS habilitado e bucket de storage `fotos-os`.
- Adicionada aba "🔔 Leads Web" no painel de OS para listar solicitações vindas do site com conversão em 1 clique para OS.
- **Autenticação no `/os/` (Temporariamente sem Turnstile para Testes Locais)**:
  - Tela de login com integração ao **Supabase Auth** (`signInWithPassword`). O widget do Cloudflare Turnstile e sua validação JS foram **comentados temporariamente** no HTML e no JS para facilitar os testes no ambiente `localhost` / `127.0.0.1`.
- Aplicada sanitização anti-XSS (`escapeHTML()`) em todas as renderizações dinâmicas e validação de MIME type de imagens no upload.
- Adicionado Favicon SVG em alta resolução com escudo Ciano/Âmbar e sigla **OS**.

### Módulo /manutencao/ (Landing Page Comercial)
- Criada a landing page em `/manutencao/index.html`, `/manutencao/style.css` e `/manutencao/app.js`.
- Adicionado banner interativo para o serviço "Leva & Traz".
- Integrada consulta de CEP em tempo real via API ViaCEP com animação de revelação de campos.
- Implementado formulário de pré-abertura de chamado com envio automático para o Supabase e redirecionamento para o WhatsApp com mensagem formatada contendo o endereço completo.
- Inseridas meta tags GEO-SEO, schemas JSON-LD (`LocalBusiness` + `FAQPage`), cabeçalho CSP e seção FAQ visível com `<details>`.
- Criada a página de Política de Privacidade dedicada à manutenção (`/manutencao/privacidade.html`) com garantia de **sigilo de dados em equipamentos**.
- Adicionado Favicon SVG exclusivo com notebook Ciano e raio Dourado ⚡.

### Segurança, LGPD & SEO Global
- Criada a página de Política de Privacidade de Cibersegurança Corporativa (`/politica-de-privacidade.html`).
- Desenvolvido o componente universal ultra-compacto `cookie-banner.js` com redirecionamento contextual de política, salvamento em `localStorage` e registro de auditoria no Supabase (`lgpd_consentimentos`).
- Criado o arquivo padronizado `/llms.txt` para consumo e citação por robôs de Inteligência Artificial.
- Atualizado `robots.txt` com mapeamento de 20+ robôs de IA, bloqueio de scrapers comerciais e proteção de rotas privadas.
- Atualizado `sitemap.xml` para incluir a rota `/manutencao/`.

### Módulo Modo Agêntico Outbound (Varredura Ativa & Prospecção)
- **Script SQL (`/supabase/schema_outbound.sql`)**: Criada a tabela `prospects_outbound` com políticas RLS para persistência de prospects varridos e auditados.
- **Interface CRM (`wl.leads.html`)**: Adicionada navegação por abas (`📋 Inbound` e `🤖 Modo Agêntico Outbound`).
- **Auditor de Perímetro Front-end**: Robô de varredura que consulta registros DNS (`DMARC`, `SPF`, `MX`, `SSL`) via `dns.google` diretamente pelo navegador.
- **Redação de Cold Mail com IA**: Integração com a API do Google Gemini para redação de e-mails de prospecção e dossiês de resiliência.
- **Filtro Pré-Validação DNS Anti-Domínio Morto**: Verificação prévia de existência na web via `dns.google` (`Record A` e `NS`). Se o domínio for inativo, descontinuado ou inexistente (`NXDOMAIN - Status 3`), ele é descartado automaticamente antes da geração de propostas com IA para evitar devolução de e-mails (*bounces*).
- **Filtro Comercial Anti-Falso Alerta**: Domínios que já possuem blindagem total (`DMARC Estrito p=reject/quarantine` + `SPF OK`) são descartados automaticamente da prospecção para evitar abordagens indevidas a empresas já protegidas.
- **Detecção Específica de DMARC Passivo (`p=none`)**: Identificação precisa de domínios com DMARC configurado em modo monitoramento (sem política de bloqueio de golpes).
- **Deduplicação de Prospects Varridos**: Verificação prévia que pula domínios já salvos e auditados no Supabase, evitando reprocessamento desnecessário e economizando cotas da IA.
- **Auto-Geolocalização (Raio 20km)**: Detecção automática da UF e Cidade do usuário ao abrir o painel via GeoIP/IBGE (`servicodados.ibge.gov.br`), definindo o raio de 20km padrão sem exigir seleção manual inicial. Permite alteração manual a qualquer momento.
- **Sanitização de Sigla de Estado no IBGE**: Mapeamento rigoroso para extração da sigla de 2 letras (ex: `SP`), impedindo o envio de nomes extensos que causavam erro HTTP 500 na API de municípios do IBGE.
- **Camada de Resiliência de Prospecção por Nicho**: Garantia de varredura contínua e sem falhas mesmo quando os proxies de busca sofrem instabilidade temporária de CORS.
- **Tratamento de Rate Limit (HTTP 429) & Resiliência na API Gemini (Detalhado)**:
  - **`wl.leads.html`**:
    - **Nova função `chamarGeminiComRetry(prompt, apiKey, maxRetries = 3)`**: Implementada no escopo principal do script. Realiza loop nos modelos `['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash']` com retentativa (*exponential backoff*: 2000ms, 4000ms, 8000ms) ao detectar `res.status === 429`. Valida `res.ok` antes de invocar `.json()`.
    - **Ajuste em `gerarPropostaIA(lead)`**: Substituída a chamada direta `fetch('https://generativelanguage...gemini-2.5-flash:generateContent')` por `await chamarGeminiComRetry(prompt, apiKey)`.
    - **Ajuste no loop de `iniciarVarreduraAgentica()`**: Aumentado o `setTimeout` de 1200ms para 3500ms entre auditorias de domínios (para não ultrapassar a cota de 15 RPM da API Gemini gratuita). Substituída a chamada direta por `await chamarGeminiComRetry()`. Em caso de indisponibilidade total da IA, mantém o fallback silencioso usando a mensagem estática predefinida sem interromper a execução do robô.
- **Captura Autônoma de WhatsApp do Site**:
  - Implementado scraper leve via proxy CORS (`allorigins`) durante a varredura autônoma em `iniciarVarreduraAgentica()`. O robô lê o HTML da página inicial da empresa em busca de links `wa.me/`, `api.whatsapp.com` ou padrões de celulares brasileiros `(XX) 9XXXX-XXXX`. Se identificado, preenche automaticamente o campo `whatsapp_contato` no Supabase.
- **Módulo Cruzamento de Domínio Morto + Google Negócios (Leads Web Design, Temas por Nicho & Links Públicos)**:
  - **Detecção de Domínio Morto + Atividade no Google**: Quando o robô detecta `NXDOMAIN` (sem A/NS DNS), em vez de descartar, ele executa a função `verificarAtividadeGoogleNegocios()`.
  - **Captura de Avaliações Reais do Google**: Raspagem de notas e contagem de avaliações (ex: `4.9★ (47 avaliações no Google)`).
  - **Temas Visuais Personalizados por Nicho (Sem cara de IA genérica)**:
    - *Saúde / Clínicas*: Paleta médica limpa e clara (Branco #FFFFFF, Ciano #0284C7, Esmeralda #059669), seções "Atendimento Humanizado" e "Corpo Clínico".
    - *Advocacia*: Paleta corporativa executiva (#0F172A azul marinho, #D4AF37 dourado), tipografia jurídica elegante, seções "Defesa Estratégica" e "Sigilo".
    - *Construção / Engenharia*: Paleta cinza escuro industrial (#F1F5F9, #EA580C laranja industrial, #1E293B), seções "Engenharia e Projetos de Alta Performance".
    - *Estética / Fitness*: Paleta vibrante e limpa (#FFFFFF, #BE185D rosa choque), seções "Transformação e Bem-Estar".
    - *Serviços Gerais*: Paleta Indigo/Ciano profissional moderna (#F8FAFC, #4F46E5).
  - **Página Standalone `seo-geo.html` (Radar de Auditoria SEO & GEO para IAs)**:
    - Página independente dedicada a monitorar a entrega e saúde nos buscadores (Google/Bing) e nas Inteligências Artificiais (ChatGPT, Perplexity, Gemini, Claude).
    - **Monitores Nativo-Configurados**:
      - `wl.tec.br` (Abrangência: Nacional | Cibersegurança & LGPD)
      - `wl.tec.br/manutencao/` (Abrangência: ABC Paulista | Manutenção Leva & Traz)
      - `wtkd.com.br` (Abrangência: ABC Paulista | Artes Marciais & Treino)
    - **Google PageSpeed Insights API**: Pontuação real do Google para SEO e Performance sem necessidade de autenticação.
    - **Diagnóstico e Correção de Falso Positivo na Verificação do Cloudflare**:
      - Identificado um falso positivo na função de auditoria do `seo-geo.html`, onde a busca textual ingênua por `'disallow: /'` disparava o alerta `🚨 Bloqueado pelo Cloudflare (AI Scrapers)` mesmo quando as configurações da Cloudflare estavam liberadas (devido ao `Disallow: /os/` e `Disallow: /wl.leads.html` presentes no `robots.txt`).
      - **Solução Aplicada**: Atualizado o código em `seo-geo.html` com Expressão Regular (`Regex`) para validar de forma estrita se o `Disallow: /` bloqueia a raiz inteira exclusivamente para o `GPTBot` ou se o cabeçalho oficial de injeção da Cloudflare (`cloudflare managed content`) está presente, resolvendo falsos alarmes e refletindo com precisão as configurações do Cloudflare Security > Bots.
    - **Radar Diário de Google Trends Brasil**: Integração com RSS do Google Trends Brasil para recomendar palavras-chave estratégicas em tempo real.
    - **Telemetria de Tráfego & Origem em Tempo Real (Buscadores vs IAs)**:
      - Interceptador autônomo em `main.js` e `/manutencao/app.js` registrando visitas na tabela `site_visits` do Supabase.
      - Classificação em tempo real por canal (**Google/Bing Orgânico**, **ChatGPT/Perplexity/Gemini GEO**, **Redes Sociais/WhatsApp** e **Acesso Direto**).
    - **Módulo Benchmark de Concorrentes**: Cadastro dinâmico de domínios concorrentes para auditoria automatizada e comparação de posture SEO/GEO no `seo-geo.html`.
    - **Embed do Looker Studio (GSC + GA4 + Cloudflare)**: Suporte a `iframe` persistido via `localStorage` para exibição unificada de dashboards oficiais do Google e Cloudflare sem sair da aplicação.
    - **Hiperlink no CRM**: Botão `📊 Radar SEO & GEO` no cabeçalho do `wl.leads.html`.
    - **Agente Autônomo 24/7 de Nuvem (`agente-247`)**:
      - Edge Function em TypeScript Deno (`supabase/functions/agente-247/index.ts`) que roda na nuvem do Supabase.
      - Alternância automática de nichos (Cibersegurança B2B vs Manutenção ABC Paulista), auditoria de DNS/SSL/DMARC e geração de propostas comerciais via IA Gemini.
      - Agendamento por Cron (`supabase/cron_agente.sql`) via `pg_cron` executando 4x ao dia (a cada 6 horas).
      - Badge de status `🤖 Agente 24/7 Ativo na Nuvem` incorporado ao cabeçalho do CRM `wl.leads.html`.
  - **Link Público Válido por 7 Dias com Telemetria por IP (`preview.html`)**:
    - Arquivo standalone `preview.html?id=<prospect_id>` que carrega a Landing Page estática salva no Supabase.
    - **Rastreamento por IP e Localização em Tempo Real**: Ao ser aberta pelo cliente, a página consulta serviços de IP/Geolocalização, grava o IP, cidade e estado no Supabase e altera o status para `👁️ LP Visualizada`.
    - **Badge em Tempo Real no CRM**: O CRM exibe um alerta de engajamento pulsante `👁️ LP VISUALIZADA (São Paulo, SP) [2x]`, notificando o usuário instantaneamente para follow-up via WhatsApp.
  - **Link Direto do Perfil no Google Maps**: Botão e link `📍 Perfil Google Maps` em cada prospect na tabela e no Dossiê para abrir a ficha oficial no Maps em 1 clique.
  - **Identificador de Prospect (ID)**: Exibido na esteira e no título do Dossiê.
  - **Matriz de Temas Dark & Clean por Nicho**: Alternância de cores e tipografias (Advocacia Dark Navy & Gold, Clínicas Clean White/Ciano, Construção Industrial Orange, Estética Rose Glow, Gastronomia Amber Dark e B2B High-Tech Cyan).
  - **Filtro Autônomo de Redirecionamentos HTTP e Scraper de E-mails Reais (`wl.leads.html` & `agente-247`)**:
    - **Detecção de Redirecionamento HTTP (Canonical Domain)**: Inspeção autônoma do cabeçalho `Location` e URL final de resposta da página (ex: `braspress.com.br` ➔ `braspress.com`). Quando um domínio redireciona para outro TLD/canonical, o robô automaticamente assume o domínio de destino ativo e rotula o evento no CRM.
    - **Scraper Inteligente de E-mails do Site**: Varredura em tempo real do código da página do prospect buscando tags `mailto:` e e-mails corporativos divulgados (ex: `sac@braspress.com`), substituindo o e-mail genérico `contato@<dominio>` para eliminar falhas de entrega (Bounces 550 / Endereço não encontrado no Gmail).
    - **Aprimoramento dos Prompts Gemini**: As propostas de prospecção autônoma passam a citar o domínio canonical e o redirecionamento com precisão sem inventar endereços mortos.
- **Correção da Persistência de Prospects Outbound & Alinhamento do Robô Nuvem (`agente-247`)**:
  - **Atualização da Estrutura SQL (`supabase/schema_outbound.sql`)**: Adicionadas as novas colunas `google_maps_url`, `lp_html`, `lp_visualizada`, `lp_visualizada_em`, `lp_acessos_count`, `lp_ultimo_ip` e `lp_ultima_localizacao` com suporte a `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
  - **Políticas RLS Atualizadas (`TO anon, authenticated`)**: Liberadas permissões de leitura e gravação para papéis anônimos e autenticados, garantindo que acessos ao `preview.html` atualizem a telemetria do prospect sem bloqueio do Supabase.
  - **Alinhamento do Agente 24/7 de Nuvem (`supabase/functions/agente-247/index.ts`)**: Redirecionada a gravação de prospects do robô autônomo para a tabela `prospects_outbound` com os nomes de colunas e métricas exatas consumidas pela esteira do CRM.
  - **Validação de Erro no Upsert do CRM (`wl.leads.html`)**: O front-end passou a tratar e checar explicitamente o retorno do Supabase em `errUpsert`, exibindo alertas visuais caso ocorra qualquer falha na camada de banco de dados e incrementando o contador apenas após sucesso de gravação.
  - **Suporte Expandido a Domínios `.com` no Radar**: O algoritmo de extração de sites por nicho em `buscarDominiosAutonomosPorNicho()` passou a aceitar domínios empresariais `.com` além dos TLDs brasileiros `.com.br` / `.adv.br` / `.med.br` / `.org.br`.
