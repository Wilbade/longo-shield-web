/**
 * WL TEC — /manutencao/app.js
 * Lógica do formulário de Pré-Abertura de OS
 * Integração: ViaCEP + Supabase + WhatsApp redirect
 */

(function () {
    'use strict';

    /* ── Supabase Client ───────────────────────────────────── */
    const SUPABASE_URL = 'https://giikoiqpnzgmhcqiuvhs.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB';
    const { createClient } = window.supabase;
    const db = createClient(SUPABASE_URL, SUPABASE_KEY);

    /* ── Telemetria Autônoma de Visitas (Analytics GEO & Buscadores) ── */
    (function registrarTelemetriaVisita() {
        try {
            const ref = (document.referrer || '').toLowerCase();
            const host = window.location.hostname;
            const path = window.location.pathname || '/manutencao/';

            let tipo = 'Direto / Outros';
            let nome = 'Direto';

            if (ref.includes('google.') || ref.includes('bing.com') || ref.includes('duckduckgo.com') || ref.includes('yahoo.com') || ref.includes('ecosia.org')) {
                tipo = 'Pesquisa Orgânica';
                if (ref.includes('google')) nome = 'Google Search';
                else if (ref.includes('bing')) nome = 'Bing Search';
                else if (ref.includes('duckduckgo')) nome = 'DuckDuckGo';
                else nome = 'Outro Buscador';
            } else if (ref.includes('chatgpt.com') || ref.includes('openai.com') || ref.includes('perplexity.ai') || ref.includes('gemini.google') || ref.includes('claude.ai') || ref.includes('copilot.microsoft')) {
                tipo = 'Pesquisa IA (GEO)';
                if (ref.includes('chatgpt') || ref.includes('openai')) nome = 'ChatGPT';
                else if (ref.includes('perplexity')) nome = 'Perplexity AI';
                else if (ref.includes('gemini')) nome = 'Google Gemini';
                else if (ref.includes('claude')) nome = 'Claude AI';
                else nome = 'Outra IA';
            } else if (ref.includes('instagram') || ref.includes('facebook') || ref.includes('wa.me') || ref.includes('whatsapp') || ref.includes('t.co') || ref.includes('linkedin')) {
                tipo = 'Redes Sociais';
                if (ref.includes('instagram')) nome = 'Instagram';
                else if (ref.includes('wa.me') || ref.includes('whatsapp')) nome = 'WhatsApp';
                else if (ref.includes('facebook')) nome = 'Facebook';
                else nome = 'Redes Sociais';
            } else if (ref && !ref.includes(host)) {
                tipo = 'Referral (Outros Sites)';
                try { nome = new URL(ref).hostname; } catch(e) { nome = 'Referral'; }
            }

            const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            db.from('site_visits').insert([{
                domain: host,
                pagina: path,
                referrer: document.referrer || 'Direto',
                origem_tipo: tipo,
                origem_nome: nome,
                dispositivo: isMobile ? 'Mobile' : 'Desktop'
            }]).then(() => {}).catch(() => {});
        } catch(e) {}
    })();

    /* ── DOM Refs ──────────────────────────────────────────── */
    const form      = document.getElementById('formPreOs');
    const btnSubmit = document.getElementById('btnEnviarOS');
    const toast     = document.getElementById('toast');

    // CEP
    const inputCep          = document.getElementById('cep');
    const cepStatus         = document.getElementById('cepStatus');
    const groupLogradouro   = document.getElementById('groupLogradouro');
    const groupNumero       = document.getElementById('groupNumero');
    const groupComplemento  = document.getElementById('groupComplemento');
    const inputLogradouro   = document.getElementById('logradouro');
    const inputNumero       = document.getElementById('numero');
    const inputBairro       = document.getElementById('bairro');
    const inputCidade       = document.getElementById('cidade');

    /* ── Toast Utility ─────────────────────────────────────── */
    let toastTimeout;
    function showToast(msg, type = 'success', durationMs = 4000) {
        clearTimeout(toastTimeout);
        toast.textContent = msg;
        toast.className = `toast toast-${type} show`;
        toastTimeout = setTimeout(() => toast.classList.remove('show'), durationMs);
    }

    /* ── Loading State ─────────────────────────────────────── */
    function setLoading(state) {
        btnSubmit.disabled = state;
        btnSubmit.classList.toggle('loading', state);
    }

    /* ── Exibir campos de endereço com animação ────────────── */
    function revealAddressFields() {
        [groupLogradouro, groupNumero, groupComplemento].forEach(el => {
            if (el.style.display === 'none') {
                el.style.display = 'flex';
                el.classList.add('address-revealed');
            }
        });
    }

    function hideAddressFields() {
        [groupLogradouro, groupNumero, groupComplemento].forEach(el => {
            el.style.display = 'none';
            el.classList.remove('address-revealed');
        });
    }

    /* ── Limpar campos de endereço ─────────────────────────── */
    function clearAddress() {
        inputLogradouro.value = '';
        inputBairro.value     = '';
        inputCidade.value     = '';
        hideAddressFields();
    }

    /* ── Máscara de CEP ────────────────────────────────────── */
    function mascaraCep(valor) {
        return valor.replace(/\D/g, '')
                    .slice(0, 8)
                    .replace(/^(\d{5})(\d)/, '$1-$2');
    }

    /* ── ViaCEP Fetch ──────────────────────────────────────── */
    let cepTimer;

    async function buscarCep(cep) {
        const cepLimpo = cep.replace(/\D/g, '');
        if (cepLimpo.length !== 8) return;

        // Indicador: carregando
        cepStatus.textContent = '⏳';
        cepStatus.title = 'Buscando CEP...';

        try {
            const res  = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await res.json();

            if (data.erro) {
                // CEP não encontrado
                cepStatus.textContent = '❌';
                cepStatus.title = 'CEP não encontrado';
                clearAddress();
                showToast('⚠️ CEP não encontrado. Preencha o endereço manualmente.', 'error', 4000);
                return;
            }

            // ✅ Preenche os campos automaticamente
            inputLogradouro.value = data.logradouro  || '';
            inputBairro.value     = data.bairro       || '';
            inputCidade.value     = `${data.localidade} – ${data.uf}`;

            cepStatus.textContent = '✅';
            cepStatus.title = 'Endereço encontrado!';

            // Revela logradouro, número e complemento
            revealAddressFields();

            // Foca no campo número para o cliente completar
            setTimeout(() => inputNumero.focus(), 350);

        } catch (_err) {
            cepStatus.textContent = '❌';
            cepStatus.title = 'Erro ao consultar CEP';
            clearAddress();
            showToast('⚠️ Não foi possível consultar o CEP. Verifique sua conexão.', 'error', 4000);
        }
    }

    /* ── Event: CEP input ──────────────────────────────────── */
    inputCep.addEventListener('input', () => {
        inputCep.value = mascaraCep(inputCep.value);
        cepStatus.textContent = '';

        const cepLimpo = inputCep.value.replace(/\D/g, '');

        // Limpa endereço se o CEP for apagado
        if (cepLimpo.length < 8) {
            clearAddress();
            return;
        }

        // Debounce de 600ms para não disparar a cada tecla
        clearTimeout(cepTimer);
        cepTimer = setTimeout(() => buscarCep(inputCep.value), 600);
    });

    // Também dispara ao sair do campo (blur) com CEP completo
    inputCep.addEventListener('blur', () => {
        const cepLimpo = inputCep.value.replace(/\D/g, '');
        if (cepLimpo.length === 8 && !inputLogradouro.value) {
            buscarCep(inputCep.value);
        }
    });

    /* ── Validação ─────────────────────────────────────────── */
    function validateForm(data) {
        if (!data.nome.trim())       return 'Por favor, informe seu nome completo.';
        if (!data.whatsapp.trim())   return 'Por favor, informe seu WhatsApp.';
        if (!data.bairro.trim())     return 'Por favor, informe seu bairro.';
        if (!data.equipamento)       return 'Por favor, selecione o tipo de equipamento.';
        if (!data.defeito.trim())    return 'Por favor, descreva o problema.';
        return null;
    }

    /* ── Monta endereço completo para gravar / WhatsApp ───── */
    function enderecoCompleto(data) {
        const partes = [];
        if (data.logradouro) partes.push(data.logradouro);
        if (data.numero)     partes.push(data.numero);
        if (data.complemento) partes.push(data.complemento);
        if (data.bairro)     partes.push(data.bairro);
        if (data.cidade)     partes.push(data.cidade);
        if (data.cep)        partes.push(`CEP: ${data.cep}`);
        return partes.join(', ');
    }

    /* ── WhatsApp Redirect ─────────────────────────────────── */
    function abrirWhatsApp(dados) {
        let msg = `Olá Wiliam! Acabei de abrir a solicitação do meu ${dados.equipamento} pelo site. Meu nome é ${dados.nome}.`;

        const end = enderecoCompleto(dados);
        if (end) msg += `\n\n📍 Endereço para retirada: ${end}`;
        if (dados.levaTraz) msg += `\n🚗 Confirmo o serviço de *Leva & Traz*.`;

        const url = `https://wa.me/5511914654157?text=${encodeURIComponent(msg)}`;
        setTimeout(() => window.open(url, '_blank'), 1800);
    }

    /* ── Supabase Insert ───────────────────────────────────── */
    async function salvarNoBanco(dados) {
        try {
            let fotoPublicUrl = null;

            // Se o cliente anexou uma foto da tela/equipamento, faz o upload para o bucket fotos-os
            const inputFoto = document.getElementById('fotoCliente');
            if (inputFoto && inputFoto.files && inputFoto.files[0]) {
                try {
                    const file = inputFoto.files[0];
                    const ext = file.name.split('.').pop() || 'jpg';
                    const fileName = `cliente_${Date.now()}_${Math.random().toString(36).substring(2,7)}.${ext}`;
                    
                    const { error: uploadErr } = await db.storage.from('fotos-os').upload(fileName, file);
                    if (!uploadErr) {
                        const { data: urlData } = db.storage.from('fotos-os').getPublicUrl(fileName);
                        fotoPublicUrl = urlData.publicUrl;
                    }
                } catch (eFoto) {
                    console.warn('[WL TEC] Upload foto cliente:', eFoto);
                }
            }

            const payload = {
                nome_cliente:     dados.nome,
                whatsapp:         dados.whatsapp,
                cep:              dados.cep || null,
                logradouro:       dados.logradouro || null,
                numero:           dados.numero || null,
                complemento:      dados.complemento || null,
                bairro_cidade:    dados.bairro + (dados.cidade ? ` – ${dados.cidade}` : ''),
                equipamento:      dados.equipamento,
                defeito_relatado: dados.defeito,
                leva_e_traz:      dados.levaTraz,
                foto_url:         fotoPublicUrl,
                status:           'Solicitação Web',
                origem:           'Landing Page /manutencao/',
                criado_em:        new Date().toISOString(),
            };

            // Salva backup no localStorage para garantir que a solicitação nunca se perca localmente
            try {
                payload.id = 'local_' + Date.now();
                const localLeads = JSON.parse(localStorage.getItem('wltec_pre_chamados') || '[]');
                localLeads.unshift(payload);
                localStorage.setItem('wltec_pre_chamados', JSON.stringify(localLeads.slice(0, 50)));
            } catch (_) {}

            const { error } = await db.from('pre_chamados').insert([payload]);

            if (error && error.code === '42P01') {
                // Fallback: tabela pre_chamados não existe ainda
                await db.from('ordens_servico').insert([{
                    equipamento:      dados.equipamento,
                    defeito_relatado: dados.defeito,
                    status:           'Solicitação Web',
                }]);
            } else if (error) {
                console.warn('[WL TEC] Supabase pre_chamados insert error:', error.message);
            }

        } catch (err) {
            console.warn('[WL TEC] Supabase:', err.message || err);
        }
    }

    /* ── Form Submit ───────────────────────────────────────── */
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const dados = {
            nome:        document.getElementById('nome').value.trim(),
            whatsapp:    document.getElementById('whatsapp').value.trim(),
            cep:         inputCep.value.trim(),
            logradouro:  inputLogradouro.value.trim(),
            numero:      inputNumero.value.trim(),
            complemento: document.getElementById('complemento').value.trim(),
            bairro:      inputBairro.value.trim(),
            cidade:      inputCidade.value.trim(),
            equipamento: document.getElementById('equipamento').value,
            defeito:     document.getElementById('defeito').value.trim(),
            levaTraz:    document.getElementById('levaTraz').checked,
        };

        const erro = validateForm(dados);
        if (erro) {
            showToast('⚠️ ' + erro, 'error', 5000);
            return;
        }

        setLoading(true);
        await salvarNoBanco(dados);
        setLoading(false);

        showToast('✅ Chamado registrado! Redirecionando para o WhatsApp...', 'success', 5000);
        form.reset();
        clearAddress();
        cepStatus.textContent = '';

        abrirWhatsApp(dados);
    });

    /* ── Máscara de Telefone ───────────────────────────────── */
    const inputTel = document.getElementById('whatsapp');
    if (inputTel) {
        inputTel.addEventListener('input', () => {
            let v = inputTel.value.replace(/\D/g, '').slice(0, 11);
            if (v.length > 6) {
                v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
            } else if (v.length > 2) {
                v = `(${v.slice(0,2)}) ${v.slice(2)}`;
            }
            inputTel.value = v;
        });
    }

    /* ── Smooth Scroll ─────────────────────────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const target = document.getElementById(anchor.getAttribute('href').slice(1));
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

})();
