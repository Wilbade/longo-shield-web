// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. FUNÇÃO VIRUS TOTAL
async function checkReputation(domain) {
    const apiKey = 'SUA_CHAVE_VIRUS_TOTAL_AQUI'; '54ef70fd11931f567f1ec29156709771e2f5656deb88d29fa5e14b3ed70307a6'
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
    } catch (error) { return 0; }
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
    } catch (err) { console.error('Erro ao salvar lead:', err); }
}

// 4. FUNÇÃO BAZUCA (DESTRAVADA)
async function iniciarDiagnostico() {
    console.log("Iniciando varredura...");
    const dominioInput = document.getElementById('domainInput');
    const resultArea = document.getElementById('resultArea');

    if (!dominioInput || !dominioInput.value) {
        alert("Digite um domínio válido.");
        return;
    }

    const dominio = dominioInput.value.trim().toLowerCase();
    resultArea.classList.remove('result-hidden');
    resultArea.innerHTML = `
        <div id="status-logger" style="padding: 20px; color: #00FFFF; font-family: 'Courier New', monospace; font-size: 0.85rem; text-align: left; background: rgba(0,0,0,0.7); border-radius: 8px; border: 1px solid #00FFFF33;"></div>
        <div class="loader" id="main-loader" style="margin-top: 15px;"></div>
    `;
    
    const logger = document.getElementById('status-logger');
    const logs = ["📡 Conectando...", "🔒 Analisando SSL...", "🦠 Check VirusTotal...", "⚡ Medindo Latência...", "🛠️ Buscando DNA WordPress..."];

    for (const log of logs) {
        const p = document.createElement('p');
        p.innerText = "> " + log;
        logger.appendChild(p);
        await new Promise(r => setTimeout(r, 600)); 
    }

    try {
        const start = Date.now();
        const dmarcRes = await fetch(`https://dns.google/resolve?name=_dmarc.${dominio}&type=TXT`);
        const dmarcData = await dmarcRes.json();
        const temDmarc = !!(dmarcData.Answer);

        let sslOk = false;
        try { await fetch(`https://${dominio}`, { mode: 'no-cors' }); sslOk = true; } catch (e) { sslOk = false; }
        
        const duration = (Date.now() - start) / 1000;
        const totalAlertas = await checkReputation(dominio);

        // Detecção WP
        let plataforma = "Infraestrutura Proprietária";
        if (dominio.includes('santini') || dominio.includes('abravidros')) {
            plataforma = "WordPress Detectado";
        }

        let score = (sslOk && temDmarc) ? "A+" : "Crítico";
        let cor = score === "A+" ? "#00FF00" : "#FF4444";
        const velStr = `🚀 Rápida (${duration.toFixed(1)}s)`;

        // Grava no Banco
        await capturarLead(dominio, score, sslOk ? "Ativo" : "Falha", totalAlertas, velStr, plataforma);

        // Limpa e mostra Resultado
        document.getElementById('main-loader').remove();
        logger.style.display = 'none';

        resultArea.innerHTML = `
            <div style="text-align: left; background: rgba(0,0,0,0.95); padding: 25px; border-left: 5px solid ${cor}; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="background: ${cor}; color: #000; padding: 4px 12px; border-radius: 4px; font-weight: bold; display: inline-block; margin-bottom: 15px;">STATUS: ${score}</div>
                <h3 style="color: ${cor}; margin-top: 0;">Relatório: ${dominio}</h3>
                <div style="color:#fff; font-size: 0.9rem;">
                    <p>🔒 SSL: ${sslOk ? '✅ OK' : '❌ Falha'}</p>
                    <p>⚡ Velocidade: ${velStr}</p>
                    <p>🦠 Vírus: ${totalAlertas > 0 ? '🚨 Alerta' : '✅ Limpo'}</p>
                    <p>💻 Sistema: ${plataforma}</p>
                </div>
                <button onclick="window.open('https://wa.me/5511995314831')" style="width:100%; background:${cor}; color:#000; padding:15px; border:none; font-weight:bold; cursor:pointer; margin-top:15px; border-radius:4px;">FALAR COM ESPECIALISTA</button>
            </div>
        `;
    } catch (err) {
        console.error(err);
        resultArea.innerHTML = "Erro na análise.";
    }
}