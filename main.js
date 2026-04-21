// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. FUNÇÃO VIRUS TOTAL (A BAZUCA DE REPUTAÇÃO)
async function checkReputation(domain) {
    const apiKey = 'SUA_CHAVE_VIRUS_TOTAL_AQUI'; '54ef70fd11931f567f1ec29156709771e2f5656deb88d29fa5e14b3ed70307a6'
    try {
        const response = await fetch(`https://www.virustotal.com/api/v3/domains/${domain}`, {
            headers: { 'x-apikey': apiKey }
        });
        const data = await response.json();
        
        if (data.data && data.data.attributes && data.data.attributes.last_analysis_stats) {
            const stats = data.data.attributes.last_analysis_stats;
            return stats.malicious + stats.suspicious; 
        }
        return 0;
    } catch (error) {
        console.error("Erro no VirusTotal:", error);
        return 0;
    }
}

// 3. FUNÇÃO QUE CAPTURA O LEAD
async function capturarLead(dominio, score, statusSSL, reputacao) {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        const ip = data.ip || 'Não identificado';
        const local = `${data.city || ''}, ${data.region || ''} - ${data.country_name || ''}`;

        // Salvamos também a reputação para você ver no painel de leads depois
        await _supabase
            .from('leads')
            .insert([{
                dominio: dominio,
                ip_usuario: ip,
                localizacao: local,
                score: score,
                status_ssl: statusSSL,
                reputacao: reputacao > 0 ? `🚨 ${reputacao} Alertas` : "✅ Limpo"
            }]);
            
        console.log("Lead blindado e salvo com sucesso!");
    } catch (err) {
        console.error('Erro na captura:', err);
    }
}

// 4. ATUALIZA O ANO NO RODAPÉ
document.addEventListener('DOMContentLoaded', () => {
    const footer = document.querySelector('footer p');
    if (footer) {
        const anoAtual = new Date().getFullYear();
        footer.innerHTML = `&copy; ${anoAtual} WL TEC - Wiliam Longo. Todos os direitos reservados.`;
    }
});

// 5. FUNÇÃO PRINCIPAL DE DIAGNÓSTICO (A BAZUCA ATUALIZADA)
async function iniciarDiagnostico() {
    const dominioInput = document.getElementById('domainInput');
    const dominio = dominioInput.value.trim().toLowerCase();
    const resultArea = document.getElementById('resultArea');

    if (!dominio || !dominio.includes('.') || dominio.length < 4) {
        alert("Por favor, digite um domínio válido.");
        return;
    }

    resultArea.classList.remove('result-hidden');
    resultArea.innerHTML = `
        <div style="padding: 20px;">
            <p style="color: #00FFFF;">Iniciando varredura profunda em: <strong>${dominio}</strong>...</p>
            <div class="loader"></div>
            <p style="font-size: 0.8rem; color: #888;">Consultando bancos de dados internacionais (VirusTotal)...</p>
        </div>
    `;

    try {
        // CANO 1: Chamada à API DNS do Google (DMARC)
        const dmarcRes = await fetch(`https://dns.google/resolve?name=_dmarc.${dominio}&type=TXT`);
        const dmarcData = await dmarcRes.json();
        const temDmarc = dmarcData.Answer && dmarcData.Answer.length > 0;

        // CANO 2: Teste de SSL
        let sslOk = false;
        try {
            await fetch(`https://${dominio}`, { mode: 'no-cors' });
            sslOk = true; 
        } catch (e) {
            sslOk = false;
        }

        // CANO 3: Reputação VirusTotal
        const totalAlertas = await checkReputation(dominio);

        // LÓGICA DE SCORE COMBINADO (Agora com Reputação)
        let scoreFinal = "Crítico";
        let cor = "#FF4444"; 

        if (temDmarc && sslOk && totalAlertas === 0) {
            scoreFinal = "A+";
            cor = "#00FF00"; 
        } else if ((temDmarc || sslOk) && totalAlertas === 0) {
            scoreFinal = "Alerta";
            cor = "#FFFF00"; 
        } else if (totalAlertas > 0) {
            scoreFinal = "RISCO!";
            cor = "#FF0000"; // Vermelho vivo para risco de vírus
        }

        const statusSSLStr = sslOk ? "✅ Ativo" : "❌ Vulnerável";

        // ENVIA PARA O SUPABASE (Incluindo a reputação)
        capturarLead(dominio, scoreFinal, statusSSLStr, totalAlertas);

        setTimeout(() => {
            resultArea.innerHTML = `
                <div style="text-align: left; background: rgba(0,0,0,0.9); padding: 25px; border-left: 5px solid ${cor}; border-radius: 8px; position: relative; border: 1px solid rgba(255,255,255,0.1);">
                    
                    <img src="img/escudo_shiel.png" alt="Shield" style="position: absolute; top: 15px; right: 15px; height: 55px; width: auto; z-index: 10;">
                    
                    <div style="background: ${cor}; color: #000; padding: 5px 10px; border-radius: 4px; font-weight: bold; display: inline-block; margin-bottom: 10px;">SCORE: ${scoreFinal}</div>
                    
                    <h3 style="color: ${cor}; margin-top: 0; font-family: 'Rajdhani', sans-serif;">Relatório Longo Shield: ${dominio}</h3>
                    
                    <p style="margin: 10px 0;">🛡️ <strong>E-mail (DMARC):</strong> ${temDmarc ? '✅ Configurado' : '❌ Vulnerável'}</p>
                    <p style="margin: 10px 0;">🔒 <strong>Cadeado (SSL):</strong> ${statusSSLStr}</p>
                    <p style="margin: 10px 0;">☣️ <strong>Reputação:</strong> ${totalAlertas > 0 ? `<span style="color: #FF4444;">🚨 ${totalAlertas} Scanners Detectaram Ameaça</span>` : '✅ Domínio Limpo'}</p>
                    
                    <hr style="border: 0.5px solid #333; margin: 15px 0;">
                    
                    <p style="color: #e0e0e0; font-size: 0.95rem; line-height: 1.4;">
                        ${totalAlertas > 0 
                            ? "<strong>ALERTA DE SEGURANÇA:</strong> Este domínio está em listas negras de malware/phishing." 
                            : scoreFinal === 'A+' 
                                ? "Parabéns! Sua infraestrutura segue protocolos de elite." 
                                : "<strong>Diagnóstico:</strong> Identificamos brechas que podem facilitar ataques e fraudes."}
                    </p>
                    
                    <button onclick="window.open('https://wa.me/5511995314831', '_blank')"
                            style="width: 100%; margin-top: 20px; background: ${cor}; color: #000; border: none; padding: 15px; font-weight: bold; font-family: 'Rajdhani', sans-serif; text-transform: uppercase; cursor: pointer; border-radius: 4px; transition: 0.3s;">
                        ${scoreFinal === 'A+' ? 'Manter Blindagem' : 'Solicitar Correção Imediata'}
                    </button>
                </div>
            `;
        }, 1500);

    } catch (error) {
        resultArea.innerHTML = `<p style="color: #FF4444; padding: 20px;">Erro na varredura. Tente novamente.</p>`;
        console.error("Erro na consulta:", error);
    }
}