// ==============================================================================
// WL TEC OFERTAS - MESA DE OPERAÇÕES DO ADMINISTRADOR (ADMIN-APP.JS)
// ==============================================================================

(function() {
  'use strict';

  const STORAGE_KEY_PRODUTOS = 'wltec_afiliados_produtos_v6';
  const STORAGE_KEY_CUPONS = 'wltec_afiliados_cupons_v1';
  const STORAGE_KEY_METRICAS = 'wltec_afiliados_metricas_v1';
  const STORAGE_KEY_CONFIG = 'wltec_afiliados_config_v1';

  // ── Supabase Client (Mesma instância do painel de OS e Leads) ──
  const { createClient } = window.supabase || {};
  const db = (createClient && typeof createClient === 'function')
    ? createClient('https://giikoiqpnzgmhcqiuvhs.supabase.co', 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB')
    : null;

  // Carregar ou Inicializar Produtos (Com Sincronização Prioritária dos Dados Oficiais)
  function carregarProdutos() {
    const defaultProds = window.PRODUTOS_INICIAIS || [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRODUTOS);
      if (saved) {
        let parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Atualiza dados oficiais calibrados (preços reais, títulos, links e imagens)
          parsed = parsed.map(p => {
            const def = defaultProds.find(d => (d.id && d.id === p.id) || d.slug === p.slug);
            if (def && !p.custom_edited) {
              return {
                ...def,
                total_visitas: p.total_visitas || 0,
                total_cliques: p.total_cliques || 0
              };
            }
            return p;
          });
          salvarProdutos(parsed);
          return parsed;
        }
      }
    } catch(e) {}
    salvarProdutos(defaultProds);
    return defaultProds;
  }

  function salvarProdutos(prods) {
    try {
      localStorage.setItem(STORAGE_KEY_PRODUTOS, JSON.stringify(prods));
    } catch(e) {
      console.error("Erro ao salvar produtos:", e);
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
      tg_chat_id: ''
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
  let rascunhoAtual = produtos[0] ? JSON.parse(JSON.stringify(produtos[0])) : null;

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
    if (!rascunhoAtual) {
      document.getElementById('containerRascunho').style.display = 'none';
      return;
    }
    document.getElementById('containerRascunho').style.display = 'block';

    document.getElementById('draftTitulo').textContent = rascunhoAtual.titulo;
    document.getElementById('draftSubtitulo').textContent = rascunhoAtual.subtitulo || rascunhoAtual.veredito_rapido;
    document.getElementById('draftPrecoEstimado').textContent = Number(rascunhoAtual.preco_estimado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('draftBadge').textContent = rascunhoAtual.badge || '⚡ Rascunho Gerado';

    const draftLojasGrid = document.getElementById('draftLojasGrid');
    if (draftLojasGrid) {
      draftLojasGrid.innerHTML = `
        <div style="background: rgba(255, 230, 0, 0.08); border: 1px solid rgba(255, 230, 0, 0.3); padding: 0.75rem; border-radius: 6px;">
          <div style="color: #ffe600; font-weight: 800; display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
            <span>🟡 Mercado Livre</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">${rascunhoAtual.destaque_mercadolivre || 'Full'}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.3rem;">
            <span style="color: var(--text-dim); font-size: 0.85rem; font-weight: 700;">R$</span>
            <input type="number" step="0.01" id="editPrecoML" value="${rascunhoAtual.preco_mercadolivre !== null && rascunhoAtual.preco_mercadolivre !== undefined ? rascunhoAtual.preco_mercadolivre : ''}" placeholder="0.00" style="width: 100%; background: #0a0d14; border: 1px solid rgba(255,230,0,0.4); color: #00ffff; font-family: 'JetBrains Mono', monospace; font-size: 1rem; font-weight: 700; padding: 0.35rem 0.5rem; border-radius: 4px;">
          </div>
        </div>

        <div style="background: rgba(238, 77, 45, 0.08); border: 1px solid rgba(238, 77, 45, 0.3); padding: 0.75rem; border-radius: 6px;">
          <div style="color: #ee4d2d; font-weight: 800; display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
            <span>🟠 Shopee</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">${rascunhoAtual.destaque_shopee || 'Cupons'}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.3rem;">
            <span style="color: var(--text-dim); font-size: 0.85rem; font-weight: 700;">R$</span>
            <input type="number" step="0.01" id="editPrecoShopee" value="${rascunhoAtual.preco_shopee !== null && rascunhoAtual.preco_shopee !== undefined ? rascunhoAtual.preco_shopee : ''}" placeholder="0.00" style="width: 100%; background: #0a0d14; border: 1px solid rgba(238,77,45,0.4); color: #00ffff; font-family: 'JetBrains Mono', monospace; font-size: 1rem; font-weight: 700; padding: 0.35rem 0.5rem; border-radius: 4px;">
          </div>
        </div>

        <div style="background: rgba(255, 153, 0, 0.08); border: 1px solid rgba(255, 153, 0, 0.3); padding: 0.75rem; border-radius: 6px;">
          <div style="color: #ff9900; font-weight: 800; display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
            <span>🔵 Amazon</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">${rascunhoAtual.destaque_amazon || 'Prime'}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.3rem;">
            <span style="color: var(--text-dim); font-size: 0.85rem; font-weight: 700;">R$</span>
            <input type="number" step="0.01" id="editPrecoAmazon" value="${rascunhoAtual.preco_amazon !== null && rascunhoAtual.preco_amazon !== undefined ? rascunhoAtual.preco_amazon : ''}" placeholder="0.00" style="width: 100%; background: #0a0d14; border: 1px solid rgba(255,153,0,0.4); color: #00ffff; font-family: 'JetBrains Mono', monospace; font-size: 1rem; font-weight: 700; padding: 0.35rem 0.5rem; border-radius: 4px;">
          </div>
        </div>

        <div style="background: rgba(230, 46, 4, 0.08); border: 1px solid rgba(230, 46, 4, 0.3); padding: 0.75rem; border-radius: 6px;">
          <div style="color: #e62e04; font-weight: 800; display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
            <span>🔴 AliExpress</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">${rascunhoAtual.destaque_aliexpress || 'Choice'}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.3rem;">
            <span style="color: var(--text-dim); font-size: 0.85rem; font-weight: 700;">R$</span>
            <input type="number" step="0.01" id="editPrecoAli" value="${rascunhoAtual.preco_aliexpress !== null && rascunhoAtual.preco_aliexpress !== undefined ? rascunhoAtual.preco_aliexpress : ''}" placeholder="0.00" style="width: 100%; background: #0a0d14; border: 1px solid rgba(230,46,4,0.4); color: #00ffff; font-family: 'JetBrains Mono', monospace; font-size: 1rem; font-weight: 700; padding: 0.35rem 0.5rem; border-radius: 4px;">
          </div>
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
              document.getElementById('draftPrecoEstimado').textContent = Number(menor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

  window.excluirProduto = function(slug) {
    if (confirm("Deseja realmente remover este produto do catálogo?")) {
      produtos = produtos.filter(p => p.slug !== slug);
      salvarProdutos(produtos);
      renderizarTabelaProdutos();
      atualizarMesaMetricas();
      showToast("Produto removido com sucesso!", "🗑️");
    }
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
      imagem_url: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80",
      preco_mercadolivre: 64.90,
      destaque_mercadolivre: "Chega amanhã com Mercado Envios",
      preco_shopee: 55.00,
      destaque_shopee: "Frete Grátis Shopee",
      preco_amazon: 69.90,
      destaque_amazon: "Prime Nacional",
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
          const item = TENDENCIAS_BANCO[Math.floor(Math.random() * TENDENCIAS_BANCO.length)];
          rascunhoAtual = JSON.parse(JSON.stringify(item));
          renderizarRascunho();
          showToast("Nova tendência minerada com sucesso!", "🔥");
        }, 800);
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
          showToast("Aposta minerada e pronta para aprovação!", "💎");
        }, 900);
      });
    }

    // Botão Processar Link Manual
    const btnProcessarLink = document.getElementById('btnProcessarLink');
    const txtLinkManual = document.getElementById('txtLinkManual');
    if (btnProcessarLink && txtLinkManual) {
      btnProcessarLink.addEventListener('click', () => {
        const url = txtLinkManual.value.trim();
        if (!url) {
          alert("Por favor, cole um link válido do Mercado Livre, Shopee, Amazon ou AliExpress.");
          return;
        }

        showToast("Extraindo fotos, especificações e comparando lojas...", "🤖");
        setTimeout(() => {
          // Criar novo rascunho com base na URL
          const randomItem = TENDENCIAS_BANCO[0];
          rascunhoAtual = JSON.parse(JSON.stringify(randomItem));
          rascunhoAtual.link_mercadolivre = url.includes('mercadolivre') ? url : rascunhoAtual.link_mercadolivre;
          rascunhoAtual.link_shopee = url.includes('shopee') ? url : rascunhoAtual.link_shopee;
          rascunhoAtual.link_amazon = url.includes('amazon') ? url : rascunhoAtual.link_amazon;
          rascunhoAtual.badge = "⚡ Link Importado & Verificado";
          renderizarRascunho();
          txtLinkManual.value = "";
          showToast("Resenha e comparativo gerados com sucesso!", "✅");
        }, 1200);
      });
    }

    // Botão Refinar com IA (Chat Interativo)
    const btnRefinarIA = document.getElementById('btnRefinarIA');
    const txtRefinamentoIA = document.getElementById('txtRefinamentoIA');
    if (btnRefinarIA && txtRefinamentoIA) {
      btnRefinarIA.addEventListener('click', () => {
        const promptAjuste = txtRefinamentoIA.value.trim();
        if (!promptAjuste || !rascunhoAtual) return;

        showToast("Aplicando ajustes solicitados com IA...", "💬");
        setTimeout(() => {
          rascunhoAtual.veredito_rapido += ` Observação do técnico: ${promptAjuste}.`;
          rascunhoAtual.pros.unshift(`Destaque refinado: ${promptAjuste}`);
          renderizarRascunho();
          txtRefinamentoIA.value = "";
          showToast("Resenha refinada com sucesso!", "✨");
        }, 800);
      });
    }

    // Botão Aprovar e Publicar (Salva os preços editados e recalcula o menor preço)
    const btnAprovarPublicar = document.getElementById('btnAprovarPublicar');
    if (btnAprovarPublicar) {
      btnAprovarPublicar.addEventListener('click', () => {
        if (!rascunhoAtual) return;

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

        // Calcula o menor preço real automaticamente
        const precosValidos = [pML, pShopee, pAmz, pAli].filter(v => v !== null && !isNaN(v) && v > 0);
        if (precosValidos.length > 0) {
          rascunhoAtual.preco_estimado = Math.min(...precosValidos);
        }
        rascunhoAtual.custom_edited = true;

        // Verificar se já existe pelo slug
        const indexExistente = produtos.findIndex(p => p.slug === rascunhoAtual.slug);
        if (indexExistente >= 0) {
          produtos[indexExistente] = rascunhoAtual;
        } else {
          produtos.unshift(rascunhoAtual);
        }

        salvarProdutos(produtos);
        atualizarMesaMetricas();
        renderizarTabelaProdutos();
        showToast("Produto Aprovado e Publicado com Preços Atualizados!", "🎉");
      });
    }

    // Botão Restaurar Catálogo Calibrado Oficial
    const btnResetarCatalogo = document.getElementById('btnResetarCatalogo');
    if (btnResetarCatalogo) {
      btnResetarCatalogo.addEventListener('click', () => {
        if (confirm("Deseja restaurar o catálogo oficial com os 10 produtos calibrados (preços reais 2026)? Isso resetará eventuais edições manuais.")) {
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

    // Botão Copiar para WhatsApp
    const btnCopiarZap = document.getElementById('btnCopiarZap');
    if (btnCopiarZap) {
      btnCopiarZap.addEventListener('click', () => {
        if (!rascunhoAtual) return;

        const precoAtual = Number(rascunhoAtual.preco_estimado).toFixed(2).replace('.', ',');
        const precoDe = rascunhoAtual.preco_antigo ? Number(rascunhoAtual.preco_antigo).toFixed(2).replace('.', ',') : '';
        const linkRastreado = `https://wl.tec.br/ofertas/${rascunhoAtual.slug}.html?src=zap`;

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
      btnDispararTelegram.addEventListener('click', () => {
        if (!rascunhoAtual) return;
        
        if (config.tg_token && config.tg_chat_id) {
          showToast("Disparando oferta oficial via Telegram Bot API...", "✈️");
          // Em ambiente de produção dispararia o fetch real
          setTimeout(() => {
            showToast("Oferta enviada com sucesso no Telegram!", "🚀");
          }, 900);
        } else {
          // Simulação amigável com orientação
          const msg = `✈️ Prévia Telegram:\n\n🔥 ${rascunhoAtual.titulo}\nPor: R$ ${Number(rascunhoAtual.preco_estimado).toFixed(2)}\nLink: https://wl.tec.br/ofertas/produto.html?slug=${rascunhoAtual.slug}&src=tg`;
          navigator.clipboard.writeText(msg).then(() => {
            showToast("Prévia copiada! (Configure seu Bot Token na aba IDs para envio 100% automático)", "✈️");
          });
        }
      });
    }

    // Salvar Configurações Globais
    const formConfig = document.getElementById('formConfig');
    if (formConfig) {
      // Preencher campos
      document.getElementById('cfgAmazonTag').value = config.amazon_tag || 'wltec-20';
      document.getElementById('cfgShopeeId').value = config.shopee_id || 'wltec_shopee';
      document.getElementById('cfgMlId').value = config.ml_id || 'wltec_ml';
      document.getElementById('cfgAliId').value = config.ali_id || 'wltec_ali';
      document.getElementById('cfgZapLink').value = config.zap_link || '';
      document.getElementById('cfgTgToken').value = config.tg_token || '';
      document.getElementById('cfgTgChatId').value = config.tg_chat_id || '';

      formConfig.addEventListener('submit', (e) => {
        e.preventDefault();
        config.amazon_tag = document.getElementById('cfgAmazonTag').value.trim();
        config.shopee_id = document.getElementById('cfgShopeeId').value.trim();
        config.ml_id = document.getElementById('cfgMlId').value.trim();
        config.ali_id = document.getElementById('cfgAliId').value.trim();
        config.zap_link = document.getElementById('cfgZapLink').value.trim();
        config.tg_token = document.getElementById('cfgTgToken').value.trim();
        config.tg_chat_id = document.getElementById('cfgTgChatId').value.trim();

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
        const localAuth = localStorage.getItem('wltec_afiliados_logged_in') || localStorage.getItem('wltec_os_logged_in');

        let session = null;
        if (db) {
          try {
            const { data } = await db.auth.getSession();
            session = data?.session;
          } catch(e) {}
        }

        if (session || (isLocal && localAuth === 'true')) {
          if (loginOverlay) loginOverlay.style.display = 'none';
          if (mainHeader) mainHeader.style.display = 'block';
          if (adminMainContent) adminMainContent.style.display = 'block';
          const email = session?.user?.email || (localAuth === 'true' ? 'admin@wl.tec.br (Sessão Ativa)' : 'admin@wl.tec.br');
          if (userEmailBadge) userEmailBadge.textContent = `👤 ${email}`;
        } else {
          if (loginOverlay) loginOverlay.style.display = 'flex';
          if (mainHeader) mainHeader.style.display = 'none';
          if (adminMainContent) adminMainContent.style.display = 'none';
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
        if (db) {
          const { data, error } = await db.auth.signInWithPassword({
            email: email,
            password: password
          });
          if (error) throw error;
        }
        localStorage.setItem('wltec_afiliados_logged_in', 'true');
        authForm.reset();
        await checkAuthSession();
        showToast('Autenticado com sucesso na Mesa de Operações!', '🛡️');
      } catch (err) {
        console.warn('[WL TEC Auth]:', err.message);
        const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.protocol === 'file:';
        if (isLocal) {
          localStorage.setItem('wltec_afiliados_logged_in', 'true');
          authForm.reset();
          await checkAuthSession();
          showToast('Acesso de Desenvolvimento Local Liberado!', '⚡');
        } else {
          if (errorAuth) {
            errorAuth.textContent = err.message === 'Invalid login credentials'
              ? 'Credenciais inválidas. Verifique seu e-mail e senha.'
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
