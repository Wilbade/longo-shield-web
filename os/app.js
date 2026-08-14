/**
 * WL TEC — /os/app.js
 * Painel Interno: Nova OS | Lista de OS | Leads Web
 *
 * CORREÇÃO: supabase-js v2 via CDN expõe window.supabase.createClient
 * O arquivo NÃO é um ES module (removido type="module" no HTML).
 */

// ── Supabase Client ──────────────────────────────────────────
const { createClient } = window.supabase;
const db = createClient(
    'https://giikoiqpnzgmhcqiuvhs.supabase.co',
    'sb_publishable_dtsJRRjhIKGt3OMakg4gUQ_4K0LviLB'
);

// ── DOM: Autenticação & Modais ──────────────────────────────
const loginOverlay = document.getElementById('loginOverlay');
const mainHeader   = document.getElementById('mainHeader');
const authForm     = document.getElementById('auth-form');
const inputEmail   = document.getElementById('email');
const inputPass    = document.getElementById('password');
const btnAuth      = document.getElementById('btn-auth');
const authSpinner  = document.getElementById('authSpinner');
const authLabel    = document.getElementById('authLabel');
const errorAuth    = document.getElementById('error-auth');
const btnLogout    = document.getElementById('btnLogout');

// ── DOM: Seções & Navegação ─────────────────────────────────
const btnNovaOs         = document.getElementById('btnNovaOs');
const btnListaOs        = document.getElementById('btnListaOs');
const btnLeadsOs        = document.getElementById('btnLeadsOs');
const btnClientes       = document.getElementById('btnClientes');
const btnEstoque        = document.getElementById('btnEstoque');
const btnTerceiros      = document.getElementById('btnTerceiros');
const btnCrmPreventiva  = document.getElementById('btnCrmPreventiva');
const btnDre            = document.getElementById('btnDre');

const secNovaOs         = document.getElementById('secNovaOs');
const secListaOs        = document.getElementById('secListaOs');
const secLeadsOs        = document.getElementById('secLeadsOs');
const secClientes       = document.getElementById('secClientes');
const secEstoque        = document.getElementById('secEstoque');
const secTerceiros      = document.getElementById('secTerceiros');
const secCrmPreventiva  = document.getElementById('secCrmPreventiva');
const secDre            = document.getElementById('secDre');

const leadsBadge        = document.getElementById('leadsBadge');

const allSections = [secNovaOs, secListaOs, secLeadsOs, secClientes, secEstoque, secTerceiros, secCrmPreventiva, secDre];
const allNavBtns  = [btnNovaOs, btnListaOs, btnLeadsOs, btnClientes, btnEstoque, btnTerceiros, btnCrmPreventiva, btnDre];

function switchSection(showSec, activeBtn) {
    allSections.forEach(s => s?.classList.add('hidden'));
    allNavBtns.forEach(b => b?.classList.remove('active'));
    showSec?.classList.remove('hidden');
    activeBtn?.classList.add('active');
}

// ── Autenticação de Sessão (Supabase Auth) ───────────────────
async function checkAuthSession() {
    try {
        const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
        const localAuth = localStorage.getItem('wltec_os_logged_in');

        const { data, error } = await db.auth.getSession();
        const session = data?.session;

        if (session || (isLocal && localAuth === 'true')) {
            // Logado ou modo de desenvolvimento local ativo
            if (loginOverlay) loginOverlay.style.display = 'none';
            if (mainHeader) mainHeader.classList.remove('hidden');
            switchSection(secNovaOs, btnNovaOs);
            contarLeadsNovos();
        } else {
            // Não logado: exibe formulário de login
            if (loginOverlay) loginOverlay.style.display = 'flex';
            if (mainHeader) mainHeader.classList.add('hidden');
            allSections.forEach(s => s?.classList.add('hidden'));
        }
    } catch (err) {
        console.error('Erro na checagem de sessão:', err);
    }
}

// ── Login Handler (Supabase Auth + Fallback Local) ───────────
authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorAuth) errorAuth.textContent = '';

    const email    = inputEmail.value.trim();
    const password = inputPass.value.trim();

    if (!email || !password) {
        if (errorAuth) errorAuth.textContent = 'Por favor, informe a conta e a senha.';
        return;
    }

    // UI Loading
    if (btnAuth) btnAuth.disabled = true;
    if (authSpinner) authSpinner.style.display = 'inline-block';
    if (authLabel) authLabel.textContent = 'Validando...';

    try {
        const { data, error } = await db.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // Sucesso Supabase Auth
        if (errorAuth) errorAuth.textContent = '';
        authForm.reset();
        localStorage.setItem('wltec_os_logged_in', 'true');
        await checkAuthSession();

    } catch (err) {
        console.warn('[WL TEC Auth]:', err.message);
        const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
        if (isLocal) {
            // Em ambiente local, permite login de desenvolvimento
            localStorage.setItem('wltec_os_logged_in', 'true');
            authForm.reset();
            await checkAuthSession();
        } else {
            if (errorAuth) {
                errorAuth.textContent = err.message === 'Invalid login credentials'
                    ? 'Credenciais inválidas. Verifique seu e-mail e senha.'
                    : (err.message || 'Erro ao autenticar. Tente novamente.');
            }
        }
    } finally {
        if (btnAuth) btnAuth.disabled = false;
        if (authSpinner) authSpinner.style.display = 'none';
        if (authLabel) authLabel.textContent = 'Validar Credenciais';
    }
});

// ── Logout Handler ───────────────────────────────────────────
btnLogout?.addEventListener('click', async () => {
    showLoading('Encerrando sessão...');
    localStorage.removeItem('wltec_os_logged_in');
    try { await db.auth.signOut(); } catch (_) {}
    hideLoading();
    checkAuthSession();
});

// ── DOM: Loading ─────────────────────────────────────────────
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingMessage = document.getElementById('loadingMessage');

function showLoading(msg = 'Processando...') {
    if (loadingMessage) loadingMessage.textContent = msg;
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}
function hideLoading() {
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

btnNovaOs?.addEventListener('click', () => switchSection(secNovaOs, btnNovaOs));

btnListaOs?.addEventListener('click', () => {
    switchSection(secListaOs, btnListaOs);
    loadOsList();
});

btnLeadsOs?.addEventListener('click', () => {
    switchSection(secLeadsOs, btnLeadsOs);
    loadLeads();
});

btnClientes?.addEventListener('click', () => {
    switchSection(secClientes, btnClientes);
    renderClientes();
});

btnEstoque?.addEventListener('click', () => {
    switchSection(secEstoque, btnEstoque);
    loadEstoque();
});

btnTerceiros?.addEventListener('click', () => {
    switchSection(secTerceiros, btnTerceiros);
    loadTerceiros();
});

btnCrmPreventiva?.addEventListener('click', () => {
    switchSection(secCrmPreventiva, btnCrmPreventiva);
    renderCrmPreventiva();
});

btnDre?.addEventListener('click', () => {
    switchSection(secDre, btnDre);
    loadDreFinanceiro();
});

// ── Assinatura ───────────────────────────────────────────────
const canvas = document.getElementById('signatureCanvas');
const btnClearSignature = document.getElementById('btnClearSignature');
const signaturePad = new SignaturePad(canvas, { backgroundColor: 'rgb(255, 255, 255)' });

function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width  = canvas.parentElement.offsetWidth * ratio;
    canvas.height = 200 * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    signaturePad.clear();
}
window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100);

btnClearSignature.addEventListener('click', () => signaturePad.clear());

// ── Sanitização Anti-XSS ────────────────────────────────────
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
}

// ── Upload de Fotos (Validação de Tipos) ──────────────────────
const fotosUpload  = document.getElementById('fotosUpload');
const fotosPreview = document.getElementById('fotosPreview');
let selectedFiles  = [];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

fotosUpload.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            alert(`O arquivo "${file.name}" não é uma imagem válida (apenas JPG, PNG ou WEBP).`);
            continue;
        }
        selectedFiles.push(file);
        const reader = new FileReader();
        reader.onload = ev => {
            const img = document.createElement('img');
            img.src = ev.target.result;
            img.className = 'foto-preview';
            fotosPreview.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
});

// ── Helpers ──────────────────────────────────────────────────
function generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ── Nova OS: submit ──────────────────────────────────────────
const formNovaOs = document.getElementById('formNovaOs');

formNovaOs.addEventListener('submit', async (e) => {
    e.preventDefault();

    showLoading('Fazendo upload das fotos...');
    try {
        const uploadedUrls = [];
        for (const file of selectedFiles) {
            const ext = file.name.split('.').pop();
            const fileName = `${generateUUID()}.${ext}`;
            const { error: errUpload } = await db.storage.from('fotos-os').upload(fileName, file);
            if (errUpload) throw errUpload;
            const { data: urlData } = db.storage.from('fotos-os').getPublicUrl(fileName);
            uploadedUrls.push(urlData.publicUrl);
        }

        const nomeVal   = document.getElementById('clienteNome').value.trim();
        const telVal    = document.getElementById('clienteTelefone').value.trim();
        const emailVal  = document.getElementById('clienteEmail')?.value.trim() || '';
        const cpfVal    = document.getElementById('clienteCpf').value.trim();

        const marcaVal  = document.getElementById('clienteMarca')?.value || 'Notebook';
        const modeloVal = document.getElementById('clienteModelo')?.value.trim() || '';
        const equipTipo = document.getElementById('equipamento').value.trim();
        const equipFull = `${marcaVal} ${modeloVal} (${equipTipo})`.trim();

        const sigBase64 = signaturePad.isEmpty() ? null : signaturePad.toDataURL();

        showLoading('Salvando dados...');
        let clienteId = null;
        try {
            const { data: cliente, error: errCliente } = await db
                .from('clientes_os')
                .insert([{
                    nome:     nomeVal,
                    telefone: telVal,
                    cpf_cnpj: cpfVal,
                }])
                .select()
                .single();
            if (!errCliente && cliente) clienteId = cliente.id;
        } catch (_) {}

        const newUuid = generateUUID();
        const osPayload = {
            id:                        newUuid,
            numero_os:                 Math.floor(1000 + Math.random() * 9000).toString(),
            cliente_id:                clienteId,
            equipamento:               equipFull,
            marca:                     marcaVal,
            modelo:                    modeloVal,
            numero_serie:              document.getElementById('numeroSerie').value.trim(),
            defeito_relatado:          document.getElementById('defeitoRelatado').value.trim(),
            assinatura_cliente_base64: sigBase64,
            fotos_urls:                uploadedUrls,
            status:                    'Aberto',
            criado_em:                 new Date().toISOString(),
            clientes_os:               { nome: nomeVal, telefone: telVal, cpf_cnpj: cpfVal, email: emailVal }
        };

        try {
            const { data: createdDbOs } = await db.from('ordens_servico').insert([{
                cliente_id:                clienteId,
                equipamento:               equipFull,
                numero_serie:              osPayload.numero_serie,
                defeito_relatado:          osPayload.defeito_relatado,
                assinatura_cliente_base64: sigBase64,
                fotos_urls:                uploadedUrls,
                status:                    'Aberto',
            }]).select().single();

            if (createdDbOs?.id) {
                osPayload.id = createdDbOs.id;
            }
        } catch (_) {}

        _ordensCache.unshift(osPayload);

        hideLoading();
        alert(`Ordem de Serviço Nº #${osPayload.numero_os} criada com sucesso!${!sigBase64 ? ' (Assinatura poderá ser colhida presencialmente na visita)' : ''}`);
        formNovaOs.reset();
        signaturePad.clear();
        fotosPreview.innerHTML = '';
        selectedFiles = [];
        switchSection(secListaOs, btnListaOs);
        renderOsList(_ordensCache);

    } catch (err) {
        hideLoading();
        console.error('Erro ao salvar OS:', err);
        alert('Erro ao salvar OS. Verifique o console (F12).');
    }
});

// ── Lista de OS ──────────────────────────────────────────────
const osListContainer = document.getElementById('osListContainer');
const filterStatus    = document.getElementById('filterStatus');
let _ordensCache      = [];

async function loadOsList() {
    showLoading('Carregando OS...');
    try {
        let query = db
            .from('ordens_servico')
            .select('*, clientes_os(nome, telefone, cpf_cnpj)')
            .order('criado_em', { ascending: false });

        const f = filterStatus.value;
        if (f !== 'Todos') query = query.eq('status', f);

        const { data: ordens, error } = await query;
        if (error) throw error;
        _ordensCache = ordens || [];
        renderOsList(_ordensCache);
    } catch (err) {
        console.error('Erro ao carregar OS:', err);
        alert('Erro ao carregar lista de OS.');
    } finally {
        hideLoading();
    }
}

filterStatus.addEventListener('change', loadOsList);

function renderOsList(ordens) {
    osListContainer.innerHTML = '';
    if (!ordens || ordens.length === 0) {
        osListContainer.innerHTML = '<p class="text-muted">Nenhuma Ordem de Serviço encontrada.</p>';
        return;
    }
    ordens.forEach(os => {
        const nome    = escapeHTML(os.clientes_os?.nome || 'Cliente Desconhecido');
        const tel     = escapeHTML(os.clientes_os?.telefone || '');
        const equip   = escapeHTML(os.equipamento);
        const def     = escapeHTML(os.defeito_relatado);
        const diag    = escapeHTML(os.diagnostico || '');
        const feito   = escapeHTML(os.servico_realizado || '');
        const pixCode = escapeHTML(os.pix_copia_cola || '');
        const statusClean = escapeHTML(os.status || 'Aberto');
        const valFormatted = os.valor_total ? `R$ ${parseFloat(os.valor_total).toFixed(2)}` : 'A definir';

        const badgeAssinatura = !os.assinatura_cliente_base64
            ? `<span style="background:rgba(255,179,0,0.15);color:var(--color-amber);border:1px solid rgba(255,179,0,0.3);padding:0.2rem 0.5rem;border-radius:4px;font-size:0.75rem;font-weight:600;display:inline-block">✍️ Assinatura Pendente</span>`
            : `<span style="background:rgba(16,185,129,0.15);color:var(--color-emerald);border:1px solid rgba(16,185,129,0.3);padding:0.2rem 0.5rem;border-radius:4px;font-size:0.75rem;font-weight:600;display:inline-block">✅ Assinada</span>`;

        const card  = document.createElement('div');
        card.className = 'os-card';
        card.innerHTML = `
            <div class="os-header">
                <div>
                    <h3>${nome}</h3>
                    <span class="os-id">Data: ${new Date(os.criado_em).toLocaleDateString('pt-BR')}</span>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.35rem;">
                    <span class="os-status status-${statusClean.toLowerCase().replace(/ /g,'-')}">${statusClean}</span>
                    ${badgeAssinatura}
                </div>
            </div>
            <div class="os-body">
                <p><strong>Equipamento:</strong> ${equip}</p>
                <p><strong>Defeito Relatado:</strong> ${def}</p>
                ${diag ? `<p style="color:var(--color-amber);margin-top:0.4rem;"><strong>Diagnóstico / A Fazer:</strong> ${diag}</p>` : ''}
                ${feito ? `<p style="color:var(--color-cyan);margin-top:0.4rem;"><strong>Serviço Realizado:</strong> ${feito}</p>` : ''}
                <p style="margin-top:0.5rem;font-size:1.05rem;"><strong>Valor Total:</strong> <span style="color:${os.valor_total ? 'var(--color-amber)' : 'var(--text-muted)'};font-weight:700;">${valFormatted}</span></p>
            </div>
            <div class="os-actions" style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border-color);display:flex;gap:0.4rem;flex-wrap:wrap">
                <button class="btn btn-secondary btn-action" onclick="abrirModalEditar('${escapeHTML(os.id)}')">⚙️ Atualizar OS</button>
                <button class="btn btn-outline btn-action" onclick="gerarPDF('${escapeHTML(os.id)}')">📄 Gerar PDF</button>
                <button class="btn btn-primary btn-action" onclick="enviarWhatsApp('${tel}','${nome}','${equip}',${os.valor_total||0},'${pixCode}','${statusClean}','${diag}','${feito}')">💬 WhatsApp + PIX</button>
                ${os.fotos_urls?.length ? `<button class="btn btn-outline btn-action" onclick='verFotos(${JSON.stringify(os.fotos_urls)})'>📷 Fotos (${os.fotos_urls.length})</button>` : ''}
            </div>`;
        osListContainer.appendChild(card);
    });
}

// ── Modal Editar OS (Esteira de Reparo, Assinatura & Fotos) ──
const modalEditarOs          = document.getElementById('modalEditarOs');
const btnCloseModalEditar    = document.getElementById('btnCloseModalEditar');
const formEditarOs           = document.getElementById('formEditarOs');
const editOsId               = document.getElementById('editOsId');
const editStatus             = document.getElementById('editStatus');
const editMaoDeObra          = document.getElementById('editMaoDeObra');
const editValorPecas         = document.getElementById('editValorPecas');
const editDeslocamento       = document.getElementById('editDeslocamento');
const lblValorTotal          = document.getElementById('lblValorTotal');
const editValor              = document.getElementById('editValor');
const editDiagnostico        = document.getElementById('editDiagnostico');
const editServicoRealizado   = document.getElementById('editServicoRealizado');
const editPix                = document.getElementById('editPix');

// Assinatura Presencial no Modal de Edição
const editCanvas             = document.getElementById('editSignatureCanvas');
const btnClearEditSignature  = document.getElementById('btnClearEditSignature');
const boxAssinaturaExistente = document.getElementById('boxAssinaturaExistente');
const imgAssinaturaExistente = document.getElementById('imgAssinaturaExistente');
const btnRefazerAssinatura   = document.getElementById('btnRefazerAssinatura');
const boxCanvasAssinatura    = document.getElementById('boxCanvasAssinatura');

let editSignaturePad = null;
if (editCanvas) {
    editSignaturePad = new SignaturePad(editCanvas, { backgroundColor: 'rgb(255, 255, 255)' });
}

function resizeEditCanvas() {
    if (!editCanvas || !editSignaturePad) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const parentW = editCanvas.parentElement ? editCanvas.parentElement.offsetWidth : 400;
    if (parentW > 0) {
        editCanvas.width = parentW * ratio;
        editCanvas.height = 200 * ratio;
        editCanvas.getContext('2d').scale(ratio, ratio);
        editSignaturePad.clear();
    }
}

btnClearEditSignature?.addEventListener('click', () => {
    if (editSignaturePad) editSignaturePad.clear();
});

btnRefazerAssinatura?.addEventListener('click', () => {
    boxAssinaturaExistente.classList.add('hidden');
    boxCanvasAssinatura.classList.remove('hidden');
    resizeEditCanvas();
});

// Upload de Fotos Adicionais na Visita Presencial
const editFotosUpload  = document.getElementById('editFotosUpload');
const editFotosPreview = document.getElementById('editFotosPreview');
let editSelectedFiles  = [];

editFotosUpload?.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            alert(`O arquivo "${file.name}" não é uma imagem válida (apenas JPG, PNG ou WEBP).`);
            continue;
        }
        editSelectedFiles.push(file);
        const reader = new FileReader();
        reader.onload = ev => {
            const img = document.createElement('img');
            img.src = ev.target.result;
            img.className = 'foto-preview';
            editFotosPreview.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
});

// Recálculo em Tempo Real de Valor Total da OS (Mão de Obra + Peças + Deslocamento)
function recalcularValorTotalOS() {
    const mo  = parseFloat(editMaoDeObra.value || 0);
    const pec = parseFloat(editValorPecas.value || 0);
    const des = parseFloat(editDeslocamento.value || 0);
    const tot = mo + pec + des;
    lblValorTotal.textContent = tot.toFixed(2);
    editValor.value = tot;
}

[editMaoDeObra, editValorPecas, editDeslocamento].forEach(inp => {
    inp?.addEventListener('input', recalcularValorTotalOS);
});

// Calculadora Automática de Deslocamento Leva & Traz
const calcVeiculo   = document.getElementById('calcVeiculo');
const calcRegiao    = document.getElementById('calcRegiao');
const calcKmTotal   = document.getElementById('calcKmTotal');
const btnCalcularDeslocamento = document.getElementById('btnCalcularDeslocamento');

calcRegiao?.addEventListener('change', () => {
    if (calcRegiao.value !== 'custom') {
        calcKmTotal.value = calcRegiao.value;
    }
});

btnCalcularDeslocamento?.addEventListener('click', () => {
    const km = parseFloat(calcKmTotal.value || 0);
    const taxaKm = calcVeiculo.value === 'carro' ? 1.00 : 0.50; // Carro: R$ 1,00/km (gasolina + desgaste 10km/l) vs Moto R$ 0,50/km (20km/l)
    const custoTotal = km * taxaKm;
    editDeslocamento.value = custoTotal.toFixed(2);
    recalcularValorTotalOS();
    alert(`Custo de Deslocamento calculado: R$ ${custoTotal.toFixed(2)} (${km} km no modo ${calcVeiculo.value.toUpperCase()})`);
});

window.abrirModalEditar = function(osId) {
    const os = _ordensCache.find(item => item.id === osId);
    if (!os) return alert('OS não encontrada em cache.');

    editOsId.value             = os.id;
    
    // Preenche os dados editáveis do cliente & equipamento
    const editClienteNome     = document.getElementById('editClienteNome');
    const editClienteTelefone = document.getElementById('editClienteTelefone');
    const editClienteEmail    = document.getElementById('editClienteEmail');
    const editClienteCpf      = document.getElementById('editClienteCpf');
    const editEquipamento     = document.getElementById('editEquipamento');
    const editNumeroSerie     = document.getElementById('editNumeroSerie');
    const editDefeitoRelatado = document.getElementById('editDefeitoRelatado');

    if (editClienteNome) editClienteNome.value = os.clientes_os?.nome || '';
    if (editClienteTelefone) editClienteTelefone.value = os.clientes_os?.telefone || '';
    if (editClienteEmail) editClienteEmail.value = os.clientes_os?.email || '';
    if (editClienteCpf) editClienteCpf.value = os.clientes_os?.cpf_cnpj || '';
    if (editEquipamento) editEquipamento.value = os.equipamento || '';
    if (editNumeroSerie) editNumeroSerie.value = os.numero_serie || '';
    if (editDefeitoRelatado) editDefeitoRelatado.value = os.defeito_relatado || '';

    editStatus.value           = os.status || 'Aberto';
    editDeslocamento.value     = os.custo_deslocamento || '';
    editMaoDeObra.value        = os.valor_total ? Math.max(0, os.valor_total - (os.custo_deslocamento || 0)) : '';
    editValorPecas.value       = '';
    editDiagnostico.value      = os.diagnostico || '';
    editServicoRealizado.value = os.servico_realizado || '';
    editPix.value              = os.pix_copia_cola || '';

    // Limpa e exibe fotos existentes
    if (editFotosPreview) {
        editFotosPreview.innerHTML = '';
        editSelectedFiles = [];
        if (os.fotos_urls && os.fotos_urls.length > 0) {
            os.fotos_urls.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.className = 'foto-preview';
                img.title = 'Foto já anexada';
                editFotosPreview.appendChild(img);
            });
        }
    }

    // Assinatura do Cliente
    if (os.assinatura_cliente_base64) {
        boxAssinaturaExistente?.classList.remove('hidden');
        if (imgAssinaturaExistente) imgAssinaturaExistente.src = os.assinatura_cliente_base64;
        boxCanvasAssinatura?.classList.add('hidden');
    } else {
        boxAssinaturaExistente?.classList.add('hidden');
        boxCanvasAssinatura?.classList.remove('hidden');
        if (editSignaturePad) editSignaturePad.clear();
    }

    recalcularValorTotalOS();
    modalEditarOs.classList.remove('hidden');
    setTimeout(resizeEditCanvas, 150);
};

btnCloseModalEditar.addEventListener('click', () => modalEditarOs.classList.add('hidden'));

formEditarOs.addEventListener('submit', async (e) => {
    e.preventDefault();
    const osId = editOsId.value;
    if (!osId) return;

    showLoading('Atualizando Ordem de Serviço...');
    try {
        const osObj = _ordensCache.find(o => o.id === osId);

        // 1. Upload de novas fotos se houver
        let novasFotosUrls = [];
        if (editSelectedFiles.length > 0) {
            showLoading(`Fazendo upload de ${editSelectedFiles.length} nova(s) foto(s)...`);
            for (const file of editSelectedFiles) {
                const ext = file.name.split('.').pop();
                const fileName = `${generateUUID()}.${ext}`;
                const { error: errUpload } = await db.storage.from('fotos-os').upload(fileName, file);
                if (errUpload) throw errUpload;
                const { data: urlData } = db.storage.from('fotos-os').getPublicUrl(fileName);
                novasFotosUrls.push(urlData.publicUrl);
            }
        }

        const fotosFinais = [...(osObj?.fotos_urls || []), ...novasFotosUrls];

        // 2. Assinatura do cliente
        let assinaturaFinal = osObj?.assinatura_cliente_base64 || null;
        if (editSignaturePad && !editSignaturePad.isEmpty()) {
            assinaturaFinal = editSignaturePad.toDataURL();
        }

        const valNum = editValor.value ? parseFloat(editValor.value) : null;
        const desNum = editDeslocamento.value ? parseFloat(editDeslocamento.value) : 0;
        const diagText = editDiagnostico.value.trim();
        const feitoText = editServicoRealizado.value.trim();
        const pixText = editPix.value.trim();
        const statusVal = editStatus.value;

        const nomeVal = document.getElementById('editClienteNome')?.value.trim() || '';
        const telVal = document.getElementById('editClienteTelefone')?.value.trim() || '';
        const emailVal = document.getElementById('editClienteEmail')?.value.trim() || '';
        const cpfVal = document.getElementById('editClienteCpf')?.value.trim() || '';
        const equipVal = document.getElementById('editEquipamento')?.value.trim() || '';
        const numSerieVal = document.getElementById('editNumeroSerie')?.value.trim() || '';
        const defRelVal = document.getElementById('editDefeitoRelatado')?.value.trim() || '';

        // Atualiza imediatamente o cache local para UX fluida
        if (osObj) {
            osObj.status = statusVal;
            osObj.valor_total = valNum;
            osObj.custo_deslocamento = desNum;
            osObj.diagnostico = diagText;
            osObj.servico_realizado = feitoText;
            osObj.pix_copia_cola = pixText;
            osObj.fotos_urls = fotosFinais;
            osObj.assinatura_cliente_base64 = assinaturaFinal;
            if (equipVal) osObj.equipamento = equipVal;
            if (numSerieVal !== undefined) osObj.numero_serie = numSerieVal;
            if (defRelVal !== undefined) osObj.defeito_relatado = defRelVal;

            if (!osObj.clientes_os) osObj.clientes_os = {};
            if (nomeVal) osObj.clientes_os.nome = nomeVal;
            if (telVal) osObj.clientes_os.telefone = telVal;
            osObj.clientes_os.email = emailVal;
            osObj.clientes_os.cpf_cnpj = cpfVal;
        }

        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(osId);

        if (isValidUUID) {
            await db
                .from('ordens_servico')
                .update({
                    status: statusVal,
                    valor_total: valNum,
                    custo_deslocamento: desNum,
                    diagnostico: diagText,
                    servico_realizado: feitoText,
                    pix_copia_cola: pixText,
                    equipamento: equipVal || undefined,
                    numero_serie: numSerieVal || undefined,
                    defeito_relatado: defRelVal || undefined,
                    assinatura_cliente_base64: assinaturaFinal,
                    fotos_urls: fotosFinais
                })
                .eq('id', osId);

            if (osObj?.cliente_id) {
                await db.from('clientes_os').update({
                    nome: nomeVal,
                    telefone: telVal,
                    cpf_cnpj: cpfVal
                }).eq('id', osObj.cliente_id);
            }
        }

        alert('Ordem de Serviço e dados atualizados com sucesso!');
        modalEditarOs.classList.add('hidden');
        renderOsList(_ordensCache);
    } catch (err) {
        console.error('Erro ao atualizar OS:', err);
        alert('Erro ao atualizar OS: ' + (err.message || err));
    } finally {
        hideLoading();
    }
});

// ── 🔔 LEADS WEB ─────────────────────────────────────────────
const leadsContainer  = document.getElementById('leadsContainer');
const btnRefreshLeads = document.getElementById('btnRefreshLeads');

// Conta leads não vistos (criados nas últimas 24h) para o badge
async function contarLeadsNovos() {
    try {
        const ontemISO = new Date(Date.now() - 86400000).toISOString();
        const { count, error } = await db
            .from('pre_chamados')
            .select('id', { count: 'exact', head: true })
            .gte('criado_em', ontemISO);

        if (!error && count > 0) {
            leadsBadge.textContent = count;
            leadsBadge.style.display = 'inline-flex';
        } else {
            leadsBadge.style.display = 'none';
        }
    } catch (_) { /* silencioso */ }
}

async function loadLeads() {
    showLoading('Carregando leads...');
    let leadsList = [];
    try {
        const { data: leads, error } = await db
            .from('pre_chamados')
            .select('*')
            .order('criado_em', { ascending: false })
            .limit(100);

        if (!error && leads) {
            leadsList = leads;
        }
    } catch (err) {
        console.warn('[WL TEC] Supabase pre_chamados select warn:', err);
    }

    // Mescla com backup do localStorage para garantir que nenhum lead se perca no navegador
    try {
        const localLeads = JSON.parse(localStorage.getItem('wltec_pre_chamados') || '[]');
        localLeads.forEach(loc => {
            if (!leadsList.some(s => (s.whatsapp && loc.whatsapp && s.whatsapp === loc.whatsapp) && s.nome_cliente === loc.nome_cliente)) {
                leadsList.unshift(loc);
            }
        });
    } catch (_) {}

    renderLeads(leadsList);
    leadsBadge.style.display = 'none'; // zera badge ao abrir
    hideLoading();
}

btnRefreshLeads.addEventListener('click', loadLeads);

let _hideConvertidos = true;
const btnToggleConvertidos = document.getElementById('btnToggleConvertidos');
btnToggleConvertidos?.addEventListener('click', () => {
    _hideConvertidos = !_hideConvertidos;
    btnToggleConvertidos.textContent = _hideConvertidos ? '👁️ Exibir Convertidos' : '🙈 Ocultar Convertidos';
    loadLeads();
});

window.deletarLead = function(leadId) {
    if (!confirm('Deseja excluir este lead web?')) return;
    
    // Remove do localStorage
    try {
        let localLeads = JSON.parse(localStorage.getItem('wltec_pre_chamados') || '[]');
        localLeads = localLeads.filter(l => l.id !== leadId);
        localStorage.setItem('wltec_pre_chamados', JSON.stringify(localLeads));
    } catch (_) {}

    // Remove do Supabase
    try {
        db.from('pre_chamados').delete().eq('id', leadId);
    } catch (_) {}

    loadLeads();
    alert('Lead removido com sucesso!');
};

function renderLeads(leads) {
    leadsContainer.innerHTML = '';

    if (!leads || leads.length === 0) {
        leadsContainer.innerHTML = '<p class="text-muted" style="grid-column:1/-1">Nenhuma solicitação web pendente no momento.</p>';
        return;
    }

    let displayLeads = leads;
    if (_hideConvertidos) {
        displayLeads = displayLeads.filter(l => l.status !== 'Convertido em OS');
    }

    if (displayLeads.length === 0) {
        leadsContainer.innerHTML = '<p class="text-muted" style="grid-column:1/-1">Nenhum lead pendente. (Clique em "Exibir Convertidos" para ver chamados já finalizados).</p>';
        return;
    }

    const ontem = Date.now() - 86400000;

    displayLeads.forEach(lead => {
        const isNovo   = new Date(lead.criado_em).getTime() > ontem;
        const levaTraz = lead.leva_e_traz;

        const nomeClean = escapeHTML(lead.nome_cliente || '—');
        const wppClean  = escapeHTML(lead.whatsapp || '—');
        const equipClean = escapeHTML(lead.equipamento || '—');
        const defClean  = escapeHTML(lead.defeito_relatado || '—');

        const endParts = [lead.logradouro, lead.numero, lead.complemento, lead.bairro_cidade, lead.cep ? `CEP: ${lead.cep}` : ''].filter(Boolean);
        const endStr   = escapeHTML(endParts.join(', '));

        const card = document.createElement('div');
        card.className = `lead-card${levaTraz ? ' lead-leva-traz' : ''}`;
        card.innerHTML = `
            ${isNovo ? '<div class="lead-new-dot" title="Novo nas últimas 24h"></div>' : ''}
            <div class="lead-header">
                <div>
                    <div class="lead-name">${nomeClean}</div>
                    <div class="lead-date">${formatDate(lead.criado_em)}</div>
                </div>
                <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
                    <span class="lead-pill">📱 ${wppClean}</span>
                    ${levaTraz ? '<span class="lead-pill leva">🚗 Leva &amp; Traz</span>' : ''}
                </div>
            </div>
            <div class="lead-body">
                <p><strong>Equipamento:</strong> ${equipClean}</p>
                <p><strong>Defeito:</strong> ${defClean}</p>
                ${endStr ? `<div class="lead-address">📍 ${endStr}</div>` : ''}
            </div>
            <div class="lead-actions" style="display:flex;gap:0.4rem;flex-wrap:wrap">
                <button class="btn-wpp"
                    onclick="contatarLead('${wppClean.replace(/\D/g,'')}','${nomeClean.replace(/'/g,"\\'")}','${equipClean.replace(/'/g,"\\'")}')">
                    💬 Chamar no WhatsApp
                </button>
                ${lead.foto_url ? `<button class="btn btn-outline text-sm" onclick="verFotos(['${escapeHTML(lead.foto_url)}'])">📷 Foto do Cliente</button>` : ''}
                ${lead.status === 'Convertido em OS'
                    ? `<span class="stock-ok" style="font-size:0.85rem;padding:0.4rem 0.75rem">✓ Convertido em OS</span>`
                    : `<button class="btn-converter" onclick="converterEmOS('${escapeHTML(lead.id)}','${nomeClean.replace(/'/g,"\\'")}','${wppClean.replace(/'/g,"\\'")}','${equipClean.replace(/'/g,"\\'")}','${defClean.replace(/'/g,"\\'")}')">➕ Converter em OS</button>`
                }
                <button class="btn btn-outline text-sm" onclick="deletarLead('${escapeHTML(lead.id)}')">🗑️ Excluir</button>
            </div>`;
        leadsContainer.appendChild(card);
    });
}

// ── Helper: Formatação e Validação de Telefone WhatsApp ────────
function formatWhatsAppNumber(raw) {
    let num = (raw || '').replace(/\D/g, '');
    if (!num) return '';

    if (num.startsWith('55')) {
        if (num.length >= 12) return num;
        return num;
    }

    if (num.length === 10 || num.length === 11) {
        return '55' + num;
    }

    return '55' + num;
}

// Ação: abrir WhatsApp com mensagem de follow-up
window.contatarLead = function(telLimpo, nome, equipamento) {
    let num = formatWhatsAppNumber(telLimpo);
    if (!num || num.length < 12) {
        const novoTel = prompt(`O número cadastrado "${telLimpo}" tem menos dígitos que o padrão do WhatsApp (DDD + Celular).\nDigite o número completo com DDD:`, telLimpo || '11914654157');
        if (!novoTel) return;
        num = formatWhatsAppNumber(novoTel);
    }
    const msg = `Olá ${nome}! Aqui é a WL TEC.\n\nRecebi sua solicitação sobre o ${equipamento} pelo site. Vamos agendar o atendimento?\n\nSó me confirmar o melhor horário 😊`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
};

// Ação: preenche formulário de Nova OS com os dados do lead e atualiza status no banco
window.converterEmOS = async function(leadId, nome, telefone, equipamento, defeito) {
    if (leadId) {
        try {
            await db.from('pre_chamados').update({ status: 'Convertido em OS' }).eq('id', leadId);
        } catch (e) {
            console.warn('Erro ao atualizar status do lead:', e);
        }
        // Atualiza no localStorage também
        try {
            let localLeads = JSON.parse(localStorage.getItem('wltec_pre_chamados') || '[]');
            const idx = localLeads.findIndex(l => l.id === leadId);
            if (idx !== -1) localLeads[idx].status = 'Convertido em OS';
            localStorage.setItem('wltec_pre_chamados', JSON.stringify(localLeads));
        } catch (_) {}
    }
    switchSection(secNovaOs, btnNovaOs);
    document.getElementById('clienteNome').value      = nome;
    document.getElementById('clienteTelefone').value  = telefone;
    document.getElementById('equipamento').value       = equipamento;
    document.getElementById('defeitoRelatado').value   = defeito;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    alert('Lead marcado como "Convertido em OS". Preencha os dados e clique em Gerar OS!');
};

// ── Fotos Modal ──────────────────────────────────────────────
const modalFotos      = document.getElementById('modalFotos');
const btnCloseModal   = document.getElementById('btnCloseModalFotos');
const modalFotosGrid  = document.getElementById('modalFotosGrid');

window.verFotos = function(urls) {
    modalFotosGrid.innerHTML = '';
    urls.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.className = 'foto-preview';
        img.style.cssText = 'height:auto;width:100%';
        modalFotosGrid.appendChild(img);
    });
    modalFotos.classList.remove('hidden');
};

btnCloseModal.addEventListener('click', () => modalFotos.classList.add('hidden'));

// ── WhatsApp + PIX ───────────────────────────────────────────
window.enviarWhatsApp = function(telefone, cliente, equip, valor, pix, status, diagnostico, servico) {
    let num = formatWhatsAppNumber(telefone);

    if (!num || num.length < 12) {
        const novoTel = prompt(
            `O número cadastrado "${telefone || 'incompleto'}" parece ter menos dígitos do que o padrão de WhatsApp (DDD + Celular).\n\nPor favor, confirme ou digite o número correto do WhatsApp com DDD:`,
            telefone || '11914654157'
        );
        if (!novoTel) return;
        num = formatWhatsAppNumber(novoTel);
    }

    let statusText = status || 'Aberto';
    let msg = `Olá *${cliente}*!\nSomos da WL TEC (Manutenção de TI).\n\n`;
    msg += `📌 *Ordem de Serviço - Status:* ${statusText}\n`;
    msg += `💻 *Equipamento:* ${equip}\n\n`;

    if (diagnostico) {
        msg += `🔍 *Diagnóstico / A Fazer:* ${diagnostico}\n\n`;
    }
    if (servico) {
        msg += `✅ *Serviço Realizado:* ${servico}\n\n`;
    }

    if (valor > 0) {
        msg += `💰 *Valor Total do Serviço:* R$ ${parseFloat(valor).toFixed(2)}\n\n`;
        if (pix) {
            msg += `📲 *Chave PIX Copia e Cola:*\n\`${pix}\`\n\n`;
        }
    } else {
        msg += `⏳ *Valor:* Em análise técnica sem custo.\n\n`;
    }

    msg += `Qualquer dúvida ou confirmação, basta responder aqui no WhatsApp! 😊`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
};

// ── Gerar PDF (Comprovante & Certificado de Garantia OS - 1 Página Única) ──
window.gerarPDF = async function(osId) {
    showLoading('Gerando PDF da OS & Termo de Garantia...');
    try {
        let os = _ordensCache.find(item => item.id === osId);
        if (!os) {
            const { data, error } = await db
                .from('ordens_servico')
                .select('*, clientes_os(*)')
                .eq('id', osId)
                .single();
            if (error) throw error;
            os = data;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const isConcluido = os.status === 'Concluído';
        const osNumDisplay = (os.numero_os || os.id.substring(0, 6)).toUpperCase();
        const tituloDoc = isConcluido 
            ? `WL TEC — LAUDO TÉCNICO & CERTIFICADO DE GARANTIA (OS #${osNumDisplay})` 
            : `WL TEC — COMPROVANTE DE ENTRADA DE OS (Nº #${osNumDisplay})`;

        // ── Cabeçalho Oficial Compacto ──────────────────────────────
        doc.setFillColor(10, 12, 16);
        doc.rect(0, 0, 210, 28, 'F');

        doc.setTextColor(0, 255, 255);
        doc.setFontSize(15); doc.setFont(undefined, 'bold');
        doc.text('WL TEC', 12, 13);
        
        doc.setTextColor(255, 179, 0);
        doc.setFontSize(9); doc.setFont(undefined, 'normal');
        doc.text('Manutenção de Notebooks, PCs & Consultoria em TI', 12, 21);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9.5); doc.setFont(undefined, 'bold');
        doc.text(`Nº OS: #${osNumDisplay}`, 155, 12);
        doc.setFontSize(8); doc.setFont(undefined, 'normal');
        doc.text(`Data: ${new Date(os.criado_em).toLocaleDateString('pt-BR')}`, 155, 18);
        doc.text(`Status: ${(os.status || 'Aberto').toUpperCase()}`, 155, 24);

        doc.setTextColor(30, 41, 59);
        let y = 35;
        doc.setFontSize(11); doc.setFont(undefined, 'bold');
        doc.text(tituloDoc, 12, y);
        y += 2;
        doc.setLineWidth(0.5); doc.setDrawColor(0, 255, 255);
        doc.line(12, y, 198, y);

        // 1. Dados do Cliente
        y += 7;
        doc.setFontSize(9.5); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
        doc.text('1. Dados do Cliente', 12, y);
        doc.setFontSize(8.5); doc.setFont(undefined, 'normal'); doc.setTextColor(51, 65, 85);
        y += 4.5; doc.text(`Nome: ${os.clientes_os?.nome || '—'}  |  Telefone / WhatsApp: ${os.clientes_os?.telefone || '—'}`, 12, y);
        y += 4; doc.text(`CPF/CNPJ: ${os.clientes_os?.cpf_cnpj || 'Não informado'} ${os.clientes_os?.email ? ` | E-mail: ${os.clientes_os.email}` : ''}`, 12, y);

        // 2. Dados do Equipamento & Defeito
        y += 7;
        doc.setFontSize(9.5); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
        doc.text('2. Dados do Equipamento', 12, y);
        doc.setFontSize(8.5); doc.setFont(undefined, 'normal'); doc.setTextColor(51, 65, 85);
        y += 4.5; doc.text(`Equipamento / Modelo: ${os.equipamento || '—'}  |  Nº Série: ${os.numero_serie || 'Não informado'}`, 12, y);
        y += 4;
        const defeitoLines = doc.splitTextToSize(`Defeito Relatado: ${os.defeito_relatado || '—'}`, 180);
        doc.text(defeitoLines, 12, y);
        y += (defeitoLines.length * 3.8);

        // 3. Diagnóstico Técnico & Laudo
        if (os.diagnostico || os.servico_realizado) {
            y += 4;
            doc.setFontSize(9.5); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
            doc.text('3. Diagnóstico Técnico & Serviço Realizado', 12, y);
            doc.setFontSize(8.5); doc.setFont(undefined, 'normal'); doc.setTextColor(51, 65, 85);
            if (os.diagnostico) {
                y += 4.5;
                const diagLines = doc.splitTextToSize(`Diagnóstico / Orçamento: ${os.diagnostico}`, 180);
                doc.text(diagLines, 12, y);
                y += (diagLines.length * 3.8);
            }
            if (os.servico_realizado) {
                y += 3.8;
                const feitoLines = doc.splitTextToSize(`Serviço Executado: ${os.servico_realizado}`, 180);
                doc.text(feitoLines, 12, y);
                y += (feitoLines.length * 3.8);
            }
        }

        // 4. TABELA DISCRIMINADA DE VALORES E PEÇAS
        y += 6;
        doc.setFontSize(9.5); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
        doc.text('4. Discriminação de Valores & Peças', 12, y);
        y += 3.5;

        // Cabeçalho da Tabela
        doc.setFillColor(241, 245, 249);
        doc.rect(12, y, 186, 6, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(12, y, 186, 6, 'S');

        doc.setFontSize(8); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 41, 59);
        doc.text('ITEM / DESCRIÇÃO DOS SERVIÇOS E INSUMOS', 15, y + 4.2);
        doc.text('QTD', 130, y + 4.2);
        doc.text('VALOR UNIT.', 146, y + 4.2);
        doc.text('SUBTOTAL', 174, y + 4.2);

        y += 6;

        // Separação de Mão de Obra, Insumos (Pasta Térmica) e Higienização (BRINDE)
        const desVal = parseFloat(os.custo_deslocamento || 0);
        const totVal = parseFloat(os.valor_total || 0);
        const moTotal = Math.max(0, totVal - desVal);

        const itens = [];
        const valorPasta = moTotal >= 30 ? 15.00 : 0.00;
        const valorMoPura = Math.max(0, moTotal - valorPasta);

        if (valorMoPura > 0) {
            itens.push({
                desc: 'Serviço Técnico / Mão de Obra Especializada (Diagnóstico, Montagem e Testes de Estresse)',
                qtd: 1,
                unit: valorMoPura,
                sub: valorMoPura
            });
        }

        if (valorPasta > 0) {
            itens.push({
                desc: 'Insumo de Bancada: Aplicação de Pasta Térmica de Prata (Alta Condutividade Térmica)',
                qtd: 1,
                unit: valorPasta,
                sub: valorPasta
            });
        }

        // BRINDE DE HIGIENIZAÇÃO
        itens.push({
            desc: 'Higienização Interna Completa & Limpeza de Bancada (BRINDE WL TEC)',
            qtd: 1,
            unit: 0.00,
            sub: 0.00
        });

        if (desVal > 0) {
            itens.push({
                desc: 'Serviço de Leva & Traz (Deslocamento Técnico Ida e Volta)',
                qtd: 1,
                unit: desVal,
                sub: desVal
            });
        }

        // Renderiza cada linha com bordas de tabela compactas
        doc.setFontSize(7.5); doc.setFont(undefined, 'normal'); doc.setTextColor(51, 65, 85);

        itens.forEach((it, idx) => {
            const lineH = 5.8;
            doc.rect(12, y, 186, lineH, 'S');

            const descLines = doc.splitTextToSize(`${idx + 1}. ${it.desc}`, 112);
            doc.text(descLines[0], 15, y + 4);

            doc.text(String(it.qtd), 132, y + 4);
            doc.text(it.unit > 0 ? `R$ ${it.unit.toFixed(2)}` : 'R$ 0,00', 146, y + 4);
            doc.text(it.sub > 0 ? `R$ ${it.sub.toFixed(2)}` : 'R$ 0,00 (BRINDE)', 174, y + 4);

            y += lineH;
        });

        // Linha do Total Geral Destacado
        doc.setFillColor(236, 253, 245);
        doc.rect(12, y, 186, 7, 'F');
        doc.setDrawColor(16, 185, 129);
        doc.rect(12, y, 186, 7, 'S');

        doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(6, 95, 70);
        doc.text('VALOR TOTAL DA ORDEM DE SERVIÇO:', 15, y + 4.8);
        doc.text(`R$ ${totVal > 0 ? totVal.toFixed(2) : '0.00'}`, 170, y + 4.8);

        y += 9;

        // 5. TERMO DE GARANTIA LEGAL (90 DIAS) - MANTÉM TUDO EM 1 PÁGINA
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.rect(12, y, 186, 24, 'FD');

        doc.setFontSize(8.5); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
        doc.text('CERTIFICADO DE GARANTIA LEGAL (90 DIAS - ART. 26 DO CDC)', 16, y + 5);
        
        doc.setFontSize(7.2); doc.setFont(undefined, 'normal'); doc.setTextColor(71, 85, 105);
        const termoTxt = "Conforme o Artigo 26, II da Lei 8.078/90 (Código de Defesa do Consumidor), o serviço executado e as peças substituídas constantes neste laudo possuem garantia legal de 90 (noventa) dias a partir da data de entrega. A garantia cobre defeitos de fabricação em peças e falhas no serviço. Não cobre vícios decorrentes de quedas, derramamento de líquidos, picos de tensão elétrica ou remoção do lacre de segurança.";
        const termoLines = doc.splitTextToSize(termoTxt, 178);
        doc.text(termoLines, 16, y + 10);

        // ── Assinaturas Sem Sobreposição (Espaçamento de 38mm abaixo do topo da caixa) ──
        y += 38;

        // Assinatura & Carimbo Digital - Técnico Responsável Wiliam Longo
        doc.setFontSize(10); doc.setFont('helvetica', 'bolditalic'); doc.setTextColor(0, 150, 200);
        doc.text('Wiliam Longo', 16, y + 3);
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139);
        doc.text('WL TEC — TÉCNICO RESPONSÁVEL', 16, y + 7);

        doc.setLineWidth(0.5); doc.setDrawColor(203, 213, 225);
        doc.line(16, y + 9, 90, y + 9);
        
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
        doc.text('Wiliam Longo — Responsável Técnico', 16, y + 13);
        doc.text('WL TEC | Santo André - SP', 16, y + 17);

        // Assinatura Cliente
        if (os.assinatura_cliente_base64) {
            try {
                doc.addImage(os.assinatura_cliente_base64, 'PNG', 116, y - 6, 45, 13);
            } catch (_) {}
        }
        doc.line(116, y + 9, 190, y + 9);
        doc.text('Assinatura do Cliente', 116, y + 13);
        doc.text(os.clientes_os?.nome || 'Cliente', 116, y + 17);

        // Rodapé Fixo na Margem Inferior (286mm)
        doc.setFontSize(7); doc.setTextColor(148, 163, 184);
        doc.text('WL TEC — Manutenção de Notebooks & Consultoria em TI | WhatsApp: (11) 91465-4157 | Santo André/SP | www.wl.tec.br', 12, 286);

        // Nomenclatura Distinta de PDF por Status da OS
        const osStatus = os.status || 'Aberto';
        let prefijoName = 'COMPROVANTE_ENTRADA';
        if (osStatus === 'Concluído') {
            prefijoName = 'LAUDO_CONCLUIDO_E_GARANTIA';
        } else if (osStatus === 'Aguardando Aprovação' || osStatus === 'Orçamento') {
            prefijoName = 'ORCAMENTO_PROPOSTA';
        } else if (osStatus === 'Em Reparo') {
            prefijoName = 'EM_REPARO_ANDAMENTO';
        }

        const nomeClienteClean = (os.clientes_os?.nome || 'cliente')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_');

        doc.save(`WLTEC_${prefijoName}_OS_${osNumDisplay}_${nomeClienteClean}.pdf`);

    } catch (err) {
        console.error('Erro PDF:', err);
        alert('Erro ao gerar PDF: ' + (err.message || err));
    } finally {
        hideLoading();
    }
};

// ── 📦 ESTOQUE & INSUMOS ──────────────────────────────────────
const tabelaEstoque          = document.getElementById('tabelaEstoque');
const btnAbrirModalEstoque   = document.getElementById('btnAbrirModalEstoque');
const modalNovoItemEstoque   = document.getElementById('modalNovoItemEstoque');
const btnCloseModalEstoque   = document.getElementById('btnCloseModalEstoque');
const formNovoItemEstoque    = document.getElementById('formNovoItemEstoque');

let _estoqueCache = [
    { id: '1', nome: 'SSD NVMe 512GB (Kingston/Adata)', categoria: 'SSD', quantidade: 2, quantidade_minima: 2, custo_unitario: 180.00, preco_venda_sugerido: 320.00, fornecedor: 'Kabum / Mercado Livre' },
    { id: '2', nome: 'SSD SATA 480GB (Crucial/Kingston)', categoria: 'SSD', quantidade: 2, quantidade_minima: 2, custo_unitario: 150.00, preco_venda_sugerido: 260.00, fornecedor: 'Mercado Livre' },
    { id: '3', nome: 'Memória RAM 8GB DDR4 Notebook 3200MHz', categoria: 'RAM', quantidade: 2, quantidade_minima: 2, custo_unitario: 110.00, preco_venda_sugerido: 210.00, fornecedor: 'Mercado Livre' },
    { id: '4', nome: 'Memória RAM 16GB DDR4 Notebook 3200MHz', categoria: 'RAM', quantidade: 1, quantidade_minima: 1, custo_unitario: 210.00, preco_venda_sugerido: 380.00, fornecedor: 'Kabum' },
    { id: '5', nome: 'Pasta Térmica Prata High Performance (10g)', categoria: 'Insumo', quantidade: 3, quantidade_minima: 1, custo_unitario: 45.00, preco_venda_sugerido: 90.00, fornecedor: 'Mercado Livre' },
    { id: '6', nome: 'Tela 15.6" LED Slim 30 Pinos Full HD', categoria: 'Tela', quantidade: 1, quantidade_minima: 1, custo_unitario: 280.00, preco_venda_sugerido: 480.00, fornecedor: 'BringIT / M.Livre' },
    { id: '7', nome: 'Bateria Universal Notebook Dell Inspiron', categoria: 'Bateria', quantidade: 1, quantidade_minima: 1, custo_unitario: 160.00, preco_venda_sugerido: 310.00, fornecedor: 'Mercado Livre' },
    { id: '8', nome: 'Álcool Isopropílico + Limpa Contatos 300ml', categoria: 'Insumo', quantidade: 0, quantidade_minima: 1, custo_unitario: 35.00, preco_venda_sugerido: 70.00, fornecedor: 'Distribuidor Local' }
];

async function loadEstoque() {
    try {
        const { data, error } = await db.from('estoque').select('*').order('nome');
        if (!error && data && data.length > 0) {
            _estoqueCache = data;
        }
    } catch (_) { /* utiliza cache pré-populado como fallback */ }
    renderEstoque();
    atualizarDropdownEstoque();
}

function renderEstoque() {
    tabelaEstoque.innerHTML = '';
    if (_estoqueCache.length === 0) {
        tabelaEstoque.innerHTML = '<tr><td colspan="8" class="text-muted text-center">Nenhum item no estoque.</td></tr>';
        return;
    }

    _estoqueCache.forEach(item => {
        const isAlerta = item.quantidade <= item.quantidade_minima;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHTML(item.nome)}</strong></td>
            <td><span class="lead-pill">${escapeHTML(item.categoria)}</span></td>
            <td><strong>${item.quantidade}</strong></td>
            <td>${item.quantidade_minima} ${isAlerta ? '<span class="stock-alert">⚠️ Reestocar</span>' : '<span class="stock-ok">✓ OK</span>'}</td>
            <td>R$ ${parseFloat(item.custo_unitario).toFixed(2)}</td>
            <td>R$ ${parseFloat(item.preco_venda_sugerido || 0).toFixed(2)}</td>
            <td>${escapeHTML(item.fornecedor || '—')}</td>
            <td style="display:flex;gap:0.3rem">
                <button class="btn btn-secondary text-sm" onclick="editarItemEstoque('${item.id}')">✏️ Editar</button>
                <button class="btn btn-outline text-sm" onclick="deletarItemEstoque('${item.id}')">🗑️</button>
            </td>`;
        tabelaEstoque.appendChild(tr);
    });
}

btnAbrirModalEstoque?.addEventListener('click', () => {
    document.getElementById('editStockId').value = '';
    document.getElementById('lblModalEstoqueTitulo').textContent = '📦 Cadastrar Peça / Insumo no Estoque';
    formNovoItemEstoque.reset();
    modalNovoItemEstoque.classList.remove('hidden');
});

btnCloseModalEstoque?.addEventListener('click', () => modalNovoItemEstoque.classList.add('hidden'));

window.editarItemEstoque = function(id) {
    const item = _estoqueCache.find(i => i.id === id);
    if (!item) return;

    document.getElementById('editStockId').value      = item.id;
    document.getElementById('stockNome').value        = item.nome;
    document.getElementById('stockCategoria').value   = item.categoria;
    document.getElementById('stockQtd').value         = item.quantidade;
    document.getElementById('stockQtdMin').value      = item.quantidade_minima;
    document.getElementById('stockCusto').value       = item.custo_unitario;
    document.getElementById('stockVenda').value       = item.preco_venda_sugerido || '';
    document.getElementById('stockFornecedor').value  = item.fornecedor || '';

    document.getElementById('lblModalEstoqueTitulo').textContent = '✏️ Editar / Ajustar Item do Estoque';
    modalNovoItemEstoque.classList.remove('hidden');
};

formNovoItemEstoque?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const stockId = document.getElementById('editStockId').value;
    showLoading('Salvando item de estoque...');
    try {
        const itemObj = {
            nome: document.getElementById('stockNome').value.trim(),
            categoria: document.getElementById('stockCategoria').value,
            quantidade: parseInt(document.getElementById('stockQtd').value),
            quantidade_minima: parseInt(document.getElementById('stockQtdMin').value),
            custo_unitario: parseFloat(document.getElementById('stockCusto').value),
            preco_venda_sugerido: parseFloat(document.getElementById('stockVenda').value || 0),
            fornecedor: document.getElementById('stockFornecedor').value.trim()
        };

        if (stockId) {
            // Edição de item existente
            const idx = _estoqueCache.findIndex(i => i.id === stockId);
            if (idx !== -1) {
                _estoqueCache[idx] = { ..._estoqueCache[idx], ...itemObj };
            }
            await db.from('estoque').update(itemObj).eq('id', stockId);
        } else {
            // Novo cadastro
            const { data, error } = await db.from('estoque').insert([itemObj]).select();
            if (!error && data) {
                _estoqueCache.push(data[0]);
            } else {
                itemObj.id = 'temp_' + Date.now();
                _estoqueCache.push(itemObj);
            }
        }

        modalNovoItemEstoque.classList.add('hidden');
        formNovoItemEstoque.reset();
        renderEstoque();
        atualizarDropdownEstoque();
        alert('Estoque atualizado com sucesso!');
    } catch (err) {
        alert('Erro ao salvar estoque: ' + err.message);
    } finally {
        hideLoading();
    }
});

window.deletarItemEstoque = function(id) {
    const item = _estoqueCache.find(i => i.id === id);
    if (!item) return;

    if (item.quantidade > 0) {
        alert(`⚠️ Não é possível excluir o item "${item.nome}" enquanto houver unidades no estoque (Qtd atual: ${item.quantidade}).\n\nEdite a quantidade para 0 primeiro para autorizar a exclusão.`);
        return;
    }

    if (!confirm(`Confirma a exclusão definitiva do item "${item.nome}" do estoque?`)) return;
    _estoqueCache = _estoqueCache.filter(i => i.id !== id);
    db.from('estoque').delete().eq('id', id);
    renderEstoque();
    atualizarDropdownEstoque();
};

function atualizarDropdownEstoque() {
    const select = document.getElementById('editPecaEstoque');
    if (!select) return;
    select.innerHTML = '<option value="">Nenhuma peça de estoque utilizada</option>';
    _estoqueCache.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `${item.nome} (Qtd: ${item.quantidade} | Custo: R$ ${parseFloat(item.custo_unitario).toFixed(2)})`;
        select.appendChild(opt);
    });
}

// ── 🤝 TERCEIROS & FORNECEDORES ────────────────────────────────
const gridTerceiros          = document.getElementById('gridTerceiros');
const btnAbrirModalTerceiro  = document.getElementById('btnAbrirModalTerceiro');
const modalNovoTerceiro      = document.getElementById('modalNovoTerceiro');
const btnCloseModalTerceiro  = document.getElementById('btnCloseModalTerceiro');
const formNovoTerceiro       = document.getElementById('formNovoTerceiro');

let _terceirosCache = [
    { id: 't1', nome_parceiro: 'Laboratório BGA ABC (Reballing)', especialidade: 'Reparo BGA / Placa Mãe', telefone: '(11) 98888-7777', observacoes: 'Especialista em regravação de BIOS e reballing BGA. Custo médio: R$ 300-350' },
    { id: 't2', nome_parceiro: 'BringIT / Distribuidora de Telas', especialidade: 'Telas & Baterias Especiais', telefone: '(11) 97777-6666', observacoes: 'Entrega rápida no ABC para teclados e telas raras' }
];

async function loadTerceiros() {
    try {
        const { data, error } = await db.from('terceiros_fornecedores').select('*');
        if (!error && data && data.length > 0) {
            _terceirosCache = data;
        }
    } catch (_) { /* fallback cache */ }
    renderTerceiros();
    atualizarDropdownTerceiros();
}

function renderTerceiros() {
    gridTerceiros.innerHTML = '';
    if (_terceirosCache.length === 0) {
        gridTerceiros.innerHTML = '<p class="text-muted" style="grid-column:1/-1">Nenhum terceiro ou fornecedor cadastrado.</p>';
        return;
    }
    _terceirosCache.forEach(t => {
        const card = document.createElement('div');
        card.className = 'os-card';
        card.innerHTML = `
            <div class="os-header">
                <h3>${escapeHTML(t.nome_parceiro)}</h3>
                <span class="lead-pill">${escapeHTML(t.especialidade)}</span>
            </div>
            <div class="os-body">
                <p><strong>Telefone:</strong> ${escapeHTML(t.telefone || '—')}</p>
                <p class="text-muted text-sm">${escapeHTML(t.observacoes || '')}</p>
            </div>
            <div class="os-actions" style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border-color);display:flex;gap:0.4rem">
                <button class="btn btn-secondary text-sm" onclick="editarTerceiro('${t.id}')">✏️ Editar</button>
                <button class="btn btn-outline text-sm" onclick="deletarTerceiro('${t.id}')">🗑️ Excluir</button>
            </div>`;
        gridTerceiros.appendChild(card);
    });
}

btnAbrirModalTerceiro?.addEventListener('click', () => {
    document.getElementById('editTerceiroId').value = '';
    document.getElementById('lblModalTerceiroTitulo').textContent = '🤝 Cadastrar Terceiro / Parceiro';
    formNovoTerceiro.reset();
    modalNovoTerceiro.classList.remove('hidden');
});

btnCloseModalTerceiro?.addEventListener('click', () => modalNovoTerceiro.classList.add('hidden'));

window.editarTerceiro = function(id) {
    const t = _terceirosCache.find(item => item.id === id);
    if (!t) return;

    document.getElementById('editTerceiroId').value   = t.id;
    document.getElementById('tercNome').value          = t.nome_parceiro;
    document.getElementById('tercEspecialidade').value = t.especialidade;
    document.getElementById('tercTelefone').value      = t.telefone || '';
    document.getElementById('tercObs').value           = t.observacoes || '';

    document.getElementById('lblModalTerceiroTitulo').textContent = '✏️ Editar Terceiro / Parceiro';
    modalNovoTerceiro.classList.remove('hidden');
};

window.deletarTerceiro = function(id) {
    if (!confirm('Deseja excluir este terceiro/fornecedor?')) return;
    _terceirosCache = _terceirosCache.filter(t => t.id !== id);
    db.from('terceiros_fornecedores').delete().eq('id', id);
    renderTerceiros();
    atualizarDropdownTerceiros();
};

formNovoTerceiro?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tercId = document.getElementById('editTerceiroId').value;
    showLoading('Salvando terceiro...');
    try {
        const obj = {
            nome_parceiro: document.getElementById('tercNome').value.trim(),
            especialidade: document.getElementById('tercEspecialidade').value.trim(),
            telefone: document.getElementById('tercTelefone').value.trim(),
            observacoes: document.getElementById('tercObs').value.trim()
        };

        if (tercId) {
            const idx = _terceirosCache.findIndex(t => t.id === tercId);
            if (idx !== -1) {
                _terceirosCache[idx] = { ..._terceirosCache[idx], ...obj };
            }
            await db.from('terceiros_fornecedores').update(obj).eq('id', tercId);
        } else {
            const { data, error } = await db.from('terceiros_fornecedores').insert([obj]).select();
            if (!error && data) {
                _terceirosCache.push(data[0]);
            } else {
                obj.id = 'temp_' + Date.now();
                _terceirosCache.push(obj);
            }
        }

        modalNovoTerceiro.classList.add('hidden');
        formNovoTerceiro.reset();
        renderTerceiros();
        atualizarDropdownTerceiros();
        alert('Parceiro salvo com sucesso!');
    } catch (err) {
        alert('Erro ao salvar parceiro: ' + err.message);
    } finally {
        hideLoading();
    }
});

function atualizarDropdownTerceiros() {
    const select = document.getElementById('editParceiroTerceiro');
    if (!select) return;
    select.innerHTML = '<option value="">Nenhum serviço terceirizado</option>';
    _terceirosCache.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.nome_parceiro} (${t.especialidade})`;
        select.appendChild(opt);
    });
}

// ── 📊 DRE FINANCEIRO MENSAL ──────────────────────────────────
const btnAbrirModalCusto  = document.getElementById('btnAbrirModalCusto');
const modalNovoCustoFixo  = document.getElementById('modalNovoCustoFixo');
const btnCloseModalCusto  = document.getElementById('btnCloseModalCusto');
const formNovoCustoFixo   = document.getElementById('formNovoCustoFixo');
const tabelaCustosFixos   = document.getElementById('tabelaCustosFixos');

let _custosFixosCache = [
    { id: 'c1', descricao: 'Insumos de Bancada (Pasta Prata, Fita Kapton, Limpa Contato)', categoria: 'Insumos', valor: 350.00, data_custo: '2026-07-31' },
    { id: 'c2', descricao: 'Panfletos Impressos (Portarias de Condomínios do ABC)', categoria: 'Marketing', valor: 150.00, data_custo: '2026-07-31' },
    { id: 'c3', descricao: 'Orçamento Inicial Google Ads (Pesquisas Locais Santo André/SBC)', categoria: 'Marketing', valor: 300.00, data_custo: '2026-07-31' }
];

async function loadDreFinanceiro() {
    try {
        const { data, error } = await db.from('custos_fixos').select('*');
        if (!error && data && data.length > 0) {
            _custosFixosCache = data;
        }
    } catch (_) { /* fallback */ }

    // Calcula DRE baseado no faturamento das OS Concluídas + Deslocamento + Custos de Estoque + Fixos
    let faturamentoTotal = 0;
    let custoDeslocamentoTotal = 0;
    let custoPecasTotal = 0;

    _ordensCache.forEach(os => {
        if (os.status === 'Concluído' && os.valor_total) {
            faturamentoTotal += parseFloat(os.valor_total || 0);
        }
        custoDeslocamentoTotal += parseFloat(os.custo_deslocamento || 0);
    });

    let custoFixosTotal = 0;
    _custosFixosCache.forEach(c => {
        custoFixosTotal += parseFloat(c.valor || 0);
    });

    // Atualiza DOM DRE
    document.getElementById('dreFaturamento').textContent = `R$ ${faturamentoTotal.toFixed(2)}`;
    document.getElementById('dreCustosPecas').textContent = `R$ ${custoPecasTotal.toFixed(2)}`;
    document.getElementById('dreDeslocamento').textContent = `R$ ${custoDeslocamentoTotal.toFixed(2)}`;
    document.getElementById('dreCustosFixos').textContent = `R$ ${custoFixosTotal.toFixed(2)}`;

    const lucroLiquido = faturamentoTotal - (custoPecasTotal + custoDeslocamentoTotal + custoFixosTotal);
    const elemLucro = document.getElementById('dreLucroLiquido');
    elemLucro.textContent = `R$ ${lucroLiquido.toFixed(2)}`;
    elemLucro.style.color = lucroLiquido >= 0 ? '#22c55e' : '#ef4444';

    const margem = faturamentoTotal > 0 ? ((lucroLiquido / faturamentoTotal) * 100).toFixed(1) : '0';
    document.getElementById('dreMargem').textContent = `Margem de Lucro: ${margem}%`;

    renderCustosFixos();
    renderOsConcluidas();
}

function renderOsConcluidas() {
    const tabela = document.getElementById('tabelaOsConcluidas');
    if (!tabela) return;
    tabela.innerHTML = '';

    const concluidas = _ordensCache.filter(os => os.status === 'Concluído');
    if (concluidas.length === 0) {
        tabela.innerHTML = '<tr><td colspan="5" class="text-muted text-center">Nenhuma OS concluída no período ainda.</td></tr>';
        return;
    }

    concluidas.forEach(os => {
        const nome  = escapeHTML(os.clientes_os?.nome || 'Cliente');
        const equip = escapeHTML(os.equipamento || '—');
        const fat   = parseFloat(os.valor_total || 0);
        const des   = parseFloat(os.custo_deslocamento || 0);
        const lucroBruto = fat - des;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(os.criado_em).toLocaleDateString('pt-BR')}</td>
            <td><strong>${nome}</strong> <br><span class="text-muted text-sm">${equip}</span></td>
            <td>R$ ${des.toFixed(2)}</td>
            <td style="color:var(--color-cyan);font-weight:700">R$ ${fat.toFixed(2)}</td>
            <td style="color:#22c55e;font-weight:700">R$ ${lucroBruto.toFixed(2)}</td>`;
        tabela.appendChild(tr);
    });
}

function renderCustosFixos() {
    tabelaCustosFixos.innerHTML = '';
    _custosFixosCache.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHTML(c.descricao)}</strong></td>
            <td><span class="lead-pill">${escapeHTML(c.categoria)}</span></td>
            <td style="color:#ef4444;font-weight:700">R$ ${parseFloat(c.valor).toFixed(2)}</td>
            <td>${new Date(c.data_custo || Date.now()).toLocaleDateString('pt-BR')}</td>`;
        tabelaCustosFixos.appendChild(tr);
    });
}

btnAbrirModalCusto?.addEventListener('click', () => modalNovoCustoFixo.classList.remove('hidden'));
btnCloseModalCusto?.addEventListener('click', () => modalNovoCustoFixo.classList.add('hidden'));

formNovoCustoFixo?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading('Cadastrando custo...');
    try {
        const novo = {
            descricao: document.getElementById('custoDescricao').value.trim(),
            categoria: document.getElementById('custoCategoria').value,
            valor: parseFloat(document.getElementById('custoValor').value),
            data_custo: new Date().toISOString().split('T')[0]
        };

        const { data, error } = await db.from('custos_fixos').insert([novo]).select();
        if (!error && data) {
            _custosFixosCache.push(data[0]);
        } else {
            novo.id = 'temp_' + Date.now();
            _custosFixosCache.push(novo);
        }

        modalNovoCustoFixo.classList.add('hidden');
        formNovoCustoFixo.reset();
        await loadDreFinanceiro();
        alert('Custo/Investimento cadastrado!');
    } catch (err) {
        alert('Erro ao cadastrar: ' + err.message);
    } finally {
        hideLoading();
    }
});

// ── 📅 CRM & MANUTENÇÃO PREVENTIVA (6 MESES) ──────────────────
function renderCrmPreventiva() {
    const tabela = document.getElementById('tabelaCrmPreventiva');
    if (!tabela) return;
    tabela.innerHTML = '';

    if (!_ordensCache || _ordensCache.length === 0) {
        tabela.innerHTML = '<tr><td colspan="6" class="text-muted text-center">Nenhum cliente cadastrado no CRM ainda.</td></tr>';
        return;
    }

    _ordensCache.forEach(os => {
        const dtEntrada = new Date(os.criado_em || Date.now());
        const dtVenc = new Date(dtEntrada.getTime() + (180 * 86400000));
        const nome = escapeHTML(os.clientes_os?.nome || 'Cliente');
        const tel = escapeHTML(os.clientes_os?.telefone || '');
        const equip = escapeHTML(os.equipamento || '—');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${nome}</strong></td>
            <td>${tel}</td>
            <td>${equip}</td>
            <td>${dtEntrada.toLocaleDateString('pt-BR')}</td>
            <td style="color:var(--color-amber);font-weight:700">${dtVenc.toLocaleDateString('pt-BR')}</td>
            <td>
                <button class="btn btn-secondary text-sm" onclick="enviarLembretePreventiva('${tel.replace(/\D/g,'')}','${nome.replace(/'/g,"\\'")}','${equip.replace(/'/g,"\\'")}')">
                    💬 Lembrete WhatsApp
                </button>
            </td>`;
        tabela.appendChild(tr);
    });
}

window.enviarLembretePreventiva = function(tel, nome, equip) {
    const num = formatWhatsAppNumber(tel);
    if (!num) return alert('Telefone do cliente não encontrado.');
    const msg = `Olá ${nome}! Tudo bem?\nAqui é o Wiliam da WL TEC (Assistência Técnica).\n\nFaz cerca de 6 meses que realizamos a manutenção do seu ${equip}. Para manter seu equipamento rápido, frio e evitar falhas sérias de superaquecimento ou perda de dados, recomendamos uma limpeza preventiva de bancada e troca da pasta térmica.\n\nPodemos agendar a revisão preventiva para esta semana com o nosso serviço de Leva & Traz? 😊`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
};

// ── 👥 BASE DE CLIENTES CADASTRADOS ─────────────────────────
function renderClientes(filterTerm = '') {
    const tabela = document.getElementById('tabelaClientes');
    if (!tabela) return;
    tabela.innerHTML = '';

    const clientesMap = new Map();
    (_ordensCache || []).forEach(os => {
        const c = os.clientes_os;
        if (c && c.nome && !clientesMap.has(c.nome)) {
            clientesMap.set(c.nome, {
                id: c.id || os.cliente_id,
                nome: c.nome,
                telefone: c.telefone || '—',
                cpf_cnpj: c.cpf_cnpj || '—',
                email: c.email || '—',
                osId: os.id
            });
        }
    });

    let lista = Array.from(clientesMap.values());
    if (filterTerm) {
        const term = filterTerm.toLowerCase();
        lista = lista.filter(c => c.nome.toLowerCase().includes(term) || c.telefone.toLowerCase().includes(term) || c.cpf_cnpj.toLowerCase().includes(term));
    }

    if (lista.length === 0) {
        tabela.innerHTML = '<tr><td colspan="5" class="text-muted text-center">Nenhum cliente encontrado.</td></tr>';
        return;
    }

    lista.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHTML(c.nome)}</strong></td>
            <td><span class="lead-pill">📱 ${escapeHTML(c.telefone)}</span></td>
            <td>${escapeHTML(c.cpf_cnpj)}</td>
            <td>${escapeHTML(c.email)}</td>
            <td>
                <button class="btn btn-secondary text-sm" onclick="abrirModalEditar('${escapeHTML(c.osId)}')">✏️ Editar Dados / OS</button>
                <button class="btn btn-primary text-sm" onclick="enviarWhatsApp('${c.telefone}','${c.nome.replace(/'/g,"\\'")}','equipamento',0,'','Aberto','','')">💬 WhatsApp</button>
            </td>`;
        tabela.appendChild(tr);
    });
}

const txtBuscaClientes = document.getElementById('txtBuscaClientes');
txtBuscaClientes?.addEventListener('input', () => {
    renderClientes(txtBuscaClientes.value.trim());
});

// Inicialização de dropdowns de estoque e terceiros ao carregar
loadEstoque();
loadTerceiros();

// ── Inicialização: Verifica a sessão do usuário ao carregar ──
checkAuthSession();
