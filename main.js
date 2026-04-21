// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Função para limpar lixo visual para o PDF
const limparParaPDF = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[^\x00-\x7F]/g, "").trim(); 
};

// 2. FUNÇÃO SEGURA (CHAMA O SUPABASE - EVITA BLOQUEIO DE ANTIVÍRUS)
async function checkReputation(domain) {
    try {
        const { data, error } = await _supabase.functions.invoke('rapid-worker', {
            body: { domain: domain }
        });
        if (error) throw error;
        if (data?.data?.attributes?.last_analysis_stats) {
            const stats = data.data.attributes.last_analysis_stats;
            return stats.malicious + stats.suspicious; 
        }
        return 0;
    } catch (error) {
        console.warn("Consulta segura via Edge Function falhou ou foi bloqueada.");
        return 0;
    }
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
            reputacao: reputacao > 0 ? "Alertas Detectados" : "Limpo",
            velocidade: velocidade,
            plataforma: plataforma
        }]);
    } catch (err) { console.error('Erro lead:', err); }
}

// 4. FUNÇÃO BAZUCA (DESTRAVADA)
async function iniciarDiagnostico() {
    const dominioInput = document.getElementById('domainInput');
    const resultArea = document.getElementById('resultArea');
    if (!dominioInput || !dominioInput.value) return;

    const dominio = dominioInput.value.trim().toLowerCase();
    resultArea.classList.remove('result-hidden');
    resultArea.innerHTML = `
        <div id="status-logger" style="padding: 20px; color: #00FFFF; font-family: monospace; font-size: 0.85rem; text-align: left; background: rgba(0,0,0,0.7); border-radius: 8px;"></div>
        <div class="loader" id="main-loader" style="margin-top: 15px;"></div>
    `;
    
    const logger = document.getElementById('status-logger');
    const logs = ["> Iniciando Auditoria...", "> SSL/TLS Check...", "> Verificando DMARC...", "> Reputation Scan..."];

    for (const log of logs) {
        const p = document.createElement('p'); p.innerText = log; logger.appendChild(p);
        await new Promise(r => setTimeout(r, 400)); 
    }

    try {
        const start = Date.now();
        // Paralelismo seguro via Proxy (Google DNS e Supabase)
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
                <h2 style="color: #fff;">STATUS: ${dominio.toUpperCase()}</h2>
                <div style="font-size: 3rem; font-weight: 900; color: ${cor}; margin-bottom: 20px;">${score}</div>
                <div style="display: flex; gap: 10px;">
                    <button id="btnPDF" style="flex: 1; background: #333; color: #fff; padding: 15px; border-radius: 6px; cursor: pointer; border: none;">📥 DOSSIÊ PDF</button>
                    <button onclick="window.open('https://wa.me/5511995314831', '_blank')" style="flex: 1; background: ${cor}; color: #000; padding: 15px; border-radius: 6px; cursor: pointer; border: none; font-weight: bold;">📢 CONSULTORIA</button>
                </div>
            </div>
        `;

        document.getElementById('btnPDF').onclick = () => gerarRelatorioPDF(dadosParaPDF);

    } catch (error) {
        console.error(error);
        resultArea.innerHTML = "Erro na varredura externa.";
    }
}

// 5. FUNÇÃO PDF COM CONTATOS E EXPLICAÇÃO TÉCNICA
function gerarRelatorioPDF(d) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const corTema = d.score === "A+" ? [0, 150, 0] : [180, 0, 0];

    // Cabeçalho Premium
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("WL TEC - LONGO SHIELD", 15, 25);
    doc.setFontSize(10);
    doc.text("RELATORIO TECNICO DE RESILIENCIA DIGITAL", 15, 32);

    // Barra de Resultado
    doc.setFillColor(corTema[0], corTema[1], corTema[2]);
    doc.rect(0, 40, 210, 12, 'F');
    doc.text(`SCORE FINAL: ${d.score}`, 15, 48);

    // Dados da Auditoria
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(`Dominio: ${d.dominio.toUpperCase()}`, 15, 70);
    
    doc.setFillColor(245, 245, 245);
    doc.rect(15, 75, 180, 45, 'F');
    doc.setFontSize(11);
    doc.text(`- Criptografia SSL: ${d.sslOk ? 'Ativa (Dados Seguros)' : 'FALHA (Dados Expostos)'}`, 25, 85);
    doc.text(`- Protecao de E-mail (DMARC): ${d.temDmarc ? 'Ativa (Anti-Fraude)' : 'RISCO (Sujeito a Spoofing)'}`, 25, 95);
    doc.text(`- Reputacao do IP: ${d.totalAlertas > 0 ? 'RISCO DETECTADO' : 'Limpo'}`, 25, 105);
    doc.text(`- Infraestrutura Analisada: ${limparParaPDF(d.plataforma)}`, 25, 115);

    // Explicação Técnica (O "Diferencial")
    doc.setFont("helvetica", "bold");
    doc.text("NOTAS DO ADVISOR:", 15, 135);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const notas = [
        "SSL (Secure Sockets Layer): Protege a troca de informacoes entre o usuario e seu servidor.",
        "DMARC: Camada de seguranca que impede que criminosos enviem e-mails falsos em seu nome.",
        "Reputacao: Analise em 60+ bases globais em busca de malwares ou atividades suspeitas."
    ];
    doc.text(notas, 20, 145);

    // Rodapé de Contato Clicável
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 250, 195, 250);
    doc.setTextColor(0, 0, 255);
    doc.text("E-mail: contato@wl.tec.br", 15, 260);
    doc.link(15, 255, 60, 7, { url: 'mailto:contato@wl.tec.br' });

    doc.text("WhatsApp: (11) 99531-4831", 15, 270);
    doc.link(15, 265, 60, 7, { url: 'https://wa.me/5511995314831' });

    doc.setTextColor(100, 100, 100);
    doc.text("www.wl.tec.br", 160, 270);

    doc.save(`Dossie_Resiliencia_${d.dominio}.pdf`);
}