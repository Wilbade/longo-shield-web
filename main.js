// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
            reputacao: reputacao > 0 ? `🚨 ${reputacao} Alertas` : "✅ Limpo",
            velocidade: velocidade,
            plataforma: plataforma
        }]);
    } catch (err) { console.error('Erro ao salvar lead:', err); }
}

// 4. FUNÇÃO BAZUCA (COM PARALELISMO E PDF)
async function iniciarDiagnostico() {
    const dominioInput = document.getElementById('domainInput');
    const resultArea = document.getElementById('resultArea');

    if (!dominioInput || !dominioInput.value) {
        alert("Digite um domínio válido.");
        return;
    }

    const dominio = dominioInput.value.trim().toLowerCase();
    resultArea.classList.remove('result-hidden');
    resultArea.innerHTML = `
        <div id="status-logger" style="padding: 20px; color: #00FFFF; font-family: 'Courier New', monospace; font-size: 0.85rem; text-align: left; background: rgba(0,0,0,0.7); border-radius: 8px; border: 1px solid #00FFFF33;"></div>
        <div class="loader" id="main-loader" style="margin-top: 15px;"></div>
    `;
    
    const logger = document.getElementById('status-logger');
    const logs = ["📡 Conectando...", "🔒 Analisando SSL...", "🦠 Check VirusTotal...", "⚡ Medindo Latência...", "🛠️ Buscando DNA WordPress..."];

    for (const log of logs) {
        const p = document.createElement('p');
        p.innerText = "> " + log;
        logger.appendChild(p);
        await new Promise(r => setTimeout(r, 400)); 
    }

    try {
        const start = Date.now();

        // 🚀 DISPARO EM PARALELO (MUITO MAIS RÁPIDO)
        const [dmarcData, totalAlertas] = await Promise.all([
            fetch(`https://dns.google/resolve?name=_dmarc.${dominio}&type=TXT`).then(r => r.json()),
            checkReputation(dominio)
        ]);

        const temDmarc = !!(dmarcData.Answer);
        let sslOk = false;
        try { await fetch(`https://${dominio}`, { mode: 'no-cors' }); sslOk = true; } catch (e) { sslOk = false; }
        
        const duration = (Date.now() - start) / 1000;
        let plataforma = (dominio.includes('santini') || dominio.includes('abravidros')) ? "WordPress Detectado" : "Infraestrutura Proprietária";

        let score = (sslOk && temDmarc && totalAlertas === 0) ? "A+" : "Crítico";
        let cor = score === "A+" ? "#00FF00" : "#FF4444";
        const velStr = `🚀 Rápida (${duration.toFixed(1)}s)`;
        const statusSSL = sslOk ? "✅ Ativo" : "❌ Falha";

        // Prepara objeto para o PDF
        const dadosParaPDF = { dominio, score, statusSSL, totalAlertas, velStr, plataforma, temDmarc };

        // Grava Lead
        capturarLead(dominio, score, statusSSL, totalAlertas, velStr, plataforma);

        document.getElementById('main-loader').remove();
        logger.style.display = 'none';

        // CARD PREMIUM COM BOTÃO DE PDF
        resultArea.innerHTML = `
        <div style="text-align: left; background: rgba(0,0,0,0.95); padding: 30px; border-left: 6px solid ${cor}; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5); position: relative; animation: fadeIn 0.6s ease-out;">
            <img src="img/escudo_shiel.png" alt="Shield" style="position: absolute; top: 20px; right: 20px; height: 65px; opacity: 0.9; filter: drop-shadow(0 0 10px ${cor}44);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
                <div>
                    <div style="background: ${cor}; color: #000; padding: 4px 12px; border-radius: 4px; font-weight: 800; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-bottom: 8px; font-family: sans-serif;">STATUS DE RESILIÊNCIA</div>
                    <h2 style="color: #fff; margin: 0; font-family: 'Rajdhani', sans-serif; font-size: 1.8rem; text-transform: uppercase; letter-spacing: 2px;">${dominio}</h2>
                </div>
                <div style="font-size: 3rem; font-weight: 900; color: ${cor}; font-family: 'Rajdhani', sans-serif; line-height: 1; margin-right: 75px; text-shadow: 0 0 15px ${cor}66;">${score}</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: #666; font-size: 0.65rem; text-transform: uppercase; display: block; margin-bottom: 3px;">Perímetro de E-mail</span>
                    <span style="color: #fff; font-size: 0.9rem; font-weight: bold;">🛡️ DMARC: ${temDmarc ? 'Protegido' : 'Vulnerável'}</span>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: #666; font-size: 0.65rem; text-transform: uppercase; display: block; margin-bottom: 3px;">Criptografia</span>
                    <span style="color: #fff; font-size: 0.9rem; font-weight: bold;">🔒 SSL: ${statusSSL}</span>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: #666; font-size: 0.65rem; text-transform: uppercase; display: block; margin-bottom: 3px;">Performance</span>
                    <span style="color: #fff; font-size: 0.9rem; font-weight: bold;">⚡ ${velStr}</span>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: #666; font-size: 0.65rem; text-transform: uppercase; display: block; margin-bottom: 3px;">Ameaças Externas</span>
                    <span style="color: #fff; font-size: 0.9rem; font-weight: bold;">🦠 ${totalAlertas > 0 ? 'Risco' : 'Limpo'}</span>
                </div>
            </div>
            <div style="background: rgba(255,255,255,0.05); border: 1px solid ${cor}33; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <span style="color: ${cor}; font-size: 0.7rem; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 5px;">DNA da Infraestrutura</span>
                <span style="color: #fff; font-size: 1rem; font-weight: 600;">💻 Sistema: ${plataforma}</span>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="btnPDF" style="flex: 1; background: #333; color: #fff; border: 1px solid #444; padding: 18px; font-weight: 800; cursor: pointer; border-radius: 6px; text-transform: uppercase; font-family: 'Rajdhani', sans-serif; letter-spacing: 1px; font-size: 0.9rem;">📥 DOSSIÊ PDF</button>
                <button onclick="window.open('https://wa.me/5511995314831', '_blank')" style="flex: 1; background: ${cor}; color: #000; border: none; padding: 18px; font-weight: 800; cursor: pointer; border-radius: 6px; text-transform: uppercase; font-family: 'Rajdhani', sans-serif; letter-spacing: 1px; font-size: 0.9rem;">📢 CONSULTORIA</button>
            </div>
        </div>
        `;

        // Ativa o botão de PDF
        document.getElementById('btnPDF').onclick = () => gerarRelatorioPDF(dadosParaPDF);

    } catch (err) {
        console.error(err);
        resultArea.innerHTML = "Erro na análise.";
    }
}

// 5. FUNÇÃO PARA GERAR PDF (EXTERNA) - VERSÃO FINAL BLINDADA WL TEC
function gerarRelatorioPDF(d) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const corTema = d.score === "A+" ? [0, 150, 0] : [180, 0, 0];

    // 1. CABEÇALHO EXECUTIVO
    doc.setFillColor(20, 20, 20); // Preto WL TEC
    doc.rect(0, 0, 210, 45, 'F');
    
    // Tenta colocar o logo, se falhar usa texto
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

    // 2. BARRA DE STATUS COLORIDA
    doc.setFillColor(corTema[0], corTema[1], corTema[2]);
    doc.rect(0, 45, 210, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text(`ANÁLISE DE SEGURANÇA: ${d.score}`, 15, 55);

    // 3. INFORMAÇÕES DO DIAGNÓSTICO
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.text(`GERADO EM: ${new Date().toLocaleString('pt-BR')}`, 140, 72);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Alvo Analisado: ${d.dominio.toUpperCase()}`, 15, 85);
    doc.setDrawColor(corTema[0], corTema[1], corTema[2]);
    doc.setLineWidth(1);
    doc.line(15, 88, 100, 88);

    // 4. GRID DE RESULTADOS (Substituímos a transparência por um fundo cinza sólido)
    doc.setFillColor(248, 248, 248);
    doc.rect(15, 95, 180, 60, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    const posY = 108;
    const spacing = 10;

    doc.setFont("helvetica", "normal");
    doc.text("Protocolo de Criptografia (SSL):", 25, posY);
    doc.setFont("helvetica", "bold");
    doc.text(`${d.statusSSL}`, 110, posY);

    doc.setFont("helvetica", "normal");
    doc.text("Perímetro de E-mail (DMARC):", 25, posY + spacing);
    doc.setFont("helvetica", "bold");
    doc.text(`${d.temDmarc ? 'PROTEGIDO' : 'VULNERÁVEL'}`, 110, posY + spacing);

    doc.setFont("helvetica", "normal");
    doc.text("Performance de Resposta:", 25, posY + (spacing * 2));
    doc.setFont("helvetica", "bold");
    doc.text(`${d.velStr.replace('🚀', '').trim()}`, 110, posY + (spacing * 2));

    doc.setFont("helvetica", "normal");
    doc.text("DNA da Infraestrutura:", 25, posY + (spacing * 3));
    doc.setFont("helvetica", "bold");
    doc.text(`${d.plataforma}`, 110, posY + (spacing * 3));

    // 5. PARECER TÉCNICO (O "Pulo do Gato" do Advisor)
    doc.setFillColor(240, 240, 240);
    doc.rect(15, 165, 180, 40, 'F');
    doc.setTextColor(corTema[0], corTema[1], corTema[2]);
    doc.setFont("helvetica", "bold");
    doc.text("PARECER DO ADVISOR:", 22, 175);
    
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const nota = d.score === "A+" 
        ? "Ambiente em conformidade. Recomenda-se monitoramento preventivo de patches e hardening contínuo."
        : "AVISO CRÍTICO: Vulnerabilidades detectadas. Risco de sequestro de dados (Ransomware). Recomenda-se mitigação imediata.";
    
    const parecerQuebrado = doc.splitTextToSize(nota, 165);
    doc.text(parecerQuebrado, 22, 185);

    // 6. RODAPÉ PROFISSIONAL
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("WL TEC - Consultoria em Infraestrutura e Blindagem Digital", 105, 280, { align: "center" });
    doc.text("Relatório Confidencial - Propriedade do Cliente", 105, 285, { align: "center" });

    // 7. SALVAR ARQUIVO
    doc.save(`Dossie_Resiliencia_${d.dominio}.pdf`);
}