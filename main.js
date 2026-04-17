// 1. Atualiza o ano no rodapé automaticamente (Puxa o ano atual do sistema)
document.addEventListener('DOMContentLoaded', () => {
    const footer = document.querySelector('footer p');
    if (footer) {
        const anoAtual = new Date().getFullYear();
        footer.innerHTML = `&copy; ${anoAtual} WL TEC - Wiliam Longo. Todos os direitos reservados.`;
    }
});

// 2. Função principal de Diagnóstico
async function iniciarDiagnostico() {
    const dominioInput = document.getElementById('domainInput');
    const dominio = dominioInput.value.trim().toLowerCase();
    const resultArea = document.getElementById('resultArea');

    // Validação básica de domínio
    if (!dominio || !dominio.includes('.') || dominio.length < 4) {
        alert("Por favor, digite um domínio válido (ex: empresa.com.br).");
        return;
    }

    // Mostra estado de carregamento (Loading)
    resultArea.classList.remove('result-hidden');
    resultArea.innerHTML = `
        <div style="padding: 20px;">
            <p style="color: #00FFFF;">Iniciando varredura de segurança em: <strong>${dominio}</strong>...</p>
            <div class="loader"></div>
        </div>
    `;

    try {
        // Chamada real à API DNS do Google procurando registros TXT do DMARC
        const response = await fetch(`https://dns.google/resolve?name=_dmarc.${dominio}&type=TXT`);
        const data = await response.json();

        // Verifica se existe resposta (Answer) no JSON do Google
        const temDmarc = data.Answer && data.Answer.length > 0;
        
        let statusDmarc = temDmarc 
            ? `<span style="color: #00FF00;">✅ Configurado</span>` 
            : `<span style="color: #FF4444;">❌ Não encontrado / Vulnerável</span>`;

        // Delay proposital de 1.5s para criar impacto visual no diagnóstico
        setTimeout(() => {
            resultArea.innerHTML = `
                <div style="text-align: left; background: rgba(0,0,0,0.5); padding: 25px; border-left: 4px solid #FFBF00; border-radius: 8px; position: relative; overflow: hidden;">
                    
                    <img src="./img/escudo_shield.png" alt="Shield" style="position: absolute; top: 10px; right: 10px; height: 50px; opacity: 0.8;">
                    
                    <h3 style="color: #FFBF00; margin-top: 0; font-family: 'Rajdhani', sans-serif;">Relatório de Blindagem: ${dominio}</h3>
                    
                    <p style="margin: 10px 0;">🛡️ <strong>Protocolo DMARC:</strong> ${statusDmarc}</p>
                    <p style="margin: 10px 0;">🔒 <strong>Status Anti-Spoofing:</strong> ${temDmarc ? 'Protegido contra falsificação' : 'Risco crítico de fraude de e-mail'}</p>
                    <p style="margin: 10px 0; font-size: 0.85rem; color: #888;">📡 Fonte: Google DNS Resolver API (8.8.8.8)</p>
                    
                    <hr style="border: 0.5px solid #333; margin: 15px 0;">
                    
                    <p style="color: #e0e0e0; font-size: 0.95rem; line-height: 1.4;">
                        ${temDmarc 
                            ? "Sua proteção básica está ativa. Recomendamos uma análise de resiliência profunda em sua infraestrutura de borda." 
                            : "<strong>Atenção:</strong> Sua empresa está vulnerável. Atacantes podem usar seu domínio para disparar e-mails falsos em seu nome."}
                    </p>
                    
                    <button onclick="window.location.href='https://wa.me/5511999999999'" 
                            style="width: 100%; margin-top: 20px; background: #FFBF00; color: #000; border: none; padding: 15px; font-weight: bold; font-family: 'Rajdhani', sans-serif; text-transform: uppercase; cursor: pointer; border-radius: 4px; transition: 0.3s;">
                        Solicitar Plano de Mitigação
                    </button>
                </div>
            `;
        }, 1500);

    } catch (error) {
        resultArea.innerHTML = `<p style="color: #FF4444; padding: 20px;">Ocorreu um erro na conexão com os servidores de varredura. Tente novamente.</p>`;
        console.error("Erro na consulta DNS:", error);
    }
}