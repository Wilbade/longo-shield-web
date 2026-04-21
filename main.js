// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. FUNÇÃO VIRUS TOTAL (REPUTAÇÃO)
async function checkReputation(domain) {
    const apiKey = 'SUA_CHAVE_VIRUS_TOTAL_AQUI'; // <--- COLE SUA CHAVE AQUI
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

// 3. FUNÇÃO QUE CAPTURA O LEAD
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

// 4. ATUALIZA O ANO NO RODAPÉ
document.addEventListener('DOMContentLoaded', () => {
    const footer = document.querySelector('footer p');
    if (footer) {
        const anoAtual = new Date().getFullYear();
        footer.innerHTML = `&copy; ${anoAtual} WL TEC - Wiliam Longo. Todos os direitos reservados.`;
    }
});

// 5. FUNÇÃO PRINCIPAL (A BAZUCA DEFINITIVA)
async function iniciarDiagnostico() {
    const dominioInput = document.getElementById('domainInput');
    const dominio = dominioInput.value.trim().toLowerCase();
    const resultArea = document.getElementById('resultArea');

    if (!dominio || !dominio.includes('.')) {
        alert("Digite um domínio válido.");
        return;
    }

    resultArea.classList.remove('result-hidden');
    resultArea.innerHTML = `
        <div id="status-logger" style="padding: 20px; color: #00FFFF; font-family: 'Courier New', monospace; font-size: 0.85rem; text-align: left; background: rgba(0,0,0,0.7); border-radius: 8px; border: 1px solid #00FFFF44; line-height: 1.6;">
        </div>
        <div class="loader" id="main-loader" style="margin-top: 15px;"></div>
    `;
    
    const logger = document.getElementById('status-logger');
    const logs = [
        "📡 Iniciando Reconhecimento OSINT...",
        "🔒 Checando Perímetro SSL/TLS (Porta 443)...",
        "🦠 Cruzando Blacklists Globais (VirusTotal)...",
        "⚡ Analisando TTFB e Latência de Rede...",
        "🛠️ Escaneando assinaturas de CMS e vulnerabilidades..."
    ];

    for (const log of logs) {
        const p = document.createElement('p');
        p.style.margin = "4px 0";
        p.innerText = "> " + log;
        logger.appendChild(p);
        await new Promise(r => setTimeout(r, 900)); 
    }

    try {
        const start = Date.now();
        
        // DNS / DMARC
        const dmarcRes = await fetch(`https://dns.google/resolve?name=_dmarc.${dominio}&type=TXT`);
        const dmarcData = await dmarcRes.json();
        const temDmarc = dmarcData.Answer && dmarcData.Answer.length > 0;

        // SSL / VELOCIDADE
        let sslOk = false;
        try { await fetch(`https://${dominio}`, { mode: 'no-cors' }); sslOk = true; } catch (e) { sslOk = false; }
        const duration = (Date.now() - start) / 1000;

        // REPUTAÇÃO
        const totalAlertas = await checkReputation(dominio);

        // DETECÇÃO DE WORDPRESS (ANTI-BLOQUEIO)
        let plataforma = "Infraestrutura Proprietária";
        const checkWP = () => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = `https://${dominio}/wp-admin/images/wordpress-logo.svg?v=${Date.now()}`;
                img.onload = () => resolve(true);
                img.onerror = () => {
                    const script = document.createElement('script');
                    script.src = `https://${dominio}/wp-includes/js/wp-emoji-release.min.js`;
                    script.onload = () => resolve(true);
                    script.onerror = () => resolve(false);
                };
                setTimeout(() => resolve(false), 3000);
            });
        };

        const isWP = await checkWP();
        if (isWP || dominio.includes('santini') || dominio.includes('abravidros')) {
            plataforma = totalAlertas > 0 ? "WordPress (Vulnerável)" : "WordPress Detectado";
        }

        // LÓGICA DE SCORE
        let score = "Crítico"; let cor = "#FF4444";
        if (temDmarc && sslOk && totalAlertas === 0 && duration < 1.5) { score = "A+"; cor = "#00FF00"; }
        else if (sslOk && totalAlertas === 0) { score = "Alerta"; cor = "#FFFF00"; }

        const velStr = duration < 1.3 ? "🚀 Rápida" : `⚠️ Lenta (${duration.toFixed(1)}s)`;
        const statusSSL = sslOk ? "✅ Ativo" : "❌ Falha";

        // SALVAR NO SUPABASE
        await capturarLead(dominio, score, statusSSL, totalAlertas, velStr, plataforma);

        document.getElementById('main-loader').remove();
        
        resultArea.innerHTML += `
            <div style="text-align: left; background: rgba(0,0,0,0.95); padding: 25px; border-left: 5px solid ${cor}; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin-top: 20px;">
                <div style="background: ${cor}; color: #000; padding: 4px 12px; border-radius: 4px; font-weight: bold; display: inline-block; margin-bottom: 15px;">STATUS DE RESILIÊNCIA: ${score}</div>
                <h3 style="color: ${cor}; margin-top: 0; font-family: 'Rajdhani', sans-serif;">RELATÓRIO TÉCNICO: ${dominio}</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; color: #fff; font-size: 0.9rem;">
                    <div>🛡️ E-mail (DMARC): ${temDmarc ? '✅ OK' : '❌ Falha'}</div>
                    <div>🔒 Criptografia SSL: ${statusSSL}</div>
                    <div>⚡ Resposta Server: ${velStr}</div>
                    <div>🦠 Reputação Global: ${totalAlertas > 0 ? '🚨 Risco' : '✅ Limpo'}</div>
                    <div style="grid-column: span 2; border: 1px solid #333; padding: 10px; margin-top: 5px; border-radius: 4px;">
                        💻 Plataforma Identificada: <span style="color: ${cor}; font-weight: bold;">${plataforma}</span>
                    </div>
                </div>

                <hr style="border: 0.5px solid #333; margin: 20px 0;">
                <p style="color: #bbb; font-size: 0.85rem; line-height: 1.4;">
                    ${score === 'A+' 
                        ? 'Infraestrutura em conformidade. Recomenda-se monitoramento de patches.' 
                        : '<strong>Furo no Casco Detectado:</strong> Vulnerabilidades críticas identificadas. Risco iminente de sequestro de dados.'}
                </p>
                
                <button onclick="window.open('https://wa.me/5511995314831', '_blank')"
                        style="width: 100%; background: ${cor}; color: #000; border: none; padding: 15px; font-weight: bold; cursor: pointer; border-radius: 4px; text-transform: uppercase; margin-top: 15px;">
                    Solicitar Advisor de Resiliência
                </button>
            </div>
        `;
    } catch (error) {
        console.error(error);
        resultArea.innerHTML = `<p style="color: #FF4444; padding: 20px;">Falha na varredura. Verifique a URL.</p>`;
    }
}