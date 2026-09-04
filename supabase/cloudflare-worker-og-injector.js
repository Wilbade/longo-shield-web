// ============================================================
// WL TEC — Cloudflare Worker: Open Graph Injector v2
// Injeta og:image correto para bots de redes sociais
// Deploy: dashboard.cloudflare.com → Workers & Pages → wltec-og-injector
// Rota ativa: wl.tec.br/ofertas/*
// ============================================================

const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const SITE_BASE = 'https://wl.tec.br';

// Detecta crawlers e bots de redes sociais
function isSocialBot(ua) {
  if (!ua) return false;
  const u = ua.toLowerCase();
  return (
    u.includes('whatsapp')        ||
    u.includes('telegrambot')     ||
    u.includes('facebookexternalhit') ||
    u.includes('facebot')         ||
    u.includes('twitterbot')      ||
    u.includes('linkedinbot')     ||
    u.includes('slackbot')        ||
    u.includes('discordbot')      ||
    u.includes('googlebot')       ||
    u.includes('bingbot')         ||
    u.includes('applebot')        ||
    u.includes('pinterest')       ||
    u.includes('crawler')         ||
    u.includes('spider')          ||
    u.includes('scraper')         ||
    u.includes('bot/')            ||
    u.includes('cloudflare')
  );
}

// Extrai slug da URL
function extrairSlug(urlStr) {
  try {
    const parsed = new URL(urlStr);
    // Caso 1: ?slug=VALOR
    const slugParam = parsed.searchParams.get('slug');
    if (slugParam) return slugParam.trim();
    // Caso 2: /ofertas/nome-do-produto.html
    const m = parsed.pathname.match(/\/ofertas\/([^/]+?)(?:\.html)?$/i);
    if (m && !['produto', 'index', 'afiliados'].includes(m[1])) return m[1];
  } catch (e) {}
  return null;
}

// Consulta Supabase pelo slug
async function buscarProduto(slug) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/afiliados_produtos?slug=eq.${encodeURIComponent(slug)}&select=titulo,subtitulo,imagem_url,preco_estimado,preco_antigo,categoria,badge&limit=1`;
    const resp = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json'
      }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch (e) {
    return null;
  }
}

// Formata preço BR
function brl(v) {
  if (!v && v !== 0) return '';
  return 'R$ ' + Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Garante URL absoluta da imagem
function resolverImagem(img) {
  if (!img) return `${SITE_BASE}/img/escudo_shiel.png`;
  if (img.startsWith('http')) return img;
  if (img.startsWith('img/')) return `${SITE_BASE}/ofertas/${img}`;
  return `${SITE_BASE}/${img}`;
}

// Injeta meta tags no HTML
function injetarOG(html, produto, ogUrl) {
  const titulo = (produto.titulo || 'WL TEC Ofertas').replace(/"/g, '&quot;');
  const preco  = brl(produto.preco_estimado);
  const precoAntigo = produto.preco_antigo ? brl(produto.preco_antigo) : '';
  const subtitulo = produto.subtitulo || 'Oferta verificada pela WL TEC';
  
  const desc = (precoAntigo
    ? `${subtitulo}. De: ${precoAntigo} por apenas ${preco}. Confira!`
    : `${subtitulo}. Por apenas ${preco}. Oferta verificada hoje!`
  ).replace(/"/g, '&quot;').substring(0, 300);

  const img = resolverImagem(produto.imagem_url);
  const imgType = img.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const metas = `
  <!-- WL TEC OG Worker v2 -->
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="WL TEC Ofertas">
  <meta property="og:title" content="${titulo} | ${preco}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${img}">
  <meta property="og:image:secure_url" content="${img}">
  <meta property="og:image:type" content="${imgType}">
  <meta property="og:image:width" content="600">
  <meta property="og:image:height" content="600">
  <meta property="og:url" content="${ogUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${titulo}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${img}">
  <!-- /WL TEC OG Worker v2 -->`;

  // Remove og: e twitter: genéricos existentes
  let out = html
    .replace(/<meta\s+property="og:[^"]*"[^>]*\/?>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*\/?>/gi, '');

  // Injeta logo após <head>
  out = out.replace(/(<head[^>]*>)/i, `$1${metas}`);

  // Atualiza title e meta description padrão
  out = out
    .replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${titulo} | WL TEC Ofertas</title>`)
    .replace(/<meta\s+name="description"[^>]*\/?>/i,
      `<meta name="description" content="${desc.substring(0, 160)}">`);

  return out;
}

// ── Handler Principal ──
export default {
  async fetch(request) {
    const url = request.url;
    const ua  = request.headers.get('User-Agent') || '';

    // Só atua em /ofertas/
    if (!url.includes('/ofertas/')) return fetch(request);

    const slug  = extrairSlug(url);
    const isBot = isSocialBot(ua);

    // Usuário normal ou sem slug → passa direto (zero overhead)
    if (!isBot || !slug) return fetch(request);

    try {
      // ✅ FIX: Cria requisição limpa sem headers Range (evita resposta 206)
      const cleanReq = new Request(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Encoding': 'identity',
          'User-Agent': 'WLTECWorker/2.0'
        }
      });

      // Busca produto e HTML em paralelo
      const [produto, htmlResp] = await Promise.all([
        buscarProduto(slug),
        fetch(cleanReq)
      ]);

      // Produto não encontrado → retorna original
      if (!produto) return fetch(request);

      const htmlOriginal = await htmlResp.text();
      const ogUrl = `${SITE_BASE}/ofertas/produto.html?slug=${encodeURIComponent(slug)}`;
      const htmlFinal = injetarOG(htmlOriginal, produto, ogUrl);

      return new Response(htmlFinal, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'X-WL-Worker': `og-injected:${slug}`
        }
      });

    } catch (err) {
      // Em erro, nunca quebra o site — retorna original
      console.error('[WL OG Worker]', err.message);
      return fetch(request);
    }
  }
};
