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

// 3. CAPTURA LEAD
async function capturarLead(dominio, score, ssl, reputacao, velocidade, plataforma) {
    try {
        const resIp = await fetch('https://ipapi.co/json/');
        const dataIp = await resIp.json();
        await _supabase.from('leads').insert([{
            dominio: dominio, score: score, status_ssl: ssl,
            reputacao: reputacao > 0 ? "Alertas" : "Limpo",
            velocidade: velocidade, plataforma: plataforma,
            ip_usuario: dataIp.ip || '0.0.0.0',
            localizacao: `${dataIp.city || ''}, ${dataIp.region || ''}`
        }]);
    } catch (err) { console.error('Erro lead:', err); }
}

// 4. FUNÇÃO BAZUCA
async function iniciarDiagnostico() {
    const dominioInput = document.getElementById('domainInput');
    const resultArea = document.getElementById('resultArea');
    if (!dominioInput || !dominioInput.value) return;

    const dominio = dominioInput.value.trim().toLowerCase();
    resultArea.classList.remove('result-hidden');
    resultArea.innerHTML = `<div id="status-logger" style="padding:20px; color:#00FFFF; font-family:monospace; background:rgba(0,0,0,0.7); border-radius:8px;"></div><div class="loader" id="main-loader"></div>`;
    
    const logger = document.getElementById('status-logger');
    const logs = ["> Handshake SSL...", "> Analise DMARC...", "> Reputação Global..."];
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
        const velStr = `Rapida (${duration.toFixed(1)}s)`;

        const dadosParaPDF = { dominio, score, sslOk, totalAlertas, velStr, plataforma, temDmarc };
        capturarLead(dominio, score, sslOk ? "Ativo" : "Falha", totalAlertas, velStr, plataforma);

        document.getElementById('main-loader').remove();
        logger.style.display = 'none';

        resultArea.innerHTML = `
            <div style="text-align: left; background: rgba(0,0,0,0.95); padding: 30px; border-left: 6px solid ${cor}; border-radius: 12px; position: relative;">
                <img src="img/escudo_shiel.png" style="position: absolute; top: 20px; right: 20px; height: 60px; opacity: 0.8;">
                <h2 style="color: #fff;">DOSSIE: ${dominio.toUpperCase()}</h2>
                <div style="font-size: 3rem; font-weight: 900; color: ${cor}; margin-bottom: 20px;">SCORE: ${score}</div>
                <div style="display: flex; gap: 10px;">
                    <button id="btnPDF" style="flex: 1; background: #333; color: #fff; padding: 15px; border-radius: 6px; cursor: pointer; border: none; font-weight: bold;">📥 BAIXAR RELATÓRIO</button>
                    <button onclick="window.open('https://wa.me/5511995314831', '_blank')" style="flex: 1; background: ${cor}; color: #000; padding: 15px; border-radius: 6px; cursor: pointer; border: none; font-weight: bold;">📢 FALAR COM ADVISOR</button>
                </div>
            </div>
        `;

        document.getElementById('btnPDF').onclick = () => gerarRelatorioPDF(dadosParaPDF);
    } catch (error) { resultArea.innerHTML = "Erro na varredura."; }
}

// 5. FUNÇÃO PDF - DESIGN PREMIUM RESTAURADO
function gerarRelatorioPDF(d) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const corTema = d.score === "A+" ? [0, 150, 0] : [180, 0, 0];

    // Cabeçalho Black
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 40, 'F');
    
    try {
        doc.addImage("img/logo_shield_branco.png", "PNG", 15, 12, 45, 12);
    } catch (e) {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text("WL TEC - LONGO SHIELD", 15, 22);
    }

    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180);
    doc.text("RELATORIO TECNICO DE RESILIENCIA DIGITAL", 15, 33);

    // Barra de Status
    doc.setFillColor(corTema[0], corTema[1], corTema[2]);
    doc.rect(0, 40, 210, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(`SCORE FINAL DO DOMINIO: ${d.score}`, 15, 48);

    // Conteúdo Principal
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Analise de Perimetro: ${d.dominio.toUpperCase()}`, 15, 70);
    
    doc.setFillColor(248, 248, 248);
    doc.rect(15, 75, 180, 50, 'F');
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`- Protocolo SSL/TLS: ${d.sslOk ? 'Ativo e Criptografado' : 'FALHA CRITICA'}`, 25, 87);
    doc.text(`- Configuracao DMARC: ${d.temDmarc ? 'Protegido contra Spoofing' : 'VULNERAVEL A FRAUDES'}`, 25, 97);
    doc.text(`- Reputacao VirusTotal: ${d.totalAlertas > 0 ? 'ALERTAS DETECTADOS' : 'Nenhuma Ameaca Encontrada'}`, 25, 107);
    doc.text(`- Motor de Infraestrutura: ${limparParaPDF(d.plataforma)}`, 25, 117);

    // Nova Seção: Notas Técnicas do Advisor
    doc.setFont("helvetica", "bold");
    doc.text("NOTAS TECNICAS DO ADVISOR:", 15, 140);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const notas = [
        "SSL: Garante que os dados trafegados entre o usuario e o servidor sejam ilegiveis para hackers.",
        "DMARC: Politica de autenticacao que impede que criminosos enviem e-mails usando seu dominio oficial.",
        "Reputacao: Varredura em 60+ motores globais para identificar malwares ou comportamento suspeito."
    ];
    doc.text(notas, 15, 150);

    // --- RODAPÉ PREMIUM (BARRA ESCURA) ---
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 260, 210, 37, 'F'); 
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("WL TEC - CONSULTORIA EM CIBERSEGURANCA", 15, 272);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 255, 255); // Ciano para os links clicáveis
    
    doc.text("contato@wl.tec.br", 15, 282);
    doc.link(15, 278, 40, 6, { url: 'mailto:contato@wl.tec.br' });

    doc.text("WhatsApp: (11) 99531-4831", 15, 290);
    doc.link(15, 286, 50, 6, { url: 'https://wa.me/5511995314831' });

    doc.setTextColor(200, 200, 200);
    doc.text("www.wl.tec.br", 165, 290);
    doc.link(165, 286, 30, 6, { url: 'https://www.wl.tec.br' });

    doc.save(`Dossie_Resiliencia_${d.dominio}.pdf`);
}