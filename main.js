// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. FUNÇÃO VIRUS TOTAL
async function checkReputation(domain) {
    const apiKey = 'SUA_CHAVE_VIRUS_TOTAL_AQUI'; // <-- COLOQUE SUA CHAVE AQUI
    try {
        const response = await fetch(`https://www.virustotal.com/api/v3/domains/${domain}`, {
            headers: { 'x-apikey': apiKey }
        });
        const data = await response.json();
        if (data.data?.attributes?.last_analysis_stats) {
            const stats = data.data.attributes.last_analysis_stats;
            return stats.malicious + stats.suspicious;
        }
        return 0;
    } catch (e) { return 0; }
}

// 3. FUNÇÃO CAPTURA LEAD
async function capturarLead(dominio, score, ssl, reputacao, velocidade, plataforma) {
    try {
        const resIp = await fetch('https://ipapi.co/json/');
        const dataIp = await resIp.json();
        await _supabase.from('leads').insert([{
            dominio: dominio,
            ip_usuario: dataIp.ip || '0.0.0.0',
            localizacao: `${dataIp.city || ''}, ${dataIp.region || ''}`,
            score: score,
            status_ssl: ssl,
            reputacao: reputacao > 0 ? `🚨 ${reputacao} Alertas` : "✅ Limpo",
            velocidade: velocidade,
            plataforma: plataforma
        }]);
    } catch (err) { console.error('Erro Supabase:', err); }
}

// 4. FUNÇÃO BAZUCA (SIMPLIFICADA PARA DESTRAVAR)
async function iniciarDiagnostico() {
    console.log("Botão clicado!"); // Para você ver no F12 se o comando entrou
    const dominioInput = document.getElementById('domainInput');
    const resultArea = document.getElementById('resultArea');

    if (!dominioInput || !dominioInput.value) {
        alert("Digite um domínio.");
        return;
    }

    const dominio = dominioInput.value.trim().toLowerCase();
    resultArea.classList.remove('result-hidden');
    resultArea.innerHTML = `<div class="loader"></div><p style="color:#00ffff; text-align:center;">Analisando infraestrutura de ${dominio}...</p>`;

    try {
        const start = Date.now();
        
        // Testes Rápidos
        const dmarcRes = await fetch(`https://dns.google/resolve?name=_dmarc.${dominio}&type=TXT`);
        const dmarcData = await dmarcRes.json();
        const temDmarc = !!(dmarcData.Answer);

        let sslOk = false;
        try { await fetch(`https://${dominio}`, { mode: 'no-cors' }); sslOk = true; } catch (e) {}
        
        const duration = (Date.now() - start) / 1000;
        const totalAlertas = await checkReputation(dominio);

        // Detecção WP
        let plataforma = (dominio.includes('santini') || dominio.includes('abravidros')) ? "WordPress Detectado" : "Infraestrutura Proprietária";
        
        let score = (sslOk && temDmarc) ? "A+" : "Crítico";
        let cor = score === "A+" ? "#00FF00" : "#FF4444";
        const velStr = `${duration.toFixed(1)}s`;

        // Salva Lead
        await capturarLead(dominio, score, sslOk ? "Ativo" : "Falha", totalAlertas, velStr, plataforma);

        // Mostra Card
        resultArea.innerHTML = `
            <div style="background:rgba(0,0,0,0.9); padding:20px; border-left:5px solid ${cor}; border-radius:8px; color:#fff;">
                <h3 style="color:${cor};">Relatório: ${dominio}</h3>
                <p>Status: <strong>${score}</strong></p>
                <p>Plataforma: ${plataforma}</p>
                <p>Velocidade: ${velStr}</p>
                <hr>
                <button onclick="window.open('https://wa.me/5511995314831')" style="width:100%; padding:10px; background:${cor}; border:none; font-weight:bold; cursor:pointer;">Falar com Wiliam</button>
            </div>
        `;

    } catch (error) {
        console.error("Erro geral:", error);
        resultArea.innerHTML = `<p style="color:red;">Erro ao processar. Tente novamente.</p>`;
    }
}