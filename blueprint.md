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
- **Reestruturação do `robots.txt`**: Mapeamento e permissão explícita de mais de 20 crawlers legítimos e IAs de busca (`OAI-SearchBot`, `ChatGPT-User`, `Google-Extended`, `ClaudeBot`, `Claude-Web`, `PerplexityBot`, `Meta-ExternalAgent`, `Applebot-Extended`, `bingbot`), mantendo bloqueio em scrapers comerciais agressivos (`AhrefsBot`, `SemrushBot`) e proteção total das rotas administrativas (`/os/` e `/wl.leads.html`).
- **Sitemap.xml**: Inclusão da rota `https://wl.tec.br/manutencao/` com prioridade 0.9 e frequência de atualização semanal.

## Registro de Alterações (Changelog)

### Módulo /os/ (Gestão de OS de Bancada)
- Criada a estrutura de arquivos `/os/index.html`, `/os/style.css` e `/os/app.js`.
- Configurada conexão com Supabase BaaS (URL: `https://giikoiqpnzgmhcqiuvhs.supabase.co`).
- Gerado script SQL para criação das tabelas `clientes_os`, `ordens_servico` e `pre_chamados` com RLS habilitado e criação do bucket de storage `fotos-os`.
- Adicionada aba "🔔 Leads Web" no painel de OS para listar solicitações vindas do site com conversão em 1 clique para OS.

### Módulo /manutencao/ (Landing Page Comercial)
- Criada a landing page em `/manutencao/index.html`, `/manutencao/style.css` e `/manutencao/app.js`.
- Adicionado banner interativo para o serviço "Leva & Traz".
- Integrada consulta de CEP em tempo real via API ViaCEP com animação de revelação de campos.
- Implementado formulário de pré-abertura de chamado com envio automático para o Supabase e redirecionamento para o WhatsApp com mensagem formatada contendo o endereço completo.
- Inseridas meta tags GEO-SEO, schemas JSON-LD (`LocalBusiness` + `FAQPage`) e seção FAQ visível com `<details>`.
- Ajustada a estilização do botão "Agendar Retirada" no header para o estilo dourado (`btn-amber`).

### Infraestrutura & SEO Global
- Atualizado `robots.txt` com mapeamento granular de robôs de IA e bloqueio de scrapers.
- Atualizado `sitemap.xml` para incluir a rota `/manutencao/`.
- Mantidas rigorosamente as regras de isolamento (arquivos da raiz mantidos seguros).
