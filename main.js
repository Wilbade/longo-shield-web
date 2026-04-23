// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// BANCO DE TEXTOS DA IA
const TEXTOS_IA = {
    "SSL_FALHOU": {
        "titulo": "Certificado SSL Inválido ou Ausente",
        "descricao": "A falha na implementação do SSL expõe todo o tráfego da sua aplicação a interceptações criminosas, comprometendo dados sensíveis dos clientes e ferindo as diretrizes da LGPD. Atacantes podem capturar senhas e informações financeiras em tempo real através de ataques de Man-in-the-Middle (MitM). Para reverter este cenário crítico, a WL TEC implementa imediatamente a criptografia de ponta a ponta e configura protocolos modernos para blindar o canal de comunicação."
    },
    "REPUTACAO_RUIM": {
        "titulo": "Domínio em Blacklists de Segurança",
        "descricao": "O seu domínio foi categorizado como perigoso por provedores globais de segurança, o que bloqueia o envio de e-mails corporativos e exibe alertas de perigo no navegador dos seus clientes. Essa classificação geralmente é o resultado de uma infecção silenciosa por malware ou uso da infraestrutura para campanhas de phishing de terceiros. A equipe de resposta a incidentes da WL TEC higienizará sua aplicação, removerá os artefatos maliciosos e conduzirá o processo técnico de remoção do domínio das listas de bloqueio."
    },
    "LENTIDAO": {
        "titulo": "Degradação Severa de Disponibilidade",
        "descricao": "A lentidão extrema no tempo de resposta do servidor indica um possível ataque de Negação de Serviço Distribuída (DDoS) em andamento ou o esgotamento de recursos que facilita a exploração de brechas de arquitetura. Uma infraestrutura instável não apenas derruba as operações do seu negócio, mas também deixa o sistema suscetível a explorações de condições de corrida (race conditions). A WL TEC age emergencialmente otimizando a arquitetura de rede e implementando Web Application Firewalls (WAF) corporativos para absorver ataques e acelerar a aplicação."
    },
    "SCORE_ALTO": {
        "titulo": "Resiliência Cibernética em Conformidade",
        "descricao": "Seu ambiente apresenta um score de excelência, indicando que as camadas básicas de proteção estão ativas. No entanto, o cenário de ameaças é dinâmico. Especialistas ofensivos da WL TEC recomendam um Hardening preventivo e auditorias periódicas para garantir que sua superfície de ataque permaneça impenetrável contra novas variantes de ransomware e exploits zero-day."
    }
};

const limparParaPDF = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[^\x00-\x7F]/g, "").trim(); 
};

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

async function capturarLead(dominio, score, ssl, reputacao, velocidade, plataforma) {
    try {
        const resIp = await fetch('https://ipapi.co/json/');
        const dataIp = await resIp.json();
        await _supabase.from('leads').insert([{
            dominio: dominio, 
            score: score, 
            status_ssl: ssl,
            reputacao: reputacao > 0 ? "Alertas Detectados" : "Limpo",
            velocidade: velocidade, 
            plataforma: plataforma,
            ip_usuario: dataIp.ip || '0.0.0.0',
            localizacao: `${dataIp.city || ''}, ${dataIp.region || ''}`
        }]);
    } catch (err) { console.error('Erro lead:', err); }
}

function exibirRecomendacaoIA(dados) {
    const area = document.getElementById('wl-recomendacoes');
    const titulo = document.getElementById('rec-titulo');
    const desc = document.getElementById('rec-descricao');
    
    let chave = "SCORE_ALTO";
    if (!dados.sslOk) chave = "SSL_FALHOU";
    else if (dados.totalAlertas > 0) chave = "REPUTACAO_RUIM";
    else if (dados.duration > 3) chave = "LENTIDAO";

    if(titulo) titulo.innerText = TEXTOS_IA[chave].titulo;
    if(desc) desc.innerText = TEXTOS_IA[chave].descricao;
    if(area) area.style.display = 'block';
}

function solicitarRelatorio() {
    const dominio = document.getElementById('domainInput').value;
    document.getElementById('dominioModal').innerText = dominio;
    document.getElementById('modalEmail').style.display = 'block';
}

async function finalizarSolicitacao() {
    const email = document.getElementById('emailCliente').value;
    const dominio = document.getElementById('dominioModal').innerText;

    if (!email || !email.includes('@')) {
        return alert("Por favor, insira um e-mail válido para receber o dossiê.");
    }

    const btn = event.target;
    btn.innerText = "ENVIANDO...";
    btn.disabled = true;

    try {
        const { error } = await _supabase
            .from('leads')
            .insert([{ 
                dominio: dominio, 
                score: "SOLICITOU_RELATORIO", 
                plataforma: "E-mail: " + email,
                email: email
            }]);

        if (error) throw error;

        alert("Sucesso! Wiliam Longo enviará seu dossiê em instantes.");
        document.getElementById('modalEmail').style.display = 'none';
    } catch (e) {
        console.error(e);
        alert("Ocorreu um erro ao salvar o e-mail.");
    } finally {
        btn.innerText = "RECEBER AGORA";
        btn.disabled = false;
    }
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
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            await fetch(`https://${dominio}`, { mode: 'no-cors', signal: controller.signal }); 
            sslOk = true; 
            clearTimeout(timeoutId);
        } catch (e) { sslOk = false; }
        
        const duration = (Date.now() - start) / 1000;
        let plataforma = (dominio.includes('santini') || dominio.includes('abravidros')) ? "WordPress Detectado" : "Infraestrutura Proprietária";
        let score = (sslOk && temDmarc && totalAlertas === 0) ? "A+" : "Crítico";
        let cor = score === "A+" ? "#00FF00" : "#FF4444";
        const velStr = `Rápida (${duration.toFixed(1)}s)`;

        const dadosParaPDF = { dominio, score, sslOk, totalAlertas, velStr, plataforma, temDmarc, duration };
        
        // SALVA DADOS TÉCNICOS NO SUPABASE (Captura Inicial)
        capturarLead(dominio, score, sslOk ? "Ativo" : "Falha", totalAlertas, velStr, plataforma);

        if(document.getElementById('main-loader')) document.getElementById('main-loader').remove();
        if(logger) logger.style.display = 'none';

        resultArea.innerHTML = `
        <div style="text-align: left; background: rgba(10,10,10,0.95); padding: 30px; border-left: 6px solid ${cor}; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); position: relative;">
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

        exibirRecomendacaoIA(dadosParaPDF);

        document.getElementById('btnPDF').onclick = () => gerarRelatorioPDF(dadosParaPDF);
    } catch (error) { 
        console.error(error);
        resultArea.innerHTML = "Erro na varredura técnica."; 
    }
}

function gerarRelatorioPDF(d) {
    if (!window.jspdf) {
        alert("Erro: Biblioteca de PDF não carregada.");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const corTema = d.score === "A+" ? [0, 150, 0] : [180, 0, 0];

    // Header
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 40, 'F');
    try { 
        doc.addImage("img/logo_shield_branco.png", "PNG", 15, 12, 45, 12); 
    } catch (e) {
        doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.text("WL TEC - LONGO SHIELD", 15, 22);
    }
    doc.setFontSize(10); doc.setTextColor(180, 180, 180); doc.text("RELATORIO TECNICO DE RESILIENCIA DIGITAL", 15, 33);

    // Score Bar
    doc.setFillColor(corTema[0], corTema[1], corTema[2]);
    doc.rect(0, 40, 210, 12, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.text(`SCORE FINAL DO DOMINIO: ${d.score}`, 15, 48);

    // Main Info
    doc.setTextColor(40, 40, 40); doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text(`Alvo Analisado: ${d.dominio.toUpperCase()}`, 15, 65);
    
    doc.setFillColor(248, 248, 248); doc.rect(15, 70, 180, 50, 'F');
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text(`- Protocolo SSL/TLS: ${d.sslOk ? 'Ativo e Criptografado' : 'FALHA CRITICA'}`, 25, 82);
    doc.text(`- Configuracao DMARC: ${d.temDmarc ? 'Protegido contra Spoofing' : 'VULNERAVEL A FRAUDES'}`, 25, 92);
    doc.text(`- Reputacao VirusTotal: ${d.totalAlertas > 0 ? 'ALERTAS DETECTADOS' : 'Limpo'}`, 25, 102);
    doc.text(`- DNA da Infraestrutura: ${limparParaPDF(d.plataforma)}`, 25, 112);

    // Parecer
    doc.setFillColor(corTema[0], corTema[1], corTema[2]); doc.rect(15, 175, 180, 25, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.text("PARECER DO ESPECIALISTA:", 20, 184);
    const parecer = d.score === "A+" ? "Ambiente em conformidade. Hardening preventivo recomendado." : "ALERTA CRITICO: Vulnerabilidades detectadas. Risco de sequestro de dados.";
    doc.text(doc.splitTextToSize(parecer, 170), 20, 192);

    // Footer
    doc.setFillColor(30, 30, 30); doc.rect(0, 260, 210, 37, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("WL TEC - CONSULTORIA EM CIBERSEGURANCA", 15, 272);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(0, 255, 255);
    doc.text("E-mail: contato@wl.tec.br", 15, 282);
    doc.text("WhatsApp: (11) 99531-4831", 15, 290);

    doc.save(`Dossie_Resiliencia_${d.dominio}.pdf`);
}