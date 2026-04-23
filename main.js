// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

const limparParaPDF = (str) => typeof str === 'string' ? str.replace(/[^\x00-\x7F]/g, "").trim() : str;

async function checkReputation(domain) {
    try {
        const { data, error } = await _supabase.functions.invoke('rapid-worker', { body: { domain: domain } });
        if (error) throw error;
        return data?.data?.attributes?.last_analysis_stats ? (data.data.attributes.last_analysis_stats.malicious + data.data.attributes.last_analysis_stats.suspicious) : 0;
    } catch (error) { return 0; }
}

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

async function finalizarSolicitacao() {
    const emailValue = document.getElementById('emailCliente').value;
    const dominio = document.getElementById('dominioModal').innerText;
    if (!emailValue || !emailValue.includes('@')) return alert("Por favor, insira um e-mail válido.");

    const btn = event.target;
    btn.innerText = "ENVIANDO...";
    btn.disabled = true;

    try {
        const { error } = await _supabase.from('leads').insert([{ 
            dominio: dominio, score: "SOLICITOU_RELATORIO", email: emailValue, plataforma: "Lead vindo do Modal" 
        }]);
        if (error) throw error;
        alert("Sucesso! Wiliam Longo enviará seu dossiê em instantes.");
        document.getElementById('modalEmail').style.display = 'none';
    } catch (e) { alert("Erro ao salvar."); }
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

        // Salva lead inicial
        capturarLead(dominio, score, sslOk ? "Ativo" : "Falha", totalAlertas, velStr, plataforma);

        // Identifica texto da recomendação
        let chave = (sslOk && temDmarc && totalAlertas === 0) ? "SCORE_ALTO" : (!sslOk ? "SSL_FALHOU" : (totalAlertas > 0 ? "REPUTACAO_RUIM" : "LENTIDAO"));
        const dadosIA = TEXTOS_IA[chave];

        resultArea.innerHTML = `
        <div style="text-align: left; background: rgba(10,10,10,0.95); border-left: 6px solid ${cor}; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); position: relative; overflow: hidden;">
            <div style="padding: 30px;">
                <img src="img/escudo_shiel.png" style="position: absolute; top: 20px; right: 20px; height: 60px; opacity: 0.9;">
                <h2 style="color: #fff; font-family: 'Rajdhani', sans-serif;">${dominio.toUpperCase()}</h2>
                <div style="font-size: 3rem; font-weight: 900; color: ${cor};">${score}</div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px;">
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">DMARC: ${temDmarc ? 'Protegido' : 'Vulnerável'}</div>
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">SSL: ${sslOk ? 'Ativo' : 'Falha'}</div>
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">⚡ ${velStr}</div>
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">🦠 ${totalAlertas > 0 ? 'Risco' : 'Limpo'}</div>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="btnPDF" class="refresh-btn" style="flex: 1;">📥 DOSSIÊ PDF</button>
                    <button onclick="window.open('https://wa.me/5511995314831')" class="refresh-btn" style="flex: 1; background: ${cor}; color: #000;">📢 CONSULTORIA</button>
                </div>
            </div>

            <div style="padding: 20px; background: rgba(255, 179, 0, 0.08); border-top: 1px solid rgba(255, 179, 0, 0.2);">
                <h4 style="color: #FFB300;">🛡️ Análise de Risco WL TEC</h4>
                <p style="font-size: 0.85rem; color: #bbb;"><strong>${dadosIA.titulo}:</strong> ${dadosIA.descricao}</p>
                <button onclick="solicitarRelatorio()" class="refresh-btn" style="width: 100%; background: #FFB300; color: #000; margin-top: 10px;">
                    🚀 OBTER RELATÓRIO COMPLETO
                </button>
            </div>
        </div>`;

        // Ativa o PDF
        const dadosParaPDF = { dominio, score, sslOk, totalAlertas, velStr, plataforma, temDmarc, duration };
        document.getElementById('btnPDF').onclick = () => gerarRelatorioPDF(dadosParaPDF);

    } catch (error) { resultArea.innerHTML = "Erro na varredura técnica."; }
}

function gerarRelatorioPDF(d) {
    if (!window.jspdf) return alert("Erro: jsPDF não carregado.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const corTema = d.score === "A+" ? [0, 150, 0] : [180, 0, 0];

    doc.setFillColor(20, 20, 20); doc.rect(0, 0, 210, 40, 'F');
    try { doc.addImage("img/logo_shield_branco.png", "PNG", 15, 12, 45, 12); } catch (e) { doc.setTextColor(255, 255, 255); doc.text("WL TEC", 15, 22); }
    doc.setFillColor(corTema[0], corTema[1], corTema[2]); doc.rect(0, 40, 210, 12, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.text(`SCORE: ${d.score}`, 15, 48);
    
    doc.setTextColor(40, 40, 40); doc.setFontSize(14); doc.text(`Dominio: ${d.dominio.toUpperCase()}`, 15, 65);
    doc.setFontSize(10); doc.text(`- SSL: ${d.sslOk ? 'Ativo' : 'Falha'}`, 15, 75);
    doc.text(`- DMARC: ${d.temDmarc ? 'Ok' : 'Vulneravel'}`, 15, 85);
    doc.text(`- Reputacao: ${d.totalAlertas > 0 ? 'Risco' : 'Limpo'}`, 15, 95);
    
    doc.save(`Resiliencia_${d.dominio}.pdf`);
}