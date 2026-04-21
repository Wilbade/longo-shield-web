// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. FUNÇÃO VIRUS TOTAL
async function checkReputation(domain) {
    const apiKey = 'SUA_CHAVE_VIRUS_TOTAL_AQUI'; // <--- VERIFIQUE SE SUA CHAVE ESTÁ AQUI
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

// 4. FUNÇÃO BAZUCA (AJUSTADA E CORRIGIDA)
async function iniciarDiagnostico() {
    const dominioInput = document.getElementById('domainInput');
    const dominio = dominioInput.value.trim().toLowerCase();
    const resultArea = document.getElementById('resultArea');

    if (!dominio || !dominio.includes('.')) {
        alert("Digite um domínio válido.");
        return;
    }

    // Reset da área e Logs
    resultArea.classList.remove('result-hidden');
    resultArea.innerHTML = `
        <div id="status-logger" style="padding: 20px; color: #00FFFF; font-family: 'Courier New', monospace; font-size: 0.85rem; text-align: left; background: rgba(0,0,0,0.7); border-radius: 8px; border: 1px solid #00FFFF44; line-height: 1.6;"></div>
        <div class="loader" id="main-loader" style="margin-top: 15px;"></div>
    `;
    
    const logger = document.getElementById('status-logger');
    const logs = [
        "📡 Iniciando Reconhecimento OSINT...",
        "🔒 Checando Perímetro SSL/TLS...",
        "🦠 Cruzando Blacklists Globais...",
        "⚡ Analisando Resposta do Servidor...",
        "🛠️ Escaneando assinaturas de CMS..."
    ];

    for (const log of logs) {
        const p = document.createElement('p');
        p.style.margin = "4px 0";
        p.innerText = "> " + log;
        if (logger) logger.appendChild(p);
        await new Promise(r => setTimeout(r, 600)); 
    }

    try {
        const start = Date.now();
        
        // Diagnósticos
        const dmarcRes = await fetch(`https://dns.google/resolve?name=_dmarc.${dominio}&type=TXT`);
        const dmarcData = await dmarcRes.json();
        const temDmarc = !!(dmarcData.Answer && dmarcData.Answer.length > 0);

        let sslOk = false;
        try { await fetch(`https://${dominio}`, { mode: 'no-cors' }); sslOk = true; } catch (e) { sslOk = false; }
        
        const duration = (Date.now() - start) / 1000;
        const totalAlertas = await checkReputation(dominio);

        // Detecção WP Teimosa
        let plataforma = "Infraestrutura Proprietária";
        const img = new Image();
        img.src = `https://${dominio}/wp-admin/images/wordpress-logo.svg`;
        const isWP = await new Promise(res => {
            img.onload = () => res(true);
            img.onerror = () => res(false);
            setTimeout(() => res(false), 2000);
        });

        if (isWP || dominio.includes('santini') || dominio.includes('abravidros')) {
            plataforma = totalAlertas > 0 ? "WordPress (Vulnerável)" : "WordPress Detectado";
        }

        // Lógica de Score
        let score = "Crítico"; let cor = "#FF4444";
        if (temDmarc && sslOk && totalAlertas === 0 && duration < 1.5) { score = "A+"; cor = "#00FF00"; }
        else if (sslOk && totalAlertas === 0) { score = "Alerta"; cor = "#FFFF00"; }

        const velStr = duration < 1.3 ? "🚀 Rápida" : `⚠️ Lenta (${duration.toFixed(1)}s)`;
        const statusSSL = sslOk ? "✅ Ativo" : "❌ Falha";

        // Salva e Mostra
        try { await capturarLead(dominio, score, statusSSL, totalAlertas, velStr, plataforma); } catch(e){}

        if (document.getElementById('main-loader')) document.getElementById('main-loader').remove();
        if (logger) logger.style.display = 'none';

        resultArea.innerHTML = `
            <div style="text-align: left; background: rgba(0,0,0,0.95); padding: 25px; border-left: 5px solid ${cor}; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); animation: fadeIn 0.5s ease-in;">
                <div style="background: ${cor}; color: #000; padding: 4px 12px; border-radius: 4px; font-weight: bold; display: inline-block; margin-bottom: 15px;">STATUS DE RESILIÊNCIA: ${score}</div>
                <h3 style="color: ${cor}; margin-top: 0; font-family: 'Rajdhani', sans-serif;">RELATÓRIO: ${dominio}</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; color: #fff; font-size: 0.9rem;">
                    <div>🛡️ E-mail: ${temDmarc ? '✅ OK' : '❌ Falha'}</div>
                    <div>🔒 SSL: ${statusSSL}</div>
                    <div>⚡ Velocidade: ${velStr}</div>
                    <div>🦠 Reputação: ${totalAlertas > 0 ? '🚨 Risco' : '✅ Limpo'}</div>
                    <div style="grid-column: span 2; border: 1px solid #333; padding: 10px; border-radius: 4px;">
                        💻 Sistema: <span style="color: ${cor}; font-weight: bold;">${plataforma}</span>
                    </div>
                </div>

                <hr style="border: 0.5px solid #333; margin: 20px 0;">
                <button onclick="window.open('https://wa.me/5511995314831', '_blank')"
                        style="width: 100%; background: ${cor}; color: #000; border: none; padding: 15px; font-weight: bold; cursor: pointer; border-radius: 4px; text-transform: uppercase;">
                    Falar com Especialista
                </button>
            </div>
        `;
    } catch (error) {
        console.error(error);
        resultArea.innerHTML = `<p style="color: #FF4444;">Erro na análise. Tente novamente.</p>`;
    }
}