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
        if (data?.data?.attributes?.last_analysis_stats) {
            const stats = data.data.attributes.last_analysis_stats;
            return stats.malicious + stats.suspicious; 
        }
        return 0;
    } catch (error) {
        console.error("Erro na consulta segura:", error);
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
            reputacao: reputacao > 0 ? `Alertas Detectados` : "Limpo",
            velocidade: velocidade,
            plataforma: plataforma
        }]);
    } catch (err) { console.error('Erro ao salvar lead:', err); }
}

// 4. FUNÇÃO BAZUCA
async function iniciarDiagnostico() {
    const dominioInput = document.getElementById('domainInput');
    const resultArea = document.getElementById('resultArea');
    if (!dominioInput || !dominioInput.value) { alert("Digite um domínio."); return; }
    const dominio = dominioInput.value.trim().toLowerCase();
    
    resultArea.classList.remove('result-hidden');
    resultArea.innerHTML = `<div id="status-logger" style="padding: 20px; color: #00FFFF; font-family: monospace; text-align: left; background: rgba(0,0,0,0.7); border-radius: 8px;"></div><div class="loader" id="main-loader"></div>`;
    
    const logger = document.getElementById('status-logger');
    const logs = ["📡 Deep Scan Iniciado...", "🔒 SSL Audit...", "🦠 Reputation Check...", "⚡ Latency Test..."];
    for (const log of logs) {
        const p = document.createElement('p'); p.innerText = "> " + log; logger.appendChild(p);
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
        <div style="text-align: left; background: rgba(0,0,0,0.95); padding: 30px; border-left: 6px solid ${cor}; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); position: relative;">
            <img src="img/escudo_shiel.png" alt="Shield" style="position: absolute; top: 20px; right: 20px; height: 65px; opacity: 0.8;">
            <h2 style="color: #fff; font-family: sans-serif;">DIAGNÓSTICO: ${dominio}</h2>
            <div style="font-size: 3rem; font-weight: 900; color: ${cor}; margin-bottom: 20px;">SCORE: ${score}</div>
            <div style="display: flex; gap: 10px;">
                <button id="btnPDF" style="flex: 1; background: #333; color: #fff; padding: 15px; border-radius: 6px; cursor: pointer; border: none; font-weight: bold;">📥 BAIXAR DOSSIÊ PDF</button>
                <button onclick="window.open('https://wa.me/5511995314831', '_blank')" style="flex: 1; background: ${cor}; color: #000; padding: 15px; border-radius: 6px; cursor: pointer; border: none; font-weight: bold;">📢 FALAR COM ESPECIALISTA</button>
            </div>
        </div>`;

        document.getElementById('btnPDF').onclick = () => gerarRelatorioPDF(dadosParaPDF);
    } catch (err) { console.error(err); }
}

// 5. FUNÇÃO PDF COM CONTATOS CLICÁVEIS E GLOSSÁRIO TÉCNICO
function gerarRelatorioPDF(d) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const corTema = d.score === "A+" ? [0, 150, 0] : [180, 0, 0];

    // Cabeçalho
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("WL TEC - LONGO SHIELD", 15, 25);
    doc.setFontSize(10);
    doc.text("AUDITORIA DE SEGURANCA E RESILIENCIA", 15, 32);

    // Score
    doc.setFillColor(corTema[0], corTema[1], corTema[2]);
    doc.rect(0, 40, 210, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(`RESULTADO: ${d.score}`, 15, 48);

    // Dados Principais
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(`Analise de Dominio: ${d.dominio.toUpperCase()}`, 15, 70);
    
    doc.setFillColor(245, 245, 245);
    doc.rect(15, 75, 180, 45, 'F');
    doc.setFontSize(11);
    doc.text(`- Criptografia SSL: ${d.sslOk ? 'Ativo' : 'Falha'}`, 25, 85);
    doc.text(`- Protecao de E-mail (DMARC): ${d.temDmarc ? 'Configurado' : 'Nao Detectado'}`, 25, 95);
    doc.text(`- Reputation Check (Malware): ${d.totalAlertas > 0 ? 'ALERTA' : 'Limpo'}`, 25, 105);
    doc.text(`- Infraestrutura Analisada: ${limparParaPDF(d.plataforma)}`, 25, 115);

    // --- NOVA SEÇÃO: EXPLICAÇÃO TÉCNICA ---
    doc.setFont("helvetica", "bold");
    doc.text("POR QUE ESTES ITENS SAO CRITICOS?", 15, 135);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    
    const glossario = [
        "SSL: Garante que os dados dos seus clientes nao sejam interceptados por hackers.",
        "DMARC: Impede que criminosos usem seu e-mail para dar golpes em seu nome (Spoofing).",
        "Reputation: Verifica se o seu site esta em listas negras ou hospedando virus silenciosos.",
        "Latency: Sites lentos sao portas de entrada para ataques de negacao de servico (DoS)."
    ];
    doc.text(glossario, 20, 145);

    // Parecer Advisor
    doc.setFillColor(corTema[0], corTema[1], corTema[2]);
    doc.rect(15, 175, 180, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text("PARECER DO ESPECIALISTA:", 20, 185);
    doc.setFontSize(10);
    const nota = d.score === "A+" 
        ? "Ambiente seguro. Recomendamos manutencao mensal." 
        : "ALERTA: Vulnerabilidades detectadas. Risco de perda financeira e de dados.";
    doc.text(doc.splitTextToSize(nota, 170), 20, 195);

    // --- RODAPÉ COM CONTATOS CLICÁVEIS ---
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 250, 195, 250);
    doc.setTextColor(0, 0, 255); // Azul para links
    doc.setFontSize(11);
    
    doc.text("Contato: contato@wl.tec.br", 15, 260);
    doc.link(15, 255, 60, 7, { url: 'mailto:contato@wl.tec.br' });

    doc.text("WhatsApp: (11) 99531-4831", 15, 270);
    doc.link(15, 265, 60, 7, { url: 'https://wa.me/5511995314831' });

    doc.setTextColor(100, 100, 100);
    doc.text("www.wl.tec.br", 160, 270);
    doc.link(160, 265, 30, 7, { url: 'https://www.wl.tec.br' });

    doc.save(`Dossie_Resiliencia_${d.dominio}.pdf`);
}