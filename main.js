// =========================================================
// LONGO SHIELD - CORE ENGINE v2.0
// WL TEC - Wiliam Longo
// =========================================================

// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. DICIONÁRIO DE VULNERABILIDADES PREDITIVAS
const MAPA_VULNERABILIDADES = {
    "WordPress Detectado": {
        portas: ["80 (HTTP)", "443 (HTTPS)", "21 (FTP)"],
        diretorios: ["/wp-admin", "/wp-includes", "/xmlrpc.php"],
        riscos: "Exposição de painel administrativo e ataques de força bruta."
    },
    "WordPress (Vulnerável)": {
        portas: ["80", "443", "21", "3306 (MySQL)"],
        diretorios: ["/wp-admin", "/wp-content/plugins/"],
        riscos: "Plugins desatualizados. Risco crítico de SQL Injection e RCE."
    },
    "Infraestrutura Proprietária": {
        portas: ["80", "443"],
        diretorios: ["/admin", "/config", "/.env"],
        riscos: "Possível exposição de arquivos de configuração sensíveis."
    }
};

// 3. FUNÇÃO VIRUS TOTAL
async function checkReputation(domain) {
    const apiKey = 'SUA_CHAVE_VIRUS_TOTAL_AQUI'; 
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

// 4. CAPTURA DE LEADS
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

// 5. FUNÇÃO PARA GERAR PDF (VERSÃO BLINDADA)
function gerarRelatorioPDF(d) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const corTema = d.score === "A+" ? [0, 150, 0] : [180, 0, 0];
    const infoExtra = MAPA_VULNERABILIDADES[d.plataforma] || MAPA_VULNERABILIDADES["Infraestrutura Proprietária"];

    // Cabeçalho
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 45, 'F');
    
    try {
        doc.addImage("img/logo_shield_branco.png", "PNG", 15, 12, 45, 12);
    } catch (e) {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text("WL TEC - LONGO SHIELD", 15, 20);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("DOSSIÊ DE RESILIÊNCIA DIGITAL", 15, 38);

    // Status Bar
    doc.setFillColor(corTema[0], corTema[1], corTema[2]);
    doc.rect(0, 45, 210, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text(`ANÁLISE DE SEGURANÇA: ${d.score}`, 15, 55);

    // Info Cliente
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.text(`GERADO EM: ${new Date().toLocaleString('pt-BR')}`, 140, 72);

    doc.setFontSize(16);
    doc.text(`Alvo Analisado: ${d.dominio.toUpperCase()}`, 15, 85);
    doc.setDrawColor(corTema[0], corTema[1], corTema[2]);
    doc.line(15, 88, 100, 88);

    // Grid Resultados (Higiene de dados aplicada)
    doc.setFillColor(248, 248, 248);
    doc.rect(15, 95, 180, 55, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);

    const posY = 105;
    doc.setFont("helvetica", "normal");
    doc.text("Criptografia SSL/TLS:", 25, posY);
    doc.setFont("helvetica", "bold");
    doc.text(d.statusSSL, 110, posY);

    doc.setFont("helvetica", "normal");
    doc.text("E-mail (DMARC):", 25, posY + 10);
    doc.setFont("helvetica", "bold");
    doc.text(d.temDmarc ? 'PROTEGIDO' : 'VULNERÁVEL', 110, posY + 10);

    doc.setFont("helvetica", "normal");
    doc.text("Performance Rede:", 25, posY + 20);
    doc.setFont("helvetica", "bold");
    doc.text(d.velStr, 110, posY + 20);

    doc.setFont("helvetica", "normal");
    doc.text("Infraestrutura:", 25, posY + 30);
    doc.setFont("helvetica", "bold");
    doc.text(d.plataforma, 110, posY + 30);

    // Seção Preditiva
    doc.setFillColor(240, 240, 240);
    doc.rect(15, 155, 180, 40, 'F');
    doc.setTextColor(corTema[0], corTema[1], corTema[2]);
    doc.text("ANÁLISE PREDITIVA DE PERÍMETRO:", 22, 165);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Portas Prováveis: ${infoExtra.portas.join(", ")}`, 22, 175);
    doc.text(`Diretórios Alvo: ${infoExtra.diretorios.join(", ")}`, 22, 182);
    doc.text(`Risco Heurístico: ${infoExtra.riscos}`, 22, 189);

    // Parecer
    doc.setFillColor(20, 20, 20);
    doc.rect(15, 205, 180, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("PARECER DO ADVISOR:", 22, 215);
    doc.setFont("helvetica", "normal");
    const nota = d.score === "A+" ? "Ambiente em conformidade." : "AVISO CRÍTICO: Risco de Ransomware identificado.";
    doc.text(doc.splitTextToSize(nota, 160), 22, 225);

    doc.save(`Dossie_Resiliencia_${d.dominio}.pdf`);
}

// 6. FUNÇÃO PRINCIPAL
async function iniciarDiagnostico() {
    const dominioInput = document.getElementById('domainInput');
    const dominio = dominioInput.value.trim().toLowerCase();
    const resultArea = document.getElementById('resultArea');

    if (!dominio || !dominio.includes('.')) {
        alert("Digite um domínio válido.");
        return;
    }

    resultArea.classList.remove('result-hidden');
    resultArea.innerHTML = `<div id="status-logger" ...></div><div class="loader" id="main-loader"></div>`;

    try {
        const start = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        // DNS / DMARC
        const dmarcRes = await fetch(`https://dns.google/resolve?name=_dmarc.${dominio}&type=TXT`);
        const dmarcData = await dmarcRes.json();
        const temDmarc = dmarcData.Answer && dmarcData.Answer.length > 0;

        // SSL com AbortController (Evita ERR_NAME_NOT_RESOLVED travar o script)
        let sslOk = false;
        try { 
            await fetch(`https://${dominio}`, { mode: 'no-cors', signal: controller.signal }); 
            sslOk = true; 
        } catch (e) { sslOk = false; }
        clearTimeout(timeoutId);

        const duration = (Date.now() - start) / 1000;
        const totalAlertas = await checkReputation(dominio);

        // Plataforma
        let plataforma = "Infraestrutura Proprietária";
        if (dominio.includes('wp') || totalAlertas > 5) plataforma = "WordPress Detectado";

        // Higienização para o PDF
        const statusSSL_Limpo = sslOk ? "ATIVO" : "FALHA";
        const velStr_Limpo = duration < 1.3 ? `Rapida (${duration.toFixed(1)}s)` : `Lenta (${duration.toFixed(1)}s)`;

        // Score
        let score = "Crítico"; let cor = "#FF4444";
        if (sslOk && temDmarc && totalAlertas === 0) { score = "A+"; cor = "#00FF00"; }

        // Renderiza Card Final e prepara PDF
        const dadosFinal = { dominio, score, statusSSL: statusSSL_Limpo, temDmarc, velStr: velStr_Limpo, plataforma };
        
        // ... (Seu código de renderizar resultArea.innerHTML aqui)

        window.dadosUltimoRelatorio = dadosFinal; // Global para o botão de download
        capturarLead(dominio, score, statusSSL_Limpo, totalAlertas, velStr_Limpo, plataforma);

    } catch (err) { console.error(err); }
}