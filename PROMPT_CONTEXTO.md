# 🛡️ Arquitetura Multi-Módulos — Longo Shield Web (wl.tec.br)

Este repositório gerencia um ecossistema unificado sob o mesmo domínio (`wl.tec.br`), dividido em módulos independentes:
- Raiz (`/`): Cibersegurança / Longo Shield (Institucional e Soluções).
- Módulo Manutenção (`/manutencao/`): Landing page e app de suporte a notebooks.
- Módulo OS (`/os/`): CRM interno de Ordens de Serviço (compartilha autenticação Supabase com Leads/Afiliados).
- Módulo Ofertas (`/ofertas/`): Comparador 4 em 1 (Mercado Livre, Shopee, Amazon, AliExpress), cupons e painel admin (`afiliados.html` / `admin-app.js`).

## 🚨 Regras Críticas para o Módulo de Ofertas (`/ofertas/`)
1. **Imagens Locais e Fallbacks:** Proibido usar URLs externas instáveis geradas por IA. Utilize estritamente os packshots locais em `/ofertas/img/`. Se houver falha de carregamento, use um placeholder neutro do nicho, nunca imagens cruzadas (ex: foto de moto em fone de ouvido ou escudos institucionais genéricos).
2. **Integridade de Preços:** O motor de IA (re-escanear) NUNCA deve sobrescrever o preço real auditado pelo operador humano. O preço informado/auditado pelo operador é soberano.
3. **Links de Lojas:** Links de busca genérica (`/lista.mercadolivre...`) não devem ser exibidos com preço fixo falso. Devem ser tratados como "Consultar Cotação".
4. **Segurança e XSS:** Todo dado injetado dinamicamente do Supabase na vitrine ou painel deve utilizar saneamento (`escapeHtml`).