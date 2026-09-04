/**
 * WL TEC — Banner de Consentimento de Cookies & Registro de Auditoria LGPD (Lei nº 13.709/2018)
 * Componente universal, ultra-compacto, contextual e auditável.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'wl_cookie_consent_v1';
    const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';

    // Se o usuário já aceitou, não exibe o banner novamente
    if (localStorage.getItem(STORAGE_KEY) === 'true') {
        return;
    }

    // Injeta os estilos CSS do banner super compacto
    const style = document.createElement('style');
    style.textContent = `
        .wl-cookie-banner {
            position: fixed;
            bottom: 1rem;
            left: 50%;
            transform: translateX(-50%) translateY(140%);
            width: calc(100% - 1.5rem);
            max-width: 720px;
            background: rgba(14, 18, 24, 0.96);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            border: 1px solid rgba(0, 255, 255, 0.2);
            border-left: 3px solid #00FFFF;
            border-radius: 10px;
            padding: 0.75rem 1.15rem;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            color: #e8edf5;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .wl-cookie-banner.show {
            transform: translateX(-50%) translateY(0);
        }

        .wl-cookie-content {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            flex: 1;
        }

        .wl-cookie-icon {
            font-size: 1.1rem;
            line-height: 1;
            flex-shrink: 0;
        }

        .wl-cookie-text {
            font-size: 0.8rem;
            line-height: 1.4;
            color: #94a3b8;
        }

        .wl-cookie-text strong {
            color: #e8edf5;
            font-weight: 600;
        }

        .wl-cookie-text a {
            color: #00FFFF;
            text-decoration: underline;
            text-underline-offset: 2px;
        }

        .wl-cookie-actions {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-shrink: 0;
        }

        .wl-cookie-btn {
            padding: 0.42rem 0.9rem;
            border-radius: 99px;
            font-size: 0.76rem;
            font-weight: 700;
            cursor: pointer;
            border: none;
            transition: all 0.2s ease;
            white-space: nowrap;
            font-family: inherit;
        }

        .wl-cookie-btn-accept {
            background: linear-gradient(135deg, #00FFFF, #00cccc);
            color: #0a0c10;
            box-shadow: 0 2px 10px rgba(0, 255, 255, 0.25);
        }

        .wl-cookie-btn-accept:hover {
            background: linear-gradient(135deg, #33ffff, #00FFFF);
            box-shadow: 0 4px 14px rgba(0, 255, 255, 0.4);
            transform: translateY(-1px);
        }

        .wl-cookie-btn-policy {
            background: transparent;
            border: 1px solid #2d3748;
            color: #cbd5e1;
        }

        .wl-cookie-btn-policy:hover {
            border-color: #00FFFF;
            color: #00FFFF;
        }

        @media (max-width: 600px) {
            .wl-cookie-banner {
                flex-direction: column;
                align-items: stretch;
                padding: 0.85rem 1rem;
                bottom: 0.75rem;
                gap: 0.75rem;
                width: calc(100% - 1rem);
            }
            .wl-cookie-actions {
                display: flex;
                flex-direction: row;
                width: 100%;
                gap: 0.5rem;
            }
            .wl-cookie-btn {
                flex: 1;
                text-align: center;
                padding: 0.5rem;
            }
        }
    `;
    document.head.appendChild(style);

    // Determina contextualmente qual página de política exibir
    const isManutencao = window.location.pathname.includes('/manutencao');
    const isOfertas = window.location.pathname.includes('/ofertas');
    let policyUrl = '/politica-de-privacidade.html';
    if (isManutencao) policyUrl = 'privacidade.html';
    else if (isOfertas) policyUrl = '../politica-de-privacidade.html';

    let origemNome = 'Cibersegurança (/)';
    if (isManutencao) origemNome = 'Manutenção (/manutencao/)';
    else if (isOfertas) origemNome = 'WL TEC Ofertas (/ofertas/)';

    // Cria os elementos do DOM
    const banner = document.createElement('div');
    banner.className = 'wl-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Aviso de Privacidade e Cookies');

    banner.innerHTML = `
        <div class="wl-cookie-content">
            <div class="wl-cookie-icon" aria-hidden="true">🛡️</div>
            <div class="wl-cookie-text">
                Usamos cookies para segurança e funcionamento do site (<a href="${policyUrl}">LGPD</a>).
            </div>
        </div>
        <div class="wl-cookie-actions">
            <button class="wl-cookie-btn wl-cookie-btn-accept" id="wlCookieAccept">
                ✓ Aceitar
            </button>
            <a href="${policyUrl}" class="wl-cookie-btn wl-cookie-btn-policy" style="text-decoration:none">
                Política
            </a>
        </div>
    `;

    document.body.appendChild(banner);

    // Animação de entrada suave
    setTimeout(() => {
        banner.classList.add('show');
    }, 400);

    /**
     * Grava a prova de consentimento no banco de dados Supabase (Auditoria LGPD)
     */
    async function registrarConsentimentoNoBanco() {
        try {
            if (!window.supabase || !window.supabase.createClient) return;

            const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            await client.from('lgpd_consentimentos').insert([{
                origem: origemNome,
                versao_termo: 'v1.0',
                user_agent: navigator.userAgent,
                data_hora: new Date().toISOString()
            }]);
        } catch (err) {
            console.warn('[WL TEC LGPD] Consentimento local:', err.message || err);
        }
    }

    // Evento de clique no botão "Aceitar"
    document.getElementById('wlCookieAccept').addEventListener('click', function () {
        localStorage.setItem(STORAGE_KEY, 'true');
        registrarConsentimentoNoBanco();
        banner.classList.remove('show');
        setTimeout(() => {
            if (banner.parentNode) banner.parentNode.removeChild(banner);
        }, 350);
    });

})();
