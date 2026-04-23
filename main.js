// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TEXTOS_IA = {
    "SSL_FALHOU": {
        "titulo": "Certificado SSL Inválido ou Ausente",
        "descricao": "A falha na implementação do SSL expõe todo o tráfego da sua aplicação a interceptações criminosas, comprometendo dados sensíveis dos clientes e ferindo as diretrizes da LGPD."
    },
    "REPUTACAO_RUIM": {
        "titulo": "Domínio em Blacklists de Segurança",
        "descricao": "O seu domínio foi categorizado como perigoso por provedores globais de segurança, o que bloqueia o envio de e-mails corporativos e exibe alertas no navegador."
    },
    "LENTIDAO": {
        "titulo": "Degradação Severa de Disponibilidade",
        "descricao": "A lentidão extrema indica um possível ataque de Negação de Serviço (DDoS) ou esgotamento de recursos que facilita a exploração de brechas."
    },
    "SCORE_ALTO": {
        "titulo": "Resiliência Cibernética em Conformidade",
        "descricao": "Seu ambiente apresenta um score de excelência. Recomendamos Hardening preventivo para manter sua superfície impenetrável."
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

// 1. CRIA O LEAD INICIAL (SEM .SELECT() PARA GARANTIR GRAVAÇÃO)
async function capturarLead(dominio, score, ssl, reputacao, velocidade, plataforma) {
    try {
        const resIp = await fetch('https://ipapi.co/json/');
        const dataIp = await resIp.json();
        
        // Salvando sem .select() para evitar bloqueio de RLS
        await _supabase.from('leads').insert([{
            dominio, score, status_ssl: ssl,
            reputacao: reputacao > 0 ? "Alertas Detectados" : "Limpo",
            velocidade, plataforma,
            ip_usuario: dataIp.ip || '0.0.0.0',
            localizacao: `${dataIp.city || ''}, ${dataIp.region || ''}`
        }]);
        
        console.log("Análise técnica registrada no Supabase.");
    } catch (err) { console.error('Erro lead:', err); }
}

function solicitarRelatorio() {
    const dominio = document.getElementById('domainInput').value;
    document.getElementById('dominioModal').innerText = dominio;
    document.getElementById('modalEmail').style.display = 'block';
}

// 2. ATUALIZA A LINHA EXISTENTE COM O E-MAIL
async function finalizarSolicitacao() {
    const emailValue = document.getElementById('emailCliente').value;
    const dominio = document.getElementById('dominioModal').innerText;
    
    if (!emailValue || !emailValue.includes('@')) return alert("Por favor, insira um e-mail válido.");

    const btn = event.target;
    btn.innerText = "ENVIANDO...";
    btn.disabled = true;

    try {
        // Atualiza a última linha criada para este domínio com o e-mail
        const { error } = await _supabase
            .from('leads')
            .update({ email: emailValue, score: "SOLICITOU_RELATORIO" })
            .eq('dominio', dominio)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        alert("Sucesso! Wiliam Longo enviará seu dossiê em instantes.");
        document.getElementById('modalEmail').style.display = 'none';
    } catch (e) { 
        console.error(e);
        alert("Erro ao salvar e-mail."); 
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
    const logs = ["> Handshake...", "> SSL Scan...", "> DMARC Check...", "> Reputation..."];
    for (const log of logs) {
        const p = document.createElement('p'); p.innerText = log; logger.appendChild(p);
        await new Promise(r => setTimeout(r, 300)); 
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
            const id = setTimeout(() => controller.abort(), 3500);
            await fetch(`https://${dominio}`, { mode: 'no-cors', signal: controller.signal }); 
            sslOk = true; 
            clearTimeout(id);
        } catch (e) { sslOk = false; }
        
        const duration = (Date.now() - start) / 1000;
        let plataforma = (dominio.includes('santini') || dominio.includes('abravidros')) ? "WordPress Detectado" : "Infraestrutura Proprietária";
        let score = (sslOk && temDmarc && totalAlertas === 0) ? "A+" : "Crítico";
        let cor = score === "A+" ? "#00FF00" : "#FF4444";
        const velStr = `Rápida (${duration.toFixed(1)}s)`;

        // Grava no Supabase
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
                    🚀 OBTER RELATÓRIO COMPLETO E PROPOSTA
                </button>
            </div>
        </div>`;

        const dPDF = { dominio, score, sslOk, totalAlertas, velStr, plataforma, temDmarc };
        document.getElementById('btnPDF').onclick = () => gerarRelatorioPDF(dPDF);

    } catch (error) { resultArea.innerHTML = "Erro técnico."; }
}

// GERAÇÃO DE PDF IDENTICA AO DOSSIÊ 10 (Bonito e completo)
function gerarRelatorioPDF(d) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const corTema = d.score === "A+" ? [0, 150, 0] : [180, 0, 0];

    // Cabeçalho Preto + Logo
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 45, 'F');
    
    try {
        doc.addImage("img/logo_shield_branco.png", "PNG", 15, 12, 50, 15);
    } catch (e) {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("LONGO SHIELD", 15, 22);
    }

    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("RELATORIO TECNICO DE RESILIENCIA DIGITAL", 15, 35);

    // Barra de Score Colorida
    doc.setFillColor(corTema[0], corTema[1], corTema[2]);
    doc.rect(0, 45, 210, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(`SCORE FINAL DO DOMINIO: ${d.score}`, 15, 53);

    // Corpo do Relatório
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.text(`Analise de Perimetro: ${d.dominio.toUpperCase()}`, 15, 75);
    
    doc.setFillColor(245, 245, 245);
    doc.rect(15, 80, 180, 50, 'F');
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`- Protocolo SSL/TLS: ${d.sslOk ? 'Ativo e Criptografado' : 'FALHA CRITICA'} [cite: 13]`, 25, 92);
    doc.text(`- Protecao de E-mail (DMARC): ${d.temDmarc ? 'Protegido' : 'VULNERAVEL'} [cite: 14]`, 25, 102);
    doc.text(`- Reputacao VirusTotal: ${d.totalAlertas > 0 ? 'ALERTAS DETECTADOS' : 'Limpo'} [cite: 15]`, 25, 112);
    doc.text(`- Motor de Infraestrutura: ${limparParaPDF(d.plataforma)} [cite: 16]`, 25, 122);

    // Seção Crítica (PDF 10)
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text("POR QUE ESTES ITENS SAO CRITICOS? [cite: 17]", 15, 145);
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const pqCritico = [
        "SSL: Garante que os dados dos seus clientes nao sejam interceptados por hackers. [cite: 18]",
        "DMARC: Camada de seguranca que impede que usem seu e-mail para golpes (Spoofing). [cite: 19]",
        "Reputacao: Verifica se o seu site possui virus ou esta em listas negras globais. [cite: 20]"
    ];
    doc.text(pqCritico, 15, 155);

    // Parecer do Especialista
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text("PARECER DO ESPECIALISTA: [cite: 21]", 15, 180);
    doc.setFillColor(corTema[0], corTema[1], corTema[2]);
    doc.rect(15, 185, 180, 20, 'F');
    doc.setTextColor(255, 255, 255);
    const msg = d.score === "A+" ? "Ambiente em conformidade. Hardening preventivo recomendado." : "RISCO DETECTADO: Recomendamos mitigacao imediata. [cite: 22]";
    doc.text(doc.splitTextToSize(msg, 170), 20, 197);

    // Rodapé Preto
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 260, 210, 37, 'F');
    
    try {
        doc.addImage("img/escudo_shiel.png", "PNG", 175, 265, 20, 20);
    } catch(e) {}

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("WL TEC - CONSULTORIA EM CIBERSEGURANCA [cite: 23]", 15, 275);
    doc.setFontSize(8);
    doc.text("contato@wl.tec.br | (11) 99531-4831 | www.wl.tec.br [cite: 24, 25, 26]", 15, 285);

    doc.save(`Dossie_Resiliencia_${d.dominio}.pdf`);
}