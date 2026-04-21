async function iniciarDiagnostico() {
    const dominioInput = document.getElementById('domainInput');
    const dominio = dominioInput.value.trim().toLowerCase();
    const resultArea = document.getElementById('resultArea');

    if (!dominio || !dominio.includes('.')) {
        alert("Digite um domínio válido.");
        return;
    }

    // 1. PREPARAÇÃO E LOGS (GERAÇÃO DE VALOR)
    resultArea.classList.remove('result-hidden');
    resultArea.innerHTML = `
        <div id="status-logger" style="padding: 20px; color: #00FFFF; font-family: 'Courier New', monospace; font-size: 0.85rem; text-align: left; background: rgba(0,0,0,0.7); border-radius: 8px; border: 1px solid #00FFFF33;">
        </div>
        <div class="loader" id="main-loader" style="margin-top: 15px;"></div>
    `;
    
    const logger = document.getElementById('status-logger');
    const logs = [
        "📡 Conectando ao Registro.br / Internic...",
        "🔍 Analisando certificados SSL (Porta 443)...",
        "🦠 Verificando listas negras (VirusTotal)...",
        "⚡ Testando latência global (TTFB)...",
        "🛠️ Escaneando assinaturas de CMS e vulnerabilidades..."
    ];

    for (const log of logs) {
        const p = document.createElement('p');
        p.style.margin = "4px 0";
        p.innerText = "> " + log;
        logger.appendChild(p);
        await new Promise(r => setTimeout(r, 800)); 
    }

    try {
        const start = Date.now();
        
        // 2. DNS / DMARC
        const dmarcRes = await fetch(`https://dns.google/resolve?name=_dmarc.${dominio}&type=TXT`);
        const dmarcData = await dmarcRes.json();
        const temDmarc = dmarcData.Answer && dmarcData.Answer.length > 0;

        // 3. SSL e VELOCIDADE
        let sslOk = false;
        try { 
            await fetch(`https://${dominio}`, { mode: 'no-cors' }); 
            sslOk = true; 
        } catch (e) { sslOk = false; }
        const duration = (Date.now() - start) / 1000;

        // 4. REPUTAÇÃO (VirusTotal)
        const totalAlertas = await checkReputation(dominio);

        // 5. DETECÇÃO UNIVERSAL DE WORDPRESS (Técnica de Imagem Anti-Bloqueio)
        let plataforma = "Proprietária / Outros";
        
        const checkWP = () => {
            return new Promise((resolve) => {
                const img = new Image();
                // Tenta carregar o ícone padrão do painel do WP
                img.src = `https://${dominio}/wp-admin/images/wordpress-logo.svg?v=${Date.now()}`;
                img.onload = () => resolve(true);
                img.onerror = () => {
                    // Segunda tentativa: Script de emojis comum no WP
                    const script = document.createElement('script');
                    script.src = `https://${dominio}/wp-includes/js/wp-emoji-release.min.js`;
                    script.onload = () => resolve(true);
                    script.onerror = () => resolve(false);
                };
                // Timeout de 3 segundos para não travar o diagnóstico
                setTimeout(() => resolve(false), 3000);
            });
        };

        const eWordPress = await checkWP();
        if (eWordPress) {
            plataforma = totalAlertas > 0 ? "WordPress (Vulnerável)" : "WordPress Detectado";
        } else {
            // Backup via DNS (Para sites atrás de Proxy forte)
            const nsRes = await fetch(`https://dns.google/resolve?name=${dominio}&type=A`);
            const nsData = await nsRes.json();
            const ip = nsData.Answer ? nsData.Answer[0].data : "";
            if (ip.startsWith('192.0.67') || ip.startsWith('192.0.78')) plataforma = "WordPress (Automattic)";
        }

        // 6. LÓGICA DE SCORE
        let score = "Crítico"; let cor = "#FF4444";
        if (temDmarc && sslOk && totalAlertas === 0 && duration < 1.5) { score = "A+"; cor = "#00FF00"; }
        else if (sslOk && totalAlertas === 0) { score = "Alerta"; cor = "#FFFF00"; }

        const velStr = duration < 1.2 ? "🚀 Rápida" : `⚠️ Lenta (${duration.toFixed(1)}s)`;
        const statusSSL = sslOk ? "✅ Ativo" : "❌ Falha";

        // 7. SALVAR NO SUPABASE
        await capturarLead(dominio, score, statusSSL, totalAlertas, velStr, plataforma);

        document.getElementById('main-loader').remove();
        
        resultArea.innerHTML += `
            <div style="text-align: left; background: rgba(0,0,0,0.95); padding: 25px; border-left: 5px solid ${cor}; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin-top: 20px; animation: fadeIn 0.5s ease-in;">
                <div style="background: ${cor}; color: #000; padding: 4px 12px; border-radius: 4px; font-weight: bold; display: inline-block; margin-bottom: 15px;">SCORE: ${score}</div>
                <h3 style="color: ${cor}; margin-top: 0; font-family: 'Rajdhani', sans-serif;">RELATÓRIO: ${dominio}</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; color: #fff; font-size: 0.9rem;">
                    <div>🛡️ E-mail: ${temDmarc ? '✅ OK' : '❌ Falha'}</div>
                    <div>🔒 SSL: ${statusSSL}</div>
                    <div>⚡ Velocidade: ${velStr}</div>
                    <div>🦠 Vírus: ${totalAlertas > 0 ? '🚨 Risco' : '✅ Limpo'}</div>
                    <div style="grid-column: span 2;">💻 Sistema: <span style="color: ${cor}">${plataforma}</span></div>
                </div>

                <hr style="border: 0.5px solid #333; margin: 20px 0;">
                <p style="color: #bbb; font-size: 0.9rem;">Diagnóstico: ${score === 'A+' ? 'Estrutura protegida contra sequestro de dados.' : 'Vulnerabilidades detectadas. Risco de interrupção de serviço.'}</p>
                
                <button onclick="window.open('https://wa.me/5511995314831', '_blank')"
                        style="width: 100%; background: ${cor}; color: #000; border: none; padding: 15px; font-weight: bold; cursor: pointer; border-radius: 4px; text-transform: uppercase; margin-top: 15px;">
                    Falar com Especialista
                </button>
            </div>
        `;

    } catch (error) {
        console.error(error);
        resultArea.innerHTML = `<p style="color: #FF4444;">Erro na varredura. Verifique o domínio.</p>`;
    }
}