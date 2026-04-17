// 1. Atualiza o ano no rodapé automaticamente
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

    if (!dominio || !dominio.includes('.') || dominio.length < 4) {
        alert("Por favor, digite um domínio válido.");
        return;
    }

    resultArea.classList.remove('result-hidden');
    resultArea.innerHTML = `
        <div style="padding: 20px;">
            <p style="color: #00FFFF;">Iniciando varredura em: <strong>${dominio}</strong>...</p>
            <div class="loader"></div>
        </div>
    `;

    try {
        const response = await fetch(`https://dns.google/resolve?name=_dmarc.${dominio}&type=TXT`);
        const data = await response.json();
        const temDmarc = data.Answer && data.Answer.length > 0;
        
        let statusDmarc = temDmarc 
            ? `<span style="color: #00FF00;">✅ Configurado</span>` 
            : `<span style="color: #FF4444;">❌ Não encontrado / Vulnerável</span>`;

            setTimeout(() => {
                // Lógica de Graduação (Score)
                let tituloRelatorio = "Relatório de Blindagem";
                let mensagemColor = "#FFBF00"; // Amarelo padrão
                let mensagemTexto = "";
                let statusBadge = "";
    
                if (temDmarc) {
                    // Se passou no teste
                    tituloRelatorio = "Certificado de Excelência";
                    mensagemColor = "#00FF00"; // Verde
                    statusBadge = `<div style="background: #00FF00; color: #000; padding: 5px 10px; border-radius: 4px; font-weight: bold; display: inline-block; margin-bottom: 10px;">SCORE: A+</div>`;
                    mensagemTexto = `Parabéns! O domínio <strong>${dominio}</strong> segue as melhores práticas mundiais de segurança de e-mail e proteção de identidade.`;
                } else {
                    // Se falhou
                    tituloRelatorio = "Alerta de Vulnerabilidade";
                    mensagemColor = "#FF4444"; // Vermelho
                    statusBadge = `<div style="background: #FF4444; color: #fff; padding: 5px 10px; border-radius: 4px; font-weight: bold; display: inline-block; margin-bottom: 10px;">SCORE: CRÍTICO</div>`;
                    mensagemTexto = `<strong>Atenção:</strong> Identificamos brechas críticas que permitem que criminosos enviem e-mails falsos usando o nome da sua empresa.`;
                }
    
                resultArea.innerHTML = `
                    <div style="text-align: left; background: rgba(0,0,0,0.6); padding: 25px; border-left: 4px solid ${mensagemColor}; border-radius: 8px; position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                        
                        <img src="img/escudo_shiel.png" alt="Shield" style="position: absolute; top: 15px; right: 15px; height: 55px; width: auto; z-index: 10;">
                        
                        ${statusBadge}
                        
                        <h3 style="color: ${mensagemColor}; margin-top: 0; font-family: 'Rajdhani', sans-serif; font-size: 1.5rem;">${tituloRelatorio}: ${dominio}</h3>
                        
                        <p style="margin: 10px 0;">🛡️ <strong>Protocolo DMARC:</strong> ${statusDmarc}</p>
                        <p style="margin: 10px 0;">🔒 <strong>Status Anti-Spoofing:</strong> ${temDmarc ? 'Protegido' : 'Vulnerável'}</p>
                        
                        <hr style="border: 0.5px solid #333; margin: 15px 0;">
                        
                        <p style="color: #e0e0e0; font-size: 0.95rem; line-height: 1.4;">
                            ${mensagemTexto}
                        </p>
                        
                        <button onclick="window.open('https://wa.me/5511995314831', '_blank')" 
                                style="width: 100%; margin-top: 20px; background: ${mensagemColor}; color: #000; border: none; padding: 15px; font-weight: bold; font-family: 'Rajdhani', sans-serif; text-transform: uppercase; cursor: pointer; border-radius: 4px; transition: 0.3s;">
                            ${temDmarc ? 'Manter Blindagem Atualizada' : 'Solicitar Plano de Mitigação'}
                        </button>
                    </div>
                `;
            }, 1500);

    } catch (error) {
        resultArea.innerHTML = `<p style="color: #FF4444;">Erro na varredura. Tente novamente.</p>`;
        console.error(error);
    }
}