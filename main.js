// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. FUNÇÃO VIRUS TOTAL
async function checkReputation(domain) {
    const apiKey = '54ef70fd11931f567f1ec29156709771e2f5656deb88d29fa5e14b3ed70307a6'; 
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

        // FINALIZAÇÃO E EXIBIÇÃO DO CARD COM DESIGN PREMIUM
        resultArea.innerHTML = `
        <div style="text-align: left; background: rgba(0,0,0,0.95); padding: 30px; border-left: 6px solid ${cor}; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5); position: relative; animation: fadeIn 0.6s ease-out;">
            
            <img src="img/escudo_shiel.png" alt="Shield" style="position: absolute; top: 20px; right: 20px; height: 60px; opacity: 0.8;">

            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div>
                    <div style="background: ${cor}; color: #000; padding: 5px 15px; border-radius: 4px; font-weight: 800; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-bottom: 10px; font-family: sans-serif;">
                        Status de Resiliência
                    </div>
                    <h2 style="color: #fff; margin: 0; font-family: 'Rajdhani', sans-serif; font-size: 1.8rem; text-transform: uppercase; letter-spacing: 2px;">
                        ${dominio}
                    </h2>
                </div>
                <div style="font-size: 2.5rem; font-weight: 900; color: ${cor}; font-family: 'Rajdhani', sans-serif; line-height: 1; margin-right: 70px;">
                    ${score}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: #666; font-size: 0.7rem; text-transform: uppercase; display: block; margin-bottom: 5px;">Perímetro de E-mail</span>
                    <span style="color: #fff; font-weight: bold;">🛡️ DMARC: ${temDmarc ? '<span style="color:#00FF00">OK</span>' : '<span style="color:#FF4444">Falha</span>'}</span>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: #666; font-size: 0.7rem; text-transform: uppercase; display: block; margin-bottom: 5px;">Criptografia</span>
                    <span style="color: #fff; font-weight: bold;">🔒 SSL: ${sslOk ? '<span style="color:#00FF00">Ativo</span>' : '<span style="color:#FF4444">Falha</span>'}</span>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: #666; font-size: 0.7rem; text-transform: uppercase; display: block; margin-bottom: 5px;">Performance</span>
                    <span style="color: #fff; font-weight: bold;">⚡ ${velStr}</span>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: #666; font-size: 0.7rem; text-transform: uppercase; display: block; margin-bottom: 5px;">Ameaças Externas</span>
                    <span style="color: #fff; font-weight: bold;">🦠 ${totalAlertas > 0 ? '<span style="color:#FF4444">Risco</span>' : '<span style="color:#00FF00">Limpo</span>'}</span>
                </div>
            </div>

            <div style="background: rgba(255,255,255,0.05); border: 1px solid ${cor}33; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                <span style="color: ${cor}; font-size: 0.7rem; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 5px;">DNA da Infraestrutura</span>
                <span style="color: #fff; font-size: 1rem; font-weight: 600;">💻 Sistema: ${plataforma}</span>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button onclick="window.open('https://wa.me/5511995314831', '_blank')"
                        style="flex: 2; background: ${cor}; color: #000; border: none; padding: 18px; font-weight: 800; cursor: pointer; border-radius: 6px; text-transform: uppercase; font-family: 'Rajdhani', sans-serif; letter-spacing: 1px;">
                    Solicitar Advisor de Resiliência
                </button>
            </div>
        </div>
    `;
    } catch (err) {
        console.error(err);
        resultArea.innerHTML = "Erro na análise.";
    }
}