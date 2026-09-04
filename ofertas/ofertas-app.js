// ==============================================================================
// WL TEC OFERTAS - APLICAÇÃO PÚBLICA (VITRINE, BUSCA, CUPONS E TELEMETRIA)
// ==============================================================================

(function() {
  'use strict';

  // Chaves de Armazenamento Local
  const STORAGE_KEY_PRODUTOS = 'wltec_afiliados_produtos_v6';
  const STORAGE_KEY_CUPONS = 'wltec_afiliados_cupons_v1';
  const STORAGE_KEY_METRICAS = 'wltec_afiliados_metricas_v1';
  const STORAGE_KEY_CONFIG = 'wltec_afiliados_config_v1';
  const STORAGE_KEY_EXCLUIDOS = 'wltec_afiliados_excluidos_v1';

  // Supabase Client (Nuvem em Tempo Real - Zero Git Commit)
  const { createClient } = window.supabase || {};
  const db = (createClient && typeof createClient === 'function')
    ? createClient('https://giikoiqpnzgmhcqiuvhs.supabase.co', 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB')
    : null;

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

  // 1. Obter Produtos (Respeitando Exclusões Definidas pelo Administrador)
  function getProdutos() {
    const defaultProds = window.PRODUTOS_INICIAIS || [];
    const excluidos = getExcluidos();
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRODUTOS);
      if (saved) {
        let parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filtra produtos excluídos
          parsed = parsed.filter(p => !excluidos.includes(p.slug));
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Erro ao ler produtos do localStorage:", e);
    }
    
    // Fallback para os dados pré-carregados filtrados
    const base = defaultProds.filter(p => !excluidos.includes(p.slug));
    try {
      localStorage.setItem(STORAGE_KEY_PRODUTOS, JSON.stringify(base));
    } catch(e) {}
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

  // 3. Registrar Telemetria de Acesso ou Clique
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
        if (loja === 'shopee') metricas.cliques_loja_shopee++;
        if (loja === 'amazon') metricas.cliques_loja_amazon++;
        if (loja === 'aliexpress') metricas.cliques_loja_ali++;

        metricas.logs.unshift({
          data: new Date().toISOString(),
          loja: loja,
          slug: detalhes.slug || 'geral',
          preco: detalhes.preco || 0
        });
        if (metricas.logs.length > 50) metricas.logs.pop();

        // Envia evento de conversão para o Google Analytics 4
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
      console.warn("Erro ao registrar telemetria:", e);
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
              <img src="${p.imagem_url}" alt="${p.titulo}" loading="lazy">
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
      gridCupons.innerHTML = cupons.map(c => `
        <div class="cupon-card">
          <span class="cupon-tag">${c.destaque || c.loja_nome}</span>
          <div class="cupon-discount">${c.desconto_texto}</div>
          <div class="cupon-desc">${c.descricao}</div>
          
          <div class="cupon-code-row">
            <div class="code-box" id="code_${c.id}">${c.codigo}</div>
            <button class="btn-copy-cupon" onclick="window.copiarCupom('${c.codigo}', '${c.link_destino}', '${c.loja}')">
              Copiar & Abrir
            </button>
          </div>
          
          <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 0.65rem;">
            ⏰ Validade: ${c.valido_ate || 'Hoje'}
          </div>
        </div>
      `).join('');
    }

    // Ação de Copiar Cupom
    window.copiarCupom = function(codigo, link, loja) {
      navigator.clipboard.writeText(codigo).then(() => {
        showToast(`Cupom ${codigo} copiado! Abrindo a loja...`, '🎟️');
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

    // Sincronização em segundo plano com o Supabase (Nuvem em Tempo Real)
    if (db) {
      db.from('afiliados_produtos')
        .select('*')
        .eq('status', 'publicado')
        .order('atualizado_em', { ascending: false })
        .then(({ data, error }) => {
          if (!error && Array.isArray(data)) {
            const excluidos = getExcluidos();
            const nuvemFiltrada = data.filter(p => !excluidos.includes(p.slug));
            const locais = getProdutos();
            const mapa = new Map();
            locais.forEach(p => mapa.set(p.slug, p));
            nuvemFiltrada.forEach(p => mapa.set(p.slug, { ...mapa.get(p.slug), ...p }));

            const mesclados = Array.from(mapa.values()).filter(p => !excluidos.includes(p.slug));
            try { localStorage.setItem(STORAGE_KEY_PRODUTOS, JSON.stringify(mesclados)); } catch(e){}
            produtos = mesclados;
            renderizarCards();
          }
        })
        .catch(err => console.warn("Supabase vitrine sync:", err));
    }
  }

  // ==============================================================================
  // PÁGINA: DETALHES DO PRODUTO & REVIEW (PRODUTO.HTML)
  // ==============================================================================
  function renderizarDetalhesProduto(produto) {
    if (!produto) return;

    // Metatags e Títulos
    document.title = `${produto.titulo} | Review, Prós, Contras e Menor Preço - WL TEC Ofertas`;
    const metaDesc = document.getElementById('metaDesc');
    if (metaDesc) metaDesc.setAttribute('content', produto.veredito_rapido || produto.subtitulo || '');

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

    const imgProdutoHero = document.getElementById('imgProdutoHero');
    if (imgProdutoHero) {
      imgProdutoHero.src = produto.imagem_url;
      imgProdutoHero.alt = produto.titulo;
      imgProdutoHero.onerror = () => { imgProdutoHero.src = 'img/suporte_moto.jpg'; };
    }

    // Renderizar Galeria Interativa com Múltiplas Fotos Reais
    const galeriaThumbs = document.getElementById('galeriaThumbs');
    if (galeriaThumbs) {
      const fotos = (Array.isArray(produto.galeria) && produto.galeria.length > 0)
        ? produto.galeria 
        : [produto.imagem_url];

      galeriaThumbs.innerHTML = fotos.map((f, idx) => `
        <div class="thumb-item ${idx === 0 ? 'active' : ''}" data-src="${f}" title="Ver foto ${idx + 1}">
          <img src="${f}" alt="${produto.titulo} - Foto ${idx + 1}" loading="lazy" onerror="this.src='img/suporte_moto.jpg'">
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

    // Fontes Citadas (E-E-A-T)
    const listaFontes = document.getElementById('listaFontes');
    if (listaFontes && Array.isArray(produto.fontes_citadas)) {
      listaFontes.innerHTML = produto.fontes_citadas.map(f => `
        <li>• <a href="${f.url}" target="_blank" rel="noopener" style="color: var(--primary-cyan); text-decoration: none;">${f.nome}</a></li>
      `).join('');
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
          link: produto.link_mercadolivre,
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

      // Encontrar o menor preço para destacar
      let menorPreco = Infinity;
      let melhorLoja = null;

      lojasConfig.forEach(loja => {
        if (loja.preco && loja.preco < menorPreco) {
          menorPreco = loja.preco;
          melhorLoja = loja;
        }
      });

      listaLojas.innerHTML = lojasConfig.map(loja => {
        const hasPreco = loja.preco && Number(loja.preco) > 0 && loja.link;
        const precoStr = hasPreco 
          ? Number(loja.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
          : (loja.link ? '<span style="font-size: 0.82rem; color: var(--text-dim); font-weight: 500;">Ver no site</span>' : 'Indisponível');
        const isMenor = hasPreco && loja.preco === menorPreco;

        return `
          <div class="store-row" style="${isMenor ? 'border-color: var(--primary-green); background: rgba(16, 185, 129, 0.06);' : ''}">
            <div class="store-identity">
              <span class="store-icon-badge ${loja.badgeClass}">${loja.icon}</span>
              <div>
                <div>${loja.nome}</div>
                ${isMenor ? '<span style="font-size: 0.65rem; color: #10b981; font-weight: 800;">★ MENOR PREÇO</span>' : ''}
              </div>
            </div>

            <div class="store-highlight">
              ${loja.destaque}
            </div>

            <div class="store-price" style="${isMenor ? 'color: var(--primary-green);' : ''}">
              ${precoStr}
            </div>

            <div>
              ${hasPreco ? `
                <a href="${loja.link}" target="_blank" rel="noopener" class="btn-buy-store ${loja.btnClass}" onclick="window.trackClique('${loja.id}', '${produto.slug}', ${loja.preco})">
                  Ver Oferta ➜
                </a>
              ` : (loja.link ? `
                <a href="${loja.link}" target="_blank" rel="noopener" class="btn-buy-store ${loja.btnClass}" style="opacity: 0.85; filter: saturate(0.8);" onclick="window.trackClique('${loja.id}', '${produto.slug}', 0)">
                  Consultar ➜
                </a>
              ` : `
                <span style="font-size: 0.78rem; color: var(--text-dim);">Indisponível</span>
              `)}
            </div>
          </div>
        `;
      }).join('');

      // Atualizar Sidebar Sticky
      const lblPrecoSticky = document.getElementById('lblPrecoSticky');
      const btnMelhorLoja = document.getElementById('btnMelhorLoja');
      if (melhorLoja && lblPrecoSticky && btnMelhorLoja) {
        lblPrecoSticky.textContent = Number(menorPreco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        btnMelhorLoja.href = melhorLoja.link;
        btnMelhorLoja.className = `sticky-btn-buy btn-buy-store ${melhorLoja.btnClass}`;
        btnMelhorLoja.innerHTML = `<span>🛒</span> Comprar no ${melhorLoja.nome}`;
        btnMelhorLoja.onclick = () => window.trackClique(melhorLoja.id, produto.slug, menorPreco);
      }
    }

    // Injeção de Schema JSON-LD Dinâmico (SEO Rich Snippets)
    const schemaScript = document.getElementById('schemaProductJson');
    if (schemaScript) {
      const schemaData = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": produto.titulo,
        "image": [produto.imagem_url],
        "description": produto.veredito_rapido || produto.subtitulo,
        "brand": {
          "@type": "Brand",
          "name": "WL TEC Ofertas"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": produto.avaliacao_estrelas || "4.8",
          "reviewCount": produto.total_avaliacoes || 120
        },
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "BRL",
          "lowPrice": produto.preco_estimado,
          "highPrice": produto.preco_antigo || produto.preco_estimado * 1.3,
          "offerCount": "4"
        }
      };
      schemaScript.textContent = JSON.stringify(schemaData);
    }
  }

  function initProduto() {
    const conteudoReview = document.getElementById('conteudoReview');
    if (!conteudoReview) return;

    registrarTelemetria('visita');

    const params = new URLSearchParams(window.location.search);
    const pathSlug = window.location.pathname.split('/').pop().replace('.html', '');
    const slug = window.FORCED_SLUG || params.get('slug') || (pathSlug && pathSlug !== 'produto' && pathSlug !== 'index' ? pathSlug : null);
    const produtos = getProdutos();

    // Encontrar produto no cache local inicialmente para renderização instantânea
    let produto = slug ? produtos.find(p => p.slug === slug) : (produtos[0] || null);

    if (produto) {
      renderizarDetalhesProduto(produto);
    }

    // Sincronização e Busca Direta na Nuvem Supabase (Zero Git Commit)
    if (db && slug) {
      db.from('afiliados_produtos')
        .select('*')
        .eq('slug', slug)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            produto = data;
            const prods = getProdutos().filter(p => p.slug !== slug);
            prods.unshift(data);
            try { localStorage.setItem(STORAGE_KEY_PRODUTOS, JSON.stringify(prods)); } catch(e){}
            renderizarDetalhesProduto(produto);
          } else if (!produto) {
            conteudoReview.innerHTML = `
              <div style="text-align: center; padding: 4rem 1rem;">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
                <h2 style="color: #fff; font-size: 1.3rem;">Oferta não encontrada</h2>
                <p style="color: var(--text-muted); margin-top: 0.5rem; font-size: 0.9rem;">Esta oferta pode ter sido descontinuada ou o link está em atualização.</p>
                <a href="index.html" class="btn-card-review" style="display: inline-block; margin-top: 1.5rem; padding: 0.7rem 1.5rem;">Voltar para o Catálogo de Ofertas</a>
              </div>
            `;
          }
        })
        .catch(err => {
          console.warn("Supabase fetch produto erro:", err);
          if (!produto) {
            conteudoReview.innerHTML = `
              <div style="text-align: center; padding: 4rem 1rem;">
                <h2>Oferta não encontrada</h2>
                <a href="index.html" class="btn-card-review" style="display: inline-block; margin-top: 1rem;">Voltar para as Ofertas</a>
              </div>
            `;
          }
        });
    } else if (!produto) {
      conteudoReview.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem;">
          <h2>Oferta não encontrada</h2>
          <a href="index.html" class="btn-card-review" style="display: inline-block; margin-top: 1rem;">Voltar para as Ofertas</a>
        </div>
      `;
    }

    // Telemetria de Clique Global
    window.trackClique = function(loja, prodSlug, preco) {
      registrarTelemetria('clique_loja', { loja: loja, slug: prodSlug, preco: preco });
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
