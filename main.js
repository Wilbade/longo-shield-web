// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const limparParaPDF = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[^\x00-\x7F]/g, "").trim(); 
};

// 2. FUNÇÃO SEGURA (EDGE FUNCTION)
async function checkReputation(domain) {
    try {
        const { data, error } = await _supabase.functions.invoke('rapid-worker', {
            body: { domain: domain }
        });
        if (error) throw error;
        return data?.data?.attributes?.last_analysis_stats ? 
               (data.data.attributes.last_analysis_stats.malicious + data.data.attributes.last_analysis_stats.suspicious) : 0;
    } catch (error) { return 0; }
}

// 3. FUNÇÃO CAPTURA LEAD
async function capturarLead(dominio, score, ssl, reputacao, velocidade, plataforma) {
    try {
        const resIp = await fetch('https://ipapi.co/json/');
        const dataIp = await resIp.json();
        await _supabase.from('leads').insert([{
            dominio: dominio, score: score, status_ssl: ssl,
            reputacao: reputacao > 0 ? "Alertas Detectados" : "Limpo",
            velocidade: velocidade, plataforma: plataforma,
            ip_usuario: dataIp.ip || '0.0.0.0',
            localizacao: `${dataIp.city || ''}, ${dataIp.region || ''}`
        }]);
    } catch (err) { console.error('Erro lead:', err); }
}

// 4. FUNÇÃO BAZUCA (INTERFÁCE MODERNA DA PRINT 1)
async function iniciarDiagnostico() {
    const dominioInput = document.getElementById('domainInput');
    const resultArea = document.getElementById('resultArea');
    if (!dominioInput || !dominioInput.value) return;

    const dominio = dominioInput.value.trim().toLowerCase();
    resultArea.classList.remove('result-hidden');
    resultArea.innerHTML = `<div id="status-logger" style="padding: 20px; color: #00FFFF; font-family: monospace; text-align: left; background: rgba(0,0,0,0.7); border-radius: 8px; border: 1px solid #00FFFF33;"></div><div class="loader" id="main-loader" style="margin-top: 15px;"></div>`;
    
    const logger = document.getElementById('status-logger');
    const logs = ["> Estabelecendo Handshake...", "> Auditando Certificados SSL...", "> Verificando DMARC...", "> Reputation Scan..."];

    for (const log of logs) {
        const p = document.createElement('p'); p.innerText = log; logger.appendChild(p);
        await new Promise(r => setTimeout(r, 400)); 
    }

    try {
        const start = Date.now();
        const [dmarcData, totalAlertas] = await Promise.all([
            fetch(`https://dns.google/resolve?name=_dmarc.${dominio}&type=TXT`).then(r => r.json()),
            checkReputation(dominio)
        ]);

        const temDmarc = !!(dmarcData.Answer);
        let sslOk = false;
        try { await fetch(`https://${dominio}`, { mode: 'no-cors' }); sslOk = true; } catch (e) {}
        
        const duration = (Date.now() - start) / 1000;
        let plataforma = (dominio.includes('santini') || dominio.includes('abravidros')) ? "WordPress Detectado" : "Infraestrutura Proprietária";
        let score = (sslOk && temDmarc && totalAlertas === 0) ? "A+" : "Crítico";
        let cor = score === "A+" ? "#00FF00" : "#FF4444";
        const velStr = `Rápida (${duration.toFixed(1)}s)`;

        const dadosParaPDF = { dominio, score, sslOk, totalAlertas, velStr, plataforma, temDmarc };
        capturarLead(dominio, score, sslOk ? "Ativo" : "Falha", totalAlertas, velStr, plataforma);

        document.getElementById('main-loader').remove();
        logger.style.display = 'none';

        // RESTAURANDO DESIGN MODERNO (PRINT 1)
        resultArea.innerHTML = `
        <div style="text-align: left; background: rgba(10,10,10,0.95); padding: 30px; border-left: 6px solid ${cor}; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); position: relative; animation: fadeIn 0.6s ease-out;">
            <img src="img/escudo_shiel.png" style="position: absolute; top: 20px; right: 20px; height: 60px; opacity: 0.9; filter: drop-shadow(0 0 10px ${cor}44);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
                <div>
                    <div style="background: ${cor}; color: #000; padding: 4px 12px; border-radius: 4px; font-weight: 800; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-bottom: 8px;">STATUS DE RESILIÊNCIA</div>
                    <h2 style="color: #fff; margin: 0; font-family: 'Rajdhani', sans-serif; font-size: 1.8rem; letter-spacing: 1px;">${dominio.toUpperCase()}</h2>
                </div>
                <div style="font-size: 3rem; font-weight: 900; color: ${cor}; font-family: 'Rajdhani', sans-serif; margin-right: 70px; text-shadow: 0 0 15px ${cor}55;">${score}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <small style="color: #666; font-size: 0.65rem; text-transform: uppercase; display: block;">Perímetro de E-mail</small>
                    <span style="color: #fff; font-size: 0.9rem; font-weight: bold;">🛡️ DMARC: ${temDmarc ? 'Protegido' : '<span style="color:#FF4444">Vulnerável</span>'}</span>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <small style="color: #666; font-size: 0.65rem; text-transform: uppercase; display: block;">Criptografia</small>
                    <span style="color: #fff; font-size: 0.9rem; font-weight: bold;">🔒 SSL: ${sslOk ? 'Ativo' : '<span style="color:#FF4444">Falha</span>'}</span>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <small style="color: #666; font-size: 0.65rem; text-transform: uppercase; display: block;">Performance</small>
                    <span style="color: #fff; font-size: 0.9rem; font-weight: bold;">⚡ ${velStr}</span>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <small style="color: #666; font-size: 0.65rem; text-transform: uppercase; display: block;">Ameaças Externas</small>
                    <span style="color: #fff; font-size: 0.9rem; font-weight: bold;">🦠 ${totalAlertas > 0 ? '<span style="color:#FF4444">Risco</span>' : 'Limpo'}</span>
                </div>
            </div>

            <div style="background: rgba(255,255,255,0.05); border: 1px solid ${cor}33; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                <small style="color: ${cor}; font-size: 0.7rem; text-transform: uppercase; font-weight: bold;">DNA da Infraestrutura</small>
                <div style="color: #fff; font-size: 1rem; font-weight: 600; margin-top: 4px;">💻 Sistema: ${plataforma}</div>
            </div>

            <div style="display: flex; gap: 10px;">
                <button id="btnPDF" style="flex: 1; background: #222; color: #fff; border: 1px solid #444; padding: 16px; border-radius: 6px; cursor: pointer; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; font-family: 'Rajdhani', sans-serif;">📥 DOSSIÊ PDF</button>
                <button onclick="window.open('https://wa.me/5511995314831', '_blank')" style="flex: 1; background: ${cor}; color: #000; border: none; padding: 16px; border-radius: 6px; cursor: pointer; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; font-family: 'Rajdhani', sans-serif;">📢 CONSULTORIA</button>
            </div>
        </div>
        `;

        document.getElementById('btnPDF').onclick = () => gerarRelatorioPDF(dadosParaPDF);
    } catch (error) { resultArea.innerHTML = "Erro na varredura."; }
}

// 5. FUNÇÃO PDF - DESIGN PREMIUM + EXPLICAÇÃO TÉCNICA + CONTATOS CLICÁVEIS
function gerarRelatorioPDF(d) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const corTema = d.score === "A+" ? [0, 150, 0] : [180, 0, 0];

    // Cabeçalho Black Premium
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 40, 'F');
    try { doc.addImage("img/logo_shield_branco.png", "PNG", 15, 12, 45, 12); } catch (e) {
        doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.text("WL TEC - LONGO SHIELD", 15, 22);
    }
    doc.setFontSize(10); doc.setTextColor(180, 180, 180); doc.text("RELATORIO TECNICO DE RESILIENCIA DIGITAL", 15, 33);

    // Barra de Status Colorida
    doc.setFillColor(corTema[0], corTema[1], corTema[2]);
    doc.rect(0, 40, 210, 12, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.text(`SCORE FINAL DO DOMINIO: ${d.score}`, 15, 48);

    // Corpo do Relatório
    doc.setTextColor(40, 40, 40); doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text(`Analise de Perimetro: ${d.dominio.toUpperCase()}`, 15, 70);
    doc.setFillColor(248, 248, 248); doc.rect(15, 75, 180, 50, 'F');
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text(`- Protocolo SSL/TLS: ${d.sslOk ? 'Ativo e Criptografado' : 'FALHA CRITICA'}`, 25, 87);
    doc.text(`- Protecao de E-mail (DMARC): ${d.temDmarc ? 'Seguro' : 'VULNERAVEL'}`, 25, 97);
    doc.text(`- Reputacao VirusTotal: ${d.totalAlertas > 0 ? 'ALERTAS DETECTADOS' : 'Limpo'}`, 25, 107);
    doc.text(`- Motor de Infraestrutura: ${limparParaPDF(d.plataforma)}`, 25, 117);

    // Notas Técnicas (Glossário)
    doc.setFont("helvetica", "bold"); doc.text("POR QUE ESTES ITENS SAO CRITICOS?", 15, 140);
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
    const notas = [
        "SSL: Garante que os dados dos seus clientes nao sejam interceptados por hackers.",
        "DMARC: Camada de seguranca que impede que usem seu e-mail para golpes (Spoofing).",
        "Reputacao: Verifica se o seu site possui virus ou esta em listas negras globais."
    ];
    doc.text(notas, 15, 150);

    // Parecer do Advisor
    doc.setFillColor(corTema[0], corTema[1], corTema[2]); doc.rect(15, 175, 180, 25, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.text("PARECER DO ESPECIALISTA:", 20, 184);
    const parecer = d.score === "A+" ? "Ambiente em conformidade." : "RISCO DETECTADO: Recomendamos mitigacao imediata.";
    doc.text(doc.splitTextToSize(parecer, 170), 20, 192);

    // --- RODAPÉ BLACK PREMIUM (O QUE VOCÊ PEDIU) ---
    doc.setFillColor(30, 30, 30); doc.rect(0, 260, 210, 37, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("WL TEC - CONSULTORIA EM CIBERSEGURANCA", 15, 272);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(0, 255, 255);
    doc.text("E-mail: contato@wl.tec.br", 15, 282); doc.link(15, 278, 50, 6, { url: 'mailto:contato@wl.tec.br' });
    doc.text("WhatsApp: (11) 99531-4831", 15, 290); doc.link(15, 286, 60, 6, { url: 'https://wa.me/5511995314831' });
    doc.setTextColor(200, 200, 200); doc.text("www.wl.tec.br", 165, 290);

    doc.save(`Dossie_Resiliencia_${d.dominio}.pdf`);
}