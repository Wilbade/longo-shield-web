// ============================================================
// WL TEC — Cloudflare Worker: Sitemap Dinâmico
// Rota: wl.tec.br/sitemap-ofertas.xml
// Gera sitemap atualizado com todos os produtos publicados no Supabase
// Permite que o Google indexe automaticamente produtos novos sem Git commit
// ============================================================

const SUPABASE_URL      = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const SITE_BASE         = 'https://wl.tec.br';

export default {
  async fetch(request) {
    const url = request.url;

    // Serve apenas na rota do sitemap de ofertas
    if (!url.includes('/sitemap-ofertas.xml')) return fetch(request);

    try {
      // Busca todos os produtos publicados, ordenados pelo mais recente
      const apiUrl = `${SUPABASE_URL}/rest/v1/afiliados_produtos?status=eq.publicado&select=slug,atualizado_em&order=atualizado_em.desc`;
      const resp = await fetch(apiUrl, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Accept': 'application/json'
        }
      });

      const produtos = resp.ok ? await resp.json() : [];

      // Gera entradas XML para cada produto
      const urlEntries = produtos.map(p => {
        const lastmod = p.atualizado_em
          ? p.atualizado_em.split('T')[0]
          : new Date().toISOString().split('T')[0];

        return `
  <url>
    <loc>${SITE_BASE}/ofertas/produto.html?slug=${encodeURIComponent(p.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }).join('');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_BASE}/ofertas/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>${urlEntries}
</urlset>`;

      return new Response(xml, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache de 1h
          'X-WL-Sitemap': `produtos:${produtos.length}`
        }
      });

    } catch (err) {
      console.error('[WL Sitemap Worker]', err.message);
      // Em caso de erro, retorna um sitemap mínimo estático
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_BASE}/ofertas/</loc></url>
</urlset>`, {
        status: 200,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' }
      });
    }
  }
};
