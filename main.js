// 1. CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. FUNÇÃO QUE CAPTURA O LEAD (Agora com status_ssl)
async function capturarLead(dominio, score, statusSSL) {
    try {
        // Busca IP e Cidade do usuário
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        const ip = data.ip || 'Não identificado';
        const local = `${data.city || ''}, ${data.region || ''} - ${data.country_name || ''}`;

        // Envia os dados para a tabela 'leads'
        await _supabase
            .from('leads')
            .insert([{
                dominio: dominio,
                ip_usuario: ip,
                localizacao: local,
                score: score,
                status_ssl: statusSSL // Envia o dado para a nova coluna
            }]);
            
        console.log("Lead salvo com sucesso na Bazuca!");
    } catch (err) {
        console.error('Erro na captura:', err);
    }
}

// 3. ATUALIZA O ANO NO RODAPÉ
document.addEventListener('DOMContentLoaded', () => {
    const footer = document.querySelector('footer p');
    if (footer) {
        const anoAtual = new Date().getFullYear();
        footer.innerHTML = `&copy; ${anoAtual} WL TEC - Wiliam Longo. Todos os direitos reservados.`;
    }
});

// 4. FUNÇÃO PRINCIPAL DE DIAGNÓSTICO (A BAZUCA)
async function iniciarDiagnostico() {
    const dominioInput = document.getElementById('domainInput');
    const dominio = dominioInput.value.trim().toLowerCase();
    const resultArea = document.getElementById('resultArea');

    if (!dominio || !dominio.includes('.') || dominio.length < 4) {
        alert("Por favor, digite um domínio válido.");
        return;
    }

    resultArea.classList.remove('result-hidden');
    resultArea.innerHTML = `
        <div style="padding: 20px;">
            <p style="color: #00FFFF;">Iniciando varredura de segurança em: <strong>${dominio}</strong>...</p>
            <div class="loader"></div>
        </div>
    `;

    try {
        // CANO 1: Chamada à API DNS do Google (DMARC)
        const dmarcRes = await fetch(`https://dns.google/resolve?name=_dmarc.${dominio}&type=TXT`);
        const dmarcData = await dmarcRes.json();
        const temDmarc = dmarcData.Answer && dmarcData.Answer.length > 0;

        // CANO 2: Teste de SSL (Via fetch seguro)
        let sslOk = false;
        try {
            // Usamos mode: 'no-cors' para apenas checar a existência do certificado sem ser bloqueado
            await fetch(`https://${dominio}`, { mode: 'no-cors' });
            sslOk = true; 
        } catch (e) {
            sslOk = false;
        }

        // LÓGICA DE SCORE COMBINADO
        let scoreFinal = "Crítico";
        let cor = "#FF4444"; // Vermelho (Padrão)

        if (temDmarc && sslOk) {
            scoreFinal = "A+";
            cor = "#00FF00"; // Verde
        } else if (temDmarc || sslOk) {
            scoreFinal = "Alerta";
            cor = "#FFFF00"; // Amarelo
        }

        const statusSSLStr = sslOk ? "✅ Ativo" : "❌ Vulnerável";

        // ENVIA PARA O SUPABASE
        capturarLead(dominio, scoreFinal, statusSSLStr);

        setTimeout(() => {
            resultArea.innerHTML = `
                <div style="text-align: left; background: rgba(0,0,0,0.8); padding: 25px; border-left: 4px solid ${cor}; border-radius: 8px; position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                    
                    <img src="img/escudo_shiel.png" alt="Shield" style="position: absolute; top: 15px; right: 15px; height: 55px; width: auto; z-index: 10;">
                    
                    <div style="background: ${cor}; color: #000; padding: 5px 10px; border-radius: 4px; font-weight: bold; display: inline-block; margin-bottom: 10px;">SCORE: ${scoreFinal}</div>
                    
                    <h3 style="color: ${cor}; margin-top: 0; font-family: 'Rajdhani', sans-serif;">Relatório Longo Shield: ${dominio}</h3>
                    
                    <p style="margin: 10px 0;">🛡️ <strong>E-mail (DMARC):</strong> ${temDmarc ? '✅ Configurado' : '❌ Vulnerável'}</p>
                    <p style="margin: 10px 0;">🔒 <strong>Cadeado (SSL):</strong> ${statusSSLStr}</p>
                    
                    <hr style="border: 0.5px solid #333; margin: 15px 0;">
                    
                    <p style="color: #e0e0e0; font-size: 0.95rem; line-height: 1.4;">
                        ${scoreFinal === 'A+' 
                            ? "Parabéns! Sua infraestrutura segue protocolos de elite." 
                            : "<strong>Atenção:</strong> Identificamos brechas críticas que podem comprometer sua operação."}
                    </p>
                    
                    <button onclick="window.open('https://wa.me/5511995314831', '_blank')"
                            style="width: 100%; margin-top: 20px; background: ${cor}; color: #000; border: none; padding: 15px; font-weight: bold; font-family: 'Rajdhani', sans-serif; text-transform: uppercase; cursor: pointer; border-radius: 4px; transition: 0.3s;">
                        ${scoreFinal === 'A+' ? 'Manter Blindagem' : 'Solicitar Correção Imediata'}
                    </button>
                </div>
            `;
        }, 1500);

    } catch (error) {
        resultArea.innerHTML = `<p style="color: #FF4444; padding: 20px;">Erro na varredura. Tente novamente.</p>`;
        console.error("Erro na consulta:", error);
    }
}