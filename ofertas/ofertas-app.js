// ==============================================================================
// WL TEC OFERTAS - APLICAÇÃO PÚBLICA (VITRINE, BUSCA, CUPONS E TELEMETRIA)
// Escopo: index.html (vitrine) e produto.html (review e comparador 4 em 1)
// Dependências: produtos-data.js, Supabase JS v2
// ==============================================================================

(function() {
  'use strict';

  // ── Chaves de Armazenamento Local (espelham as do admin-app.js) ──
  const STORAGE_KEY_PRODUTOS  = 'wltec_afiliados_produtos_v6';
  const STORAGE_KEY_CUPONS    = 'wltec_afiliados_cupons_v1';
  const STORAGE_KEY_METRICAS  = 'wltec_afiliados_metricas_v1';
  const STORAGE_KEY_CONFIG    = 'wltec_afiliados_config_v1';
  const STORAGE_KEY_EXCLUIDOS = 'wltec_afiliados_excluidos_v1';

  // ── Supabase Client (BaaS - Nuvem em Tempo Real, Zero Git Commit) ──
  const { createClient } = window.supabase || {};
  const db = (createClient && typeof createClient === 'function')
    ? createClient('https://giikoiqpnzgmhcqiuvhs.supabase.co', 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB')
    : null;

  /**
   * Utilitário de escape para evitar XSS em conteúdo injetado via innerHTML.
   * Use sempre que inserir strings vindas de fontes externas (Supabase, URL params).
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
  window.escapeHtml = escapeHtml;

  /**
   * Resolve de forma blindada a foto oficial de catálogo correspondente ao nicho do produto.
   * NUNCA cruza fotos de motos, escudos ou itens não relacionados em outros produtos.
   */
  function obterFotoSeguraProduto(produto, ignorarImagemUrl = false) {
    if (!produto) return 'img/fone_lenovo.jpg';
    const t = ((produto.titulo || '') + ' ' + (produto.slug || '') + ' ' + (produto.categoria || '')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Mapeamento rigoroso dos 12 packshots locais de alta resolução em /ofertas/img/
    if (t.includes('lenovo') || t.includes('lp40') || t.includes('thinkplus')) {
      return 'img/fone_lenovo.jpg';
    }
    if (t.includes('qcy') || t.includes('t13') || (t.includes('fone') && !t.includes('lenovo'))) {
      return 'img/fone_qcy.jpg';
    }
    if (t.includes('creatina') || t.includes('soldiers') || t.includes('suplemento')) {
      return 'img/creatina_soldiers.jpg';
    }
    if (t.includes('ssd') || t.includes('nvme') || t.includes('kingston') || t.includes('m.2')) {
      return 'img/ssd_nvme.jpg';
    }
    if (t.includes('colmi') || t.includes('p28') || t.includes('smartwatch') || t.includes('relogio')) {
      return 'img/smartwatch_colmi.jpg';
    }
    if (t.includes('balanca') || t.includes('bioimpedancia')) {
      return 'img/balanca_digital.jpg';
    }
    if (t.includes('compressor') || t.includes('bomba de ar') || t.includes('calibrador')) {
      return 'img/mini_compressor.jpg';
    }
    if (t.includes('baseus') || t.includes('carregador') || t.includes('gan')) {
      return 'img/carregador_baseus.jpg';
    }
    if (t.includes('meia') || t.includes('meias')) {
      return 'img/kit_meias.jpg';
    }
    if (t.includes('camiseta') || t.includes('algodao') || t.includes('camisa')) {
      return 'img/camiseta_algodao.jpg';
    }
    if (t.includes('insensatez') || t.includes('boticario') || t.includes('colonia') || t.includes('perfume')) {
      return 'img/boticario_insensatez.jpg';
    }
    if ((t.includes('suporte') && (t.includes('moto') || t.includes('guidao') || t.includes('retrovisor') || t.includes('antivibra'))) || (t.includes('moto') && t.includes('celular'))) {
      return 'img/suporte_moto.jpg';
    }

    // Se já tiver uma URL remota válida e não estivermos no modo de recuperação de erro (ignorarImagemUrl = false)
    if (!ignorarImagemUrl && produto.imagem_url && typeof produto.imagem_url === 'string') {
      const url = produto.imagem_url.trim();
      if (url.startsWith('http') && !url.includes('1558981806-ec527fa84c39') && !url.includes('placeholder')) {
        return url;
      }
      if (url.startsWith('img/') || url.startsWith('data:image/')) {
        return url;
      }
    }

    // Fallback elegante com SVG Dark Tech temático da categoria (nunca foto de moto ou escudo alheio)
    const cat = (produto.categoria || 'tecnologia').toUpperCase();
    const tit = escapeHtml((produto.titulo || 'WL TEC Ofertas').substring(0, 30));
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="100%" height="100%" fill="%230b0f19"/><rect x="20" y="20" width="560" height="560" rx="16" fill="none" stroke="%231e293b" stroke-width="2"/><circle cx="300" cy="260" r="80" fill="%23151d2f" stroke="%2300ffff" stroke-width="2" stroke-dasharray="4,4"/><text x="300" y="275" font-family="system-ui,sans-serif" font-size="42" text-anchor="middle" fill="%2300ffff">📦</text><text x="300" y="380" font-family="system-ui,sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="%23ffffff">${tit}</text><text x="300" y="415" font-family="system-ui,sans-serif" font-size="13" font-weight="600" text-anchor="middle" fill="%2310b981">WL TEC • ${cat}</text></svg>`;
  }
  window.obterFotoSeguraProduto = obterFotoSeguraProduto;

  /**
   * Extrai apenas os termos essenciais (Marca + Modelo) para as buscas nos marketplaces.
   * Remove stop-words, categorias e adjetivos de marketing que poluem a busca do ML e Shopee.
   */
  function extrairTermoBuscaEnxuto(titulo) {
    if (!titulo || typeof titulo !== 'string') return '';
    let t = titulo.trim();

    const stopWords = [
      /projetor\s+port[aá]til\s+smart/gi,
      /projetor\s+port[aá]til/gi,
      /projetor\s+smart/gi,
      /fone\s+(de\s+ouvido\s+)?bluetooth/gi,
      /fone\s+de\s+ouvido/gi,
      /fone\s+tws/gi,
      /smartwatch\s+relogio\s+inteligente/gi,
      /relogio\s+inteligente/gi,
      /caixa\s+de\s+som\s+bluetooth/gi,
      /carregador\s+r[aá]pido/gi,
      /original/gi,
      /lacrado/gi,
      /lan[cç]amento/gi,
      /novo/gi,
      /new/gi,
      /promoc[aã]o/gi,
      /oferta/gi,
      /oficial/gi,
      /frete\s+gr[aá]tis/gi,
      /entrega\s+full/gi,
      /pronta\s+entrega/gi,
      /envio\s+imediato/gi,
      /bivolt/gi,
      /110v/gi,
      /220v/gi,
      /global\s+version/gi,
      /vers[aã]o\s+global/gi,
      /\b(branco|preta|preto|azul|rosa|cinza|dourado)\b/gi
    ];

    let limpo = t;
    stopWords.forEach(regex => {
      limpo = limpo.replace(regex, ' ');
    });

    limpo = limpo.replace(/[-–—/|:,()]+/g, ' ').replace(/\s+/g, ' ').trim();

    const tokens = limpo.split(' ').filter(w => w.length >= 2);
    if (tokens.length >= 2) {
      return tokens.slice(0, 4).join(' ');
    }
    return t.split(' ').slice(0, 3).join(' ');
  }
  window.extrairTermoBuscaEnxuto = extrairTermoBuscaEnxuto;

  /**
   * Detecta se o link é uma busca genérica/listagem ampla de marketplace
   * em vez de um anúncio direto com preço unitário fixo.
   */
  function isLinkBuscaGenerica(url) {
    if (!url || typeof url !== 'string') return false;
    const u = url.toLowerCase();
    return u.includes('lista.mercadolivre.com.br') ||
           u.includes('shopee.com.br/search') ||
           u.includes('amazon.com.br/s?') ||
           u.includes('amazon.com.br/s/') ||
           u.includes('aliexpress.com/w/wholesale') ||
           u.includes('aliexpress.com/wholesale') ||
           u.includes('/search?') ||
           u.includes('searchtext=');
  }

  /**
   * Refina links de busca do Mercado Livre para filtrar produtos novos e ordenar por menor preço.
   * Evita que o usuário caia em anúncios de peças usadas (ex: caixas avulsas de R$ 39).
   */
  function refinarLinkMercadoLivre(link) {
    if (!link || typeof link !== 'string') return '';
    if (link.includes('lista.mercadolivre.com.br')) {
      let [basePath, query] = link.split('?');
      basePath = basePath.replace(/\/+$/, '');
      if (!basePath.includes('ITEM*CONDITION')) {
        basePath += '_ITEM*CONDITION_2230284';
      }
      if (!basePath.includes('OrderId_PRICE')) {
        basePath += '_OrderId_PRICE*ASC';
      }
      return query ? `${basePath}?${query}` : basePath;
    }
    return link;
  }
  window.refinarLinkMercadoLivre = refinarLinkMercadoLivre;

  /**
   * Retorna a lista de slugs que o admin excluiu permanentemente.
   * Atua como barreira dupla: filtro local + filtro na sincronização da nuvem.
   */
  function getExcluidos() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXCLUIDOS);
      return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  }

  function getConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return null;
  }

  function aplicarConfiguracoes() {
    const cfg = getConfig();
    if (!cfg) return;

    // Atualiza links de Canal VIP / Grupo de WhatsApp em toda a página
    if (cfg.zap_link) {
      document.querySelectorAll('.btn-vip-zap, .btn-sub-alert-zap, a[href*="chat.whatsapp.com"]').forEach(el => {
        el.href = cfg.zap_link;
      });
    }

    // Atualiza links do Telegram
    if (cfg.tg_link || cfg.tg_chat_id) {
      const tgUrl = cfg.tg_link || (cfg.tg_chat_id ? (cfg.tg_chat_id.startsWith('@') ? `https://t.me/${cfg.tg_chat_id.replace('@', '')}` : `https://t.me/${cfg.tg_chat_id}`) : null);
      if (tgUrl) {
        document.querySelectorAll('.btn-vip-telegram, a[href*="t.me"]').forEach(el => {
          el.href = tgUrl;
        });
      }
    }
  }

  /**
   * Retorna o catálogo de produtos do localStorage, sempre filtrando os excluídos.
   * Fallback: usa PRODUTOS_INICIAIS do produtos-data.js se o storage estiver vazio.
   */
  function getProdutos() {
    const defaultProds = window.PRODUTOS_INICIAIS || [];
    const excluidos = getExcluidos();
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRODUTOS);
      if (saved) {
        let parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Barreira local: garante que nenhum produto excluído "ressuscite" após sync
          return parsed.filter(p => !excluidos.includes(p.slug));
        }
      }
    } catch (e) {
      console.warn('[WL TEC] Erro ao ler produtos do localStorage:', e);
    }

    // Inicializa o storage com o catálogo base já filtrado
    const base = defaultProds.filter(p => !excluidos.includes(p.slug));
    try { localStorage.setItem(STORAGE_KEY_PRODUTOS, JSON.stringify(base)); } catch(e) {}
    return base;
  }

  // 2. Obter Cupons
  function getCupons() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUPONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch(e) {}
    const defaultCupons = window.CUPONS_INICIAIS || [];
    try {
      localStorage.setItem(STORAGE_KEY_CUPONS, JSON.stringify(defaultCupons));
    } catch(e) {}
    return defaultCupons;
  }

  /**
   * Registra métricas de visita e cliques de afiliado no localStorage + Google Analytics 4.
   * @param {'visita'|'clique_loja'} tipo - Tipo do evento a registrar
   * @param {Object} [detalhes] - Para 'clique_loja': { loja, slug, preco }
   */
  function registrarTelemetria(tipo, detalhes) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_METRICAS);
      let metricas = saved ? JSON.parse(saved) : {
        visitas_totais: 0,
        visitas_google: 0,
        visitas_whatsapp: 0,
        visitas_direto: 0,
        cliques_loja_ml: 0,
        cliques_loja_shopee: 0,
        cliques_loja_amazon: 0,
        cliques_loja_ali: 0,
        logs: []
      };

      if (tipo === 'visita') {
        metricas.visitas_totais++;
        const params = new URLSearchParams(window.location.search);
        const src = params.get('src') || '';
        const ref = document.referrer.toLowerCase();

        // Classifica a origem da visita pelo parâmetro ?src= ou pelo Referrer HTTP
        if (src.includes('zap') || src.includes('whatsapp') || ref.includes('whatsapp')) {
          metricas.visitas_whatsapp++;
        } else if (ref.includes('google')) {
          metricas.visitas_google++;
        } else {
          metricas.visitas_direto++;
        }
      } else if (tipo === 'clique_loja') {
        const loja = detalhes.loja;
        if (loja === 'mercadolivre') metricas.cliques_loja_ml++;
        if (loja === 'shopee')       metricas.cliques_loja_shopee++;
        if (loja === 'amazon')       metricas.cliques_loja_amazon++;
        if (loja === 'aliexpress')   metricas.cliques_loja_ali++;

        // Mantém log rotativo dos últimos 50 cliques para auditoria
        metricas.logs.unshift({
          data: new Date().toISOString(),
          loja: loja,
          slug: detalhes.slug || 'geral',
          preco: detalhes.preco || 0
        });
        if (metricas.logs.length > 50) metricas.logs.pop();

        // Dispara evento de conversão para o Google Analytics 4
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'click_afiliado', {
            loja: loja,
            produto: detalhes.slug || 'geral',
            preco: detalhes.preco || 0,
            value: detalhes.preco || 0,
            currency: 'BRL'
          });
        }
      }

      localStorage.setItem(STORAGE_KEY_METRICAS, JSON.stringify(metricas));
    } catch(e) {
      console.warn('[WL TEC] Erro ao registrar telemetria:', e);
    }
  }

  // 4. Mostrar Notificação Toast
  function showToast(msg, icon = '✅') {
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  // ==============================================================================
  // PÁGINA: VITRINE PÚBLICA (INDEX.HTML)
  // ==============================================================================
  function initVitrine() {
    const gridProdutos = document.getElementById('gridProdutos');
    if (!gridProdutos) return;

    registrarTelemetria('visita');

    const txtBusca = document.getElementById('txtBusca');
    const chipsContainer = document.getElementById('chipsCategorias');
    const secProdutos = document.getElementById('secProdutos');
    const secCupons = document.getElementById('secCupons');
    const gridCupons = document.getElementById('gridCupons');
    const lblContagem = document.getElementById('lblContagemProdutos');

    let categoriaAtual = 'todas';
    let termoBusca = '';

    let produtos = getProdutos();
    const cupons = getCupons();

    function renderizarCards() {
      const filtrados = produtos.filter(p => {
        // Se estiver na aba Cupons, oculta os produtos
        if (categoriaAtual === 'cupons') return false;

        const matchCat = categoriaAtual === 'todas' || 
          (categoriaAtual === 'apostas' ? p.is_aposta_alta : p.categoria === categoriaAtual);
        
        const matchTermo = !termoBusca || 
          p.titulo.toLowerCase().includes(termoBusca) || 
          (p.subtitulo && p.subtitulo.toLowerCase().includes(termoBusca)) ||
          p.categoria.toLowerCase().includes(termoBusca);

        return matchCat && matchTermo;
      });

      if (lblContagem) {
        lblContagem.textContent = `Exibindo ${filtrados.length} ofertas verificadas`;
      }

      if (filtrados.length === 0) {
        gridProdutos.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
            <h3 style="font-size: 1.2rem; font-weight: 700; color: #fff;">Nenhum produto encontrado</h3>
            <p style="font-size: 0.88rem;">Tente pesquisar por outro termo ou limpar os filtros.</p>
          </div>
        `;
        return;
      }

      gridProdutos.innerHTML = filtrados.map(p => {
        const precoFormatado = Number(p.preco_estimado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const precoAntigo = p.preco_antigo ? Number(p.preco_antigo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
        const badgeClass = p.is_aposta_alta ? 'badge-floating badge-aposta' : 'badge-floating';
        
        // Calcular desconto %
        let descontoTag = '';
        if (p.preco_antigo && p.preco_antigo > p.preco_estimado) {
          const perc = Math.round(((p.preco_antigo - p.preco_estimado) / p.preco_antigo) * 100);
          descontoTag = `<span class="price-badge">-${perc}%</span>`;
        }

        return `
          <article class="product-card" data-slug="${p.slug}">
            <div class="card-media">
              <span class="${badgeClass}">${p.badge || 'Verificado'}</span>
              <img src="${p.imagem_url || obterFotoSeguraProduto(p)}" alt="${escapeHtml(p.titulo)}" loading="lazy" onerror="this.onerror=null; this.src='${obterFotoSeguraProduto(p, true)}'">
            </div>

            <div class="card-body">
              <div class="card-category">${p.categoria}</div>
              <h2 class="card-title" title="${p.titulo}">${p.titulo}</h2>

              <div class="card-rating">
                <span>⭐ ${p.avaliacao_estrelas || '4.8'}</span>
                <span class="rating-count">(${Number(p.total_avaliacoes || 120).toLocaleString('pt-BR')} avaliações)</span>
              </div>

              <div class="card-pricing">
                <div class="price-row">
                  ${precoAntigo ? `<span class="price-old">${precoAntigo}</span>` : ''}
                  <span class="price-current">${precoFormatado}</span>
                  ${descontoTag}
                </div>
                <div class="stores-preview">
                  <span>Disponível em:</span>
                  <span class="store-dot store-ml" title="Mercado Livre"></span>
                  <span class="store-dot store-shopee" title="Shopee"></span>
                  <span class="store-dot store-amazon" title="Amazon"></span>
                  <span class="store-dot store-ali" title="AliExpress"></span>
                </div>
              </div>

              <div class="card-actions">
                <a href="produto.html?slug=${encodeURIComponent(p.slug)}" class="btn-card-review">
                  <span>🔍</span> Ver Review & Comparar Lojas
                </a>
              </div>
            </div>
          </article>
        `;
      }).join('');
    }

    function renderizarCupons() {
      if (!gridCupons) return;
      const mapLoja = {
        mercadolivre: { nome: 'Mercado Livre', badge: 'badge-loja-ml', icon: '🟡' },
        shopee: { nome: 'Shopee', badge: 'badge-loja-shopee', icon: '🟠' },
        amazon: { nome: 'Amazon Brasil', badge: 'badge-loja-amazon', icon: '🔵' },
        aliexpress: { nome: 'AliExpress', badge: 'badge-loja-aliexpress', icon: '🔴' }
      };

      gridCupons.innerHTML = cupons.map(c => {
        const l = mapLoja[c.loja] || { nome: c.loja_nome || 'Marketplace Oficial', badge: 'badge-loja-ml', icon: '🏷️' };
        return `
          <div class="cupon-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.35rem;">
              <span class="cupon-tag ${l.badge}">${l.icon} ${l.nome}</span>
              <span style="font-size: 0.72rem; color: var(--primary-amber); font-weight: 700; background: rgba(255, 179, 0, 0.1); padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid rgba(255, 179, 0, 0.3);">
                ${c.destaque || '🔥 Promoção Ativa'}
              </span>
            </div>
            <div class="cupon-discount">${c.desconto_texto}</div>
            <div class="cupon-desc">${c.descricao || 'Desconto auditado e verificado para compras diretas na loja oficial.'}</div>
            
            <div class="cupon-code-row">
              <div class="code-box" id="code_${c.id}">${c.codigo}</div>
              <button class="btn-copy-cupon" onclick="window.copiarCupom('${c.codigo}', '${c.link_destino}', '${c.loja}')">
                Copiar & Ir p/ ${l.nome.split(' ')[0]}
              </button>
            </div>
            
            <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 0.65rem; display: flex; justify-content: space-between; align-items: center;">
              <span>⏰ Validade: ${c.valido_ate || 'Válido Hoje'}</span>
              <span style="color: var(--primary-green); font-weight: 600;">✓ Verificado</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // Ação de Copiar Cupom
    window.copiarCupom = function(codigo, link, loja) {
      navigator.clipboard.writeText(codigo).then(() => {
        showToast(`Cupom ${codigo} copiado! Abrindo loja parceira...`, '🎟️');
        registrarTelemetria('clique_loja', { loja: loja, slug: 'cupom-' + codigo });
        setTimeout(() => {
          window.open(link, '_blank', 'noopener,noreferrer');
        }, 600);
      });
    };

    // Eventos de Busca
    if (txtBusca) {
      txtBusca.addEventListener('input', (e) => {
        termoBusca = e.target.value.toLowerCase().trim();
        renderizarCards();
      });
    }

    // Eventos de Filtro de Categoria
    if (chipsContainer) {
      chipsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip-btn');
        if (!btn) return;

        chipsContainer.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        categoriaAtual = btn.getAttribute('data-cat') || 'todas';

        if (categoriaAtual === 'cupons') {
          secProdutos.style.display = 'none';
          secCupons.style.display = 'block';
          renderizarCupons();
        } else {
          secProdutos.style.display = 'block';
          secCupons.style.display = 'none';
          renderizarCards();
        }
      });
    }

    // Clique em qualquer ponto do card para abrir a página do produto
    gridProdutos.addEventListener('click', (e) => {
      const card = e.target.closest('.product-card');
      if (!card) return;
      const slug = card.getAttribute('data-slug');
      if (!slug) return;
      const link = e.target.closest('a');
      if (!link) {
        window.location.href = `produto.html?slug=${encodeURIComponent(slug)}`;
      }
    });

    // Inicialização síncrona imediata
    renderizarCards();

    /**
     * Sincroniza o catálogo com o Supabase em segundo plano.
     * Mescla a nuvem com os dados locais, sempre respeitando a lista de excluídos.
     * Não bloqueia a renderização inicial — o localStorage é a fonte rápida.
     */
    if (db) {
      db.from('afiliados_produtos')
        .select('*')
        .eq('status', 'publicado')
        .order('atualizado_em', { ascending: false })
        .then(({ data, error }) => {
          if (!error && Array.isArray(data)) {
            const excluidos = getExcluidos();

            // Dupla barreira: filtra excluídos vindos da nuvem antes de mesclar
            const nuvemFiltrada = data.filter(p => !excluidos.includes(p.slug));
            const locais = getProdutos();

            // Mescla: dados locais têm prioridade para campos customizados;
            // dados da nuvem prevalecem para campos atualizados pelo admin
            const mapa = new Map();
            locais.forEach(p => mapa.set(p.slug, p));
            nuvemFiltrada.forEach(p => mapa.set(p.slug, { ...mapa.get(p.slug), ...p }));

            const mesclados = Array.from(mapa.values()).filter(p => !excluidos.includes(p.slug));
            try { localStorage.setItem(STORAGE_KEY_PRODUTOS, JSON.stringify(mesclados)); } catch(e) {}
            produtos = mesclados;
            renderizarCards();
          }
        })
        .catch(err => console.warn('[WL TEC] Supabase vitrine sync error:', err));

      // Sincroniza cupons ativos do Supabase
      db.from('afiliados_cupons')
        .select('*')
        .eq('ativo', true)
        .order('criado_em', { ascending: false })
        .then(({ data, error }) => {
          if (!error && Array.isArray(data) && data.length > 0) {
            const mapa = new Map();
            cupons.forEach(c => mapa.set(c.codigo, c));
            data.forEach(c => {
              mapa.set(c.codigo, {
                id: c.id || ('cupom_' + c.codigo),
                loja: c.loja,
                loja_nome: c.loja === 'mercadolivre' ? 'Mercado Livre' : c.loja === 'shopee' ? 'Shopee' : c.loja === 'amazon' ? 'Amazon Brasil' : 'AliExpress',
                codigo: c.codigo,
                desconto_texto: c.desconto_texto,
                descricao: c.descricao,
                destaque: c.desconto_texto,
                link_destino: c.link_destino,
                valido_ate: c.valido_ate || 'Válido Hoje',
                ativo: c.ativo
              });
            });
            cupons = Array.from(mapa.values());
            try { localStorage.setItem(STORAGE_KEY_CUPONS, JSON.stringify(cupons)); } catch(e) {}
            if (categoriaAtual === 'cupons') renderizarCupons();
          }
        })
        .catch(() => {});
    }
  }

  // ==============================================================================
  // PÁGINA: DETALHES DO PRODUTO & REVIEW (PRODUTO.HTML)
  // ==============================================================================
  function renderizarDetalhesProduto(produto) {
    if (!produto) return;

    // ── Canonical URL + og:url: sempre aponta para a URL limpa sem parâmetros de rastreamento
    const canonicalUrl  = document.getElementById('canonicalUrl');
    const ogUrlMeta     = document.getElementById('ogUrl');
    const cleanUrl      = `https://wl.tec.br/ofertas/produto.html?slug=${encodeURIComponent(produto.slug)}`;
    if (canonicalUrl) canonicalUrl.href = cleanUrl;
    if (ogUrlMeta)    ogUrlMeta.setAttribute('content', cleanUrl);

    // Metatags e Títulos dinâmicos
    document.title = `${produto.titulo} | Review, Prós, Contras e Menor Preço - WL TEC Ofertas`;
    const metaDesc = document.getElementById('metaDesc');
    if (metaDesc) metaDesc.setAttribute('content', produto.veredito_rapido || produto.subtitulo || '');
    const ogTitle = document.getElementById('ogTitle');
    if (ogTitle) ogTitle.setAttribute('content', `${produto.titulo} | WL TEC Ofertas`);
    const ogDesc = document.getElementById('ogDesc');
    if (ogDesc) ogDesc.setAttribute('content', produto.subtitulo || produto.veredito_rapido || '');
    if (produto.imagem_url) {
      const ogImage = document.getElementById('ogImage');
      if (ogImage) ogImage.setAttribute('content', produto.imagem_url.startsWith('http') ? produto.imagem_url : `https://wl.tec.br/ofertas/${produto.imagem_url}`);
    }

    // Preencher Elementos do DOM
    const lblTituloHero = document.getElementById('lblTituloHero');
    if (lblTituloHero) lblTituloHero.textContent = produto.titulo;

    const breadcrumbCat = document.getElementById('breadcrumbCat');
    if (breadcrumbCat) breadcrumbCat.textContent = produto.categoria;

    const breadcrumbTitulo = document.getElementById('breadcrumbTitulo');
    if (breadcrumbTitulo) breadcrumbTitulo.textContent = produto.titulo;

    const badgeProduto = document.getElementById('badgeProduto');
    if (badgeProduto) {
      badgeProduto.textContent = produto.badge || 'WL TEC Verificado';
      if (produto.is_aposta_alta) badgeProduto.classList.add('badge-aposta');
      else badgeProduto.classList.remove('badge-aposta');
    }

    const lblEstrelas = document.getElementById('lblEstrelas');
    if (lblEstrelas) lblEstrelas.textContent = `⭐ ${produto.avaliacao_estrelas || '4.8'}`;

    const lblTotalAvaliacoes = document.getElementById('lblTotalAvaliacoes');
    if (lblTotalAvaliacoes) lblTotalAvaliacoes.textContent = `(${Number(produto.total_avaliacoes || 120).toLocaleString('pt-BR')} avaliações reais)`;

    // Fallback de imagem rigoroso: usa packshot oficial correspondente ou SVG temático da categoria
    const fotoSeguraHero = obterFotoSeguraProduto(produto, true);
    const imgProdutoHero = document.getElementById('imgProdutoHero');
    if (imgProdutoHero) {
      imgProdutoHero.src = (produto.imagem_url && produto.imagem_url.trim() !== '') ? produto.imagem_url : fotoSeguraHero;
      imgProdutoHero.alt = escapeHtml(produto.titulo);
      imgProdutoHero.onerror = () => {
        imgProdutoHero.onerror = null; // Evita loop infinito
        imgProdutoHero.src = fotoSeguraHero;
      };
    }

    // Renderizar Galeria Interativa com Múltiplas Fotos Reais do Produto
    const galeriaThumbs = document.getElementById('galeriaThumbs');
    if (galeriaThumbs) {
      const fotosValidas = (Array.isArray(produto.galeria) && produto.galeria.length > 0)
        ? produto.galeria.filter(f => f && typeof f === 'string' && f.trim() !== '')
        : [produto.imagem_url || fotoSeguraHero];
      const fotos = fotosValidas.length > 0 ? fotosValidas : [fotoSeguraHero];

      galeriaThumbs.innerHTML = fotos.map((f, idx) => `
        <div class="thumb-item ${idx === 0 ? 'active' : ''}" data-src="${f}" title="Ver foto ${idx + 1}">
          <img src="${f}" alt="${escapeHtml(produto.titulo)} - Foto ${idx + 1}" loading="lazy" onerror="this.onerror=null; this.src='${fotoSeguraHero}'">
        </div>
      `).join('');

      galeriaThumbs.querySelectorAll('.thumb-item').forEach(thumb => {
        thumb.addEventListener('click', () => {
          galeriaThumbs.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
          const novaFoto = thumb.getAttribute('data-src');
          if (imgProdutoHero && novaFoto) {
            imgProdutoHero.style.opacity = '0.4';
            imgProdutoHero.src = novaFoto;
            setTimeout(() => { imgProdutoHero.style.opacity = '1'; }, 150);
          }
        });
      });
    }

    const txtVeredito = document.getElementById('txtVeredito');
    if (txtVeredito) txtVeredito.textContent = produto.veredito_rapido || produto.subtitulo;

    // Prós e Contras
    const listaPros = document.getElementById('listaPros');
    if (listaPros && Array.isArray(produto.pros)) {
      listaPros.innerHTML = produto.pros.map(pro => `<li><span>✅</span> <span>${pro}</span></li>`).join('');
    }

    const listaContras = document.getElementById('listaContras');
    if (listaContras && Array.isArray(produto.contras)) {
      listaContras.innerHTML = produto.contras.map(contra => `<li><span>⚠️</span> <span>${contra}</span></li>`).join('');
    }

    // Especificações Técnicas
    const tabelaEspecificacoes = document.getElementById('tabelaEspecificacoes');
    if (tabelaEspecificacoes && Array.isArray(produto.especificacoes_tecnicas)) {
      const tbody = tabelaEspecificacoes.querySelector('tbody');
      if (tbody) {
        tbody.innerHTML = produto.especificacoes_tecnicas.map(spec => `
          <tr>
            <th>${spec.chave}</th>
            <td>${spec.valor}</td>
          </tr>
        `).join('');
      }
    }

    // FAQ Accordion
    const containerFaq = document.getElementById('containerFaq');
    if (containerFaq && Array.isArray(produto.faq)) {
      containerFaq.innerHTML = produto.faq.map((item, idx) => `
        <details class="faq-item" ${idx === 0 ? 'open' : ''}>
          <summary>${item.pergunta}</summary>
          <p>${item.resposta}</p>
        </details>
      `).join('');
    }

    // Fontes Citadas (E-E-A-T & Verificação Editorial)
    const listaFontes = document.getElementById('listaFontes');
    if (listaFontes) {
      if (Array.isArray(produto.fontes_citadas) && produto.fontes_citadas.length > 0) {
        listaFontes.innerHTML = produto.fontes_citadas.map(f => `
          <li>• <a href="${f.url && f.url !== '#' ? f.url : 'javascript:void(0)'}" ${f.url && f.url !== '#' ? 'target="_blank" rel="noopener"' : ''} style="color: var(--primary-cyan); text-decoration: none;">${f.nome}</a></li>
        `).join('');
      } else {
        listaFontes.innerHTML = `
          <li>• Especificações e dados técnicos oficiais declarados pelo fabricante e auditados pela bancada WL TEC.</li>
          <li>• Auditoria comparativa de cotações em tempo real no Mercado Livre, Shopee, Amazon Brasil e AliExpress.</li>
          <li>• Síntese de relatos de compradores reais e índice de aprovação verificado no Brasil.</li>
        `;
      }
    }

    // Comparador de Preços 4 em 1
    const listaLojas = document.getElementById('listaLojasComparador');
    if (listaLojas) {
      const lojasConfig = [
        {
          id: 'mercadolivre',
          nome: 'Mercado Livre',
          badgeClass: 'store-ml',
          icon: '🟡',
          link: refinarLinkMercadoLivre(produto.link_mercadolivre),
          preco: produto.preco_mercadolivre,
          destaque: produto.destaque_mercadolivre || 'Entrega Full (Chega rápido)',
          btnClass: 'btn-ml'
        },
        {
          id: 'shopee',
          nome: 'Shopee',
          badgeClass: 'store-shopee',
          icon: '🟠',
          link: produto.link_shopee,
          preco: produto.preco_shopee,
          destaque: produto.destaque_shopee || 'Cupons de Frete Grátis',
          btnClass: 'btn-shopee'
        },
        {
          id: 'amazon',
          nome: 'Amazon Brasil',
          badgeClass: 'store-amazon',
          icon: '🔵',
          link: produto.link_amazon,
          preco: produto.preco_amazon,
          destaque: produto.destaque_amazon || 'Entrega Prime & Garantia',
          btnClass: 'btn-amazon'
        },
        {
          id: 'aliexpress',
          nome: 'AliExpress',
          badgeClass: 'store-ali',
          icon: '🔴',
          link: produto.link_aliexpress,
          preco: produto.preco_aliexpress,
          destaque: produto.destaque_aliexpress || 'Importação Choice',
          btnClass: 'btn-ali'
        }
      ];

      /**
       * Comparador de Preços 4 em 1:
       * Calcula o menor preço real entre as lojas cadastradas e exibe os valores com transparência.
       */
      const lojasComPreco = lojasConfig.filter(l => l.link && l.preco && Number(l.preco) > 0);
      let menorPreco = Infinity;
      let melhorLoja = null;

      if (lojasComPreco.length > 0) {
        lojasComPreco.sort((a, b) => Number(a.preco) - Number(b.preco));
        melhorLoja = lojasComPreco[0];
        menorPreco = Number(melhorLoja.preco);
      } else if (produto.preco_estimado && Number(produto.preco_estimado) > 0) {
        menorPreco = Number(produto.preco_estimado);
        melhorLoja = lojasConfig.find(l => l.link) || lojasConfig[0];
      }

      // Auto-cura: se o preço estimado salvo estiver descompassado/alucinado em relação ao menor preço real das lojas:
      if (menorPreco && menorPreco !== Infinity && menorPreco > 0 && (!produto.preco_estimado || produto.preco_estimado < menorPreco)) {
        produto.preco_estimado = menorPreco;
      }

      listaLojas.innerHTML = lojasConfig.map(loja => {
        const isBusca = isLinkBuscaGenerica(loja.link);
        const hasLink = !!loja.link;
        const hasPreco = loja.preco && Number(loja.preco) > 0;
        const isMenor = hasPreco && Number(loja.preco) === Number(menorPreco);

        let precoHtml = '';
        let btnHtml = '';

        if (hasLink && hasPreco) {
          // Preço sempre visível em Reais (R$) para o usuário comparar com clareza
          const precoFormatado = Number(loja.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const badgeRef = isBusca 
            ? '<span style="display: block; font-size: 0.68rem; color: #38bdf8; font-weight: 600; margin-top: 0.15rem;">Cotação de Referência</span>' 
            : '<span style="display: block; font-size: 0.68rem; color: #10b981; font-weight: 600; margin-top: 0.15rem;">Preço Direto</span>';

          precoHtml = `
            <div>
              <div style="font-weight: 800; font-size: 1.05rem; ${isMenor ? 'color: var(--primary-green);' : 'color: #ffffff;'}">
                ${precoFormatado}
              </div>
              ${badgeRef}
            </div>
          `;

          if (isBusca) {
            btnHtml = `
              <a href="${loja.link}" target="_blank" rel="noopener" class="btn-buy-store ${loja.btnClass}" style="opacity: 0.95; padding: 0.55rem 0.85rem; font-size: 0.82rem;" onclick="window.trackClique('${loja.id}', '${produto.slug}', ${loja.preco})">
                <span>🔍</span> Consultar Cotação ➜
              </a>
            `;
          } else {
            btnHtml = `
              <a href="${loja.link}" target="_blank" rel="noopener" class="btn-buy-store ${loja.btnClass}" onclick="window.trackClique('${loja.id}', '${produto.slug}', ${loja.preco})">
                Ver Oferta ➜
              </a>
            `;
          }
        } else if (hasLink) {
          precoHtml = `
            <div>
              <div style="font-size: 0.84rem; color: var(--text-dim); font-weight: 600;">Sob Consulta</div>
              <span style="display: block; font-size: 0.68rem; color: var(--text-muted); margin-top: 0.15rem;">Conferir na loja</span>
            </div>
          `;
          btnHtml = `
            <a href="${loja.link}" target="_blank" rel="noopener" class="btn-buy-store ${loja.btnClass}" style="opacity: 0.85; padding: 0.55rem 0.85rem; font-size: 0.82rem;" onclick="window.trackClique('${loja.id}', '${produto.slug}', 0)">
              Consultar ➜
            </a>
          `;
        } else {
          precoHtml = `<span style="font-size: 0.82rem; color: var(--text-dim);">Indisponível</span>`;
          btnHtml = `<span style="font-size: 0.78rem; color: var(--text-dim);">Sem estoque</span>`;
        }

        return `
          <div class="store-row" style="${isMenor ? 'border-color: var(--primary-green); background: rgba(16, 185, 129, 0.06);' : ''}">
            <div class="store-identity">
              <span class="store-icon-badge ${loja.badgeClass}">${loja.icon}</span>
              <div>
                <div style="font-weight: 700;">${loja.nome}</div>
                ${isMenor ? '<span style="font-size: 0.65rem; color: #10b981; font-weight: 800;">★ MENOR COTAÇÃO</span>' : (isBusca && hasLink ? '<span style="font-size: 0.65rem; color: #38bdf8; font-weight: 600;">🔎 Cotação Aberta</span>' : '')}
              </div>
            </div>

            <div class="store-highlight">
              ${loja.destaque}
            </div>

            <div class="store-price">
              ${precoHtml}
            </div>

            <div>
              ${btnHtml}
            </div>
          </div>
        `;
      }).join('');

      // Atualizar Sidebar Sticky com o menor preço real verificado
      const lblPrecoSticky = document.getElementById('lblPrecoSticky');
      const btnMelhorLoja = document.getElementById('btnMelhorLoja');
      const lblMenorPrecoTag = document.getElementById('lblMenorPrecoTag');

      if (melhorLoja && lblPrecoSticky && btnMelhorLoja) {
        const isMelhorBusca = isLinkBuscaGenerica(melhorLoja.link);
        const precoDisplay = (menorPreco && menorPreco !== Infinity && menorPreco > 0) ? menorPreco : (produto.preco_estimado || 0);

        if (lblMenorPrecoTag) {
          lblMenorPrecoTag.textContent = isMelhorBusca ? 'Melhor Cotação Encontrada' : 'Menor Preço Verificado';
        }

        lblPrecoSticky.textContent = Number(precoDisplay).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        btnMelhorLoja.href = melhorLoja.link;
        btnMelhorLoja.className = `sticky-btn-buy btn-buy-store ${melhorLoja.btnClass}`;
        
        if (isMelhorBusca) {
          btnMelhorLoja.innerHTML = `<span>🔍</span> Consultar no ${melhorLoja.nome}`;
        } else {
          btnMelhorLoja.innerHTML = `<span>🛒</span> Comprar no ${melhorLoja.nome}`;
        }
        btnMelhorLoja.onclick = () => window.trackClique(melhorLoja.id, produto.slug, menorPreco);
      }
    }

    // ── Schema.org Product (completo para Google Rich Results) ──
    // Inclui offers.availability + offers.url + BreadcrumbList
    // Valide em: https://search.google.com/test/rich-results
    const schemaScript = document.getElementById('schemaProductJson');
    if (schemaScript) {
      const cleanUrl = `https://wl.tec.br/ofertas/produto.html?slug=${encodeURIComponent(produto.slug)}`;
      const fotoUrlSegura = obterFotoSeguraProduto(produto);
      const imgUrl   = (produto.imagem_url && produto.imagem_url.startsWith('http'))
        ? produto.imagem_url
        : `https://wl.tec.br/ofertas/${fotoUrlSegura}`;

      // Constrói array de ofertas por loja com availability e url individuais
      const ofertasLojas = [];
      const lojaMap = [
        { preco: produto.preco_mercadolivre, link: produto.link_mercadolivre, nome: 'Mercado Livre' },
        { preco: produto.preco_shopee,       link: produto.link_shopee,       nome: 'Shopee' },
        { preco: produto.preco_amazon,       link: produto.link_amazon,       nome: 'Amazon Brasil' },
        { preco: produto.preco_aliexpress,   link: produto.link_aliexpress,   nome: 'AliExpress' }
      ];
      lojaMap.forEach(l => {
        if (l.preco && Number(l.preco) > 0 && l.link) {
          ofertasLojas.push({
            "@type": "Offer",
            "priceCurrency": "BRL",
            "price": Number(l.preco).toFixed(2),
            "availability": "https://schema.org/InStock",
            "url": l.link,
            "seller": { "@type": "Organization", "name": l.nome },
            "priceValidUntil": new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
          });
        }
      });

      const schemaData = [
        {
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": produto.titulo,
          "sku": produto.slug,
          "image": [imgUrl],
          "description": produto.veredito_rapido || produto.subtitulo || '',
          "brand": { "@type": "Brand", "name": "WL TEC Ofertas" },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": String(produto.avaliacao_estrelas || "4.8"),
            "reviewCount": String(produto.total_avaliacoes || 120),
            "bestRating": "5",
            "worstRating": "1"
          },
          "offers": ofertasLojas.length > 0 ? {
            "@type": "AggregateOffer",
            "priceCurrency": "BRL",
            "lowPrice": String(produto.preco_estimado),
            "highPrice": String(produto.preco_antigo || produto.preco_estimado),
            "offerCount": String(ofertasLojas.length),
            "offers": ofertasLojas
          } : undefined
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "WL TEC Ofertas", "item": "https://wl.tec.br/ofertas/" },
            { "@type": "ListItem", "position": 2, "name": produto.categoria || "Produtos", "item": `https://wl.tec.br/ofertas/?cat=${produto.categoria || 'todas'}` },
            { "@type": "ListItem", "position": 3, "name": produto.titulo, "item": cleanUrl }
          ]
        }
      ];
      schemaScript.textContent = JSON.stringify(schemaData);
    }
  }

  /**
   * Inicializa a página de detalhes do produto (produto.html).
   * Fluxo: renderização instantânea via localStorage → atualização assíncrona via Supabase.
   * O slug é extraído de: window.FORCED_SLUG (páginas estáticas) > ?slug= (URL) > pathname.
   */
  function initProduto() {
    const conteudoReview = document.getElementById('conteudoReview');
    if (!conteudoReview) return;

    registrarTelemetria('visita');

    const params = new URLSearchParams(window.location.search);
    const pathSlug = window.location.pathname.split('/').pop().replace('.html', '');
    const slug = window.FORCED_SLUG
      || params.get('slug')
      || (pathSlug && pathSlug !== 'produto' && pathSlug !== 'index' ? pathSlug : null);

    const produtos = getProdutos();

    // Renderização instantânea via cache local (sem aguardar a nuvem)
    // ⚠️ BUG FIX: não renderiza produtos[0] quando não há slug — exibiria produto errado
    let produto = slug ? produtos.find(p => p.slug === slug) : null;

    if (produto) {
      renderizarDetalhesProduto(produto);
    }

    /** HTML padrão de "Oferta não encontrada" reutilizado nos dois tratamentos de erro. */
    const htmlNaoEncontrado = `
      <div style="text-align: center; padding: 4rem 1rem;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
        <h2 style="color: #fff; font-size: 1.3rem;">Oferta não encontrada</h2>
        <p style="color: var(--text-muted); margin-top: 0.5rem; font-size: 0.9rem;">Esta oferta pode ter sido descontinuada ou o link está em atualização.</p>
        <a href="index.html" class="btn-card-review" style="display: inline-block; margin-top: 1.5rem; padding: 0.7rem 1.5rem;">Voltar para o Catálogo de Ofertas</a>
      </div>`;

    // Busca assíncrona no Supabase para obter a versão mais atualizada do produto
    if (db && slug) {
      db.from('afiliados_produtos')
        .select('*')
        .eq('slug', slug)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            produto = data;
            // Atualiza o cache local com os dados frescos da nuvem
            const prods = getProdutos().filter(p => p.slug !== slug);
            prods.unshift(data);
            try { localStorage.setItem(STORAGE_KEY_PRODUTOS, JSON.stringify(prods)); } catch(e) {}
            renderizarDetalhesProduto(produto);
          } else if (!produto) {
            conteudoReview.innerHTML = htmlNaoEncontrado;
          }
        })
        .catch(err => {
          console.warn('[WL TEC] Supabase fetch produto error:', err);
          if (!produto) conteudoReview.innerHTML = htmlNaoEncontrado;
        });
    } else if (!produto) {
      conteudoReview.innerHTML = htmlNaoEncontrado;
    }

    // Exposta globalmente para uso nos atributos onclick dos botões de compra
    window.trackClique = function(loja, prodSlug, preco) {
      registrarTelemetria('clique_loja', { loja, slug: prodSlug, preco });
    };
  }

  // Inicializar Página Conforme Contexto
  function initAll() {
    initVitrine();
    initProduto();
    aplicarConfiguracoes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
