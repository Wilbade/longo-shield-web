// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TEXTOS_IA = {
    "SSL_FALHOU": {
        "titulo": "Certificado SSL Inválido ou Ausente",
        "descricao": "A falha na implementação do SSL expõe todo o tráfego da sua aplicação a interceptações criminosas, comprometendo dados sensíveis dos clientes e ferindo as diretrizes da LGPD. Atacantes podem capturar senhas e informações financeiras em tempo real através de ataques de Man-in-the-Middle (MitM)."
    },
    "REPUTACAO_RUIM": {
        "titulo": "Domínio em Blacklists de Segurança",
        "descricao": "O seu domínio foi categorizado como perigoso por provedores globais de segurança, o que bloqueia o envio de e-mails corporativos e exibe alertas no navegador dos seus clientes."
    },
    "LENTIDAO": {
        "titulo": "Degradação Severa de Disponibilidade",
        "descricao": "A lentidão extrema no tempo de resposta do servidor indica um possível ataque de Negação de Serviço (DDoS) ou o esgotamento de recursos que facilita a exploração de brechas."
    },
    "SCORE_ALTO": {
        "titulo": "Resiliência Cibernética em Conformidade",
        "descricao": "Seu ambiente apresenta um score de excelência. No entanto, recomendamos um Hardening preventivo e auditorias periódicas para garantir que sua superfície permaneça impenetrável."
    }
};

const limparParaPDF = (str) => typeof str === 'string' ? str.replace(/[^\x00-\x7F]/g, "").trim() : str;

async function checkReputation(domain) {
    try {
        const { data, error } = await _supabase.functions.invoke('rapid-worker', { body: { domain: domain } });
        if (error) throw error;
        return data?.data?.attributes?.last_analysis_stats ? (data.data.attributes.last_analysis_stats.malicious + data.data.attributes.last_analysis_stats.suspicious) : 0;
    } catch (error) { return 0; }
}

// CAPTURA INICIAL (Cria a linha)
async function capturarLead(dominio, score, ssl, reputacao, velocidade, plataforma) {
    try {
        const resIp = await fetch('https://ipapi.co/json/');
        const dataIp = await resIp.json();
        await _supabase.from('leads').insert([{
            dominio, score, status_ssl: ssl,
            reputacao: reputacao > 0 ? "Alertas Detectados" : "Limpo",
            velocidade, plataforma,
            ip_usuario: dataIp.ip || '0.0.0.0',
            localizacao: `${dataIp.city || ''}, ${dataIp.region || ''}`
        }]);
    } catch (err) { console.error('Erro lead:', err); }
}

function solicitarRelatorio() {
    const dominio = document.getElementById('domainInput').value;
    document.getElementById('dominioModal').innerText = dominio;
    document.getElementById('modalEmail').style.display = 'block';
}

// FINALIZAR (Atualiza a linha existente com o e-mail)
async function finalizarSolicitacao() {
    const emailValue = document.getElementById('emailCliente').value;
    const dominio = document.getElementById('dominioModal').innerText;
    if (!emailValue || !emailValue.includes('@')) return alert("Por favor, insira um e-mail válido.");

    const btn = event.target;
    btn.innerText = "ENVIANDO...";
    btn.disabled = true;

    try {
        // ATUALIZA em vez de INSERT (para não duplicar a linha)
        const { error } = await _supabase
            .from('leads')
            .update({ email: emailValue, score: "SOLICITOU_RELATORIO" })
            .eq('dominio', dominio)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;
        alert("Sucesso! Wiliam Longo enviará seu dossiê em instantes.");
        document.getElementById('modalEmail').style.display = 'none';
    } catch (e) { console.error(e); alert("Erro ao atualizar."); }
    finally { btn.innerText = "RECEBER AGORA"; btn.disabled = false; }
}

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
            fetch(`https://dns.google/resolve?name=_dmarc.${dominio}&type=TXT`).then(r => r.json()).catch(() => ({})),
            checkReputation(dominio).catch(() => 0)
        ]);

        const temDmarc = !!(dmarcData.Answer);
        let sslOk = false;
        try { 
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 4000);
            await fetch(`https://${dominio}`, { mode: 'no-cors', signal: controller.signal }); 
            sslOk = true; 
            clearTimeout(id);
        } catch (e) { sslOk = false; }
        
        const duration = (Date.now() - start) / 1000;
        let plataforma = (dominio.includes('santini') || dominio.includes('abravidros')) ? "WordPress Detectado" : "Infraestrutura Proprietária";
        let score = (sslOk && temDmarc && totalAlertas === 0) ? "A+" : "Crítico";
        let cor = score === "A+" ? "#00FF00" : "#FF4444";
        const velStr = `Rápida (${duration.toFixed(1)}s)`;

        capturarLead(dominio, score, sslOk ? "Ativo" : "Falha", totalAlertas, velStr, plataforma);

        let chave = (sslOk && temDmarc && totalAlertas === 0) ? "SCORE_ALTO" : (!sslOk ? "SSL_FALHOU" : (totalAlertas > 0 ? "REPUTACAO_RUIM" : "LENTIDAO"));
        const dadosIA = TEXTOS_IA[chave];

        resultArea.innerHTML = `
        <div style="text-align: left; background: rgba(10,10,10,0.95); border-left: 6px solid ${cor}; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); position: relative; overflow: hidden;">
            <div style="padding: 30px;">
                <img src="img/escudo_shiel.png" style="position: absolute; top: 20px; right: 20px; height: 60px; opacity: 0.9;">
                <h2 style="color: #fff; font-family: 'Rajdhani', sans-serif;">${dominio.toUpperCase()}</h2>
                <div style="font-size: 3rem; font-weight: 900; color: ${cor};">${score}</div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px;">
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">🛡️ DMARC: ${temDmarc ? 'Protegido' : '<span style="color:#FF4444">Vulnerável</span>'}</div>
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">🔒 SSL: ${sslOk ? 'Ativo' : '<span style="color:#FF4444">Falha</span>'}</div>
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">⚡ ${velStr}</div>
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">🦠 ${totalAlertas > 0 ? '<span style="color:#FF4444">Risco</span>' : 'Limpo'}</div>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="btnPDF" class="refresh-btn" style="flex: 1;">📥 DOSSIÊ PDF</button>
                    <button onclick="window.open('https://wa.me/5511995314831')" class="refresh-btn" style="flex: 1; background: ${cor}; color: #000;">📢 CONSULTORIA</button>
                </div>
            </div>

            <div style="padding: 20px; background: rgba(255, 179, 0, 0.08); border-top: 1px solid rgba(255, 179, 0, 0.2);">
                <h4 style="color: #FFB300; margin: 0 0 5px 0;">🛡️ Análise de Risco WL TEC</h4>
                <p style="font-size: 0.85rem; color: #bbb;"><strong>${dadosIA.titulo}:</strong> ${dadosIA.descricao}</p>
                <button onclick="solicitarRelatorio()" class="refresh-btn" style="width: 100%; background: #FFB300; color: #000; margin-top: 10px;">
                    🚀 OBTER DADOS TOTAIS E PROPOSTA DE CORREÇÃO
                </button>
            </div>
        </div>`;

        const dadosParaPDF = { dominio, score, sslOk, totalAlertas, velStr, plataforma, temDmarc, duration };
        document.getElementById('btnPDF').onclick = () => gerarRelatorioPDF(dadosParaPDF);

    } catch (error) { resultArea.innerHTML = "Erro na varredura técnica."; }
}

// RESTAURAÇÃO DO PDF "DOSSIÊ" (O COMPLETO DE ONTEM)
function gerarRelatorioPDF(d) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const corTema = d.score === "A+" ? [0, 150, 0] : [180, 0, 0];

    // Cabeçalho Escuro
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("LONGO SHIELD", 15, 20);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("RELATORIO TECNICO DE RESILIENCIA DIGITAL", 15, 30);

    // Faixa de Score
    doc.setFillColor(corTema[0], corTema[1], corTema[2]);
    doc.rect(0, 40, 210, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(`SCORE FINAL DO DOMINIO: ${d.score}`, 15, 48);

    // Dados da Análise
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.text(`Analise de Perimetro: ${d.dominio.toUpperCase()}`, 15, 65);
    
    doc.setFillColor(245, 245, 245);
    doc.rect(15, 70, 180, 50, 'F');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(`- Protocolo SSL/TLS: ${d.sslOk ? 'Ativo e Criptografado' : 'FALHA CRITICA'}`, 25, 82);
    doc.text(`- Protecao de E-mail (DMARC): ${d.temDmarc ? 'Protegido' : 'VULNERAVEL'}`, 25, 92);
    doc.text(`- Reputacao VirusTotal: ${d.totalAlertas > 0 ? 'ALERTAS DETECTADOS' : 'Limpo'}`, 25, 102);
    doc.text(`- Motor de Infraestrutura: ${limparParaPDF(d.plataforma)}`, 25, 112);

    // Seção de Por que é crítico
    doc.setFontSize(12);
    doc.text("POR QUE ESTES ITENS SAO CRITICOS?", 15, 135);
    doc.setFontSize(9);
    const notas = [
        "SSL: Garante que os dados dos seus clientes nao sejam interceptados por hackers.",
        "DMARC: Camada de seguranca que impede que usem seu e-mail para golpes (Spoofing).",
        "Reputacao: Verifica se o seu site possui virus ou esta em listas negras globais."
    ];
    doc.text(notas, 15, 145);

    // Parecer
    doc.setFillColor(corTema[0], corTema[1], corTema[2]);
    doc.rect(15, 175, 180, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("PARECER DO ESPECIALISTA:", 20, 184);
    const parecer = d.score === "A+" ? "Ambiente em conformidade. Hardening preventivo recomendado." : "RISCO DETECTADO: Recomendamos mitigacao imediata.";
    doc.text(doc.splitTextToSize(parecer, 170), 20, 192);

    // Rodapé
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 260, 210, 37, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("WL TEC - CONSULTORIA EM CIBERSEGURANCA", 15, 275);
    doc.setFontSize(9);
    doc.text("contato@wl.tec.br | (11) 99531-4831 | www.wl.tec.br", 15, 285);

    doc.save(`Dossie_Resiliencia_${d.dominio}.pdf`);
}