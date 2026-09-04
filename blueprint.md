# Blueprint - WL TEC Longo Shield

## Visão Geral do Ecossistema

O projeto **WL TEC** (acessível em `https://wl.tec.br`) é uma plataforma web integrada de alta tecnologia, construída sob os padrões de Vanilla Web Standards (HTML5 Semântico, CSS3 Moderno com Glassmorphism/Dark Mode e JavaScript ES6+ modular), com Backend as a Service (BaaS) centralizado no **Supabase** (PostgreSQL, Storage buckets, Auth e Edge Functions) e proteção de borda via **Cloudflare**.

O ecossistema divide-se em **três módulos operacionais isolados**:
1. **Módulo de Manutenção de TI & Gestão de OS de Bancada** (`/os/` e `/manutencao/`)
2. **Módulo de Cibersegurança, Auditoria & CRM Outbound** (`wl.leads.html`, `seo-geo.html`, `preview.html`, raiz)
3. **Módulo de Plataforma de Ofertas & Afiliados Multi-Lojas** (`/ofertas/`)

---

## MÓDULO 1: Manutenção de TI & Gestão de OS de Bancada (`/os/` e `/manutencao/`)

### 1.1 Landing Page Comercial de Manutenção (`/manutencao/`)
- **Propósito**: Captação de clientes para assistência técnica de notebooks, desktops e servidores com cobertura no ABC Paulista (Santo André, São Bernardo do Campo, São Caetano do Sul).
- **Interface & Conversão**:
  - Header fixo com identificador geográfico, botão dourado em destaque (`btn-amber`) "📅 Agendar Retirada" e atalho direto para o WhatsApp comercial.
  - Hero com estatísticas de autoridade (500+ atendimentos, diagnóstico em 24h, orçamento sem custo, avaliação 4.9★).
  - Banner animado do serviço exclusivo "Leva & Traz" residencial/condominial.
  - Grade com 6 serviços detalhados (Upgrade NVMe/RAM, Reparo de Placa/Telas/Baterias, Limpeza Térmica Preventiva, Formatação com Backup, Diagnóstico Avançado, Recuperação de Dados).
  - FAQ semântico com elementos nativos `<details>` e `<summary>` indexáveis por buscadores e IAs.
- **Formulário com Consulta ViaCEP**:
  - Máscara automática de CEP e busca em tempo real na API ViaCEP sem requisição de chave.
  - Preenchimento animado dos campos de Logradouro, Bairro e Cidade (`input-autofilled`) com foco imediato no campo Número.
  - Checkbox para agendamento do serviço "Leva & Traz".
  - Campo opcional de anexo fotográfico do defeito (`#fotoCliente`) com upload automático para o bucket `fotos-os` do Supabase Storage.
- **Arquitetura Dual-Backup de Captura**:
  - Gravação prévia dos dados na tabela `pre_chamados` do Supabase e persistência simultânea em `localStorage`, garantindo 100% de tolerância a falhas caso o cliente feche o navegador antes de concluir o envio no WhatsApp.
- **GEO-SEO & Estruturação para Motores de Busca e IAs**:
  - Meta tags de geolocalização (`geo.region: BR-SP`, `geo.placename: Santo André - ABC Paulista`, coordenadas `ICBM`).
  - Marcação estruturada Schema.org em JSON-LD com `LocalBusiness` e `FAQPage` para citações em robôs como Google SGE, ChatGPT, Gemini e Perplexity.
  - Favicon exclusivo em SVG com chassi de notebook ciano e raio dourado ⚡.

### 1.2 Sistema de Gestão de Ordens de Serviço de Bancada (`/os/`)
- **Isolamento**: Diretório restrito e autocontido em `/os/`.
- **Autenticação**:
  - Integração com Supabase Auth (`signInWithPassword`) com suporte a sessões unificadas e modo bypass em ambiente local.
- **Abertura e Edição de Ordens de Serviço**:
  - Formulário de Nova OS flexível: permite agendamento rápido com coleta presencial posterior sem exigir assinatura no momento da abertura (sinalizado com badge visual `[✍️ Assinatura Pendente]`).
  - Modal de edição completo (`modalEditarOs`) para retificação de dados do cliente (Nome, WhatsApp, E-mail, CPF/CNPJ, Modelo) e registro de número de série ou relato técnico complementar.
  - Upload de fotos de evidência de bancada (antes, durante e pós-reparo) diretamente para o bucket público `fotos-os` do Supabase Storage.
  - Coleta de assinatura digital na bancada ou no endereço do cliente via canvas responsivo (`signature_pad`) com opção de refazer e exportação em Base64.
- **Discriminação de Peças, Serviços e COGS Comercial**:
  - Gerenciador dinâmico de itens: Mão de Obra, Peças de Estoque, Peças de Terceiros (encomenda no Mercado Livre/distribuidores), Insumos, Deslocamento e Cortesia.
  - Separação estrita entre **Custo de Aquisição** (visível apenas para a administração) e **Preço Cobrado do Cliente** (impresso no comprovante), mantendo sigilo comercial absoluto.
- **Geração de Documentos em PDF (`jsPDF`)**:
  - Cabeçalho dinâmico e diagramação profissional com cálculo de quebra de linha (`rowHeight`) para descrições longas:
    - *Em Orçamento*: `PROPOSTA DE ORÇAMENTO TÉCNICO & COMERCIAL` (validade de 10 dias, condições PIX/Cartão).
    - *Concluído*: `LAUDO TÉCNICO & CERTIFICADO DE GARANTIA` (termos legais de 90 dias do CDC).
    - *Aberto / Em Reparo*: `COMPROVANTE DE ENTRADA & ORDEM DE SERVIÇO`.
  - Inclusão da assinatura digital vetorizada do cliente ou linha para assinatura manual caso pendente.
- **Ações Rápidas & Disparo PIX**:
  - Botão de envio no WhatsApp com mensagem formatada de status, resumo do reparo e Chave PIX Copia e Cola.
- **Módulos Administrativos Integrados**:
  - **Aba Leads Web (`/os/#secLeads`)**: Painel de triagem das solicitações vindas da Landing Page, contador de novas mensagens nas últimas 24h, botão para ocultar leads já convertidos, exclusão de spam e conversão em 1 clique para abertura de OS.
  - **Aba Base de Clientes (`/os/#secClientes`)**: Catálogo consolidado de clientes cadastrados, com busca em tempo real por Nome, WhatsApp, Documento ou E-mail, com atalhos de disparo de WhatsApp e edição cadastral.
  - **Aba CRM Preventivas 6m (`/os/#secCrmPreventiva`)**: Cálculo automático do ciclo de 6 meses desde o último atendimento, agrupamento por marca do equipamento (Dell, Lenovo, HP, Asus, Acer, Apple, Samsung, Gamer Custom) e botão de contato com mensagem de recall preventivo no WhatsApp.
  - **Central de BI e DRE Financeiro (`/os/#secRelatorios`)**: Relatórios com filtros por período e status, apuração do faturamento bruto, cálculo do COGS (custo real de peças), despesas fixas da bancada, margem líquida real e exportação para Excel (CSV com UTF-8 BOM) ou impressão executiva.
- **Tabelas do Banco de Dados no Supabase**:
  - `clientes_os`, `ordens_servico`, `pre_chamados`, `lgpd_consentimentos` e bucket `fotos-os`.

---

## MÓDULO 2: Cibersegurança, Auditoria & CRM Outbound (`wl.leads.html`, `seo-geo.html`, `preview.html`)

### 2.1 Landing Page Institucional Raiz (`https://wl.tec.br`)
- **Propósito**: Posicionamento nacional da WL TEC em resiliência cibernética B2B, proteção contra fraudes corporativas, adequação LGPD e auditoria de perímetro de e-mail.
- **Varredura Instantânea de Perímetro**:
  - Formulário público para diagnóstico em tempo real de domínios corporativos via DNS Google API (validação de SSL, MX, SPF e registros DMARC).
  - Geração automática de dossiê de risco e propostas executivas personalizadas com integração ao Google Gemini API.

### 2.2 Painel CRM de Cibersegurança & Modo Agêntico Outbound (`wl.leads.html`)
- **Navegação em Abas**:
  - `📋 Inbound`: Gestão de contatos e diagnósticos solicitados espontaneamente no site.
  - `🤖 Modo Agêntico Outbound`: Robô autônomo de prospecção ativa e enriquecimento de dados corporativos.
- **Robô Front-end de Prospecção Ativa**:
  - Seleção por nicho comercial e auto-geolocalização inteligente (raio padrão de 20km baseado na UF e Cidade obtidas via GeoIP/IBGE).
  - **Filtro Anti-Domínio Morto**: Pré-validação DNS via `dns.google`. Domínios inativos ou inexistentes (`NXDOMAIN Status 3`) são descartados para evitar bounces de e-mail.
  - **Filtro Anti-Falso Alerta**: Domínios com segurança máxima ativa (`DMARC p=reject/quarantine` + `SPF OK`) são ignorados para não prospectar empresas já blindadas.
  - **Identificação de Alvos Críticos**: Foco prioritário em domínios sem DMARC ou com DMARC fraco/passivo (`p=none`), suscetíveis a spoofing e golpes de faturamento falso.
  - **Captura Autônoma de Contato**: Scraper leve para identificação de links `wa.me`, telefones celulares brasileiros e e-mails corporativos reais divulgados nas páginas institucionais, substituindo caixas genéricas para garantir a entregabilidade da mensagem.
- **Cruzamento de Domínio Morto + Google Negócios**:
  - Ao identificar uma empresa ativa no Google Meu Negócio mas cujo domínio expirou ou está fora do ar, o sistema extrai nota e avaliações reais do Google Maps e oferece uma oportunidade de oferta de recuperação de presença digital / web design.
- **Geração Dinâmica de Landing Pages por Nicho (`preview.html`)**:
  - Criação automática de proposta comercial contextualizada em 6 identidades visuais distintas:
    - *Saúde / Clínicas*: Clean White & Ciano com seções humanizadas.
    - *Advocacia*: Dark Navy & Gold executivo.
    - *Construção / Engenharia*: Cinza escuro e Laranja industrial.
    - *Estética / Bem-Estar*: Rose Glow sofisticado.
    - *Gastronomia*: Amber Dark.
    - *B2B Tech*: High-Tech Cyan.
  - **Telemetria de Leitura do Prospect (`preview.html?id=...`)**:
    - Ao abrir a proposta, a página registra em tempo real o IP de acesso, cidade e horário no Supabase.
    - O CRM exibe instantaneamente o alerta pulsante `👁️ LP VISUALIZADA (Cidade, UF) [2x]`, permitindo que o operador faça follow-up no WhatsApp com timing perfeito.
- **Motor de Resiliência da IA Gemini (`chamarGeminiComRetry`)**:
  - Alternância inteligente entre modelos (`gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-2.5-flash`) com retentativa exponencial (*exponential backoff*) ao receber respostas de rate limit (HTTP 429), impedindo travamentos do robô.
  - Recuperação da chave da API automaticamente da tabela segura `config_privada` (`chave_nome = 'GEMINI_API_KEY'`).
- **Agente Autônomo 24/7 de Nuvem (`supabase/functions/agente-247/index.ts`)**:
  - Edge Function Deno TypeScript agendada via `pg_cron` para varreduras diárias automáticas em segundo plano, salvando novos prospects diretamente na tabela `prospects_outbound`.
- **Painel de Auditoria SEO & GEO (`seo-geo.html`)**:
  - Monitoramento de entrega técnica nos buscadores e IAs generativas (Google, ChatGPT, Perplexity, Claude).
  - Verificação de pontuação Core Web Vitals via Google PageSpeed API sem chaves.
  - Telemetria de visitas públicas na tabela `site_visits` categorizada por canal (Google, IAs GEO, Redes Sociais, Direto).
  - Embed de dashboards do Looker Studio (Google Search Console, GA4 e Cloudflare Analytics).

---

## MÓDULO 3: Plataforma de Ofertas & Afiliados Multi-Lojas (`/ofertas/`)

### 3.1 Visão Geral e Arquitetura Autônoma em Nuvem
- **Objetivo**: Sistema inteligente de recomendação e comparador técnico de ofertas com monetização via afiliação nos 4 maiores marketplaces do Brasil (Mercado Livre, Shopee, Amazon Brasil e AliExpress).
- **Diretriz Crítica**: Operação 100% autônoma em nuvem sem dependência de comandos manuais no terminal ou commits no Git a cada produto publicado. O operador pode cadastrar, aprovar ou excluir ofertas de qualquer smartphone na rua.
- **Banco de Dados no Supabase**: Tabela estrutural `afiliados_produtos`.

### 3.2 Mesa de Operações do Administrador (`afiliados.html` & `admin-app.js`)
- **Segurança por Obscuridade & Sessão**:
  - Rota protegida `/ofertas/afiliados.html` com verificação de login Supabase Auth unificada às credenciais do painel de OS e Leads.
- **Barra de Ingestão com IA e Input Direto**:
  - Campo de URL do anúncio oficial (`#txtLinkManual`).
  - Campo de Preço Real do Anúncio (`#txtPrecoManual`): permite que o operador informe o valor promocional exato visto no aplicativo/loja no momento da importação.
  - Campo de URL Opcional de Imagem (`#txtFotoManual`).
  - Botão `[ 🤖 Processar com IA ]` e atalho pela tecla Enter.
  - Indicador animado de status em background (`#statusMineracao`):
    `[ ⏳ Minerando dados oficiais... Extraindo foto HD e consultando Shopee/Amazon... ]`
- **Seletor Híbrido de Foto (Opção A3)**:
  - **Eliminação de Fotos Geradas Localmente no IDE**: A fotografia oficial de catálogo do anúncio é extraída com fidelidade milimétrica do frasco, modelo e rótulo.
  - Na Mesa, o operador conta com os botões de alternância instantânea:
    - `[ 📷 Foto Original HD ]`: Preserva a fotografia de estúdio pura do anúncio.
    - `[ ✨ Estúdio WL TEC (Dark) ]`: Aplica o tratamento visual tecnológico Dark Mode diretamente via canvas/CSS com iluminação neon.
    - Badge em tempo real indicando qual acabamento está selecionado antes da publicação.
- **Comparador Multi-Store Real com Gemini Search Grounding (Opção B1)**:
  - O backend aciona a API do Google Gemini com pesquisa web em tempo real (Google Search Grounding).
  - A chave da API Gemini é carregada automaticamente da tabela `config_privada` do Supabase (`GEMINI_API_KEY`), sem exigir digitação manual no celular.
  - O sistema consulta os concorrentes (Mercado Livre, Shopee, Amazon e AliExpress), calcula o menor preço verificado e aplica o protocolo rígido de indisponibilidade: itens que comprovadamente não são comercializados por uma determinada plataforma (como perfumes nacionais brasileiros no AliExpress) recebem valor `null` e badge de **Indisponível**, preservando a credibilidade técnica da curadoria.
- **Botão Descartar Rascunho (`#btnDescartarRascunho`)**:
  - Diálogo de confirmação para prevenir descartes acidentais.
  - Limpa imediatamente todos os campos de importação manual (`txtLinkManual`, `txtPrecoManual`, `txtFotoManual`).
  - Oculta o indicador de mineração.
  - Define `rascunhoAtual = null;` e aciona `renderizarRascunho()`.
  - O card de rascunho desaparece e dá lugar ao painel limpo `#emptyDraftNotice` com botão para colar novo link.
  - **Persistência Limpa**: A variável `rascunhoAtual` é inicializada como `null` no carregamento. Ao atualizar a página (F5), a Mesa permanece limpa e não auto-preenche a tela com nenhum produto indesejado.
- **Botão Aprovar e Publicar no Site (`#btnAprovarPublicar`)**:
  - Salva a oferta no cache local e realiza upsert direto na tabela `afiliados_produtos` do Supabase.
  - Remove automaticamente o slug da lista de exclusões (`removerDosExcluidos`), garantindo que o produto entre no ar instantaneamente.
  - Notifica o operador com toast de confirmação.
- **Botão Excluir Produto do Catálogo (`window.excluirProduto`)**:
  - **Exclusão Real na Nuvem Supabase**: Executa o comando `DELETE` diretamente na tabela `afiliados_produtos` do Supabase via API (`await db.from('afiliados_produtos').delete().eq('slug', slug)`).
  - **Lista Negra Anti-Ressurreição (`STORAGE_KEY_EXCLUIDOS`)**: O slug é registrado na chave `wltec_afiliados_excluidos_v1`. Ao atualizar a página (F5), nenhum script estático ou sincronização remota consegue reinserir o item excluído no catálogo.
  - Se o item excluído for o rascunho atualmente aberto na Mesa, ele é descartado na hora.
  - O catálogo atualiza na hora e o número de itens permanece estritamente no valor correto após qualquer refresh (F5).
- **Sincronização Autônoma com a Nuvem (`sincronizarComNuvem`)**:
  - Ao carregar a Mesa, o sistema consulta a tabela `afiliados_produtos` no Supabase.
  - Se na nuvem houver algum item marcado na lista negra local de excluídos, envia o comando de deleção para limpar a nuvem.
  - Mescla novas ofertas cadastradas remotamente por outros dispositivos móveis sem re-adicionar itens excluídos.

### 3.3 Vitrine Pública de Ofertas (`/ofertas/index.html` & `ofertas-app.js`)
- **Catálogo Base Calibrado**:
  - 10 produtos iniciais de alta demanda rigorosamente calibrados com preços reais do mercado brasileiro em `produtos-data.js`.
- **Sincronização com Supabase**:
  - Ao carregar a vitrine, consulta a tabela `afiliados_produtos` do Supabase em segundo plano.
  - Filtra rigorosamente os itens pela lista negra `STORAGE_KEY_EXCLUIDOS`, garantindo que produtos deletados pelo operador na Mesa sumam imediatamente da vitrine pública.
- **Navegação & Conversão**:
  - Barra de busca dinâmica em tempo real por título e categoria.
  - Filtro por abas de categorias (Tecnologia, Utilidades, Saúde, Ferramentas, Moda, Casa).
  - Cards com badges de destaque (Menor Preço, Cupom Ativo, Frete Grátis) e redirecionamento direto para a loja parceira ou para a página de resenha completa.

### 3.4 Template Dinâmico Universal (`produto.html`), Clean URLs & Open Graph
- **Roteamento Catch-All Dinâmico (`404.html`)**:
  - Intercepta requisições a URLs amigáveis como `/ofertas/<slug>.html` e redireciona instantaneamente para `/ofertas/produto.html?slug=<slug>`, preservando tags de rastreamento (`&src=zap`).
- **Renderização Dinâmica (`ofertas-app.js`)**:
  - Busca as informações do produto no cache local ou diretamente na tabela `afiliados_produtos` do Supabase caso o visitante acesse um link recém-criado na nuvem.
  - Exibe galeria interativa de fotos, veredito técnico, comparador de preços 4 em 1 com tags de afiliado (`matt_word=wilbade`, `wilbade09-20`, etc.), prós, contras, tabela de especificações técnicas, FAQ e barra sticky inferior para conversão rápida.
- **Resolução Crítica de Prévia em Redes Sociais (WhatsApp, Telegram, Facebook)**:
  - **O Problema de Scrapers**: Crawlers de redes sociais leem apenas o HTML estático bruto e não executam JavaScript client-side. O template `produto.html` continha metadados herdados que puxavam a foto da Creatina para qualquer produto compartilhado via URL genérica.
  - **A Solução Definitiva**:
    1. **Fallback Limpo Universal**: No `produto.html`, as tags `og:image` e `og:title` foram atualizadas para o selo e escudo institucional verificado da WL TEC (`https://wl.tec.br/img/escudo_shiel.png`), eliminando imagens indevidas em links de contingência.
    2. **Páginas Estáticas Dedicadas**: Para os produtos do catálogo (incluindo `o-boticario-insensatez-deo-colonia-100ml.html` e `suporte-celular-moto-com-carregador-usb-antivibracao.html`), foram geradas páginas estáticas com metadados Open Graph exatos (`og:image`, `og:title`, `og:description` e `og:url`).
    3. **Botão WhatsApp Formatado (`#btnCopiarZap`)**: Atualizado no `admin-app.js` para copiar o link direto da página dedicada:
       ```
       👉 https://wl.tec.br/ofertas/o-boticario-insensatez-deo-colonia-100ml.html?src=zap
       ```
       Ao colar no WhatsApp, o aplicativo requisita o arquivo diretamente e exibe na hora a foto oficial do frasco de perfume, o título exato e o preço promocional real.

---

## Estrutura de Arquivos e Diretórios

```
d:\LongoShield\SITE\longo-shield-web\
├── index.html                   # Landing page institucional (Cibersegurança Raiz)
├── main.js                      # Interações e telemetria da home
├── style.css                    # Estilos globais Dark Tech
├── wl.leads.html                # Painel CRM e Modo Agêntico Outbound
├── preview.html                 # Visualizador de propostas comerciais de 7 dias
├── seo-geo.html                 # Radar de auditoria de busca e IAs
├── 404.html                     # Roteador dinâmico catch-all para ofertas
├── llms.txt                     # Manifesto de contexto padronizado para robôs de IA
├── robots.txt                   # Mapeamento de 20+ IAs e proteção de rotas privadas
├── sitemap.xml                  # Mapa de rotas indexáveis do site
├── cookie-banner.js             # Componente universal de LGPD
├── politica-de-privacidade.html # Política de Privacidade Geral
│
├── os/                          # MÓDULO 1: Gestão de OS de Bancada
│   ├── index.html               # Aplicação SPA administrativa de OS
│   ├── style.css                # Estilos do painel de OS e relatórios BI
│   └── app.js                   # Lógica da OS, fotos, canvas e geração de PDFs
│
├── manutencao/                  # MÓDULO 1: Landing Page Comercial de Manutenção
│   ├── index.html               # Landing page comercial
│   ├── style.css                # Estilos com banner Leva & Traz
│   ├── app.js                   # Integração ViaCEP, formulário e redirecionamento
│   └── privacidade.html         # Política de sigilo de dados em equipamentos
│
└── ofertas/                     # MÓDULO 3: Plataforma de Afiliados Multi-Lojas
    ├── index.html               # Vitrine pública de ofertas
    ├── ofertas.css              # Design system de cards, comparador e review
    ├── ofertas-app.js           # Lógica da vitrine, busca e renderização
    ├── produtos-data.js         # Catálogo base de 10 produtos e cupons diários
    ├── afiliados.html           # Mesa de Operações restrita do administrador
    ├── admin-app.js             # Lógica da Mesa, IA Gemini, Supabase e exclusões
    ├── produto.html             # Template dinâmico universal
    ├── o-boticario-insensatez...html # Página estática com Open Graph do perfume
    ├── suporte-celular-moto...html   # Página estática com Open Graph do suporte
    └── img/                     # Fotografias oficiais autênticas de produtos
```
