# Blueprint - WL TEC Longo Shield

## Visão Geral e Capacidades
O projeto **WL TEC Longo Shield** é uma aplicação web focada em cibersegurança, blindagem digital e consultoria, criada para avaliar a resiliência cibernética de empresas.
As principais capacidades do sistema incluem:
- **Landing Page Interativa**: Com formulário para análise rápida de domínios (verificando SSL, DMARC e reputação via APIs).
- **Geração de Dossiê PDF**: Relatório técnico instantâneo sobre a saúde digital da infraestrutura analisada.
- **Painel CRM (wl.leads.html)**: Sistema administrativo com autenticação (Supabase) que lista todos os leads que realizaram consultas.
- **Inteligência Artificial Integrada**: Geração de propostas comerciais automáticas em formato Markdown usando a API do Google Gemini, a partir dos dados do lead (Score, SSL, Velocidade).

## Histórico de Design e Funcionalidades Implementadas
- **Tecnologias Básicas**: HTML5, CSS3, JavaScript Vanilla. Backend BaaS com Supabase.
- **Design System**: Interface com estética moderna ("Dark Mode" nativo), uso extensivo de cores neon (Cyan/Ambar/Verde) para dar a sensação de um dashboard hacker/hitech, e fontes futuristas (Rajdhani e Roboto). Glassmorphism e sombras sutis usadas nos modais.
- **Segurança e Privacidade (AppSec)**: Sessão sem estado persistente via `sessionStorage` para evitar vazamentos de PII em computadores públicos. Captura de geolocalização e chamadas para IA nativamente migradas para backend (Supabase Edge Functions) visando 100% de conformidade com a LGPD e ocultação de API Keys (Gemini). Cloudflare Turnstile para mitigar spam automatizado na RPC.
- **UI/UX**: Barra de progresso animada ao analisar domínios, modais responsivos e badges visuais para diferentes scores (A+, Crítico, Alerta).
- **Conteúdo SEO (FAQ)**: Seção de Perguntas Frequentes (*People Also Ask*) otimizada nativamente via HTML5 (`<details>` e `<summary>`) para captura orgânica de *long-tail keywords* sem sacrifício de performance JavaScript.
- **SEO Modernizado**: Meta tags configuradas para ranqueamento Google e otimizadas com palavras-chave direcionadas a "Segurança, Validação de Domínio, DMARC, IAs".

## Registro de Alterações Recentes (Changelog)

### Atualizações de SEO e Palavras-chave (Expansão Nacional)
- **Migração de Escopo**: O SEO foi expandido de regional (ABC Paulista/SP) para **Nacional** (Brasil), visto que serviços de cibersegurança e auditoria de domínio não possuem barreiras geográficas.
- Adição de novos termos técnicos e *long-tail keywords* de alta conversão à tag `<meta name="keywords">` (`index.html`). Exemplos incluídos: "como proteger site contra invasão", "teste de invasão", "pentest", "LGPD", "consultoria em cibersegurança Brasil", etc.
- Atualização da `<meta name="description">` para focar em "empresas em todo o Brasil".

### Correção de Datas no CRM (Leads e IA)
- **Fuso Horário Local**: Na tabela do CRM (`wl.leads.html`), as datas de entrada dos leads foram ajustadas para forçar o fuso horário oficial de Brasília (`America/Sao_Paulo`), prevenindo distorções no horário que ocorriam em diferentes navegadores ou servidores base.
- **Data Dinâmica da Proposta (Gemini)**: Substituída a orientação de data fixa no prompt da IA, exigindo agora que o Gemini escreva a data atual real no cabeçalho das propostas geradas, resolvendo o problema onde a IA utilizava datas base de treinamento (ex: "22 de Maio de 2024").
