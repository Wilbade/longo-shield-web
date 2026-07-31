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
- **Micro-SaaS Operacional & DRE Financeiro no Painel `/os/`**:
  - **Módulo de Estoque (`📦 Estoque`)**: Tabela de itens (SSDs NVMe/SATA, RAM, Telas, Baterias, Insumos) pré-populada com valores reais de mercado (Custo vs. Preço de Venda) e alertas visuais de reestoque quando `quantidade <= quantidade_minima`.
  - **Diretório de Terceiros & Fornecedores (`🤝 Terceiros`)**: Gestão de parceiros terceirizados (ex: Laboratório de Reparo de Placas BGA / Reballing, BringIT Distribuidora de Telas) com controle de especialidades e prazos.
  - **DRE Financeiro Mensal (`📊 Financeiro & DRE`)**: Painel de cálculo automático do **Lucro Líquido Real do Mês** e Margem de Lucro (%):
    - `Faturamento Bruto` (OSs Concluídas) - `Custo de Peças` (Estoque) - `Deslocamento/Gasolina` - `Custos Fixos/Investimentos` (Ads R$ 300, Panfletos R$ 150, Insumos R$ 350) = **LUCRO LÍQUIDO REAL (R$)**.
  - **Baixa Automática de Estoque**: Seleção de peças consumidas no modal de edição da OS com atualização automática da quantidade em estoque.
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
- Implementada barreira de login com **Supabase Auth** (`signInWithPassword`) e verificação anti-bot via **Cloudflare Turnstile** (`data-sitekey="0x4AAAAAADi04phstlIV5BIH"`).
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
