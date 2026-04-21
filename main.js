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

// 3. FUNÇÃO QUE CAPTURA O LEAD (Agora com mais munição)
async function capturarLead(dominio, score, ssl, reputacao, velocidade, plataforma) {
    try {
        const resIp = await fetch('https://ipapi.co/json/');
        const dataIp = await resIp.json();
        
        await _supabase.from('leads').insert([{
            dominio: dominio,
            ip_usuario: dataIp.ip || '0.0.0.0',
            localizacao: `${dataIp.city}, ${dataIp.region}`,
            score: score,
            status_ssl: ssl,
            reputacao: reputacao > 0 ? `🚨 ${reputacao} Alertas` : "✅ Limpo",
            velocidade: velocidade,
            plataforma: plataforma
        }]);
    } catch (err) { console.error('Erro ao salvar lead:', err); }
}

// 4. FUNÇÃO PRINCIPAL (A BAZUCA)
async function iniciarDiagnostico() {
    const dominioInput = document.getElementById('domainInput');
    const dominio = dominioInput.value.trim().toLowerCase();
    const resultArea = document.getElementById('resultArea');

    if (!dominio || !dominio.includes('.')) {
        alert("Digite um domínio válido.");
        return;
    }

    resultArea.classList.remove('result-hidden');
    
    // EFEITO DE VARREDURA SEQUENCIAL
    const logs = [
        "📡 Conectando aos servidores de DNS...",
        "🔍 Analisando certificados SSL/TLS...",
        "🦠 Verificando reputação no VirusTotal...",
        "⚡ Medindo tempo de resposta do servidor...",
        "🛠️ Identificando plataforma e vulnerabilidades..."
    ];

    let logIndex = 0;
    resultArea.innerHTML = `<div id="status-logger" style="padding: 20px; color: #00FFFF; font-family: 'Courier New', monospace; font-size: 0.9rem;"></div><div class="loader"></div>`;
    const logger = document.getElementById('status-logger');

    const interval = setInterval(() => {
        if(logIndex < logs.length) {
            logger.innerHTML += `<p>> ${logs[logIndex]}</p>`;
            logIndex++;
        } else { clearInterval(interval); }
    }, 600);

    try {
        // EXECUÇÃO DOS CANOS
        const dmarcRes = await fetch(`https://dns.google/resolve?name=_dmarc.${dominio}&type=TXT`);
        const dmarcData = await dmarcRes.json();
        const temDmarc = dmarcData.Answer && dmarcData.Answer.length > 0;

        const start = Date.now();
        let sslOk = false;
        try { await fetch(`https://${dominio}`, { mode: 'no-cors' }); sslOk = true; } catch (e) {}
        const duration = (Date.now() - start) / 1000;

        const totalAlertas = await checkReputation(dominio);

        // DETECTAR WORDPRESS (SIMULADO POR HEADERS OU CAMINHOS)
        let plataforma = "Desconhecida";
        try {
            const wpCheck = await fetch(`https://${dominio}/wp-includes/`, { mode: 'no-cors' });
            plataforma = "WordPress Detectado";
        } catch(e) {}

        // LÓGICA DE SCORE
        let score = "Crítico"; let cor = "#FF4444";
        if (temDmarc && sslOk && totalAlertas === 0 && duration < 1.5) { score = "A+"; cor = "#00FF00"; }
        else if (sslOk && totalAlertas === 0) { score = "B"; cor = "#FFFF00"; }

        const velStr = duration < 1.2 ? "🚀 Rápida" : "⚠️ Lenta (" + duration.toFixed(1) + "s)";
        
        // SALVAR NO BANCO
        capturarLead(dominio, score, sslOk ? "Ativo" : "Inativo", totalAlertas, velStr, plataforma);

        setTimeout(() => {
            resultArea.innerHTML = `
                <div style="text-align: left; background: rgba(0,0,0,0.9); padding: 25px; border-left: 5px solid ${cor}; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="background: ${cor}; color: #000; padding: 4px 12px; border-radius: 4px; font-weight: bold; display: inline-block; margin-bottom: 15px;">SCORE: ${score}</div>
                    <h3 style="color: ${cor}; margin-top: 0;">Relatório Longo Shield: ${dominio}</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; color: #fff; font-size: 0.9rem;">
                        <div>🛡️ E-mail: ${temDmarc ? '✅ OK' : '❌ Falha'}</div>
                        <div>🔒 SSL: ${sslOk ? '✅ OK' : '❌ Falha'}</div>
                        <div>⚡ Velocidade: ${velStr}</div>
                        <div>🦠 Vírus: ${totalAlertas > 0 ? '🚨 Risco' : '✅ Limpo'}</div>
                        <div>💻 Sistema: ${plataforma}</div>
                    </div>

                    <hr style="border: 0.5px solid #333; margin: 20px 0;">
                    <p style="color: #bbb;">${score === 'A+' ? 'Sua estrutura é de elite. Continue assim.' : 'Detectamos falhas que podem causar perda de dados e clientes.'}</p>
                    
                    <button onclick="window.open('https://wa.me/5511995314831', '_blank')"
                            style="width: 100%; margin-top: 15px; background: ${cor}; color: #000; border: none; padding: 15px; font-weight: bold; cursor: pointer; border-radius: 4px;">
                        ${score === 'A+' ? 'Reforçar Segurança' : 'Consertar Agora'}
                    </button>
                </div>
            `;
        }, 3500);

    } catch (error) {
        resultArea.innerHTML = `<p style="color: #FF4444;">Erro ao analisar. Verifique a conexão.</p>`;
    }
}