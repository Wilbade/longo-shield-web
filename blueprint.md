# Blueprint - WL TEC Longo Shield

## Visão Geral do Ecossistema

O projeto **WL TEC** (acessível em `https://wl.tec.br`) é uma plataforma web integrada de alta tecnologia, construída sob os padrões de Vanilla Web Standards (HTML5 Semântico, CSS3 Moderno com Glassmorphism/Dark Mode e JavaScript ES6+ modular), com Backend as a Service (BaaS) centralizado no **Supabase** (PostgreSQL, Storage buckets, Auth e Edge Functions) e proteção de borda via **Cloudflare**.

O ecossistema divide-se em **três módulos operacionais isolados**:
1. **Módulo de Manutenção de TI & Gestão de OS de Bancada** (`/os/` e `/manutencao/`)
2. **Módulo de Cibersegurança, Auditoria & CRM Outbound** (`wl.leads.html`, `seo-geo.html`, `preview.html`, raiz)
3. **Módulo de Plataforma de Ofertas & Afiliados Multi-Lojas** (`/ofertas/`)

---

## 🏛️ GOVERNANÇA CENTRAL & DIRETRIZES DE NEGÓCIOS (SINGLE SOURCE OF TRUTH)

Este arquivo (`blueprint.md`) é a **Fonte Única e Soberana da Verdade (SSOT)** de todo o ecossistema WL TEC / Longo Shield Web. Qualquer agente de IA ou desenvolvedor deve obrigatoriamente cumprir os seguintes pilares invioláveis:

### 1. Separação Rígida de Módulos (Zero Contaminação Cruzada)
- **Raiz (`/`)**: Cibersegurança, Soluções Antiphishing, Institucional Longo Shield e utilitários globais (`llms.txt`, `robots.txt`, `politica-de-privacidade.html`).
- **Módulo Manutenção (`/manutencao/`)**: Landing page comercial voltada ao atendimento de notebooks e computadores no ABC Paulista, com integração ViaCEP, agendamento de Leva & Traz e gravação dual em `pre_chamados`.
- **Módulo OS (`/os/`)**: CRM interno restrito de Ordens de Serviço (emissão de PDFs técnicos e garantias em conformidade com o CDC, assinaturas digitais, fotos de evidência no Supabase Storage e DRE financeiro).
- **Módulo Ofertas (`/ofertas/`)**: Vitrine pública de produtos verificados (`index.html`), Comparador de Preços 4 em 1 com SEO E-E-A-T (`produto.html`) e Mesa de Operações Administrativa (`afiliados.html` / `admin-app.js`).
- **Regra**: Cada módulo possui seu próprio escopo CSS, scripts e dependências. Nenhuma alteração no módulo de ofertas deve tocar ou interferir nos arquivos de `/os/` ou `/manutencao/`, e vice-versa.

### 2. Regras Críticas Invioláveis do Módulo de Ofertas (`/ofertas/`)
1. **Blindagem de Imagens e Proibição de Fallback Cruzado:**
   - É expressamente proibido usar URLs externas instáveis geradas por IA sem verificação.
   - O catálogo base e os fallbacks devem utilizar estritamente os **12 packshots oficiais locais** armazenados em `/ofertas/img/` (`fone_lenovo.jpg`, `fone_qcy.jpg`, `creatina_soldiers.jpg`, `ssd_nvme.jpg`, `smartwatch_colmi.jpg`, `balanca_digital.jpg`, `mini_compressor.jpg`, `carregador_baseus.jpg`, `kit_meias.jpg`, `camiseta_algodao.jpg`, `boticario_insensatez.jpg`, `suporte_moto.jpg`).
   - NUNCA cruzar imagens de categorias diferentes em fallbacks (ex: moto em suporte de celular ou fones, ou escudo institucional como hero do produto).
   - Ao sugerir novas fotos no re-escaneamento, a IA deve passar por pré-teste assíncrono via `Image.onload` (`testarCarregamentoImagem`) com verificação de dimensões mínimas e timeout. Em caso de falha, mantém o packshot oficial ou usa o SVG Dark Tech contextualizado do nicho.
2. **Soberania Absoluta dos Preços do Operador Humano & Gestão Inteligente:**
   - O operador humano tem soberania sobre os preços auditados.
   - Ao executar o re-escaneamento com IA, o sistema atualiza fotos oficiais, prós/contras, especificações e métricas. Caso o produto já possua preços cadastrados pelo operador, o sistema apresenta confirmação explícita para o operador decidir entre aceitar as novas cotações da IA ou manter os preços auditados.
   - Se as lojas estiverem vazias ou zeradas, o preenchimento automático das cotações é realizado diretamente.
3. **Trava Anti-Acessórios Obrigatória na IA:**
   - Os motores de re-escaneamento e mineração com Gemini devem instruir explicitamente: *"DESCONSIDERE rigorosamente anúncios de peças avulsas, estojos/cases de carregamento usados, cabos ou acessórios isolados. O preço coletado deve ser exclusivamente do produto completo, novo e lacrado."*
4. **Trava Inviolável de Publicação (Zero Ofertas Sem Imagem):**
   - É terminantemente proibido aprovar ou publicar ofertas cuja imagem oficial esteja quebrada, vazia ou inacessível no navegador.
   - O botão "Aprovar e Publicar" executa pré-validação assíncrona mandatória (`testarCarregamentoImagem`) e bloqueia imediatamente a submissão se a imagem falhar, exigindo upload de foto real ou inserção de URL válida.
5. **Upload Direto de Imagens & Otimização WebP:**
   - A Mesa de Operações possui botão de upload direto de imagens (`#btnUploadFotoProduto`) que converte fotos para WebP otimizado (< 90KB via HTML5 Canvas) e faz upload automático para o bucket `fotos-os` do Supabase Storage.
6. **Higienização Cirúrgica de Queries de Busca (`extrairTermoBuscaEnxuto`):**
   - É proibido injetar títulos completos com palavras de marketing ("projetor portátil smart", "fone bluetooth", "original", etc.) nas buscas dos marketplaces parceiros, pois isso confunde o algoritmo do Mercado Livre e Shopee e faz retornar marcas genéricas (ex: Blulory).
   - O sistema isola cirurgicamente a `[Marca + Modelo]` (ex: `Wanbo T2 Max`) através de `extrairTermoBuscaEnxuto()`, garantindo que os links de cotação tragam exclusivamente o produto correto.
7. **Refinamento de Links de Marketplace (Filtro "Novo" & "Menor Preço"):**
   - Links de busca ampla do Mercado Livre devem ser automaticamente refinados com os parâmetros de condição "Novo" e ordenação por menor preço (`_ITEM*CONDITION_2230284_OrderId_PRICE*ASC`).
8. **Transparência de Links & Exibição Obrigatória de Preços:**
   - **Exibição de Preços Existentes:** Se a loja possui um preço cadastrado e válido (ex: `preco_mercadolivre`, `preco_shopee`, etc.), o valor em Reais (R$) DEVE ser exibido claramente em destaque para permitir a comparação pelo usuário, acompanhado do selo "Cotação de Referência" quando o link for de busca.
   - Links de listagem ampla exibem o botão transparente **`[🔍 Consultar Cotação ➜]`**.
   - O menor preço na sidebar sticky deve refletir fidedignamente o menor valor real válido entre as lojas ativas cadastradas.
9. **Prevenção de XSS e Sanitização Contínua:**
   - Todo dado dinâmico injetado no DOM a partir do Supabase ou parâmetros de URL (`location.search`) deve passar obrigatoriamente por `escapeHtml()`.

### 3. Autonomia por Agentes para Tarefas Complexas
- Para tarefas complexas, refatorações amplas, auditorias de segurança ou validações estruturais, a IA tem total autonomia para orquestrar sub-agentes ou fluxos orientados a tarefas dentro do workspace, operando de forma assíncrona e modular sem sobrecarregar o chat principal.

### 4. PROIBIÇÃO DE USO DO NAVEGADOR DO USUÁRIO
- A IA está **estritamente proibida** de abrir, acionar ou tentar realizar testes visuais utilizando o navegador web pessoal do usuário.
- Quaisquer testes de interface, validações de rotas, verificação de DOM, scripts ou testes unitários devem ser executados **exclusivamente via linha de comando (CLI)**, scripts Node.js headless, análise de código estática ou simulações automatizadas no ambiente de desenvolvimento do workspace.

### 5. Trava de Segurança de Refatoração (Integridade de Funções Utilitárias & Escopo)
- **Proibição Expressa de Remoção de Utilitários:** É terminantemente proibido remover, omitir ou deixar de declarar funções utilitárias compartilhadas ou de suporte (como `escapeHtml`, `obterFotoSeguraProduto`, geradores de links, parsers de moeda, formatadores de data e handlers auxiliares) durante refatorações de interface, layout ou templates.
- **Checagem de Escopo Pré-Commit (Zero Regressões):** Antes de concluir qualquer alteração em arquivos de script (`admin-app.js`, `ofertas-app.js`, `os.js`, `main.js`), o agente DEVE verificar se todas as variáveis e funções chamadas dentro de interpolações de strings (ex: `${escapeHtml(...)}`, `${obterFoto...}`), métodos de array (`.map(...)`, `.forEach(...)`) e atributos inline (`onclick="..."`) estão devidamente declaradas e acessíveis no escopo léxico do arquivo e/ou no objeto global `window`.
- **Prevenção de "Uncaught ReferenceError":** A quebra de funções utilitárias que já estavam em produção paralisa os fluxos administrativos e as vitrines. Nenhuma refatoração cosmética pode deletar ou terceirizar utilitários pré-existentes sem garantia absoluta de importação ou declaração equivalente.

### 6. Regra de Atualização Obrigatória do `blueprint.md`
- Qualquer agente de IA ou desenvolvedor atuando neste repositório DEVE:
  1. Consultar este `blueprint.md` antes de iniciar qualquer implementação para entender a arquitetura vigente.
  2. Atualizar este `blueprint.md` ao finalizar cada ciclo de mudanças, registrando as novas funcionalidades, regras de negócio ou refatorações aplicadas.
  3. Manter o repositório livre de arquivos de prompt temporários ou redundantes na raiz.

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
    └── img/                     # Fotografias oficiais autênticas de produtos

supabase/
    └── cloudflare-worker-og-injector.js  # Código do Worker (referência de versão)
```

---

## INFRAESTRUTURA DE BORDA — Cloudflare Worker: OG Injector (2026-09-04)

### Problema Resolvido
Bots de redes sociais (WhatsApp, Telegram, Facebook) não executam JavaScript, portanto as tags `og:image` dinâmicas injetadas via JS são invisíveis para eles. O resultado era: ao compartilhar qualquer link de produto no WhatsApp, aparecia o escudo genérico da WL TEC em vez da foto real do produto.

### Solução Implementada
**Cloudflare Worker** (`wltec-og-injector`) ativo na rota `wl.tec.br/ofertas/*`.

**Fluxo de execução:**
1. Bot do WhatsApp/Telegram/Facebook acessa URL do produto
2. Worker detecta o User-Agent do bot
3. Extrai o `slug` da URL (`?slug=VALOR` ou `/ofertas/nome.html`)
4. Consulta tabela `afiliados_produtos` no Supabase REST API
5. Injeta tags `og:title`, `og:description`, `og:image`, `og:url` corretas no `<head>`
6. Entrega HTML modificado ao bot → prévia com imagem real aparece no WhatsApp ✅
7. Usuários normais (Chrome, Safari, etc.) passam transparentemente sem overhead

**Zero commits necessários:** Quando um novo produto é publicado pelo admin na Mesa de Operações e salvo no Supabase, o Worker automaticamente encontra e injeta os dados corretos — sem geração de arquivos físicos.

### Formato de URL Compartilhada (Padrão Obrigatório)
```
https://wl.tec.br/ofertas/produto.html?slug=SLUG-DO-PRODUTO&src=zap
```
- O `src=zap` permite rastreamento de origem (WhatsApp)
- O `src=tg` identifica origem Telegram
- Os botões "Copiar para WhatsApp" e "Disparar no Telegram" do admin já geram este formato

### Supabase RLS — Política Atualizada
```sql
-- Permite que o Worker (anon key) leia qualquer produto, não apenas publicados
DROP POLICY "Leitura pública de produtos publicados" ON afiliados_produtos;
CREATE POLICY "Leitura pública de todos os produtos"
ON afiliados_produtos FOR SELECT TO anon, authenticated USING (true);
```

### Arquivos Modificados
- `cloudflare-worker-og-injector.js` (Supabase/) — código do Worker deployado no Cloudflare
- `ofertas/admin-app.js` — botões WhatsApp e Telegram agora geram `produto.html?slug=` (correto)
- Supabase Dashboard — política RLS `afiliados_produtos` atualizada
- Cloudflare Dashboard — Worker ativo + Rota `wl.tec.br/ofertas/*` configurada

---

## ARQUITETURA DE SEO & GEO (Generative Engine Optimization) (2026-09-04)

### 1. Sitemap Index Dinâmico
- `sitemap.xml`: transformado em **Sitemap Index** referenciando:
  - `https://wl.tec.br/sitemap-static.xml`: páginas fixas (institucionais, manutenção, vitrine).
  - `https://wl.tec.br/sitemap-ofertas.xml`: gerado dinamicamente via Cloudflare Worker (`supabase/cloudflare-worker-sitemap.js`), lendo o Supabase em tempo real.
- **Benefício**: Novos produtos publicados no painel admin aparecem no sitemap do Google instantaneamente sem novo deploy ou commit no GitHub.

### 2. Canonical URLs Dinâmicas & Deduplicação
- `ofertas/produto.html` e `ofertas/ofertas-app.js`:
  - `<link rel="canonical">` atualizado via JS para sempre apontar para `https://wl.tec.br/ofertas/produto.html?slug=X`.
  - Remove parâmetros de campanha/rastreamento (`?src=zap`, `?src=tg`) para evitar penalidade de conteúdo duplicado nos indexadores.

### 3. Schema.org (JSON-LD) de Alta Densidade
- Marcação `Product` enriquecida dinamicamente com:
  - `offers`: Preço, moeda (`BRL`), disponibilidade (`InStock`), seller e URL direta.
  - `sku` e `identifier`.
  - `BreadcrumbList`: Início > Ofertas > Nome do Produto (garante rich breadcrumbs nos snippets do Google).

### 4. GEO (Generative Engine Optimization) & llms.txt
- `llms.txt` na raiz padronizado segundo as diretrizes de IAs generativas (ChatGPT Search, Perplexity, Gemini, Claude).
- Define para as IAs como citar ofertas, atributos de preço, comparador de marketplaces e links canônicos.
- `robots.txt` mapeado com permissões explícitas para rastreadores de busca generativa (`OAI-SearchBot`, `PerplexityBot`, `Google-Extended`, `Claude-Web`, etc.).

---

## PLANO DE EVOLUÇÃO SÊNIOR: MESA DE OPERAÇÕES, REVIEWS COMPLETOS & GEO (2026-09-08)

### Diagnóstico e Resolução dos Problemas Operacionais
1. **Links de Compras Vazios ("Rastrear Tendências 48h"):**
   - Criação de gerador de deep-links de busca com tags de afiliado (`wilbade09-20`, `18349700720`, `wilbade`). Quando qualquer link de marketplace não for fornecido diretamente, o sistema gera dinamicamente a busca oficial da loja com a tag do usuário, assegurando que 100% das 4 lojas sempre possuam links de afiliado ativos.
2. **Mineração por Nichos do Google Trends (Superando a limitação do QCY T13):**
   - Criação de seletor por categorias de alto crescimento (Tecnologia & Inovação, Saúde & Bem-Estar, Casa Conectada, Setup Gamer, Trends Gerais). Mineração dinâmica sem repetição de produtos já aprovados no catálogo.
3. **Gestão e Ranqueamento de Cupons por Loja (Especial 09.09):**
   - Nova aba na Mesa de Operações para cadastrar cupons ativos com identificador explícito de marketplace (Mercado Livre, Shopee, Amazon, AliExpress), regras de desconto e links de afiliados.
   - Atualização da vitrine pública de cupons com badges visuais oficiais das lojas e marcação estruturada para SEO/GEO.
4. **Reviews Fidedignos (E-E-A-T Real):**
   - Correção do payload do Supabase em `admin-app.js` para persistir `fontes_citadas`, `especificacoes_tecnicas`, `faq`, `comentarios_reais` e `metodologia_review`.
   - Síntese realista: quando houver homologação pública oficial (Anatel/Inmetro), cita com precisão; quando não houver ou não se aplicar, informa com transparência que se baseia nas especificações oficiais do fabricante.
5. **Segurança da API Gemini:**
   - Padronização no modelo já validado em `wl.leads.html`: recuperação da chave via tabela `config_privada` sob sessão autenticada do Supabase, com suporte a retentativas e rotação de modelos (`gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-2.5-flash`).
6. **Remoção do Botão "Restaurar 10":**
   - Eliminação do botão no cabeçalho da Mesa de Operações para evitar sobrescrita acidental do catálogo oficial do administrador.
7. **Botão "Re-escanear com IA" & Resolução Rigorosa de Fotos Oficiais:**
   - Implementação da ação `[🔄 Re-escanear com IA]` tanto no rascunho em edição quanto nas linhas da tabela desktop e nos cards touch mobile do catálogo.
   - Auditoria via Gemini e inteligência de mercado: busca fotos oficiais de estúdio e catálogo de e-commerce (banindo fotos aleatórias do Unsplash como motos em suportes de celular), cotações ao vivo nas 4 lojas, total de avaliações, estrelas e selos dinâmicos ("🔥 Mais Vendido", "⭐ Melhor Avaliado").
   - Atualização instantânea com sincronização direta no banco Supabase (`afiliados_produtos`).
8. **Motor de Estúdio Visual WL TEC (Dark Mode Canvas):**
   - Resolução da alternância entre "📷 Foto Original HD" e "✨ Estúdio WL TEC": geração instantânea client-side via HTML5 Canvas de um ambiente de estúdio fotográfico dark-tech (fundo gradiente radial escuro #151d2f/#05070d, pedestal com iluminação neon ciano e drop-shadow realista sobre o produto), alterando a imagem visualmente na tela com preview ao vivo.
9. **Validação Pré-Publicação (Anti-Oferta Inverídica):**
   - Checagem automática no momento do clique em "Aprovar e Publicar": bloqueia títulos vazios, preços zerados, fotos inexistentes ou de veículos desconexos e gera automaticamente links de afiliados com tracking ID ativo para as 4 lojas antes de subir para o ar.
10. **Auditoria Automática Agendada 24/7 no Supabase (`pg_cron` & Edge Function):**
    - **Edge Function (`supabase/functions/auditar-ofertas-auto/index.ts`)**: Executada na nuvem, lê periodicamente a tabela `afiliados_produtos`, consulta a API do Gemini via `config_privada` e atualiza contagem de avaliações, notas, selos ("🔥 Mais Vendido", "⭐ Melhor Avaliado") e cotações de preços.
    - **Script SQL de Agendamento (`supabase/cron_auditoria_ofertas.sql`)**: Configura o `pg_cron` e `pg_net` para rodar diariamente às 04:00 UTC (01:00 BRT), acompanhado de uma rotina SQL nativa de segurança (`public.auditar_metricas_ofertas_sql()`) que recalcula badges baseada em tração de cliques e arquiva produtos ociosos (> 45 dias) sem depender de requisições HTTP externas.
    - **Botão na Mesa de Operações (`#btnAuditarNuvemAgora`)**: Permite que o administrador dispare essa auditoria completa de todas as ofertas a qualquer momento pelo celular com 1 clique.
11. **Refatoração Sênior de Integridade: Blindagem de Imagens & Soberania de Preços (2026-09-08):**
    - **Blindagem de Imagens (`admin-app.js` e `ofertas-app.js`)**: Remoção de qualquer fallback cruzado incorreto (como `img/suporte_moto.jpg` ou `escudo_shiel.png` em fones, creatina, roupas, etc.). Implementação de `obterFotoSeguraProduto` e `obterFotoCatalogoFallback` mapeados para os 12 packshots locais oficiais em `/ofertas/img/`, com suporte a teste assíncrono via `Image.onload` (`testarCarregamentoImagem`).
    - **Soberania de Preços do Operador**: O motor de re-escaneamento IA preserva os preços já auditados pelo operador, preenchendo apenas lojas vazias ou zeradas.
    - **Transparência de Links de Busca no Comparador**: Identificação dinâmica de links de listagem ampla (`lista.mercadolivre...`, `/search?...`). Exibe com transparência "Cotação ao Vivo" e o botão `[🔍 Consultar Cotação ➜]`, impedindo a exibição de preços fixos artificiais. O sticky sidebar ajusta-se automaticamente entre "Comprar" e "Consultar Cotação".
    - **Persistência Limpa**: Supabase upserts protegem dados canônicos e métricas auditadas.
12. **Trava de Segurança de Refatoração & Resolução de Escopo (`escapeHtml`) (2026-09-08):**
    - Correção imediata do `Uncaught ReferenceError: escapeHtml is not defined` no `ofertas/admin-app.js`, garantindo que a função utilitária de sanitização XSS esteja declarada tanto no escopo léxico interno quanto exportada para `window.escapeHtml`.
    - Atualização do cache-busting em `afiliados.html` para `v=2.5`.
    - Formalização da "Trava de Segurança de Refatoração" como diretriz mandatória no `blueprint.md` e `GEMINI.md`, proibindo expressamente a remoção ou omissão de utilitários durante mudanças de layout ou templates.
13. **Automação Definitiva do Motor de Re-escanear, Trava Anti-Acessórios & Links de Mercado Livre (2026-09-08):**
    - **Trava Anti-Acessórios na IA**: Atualização dos prompts de re-escaneamento e mineração do Gemini em `admin-app.js` para exigir estritamente cotação de produtos completos, novos e lacrados, desconsiderando peças avulsas, estojos usados ou acessórios.
    - **Refinamento de Links de Busca do Mercado Livre (`refinarLinkMercadoLivre`)**: Injeção automática dos parâmetros de produto novo e ordenação por menor preço (`_ITEM*CONDITION_2230284_OrderId_PRICE*ASC`) em `admin-app.js`, `ofertas-app.js` e `produtos-data.js`, eliminando descompassos de anúncios usados na experiência do usuário.
    - **Gestão Inteligente de Preços**: Ao re-escanear produtos já auditados, o sistema oferece diálogo de confirmação claro ao operador para aceitar as novas cotações da IA ou manter os preços auditados, garantindo autonomia sem surpresas.
    - **Cache Busting**: Versionamento avançado para `v=2.6` nos scripts de `afiliados.html`, `produto.html` e `index.html`.
14. **Trava Inviolável de Publicação, Upload Direto de Fotos & Higienização de Busca (2026-09-08):**
    - **Trava Inviolável de Publicação**: Bloqueio obrigatório no botão "Aprovar e Publicar" via `testarCarregamentoImagem` para impedir aprovação de produtos com fotos vazias ou URLs quebradas.
    - **Upload Direto de Fotos no Painel**: Integração de upload direto com conversão client-side via HTML5 Canvas para WebP otimizado (< 90KB) e persistência no Supabase Storage (`fotos-os`).
    - **Higienização Cirúrgica de Termos de Busca (`extrairTermoBuscaEnxuto`)**: Remoção de ruídos de marketing ("projetor portátil smart", "original", etc.), isolando a Marca + Modelo exatos para links do Mercado Livre e Shopee, eliminando exibição de produtos genéricos como Blulory.
    - **Correção Definitiva de Fallback no Hero (`produto.html`)**: O método `obterFotoSeguraProduto` com flag de erro garante que falhas de imagem remota carreguem o SVG Dark Tech temático ou packshot oficial, sem loop infinito de URLs quebradas.
    - **Cache Busting**: Elevação de versão para `v=2.7` em `afiliados.html`, `produto.html` e `index.html`.

