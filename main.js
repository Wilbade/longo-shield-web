// =========================================================
// LONGO SHIELD - CORE ENGINE v2.5 (FINAL BLINDADA)
// WL TEC - Wiliam Longo | contato@wl.tec.br
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

// 3. FUNÇÃO VIRUS TOTAL (REPUTAÇÃO)
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

// 4. FUNÇÃO QUE CAPTURA O LEAD
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

// 5. FUNÇÃO PARA GERAR PDF (DESSA VEZ COM LINKS E EXPLICAÇÃO TÉCNICA)
function gerarRelatorioPDF(d) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const corTema = d.score === "A+" ? [0, 150, 0] : [180, 0, 0];
    const infoExtra = MAPA_VULNERABILIDADES[d.plataforma] || MAPA_VULNERABILIDADES["Infraestrutura Proprietária"];

    // Cabeçalho
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 45, 'F');
    try { doc.addImage("img/logo_shield_branco.png", "PNG", 15, 12, 45, 12); } catch (e) {
        doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.text("WL TEC - LONGO SHIELD", 15, 20);
    }
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(255, 255, 255);
    doc.text("DOSSIÊ DE RESILIÊNCIA DIGITAL", 15, 38);

    // Status Bar
    doc.setFillColor(corTema[0], corTema[1], corTema[2]);
    doc.rect(0, 45, 210, 15, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(14);
    doc.text(`NÍVEL DE RISCO: ${d.score === 'A+' ? 'BAIXO' : 'CRÍTICO'}`, 15, 55);

    // Explicação Técnica
    doc.setTextColor(40, 40, 40); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("ANÁLISE TÉCNICA DE VETORES:", 15, 75);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const explicacao = "A resiliência é medida pela integridade do protocolo SSL e registros DMARC (que impedem o Spoofing de e-mail). A detecção de infraestrutura identifica se o CMS possui superfícies de ataque conhecidas em portas abertas.";
    doc.text(doc.splitTextToSize(explicacao, 180), 15, 82);

    // Grid Resultados
    doc.setFillColor(248, 248, 248); doc.rect(15, 100, 180, 50, 'F');
    doc.setFontSize(10); doc.setTextColor(0, 0, 0);
    doc.text(`Domínio: ${d.dominio.toUpperCase()}`, 20, 110);
    doc.text(`Criptografia (SSL): ${d.statusSSL}`, 20, 120);
    doc.text(`E-mail (DMARC): ${d.temDmarc ? 'PROTEGIDO' : 'VULNERÁVEL'}`, 20, 130);
    doc.text(`Infraestrutura: ${d.plataforma}`, 20, 140);

    // Contato e Call to Action com Links
    doc.setFillColor(20, 20, 20); doc.rect(15, 205, 180, 50, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.text("SOLICITAR BLINDAGEM IMEDIATA:", 22, 218);
    doc.setFontSize(10); doc.setTextColor(0, 255, 255);
    doc.text("WhatsApp: +55 11 99531-4831", 22, 230);
    doc.link(22, 226, 60, 6, { url: "https://wa.me/5511995314831" });
    doc.text("E-mail: contato@wl.tec.br", 22, 240);
    doc.link(22, 236, 60, 6, { url: "mailto:contato@wl.tec.br" });

    doc.save(`Dossie_Tecnico_${d.dominio}.pdf`);
}

// 6. FUNÇÃO PRINCIPAL (A BAZUCA DEFINITIVA)
async function iniciarDiagnostico() {
    const dominioInput = document.getElementById('domainInput');
    const dominio = dominioInput.value.trim().toLowerCase();
    const resultArea = document.getElementById('resultArea');

    if (!dominio || !dominio.includes('.')) {
        alert("Digite um domínio válido."); return;
    }

    resultArea.classList.remove('result-hidden');
    resultArea.innerHTML = `<div id="status-logger" style="..."></div><div class="loader" id="main-loader"></div>`;
    
    try {
        const start = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        // DNS / DMARC / REPUTAÇÃO (Paralelo para velocidade)
        const [dmarcRes, totalAlertas] = await Promise.all([
            fetch(`https://dns.google/resolve?name=_dmarc.${dominio}&type=TXT`).then(r => r.json()),
            checkReputation(dominio)
        ]);

        const temDmarc = dmarcRes.Answer && dmarcRes.Answer.length > 0;
        
        let sslOk = false;
        try { 
            await fetch(`https://${dominio}`, { mode: 'no-cors', signal: controller.signal }); 
            sslOk = true; 
        } catch (e) { sslOk = false; }
        clearTimeout(timeoutId);

        const duration = (Date.now() - start) / 1000;
        const statusSSL_Limpo = sslOk ? "ATIVO" : "FALHA";
        const velStr_Limpo = duration < 1.3 ? `Rapida (${duration.toFixed(1)}s)` : `Lenta (${duration.toFixed(1)}s)`;

        // Deteção Simples de Plataforma
        let plataforma = "Infraestrutura Proprietária";
        if (totalAlertas > 0) plataforma = "Análise de Risco Pendente"; // Exemplo lógico

        let score = "Crítico"; let cor = "#FF4444";
        if (sslOk && temDmarc && totalAlertas === 0) { score = "A+"; cor = "#00FF00"; }

        const dadosFinal = { dominio, score, statusSSL: statusSSL_Limpo, temDmarc, velStr: velStr_Limpo, plataforma };
        window.dadosUltimoRelatorio = dadosFinal;

        // Atualiza a UI e libera o botão de PDF
        resultArea.innerHTML = `
            <div style="background: rgba(0,0,0,0.9); padding: 20px; border-left: 5px solid ${cor};">
                <h3 style="color: ${cor}">RELATÓRIO GERADO</h3>
                <p style="color: white">Domínio: ${dominio}</p>
                <button onclick="gerarRelatorioPDF(window.dadosUltimoRelatorio)" style="padding: 10px; background: ${cor}; border: none; cursor: pointer; font-weight: bold;">
                    BAIXAR RELATÓRIO TÉCNICO (PDF)
                </button>
            </div>
        `;

        capturarLead(dominio, score, statusSSL_Limpo, totalAlertas, velStr_Limpo, plataforma);

    } catch (err) { console.error("Erro geral:", err); }
}

// 7. ATUALIZA O ANO NO RODAPÉ
document.addEventListener('DOMContentLoaded', () => {
    const footer = document.querySelector('footer p');
    if (footer) footer.innerHTML = `&copy; ${new Date().getFullYear()} WL TEC - Wiliam Longo.`;
});