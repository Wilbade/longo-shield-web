// ================================================================
// WL TEC - Longo Shield | main.js v2.0
// Refatorado: Upsert unificado (anti-duplicidade) + Persistência robusta
// ================================================================

// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
    global: {
        headers: {
            'X-Client-Info': 'longo-shield-web/2.0'
        }
    }
});

// 2. TEXTOS DE ANÁLISE (IA)
const TEXTOS_IA = {
    "SSL_FALHOU": { "titulo": "Certificado SSL Inválido ou Ausente", "descricao": "A falha na implementação do SSL expõe todo o tráfego da sua aplicação a interceptações criminosas, comprometendo dados sensíveis dos clientes e ferindo as diretrizes da LGPD." },
    "REPUTACAO_RUIM": { "titulo": "Domínio em Blacklists de Segurança", "descricao": "O seu domínio foi categorizado como perigoso por provedores globais de segurança, o que bloqueia o envio de e-mails corporativos e exibe alertas no navegador." },
    "LENTIDAO": { "titulo": "Degradação Severa de Disponibilidade", "descricao": "A lentidão extrema indica um possível ataque de Negação de Serviço (DDoS) ou esgotamento de recursos que facilita a exploração de brechas." },
    "SCORE_ALTO": { "titulo": "Resiliência Cibernética em Conformidade", "descricao": "Seu ambiente apresenta um score de excelência. Recomendamos Hardening preventivo para manter sua superfície impenetrável." }
};

// 3. UTILIDADES
const limparParaPDF = (str) => typeof str === 'string' ? str.replace(/[^\x00-\x7F]/g, "").trim() : str;
const escapeHTML = (str) => typeof str === 'string' ? str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') : str;
const isValidDomain = (domain) => /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(domain);

// Variável global para manter os dados do diagnóstico entre etapas
let _dadosDiagnostico = null;

// 4. PERSISTÊNCIA ROBUSTA — Fallback para localStorage
function salvarFallbackLocal(dominio, dados) {
    try {
        const pending = JSON.parse(sessionStorage.getItem('wl_leads_pendentes') || '[]');
        pending.push({ dominio, dados, timestamp: new Date().toISOString() });
        sessionStorage.setItem('wl_leads_pendentes', JSON.stringify(pending));
        console.log('[Fallback] Lead salvo localmente para reenvio.');
    } catch (e) {
        console.warn('[Fallback] sessionStorage indisponível:', e);
    }
}

async function reenviarLeadsPendentes() {
    try {
        const pending = JSON.parse(sessionStorage.getItem('wl_leads_pendentes') || '[]');
        if (pending.length === 0) return;

        const reenviados = [];
        for (const item of pending) {
            const d = item.dados;
            const { error } = await _supabase.rpc('upsert_lead', {
                p_dominio: d.dominio,
                p_score: d.score || null,
                p_status_ssl: d.status_ssl || null,
                p_reputacao: d.reputacao || null,
                p_velocidade: d.velocidade || null,
                p_plataforma: d.plataforma || null,
                p_ip_usuario: d.ip_usuario || null,
                p_localizacao: d.localizacao || null,
                p_email: d.email || null
            });
            if (!error) reenviados.push(item);
        }

        if (reenviados.length > 0) {
            const restantes = pending.filter(p => !reenviados.includes(p));
            sessionStorage.setItem('wl_leads_pendentes', JSON.stringify(restantes));
            console.log(`[Fallback] ${reenviados.length} lead(s) reenviado(s) com sucesso.`);
        }
    } catch (e) {
        console.warn('[Fallback] Erro ao reenviar leads pendentes:', e);
    }
}

// Tenta reenviar leads pendentes ao carregar a página
window.addEventListener('load', () => {
    setTimeout(reenviarLeadsPendentes, 3000);
});

// 5. VERIFICAÇÃO DE REPUTAÇÃO
async function checkReputation(domain) {
    try {
        const { data } = await _supabase.functions.invoke('rapid-worker', { body: { domain: domain } });
        return data?.data?.attributes?.last_analysis_stats ? (data.data.attributes.last_analysis_stats.malicious + data.data.attributes.last_analysis_stats.suspicious) : 0;
    } catch { return 0; }
}

// 6. CAPTURA UNIFICADA (RPC Seguro) — Anti-Duplicidade
// Usa função SECURITY DEFINER no Supabase para upsert seguro sem expor SELECT.
async function capturarLead(dominio, score, ssl, reputacao, velocidade, plataforma) {
    let ipUsuario = '0.0.0.0';
    let localizacao = '';

    try {
        const resIp = await fetch('https://ipapi.co/json/');
        const dataIp = await resIp.json();
        ipUsuario = dataIp.ip || '0.0.0.0';
        localizacao = `${dataIp.city || ''}, ${dataIp.region || ''}`;
    } catch (e) {
        console.warn('[GeoIP] Falha na geolocalização, continuando sem IP:', e.message);
    }

    const params = {
        p_dominio: dominio,
        p_score: score,
        p_status_ssl: ssl,
        p_reputacao: reputacao > 0 ? "Alertas Detectados" : "Limpo",
        p_velocidade: velocidade,
        p_plataforma: plataforma,
        p_ip_usuario: ipUsuario,
        p_localizacao: localizacao
    };

    try {
        const { error } = await _supabase.rpc('upsert_lead', params);
        if (error) throw error;
        console.log("[RPC] Lead técnico salvo/atualizado com sucesso.");
    } catch (err) {
        console.error("[RPC] Erro ao salvar lead técnico, ativando fallback:", err);
        salvarFallbackLocal(dominio, params);
    }
}

// 7. MODAL DE RELATÓRIO
function solicitarRelatorio() {
    const dominio = document.getElementById('domainInput').value;
    document.getElementById('dominioModal').innerText = dominio;
    document.getElementById('modalEmail').style.display = 'block';
}

// 8. FINALIZAR SOLICITAÇÃO — RPC seguro para atualizar e-mail
async function finalizarSolicitacao() {
    const emailValue = document.getElementById('emailCliente').value;
    const dominio = document.getElementById('dominioModal').innerText;

    if (!emailValue || !emailValue.includes('@')) return alert("Por favor, insira um e-mail válido.");

    const btn = event.target;
    btn.innerText = "ENVIANDO...";
    btn.disabled = true;

    try {
        const { error } = await _supabase.rpc('upsert_lead', {
            p_dominio: dominio,
            p_email: emailValue
        });

        if (error) throw error;

        alert("Sucesso! WL Tec | Longo Shield enviará seu dossiê em instantes.");
        document.getElementById('modalEmail').style.display = 'none';
    } catch (e) {
        console.error("[RPC] Erro ao salvar e-mail:", e);
        salvarFallbackLocal(dominio, { p_dominio: dominio, p_email: emailValue });
        alert("Erro temporário. Seus dados foram salvos e serão reenviados automaticamente.");
        document.getElementById('modalEmail').style.display = 'none';
    } finally {
        btn.innerText = "🚀 RECEBER RELATÓRIO COMPLETO";
        btn.disabled = false;
    }
}

// 9. BARRA DE PROGRESSO MODERNA (Preservada integralmente)
async function animarBarraProgresso() {
    const progressWrapper = document.getElementById('progressWrapper');
    const progressBar = document.getElementById('progressBar');
    const percentLabel = document.getElementById('percentLabel');
    const statusLabel = document.getElementById('statusLabel');

    progressWrapper.style.display = 'block';
    let progresso = 0;

    const etapas = [
        { p: 15, t: "Iniciando Handshake..." },
        { p: 35, t: "Varrendo Certificados SSL/TLS..." },
        { p: 60, t: "Auditando DNS e Registros DMARC..." },
        { p: 85, t: "Verificando Reputação em Blacklists..." },
        { p: 100, t: "Gerando Dossiê de Resiliência..." }
    ];

    for (const etapa of etapas) {
        statusLabel.innerText = etapa.t;
        while (progresso < etapa.p) {
            progresso++;
            progressBar.style.width = progresso + "%";
            percentLabel.innerText = progresso + "%";
            await new Promise(r => setTimeout(r, 20));
        }
    }
}

// 10. CLOUDFLARE TURNSTILE — Proteção Anti-Bot
let _turnstileToken = null;

function onTurnstileSuccess(token) {
    _turnstileToken = token;
    console.log("[Turnstile] Verificação humana concluída.");
}

// 11. DIAGNÓSTICO PRINCIPAL
async function iniciarDiagnostico() {
    const dominioInput = document.getElementById('domainInput');
    const resultArea = document.getElementById('resultArea');
    if (!dominioInput || !dominioInput.value) return;

    // Verificação Turnstile — bloqueia bots
    if (!_turnstileToken) {
        alert("⚠️ Aguarde a verificação de segurança antes de analisar.");
        return;
    }

    const dominio = dominioInput.value.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,'');

    // Validação anti-XSS: aceita apenas domínios válidos
    if (!isValidDomain(dominio)) {
        alert("Por favor, insira um domínio válido (ex: empresa.com.br).");
        return;
    }

    // Esconde resultados anteriores e inicia a barra moderna
    resultArea.classList.add('result-hidden');
    await animarBarraProgresso();

    try {
        const start = Date.now();
        const [dmarcData, totalAlertas, spfData, mxData, bimiData] = await Promise.all([
            fetch(`https://dns.google/resolve?name=_dmarc.${dominio}&type=TXT`).then(r => r.json()).catch(() => ({})),
            checkReputation(dominio),
            fetch(`https://dns.google/resolve?name=${dominio}&type=TXT`).then(r => r.json()).catch(() => ({})),
            fetch(`https://dns.google/resolve?name=${dominio}&type=MX`).then(r => r.json()).catch(() => ({})),
            fetch(`https://dns.google/resolve?name=default._bimi.${dominio}&type=TXT`).then(r => r.json()).catch(() => ({}))
        ]);

        const temDmarc = !!(dmarcData.Answer);
        const temSpf = spfData.Answer ? spfData.Answer.some(a => (a.data || '').includes('v=spf1')) : false;
        const temBimi = !!(bimiData.Answer && bimiData.Answer.length > 0);

        let provedor = "Desconhecido";
        if (mxData.Answer) {
            const mxStr = mxData.Answer.map(a => a.data).join(' ').toLowerCase();
            if (mxStr.includes('google')) provedor = "Google Workspace";
            else if (mxStr.includes('outlook') || mxStr.includes('protection')) provedor = "Microsoft 365";
            else if (mxStr.includes('locaweb')) provedor = "Locaweb";
            else if (mxStr.includes('titan')) provedor = "Titan Mail";
            else if (mxStr.includes('zoho')) provedor = "Zoho Mail";
            else if (mxStr.includes('hostgator')) provedor = "HostGator";
            else provedor = "Outro Provedor";
        } else {
            provedor = "Sem E-mail (MX)";
        }
        let sslOk = false;
        try {
            const ctrl = new AbortController();
            setTimeout(() => ctrl.abort(), 3500);
            await fetch(`https://${dominio}`, { mode: 'no-cors', signal: ctrl.signal });
            sslOk = true;
        } catch (e) { sslOk = false; }

        const duration = (Date.now() - start) / 1000;

        // Identificação de infraestrutura (Técnica cross-origin de detecção de WP via Assets)
        let isWordPress = false;
        try {
            isWordPress = await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
                img.src = `https://${dominio}/wp-includes/images/w-logo-blue.png`;
                setTimeout(() => resolve(false), 2500); // Timeout
            });
        } catch(e) { }

        let basePlataforma = isWordPress ? "WordPress (Análise de Vulnerabilidade recomendada)" : "Infraestrutura Proprietária / Cloud";
        let plataforma = `${basePlataforma} | E-mail: ${provedor} | SPF: ${temSpf ? 'Ok' : 'Falha'} | BIMI: ${temBimi ? 'Ok' : 'Ausente'}`;
        let score = (sslOk && temDmarc && totalAlertas === 0) ? "A+" : "Crítico";
        let cor = score === "A+" ? "#00FF00" : "#FF4444";
        const velStr = `${duration.toFixed(1)}s`;

        // Salva no banco via UPSERT (anti-duplicidade)
        capturarLead(dominio, score, sslOk ? "Ativo" : "Falha", totalAlertas, velStr, plataforma);

        // Armazena dados do diagnóstico na variável global para uso posterior
        _dadosDiagnostico = { dominio, score, sslOk, totalAlertas, velStr, plataforma, temDmarc };

        let chave = (sslOk && temDmarc && totalAlertas === 0) ? "SCORE_ALTO" : (!sslOk ? "SSL_FALHOU" : (totalAlertas > 0 ? "REPUTACAO_RUIM" : "LENTIDAO"));
        const dadosIA = TEXTOS_IA[chave];

        // Finaliza animação e mostra resultado
        document.getElementById('progressWrapper').style.display = 'none';
        resultArea.classList.remove('result-hidden');

        resultArea.innerHTML = `
        <div style="text-align: left; background: rgba(10,10,10,0.95); border-left: 6px solid ${cor}; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); position: relative; overflow: hidden;">
            <div style="padding: 30px;">
                <img src="img/escudo_shiel.png" style="position: absolute; top: 20px; right: 20px; height: 60px; opacity: 0.9;">
                <h2 style="color: #fff; font-family: 'Rajdhani', sans-serif;">${escapeHTML(dominio.toUpperCase())}</h2>
                <div style="font-size: 3rem; font-weight: 900; color: ${cor};">${score}</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px;">
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">🛡️ Blindagem de E-mail: ${temDmarc ? 'Protegido' : 'Vulnerável'}</div>
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">🔒 Conexão Segura: ${sslOk ? 'Ativa' : 'Falha'}</div>
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">⚡ Resposta: ${velStr}</div>
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">🦠 Saúde: ${totalAlertas > 0 ? 'Risco' : 'Limpo'}</div>
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; grid-column: 1 / -1; font-size: 0.85rem;">🌐 <strong>Infra e DNS:</strong> ${escapeHTML(plataforma)}</div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="btnPDF" class="refresh-btn" style="flex: 1;">📥 DOSSIÊ PDF</button>
                    <button onclick="window.open('https://wa.me/5511995314831')" class="refresh-btn" style="flex: 1; background: ${cor}; color: #000;">📢 CONSULTORIA</button>
                </div>
            </div>
            <div style="padding: 20px; background: rgba(255, 179, 0, 0.08); border-top: 1px solid rgba(255, 179, 0, 0.2);">
                <h4 style="color: #FFB300; margin: 0 0 5px 0;">🛡️ Análise de Risco WL TEC</h4>
                <p style="font-size: 0.85rem; color: #bbb;"><strong>${dadosIA.titulo}:</strong> ${dadosIA.descricao}</p>
                <button onclick="solicitarRelatorio()" class="refresh-btn" style="width: 100%; background: #FFB300; color: #000; margin-top: 10px;">🚀 OBTER RELATÓRIO COMPLETO</button>
            </div>
        </div>`;

        const dPDF = { dominio, score, sslOk, totalAlertas, velStr, plataforma, temDmarc };
        document.getElementById('btnPDF').onclick = () => gerarRelatorioPDF(dPDF);

    } catch (error) {
        document.getElementById('progressWrapper').style.display = 'none';
        resultArea.innerHTML = "Erro técnico.";
    } finally {
        // Reset do Turnstile para a próxima análise
        _turnstileToken = null;
        if (typeof turnstile !== 'undefined') {
            turnstile.reset();
        }
    }
}

// 11. GERAÇÃO DE PDF (Preservada integralmente)
function gerarRelatorioPDF(d) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const corTema = d.score === "A+" ? [0, 150, 0] : [180, 0, 0];
    doc.setFillColor(20, 20, 20); doc.rect(0, 0, 210, 45, 'F');
    try { doc.addImage("img/logo_shield_branco.png", "PNG", 15, 12, 50, 15); } catch (e) { doc.setTextColor(255, 255, 255); doc.text("LONGO SHIELD", 15, 22); }
    doc.setFontSize(9); doc.setTextColor(150, 150, 150); doc.text("RELATORIO TECNICO DE RESILIENCIA DIGITAL", 15, 35);
    doc.setFillColor(corTema[0], corTema[1], corTema[2]); doc.rect(0, 45, 210, 12, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.text(`SCORE FINAL DO DOMINIO: ${d.score}`, 15, 53);
    doc.setTextColor(40, 40, 40); doc.setFontSize(14); doc.text(`Analise de Perimetro: ${d.dominio.toUpperCase()}`, 15, 75);
    doc.setFillColor(245, 245, 245); doc.rect(15, 80, 180, 50, 'F');
    doc.setFontSize(11); doc.setTextColor(60, 60, 60);
    doc.text(`- Protocolo SSL/TLS: ${d.sslOk ? 'Ativo e Criptografado' : 'FALHA CRITICA'}`, 25, 92);
    doc.text(`- Protecao de E-mail (DMARC): ${d.temDmarc ? 'Protegido contra Spoofing' : 'VULNERAVEL'}`, 25, 102);
    doc.text(`- Reputacao VirusTotal: ${d.totalAlertas > 0 ? 'ALERTAS DETECTADOS' : 'Limpo'}`, 25, 112);
    doc.text(`- Motor de Infraestrutura: ${limparParaPDF(d.plataforma)}`, 25, 122);
    doc.setFontSize(12); doc.setTextColor(40, 40, 40); doc.text("POR QUE ESTES ITENS SAO CRITICOS?", 15, 145);
    doc.setFontSize(9); doc.setTextColor(80, 80, 80);
    const pqCritico = ["SSL: Garante que os dados dos seus clientes nao sejam interceptados por hackers.", "DMARC: Camada de seguranca que impede que usem seu e-mail para golpes (Spoofing).", "Reputacao: Verifica se o seu site possui virus ou esta em listas negras globais."];
    doc.text(pqCritico, 15, 155);
    doc.setFontSize(11); doc.setTextColor(40, 40, 40); doc.text("PARECER DO ESPECIALISTA:", 15, 180);
    doc.setFillColor(corTema[0], corTema[1], corTema[2]); doc.rect(15, 185, 180, 20, 'F');
    doc.setTextColor(255, 255, 255);
    const msg = d.score === "A+" ? "Ambiente em conformidade. Hardening preventivo recomendado." : "RISCO DETECTADO: Recomendamos mitigacao imediata.";
    doc.text(doc.splitTextToSize(msg, 170), 20, 197);
    doc.setFillColor(20, 20, 20); doc.rect(0, 260, 210, 37, 'F');
    try { doc.addImage("img/escudo_shiel.png", "PNG", 175, 265, 20, 20); } catch { }
    doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.text("WL TEC - CONSULTORIA EM CIBERSEGURANCA", 15, 275);
    doc.setFontSize(8); doc.text("contato@wl.tec.br | (11) 99531-4831 | www.wl.tec.br", 15, 285);
    doc.save(`Dossie_Resiliencia_${d.dominio}.pdf`);
}