// Atualiza o ano automaticamente (ajustado para 2026 conforme o tempo atual)
document.addEventListener('DOMContentLoaded', () => {
    const footer = document.querySelector('footer p');
    const anoAtual = new Date().getFullYear();
    footer.innerHTML = `&copy; ${anoAtual} WL TEC - Wiliam Longo. Todos os direitos reservados.`;
});

async function iniciarDiagnostico() {
    const dominio = document.getElementById('domainInput').value.trim();
    const resultArea = document.getElementById('resultArea');

    if (!dominio || !dominio.includes('.')) {
        alert("Por favor, digite um domínio válido (ex: empresa.com.br).");
        return;
    }

    // Interface de carregamento
    resultArea.classList.remove('result-hidden');
    resultArea.innerHTML = `
        <p style="color: #00FFFF;">Consultando servidores DNS para <strong>${dominio}</strong>...</p>
        <div class="loader"></div>
    `;

    try {
        // Chamada Real para a API do Google DNS procurando por DMARC
        const response = await fetch(`https://dns.google/resolve?name=_dmarc.${dominio}&type=TXT`);
        const data = await response.json();

        // Lógica de verificação: Se data.Answer existe, o DMARC está configurado
        const temDmarc = data.Answer && data.Answer.length > 0;
        
        let statusDmarc = temDmarc 
            ? `<span style="color: #00FF00;">✅ Configurado</span>` 
            : `<span style="color: #FF4444;">❌ Não encontrado ou Vulnerável</span>`;

        setTimeout(() => {
            resultArea.innerHTML = `
                <div style="text-align: left; background: rgba(0,0,0,0.4); padding: 25px; border-left: 4px solid #FFBF00; border-radius: 4px;">
                    <h3 style="color: #FFBF00; margin-top: 0;">Relatório Técnico: ${dominio}</h3>
                    <p>🛡️ <strong>Status DMARC:</strong> ${statusDmarc}</p>
                    <p>🔒 <strong>Segurança de E-mail:</strong> ${temDmarc ? 'Proteção Básica Ativa' : 'Risco de Spoofing (Falsificação)'}</p>
                    <p>📡 <strong>Varredura de Origem:</strong> Google DNS API 8.8.8.8</p>
                    
                    <hr style="border: 0.5px solid #4a4a4a; margin: 15px 0;">
                    
                    <p style="color: #e0e0e0; font-size: 0.9rem;">
                        ${temDmarc 
                            ? "O domínio possui proteção, mas recomenda-se uma auditoria de resiliência completa." 
                            : "<strong>Atenção:</strong> Criminosos podem enviar e-mails em nome da sua empresa."}
                    </p>
                    
                    <button onclick="window.location.href='https://wa.me/5511999999999'" 
                            style="width: 100%; margin-top: 15px; background: #FFBF00; color: #000; border: none; padding: 12px; font-weight: bold; cursor: pointer;">
                        Agendar Consultoria de Blindagem
                    </button>
                </div>
            `;
        }, 1500);

    } catch (error) {
        resultArea.innerHTML = `<p style="color: #FF4444;">Erro ao consultar API. Tente novamente mais tarde.</p>`;
        console.error("Erro na API:", error);
    }
}