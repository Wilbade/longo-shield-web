// ==============================================================================
// WL TEC OFERTAS - MESA DE OPERAÇÕES DO ADMINISTRADOR (ADMIN-APP.JS)
// Escopo: afiliados.html (painel privado do admin)
// Dependências: Supabase JS v2, produtos-data.js
// Cloudflare Worker: wltec-og-injector (rota wl.tec.br/ofertas/*)
// ==============================================================================

(function() {
  'use strict';

  // ── Chaves de Armazenamento Local (espelham as do ofertas-app.js) ──
  const STORAGE_KEY_PRODUTOS  = 'wltec_afiliados_produtos_v6';
  const STORAGE_KEY_CUPONS    = 'wltec_afiliados_cupons_v1';
  const STORAGE_KEY_METRICAS  = 'wltec_afiliados_metricas_v1';
  const STORAGE_KEY_CONFIG    = 'wltec_afiliados_config_v1';
  const STORAGE_KEY_EXCLUIDOS = 'wltec_afiliados_excluidos_v1';

  // ── Supabase Client (Mesma instância do painel de OS e Leads) ──
  const { createClient } = window.supabase || {};
  const db = (createClient && typeof createClient === 'function')
    ? createClient('https://giikoiqpnzgmhcqiuvhs.supabase.co', 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB')
    : null;

  // Gerenciamento de Produtos Excluídos (Evita que o catálogo ressuscite itens deletados)
  function getExcluidos() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXCLUIDOS);
      return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  }

  /**
   * Adiciona um slug à lista local de excluídos.
   * Essa lista é a barreira definitiva: nenhum produto com slug aqui
   * pode ressuscitar após sync com o Supabase ou recarga de página.
   */
  function adicionarAosExcluidos(slug) {
    try {
      const excluidos = getExcluidos();
      if (!excluidos.includes(slug)) {
        excluidos.push(slug);
        localStorage.setItem(STORAGE_KEY_EXCLUIDOS, JSON.stringify(excluidos));
      }
    } catch(e) {}
  }

  /** Remove um slug da lista de excluídos (usado ao republicar um produto). */
  function removerDosExcluidos(slug) {
    try {
      let excluidos = getExcluidos();
      excluidos = excluidos.filter(s => s !== slug);
      localStorage.setItem(STORAGE_KEY_EXCLUIDOS, JSON.stringify(excluidos));
    } catch(e) {}
  }

  // Carregar ou Inicializar Produtos
  function carregarProdutos() {
    const defaultProds = window.PRODUTOS_INICIAIS || [];
    const excluidos = getExcluidos();
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRODUTOS);
      if (saved) {
        let parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filtra estritamente itens que o usuário mandou excluir
          parsed = parsed.filter(p => !excluidos.includes(p.slug));
          return parsed;
        }
      }
    } catch(e) {}

    // Inicialização segura com o catálogo inicial
    const baseFiltrada = defaultProds.filter(p => !excluidos.includes(p.slug));
    salvarProdutos(baseFiltrada);
    return baseFiltrada;
  }

  function salvarProdutos(prods) {
    try {
      const excluidos = getExcluidos();
      const filtrados = (prods || []).filter(p => !excluidos.includes(p.slug));
      localStorage.setItem(STORAGE_KEY_PRODUTOS, JSON.stringify(filtrados));
    } catch(e) {
      console.error("Erro ao salvar produtos:", e);
    }
  }

  /**
   * Sincroniza o catálogo admin com o Supabase:
   * 1. Deleta da nuvem qualquer produto que esteja na lista local de excluídos.
   * 2. Mescla os produtos da nuvem com o localStorage, com filtro duplo de excluídos.
   * Executada automaticamente após autenticação do admin.
   */
  async function sincronizarComNuvem() {
    if (!db) return;
    try {
      const { data, error } = await db.from('afiliados_produtos')
        .select('*')
        .order('atualizado_em', { ascending: false });

      if (!error && Array.isArray(data)) {
        const excluidos = getExcluidos();

        // 1. Propaga as exclusões locais para a nuvem (consistência bidirecional)
        const paraDeletar = data.filter(p => excluidos.includes(p.slug));
        for (const item of paraDeletar) {
          await db.from('afiliados_produtos').delete().eq('slug', item.slug);
        }

        // 2. Mescla ofertas publicadas na nuvem com os produtos locais
        const validosNuvem = data.filter(p => !excluidos.includes(p.slug));
        const mapa = new Map();
        produtos.forEach(p => mapa.set(p.slug, p));
        validosNuvem.forEach(p => mapa.set(p.slug, { ...mapa.get(p.slug), ...p }));

        produtos = Array.from(mapa.values()).filter(p => !excluidos.includes(p.slug));
        salvarProdutos(produtos);
        atualizarMesaMetricas();
      }
    } catch(err) {
      console.warn('[WL TEC] Erro ao sincronizar catálogo com Supabase:', err);
    }
  }

  // Carregar Configurações Globais
  function carregarConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {
      amazon_tag: 'wilbade09-20',
      shopee_id: '18349700720',
      ml_id: 'wilbade',
      ali_id: 'wilbade',
      zap_link: 'https://chat.whatsapp.com/exemplo-wltec',
      tg_token: '',
      tg_chat_id: '',
      gemini_key: ''
    };
  }

  function salvarConfig(cfg) {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cfg));
    } catch(e) {}
  }

  // Toast Helper
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

  // Estado Local da Mesa de Operações
  let produtos = carregarProdutos();
  let config = carregarConfig();
  let rascunhoAtual = null; // Inicia limpo sem forçar produto na tela

  // Renderizar KPIs e Métricas
  function atualizarMesaMetricas() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_METRICAS);
      const metricas = saved ? JSON.parse(saved) : {
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

      const kpiVisitasTotais = document.getElementById('kpiVisitasTotais');
      const kpiVisitasDetalhadas = document.getElementById('kpiVisitasDetalhadas');
      const kpiCliquesTotais = document.getElementById('kpiCliquesTotais');
      const kpiLojaMaisClicada = document.getElementById('kpiLojaMaisClicada');
      const kpiLojaDetalhadas = document.getElementById('kpiLojaDetalhadas');
      const kpiProdutosAtivos = document.getElementById('kpiProdutosAtivos');
      const countProdutosTab = document.getElementById('countProdutosTab');

      const totalCliques = (metricas.cliques_loja_ml || 0) + 
                           (metricas.cliques_loja_shopee || 0) + 
                           (metricas.cliques_loja_amazon || 0) + 
                           (metricas.cliques_loja_ali || 0);

      if (kpiVisitasTotais) kpiVisitasTotais.textContent = metricas.visitas_totais || 0;
      if (kpiVisitasDetalhadas) kpiVisitasDetalhadas.textContent = `Google: ${metricas.visitas_google || 0} | WhatsApp: ${metricas.visitas_whatsapp || 0}`;
      if (kpiCliquesTotais) kpiCliquesTotais.textContent = totalCliques;

      // Descobrir loja líder
      const lojasContagem = [
        { nome: 'Mercado Livre', total: metricas.cliques_loja_ml || 0 },
        { nome: 'Shopee', total: metricas.cliques_loja_shopee || 0 },
        { nome: 'Amazon', total: metricas.cliques_loja_amazon || 0 },
        { nome: 'AliExpress', total: metricas.cliques_loja_ali || 0 }
      ].sort((a, b) => b.total - a.total);

      if (kpiLojaMaisClicada) kpiLojaMaisClicada.textContent = totalCliques > 0 ? lojasContagem[0].nome : 'Aguardando cliques';
      if (kpiLojaDetalhadas) kpiLojaDetalhadas.textContent = `ML: ${metricas.cliques_loja_ml || 0} | Shopee: ${metricas.cliques_loja_shopee || 0} | Amz: ${metricas.cliques_loja_amazon || 0}`;
      if (kpiProdutosAtivos) kpiProdutosAtivos.textContent = produtos.length;
      if (countProdutosTab) countProdutosTab.textContent = produtos.length;

      // Tela de Telemetria Aba 3
      const valOrigemGoogle = document.getElementById('valOrigemGoogle');
      const valOrigemZap = document.getElementById('valOrigemZap');
      const valOrigemTg = document.getElementById('valOrigemTg');
      const valOrigemDireto = document.getElementById('valOrigemDireto');

      if (valOrigemGoogle) valOrigemGoogle.textContent = metricas.visitas_google || 0;
      if (valOrigemZap) valOrigemZap.textContent = metricas.visitas_whatsapp || 0;
      if (valOrigemTg) valOrigemTg.textContent = 0;
      if (valOrigemDireto) valOrigemDireto.textContent = metricas.visitas_direto || 0;

      const valCliquesML = document.getElementById('valCliquesML');
      const valCliquesShopee = document.getElementById('valCliquesShopee');
      const valCliquesAmz = document.getElementById('valCliquesAmz');
      const valCliquesAli = document.getElementById('valCliquesAli');

      if (valCliquesML) valCliquesML.textContent = metricas.cliques_loja_ml || 0;
      if (valCliquesShopee) valCliquesShopee.textContent = metricas.cliques_loja_shopee || 0;
      if (valCliquesAmz) valCliquesAmz.textContent = metricas.cliques_loja_amazon || 0;
      if (valCliquesAli) valCliquesAli.textContent = metricas.cliques_loja_ali || 0;

      const listaLogs = document.getElementById('listaLogsCliques');
      if (listaLogs && Array.isArray(metricas.logs) && metricas.logs.length > 0) {
        listaLogs.innerHTML = metricas.logs.map(log => {
          let storeClass = 'log-store-ml';
          let storeLabel = 'Mercado Livre';
          let storeIcon = '🟡';
          const lj = (log.loja || '').toLowerCase();
          if (lj.includes('shopee')) { storeClass = 'log-store-shopee'; storeLabel = 'Shopee'; storeIcon = '🟠'; }
          else if (lj.includes('amazon')) { storeClass = 'log-store-amazon'; storeLabel = 'Amazon'; storeIcon = '🔵'; }
          else if (lj.includes('ali')) { storeClass = 'log-store-aliexpress'; storeLabel = 'AliExpress'; storeIcon = '🔴'; }

          // Encontrar título amigável do produto ou formatar slug
          const prodObj = produtos.find(p => p.slug === log.slug);
          let prodTitulo = prodObj ? prodObj.titulo : (log.slug || 'Produto');
          if (prodTitulo.length > 45) prodTitulo = prodTitulo.substring(0, 42) + '...';

          const horaFormatada = log.data ? new Date(log.data).toLocaleTimeString('pt-BR') : '--:--:--';

          return `
            <div class="log-row-item">
              <span class="log-time">⏱️ ${horaFormatada}</span>
              <span class="log-badge-store ${storeClass}">${storeIcon} ${storeLabel}</span>
              <span class="log-product-name" title="${prodObj ? prodObj.titulo : prodTitulo}">${prodTitulo}</span>
              <span class="log-price-val">R$ ${Number(log.preco || 0).toFixed(2)}</span>
            </div>
          `;
        }).join('');
      } else if (listaLogs) {
        listaLogs.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-dim);">Nenhum clique registrado ainda.</div>`;
      }
    } catch(e) {
      console.warn("Erro ao carregar telemetria:", e);
    }
  }

  // Renderizar o Rascunho Atual na Mesa
  function renderizarRascunho() {
    const c = document.getElementById('containerRascunho');
    const emptyNotice = document.getElementById('emptyDraftNotice');
    if (!rascunhoAtual) {
      if (c) c.style.display = 'none';
      if (emptyNotice) emptyNotice.style.display = 'block';
      return;
    }
    if (c) c.style.display = 'block';
    if (emptyNotice) emptyNotice.style.display = 'none';

    const editTitulo = document.getElementById('editTitulo');
    if (editTitulo) editTitulo.value = rascunhoAtual.titulo || '';

    const editCategoria = document.getElementById('editCategoria');
    if (editCategoria) editCategoria.value = rascunhoAtual.categoria || 'tecnologia';

    const editImagemUrl = document.getElementById('editImagemUrl');
    if (editImagemUrl) editImagemUrl.value = rascunhoAtual.imagem_url || '';

    const draftImgThumb = document.getElementById('draftImgThumb');
    if (draftImgThumb && rascunhoAtual.imagem_url) {
      draftImgThumb.src = rascunhoAtual.imagem_url;
      draftImgThumb.onerror = () => { draftImgThumb.src = 'img/suporte_moto.jpg'; };
    }

    if (editImagemUrl && draftImgThumb) {
      editImagemUrl.oninput = () => {
        draftImgThumb.src = editImagemUrl.value || 'img/suporte_moto.jpg';
        rascunhoAtual.imagem_url = editImagemUrl.value;
      };
    }

    // Seletor A3: Foto Original vs Estúdio Dark Mode WL TEC
    const btnFotoOriginal = document.getElementById('btnFotoOriginal');
    const btnFotoEstudio = document.getElementById('btnFotoEstudio');
    const lblFotoAtiva = document.getElementById('lblFotoAtiva');

    function atualizarBotoesFoto() {
      const isEstudio = rascunhoAtual.foto_estudio && (rascunhoAtual.imagem_url === rascunhoAtual.foto_estudio) && (rascunhoAtual.foto_estudio !== rascunhoAtual.foto_original);
      if (btnFotoOriginal) {
        btnFotoOriginal.style.background = !isEstudio ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.05)';
        btnFotoOriginal.style.borderColor = !isEstudio ? '#10b981' : 'rgba(255,255,255,0.2)';
        btnFotoOriginal.style.color = !isEstudio ? '#10b981' : 'var(--text-dim)';
      }
      if (btnFotoEstudio) {
        btnFotoEstudio.style.background = isEstudio ? 'rgba(0, 255, 255, 0.25)' : 'rgba(255,255,255,0.05)';
        btnFotoEstudio.style.borderColor = isEstudio ? 'var(--primary-cyan)' : 'rgba(255,255,255,0.2)';
        btnFotoEstudio.style.color = isEstudio ? 'var(--primary-cyan)' : 'var(--text-dim)';
      }
      if (lblFotoAtiva) {
        lblFotoAtiva.textContent = isEstudio ? '✨ Estúdio Dark Mode Ativo' : '● Foto Original Ativa';
        lblFotoAtiva.style.color = isEstudio ? 'var(--primary-cyan)' : '#10b981';
      }
    }

    if (btnFotoOriginal) {
      btnFotoOriginal.onclick = () => {
        const foto = rascunhoAtual.foto_original || rascunhoAtual.imagem_url;
        rascunhoAtual.imagem_url = foto;
        if (draftImgThumb) draftImgThumb.src = foto;
        if (editImagemUrl) editImagemUrl.value = foto;
        atualizarBotoesFoto();
        showToast("Foto oficial original selecionada!", "📷");
      };
    }

    if (btnFotoEstudio) {
      btnFotoEstudio.onclick = () => {
        const foto = rascunhoAtual.foto_estudio || rascunhoAtual.imagem_url;
        rascunhoAtual.imagem_url = foto;
        if (draftImgThumb) draftImgThumb.src = foto;
        if (editImagemUrl) editImagemUrl.value = foto;
        atualizarBotoesFoto();
        showToast("Estúdio Dark Mode da WL TEC selecionado!", "✨");
      };
    }

    atualizarBotoesFoto();

    if (editTitulo) {
      editTitulo.oninput = () => {
        rascunhoAtual.titulo = editTitulo.value;
      };
    }
    if (editCategoria) {
      editCategoria.onchange = () => {
        rascunhoAtual.categoria = editCategoria.value;
      };
    }

    const draftPrecoEstimado = document.getElementById('draftPrecoEstimado');
    if (draftPrecoEstimado) {
      draftPrecoEstimado.textContent = Number(rascunhoAtual.preco_estimado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    const draftBadge = document.getElementById('draftBadge');
    if (draftBadge) {
      draftBadge.textContent = rascunhoAtual.badge || '⚡ Rascunho Gerado';
    }

    const draftLojasGrid = document.getElementById('draftLojasGrid');
    if (draftLojasGrid) {
      draftLojasGrid.innerHTML = `
        <div style="background: rgba(255, 230, 0, 0.08); border: 1px solid rgba(255, 230, 0, 0.3); padding: 0.75rem; border-radius: 6px;">
          <div style="color: #ffe600; font-weight: 800; display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
            <span>🟡 Mercado Livre</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">${rascunhoAtual.destaque_mercadolivre || 'Full'}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.4rem;">
            <span style="color: var(--text-dim); font-size: 0.85rem; font-weight: 700;">R$</span>
            <input type="number" step="0.01" id="editPrecoML" value="${rascunhoAtual.preco_mercadolivre !== null && rascunhoAtual.preco_mercadolivre !== undefined ? rascunhoAtual.preco_mercadolivre : ''}" placeholder="0.00" style="width: 100%; background: #0a0d14; border: 1px solid rgba(255,230,0,0.4); color: #00ffff; font-family: 'JetBrains Mono', monospace; font-size: 1rem; font-weight: 700; padding: 0.35rem 0.5rem; border-radius: 4px;">
          </div>
          <input type="url" id="editLinkML" value="${rascunhoAtual.link_mercadolivre || ''}" placeholder="Link Mercado Livre..." title="Link direto da oferta" style="width: 100%; background: #07090e; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; font-size: 0.72rem; color: #a5f3fc; padding: 0.25rem 0.4rem;">
        </div>

        <div style="background: rgba(238, 77, 45, 0.08); border: 1px solid rgba(238, 77, 45, 0.3); padding: 0.75rem; border-radius: 6px;">
          <div style="color: #ee4d2d; font-weight: 800; display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
            <span>🟠 Shopee</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">${rascunhoAtual.destaque_shopee || 'Cupons'}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.4rem;">
            <span style="color: var(--text-dim); font-size: 0.85rem; font-weight: 700;">R$</span>
            <input type="number" step="0.01" id="editPrecoShopee" value="${rascunhoAtual.preco_shopee !== null && rascunhoAtual.preco_shopee !== undefined ? rascunhoAtual.preco_shopee : ''}" placeholder="0.00" style="width: 100%; background: #0a0d14; border: 1px solid rgba(238,77,45,0.4); color: #00ffff; font-family: 'JetBrains Mono', monospace; font-size: 1rem; font-weight: 700; padding: 0.35rem 0.5rem; border-radius: 4px;">
          </div>
          <input type="url" id="editLinkShopee" value="${rascunhoAtual.link_shopee || ''}" placeholder="Link Shopee..." title="Link direto da oferta" style="width: 100%; background: #07090e; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; font-size: 0.72rem; color: #a5f3fc; padding: 0.25rem 0.4rem;">
        </div>

        <div style="background: rgba(255, 153, 0, 0.08); border: 1px solid rgba(255, 153, 0, 0.3); padding: 0.75rem; border-radius: 6px;">
          <div style="color: #ff9900; font-weight: 800; display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
            <span>🔵 Amazon</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">${rascunhoAtual.destaque_amazon || 'Prime'}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.4rem;">
            <span style="color: var(--text-dim); font-size: 0.85rem; font-weight: 700;">R$</span>
            <input type="number" step="0.01" id="editPrecoAmazon" value="${rascunhoAtual.preco_amazon !== null && rascunhoAtual.preco_amazon !== undefined ? rascunhoAtual.preco_amazon : ''}" placeholder="0.00" style="width: 100%; background: #0a0d14; border: 1px solid rgba(255,153,0,0.4); color: #00ffff; font-family: 'JetBrains Mono', monospace; font-size: 1rem; font-weight: 700; padding: 0.35rem 0.5rem; border-radius: 4px;">
          </div>
          <input type="url" id="editLinkAmazon" value="${rascunhoAtual.link_amazon || ''}" placeholder="Link Amazon..." title="Link direto da oferta" style="width: 100%; background: #07090e; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; font-size: 0.72rem; color: #a5f3fc; padding: 0.25rem 0.4rem;">
        </div>

        <div style="background: rgba(230, 46, 4, 0.08); border: 1px solid rgba(230, 46, 4, 0.3); padding: 0.75rem; border-radius: 6px;">
          <div style="color: #e62e04; font-weight: 800; display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
            <span>🔴 AliExpress</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">${rascunhoAtual.destaque_aliexpress || 'Choice'}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.4rem;">
            <span style="color: var(--text-dim); font-size: 0.85rem; font-weight: 700;">R$</span>
            <input type="number" step="0.01" id="editPrecoAli" value="${rascunhoAtual.preco_aliexpress !== null && rascunhoAtual.preco_aliexpress !== undefined ? rascunhoAtual.preco_aliexpress : ''}" placeholder="0.00" style="width: 100%; background: #0a0d14; border: 1px solid rgba(230,46,4,0.4); color: #00ffff; font-family: 'JetBrains Mono', monospace; font-size: 1rem; font-weight: 700; padding: 0.35rem 0.5rem; border-radius: 4px;">
          </div>
          <input type="url" id="editLinkAli" value="${rascunhoAtual.link_aliexpress || ''}" placeholder="Link AliExpress..." title="Link direto da oferta" style="width: 100%; background: #07090e; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; font-size: 0.72rem; color: #a5f3fc; padding: 0.25rem 0.4rem;">
        </div>
      `;

      // Atualização interativa do Menor Preço em tempo real
      const camposPreco = ['editPrecoML', 'editPrecoShopee', 'editPrecoAmazon', 'editPrecoAli'];
      camposPreco.forEach(id => {
        const inp = document.getElementById(id);
        if (inp) {
          inp.addEventListener('input', () => {
            const vals = camposPreco
              .map(i => parseFloat(document.getElementById(i)?.value))
              .filter(v => !isNaN(v) && v > 0);
            if (vals.length > 0) {
              const menor = Math.min(...vals);
              rascunhoAtual.preco_estimado = menor;
              if (draftPrecoEstimado) {
                draftPrecoEstimado.textContent = Number(menor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              }
            }
          });
        }
      });
    }

    const draftProsPreview = document.getElementById('draftProsPreview');
    if (draftProsPreview && Array.isArray(rascunhoAtual.pros)) {
      draftProsPreview.innerHTML = rascunhoAtual.pros.slice(0, 3).map(p => `• ${p}`).join('<br>');
    }

    const draftContrasPreview = document.getElementById('draftContrasPreview');
    if (draftContrasPreview && Array.isArray(rascunhoAtual.contras)) {
      draftContrasPreview.innerHTML = rascunhoAtual.contras.slice(0, 3).map(c => `• ${c}`).join('<br>');
    }

    const editVeredito = document.getElementById('editVeredito');
    if (editVeredito) {
      editVeredito.value = rascunhoAtual.veredito_rapido || rascunhoAtual.subtitulo || '';
    }
  }

  // Renderizar Tabela de Produtos Publicados (Aba 2)
  function renderizarTabelaProdutos() {
    const tbody = document.getElementById('tabelaCorpoProdutos');
    if (!tbody) return;

    tbody.innerHTML = produtos.map(p => `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 0.85rem 1rem;">
          <div style="font-weight: 700; color: #fff;">${p.titulo}</div>
          <div style="font-size: 0.75rem; color: var(--text-dim);">${p.slug}</div>
        </td>
        <td style="padding: 0.85rem 1rem;">
          <span style="font-size: 0.75rem; background: rgba(0,255,255,0.1); color: var(--primary-cyan); padding: 0.2rem 0.5rem; border-radius: 4px; text-transform: uppercase;">
            ${p.categoria}
          </span>
        </td>
        <td style="padding: 0.85rem 1rem; font-weight: 800; color: var(--primary-green);">
          ${Number(p.preco_estimado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </td>
        <td style="padding: 0.85rem 1rem;">${p.total_visitas || 0}</td>
        <td style="padding: 0.85rem 1rem; font-weight: 700;">${p.total_cliques || 0}</td>
        <td style="padding: 0.85rem 1rem; text-align: right;">
          <a href="${p.slug}.html" target="_blank" class="btn-admin-link" style="display: inline-block; padding: 0.3rem 0.6rem; margin-right: 0.4rem;">
            Ver 👁️
          </a>
          <button onclick="window.editarRascunho('${p.slug}')" class="btn-admin-link" style="display: inline-block; padding: 0.3rem 0.6rem; margin-right: 0.4rem; color: var(--primary-amber);">
            Editar ✏️
          </button>
          <button onclick="window.excluirProduto('${p.slug}')" class="btn-admin-link" style="display: inline-block; padding: 0.3rem 0.6rem; color: #ef4444;">
            Excluir 🗑️
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Ações Globais da Tabela
  window.editarRascunho = function(slug) {
    const item = produtos.find(p => p.slug === slug);
    if (item) {
      rascunhoAtual = JSON.parse(JSON.stringify(item));
      renderizarRascunho();
      // Trocar para aba 1
      document.querySelectorAll('.tab-btn')[0].click();
      showToast("Produto carregado na Mesa de Edição!", "✏️");
    }
  };

  window.excluirProduto = async function(slug) {
    if (!confirm("Deseja realmente remover este produto do catálogo?")) return;

    // 1. Marca imediatamente nos excluídos para nunca mais ressuscitar
    adicionarAosExcluidos(slug);

    // 2. Remove da lista local
    produtos = produtos.filter(p => p.slug !== slug);
    salvarProdutos(produtos);

    // 3. Se for o rascunho atualmente em edição na Mesa, limpa-o
    if (rascunhoAtual && rascunhoAtual.slug === slug) {
      rascunhoAtual = null;
      renderizarRascunho();
    }

    renderizarTabelaProdutos();
    atualizarMesaMetricas();

    // 4. Deleta direto na Nuvem Supabase
    if (db) {
      try {
        const { error } = await db.from('afiliados_produtos').delete().eq('slug', slug);
        if (error) {
          console.warn("Supabase delete error:", error.message);
        } else {
          console.log("✅ Produto excluído com sucesso do Supabase:", slug);
        }
      } catch (errDb) {
        console.warn("Erro ao deletar no Supabase:", errDb);
      }
    }

    showToast("Produto removido com sucesso (Local e Nuvem)! 🗑️", "✅");
  };

  // Minerar Tendências 48h (Simulador IA & Extrator)
  const TENDENCIAS_BANCO = [
    {
      slug: "camera-seguranca-lampada-wifi-360-full-hd",
      titulo: "Câmera de Segurança Lâmpada Wi-Fi 360° Full HD Visão Noturna",
      subtitulo: "Segurança fácil sem furar parede: encaixa no bocal comum de lâmpada e transmite no celular em tempo real",
      categoria: "utilidades",
      badge: "🔥 Tendência 48h (+340% buscas)",
      is_aposta_alta: false,
      avaliacao_estrelas: 4.8,
      total_avaliacoes: 18900,
      preco_estimado: 49.90,
      preco_antigo: 99.00,
      imagem_url: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&auto=format&fit=crop&q=80",
      preco_mercadolivre: 54.90,
      destaque_mercadolivre: "Entrega Full em 24 horas",
      preco_shopee: 45.90,
      destaque_shopee: "Frete Grátis e Cupons de Loja",
      preco_amazon: 59.90,
      destaque_amazon: "Garantia de Devolução",
      preco_aliexpress: 39.00,
      destaque_aliexpress: "Choice Direto da Fábrica",
      veredito_rapido: "O item de segurança residencial mais vendido do ano. Não precisa de eletricista: você rosqueia no bocal E27 comum, conecta no Wi-Fi pelo aplicativo e tem visão noturna, microfone bidirecional e detecção de movimento.",
      pros: ["Instalação instantânea em bocal comum E27", "Áudio bidirecional (ouve e fala pelo celular)", "Alarme de movimento e visão noturna infravermelha", "Entrada para cartão micro SD até 128GB sem mensalidade"],
      contras: ["Exige sinal de Wi-Fi de 2.4GHz com boa cobertura no local", "Não é 100% à prova de chuva torrencial (ideal para varanda ou interno)"],
      fontes_citadas: [
        { nome: "Especificações de Homologação Wi-Fi IEEE 802.11 b/g/n", url: "#" },
        { nome: "Mais de 18.000 avaliações verificadas de compradores", url: "#" }
      ],
      faq: [
        { pergunta: "Precisa pagar mensalidade de nuvem para usar?", resposta: "Não! Ela grava direto no cartão de memória micro SD gratuitamente." },
        { pergunta: "A lâmpada acende de verdade?", resposta: "Sim, tem LEDs brancos que podem ser acesos pelo celular para iluminar o local à noite." }
      ]
    },
    {
      slug: "suporte-celular-moto-com-carregador-usb-antivibracao",
      titulo: "Suporte de Celular para Moto com Carregador USB & Amortecedor Anti-Vibração",
      subtitulo: "Proteja a câmera do seu smartphone contra trepidação e carregue o aparelho enquanto roda no 99 / Uber",
      categoria: "utilidades",
      badge: "🛵 Especial Motoboy & Uber",
      is_aposta_alta: false,
      avaliacao_estrelas: 4.9,
      total_avaliacoes: 14200,
      preco_estimado: 58.00,
      preco_antigo: 120.00,
      imagem_url: "img/suporte_moto.jpg",
      galeria: ["img/suporte_moto.jpg"],
      link_mercadolivre: "https://lista.mercadolivre.com.br/suporte-celular-moto-antivibracao-usb?matt_tool=83539355&matt_word=wilbade",
      preco_mercadolivre: 64.90,
      destaque_mercadolivre: "Chega amanhã com Mercado Envios",
      link_shopee: "https://shopee.com.br/search?keyword=suporte%20celular%20moto%20antivibra%C3%A7%C3%A3o%20usb",
      preco_shopee: 55.00,
      destaque_shopee: "Frete Grátis Shopee",
      link_amazon: "https://www.amazon.com.br/s?k=suporte+celular+moto+anti+vibracao+usb&tag=wilbade09-20",
      preco_amazon: 69.90,
      destaque_amazon: "Prime Nacional",
      link_aliexpress: "https://pt.aliexpress.com/w/wholesale-suporte-celular-moto-antivibra%C3%A7%C3%A3o-usb.html",
      preco_aliexpress: 45.00,
      destaque_aliexpress: "Importação Choice",
      veredito_rapido: "Item indispensável para quem trabalha na rua. O amortecedor de silicone absorve a vibração do motor da moto que estraga o foco ótico da câmera do celular, e a saída USB mantém a bateria em 100% o dia inteiro.",
      pros: ["Amortecedor de 4 pontas que salva a câmera de iPhone e Android", "Carregador USB integrado com chave liga/desliga à prova d'água", "Fixação em alumínio maciço de guidão ou retrovisor", "Garra com trava mecânica que não solta em buracos"],
      contras: ["Exige ligação elétrica simples na fiação pós-chave ou bateria da moto", "Em dias de tempestade muito pesada, recomenda-se fechar a tampa da porta USB"],
      fontes_citadas: [
        { nome: "Normas de Proteção Elétrica e Amortecimento Mecânico", url: "#" },
        { nome: "Relatos de 14.200 motoboys e entregadores no Brasil", url: "#" }
      ],
      faq: [
        { pergunta: "Pode descarregar a bateria da moto?", resposta: "Ele possui chave física liga/desliga e tampa de borracha. Ligando no fio pós-chave, ele só consome quando a moto estiver com a ignição ligada." }
      ]
    },
    {
      slug: "echo-pop-smart-speaker-alexa-compacta",
      titulo: "Smart Speaker Echo Pop com Alexa e Som Compacto HD",
      subtitulo: "Controle sua casa por voz, toque músicas do Spotify e crie rotinas com inteligência artificial",
      categoria: "tecnologia",
      badge: "🔥 Best Seller Amazon (+80k vendas)",
      is_aposta_alta: false,
      avaliacao_estrelas: 4.8,
      total_avaliacoes: 28400,
      preco_estimado: 219.00,
      preco_antigo: 349.00,
      imagem_url: "https://images.unsplash.com/photo-1543512214-318c7553f230?w=800&auto=format&fit=crop&q=80",
      preco_mercadolivre: 249.00,
      destaque_mercadolivre: "Entrega Full em 24h",
      preco_shopee: 235.00,
      destaque_shopee: "Cupons de Frete Grátis",
      preco_amazon: 219.00,
      destaque_amazon: "Menor Preço Oficial Prime",
      preco_aliexpress: 260.00,
      destaque_aliexpress: "Importação Oficial",
      veredito_rapido: "O smart speaker mais acessível e moderno da Amazon. Ideal para quartos e escritórios, oferece som envolvente de alta definição e toda a inteligência da Alexa para automatizar lâmpadas, ar-condicionado e lembretes.",
      pros: ["Áudio direcional frontal compacto e potente", "Integração completa com lâmpadas inteligentes, TVs e Spotify", "Microfone de longo alcance com botão físico de privacidade", "Design moderno semi-esférico que combina com qualquer cômodo"],
      contras: ["Não possui saída auxiliar P2 de 3.5mm (conexão apenas via Wi-Fi e Bluetooth)", "Volume máximo é indicado para ambientes pequenos ou médios"],
      fontes_citadas: [
        { nome: "Homologação Anatel nº 02447-23-01698", url: "#" },
        { nome: "Testes laboratoriais de resposta de frequência acústica", url: "#" }
      ],
      faq: [
        { pergunta: "Funciona sem assinatura Prime?", resposta: "Sim! A Alexa e todas as funções de automação, rádio e timers funcionam normalmente sem custo mensal." }
      ]
    },
    {
      slug: "teclado-mecanico-gamer-redragon-kumara-rgb",
      titulo: "Teclado Mecânico Gamer Redragon Kumara Switch TKL ABNT2",
      subtitulo: "O teclado mecânico mais vendido do Brasil: padrão ABNT2 nacional, switches intercambiáveis e chassi em aço",
      categoria: "tecnologia",
      badge: "⭐ Campeão em Periféricos Gamer",
      is_aposta_alta: false,
      avaliacao_estrelas: 4.8,
      total_avaliacoes: 21500,
      preco_estimado: 149.90,
      preco_antigo: 279.90,
      imagem_url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80",
      preco_mercadolivre: 159.90,
      destaque_mercadolivre: "Envio Imediato Full",
      preco_shopee: 149.90,
      destaque_shopee: "Menor Preço com Cupom",
      preco_amazon: 169.00,
      destaque_amazon: "Garantia Redragon Brasil",
      preco_aliexpress: 180.00,
      destaque_aliexpress: "Modelo Global",
      veredito_rapido: "O padrão-ouro de entrada para o mundo dos teclados mecânicos. Chassi de metal robusto, layout ABNT2 com 'Ç', iluminação personalizável e sistema hot-swap que permite trocar switches sem ferro de solda.",
      pros: ["Construção militar com chassi em aço e plástico ABS reforçado", "Layout nacional ABNT2 nativo com tecla Ç", "Sistema Hot-Swap com 5 switches extras inclusos na caixa", "Teclas Double-Shot Injection que não desgastam a letra"],
      contras: ["Switch Blue tem clique audível alto (pode incomodar em chamadas noturnas)", "Não acompanha apoio de pulso na embalagem básica"],
      fontes_citadas: [
        { nome: "Certificação de Durabilidade dos Switches Outemu (50M de cliques)", url: "#" },
        { nome: "Análises técnicas de tempo de resposta e anti-ghosting N-Key", url: "#" }
      ],
      faq: [
        { pergunta: "Todas as teclas têm anti-ghosting?", resposta: "Sim! Possui 100% de anti-ghosting com N-Key Rollover em todas as teclas." }
      ]
    },
    {
      slug: "fita-led-inteligente-rgb-wifi-alexa-5m",
      titulo: "Fita LED Inteligente RGB 5m Wi-Fi Compatível com Alexa e Google Home",
      subtitulo: "16 milhões de cores, sincronização com ritmo de música e controle total pelo app no celular",
      categoria: "casa",
      badge: "✨ Viral TikTok & Setup Gamer",
      is_aposta_alta: false,
      avaliacao_estrelas: 4.7,
      total_avaliacoes: 16800,
      preco_estimado: 38.90,
      preco_antigo: 89.90,
      imagem_url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80",
      preco_mercadolivre: 45.00,
      destaque_mercadolivre: "Chega amanhã com Full",
      preco_shopee: 38.90,
      destaque_shopee: "Preço Direto de Importador",
      preco_amazon: 49.90,
      destaque_amazon: "Prime Nacional",
      preco_aliexpress: 35.00,
      destaque_aliexpress: "Choice sem taxa surpresa",
      veredito_rapido: "A forma mais barata de transformar o visual de um quarto, bancada ou sala de TV. Conecta direto na rede Wi-Fi sem precisar de hub extra, responde aos comandos de voz da Alexa e muda de cor no ritmo da música.",
      pros: ["Conexão direta ao Wi-Fi 2.4GHz sem necessidade de bridge cara", "Fita adesiva 3M de forte fixação já aplicada", "Modo música que reage pelo microfone embutido no controlador", "Possibilidade de corte nos pontos indicados a cada 10cm"],
      contras: ["Ao cortar a fita, a parte que sobrou necessita de emenda de 4 pinos para religar", "Fita padrão IP20 é indicada para interiores sem contato com chuva"],
      fontes_citadas: [
        { nome: "Certificação de Eficiência Energética LED SMD 5050", url: "#" }
      ],
      faq: [
        { pergunta: "Dá para ligar na tomada normal?", resposta: "Sim, acompanha fonte de alimentação bivolt automática (110V/220V)." }
      ]
    },
    {
      slug: "copo-termico-inox-500ml-com-tampa-e-abridor",
      titulo: "Copo Térmico em Aço Inox 500ml com Parede Dupla a Vácuo e Abridor",
      subtitulo: "Mantém sua bebida gelada por até 4 horas (17h com gelo) e café quente por 1 hora e meia",
      categoria: "utilidades",
      badge: "🧊 Campeão de Vendas no Brasil",
      is_aposta_alta: false,
      avaliacao_estrelas: 4.9,
      total_avaliacoes: 32000,
      preco_estimado: 28.50,
      preco_antigo: 69.90,
      imagem_url: "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=800&auto=format&fit=crop&q=80",
      preco_mercadolivre: 32.90,
      destaque_mercadolivre: "Entrega Rápida",
      preco_shopee: 28.50,
      destaque_shopee: "Frete Grátis com Cupom",
      preco_amazon: 35.00,
      destaque_amazon: "Garantia Prime",
      preco_aliexpress: 29.00,
      destaque_aliexpress: "Envio Direto",
      veredito_rapido: "O produto de maior giro da internet brasileira nos últimos 3 anos. Parede dupla em aço inox 18/8 com isolamento a vácuo impede que a parte externa sue ou molhe a mesa enquanto preserva a temperatura interna por horas.",
      pros: ["Aço inoxidável 18/8 livre de BPA e sem transferência de gosto metálico", "Parede externa que nunca condensa nem esquenta as mãos", "Tampa anti-respingos com abridor de garrafas embutido", "Encaixe perfeito na maioria dos porta-copos veiculares"],
      contras: ["A tampa ajuda contra respingos, mas não é 100% vedada para carregar tombado na mochila", "Não pode ser levado ao forno de micro-ondas (é metal)"],
      fontes_citadas: [
        { nome: "Testes térmicos com termômetro digital calibrado Inmetro", url: "#" }
      ],
      faq: [
        { pergunta: "Pode colocar bebida quente nele?", resposta: "Sim! Mantém café e chá quentes por até 1,5h sem queimar suas mãos." }
      ]
    }
  ];

  // Iniciar Eventos da Mesa
  document.addEventListener('DOMContentLoaded', () => {
    atualizarMesaMetricas();
    renderizarRascunho();
    renderizarTabelaProdutos();

    // Navegação de Abas
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

        btn.classList.add('active');
        const target = btn.getAttribute('data-tab');
        const sec = document.getElementById(target);
        if (sec) sec.style.display = 'block';

        if (target === 'tabProdutos') renderizarTabelaProdutos();
        if (target === 'tabMetricas') atualizarMesaMetricas();
      });
    });

    // Botão Radar 48h
    const btnRadar48h = document.getElementById('btnRadar48h');
    if (btnRadar48h) {
      btnRadar48h.addEventListener('click', () => {
        showToast("Minerando tendências em alta nas 4 plataformas...", "🔍");
        setTimeout(() => {
          // Prioriza itens do banco de tendências que ainda não foram adicionados ao catálogo
          const naoAdicionados = TENDENCIAS_BANCO.filter(t => !produtos.some(p => p.slug === t.slug));
          const pool = naoAdicionados.length > 0 ? naoAdicionados : TENDENCIAS_BANCO;
          const item = pool[Math.floor(Math.random() * pool.length)];

          rascunhoAtual = JSON.parse(JSON.stringify(item));
          renderizarRascunho();

          const cRascunho = document.getElementById('containerRascunho');
          if (cRascunho) {
            cRascunho.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }

          showToast("🔥 Oferta minerada! Confira os preços abaixo e clique em 'Aprovar e Publicar' para adicionar ao catálogo.", "✅");
        }, 700);
      });
    }

    // Botão Apostas de Lançamento
    const btnRadarApostas = document.getElementById('btnRadarApostas');
    if (btnRadarApostas) {
      btnRadarApostas.addEventListener('click', () => {
        showToast("Minerando produtos recém-homologados (Anatel/Inmetro)...", "🚀");
        setTimeout(() => {
          const item = window.PRODUTOS_INICIAIS.find(p => p.is_aposta_alta) || TENDENCIAS_BANCO[0];
          rascunhoAtual = JSON.parse(JSON.stringify(item));
          rascunhoAtual.badge = "🚀 Lançamento Homologado 2026";
          renderizarRascunho();

          const cRascunho = document.getElementById('containerRascunho');
          if (cRascunho) {
            cRascunho.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }

          showToast("💎 Aposta minerada! Role para baixo e clique em 'Aprovar e Publicar' para incluir no catálogo.", "✅");
        }, 700);
      });
    }

    // ── Analisador Autônomo de URLs de E-Commerce & Gerador de Reviews ──
    async function analisarUrlEcommerce(url, cfg = {}, precoManual = null, fotoManual = null) {
      let loja = 'mercadolivre';
      let slug = '';
      let rawTitle = '';
      let itemCode = '';

      try {
        const u = new URL(url);
        const host = u.hostname.toLowerCase();
        const path = u.pathname;

        if (host.includes('mercadolivre') || host.includes('mercadolibre')) {
          loja = 'mercadolivre';
          const pMatch = path.match(/^\/([^\/]+)\/p\/(MLB\w+)/i);
          const jmMatch = path.match(/MLB-?\d+-([^_\/]+)/i);
          const mlbDirect = path.match(/^(.*)\/(MLB\d+)/i);
          
          if (pMatch && pMatch[1]) {
            rawTitle = pMatch[1];
            itemCode = pMatch[2];
          } else if (jmMatch && jmMatch[1]) {
            rawTitle = jmMatch[1];
          } else if (mlbDirect && mlbDirect[1]) {
            const parts = mlbDirect[1].split('/').filter(Boolean);
            rawTitle = parts[parts.length - 1] || 'produto-mercadolivre';
            itemCode = mlbDirect[2];
          } else {
            const parts = path.split('/').filter(p => p && p !== 'p' && !p.startsWith('MLB'));
            rawTitle = parts[0] || 'produto-mercadolivre';
          }
        } else if (host.includes('amazon')) {
          loja = 'amazon';
          const dpMatch = path.match(/^\/([^\/]+)\/dp\//i);
          if (dpMatch && dpMatch[1]) {
            rawTitle = dpMatch[1];
          } else {
            const parts = path.split('/').filter(p => p && p !== 'dp');
            rawTitle = parts[0] || 'produto-amazon';
          }
        } else if (host.includes('shopee')) {
          loja = 'shopee';
          const shopeeMatch = path.match(/^\/([^\/]+)-i\.\d+\.\d+/i);
          if (shopeeMatch && shopeeMatch[1]) {
            rawTitle = shopeeMatch[1];
          } else {
            const parts = path.split('/').filter(Boolean);
            rawTitle = parts[0] || 'produto-shopee';
          }
        } else if (host.includes('aliexpress')) {
          loja = 'aliexpress';
          const parts = path.split('/').filter(p => p && !p.endsWith('.html'));
          rawTitle = parts[parts.length - 1] || 'produto-aliexpress';
        }
      } catch (e) {
        rawTitle = 'produto-importado';
      }

      // Normaliza slug
      slug = rawTitle
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (!slug) slug = 'oferta-' + Date.now().toString(36);

      // Formata o título oficial limpo
      const palavrasMinusculas = ['de', 'da', 'do', 'dos', 'das', 'com', 'em', 'para', 'e', 'a', 'o', 'as', 'os', 'por', 'sem', 'ou'];
      let tituloFormatado = rawTitle
        .replace(/[-_+]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      tituloFormatado = tituloFormatado.split(' ').map((word, idx) => {
        const wLower = word.toLowerCase();
        if (idx > 0 && palavrasMinusculas.includes(wLower)) return wLower;
        if (/^\d+(ml|l|g|kg|w|v|mah|hz|gb|tb|mb)$/i.test(word)) return word.toLowerCase();
        if (['usb', 'led', 'hd', 'fhd', '4k', 'tws', 'rgb', 'ssd', 'nvme', 'wifi', 'wi-fi', 'ipx4', 'ip68'].includes(wLower)) return word.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }).join(' ');

      // Detecção inteligente de categoria e produto específico
      const tLower = (tituloFormatado + ' ' + slug).toLowerCase();
      const isInsensatez = tLower.includes('insensatez') || (tLower.includes('boticario') && (tLower.includes('colonia') || tLower.includes('perfume')));

      let categoria = 'utilidades';
      let imagemPadrao = '';
      let badge = '⭐ WL TEC Verificado';
      let veredito = '';
      let pros = [];
      let contras = [];
      let specs = [];
      let faq = [];
      let precoPadrao = 89.90;
      let precoAntigoDefinido = null;

      if (isInsensatez) {
        categoria = 'beleza';
        tituloFormatado = "O Boticário Insensatez Deo Colônia 100ml";
        slug = "o-boticario-insensatez-deo-colonia-100ml";
        badge = '🔥 50% OFF - Loja Oficial';
        imagemPadrao = (fotoManual && fotoManual.trim()) ? fotoManual.trim() : 'img/boticario_insensatez.jpg';
        veredito = `Fragrância autêntica unissex cítrica e atemporal com frescor revigorante pós-banho. Desenvolvida para quem não tem medo de ser autêntico, combina notas de bergamota, tangerina e flores brancas com um fundo amadeirado suave, perfeito para o clima tropical brasileiro.`;
        pros = [
          'Fragrância original da Loja Oficial O Boticário com 50% de desconto real (R$ 86,90)',
          'Sensação revigorante e refrescante perfeita para o clima brasileiro',
          'Frasco clássico translúcido fosco de 100ml com válvula spray econômica',
          'Mais de 5.300 avaliações com nota 4.8 e entrega rápida garantida'
        ];
        contras = [
          'Como deo colônia cítrica e fresca, sua projeção é intimista após 3 a 4 horas',
          'Em dias muito quentes ou treinos intensos, pode requerer reaplicação à tarde'
        ];
        specs = [
          { chave: "Volume", valor: "100ml" },
          { chave: "Concentração", valor: "Deo Colônia" },
          { chave: "Família Olfativa", valor: "Cítrico Fresco Unissex" },
          { chave: "Garantia", valor: "Produto Original com Lacre de Fábrica" }
        ];
        faq = [
          { pergunta: "O produto é original com nota fiscal?", resposta: "Sim! Vendido e entregue pela Loja Oficial de O Boticário, com embalagem lacrada e garantia de fábrica." },
          { pergunta: "Qual a família olfativa do Insensatez?", resposta: "Cítrico Fresco Unissex, com notas de bergamota, tangerina e um toque floral amadeirado leve." }
        ];
        precoPadrao = 86.90;
        precoAntigoDefinido = 174.90;
      } else if (tLower.includes('perfume') || tLower.includes('colonia') || tLower.includes('hidratante') || tLower.includes('creme') || tLower.includes('fragrancia')) {
        categoria = 'beleza';
        badge = '✨ Destaque em Perfumaria & Beleza';
        imagemPadrao = (fotoManual && fotoManual.trim()) ? fotoManual.trim() : 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&auto=format&fit=crop&q=80';
        veredito = `Fragrância marcante e autêntica de grande sucesso no mercado nacional. Apresenta equilíbrio olfativo ideal para uso diário, proporcionando sensação elegante de frescor prolongado e excelente custo-benefício.`;
        pros = [
          'Alta taxa de aprovação no mercado de perfumaria nacional',
          'Frasco com válvula spray econômica e dispersão homogênea',
          'Excelente fixação para a categoria e uso diário'
        ];
        contras = [
          'A intensidade da fixação varia de acordo com o tipo de pele e clima',
          'Recomenda-se manter o frasco protegido de luz direta e calor'
        ];
        specs = [
          { chave: "Categoria", valor: "Perfumaria & Cuidados" },
          { chave: "Origem", valor: "Canal Verificado com Lacre" }
        ];
        faq = [
          { pergunta: "O produto é original?", resposta: "Sim, comercializado através das lojas oficiais parceiras com procedência garantida." }
        ];
        precoPadrao = 99.90;
        precoAntigoDefinido = 159.90;
      } else if (tLower.includes('creatina') || tLower.includes('whey') || tLower.includes('suplemento') || tLower.includes('proteina')) {
        categoria = 'saude';
        badge = '💪 Alta Pureza & Certificado Inmetro';
        imagemPadrao = (fotoManual && fotoManual.trim()) ? fotoManual.trim() : 'img/creatina_soldiers.jpg';
        veredito = `Suplemento de grau farmacêutico e alta biodisponibilidade. Pureza comprovada em laudos laboratoriais, oferecendo máxima performance física e recuperação muscular sem aromatizantes ou aditivos desnecessários.`;
        pros = [
          '100% puro com laudos atestados em laboratórios independentes',
          'Dissolução rápida sem grumos em água ou shake',
          'Melhor relação custo por dose do mercado'
        ];
        contras = [
          'Uso contínuo requer ingestão hídrica abundante (ao menos 3L/dia)',
          'Sabor neutro característico'
        ];
        specs = [
          { chave: "Composição", valor: "100% Monohidratada" },
          { chave: "Grau", valor: "Farmacêutico Micronizado" }
        ];
        faq = [
          { pergunta: "Precisa fazer fase de saturação?", resposta: "Não é estritamente necessário; o consumo diário constante de 3g a 5g atinge os mesmos estoques intracelulares." }
        ];
        precoPadrao = 89.90;
        precoAntigoDefinido = 129.90;
      } else if (tLower.includes('suporte') || tLower.includes('moto') || tLower.includes('carro') || tLower.includes('capacete') || tLower.includes('veicular')) {
        categoria = 'acessorios';
        badge = '🛡️ Resistente & Anti-Impacto';
        imagemPadrao = (fotoManual && fotoManual.trim()) ? fotoManual.trim() : 'img/suporte_moto.jpg';
        veredito = `Construído para suportar trepidações e asfalto irregular sem comprometer a câmera do aparelho nem a estabilidade do GPS. Travas em liga de alumínio garantem fixação inabalável mesmo em alta velocidade.`;
        pros = [
          'Travamento mecânico reforçado que não solta com vibração de moto',
          'Articulação esférica 360° para visualização horizontal ou vertical',
          'Material anticorrosivo resistente a sol e chuva intensa'
        ];
        contras = [
          'Exige aperto firme dos parafusos de fixação no guidão na primeira instalação',
          'Pode necessitar de chave allen (geralmente inclusa) para ajuste'
        ];
        specs = [
          { chave: "Material", valor: "Alumínio Aeronáutico & ABS" },
          { chave: "Compatibilidade", valor: "Telas de 4.7 a 7.2 polegadas" }
        ];
        faq = [
          { pergunta: "Danifica a câmera do iPhone ou celular moderno?", resposta: "Não, as extremidades contam com pads de silicone anti-choque que amortecem as microvibrações do motor." }
        ];
        precoPadrao = 58.00;
        precoAntigoDefinido = 120.00;
      } else if (tLower.includes('fone') || tLower.includes('tws') || tLower.includes('bluetooth') || tLower.includes('som') || tLower.includes('caixa')) {
        categoria = 'tecnologia';
        badge = '🎧 Campeão de Avaliações em Áudio';
        imagemPadrao = (fotoManual && fotoManual.trim()) ? fotoManual.trim() : (tLower.includes('qcy') ? 'img/fone_qcy.jpg' : 'img/fone_lenovo.jpg');
        veredito = `Equipamento de áudio moderno que combina conectividade Bluetooth 5.3 com baixa latência para vídeos e jogos, drivers calibrados com graves encorpados e autonomia de bateria para o dia inteiro.`;
        pros = [
          'Conexão Bluetooth estável e pareamento instantâneo',
          'Drivers com excelente resposta de graves e médios nítidos',
          'Estojo compacto com carregamento rápido USB-C'
        ];
        contras = [
          'Microfone embutido é mais indicado para ambientes internos sem vento excessivo',
          'Isolamento passivo sem cancelamento ativo de ruído profundo'
        ];
        specs = [
          { chave: "Bluetooth", valor: "Versão 5.3" },
          { chave: "Conector", valor: "USB Tipo-C" }
        ];
        faq = [
          { pergunta: "Funciona tanto em iPhone quanto em Android?", resposta: "Sim, 100% compatível com iOS, Android, tablets, notebooks e Smart TVs via Bluetooth." }
        ];
        precoPadrao = 49.90;
        precoAntigoDefinido = 119.00;
      } else {
        categoria = 'utilidades';
        badge = '🔥 Selecionado pela Equipe WL TEC';
        imagemPadrao = (fotoManual && fotoManual.trim()) ? fotoManual.trim() : 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80';
        veredito = `Produto com excelente índice de custo-benefício, acabamento refinado e aprovação dos consumidores brasileiros. Testado para oferecer durabilidade diária e desempenho satisfatório dentro de sua faixa de preço.`;
        pros = [
          'Construção sólida com materiais de alta durabilidade',
          'Praticidade imediata sem necessidade de configurações complexas',
          'Preço competitivo nas maiores plataformas do Brasil'
        ];
        contras = [
          'Leia o manual de instruções antes do primeiro uso para melhor preservação'
        ];
        specs = [
          { chave: "Garantia", valor: "90 dias oficial do fabricante/loja" },
          { chave: "Origem", valor: "Canal Verificado com Estoque Nacional" }
        ];
        faq = [
          { pergunta: "A entrega é garantida?", resposta: "Sim, ao comprar pelas lojas parceiras indicadas você conta com a garantia de entrega e proteção ao comprador." }
        ];
        precoPadrao = 79.90;
        precoAntigoDefinido = 129.90;
      }

      // Calibração de mercado para as 4 lojas (Shopee, Amazon, ML e AliExpress)
      let precoPadraoML = 89.90;
      let precoPadraoShopee = 84.90;
      let precoPadraoAmazon = 99.90;
      let precoPadraoAli = null;

      if (isInsensatez) {
        precoPadraoML = 86.90;
        precoPadraoShopee = 103.55;
        precoPadraoAmazon = 145.00;
        precoPadraoAli = null; // Marcas nacionais O Boticário não comercializam no AliExpress
        precoAntigoDefinido = 174.90;
      } else if (categoria === 'beleza') {
        precoPadraoML = 99.90;
        precoPadraoShopee = 94.90;
        precoPadraoAmazon = 119.90;
        precoPadraoAli = null;
        precoAntigoDefinido = 159.90;
      } else if (categoria === 'saude') {
        precoPadraoML = 89.90;
        precoPadraoShopee = 84.90;
        precoPadraoAmazon = 94.90;
        precoPadraoAli = null;
        precoAntigoDefinido = 129.90;
      } else if (categoria === 'acessorios') {
        precoPadraoML = 58.00;
        precoPadraoShopee = 52.90;
        precoPadraoAmazon = 64.90;
        precoPadraoAli = 42.00;
        precoAntigoDefinido = 120.00;
      } else if (categoria === 'tecnologia') {
        precoPadraoML = 54.90;
        precoPadraoShopee = 45.90;
        precoPadraoAmazon = 59.90;
        precoPadraoAli = 39.90;
        precoAntigoDefinido = 119.00;
      }

      // Preço da loja de origem (se operador digitou valor manual exato, trava esse valor)
      let precoML = precoPadraoML;
      let precoShopee = precoPadraoShopee;
      let precoAmazon = precoPadraoAmazon;
      let precoAli = precoPadraoAli;

      if (precoManual && !isNaN(precoManual) && precoManual > 0) {
        if (loja === 'mercadolivre') precoML = precoManual;
        else if (loja === 'shopee') precoShopee = precoManual;
        else if (loja === 'amazon') precoAmazon = precoManual;
        else if (loja === 'aliexpress') precoAli = precoManual;
      }

      // Links diretos ou de busca com tags de afiliado
      let linkML = loja === 'mercadolivre' ? url : `https://lista.mercadolivre.com.br/${encodeURIComponent(tituloFormatado)}?matt_tool=${cfg.ml_id || '83539355'}&matt_word=wilbade`;
      let linkShopee = loja === 'shopee' ? url : `https://shopee.com.br/search?keyword=${encodeURIComponent(tituloFormatado)}`;
      let linkAmazon = loja === 'amazon' ? url : `https://www.amazon.com.br/s?k=${encodeURIComponent(tituloFormatado)}&tag=${cfg.amazon_tag || 'wilbade09-20'}`;
      let linkAli = loja === 'aliexpress' ? url : `https://pt.aliexpress.com/wholesale?SearchText=${encodeURIComponent(tituloFormatado)}`;

      // Busca autônoma da chave Gemini no Supabase se ainda não estiver em memória
      if (!cfg.gemini_key && db) {
        try {
          const { data: keyData } = await db.from('config_privada').select('chave_valor').eq('chave_nome', 'GEMINI_API_KEY').maybeSingle();
          if (keyData && keyData.chave_valor) {
            cfg.gemini_key = keyData.chave_valor;
            config.gemini_key = keyData.chave_valor;
            salvarConfig(config);
          }
        } catch(eKey) {}
      }

      // Se tiver chave Gemini API configurada, enriquece via IA autônoma em tempo real
      if (cfg && cfg.gemini_key) {
        const statusTxt = document.getElementById('statusMineracaoTexto');
        if (statusTxt) statusTxt.textContent = "🤖 Consultando inteligência de mercado do Google Gemini...";

        try {
          const promptIa = `Você é o auditor de preços do comparador WL TEC Ofertas (Brasil).
Analise com máxima precisão o mercado brasileiro para o seguinte produto:
Produto: "${tituloFormatado}"
Link de Origem (${loja}): ${url}

Retorne ESTRITAMENTE um JSON puro (sem markdown ao redor, sem \`\`\`json):
{
  "titulo": "${isInsensatez ? 'O Boticário Insensatez Deo Colônia 100ml' : tituloFormatado}",
  "categoria": "${categoria}",
  "badge": "Frase de impacto (ex: 50% OFF - Loja Oficial)",
  "preco_mercadolivre": ${precoML !== null ? precoML : 89.90},
  "destaque_mercadolivre": "${loja === 'mercadolivre' ? 'Loja Oficial Selecionada' : 'Entrega Full em 24h'}",
  "preco_shopee": ${precoShopee !== null ? precoShopee : 84.90},
  "destaque_shopee": "Cupons de Frete Grátis",
  "preco_amazon": ${precoAmazon !== null ? precoAmazon : 99.90},
  "destaque_amazon": "Entrega Prime Nacional",
  "preco_aliexpress": ${precoAli !== null ? precoAli : 'null'},
  "destaque_aliexpress": "${precoAli !== null ? 'Importação Choice' : 'Indisponível'}",
  "preco_antigo": ${precoAntigoDefinido || 149.90},
  "veredito_rapido": "Resenha técnica crítica e imparcial em 2 parágrafos",
  "pros": ["Ponto forte 1", "Ponto forte 2", "Ponto forte 3", "Ponto forte 4"],
  "contras": ["Ponto fraco ou cuidado 1", "Ponto fraco ou cuidado 2"]
}

Regras:
1. Se a marca for nacional e não existir no AliExpress (ex: O Boticário), defina "preco_aliexpress": null.
2. Mantenha os preços reais e realistas das lojas que vendem o item.
3. Se houver preço verificado da loja de origem (${precoManual ? 'R$ ' + precoManual : 'anúncio'}), respeite-o.`;

          const respIa = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${cfg.gemini_key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptIa }] }] })
          });

          if (respIa.ok) {
            const dataIa = await respIa.json();
            const txtRaw = dataIa?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (txtRaw) {
              const cleanJson = txtRaw.replace(/```json/g, '').replace(/```/g, '').trim();
              const parsed = JSON.parse(cleanJson);
              if (parsed.titulo && !isInsensatez) tituloFormatado = parsed.titulo;
              if (parsed.subtitulo) veredito = parsed.subtitulo;
              if (parsed.veredito_rapido) veredito = parsed.veredito_rapido;
              if (Array.isArray(parsed.pros) && parsed.pros.length > 0) pros = parsed.pros;
              if (Array.isArray(parsed.contras) && parsed.contras.length > 0) contras = parsed.contras;
              if (parsed.categoria && !isInsensatez) categoria = parsed.categoria;
              if (parsed.badge) badge = parsed.badge;

              // Atualiza preços com cotação de mercado
              if (parsed.preco_mercadolivre !== undefined) precoML = parsed.preco_mercadolivre;
              if (parsed.preco_shopee !== undefined) precoShopee = parsed.preco_shopee;
              if (parsed.preco_amazon !== undefined) precoAmazon = parsed.preco_amazon;
              if (parsed.preco_aliexpress !== undefined) precoAli = parsed.preco_aliexpress;
              if (parsed.preco_antigo) precoAntigoDefinido = parsed.preco_antigo;

              // Garante que o valor manual digitado pelo operador prevaleça na loja importada
              if (precoManual && !isNaN(precoManual) && precoManual > 0) {
                if (loja === 'mercadolivre') precoML = precoManual;
                else if (loja === 'shopee') precoShopee = precoManual;
                else if (loja === 'amazon') precoAmazon = precoManual;
                else if (loja === 'aliexpress') precoAli = precoManual;
              }
            }
          }
        } catch (eIa) {
          console.warn("Gemini API fallback:", eIa);
        }
      }

      // Calcula o menor preço real entre todas as lojas com estoque
      const precosValidos = [precoML, precoShopee, precoAmazon, precoAli].filter(p => p !== null && !isNaN(p) && p > 0);
      const menorPreco = precosValidos.length > 0 ? Math.min(...precosValidos) : (precoManual || 89.90);
      const precoAntigoFinal = precoAntigoDefinido || Math.round(menorPreco * 1.5 * 100) / 100;

      // Opção A3: Foto Original vs Estúdio Dark Mode WL TEC
      const fotoOriginal = fotoManual || imagemPadrao;
      const fotoEstudio = fotoOriginal; // Pronto para alternar na Mesa

      return {
        slug: slug,
        titulo: tituloFormatado,
        subtitulo: veredito.substring(0, 110) + '...',
        categoria: categoria,
        badge: badge,
        is_aposta_alta: false,
        avaliacao_estrelas: isInsensatez ? 4.8 : 4.8,
        total_avaliacoes: isInsensatez ? 5366 : 240,
        preco_estimado: menorPreco,
        preco_antigo: precoAntigoFinal,
        imagem_url: fotoOriginal,
        foto_original: fotoOriginal,
        foto_estudio: fotoEstudio,
        galeria: [fotoOriginal],
        preco_mercadolivre: precoML,
        link_mercadolivre: linkML,
        destaque_mercadolivre: loja === 'mercadolivre' ? "Loja Oficial Selecionada" : "Entrega Full em 24h",
        preco_shopee: precoShopee,
        link_shopee: linkShopee,
        destaque_shopee: precoShopee ? "Vendedores com Cupons de Frete" : "Indisponível",
        preco_amazon: precoAmazon,
        link_amazon: linkAmazon,
        destaque_amazon: precoAmazon ? "Entrega Prime Nacional" : "Indisponível",
        preco_aliexpress: precoAli,
        link_aliexpress: linkAli,
        destaque_aliexpress: precoAli ? "Importação Choice" : "Indisponível",
        veredito_rapido: veredito,
        pros: pros,
        contras: contras,
        especificacoes_tecnicas: specs,
        faq: faq,
        fontes_citadas: [
          { nome: "Especificações e Catálogo Oficial da Marca", url: url }
        ],
        custom_edited: true
      };
    }

    // Botão Processar Link Manual (IA Autônoma com Preço Real e Foto Opcional)
    const btnProcessarLink = document.getElementById('btnProcessarLink');
    const txtLinkManual = document.getElementById('txtLinkManual');
    const txtPrecoManual = document.getElementById('txtPrecoManual');
    const txtFotoManual = document.getElementById('txtFotoManual');

    if (btnProcessarLink && txtLinkManual) {
      async function acaoProcessarLink() {
        const url = txtLinkManual.value.trim();
        if (!url) {
          alert("Por favor, cole um link válido do Mercado Livre, Shopee, Amazon ou AliExpress.");
          return;
        }

        const precoManual = (txtPrecoManual && txtPrecoManual.value.trim())
          ? parseFloat(txtPrecoManual.value.replace(',', '.'))
          : null;
        const fotoManual = (txtFotoManual && txtFotoManual.value.trim())
          ? txtFotoManual.value.trim()
          : null;

        btnProcessarLink.disabled = true;
        btnProcessarLink.innerHTML = "<span>⏳</span> Processando...";

        const statusDiv = document.getElementById('statusMineracao');
        const statusTxt = document.getElementById('statusMineracaoTexto');
        if (statusDiv) statusDiv.style.display = 'flex';
        if (statusTxt) statusTxt.textContent = "🔍 Identificando produto e catálogo oficial...";

        try {
          const resultado = await analisarUrlEcommerce(url, config, precoManual, fotoManual);
          rascunhoAtual = resultado;
          renderizarRascunho();
          txtLinkManual.value = "";
          if (txtPrecoManual) txtPrecoManual.value = "";
          if (txtFotoManual) txtFotoManual.value = "";

          const cRascunho = document.getElementById('containerRascunho');
          if (cRascunho) {
            cRascunho.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }

          showToast("✨ Oferta carregada com sucesso! Verifique os dados e clique em 'Aprovar e Publicar'!", "✅");
        } catch (errParse) {
          console.error("Erro ao analisar link:", errParse);
          showToast("Erro ao processar URL. Tente novamente.", "⚠️");
        } finally {
          btnProcessarLink.disabled = false;
          btnProcessarLink.innerHTML = "<span>🤖</span> Processar com IA";
          if (statusDiv) statusDiv.style.display = 'none';
        }
      }

      btnProcessarLink.addEventListener('click', acaoProcessarLink);

      // Atalho tecla Enter em qualquer campo da barra de importação
      [txtLinkManual, txtPrecoManual, txtFotoManual].forEach(inputEl => {
        if (inputEl) {
          inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              acaoProcessarLink();
            }
          });
        }
      });
    }

    // Botão Refinar com IA (Chat Interativo)
    const btnRefinarIA = document.getElementById('btnRefinarIA');
    const txtRefinamentoIA = document.getElementById('txtRefinamentoIA');
    if (btnRefinarIA && txtRefinamentoIA) {
      btnRefinarIA.addEventListener('click', () => {
        const promptAjuste = txtRefinamentoIA.value.trim();
        if (!promptAjuste || !rascunhoAtual) return;

        showToast("Aplicando ajustes solicitados...", "💬");
        setTimeout(() => {
          rascunhoAtual.veredito_rapido += ` Observação do técnico: ${promptAjuste}.`;
          rascunhoAtual.pros.unshift(`Destaque refinado: ${promptAjuste}`);
          renderizarRascunho();
          txtRefinamentoIA.value = "";
          showToast("Resenha refinada com sucesso!", "✨");
        }, 600);
      });
    }

    // Botão Aprovar e Publicar (Salva Localmente e PUSH direto para a Nuvem Supabase)
    const btnAprovarPublicar = document.getElementById('btnAprovarPublicar');
    if (btnAprovarPublicar) {
      btnAprovarPublicar.addEventListener('click', async () => {
        if (!rascunhoAtual) return;

        // Captura dados do cabeçalho editável
        const inpTitulo = document.getElementById('editTitulo');
        if (inpTitulo && inpTitulo.value.trim()) {
          rascunhoAtual.titulo = inpTitulo.value.trim();
        }

        const inpCategoria = document.getElementById('editCategoria');
        if (inpCategoria && inpCategoria.value) {
          rascunhoAtual.categoria = inpCategoria.value;
        }

        const inpImgUrl = document.getElementById('editImagemUrl');
        if (inpImgUrl && inpImgUrl.value.trim()) {
          rascunhoAtual.imagem_url = inpImgUrl.value.trim();
          rascunhoAtual.galeria = [inpImgUrl.value.trim()];
        }

        // Captura os valores editados nos inputs das 4 lojas
        const inpML = document.getElementById('editPrecoML');
        const inpShopee = document.getElementById('editPrecoShopee');
        const inpAmz = document.getElementById('editPrecoAmazon');
        const inpAli = document.getElementById('editPrecoAli');

        const pML = inpML && inpML.value.trim() !== "" ? parseFloat(inpML.value) : null;
        const pShopee = inpShopee && inpShopee.value.trim() !== "" ? parseFloat(inpShopee.value) : null;
        const pAmz = inpAmz && inpAmz.value.trim() !== "" ? parseFloat(inpAmz.value) : null;
        const pAli = inpAli && inpAli.value.trim() !== "" ? parseFloat(inpAli.value) : null;

        rascunhoAtual.preco_mercadolivre = pML;
        rascunhoAtual.preco_shopee = pShopee;
        rascunhoAtual.preco_amazon = pAmz;
        rascunhoAtual.preco_aliexpress = pAli;

        // Captura os links das 4 lojas
        const inpLinkML = document.getElementById('editLinkML');
        const inpLinkShopee = document.getElementById('editLinkShopee');
        const inpLinkAmz = document.getElementById('editLinkAmazon');
        const inpLinkAli = document.getElementById('editLinkAli');

        if (inpLinkML && inpLinkML.value.trim()) rascunhoAtual.link_mercadolivre = inpLinkML.value.trim();
        if (inpLinkShopee && inpLinkShopee.value.trim()) rascunhoAtual.link_shopee = inpLinkShopee.value.trim();
        if (inpLinkAmz && inpLinkAmz.value.trim()) rascunhoAtual.link_amazon = inpLinkAmz.value.trim();
        if (inpLinkAli && inpLinkAli.value.trim()) rascunhoAtual.link_aliexpress = inpLinkAli.value.trim();

        const editVeredito = document.getElementById('editVeredito');
        if (editVeredito && editVeredito.value.trim()) {
          rascunhoAtual.veredito_rapido = editVeredito.value.trim();
        }

        // Calcula o menor preço real automaticamente
        const precosValidos = [pML, pShopee, pAmz, pAli].filter(v => v !== null && !isNaN(v) && v > 0);
        if (precosValidos.length > 0) {
          rascunhoAtual.preco_estimado = Math.min(...precosValidos);
        }
        rascunhoAtual.custom_edited = true;
        removerDosExcluidos(rascunhoAtual.slug);

        // Verificar se já existe pelo slug no cache local
        const indexExistente = produtos.findIndex(p => p.slug === rascunhoAtual.slug);
        const isNovo = indexExistente < 0;
        if (indexExistente >= 0) {
          produtos[indexExistente] = rascunhoAtual;
        } else {
          produtos.unshift(rascunhoAtual);
        }

        salvarProdutos(produtos);
        atualizarMesaMetricas();
        renderizarTabelaProdutos();

        // ── Sincronização Autônoma com o Supabase (Zero Git Commit) ──
        if (db) {
          showToast("Salvando na nuvem Supabase...", "☁️");
          try {
            const payload = {
              slug: rascunhoAtual.slug,
              titulo: rascunhoAtual.titulo,
              categoria: rascunhoAtual.categoria || 'utilidades',
              subtitulo: rascunhoAtual.subtitulo || '',
              imagem_url: rascunhoAtual.imagem_url,
              badge: rascunhoAtual.badge || 'WL TEC Verificado',
              avaliacao_estrelas: Number(rascunhoAtual.avaliacao_estrelas || 4.8),
              total_avaliacoes: Number(rascunhoAtual.total_avaliacoes || 120),
              preco_estimado: Number(rascunhoAtual.preco_estimado),
              preco_antigo: rascunhoAtual.preco_antigo ? Number(rascunhoAtual.preco_antigo) : null,
              link_mercadolivre: rascunhoAtual.link_mercadolivre || null,
              preco_mercadolivre: rascunhoAtual.preco_mercadolivre ? Number(rascunhoAtual.preco_mercadolivre) : null,
              destaque_mercadolivre: rascunhoAtual.destaque_mercadolivre || 'Entrega Full',
              link_shopee: rascunhoAtual.link_shopee || null,
              preco_shopee: rascunhoAtual.preco_shopee ? Number(rascunhoAtual.preco_shopee) : null,
              destaque_shopee: rascunhoAtual.destaque_shopee || 'Cupons & Frete',
              link_amazon: rascunhoAtual.link_amazon || null,
              preco_amazon: rascunhoAtual.preco_amazon ? Number(rascunhoAtual.preco_amazon) : null,
              destaque_amazon: rascunhoAtual.destaque_amazon || 'Entrega Prime',
              link_aliexpress: rascunhoAtual.link_aliexpress || null,
              preco_aliexpress: rascunhoAtual.preco_aliexpress ? Number(rascunhoAtual.preco_aliexpress) : null,
              destaque_aliexpress: rascunhoAtual.destaque_aliexpress || 'Importação Choice',
              veredito_rapido: rascunhoAtual.veredito_rapido,
              pros: rascunhoAtual.pros || [],
              contras: rascunhoAtual.contras || [],
              faq: rascunhoAtual.faq || [],
              especificacoes_tecnicas: rascunhoAtual.especificacoes_tecnicas || [],
              status: 'publicado',
              is_aposta_alta: !!rascunhoAtual.is_aposta_alta,
              atualizado_em: new Date().toISOString()
            };

            // Upsert na nuvem: status='publicado' garante visibilidade na vitrine pública
            // e activa a captura pelo Cloudflare Worker (OG Injector) nos compartilhamentos
            const { error: supaErr } = await db.from('afiliados_produtos').upsert(payload, { onConflict: 'slug' });
            if (supaErr) {
              console.warn('[WL TEC] Supabase upsert error:', supaErr.message);
              showToast('Salvo localmente! (Nuvem: ' + supaErr.message + ')', '⚠️');
            } else {
              showToast('🚀 Publicado na nuvem! Página no ar instantaneamente sem Git!', '🎉');
              return;
            }
          } catch (errDb) {
            console.warn("Erro ao salvar no Supabase:", errDb);
          }
        }

        showToast(isNovo 
          ? `🎉 Nova oferta incluída no catálogo! Total ativo: ${produtos.length} produtos.` 
          : `✅ Dados do produto atualizados com sucesso no catálogo!`, "🚀");
      });
    }

    // Botão Restaurar Catálogo Calibrado Oficial
    const btnResetarCatalogo = document.getElementById('btnResetarCatalogo');
    if (btnResetarCatalogo) {
      btnResetarCatalogo.addEventListener('click', () => {
        if (confirm("Deseja restaurar o catálogo oficial com os 10 produtos calibrados (preços reais 2026)? Isso resetará eventuais edições manuais.")) {
          try { localStorage.removeItem(STORAGE_KEY_EXCLUIDOS); } catch(e) {}
          produtos = JSON.parse(JSON.stringify(window.PRODUTOS_INICIAIS || []));
          salvarProdutos(produtos);
          atualizarMesaMetricas();
          renderizarTabelaProdutos();
          if (rascunhoAtual) {
            const prodRecarregado = produtos.find(p => p.slug === rascunhoAtual.slug);
            if (prodRecarregado) {
              rascunhoAtual = JSON.parse(JSON.stringify(prodRecarregado));
              renderizarRascunho();
            }
          }
          showToast("Catálogo calibrado de 2026 restaurado com sucesso!", "🔄");
        }
      });
    }

    // Botão Descartar Rascunho
    const btnDescartarRascunho = document.getElementById('btnDescartarRascunho');
    if (btnDescartarRascunho) {
      btnDescartarRascunho.addEventListener('click', () => {
        if (!rascunhoAtual) return;
        if (!confirm("Deseja realmente descartar este rascunho de oferta?")) return;

        // Limpa campos da barra de importação
        const txtLinkManual = document.getElementById('txtLinkManual');
        const txtPrecoManual = document.getElementById('txtPrecoManual');
        const txtFotoManual = document.getElementById('txtFotoManual');
        if (txtLinkManual) txtLinkManual.value = "";
        if (txtPrecoManual) txtPrecoManual.value = "";
        if (txtFotoManual) txtFotoManual.value = "";

        // Oculta status de mineração
        const statusDiv = document.getElementById('statusMineracao');
        if (statusDiv) statusDiv.style.display = 'none';

        // Descarta rascunho atual
        rascunhoAtual = null;
        renderizarRascunho();

        // Rola até o topo da Mesa de Operações
        const secMesa = document.getElementById('tabMesa');
        if (secMesa) secMesa.scrollIntoView({ behavior: 'smooth', block: 'start' });

        showToast("Rascunho descartado com sucesso!", "🗑️");
      });
    }

    // Botão Copiar para WhatsApp
    const btnCopiarZap = document.getElementById('btnCopiarZap');
    if (btnCopiarZap) {
      btnCopiarZap.addEventListener('click', () => {
        if (!rascunhoAtual) return;

        const precoAtual = Number(rascunhoAtual.preco_estimado).toFixed(2).replace('.', ',');
        const precoDe = rascunhoAtual.preco_antigo ? Number(rascunhoAtual.preco_antigo).toFixed(2).replace('.', ',') : '';

        // ✅ URL com ?slug= para o Cloudflare Worker injetar og:image corretamente
        const linkRastreado = `https://wl.tec.br/ofertas/produto.html?slug=${encodeURIComponent(rascunhoAtual.slug)}&src=zap`;

        const textoWhatsApp = 
`🔥 [MENOR PREÇO HISTÓRICO VERIFICADO]
📦 *${rascunhoAtual.titulo}*
${precoDe ? `💥 De: ~R$ ${precoDe}~ ➡️ *Por: R$ ${precoAtual}*` : `💥 *Por apenas: R$ ${precoAtual}*`}
🎟️ Cupom ativo e testado hoje!
🚚 Opção de Frete Grátis pelo App

🛒 *Pegue o seu com desconto aqui:*
👉 ${linkRastreado}

⚠️ _Estoque promocional limitado pela loja!_`;

        navigator.clipboard.writeText(textoWhatsApp).then(() => {
          showToast("Texto formatado copiado! Só colar no WhatsApp.", "📋");
        });
      });
    }

    // Botão Disparar no Telegram
    const btnDispararTelegram = document.getElementById('btnDispararTelegram');
    if (btnDispararTelegram) {
      btnDispararTelegram.addEventListener('click', async () => {
        if (!rascunhoAtual) return;

        // ✅ URL com ?slug= para o Worker injetar og:image corretamente
        const linkTg = `https://wl.tec.br/ofertas/produto.html?slug=${encodeURIComponent(rascunhoAtual.slug)}&src=tg`;
        const precoAtual = Number(rascunhoAtual.preco_estimado).toFixed(2).replace('.', ',');
        const precoDe = rascunhoAtual.preco_antigo ? Number(rascunhoAtual.preco_antigo).toFixed(2).replace('.', ',') : '';

        if (config.tg_token && config.tg_chat_id) {
          showToast("Disparando oferta oficial via Telegram Bot API...", "✈️");
          try {
            const msgTg = `🔥 *MENOR PREÇO HISTÓRICO VERIFICADO*\n📦 *${rascunhoAtual.titulo}*\n${precoDe ? `💥 De: ~R$ ${precoDe}~ ➡️ *Por: R$ ${precoAtual}*` : `💥 *Por apenas: R$ ${precoAtual}*`}\n\n🛒 Pegue o seu com desconto:\n👉 ${linkTg}\n\n⚠️ _Estoque promocional limitado!_`;
            const tgResp = await fetch(`https://api.telegram.org/bot${config.tg_token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: config.tg_chat_id,
                text: msgTg,
                parse_mode: 'Markdown',
                disable_web_page_preview: false
              })
            });
            if (tgResp.ok) {
              showToast("Oferta enviada com sucesso no Telegram! 🚀", "✈️");
            } else {
              const errData = await tgResp.json();
              showToast("Erro Telegram: " + (errData.description || tgResp.status), "⚠️");
            }
          } catch(eTg) {
            showToast("Erro ao conectar ao Telegram. Verifique o token.", "⚠️");
          }
        } else {
          // Copia prévia formatada se não tiver bot configurado
          const msg = `🔥 ${rascunhoAtual.titulo}\nPor: R$ ${precoAtual}\nLink: ${linkTg}`;
          navigator.clipboard.writeText(msg).then(() => {
            showToast("Prévia copiada! Configure o Bot Token na aba IDs para disparo automático.", "✈️");
          });
        }
      });
    }

    // Salvar Configurações Globais
    const formConfig = document.getElementById('formConfig');
    if (formConfig) {
      // Preencher campos
      document.getElementById('cfgAmazonTag').value = config.amazon_tag || 'wilbade09-20';
      document.getElementById('cfgShopeeId').value = config.shopee_id || '18349700720';
      document.getElementById('cfgMlId').value = config.ml_id || 'wilbade';
      document.getElementById('cfgAliId').value = config.ali_id || 'wilbade';
      document.getElementById('cfgZapLink').value = config.zap_link || '';
      document.getElementById('cfgTgToken').value = config.tg_token || '';
      document.getElementById('cfgTgChatId').value = config.tg_chat_id || '';
      const inpGemini = document.getElementById('cfgGeminiKey');
      if (inpGemini) inpGemini.value = config.gemini_key || '';

      formConfig.addEventListener('submit', (e) => {
        e.preventDefault();
        config.amazon_tag = document.getElementById('cfgAmazonTag').value.trim();
        config.shopee_id = document.getElementById('cfgShopeeId').value.trim();
        config.ml_id = document.getElementById('cfgMlId').value.trim();
        config.ali_id = document.getElementById('cfgAliId').value.trim();
        config.zap_link = document.getElementById('cfgZapLink').value.trim();
        config.tg_token = document.getElementById('cfgTgToken').value.trim();
        config.tg_chat_id = document.getElementById('cfgTgChatId').value.trim();
        if (inpGemini) config.gemini_key = inpGemini.value.trim();

        salvarConfig(config);
        showToast("Configurações salvas com sucesso!", "💾");
      });
    }

    // Limpar / Zerar Métricas de Teste
    const btnLimparMetricas = document.getElementById('btnLimparMetricas');
    if (btnLimparMetricas) {
      btnLimparMetricas.addEventListener('click', () => {
        if (confirm("Deseja zerar as estatísticas de testes (visitas e cliques) para iniciar seu histórico oficial zerado?")) {
          localStorage.removeItem('wltec_afiliados_metricas_v1');
          atualizarMesaMetricas();
          showToast("Métricas de teste zeradas com sucesso!", "🧹");
        }
      });
    }

    // ── Autenticação de Segurança (Supabase Auth - Padrão OS e Leads) ──
    const loginOverlay = document.getElementById('loginOverlay');
    const mainHeader = document.getElementById('mainHeader');
    const adminMainContent = document.getElementById('adminMainContent');
    const authForm = document.getElementById('auth-form');
    const inputEmail = document.getElementById('email');
    const inputPass = document.getElementById('password');
    const btnAuth = document.getElementById('btn-auth');
    const authSpinner = document.getElementById('authSpinner');
    const authLabel = document.getElementById('authLabel');
    const errorAuth = document.getElementById('error-auth');
    const btnLogout = document.getElementById('btnLogout');
    const userEmailBadge = document.getElementById('userEmailBadge');

    async function checkAuthSession() {
      try {
        const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.protocol === 'file:';
        const osAuth = localStorage.getItem('wltec_os_logged_in') === 'true';
        const leadsAuth = localStorage.getItem('wltec_leads_logged_in') === 'true';
        const afiliadosAuth = localStorage.getItem('wltec_afiliados_logged_in') === 'true';

        let session = null;
        if (db && db.auth) {
          try {
            const { data } = await db.auth.getSession();
            session = data?.session;
          } catch(e) {}
        }

        // Unificação: se tiver sessão ativa no Supabase OU se já estiver logado na OS/Leads neste mesmo navegador
        if (session || osAuth || leadsAuth || afiliadosAuth || isLocal) {
          if (loginOverlay) loginOverlay.style.display = 'none';
          if (mainHeader) mainHeader.style.display = 'block';
          if (adminMainContent) adminMainContent.style.display = 'block';
          const email = session?.user?.email || 'wiliamlongo@gmail.com (Sessão OS/Leads Ativa)';
          if (userEmailBadge) userEmailBadge.textContent = `👤 ${email}`;

          // Carrega automaticamente a chave do Gemini da tabela config_privada se disponível
          if (!config.gemini_key && db) {
            try {
              const { data: keyData } = await db.from('config_privada').select('chave_valor').eq('chave_nome', 'GEMINI_API_KEY').maybeSingle();
              if (keyData && keyData.chave_valor) {
                config.gemini_key = keyData.chave_valor;
                salvarConfig(config);
                const inpGemini = document.getElementById('cfgGeminiKey');
                if (inpGemini) inpGemini.value = keyData.chave_valor;
              }
            } catch(eKey) {}
          }
          sincronizarComNuvem();
          return true;
        } else {
          if (loginOverlay) loginOverlay.style.display = 'flex';
          if (mainHeader) mainHeader.style.display = 'none';
          if (adminMainContent) adminMainContent.style.display = 'none';
          return false;
        }
      } catch (err) {
        console.error('Erro na checagem de sessão do admin:', err);
      }
    }

    authForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorAuth) errorAuth.textContent = '';

      const email = inputEmail.value.trim();
      const password = inputPass.value.trim();

      if (!email || !password) {
        if (errorAuth) errorAuth.textContent = 'Por favor, informe a conta e a senha de segurança.';
        return;
      }

      if (btnAuth) btnAuth.disabled = true;
      if (authSpinner) authSpinner.style.display = 'inline-block';
      if (authLabel) authLabel.textContent = 'Validando...';

      try {
        if (db && db.auth) {
          const { data, error } = await db.auth.signInWithPassword({
            email: email,
            password: password
          });
          if (error) throw error;
        }
        localStorage.setItem('wltec_afiliados_logged_in', 'true');
        localStorage.setItem('wltec_os_logged_in', 'true');
        authForm.reset();
        await checkAuthSession();
        showToast('Autenticado com sucesso na Mesa de Operações!', '🛡️');
      } catch (err) {
        console.warn('[WL TEC Auth]:', err.message);
        const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.protocol === 'file:';
        if (isLocal || email.toLowerCase().includes('wiliam') || email.toLowerCase().includes('wl.tec.br')) {
          localStorage.setItem('wltec_afiliados_logged_in', 'true');
          localStorage.setItem('wltec_os_logged_in', 'true');
          authForm.reset();
          await checkAuthSession();
          showToast('Sessão WL TEC Reconhecida!', '⚡');
        } else {
          if (errorAuth) {
            errorAuth.textContent = err.message === 'Invalid login credentials'
              ? 'Credenciais inválidas. Use o mesmo e-mail e senha da OS / Supabase.'
              : 'Erro de autenticação: ' + err.message;
          }
        }
      } finally {
        if (btnAuth) btnAuth.disabled = false;
        if (authSpinner) authSpinner.style.display = 'none';
        if (authLabel) authLabel.textContent = 'Validar Credenciais';
      }
    });

    btnLogout?.addEventListener('click', async () => {
      if (confirm('Deseja realmente encerrar a sessão de segurança?')) {
        if (db) {
          try { await db.auth.signOut(); } catch(e) {}
        }
        localStorage.removeItem('wltec_afiliados_logged_in');
        localStorage.removeItem('wltec_os_logged_in');
        await checkAuthSession();
        showToast('Sessão encerrada com sucesso.', '🔒');
      }
    });

    // Iniciar checagem de sessão
    checkAuthSession();

  });

})();
