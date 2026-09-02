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
const btnRelatorios     = document.getElementById('btnRelatorios');

const secNovaOs         = document.getElementById('secNovaOs');
const secListaOs        = document.getElementById('secListaOs');
const secLeadsOs        = document.getElementById('secLeadsOs');
const secClientes       = document.getElementById('secClientes');
const secEstoque        = document.getElementById('secEstoque');
const secTerceiros      = document.getElementById('secTerceiros');
const secCrmPreventiva  = document.getElementById('secCrmPreventiva');
const secDre            = document.getElementById('secDre');
const secRelatorios     = document.getElementById('secRelatorios');

const leadsBadge        = document.getElementById('leadsBadge');

const allSections = [secNovaOs, secListaOs, secLeadsOs, secClientes, secEstoque, secTerceiros, secCrmPreventiva, secDre, secRelatorios];
const allNavBtns  = [btnNovaOs, btnListaOs, btnLeadsOs, btnClientes, btnEstoque, btnTerceiros, btnCrmPreventiva, btnDre, btnRelatorios];

function switchSection(showSec, activeBtn) {
    allSections.forEach(s => s?.classList.add('hidden'));
    allNavBtns.forEach(b => b?.classList.remove('active'));
    showSec?.classList.remove('hidden');
    activeBtn?.classList.add('active');
}

// ── Autenticação de Sessão (Supabase Auth) ───────────────────
async function checkAuthSession() {
    try {
        const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.protocol === 'file:';
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
        const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.protocol === 'file:';
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

btnRelatorios?.addEventListener('click', () => {
    switchSection(secRelatorios, btnRelatorios);
    inicializarModuloRelatorios();
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

// ── Upload de Fotos & Câmera Direta (Validação de Tipos) ──────
const fotosUpload  = document.getElementById('fotosUpload');
const fotosCamera  = document.getElementById('fotosCamera');
const fotosPreview = document.getElementById('fotosPreview');
let selectedFiles  = [];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function handleNewPhotoFiles(filesList) {
    const files = Array.from(filesList);
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
}

fotosUpload?.addEventListener('change', (e) => handleNewPhotoFiles(e.target.files));
fotosCamera?.addEventListener('change', (e) => handleNewPhotoFiles(e.target.files));

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
                <button class="btn btn-primary btn-action" onclick="enviarWhatsApp('${tel}','${nome}','${equip}',${os.valor_total||0},'${pixCode}','${statusClean}','${diag}','${feito}','${escapeHTML(os.id)}')">💬 WhatsApp + PIX</button>
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
        const data = editSignaturePad.toData();
        editCanvas.width = parentW * ratio;
        editCanvas.height = 180 * ratio;
        editCanvas.getContext('2d').scale(ratio, ratio);
        if (data && data.length > 0) {
            editSignaturePad.fromData(data);
        } else {
            editSignaturePad.clear();
        }
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

// Upload de Fotos Adicionais na Visita Presencial (Câmera Direta + Galeria)
const editFotosUpload  = document.getElementById('editFotosUpload');
const editFotosCamera  = document.getElementById('editFotosCamera');
const editFotosPreview = document.getElementById('editFotosPreview');
let editSelectedFiles  = [];

function handleEditPhotoFiles(filesList) {
    const files = Array.from(filesList);
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
}

editFotosUpload?.addEventListener('change', (e) => handleEditPhotoFiles(e.target.files));
editFotosCamera?.addEventListener('change', (e) => handleEditPhotoFiles(e.target.files));

// ── 🛠️ GERENCIADOR DE ITENS, PEÇAS & ORÇAMENTO DA OS ─────────
const tabelaItensModal        = document.getElementById('tabelaItensModal');
const corpoTabelaItensModal   = document.getElementById('corpoTabelaItensModal');
const lblMoTotal              = document.getElementById('lblMoTotal');
const lblPecasTotal           = document.getElementById('lblPecasTotal');
const lblCustoPecasTotal      = document.getElementById('lblCustoPecasTotal');
const lblDeslocamentoTotal    = document.getElementById('lblDeslocamentoTotal');
const lblValorTotal           = document.getElementById('lblValorTotal');
const lblLucroRealOs          = document.getElementById('lblLucroRealOs');

const editValor               = document.getElementById('editValor');
const editMaoDeObra           = document.getElementById('editMaoDeObra');
const editValorPecas          = document.getElementById('editValorPecas');
const editCustoPecas          = document.getElementById('editCustoPecas');
const editDeslocamento        = document.getElementById('editDeslocamento');

const novoItemTipo            = document.getElementById('novoItemTipo');
const novoItemDesc            = document.getElementById('novoItemDesc');
const novoItemQtd             = document.getElementById('novoItemQtd');
const novoItemCusto           = document.getElementById('novoItemCusto');
const novoItemParcelas        = document.getElementById('novoItemParcelas');
const novoItemValor           = document.getElementById('novoItemValor');
const btnAdicionarItemManual  = document.getElementById('btnAdicionarItemManual');

const editPecaEstoque         = document.getElementById('editPecaEstoque');
const novoEstoqueQtd          = document.getElementById('novoEstoqueQtd');
const novoEstoqueValor        = document.getElementById('novoEstoqueValor');
const btnAdicionarPecaEstoque = document.getElementById('btnAdicionarPecaEstoque');

const calcVeiculo             = document.getElementById('calcVeiculo');
const calcRegiao              = document.getElementById('calcRegiao');
const calcKmTotal             = document.getElementById('calcKmTotal');
const calcCustoPrev           = document.getElementById('calcCustoPrev');
const btnAplicarDeslocamento  = document.getElementById('btnAplicarDeslocamento');
const btnGerarPdfModal        = document.getElementById('btnGerarPdfModal');

let _itensOsEditando = [];

function formatMoeda(val) {
    return 'R$ ' + (parseFloat(val) || 0).toFixed(2);
}

function getTipoBadgeHtml(tipo) {
    switch (tipo) {
        case 'servico':
            return '<span class="item-badge badge-servico">🔧 Serviço</span>';
        case 'peca_estoque':
            return '<span class="item-badge badge-estoque">📦 Estoque</span>';
        case 'peca_terceiro':
            return '<span class="item-badge badge-terceiro">🤝 Peça</span>';
        case 'insumo':
            return '<span class="item-badge badge-insumo">🧪 Insumo</span>';
        case 'deslocamento':
            return '<span class="item-badge badge-deslocamento">🚗 Deslocamento</span><span class="item-badge badge-privado" title="Controle Interno: Oculto do cliente no PDF e WhatsApp">🔒 Privado</span>';
        case 'brinde':
            return '<span class="item-badge badge-brinde">🎁 Brinde</span>';
        default:
            return '<span class="item-badge badge-servico">Item</span>';
    }
}

function renderTabelaItensModal() {
    if (!corpoTabelaItensModal) return;
    corpoTabelaItensModal.innerHTML = '';

    if (!_itensOsEditando || _itensOsEditando.length === 0) {
        corpoTabelaItensModal.innerHTML = `
            <tr>
                <td colspan="7" class="text-muted text-center" style="padding:1rem;">
                    Nenhum item ou serviço discriminado ainda. Adicione itens abaixo!
                </td>
            </tr>`;
        recalcularTotaisItens();
        return;
    }

    _itensOsEditando.forEach((it, idx) => {
        const tr = document.createElement('tr');
        const qtd = parseInt(it.qtd) || 1;
        const unitVenda = parseFloat(it.valor_unitario) || 0;
        const custoUnit = parseFloat(it.custo_unitario) || 0;
        const parcelas = parseInt(it.parcelas) || 1;
        const sub = it.tipo === 'brinde' ? 0 : (qtd * unitVenda);
        const custoTotalItem = (qtd * custoUnit);

        it.subtotal = sub;
        it.custo_unitario = custoUnit;
        it.parcelas = parcelas;
        it.custo_total = (it.tipo === 'peca_estoque' || it.tipo === 'peca_terceiro' || it.tipo === 'insumo' || it.tipo === 'deslocamento') ? custoTotalItem : 0;
        it.valor_parcela = parcelas > 1 ? (custoTotalItem / parcelas) : custoTotalItem;

        const isPecaOuInsumo = (it.tipo === 'peca_estoque' || it.tipo === 'peca_terceiro' || it.tipo === 'insumo');
        let custoDisplay = '<span style="color:#64748b;font-size:0.8rem">—</span>';

        if (isPecaOuInsumo) {
            if (custoUnit > 0) {
                if (parcelas > 1) {
                    const valParc = (custoTotalItem / parcelas);
                    custoDisplay = `<div>R$ ${custoTotalItem.toFixed(2)}</div><div style="font-size:0.72rem;color:#fbbf24;font-weight:600">💳 ${parcelas}x de R$ ${valParc.toFixed(2)}/mês</div>`;
                } else {
                    custoDisplay = `<div>R$ ${custoTotalItem.toFixed(2)}</div><div style="font-size:0.72rem;color:#94a3b8">À Vista (1x)</div>`;
                }
            } else {
                custoDisplay = '<span style="color:#64748b;font-size:0.8rem">R$ 0,00</span>';
            }
        } else if (it.tipo === 'deslocamento') {
        custoDisplay = `<div style="color:#fb923c;font-weight:600">R$ ${custoUnit.toFixed(2)}</div><div style="font-size:0.7rem;color:#94a3b8">Combustível/Km</div>`;
        }

        let descNote = '';
        if (it.tipo === 'deslocamento') {
            descNote = `<div style="font-size:0.72rem;color:#fca5a5;margin-top:3px;">🔒 <em>Controle Interno WL: Oculto do cliente (embutido na Mão de Obra/Insumos no PDF e WhatsApp).</em></div>`;
        }

        tr.innerHTML = `
            <td>${getTipoBadgeHtml(it.tipo)}</td>
            <td><strong>${escapeHTML(it.descricao)}</strong>${descNote}</td>
            <td style="text-align:center;">${qtd}</td>
            <td style="text-align:right;color:#f87171;font-weight:600;">${custoDisplay}</td>
            <td style="text-align:right;">${it.tipo === 'brinde' ? 'R$ 0,00' : formatMoeda(unitVenda)}</td>
            <td style="text-align:right;font-weight:700;color:${it.tipo === 'brinde' ? '#2dd4bf' : 'var(--color-cyan)'}">
                ${it.tipo === 'brinde' ? 'R$ 0,00 (BRINDE)' : formatMoeda(sub)}
            </td>
            <td style="text-align:center;">
                <button type="button" class="btn btn-outline" style="padding:0.2rem 0.4rem;font-size:0.75rem" onclick="removerItemModal(${idx})" title="Remover item">🗑️</button>
            </td>
        `;
        corpoTabelaItensModal.appendChild(tr);
    });

    recalcularTotaisItens();
}

function recalcularTotaisItens() {
    let mo = 0;
    let pecasVenda = 0;
    let pecasCusto = 0;
    let des = 0;
    let desVendaRepassada = 0;

    _itensOsEditando.forEach(it => {
        const sub = parseFloat(it.subtotal || 0);
        const qtd = parseInt(it.qtd) || 1;
        const custoUnit = parseFloat(it.custo_unitario || 0);

        if (it.tipo === 'servico' || it.tipo === 'insumo') {
            mo += sub;
            if (it.tipo === 'insumo') {
                pecasCusto += (qtd * custoUnit);
            }
        } else if (it.tipo === 'peca_estoque' || it.tipo === 'peca_terceiro') {
            pecasVenda += sub;
            pecasCusto += (qtd * custoUnit);
        } else if (it.tipo === 'deslocamento') {
            des += (custoUnit > 0 ? (qtd * custoUnit) : sub);
            desVendaRepassada += sub;
        }
    });

    const tot = mo + pecasVenda + desVendaRepassada;
    const lucroRealOs = tot - pecasCusto - des;

    if (lblMoTotal) lblMoTotal.textContent = formatMoeda(mo);
    if (lblPecasTotal) lblPecasTotal.textContent = formatMoeda(pecasVenda);
    if (lblCustoPecasTotal) lblCustoPecasTotal.textContent = formatMoeda(pecasCusto);
    if (lblDeslocamentoTotal) lblDeslocamentoTotal.textContent = formatMoeda(des);
    if (lblValorTotal) lblValorTotal.textContent = formatMoeda(tot);
    if (lblLucroRealOs) {
        lblLucroRealOs.textContent = formatMoeda(lucroRealOs);
        lblLucroRealOs.style.color = lucroRealOs >= 0 ? '#4ade80' : '#ef4444';
    }

    if (editValor) editValor.value = tot.toFixed(2);
    if (editMaoDeObra) editMaoDeObra.value = mo.toFixed(2);
    if (editValorPecas) editValorPecas.value = pecasVenda.toFixed(2);
    if (editCustoPecas) editCustoPecas.value = pecasCusto.toFixed(2);
    if (editDeslocamento) editDeslocamento.value = des.toFixed(2);
}

window.removerItemModal = function(idx) {
    _itensOsEditando.splice(idx, 1);
    renderTabelaItensModal();
};

window.adicionarPresetItem = function(tipo, desc, qtd, custoUnit, parcelas, vendaUnit) {
    const p = parseInt(parcelas) || 1;
    const c = parseFloat(custoUnit) || 0;
    _itensOsEditando.push({
        id: 'it_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        tipo: tipo,
        descricao: desc,
        qtd: qtd,
        custo_unitario: c,
        parcelas: p,
        valor_parcela: p > 1 ? (c * qtd) / p : (c * qtd),
        valor_unitario: parseFloat(vendaUnit) || 0,
        subtotal: tipo === 'brinde' ? 0 : (qtd * parseFloat(vendaUnit))
    });
    renderTabelaItensModal();
};

btnAdicionarItemManual?.addEventListener('click', () => {
    const desc = novoItemDesc.value.trim();
    if (!desc) {
        alert('Por favor, informe a descrição do item/serviço.');
        novoItemDesc.focus();
        return;
    }
    const tipo = novoItemTipo.value;
    const qtd = parseInt(novoItemQtd.value) || 1;
    const custo = parseFloat(novoItemCusto?.value || 0) || 0;
    const parcelas = parseInt(novoItemParcelas?.value) || 1;
    const unit = tipo === 'brinde' ? 0 : (parseFloat(novoItemValor.value) || 0);

    _itensOsEditando.push({
        id: 'it_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        tipo: tipo,
        descricao: desc,
        qtd: qtd,
        custo_unitario: custo,
        parcelas: parcelas,
        valor_parcela: parcelas > 1 ? (custo * qtd) / parcelas : (custo * qtd),
        valor_unitario: unit,
        subtotal: tipo === 'brinde' ? 0 : qtd * unit
    });

    novoItemDesc.value = '';
    novoItemValor.value = '';
    if (novoItemCusto) novoItemCusto.value = '';
    novoItemQtd.value = '1';
    renderTabelaItensModal();
});

editPecaEstoque?.addEventListener('change', () => {
    const stockId = editPecaEstoque.value;
    if (!stockId) {
        novoEstoqueValor.value = '';
        return;
    }
    const item = _estoqueCache.find(i => String(i.id) === String(stockId));
    if (item) {
        novoEstoqueValor.value = parseFloat(item.preco_venda_sugerido || item.custo_unitario || 0).toFixed(2);
    }
});

btnAdicionarPecaEstoque?.addEventListener('click', () => {
    const stockId = editPecaEstoque.value;
    if (!stockId) {
        alert('Selecione uma peça cadastrada no estoque.');
        return;
    }
    const item = _estoqueCache.find(i => String(i.id) === String(stockId));
    if (!item) return;

    const qtd = parseInt(novoEstoqueQtd.value) || 1;
    const custo = parseFloat(item.custo_unitario || 0);
    const unit = parseFloat(novoEstoqueValor.value) || parseFloat(item.preco_venda_sugerido || item.custo_unitario || 0);

    _itensOsEditando.push({
        id: 'it_' + Date.now(),
        tipo: 'peca_estoque',
        ref_id: item.id,
        descricao: item.nome,
        qtd: qtd,
        valor_unitario: unit,
        subtotal: qtd * unit
    });

    editPecaEstoque.value = '';
    novoEstoqueValor.value = '';
    novoEstoqueQtd.value = '1';
    renderTabelaItensModal();
});

function atualizarCustoDeslocamentoPrev() {
    const km = parseFloat(calcKmTotal?.value || 0);
    const taxaKm = calcVeiculo?.value === 'carro' ? 1.00 : 0.50;
    const custo = km * taxaKm;
    if (calcCustoPrev) calcCustoPrev.value = `R$ ${custo.toFixed(2)}`;
}

calcKmTotal?.addEventListener('input', atualizarCustoDeslocamentoPrev);
calcVeiculo?.addEventListener('change', atualizarCustoDeslocamentoPrev);
calcRegiao?.addEventListener('change', () => {
    if (calcRegiao.value !== 'custom') {
        calcKmTotal.value = calcRegiao.value;
    }
    atualizarCustoDeslocamentoPrev();
});

btnAplicarDeslocamento?.addEventListener('click', () => {
    const km = parseFloat(calcKmTotal?.value || 0);
    const taxaKm = calcVeiculo?.value === 'carro' ? 1.00 : 0.50;
    const custo = km * taxaKm;
    const regiaoNome = calcRegiao?.options[calcRegiao.selectedIndex]?.text || `${km} km`;
    const calcDestino = document.getElementById('calcDestinoOrcamento')?.value || 'mao_de_obra';

    // Remove deslocamento anterior se já existir na lista
    _itensOsEditando = _itensOsEditando.filter(i => i.tipo !== 'deslocamento');

    let descExibicao = `Deslocamento Técnico (${regiaoNome} - ${calcVeiculo?.value.toUpperCase() || 'CARRO'})`;
    if (calcDestino === 'mao_de_obra') {
        descExibicao += ' [Embutido na Mão de Obra]';
    } else if (calcDestino === 'insumo') {
        descExibicao += ' [Cobrado como Insumos]';
    } else {
        descExibicao += ' [Absorvido Internamente]';
    }

    _itensOsEditando.push({
        id: 'it_' + Date.now(),
        tipo: 'deslocamento',
        destino: calcDestino,
        descricao: descExibicao,
        qtd: 1,
        custo_unitario: custo,
        valor_unitario: calcDestino === 'absorvido' ? 0 : custo,
        subtotal: calcDestino === 'absorvido' ? 0 : custo
    });

    renderTabelaItensModal();
});

btnGerarPdfModal?.addEventListener('click', () => {
    const osId = editOsId.value;
    if (osId) {
        gerarPDF(osId);
    }
});

// ── Abrir Modal de Edição & Atualizar OS ──────────────────────
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
    editDiagnostico.value      = os.diagnostico || '';
    editServicoRealizado.value = os.servico_realizado || '';
    editPix.value              = os.pix_copia_cola || '';

    // Carrega itens detalhados da OS ou do cache/localStorage
    let itensSalvos = os.itens_detalhados;
    if (!itensSalvos || itensSalvos.length === 0) {
        try {
            const local = localStorage.getItem(`wltec_os_itens_${os.id}`);
            if (local) itensSalvos = JSON.parse(local);
        } catch (_) {}
    }

    if (!itensSalvos || itensSalvos.length === 0) {
        // Decomposição / migração inteligente caso seja uma OS sem itens discriminados
        itensSalvos = [];
        const totVal = parseFloat(os.valor_total || 0);
        const desVal = parseFloat(os.custo_deslocamento || 0);
        const moVal  = Math.max(0, totVal - desVal);

        if (moVal > 0) {
            itensSalvos.push({
                id: 'it_mo_' + os.id,
                tipo: 'servico',
                descricao: os.diagnostico ? `Serviço Especializado: ${os.diagnostico}` : 'Serviço Técnico / Mão de Obra Especializada',
                qtd: 1,
                valor_unitario: moVal,
                subtotal: moVal
            });
        }
        if (desVal > 0) {
            itensSalvos.push({
                id: 'it_des_' + os.id,
                tipo: 'deslocamento',
                descricao: 'Serviço de Leva & Traz (Deslocamento Ida e Volta)',
                qtd: 1,
                valor_unitario: desVal,
                subtotal: desVal
            });
        }
        // Brinde higienização
        itensSalvos.push({
            id: 'it_brinde_' + os.id,
            tipo: 'brinde',
            descricao: 'Higienização Interna Completa & Limpeza de Bancada',
            qtd: 1,
            valor_unitario: 0,
            subtotal: 0
        });
    }

    _itensOsEditando = JSON.parse(JSON.stringify(itensSalvos));
    renderTabelaItensModal();
    atualizarDropdownEstoque();
    atualizarCustoDeslocamentoPrev();

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

    modalEditarOs.classList.remove('hidden');
    setTimeout(resizeEditCanvas, 150);
};

btnCloseModalEditar.addEventListener('click', () => modalEditarOs.classList.add('hidden'));

formEditarOs.addEventListener('submit', async (e) => {
    e.preventDefault();
    const osId = editOsId.value;
    if (!osId) return;

    showLoading('Atualizando Ordem de Serviço & Itens...');
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

        recalcularTotaisItens();

        const valNum = editValor.value ? parseFloat(editValor.value) : null;
        const desNum = editDeslocamento.value ? parseFloat(editDeslocamento.value) : 0;
        const moNum = editMaoDeObra.value ? parseFloat(editMaoDeObra.value) : 0;
        const pecasNum = editValorPecas.value ? parseFloat(editValorPecas.value) : 0;
        const custoPecasNum = editCustoPecas?.value ? parseFloat(editCustoPecas.value) : 0;

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

        // Salva itens detalhados no cache e no localStorage
        const itensCopia = JSON.parse(JSON.stringify(_itensOsEditando));
        try {
            localStorage.setItem(`wltec_os_itens_${osId}`, JSON.stringify(itensCopia));
        } catch (_) {}

        // Atualiza imediatamente o cache local para UX fluida
        if (osObj) {
            osObj.status = statusVal;
            osObj.valor_total = valNum;
            osObj.custo_deslocamento = desNum;
            osObj.mao_de_obra = moNum;
            osObj.valor_pecas = pecasNum;
            osObj.custo_pecas = custoPecasNum;
            osObj.itens_detalhados = itensCopia;
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
            const updatePayload = {
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
            };

            try {
                const { error: errFull } = await db.from('ordens_servico').update({
                    ...updatePayload,
                    itens_detalhados: itensCopia
                }).eq('id', osId);
                if (errFull) throw errFull;
            } catch (_) {
                await db.from('ordens_servico').update(updatePayload).eq('id', osId);
            }

            if (osObj?.cliente_id) {
                await db.from('clientes_os').update({
                    nome: nomeVal,
                    telefone: telVal,
                    cpf_cnpj: cpfVal
                }).eq('id', osObj.cliente_id);
            }
        }

        alert('Ordem de Serviço, orçamento e itens atualizados com sucesso!');
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

// ── Helper: Prepara Itens para Apresentação ao Cliente (Sigilo Total do Leva & Traz) ──
function prepararItensParaCliente(itensOriginais, custoDeslocamentoFallback = 0) {
    if (!itensOriginais || !Array.isArray(itensOriginais) || itensOriginais.length === 0) {
        return [];
    }

    // Clona os itens para não afetar os originais
    const copia = JSON.parse(JSON.stringify(itensOriginais));

    // Encontra item de deslocamento se houver
    const itemDesloc = copia.find(i => i.tipo === 'deslocamento');
    const valorDesloc = itemDesloc ? parseFloat(itemDesloc.subtotal || itemDesloc.valor_unitario || 0) : parseFloat(custoDeslocamentoFallback || 0);
    const destinoDesloc = itemDesloc?.destino || 'mao_de_obra';

    // Remove o item de deslocamento da lista do cliente
    const itensFiltrados = copia.filter(i => i.tipo !== 'deslocamento');

    if (valorDesloc > 0 && destinoDesloc !== 'absorvido') {
        if (destinoDesloc === 'mao_de_obra') {
            // Procura o primeiro item de serviço (mão de obra)
            const itemMo = itensFiltrados.find(i => i.tipo === 'servico');
            if (itemMo) {
                // Incorpora silenciosamente no valor do serviço sem discriminar frete
                const qtd = parseInt(itemMo.qtd) || 1;
                itemMo.subtotal = parseFloat(itemMo.subtotal || 0) + valorDesloc;
                itemMo.valor_unitario = (itemMo.subtotal / qtd);
            } else {
                // Se não há item de serviço na OS, cria um item profissional de Mão de Obra
                itensFiltrados.push({
                    id: 'it_mo_embutida',
                    tipo: 'servico',
                    descricao: 'Mão de Obra e Atendimento Técnico Especializado',
                    qtd: 1,
                    valor_unitario: valorDesloc,
                    subtotal: valorDesloc
                });
            }
        } else if (destinoDesloc === 'insumo') {
            // Apresenta discretamente como insumos/materiais operacionais
            itensFiltrados.push({
                id: 'it_insumo_embutido',
                tipo: 'insumo',
                descricao: 'Insumos Operacionais e Materiais Técnicos',
                qtd: 1,
                valor_unitario: valorDesloc,
                subtotal: valorDesloc
            });
        }
    }

    return itensFiltrados;
}

// ── Helper: Carrega e Reduz Imagem no Canvas para PDF Leve ──
function carregarImagemReduzida(url, maxDim = 640, quality = 0.70) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        const timer = setTimeout(() => {
            console.warn('Timeout ao carregar foto para o PDF:', url);
            resolve(null);
        }, 6000);

        img.onload = () => {
            clearTimeout(timer);
            try {
                let w = img.naturalWidth || img.width;
                let h = img.naturalHeight || img.height;
                if (!w || !h) return resolve(null);

                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve({
                    dataUrl: canvas.toDataURL('image/jpeg', quality),
                    width: w,
                    height: h
                });
            } catch (e) {
                console.warn('Erro ao processar imagem no canvas:', e);
                resolve(null);
            }
        };

        img.onerror = () => {
            clearTimeout(timer);
            console.warn('Erro ao carregar imagem para o PDF:', url);
            resolve(null);
        };

        img.src = url;
    });
}

// ── WhatsApp + PIX ───────────────────────────────────────────
window.enviarWhatsApp = function(telefone, cliente, equip, valor, pix, status, diagnostico, servico, osId) {
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
    const isOrcamento = statusText === 'Em Orçamento' || statusText === 'Aguardando Aprovação';

    let msg = `Olá *${cliente}*!\nSomos da WL TEC (Manutenção de TI).\n\n`;
    msg += isOrcamento ? `📋 *PROPOSTA DE ORÇAMENTO TÉCNICO*\n` : `📌 *Ordem de Serviço - Status:* ${statusText}\n`;
    msg += `💻 *Equipamento:* ${equip}\n\n`;

    // Itens discriminados (aplicando sigilo do Leva & Traz)
    let osObj = osId ? _ordensCache.find(o => o.id === osId) : null;
    let itens = osObj?.itens_detalhados;
    if (!itens && osId) {
        try {
            const loc = localStorage.getItem(`wltec_os_itens_${osId}`);
            if (loc) itens = JSON.parse(loc);
        } catch (_) {}
    }

    const itensParaCliente = prepararItensParaCliente(itens, osObj?.custo_deslocamento);

    if (itensParaCliente && itensParaCliente.length > 0) {
        msg += `🧾 *Discriminação de Serviços & Peças:*\n`;
        itensParaCliente.forEach(it => {
            const sub = it.tipo === 'brinde' ? 'BRINDE' : `R$ ${parseFloat(it.subtotal || (it.qtd * it.valor_unitario)).toFixed(2)}`;
            msg += `• ${it.descricao} (x${it.qtd}) — ${sub}\n`;
        });
        msg += `\n`;
    } else {
        if (diagnostico) {
            msg += `🔍 *Diagnóstico / A Fazer:* ${diagnostico}\n\n`;
        }
        if (servico) {
            msg += `✅ *Serviço Realizado:* ${servico}\n\n`;
        }
    }

    if (valor > 0) {
        msg += `💰 *Valor Total:* R$ ${parseFloat(valor).toFixed(2)}\n\n`;
        if (pix) {
            msg += `📲 *Chave PIX Copia e Cola:*\n\`${pix}\`\n\n`;
        }
    } else {
        msg += `⏳ *Valor:* Em análise técnica sem custo.\n\n`;
    }

    if (isOrcamento) {
        msg += `Caso aprove o orçamento ou tenha alguma dúvida, só me responder aqui! 😊`;
    } else {
        msg += `Qualquer dúvida ou confirmação, basta responder aqui no WhatsApp! 😊`;
    }
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
};

// ── Gerar PDF (Comprovante & Certificado de Garantia OS - 1 Página Única) ──
window.gerarPDF = async function(osId) {
    showLoading('Gerando PDF da OS / Orçamento...');
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

        const osStatus = os.status || 'Aberto';
        const osNumDisplay = (os.numero_os || os.id.substring(0, 6)).toUpperCase();

        const isOrcamento = osStatus === 'Em Orçamento' || osStatus === 'Aguardando Aprovação' || osStatus === 'Orçamento';
        const isConcluido = osStatus === 'Concluído';
        const isReparo    = osStatus === 'Em Reparo';

        let tituloDoc = `WL TEC — COMPROVANTE DE ENTRADA DE OS (Nº #${osNumDisplay})`;
        let statusBadgeText = `STATUS: ${osStatus.toUpperCase()}`;
        let tituloSec4 = '4. Discriminação de Valores & Peças';
        let tituloSec5 = 'TERMO DE RECEBIMENTO & AUTORIZAÇÃO DE DIAGNÓSTICO';
        let termoTxt = "O equipamento acima descrito foi recebido para análise técnica e diagnóstico em bancada. A WL TEC compromete-se a manter total sigilo sobre os dados e arquivos contidos no aparelho conforme a LGPD e normas de privacidade.";
        let labelAssinaturaDireita = 'Assinatura do Cliente';
        let prefijoName = 'COMPROVANTE_ENTRADA';

        if (isOrcamento) {
            tituloDoc = `WL TEC — PROPOSTA DE ORÇAMENTO TÉCNICO (Nº #${osNumDisplay})`;
            statusBadgeText = `STATUS: EM ORÇAMENTO (AGUARDANDO APROVAÇÃO)`;
            tituloSec4 = '4. Discriminação de Serviços, Peças & Orçamento Proposto';
            tituloSec5 = 'TERMO DE PROPOSTA DE ORÇAMENTO & CONDIÇÕES COMERCIAIS';
            termoTxt = "Validade da proposta: 10 (dez) dias corridos a partir da emissão. Valores e prazos sujeitos a alteração caso sejam identificados defeitos ocultos adicionais durante a execução. Peças novas substituídas possuem garantia legal de 90 dias após instalação. Formas de pagamento: PIX à vista ou Cartão.";
            labelAssinaturaDireita = 'Aprovação do Cliente (De Acordo)';
            prefijoName = 'PROPOSTA_ORCAMENTO';
        } else if (isConcluido) {
            tituloDoc = `WL TEC — LAUDO TÉCNICO & CERTIFICADO DE GARANTIA (Nº #${osNumDisplay})`;
            statusBadgeText = `STATUS: CONCLUÍDO & ENTREGUE`;
            tituloSec4 = '4. Discriminação de Serviços Executados & Peças Instaladas';
            tituloSec5 = 'CERTIFICADO DE GARANTIA LEGAL (90 DIAS - ART. 26 DO CDC)';
            termoTxt = "Conforme o Artigo 26, II da Lei 8.078/90 (Código de Defesa do Consumidor), o serviço executado e as peças substituídas constantes neste laudo possuem garantia legal de 90 (noventa) dias a partir da data de entrega. A garantia cobre defeitos de fabricação em peças e falhas no serviço. Não cobre vícios decorrentes de quedas, derramamento de líquidos, picos de tensão elétrica ou remoção do lacre de segurança.";
            labelAssinaturaDireita = 'Assinatura do Cliente';
            prefijoName = 'LAUDO_CONCLUIDO_E_GARANTIA';
        } else if (isReparo) {
            tituloDoc = `WL TEC — ORDEM DE SERVIÇO EM EXECUÇÃO (Nº #${osNumDisplay})`;
            prefijoName = 'EM_REPARO_ANDAMENTO';
        }

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
        doc.text(`Data: ${new Date(os.criado_em || Date.now()).toLocaleDateString('pt-BR')}`, 155, 18);
        doc.text(statusBadgeText, 155, 24);

        doc.setTextColor(30, 41, 59);
        let y = 35;
        doc.setFontSize(10.5); doc.setFont(undefined, 'bold');
        doc.text(tituloDoc, 12, y);
        y += 2;
        doc.setLineWidth(0.5); doc.setDrawColor(0, 255, 255);
        doc.line(12, y, 198, y);

        // 1. Dados do Cliente
        y += 6.5;
        doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
        doc.text('1. Dados do Cliente', 12, y);
        doc.setFontSize(8.2); doc.setFont(undefined, 'normal'); doc.setTextColor(51, 65, 85);
        y += 4.2; doc.text(`Nome: ${os.clientes_os?.nome || '—'}  |  Telefone / WhatsApp: ${os.clientes_os?.telefone || '—'}`, 12, y);
        y += 3.8; doc.text(`CPF/CNPJ: ${os.clientes_os?.cpf_cnpj || 'Não informado'} ${os.clientes_os?.email ? ` | E-mail: ${os.clientes_os.email}` : ''}`, 12, y);

        // 2. Dados do Equipamento & Defeito
        y += 6.5;
        doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
        doc.text('2. Dados do Equipamento', 12, y);
        doc.setFontSize(8.2); doc.setFont(undefined, 'normal'); doc.setTextColor(51, 65, 85);
        y += 4.2; doc.text(`Equipamento / Modelo: ${os.equipamento || '—'}  |  Nº Série: ${os.numero_serie || 'Não informado'}`, 12, y);
        y += 3.8;
        const defeitoLines = doc.splitTextToSize(`Defeito Relatado: ${os.defeito_relatado || '—'}`, 180);
        doc.text(defeitoLines, 12, y);
        y += (defeitoLines.length * 3.6);

        // 3. Diagnóstico Técnico & Laudo
        if (os.diagnostico || os.servico_realizado) {
            y += 3.5;
            doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
            doc.text('3. Diagnóstico Técnico & Serviço Realizado', 12, y);
            doc.setFontSize(8.2); doc.setFont(undefined, 'normal'); doc.setTextColor(51, 65, 85);
            if (os.diagnostico) {
                y += 4.2;
                const diagLines = doc.splitTextToSize(`Diagnóstico / A Fazer: ${os.diagnostico}`, 180);
                doc.text(diagLines, 12, y);
                y += (diagLines.length * 3.6);
            }
            if (os.servico_realizado) {
                y += 3.6;
                const feitoLines = doc.splitTextToSize(`Serviço Executado: ${os.servico_realizado}`, 180);
                doc.text(feitoLines, 12, y);
                y += (feitoLines.length * 3.6);
            }
        }

        // 4. TABELA DISCRIMINADA DE VALORES E PEÇAS
        y += 5.5;
        doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
        doc.text(tituloSec4, 12, y);
        y += 3.2;

        // Cabeçalho da Tabela
        doc.setFillColor(241, 245, 249);
        doc.rect(12, y, 186, 5.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(12, y, 186, 5.5, 'S');

        doc.setFontSize(7.5); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 41, 59);
        doc.text('ITEM / DESCRIÇÃO DOS SERVIÇOS E INSUMOS', 15, y + 3.8);
        doc.text('QTD', 130, y + 3.8);
        doc.text('VALOR UNIT.', 146, y + 3.8);
        doc.text('SUBTOTAL', 174, y + 3.8);

        y += 5.5;

        // Carrega itens detalhados
        let itens = os.itens_detalhados;
        if (!itens || itens.length === 0) {
            try {
                const local = localStorage.getItem(`wltec_os_itens_${os.id}`);
                if (local) itens = JSON.parse(local);
            } catch (_) {}
        }

        if (!itens || itens.length === 0) {
            const desVal = parseFloat(os.custo_deslocamento || 0);
            const totVal = parseFloat(os.valor_total || 0);
            const moTotal = Math.max(0, totVal - desVal);
            itens = [];
            if (moTotal > 0) {
                itens.push({
                    tipo: 'servico',
                    descricao: os.diagnostico ? `Serviço Especializado: ${os.diagnostico}` : 'Serviço Técnico / Mão de Obra Especializada',
                    qtd: 1,
                    valor_unitario: moTotal,
                    subtotal: moTotal
                });
            }
            itens.push({
                tipo: 'brinde',
                descricao: 'Higienização Interna Completa & Limpeza de Bancada (BRINDE WL TEC)',
                qtd: 1,
                valor_unitario: 0,
                subtotal: 0
            });
        }

        // Aplica o filtro estrito para o cliente: Leva & Traz NUNCA aparece no PDF!
        // O valor é somado na Mão de Obra ou como Insumos automaticamente.
        const itensClientePdf = prepararItensParaCliente(itens, os.custo_deslocamento);

        // Renderiza cada linha com cálculo dinâmico de altura e quebra de texto perfeita
        doc.setFontSize(7.3); doc.setFont(undefined, 'normal'); doc.setTextColor(51, 65, 85);

        let totalGeralCalculado = 0;

        itensClientePdf.forEach((it, idx) => {
            let tipoPrefix = '';
            if (it.tipo === 'servico') tipoPrefix = '[Serviço] ';
            else if (it.tipo === 'peca_estoque') tipoPrefix = '[Peça/Estoque] ';
            else if (it.tipo === 'peca_terceiro') tipoPrefix = '[Peça/Terceiro] ';
            else if (it.tipo === 'insumo') tipoPrefix = '[Insumo] ';
            else if (it.tipo === 'brinde') tipoPrefix = '[Brinde] ';

            const fullDesc = `${idx + 1}. ${tipoPrefix}${it.descricao}`;
            const descLines = doc.splitTextToSize(fullDesc, 114);
            const lineH = Math.max(5.8, 3.2 + (descLines.length * 3.2));

            // Borda da linha da tabela
            doc.setDrawColor(203, 213, 225);
            doc.rect(12, y, 186, lineH, 'S');

            // Desenha todas as linhas da descrição
            descLines.forEach((dLine, dIdx) => {
                doc.text(dLine, 15, y + 3.6 + (dIdx * 3.2));
            });

            const qtdVal = parseInt(it.qtd) || 1;
            const unitVal = parseFloat(it.valor_unitario) || 0;
            const subVal = it.tipo === 'brinde' ? 0 : (parseFloat(it.subtotal) || (qtdVal * unitVal));
            totalGeralCalculado += subVal;

            doc.text(String(qtdVal), 132, y + 3.6);
            doc.text(it.tipo === 'brinde' ? 'R$ 0,00' : (unitVal > 0 ? `R$ ${unitVal.toFixed(2)}` : 'R$ 0,00'), 146, y + 3.6);
            doc.text(it.tipo === 'brinde' ? 'R$ 0,00 (BRINDE)' : (subVal > 0 ? `R$ ${subVal.toFixed(2)}` : 'R$ 0,00'), 174, y + 3.6);

            y += lineH;
        });

        // Linha do Total Geral Destacado
        const valorFinalExibicao = (totalGeralCalculado > 0) ? totalGeralCalculado : (os.valor_total ? parseFloat(os.valor_total) : 0);
        doc.setFillColor(236, 253, 245);
        doc.rect(12, y, 186, 6.5, 'F');
        doc.setDrawColor(16, 185, 129);
        doc.rect(12, y, 186, 6.5, 'S');

        doc.setFontSize(8.5); doc.setFont(undefined, 'bold'); doc.setTextColor(6, 95, 70);
        doc.text(isOrcamento ? 'VALOR TOTAL DO ORÇAMENTO PROPOSTO:' : 'VALOR TOTAL DA ORDEM DE SERVIÇO:', 15, y + 4.5);
        doc.text(`R$ ${valorFinalExibicao > 0 ? valorFinalExibicao.toFixed(2) : '0.00'}`, 170, y + 4.5);

        y += 8.5;

        // 5. TERMO / CONDIÇÕES (MANTÉM TUDO EM 1 PÁGINA)
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.rect(12, y, 186, 22, 'FD');

        doc.setFontSize(8); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
        doc.text(tituloSec5, 16, y + 4.5);
        
        doc.setFontSize(6.8); doc.setFont(undefined, 'normal'); doc.setTextColor(71, 85, 105);
        const termoLines = doc.splitTextToSize(termoTxt, 178);
        doc.text(termoLines, 16, y + 9);

        // ── Assinaturas Sem Sobreposição (Espaçamento abaixo do topo da caixa) ──
        y += 33;

        // Assinatura & Carimbo Digital - Técnico Responsável Wiliam Longo
        doc.setFontSize(9.5); doc.setFont('helvetica', 'bolditalic'); doc.setTextColor(0, 150, 200);
        doc.text('Wiliam Longo', 16, y + 3);
        doc.setFontSize(6.8); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139);
        doc.text('WL TEC — TÉCNICO RESPONSÁVEL', 16, y + 7);

        doc.setLineWidth(0.5); doc.setDrawColor(203, 213, 225);
        doc.line(16, y + 9, 90, y + 9);
        
        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
        doc.text('Wiliam Longo — Responsável Técnico', 16, y + 13);
        doc.text('WL TEC | Santo André - SP', 16, y + 17);

        // Assinatura Cliente / Aprovação
        if (os.assinatura_cliente_base64) {
            try {
                doc.addImage(os.assinatura_cliente_base64, 'PNG', 116, y - 6, 45, 13);
            } catch (_) {}
        }
        doc.line(116, y + 9, 190, y + 9);
        doc.text(labelAssinaturaDireita, 116, y + 13);
        doc.text(os.clientes_os?.nome || 'Cliente', 116, y + 17);

        // Rodapé Fixo na Margem Inferior (286mm) da Página 1
        doc.setFontSize(7); doc.setTextColor(148, 163, 184);
        doc.text('WL TEC — Manutenção de Notebooks & Consultoria em TI | WhatsApp: (11) 91465-4157 | Santo André/SP | www.wl.tec.br', 12, 286);

        // ── 📸 ANEXO DE EVIDÊNCIAS FOTOGRÁFICAS (ANTES & DEPOIS - PÁGINA 2+) ──
        if (os.fotos_urls && Array.isArray(os.fotos_urls) && os.fotos_urls.length > 0) {
            showLoading('Processando evidências fotográficas (Antes & Depois)...');
            doc.addPage();

            // Cabeçalho Oficial do Anexo
            doc.setFillColor(10, 12, 16);
            doc.rect(0, 0, 210, 22, 'F');

            doc.setTextColor(0, 255, 255);
            doc.setFontSize(11.5); doc.setFont(undefined, 'bold');
            doc.text('WL TEC — ANEXO DE EVIDÊNCIAS FOTOGRÁFICAS (ANTES & DEPOIS)', 12, 11);

            doc.setTextColor(148, 163, 184);
            doc.setFontSize(7.5); doc.setFont(undefined, 'normal');
            doc.text(`Equipamento: ${os.equipamento || 'Notebook'} | OS #${osNumDisplay} | Cliente: ${os.clientes_os?.nome || 'Cliente'}`, 12, 18);

            // Grade de fotos compactas (2 colunas x até 3 linhas por página = 6 fotos por página)
            const colWidth = 88;
            const colHeight = 58;
            const startX = 13;
            const gapX = 8;
            let currentY = 28;
            const gapY = 16;

            for (let i = 0; i < os.fotos_urls.length; i++) {
                const fotoUrl = os.fotos_urls[i];
                const colIdx = i % 2;
                const posX = startX + (colIdx * (colWidth + gapX));

                // Se passar de 6 fotos na mesma página, cria nova página de anexo
                if (i > 0 && i % 6 === 0) {
                    doc.addPage();
                    currentY = 28;
                } else if (i > 0 && colIdx === 0) {
                    currentY += (colHeight + gapY);
                }

                try {
                    const imgObj = await carregarImagemReduzida(fotoUrl, 640, 0.70);
                    if (imgObj && imgObj.dataUrl) {
                        // Caixa de fundo
                        doc.setFillColor(248, 250, 252);
                        doc.rect(posX, currentY, colWidth, colHeight, 'F');
                        
                        // Borda suave
                        doc.setDrawColor(203, 213, 225);
                        doc.rect(posX, currentY, colWidth, colHeight, 'S');

                        // Desenha imagem comprimida
                        doc.addImage(imgObj.dataUrl, 'JPEG', posX + 1, currentY + 1, colWidth - 2, colHeight - 2);

                        // Legenda da Foto
                        doc.setFontSize(7); doc.setFont(undefined, 'bold'); doc.setTextColor(51, 65, 85);
                        doc.text(`Registro Fotográfico #${i + 1} — Vistoria / Laudo Técnico de Bancada`, posX, currentY + colHeight + 4.5);
                    }
                } catch (ePhoto) {
                    console.warn(`Erro ao inserir foto ${i + 1} no PDF:`, ePhoto);
                }
            }

            // Rodapé do Anexo
            doc.setFontSize(7); doc.setTextColor(148, 163, 184);
            doc.text('WL TEC — Registro Fotográfico Oficial de Bancada | WhatsApp: (11) 91465-4157 | www.wl.tec.br', 12, 286);
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
    select.innerHTML = '<option value="">Selecione uma peça cadastrada no estoque...</option>';
    _estoqueCache.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        const vendaSug = parseFloat(item.preco_venda_sugerido || item.custo_unitario || 0).toFixed(2);
        opt.textContent = `${item.nome} (Disp: ${item.quantidade} un | Sugerido: R$ ${vendaSug})`;
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
        const localCustos = localStorage.getItem('wltec_custos_fixos');
        if (localCustos) {
            _custosFixosCache = JSON.parse(localCustos);
        }
        const { data, error } = await db.from('custos_fixos').select('*');
        if (!error && data && data.length > 0) {
            _custosFixosCache = data;
        }
    } catch (_) { /* fallback */ }

    // Calcula DRE baseado no faturamento das OS Concluídas + Deslocamento + Custos de Peças (Estoque + Terceiros) + Fixos
    let faturamentoTotal = 0;
    let custoDeslocamentoTotal = 0;
    let custoPecasTotal = 0;

    _ordensCache.forEach(os => {
        if (os.status === 'Concluído') {
            const fat = parseFloat(os.valor_total || 0);
            faturamentoTotal += fat;
            custoDeslocamentoTotal += parseFloat(os.custo_deslocamento || 0);

            let custoOsPecas = 0;
            let itens = os.itens_detalhados;
            if (!itens || itens.length === 0) {
                try {
                    const local = localStorage.getItem(`wltec_os_itens_${os.id}`);
                    if (local) itens = JSON.parse(local);
                } catch (_) {}
            }

            if (itens && Array.isArray(itens) && itens.length > 0) {
                itens.forEach(it => {
                    if (it.tipo === 'peca_estoque' || it.tipo === 'peca_terceiro' || it.tipo === 'insumo') {
                        const q = parseInt(it.qtd) || 1;
                        const c = parseFloat(it.custo_unitario || 0);
                        custoOsPecas += (q * c);
                    }
                });
            } else if (os.custo_pecas) {
                custoOsPecas = parseFloat(os.custo_pecas || 0);
            }
            custoPecasTotal += custoOsPecas;
        }
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
    renderProjecaoParcelas();
}

function renderProjecaoParcelas() {
    const tabela = document.getElementById('tabelaProjecaoParcelas');
    if (!tabela) return;
    tabela.innerHTML = '';

    const linhasParcelas = [];

    _ordensCache.forEach(os => {
        let itens = os.itens_detalhados;
        if (!itens || itens.length === 0) {
            try {
                const local = localStorage.getItem(`wltec_os_itens_${os.id}`);
                if (local) itens = JSON.parse(local);
            } catch (_) {}
        }

        if (itens && Array.isArray(itens)) {
            itens.forEach(it => {
                const parcelas = parseInt(it.parcelas) || 1;
                const custoTot = (parseFloat(it.custo_unitario) || 0) * (parseInt(it.qtd) || 1);

                if (custoTot > 0 && parcelas > 1) {
                    const valorParc = custoTot / parcelas;
                    const dataBase = new Date(os.criado_em || Date.now());

                    for (let p = 1; p <= parcelas; p++) {
                        const dtVenc = new Date(dataBase.getFullYear(), dataBase.getMonth() + (p - 1), dataBase.getDate());
                        const mesAno = dtVenc.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                        const saldoRestante = Math.max(0, custoTot - (valorParc * p));

                        linhasParcelas.push({
                            dataVenc: dtVenc,
                            mesAno: mesAno.charAt(0).toUpperCase() + mesAno.slice(1),
                            origem: `${escapeHTML(it.descricao)} (OS #${(os.numero_os || os.id.substring(0, 6)).toUpperCase()} - ${escapeHTML(os.clientes_os?.nome || 'Cliente')})`,
                            numParcela: `${p}/${parcelas}`,
                            valorParc: valorParc,
                            saldoRestante: saldoRestante
                        });
                    }
                }
            });
        }
    });

    if (linhasParcelas.length === 0) {
        tabela.innerHTML = '<tr><td colspan="5" class="text-muted text-center" style="padding:1rem;">Nenhuma peça parcelada no cartão registrada. Ao parcelar compras de peças (ex: 8x), elas serão projetadas aqui mês a mês!</td></tr>';
        return;
    }

    // Ordena por data de vencimento
    linhasParcelas.sort((a, b) => a.dataVenc - b.dataVenc);

    linhasParcelas.forEach(lp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>📅 ${lp.mesAno}</strong></td>
            <td>${lp.origem}</td>
            <td><span class="lead-pill" style="color:#fbbf24;background:rgba(251,191,36,0.15);font-weight:600">💳 ${lp.numParcela}</span></td>
            <td style="color:#ef4444;font-weight:700">R$ ${lp.valorParc.toFixed(2)}</td>
            <td style="color:#94a3b8">R$ ${lp.saldoRestante.toFixed(2)}</td>
        `;
        tabela.appendChild(tr);
    });
}

function renderOsConcluidas() {
    const tabela = document.getElementById('tabelaOsConcluidas');
    if (!tabela) return;
    tabela.innerHTML = '';

    const concluidas = _ordensCache.filter(os => os.status === 'Concluído');
    if (concluidas.length === 0) {
        tabela.innerHTML = '<tr><td colspan="7" class="text-muted text-center" style="padding:1rem;">Nenhuma OS concluída no período ainda.</td></tr>';
        return;
    }

    concluidas.forEach(os => {
        const nome  = escapeHTML(os.clientes_os?.nome || 'Cliente');
        const equip = escapeHTML(os.equipamento || '—');
        const fat   = parseFloat(os.valor_total || 0);
        const des   = parseFloat(os.custo_deslocamento || 0);

        let custoPecas = 0;
        let itens = os.itens_detalhados;
        if (!itens || itens.length === 0) {
            try {
                const local = localStorage.getItem(`wltec_os_itens_${os.id}`);
                if (local) itens = JSON.parse(local);
            } catch (_) {}
        }
        if (itens && Array.isArray(itens)) {
            itens.forEach(it => {
                if (it.tipo === 'peca_estoque' || it.tipo === 'peca_terceiro' || it.tipo === 'insumo') {
                    const q = parseInt(it.qtd) || 1;
                    const c = parseFloat(it.custo_unitario || 0);
                    custoPecas += (q * c);
                }
            });
        } else if (os.custo_pecas) {
            custoPecas = parseFloat(os.custo_pecas || 0);
        }

        const lucroLiquidoOs = fat - (custoPecas + des);
        const margemOs = fat > 0 ? ((lucroLiquidoOs / fat) * 100).toFixed(1) : '0';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(os.criado_em).toLocaleDateString('pt-BR')}</td>
            <td><strong>${nome}</strong> <br><span class="text-muted text-sm">${equip}</span></td>
            <td style="color:var(--color-cyan);font-weight:700">R$ ${fat.toFixed(2)}</td>
            <td style="color:#f87171;font-weight:600">R$ ${custoPecas.toFixed(2)}</td>
            <td>R$ ${des.toFixed(2)}</td>
            <td style="color:${lucroLiquidoOs >= 0 ? '#22c55e' : '#ef4444'};font-weight:700">R$ ${lucroLiquidoOs.toFixed(2)}</td>
            <td><span class="lead-pill" style="font-weight:600;background:${lucroLiquidoOs >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'};color:${lucroLiquidoOs >= 0 ? '#22c55e' : '#ef4444'}">${margemOs}%</span></td>`;
        tabela.appendChild(tr);
    });
}

function renderCustosFixos() {
    tabelaCustosFixos.innerHTML = '';
    if (!_custosFixosCache || _custosFixosCache.length === 0) {
        tabelaCustosFixos.innerHTML = '<tr><td colspan="5" class="text-muted text-center" style="padding:1rem;">Nenhum custo fixo cadastrado. Clique em "+ Novo Custo / Investimento" para adicionar!</td></tr>';
        return;
    }

    _custosFixosCache.forEach((c, idx) => {
        const idKey = c.id || ('idx_' + idx);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHTML(c.descricao)}</strong></td>
            <td><span class="lead-pill">${escapeHTML(c.categoria)}</span></td>
            <td style="color:#ef4444;font-weight:700">R$ ${parseFloat(c.valor).toFixed(2)}</td>
            <td>${new Date(c.data_custo || Date.now()).toLocaleDateString('pt-BR')}</td>
            <td style="text-align:center;">
                <div style="display:flex;gap:0.3rem;justify-content:center;">
                    <button type="button" class="btn btn-secondary text-sm" style="padding:0.2rem 0.45rem;font-size:0.75rem;" onclick="abrirModalEditarCusto('${escapeHTML(idKey)}')" title="Editar Custo">✏️</button>
                    <button type="button" class="btn btn-outline text-sm" style="padding:0.2rem 0.45rem;font-size:0.75rem;border-color:#ef4444;color:#ef4444;" onclick="excluirCustoFixo('${escapeHTML(idKey)}')" title="Excluir Custo">🗑️</button>
                </div>
            </td>`;
        tabelaCustosFixos.appendChild(tr);
    });
}

window.abrirModalEditarCusto = function(custoId) {
    const c = _custosFixosCache.find((item, idx) => (item.id === custoId || ('idx_' + idx) === custoId));
    if (!c) return;

    document.getElementById('custoEditId').value = c.id || custoId;
    document.getElementById('custoDescricao').value = c.descricao || '';
    document.getElementById('custoCategoria').value = c.categoria || 'Outro';
    document.getElementById('custoValor').value = parseFloat(c.valor || 0).toFixed(2);
    document.getElementById('modalCustoTitulo').textContent = '✏️ Editar Custo / Investimento';

    modalNovoCustoFixo.classList.remove('hidden');
};

window.excluirCustoFixo = async function(custoId) {
    if (!confirm('Deseja realmente excluir este custo/investimento do financeiro?')) return;

    showLoading('Excluindo custo...');
    try {
        const idx = _custosFixosCache.findIndex((item, i) => (item.id === custoId || ('idx_' + i) === custoId));
        if (idx !== -1) {
            const item = _custosFixosCache[idx];
            if (item.id && !item.id.toString().startsWith('temp_') && !item.id.toString().startsWith('c') && !item.id.toString().startsWith('idx_')) {
                try { await db.from('custos_fixos').delete().eq('id', item.id); } catch (_) {}
            }
            _custosFixosCache.splice(idx, 1);
            try { localStorage.setItem('wltec_custos_fixos', JSON.stringify(_custosFixosCache)); } catch (_) {}
        }
        await loadDreFinanceiro();
    } catch (err) {
        alert('Erro ao excluir: ' + (err.message || err));
    } finally {
        hideLoading();
    }
};

btnAbrirModalCusto?.addEventListener('click', () => {
    document.getElementById('custoEditId').value = '';
    formNovoCustoFixo.reset();
    document.getElementById('modalCustoTitulo').textContent = '📊 Cadastrar Custo Fixo / Investimento';
    modalNovoCustoFixo.classList.remove('hidden');
});

btnCloseModalCusto?.addEventListener('click', () => modalNovoCustoFixo.classList.add('hidden'));

formNovoCustoFixo?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading('Salvando custo...');
    try {
        const editId = document.getElementById('custoEditId').value;
        const desc = document.getElementById('custoDescricao').value.trim();
        const cat = document.getElementById('custoCategoria').value;
        const val = parseFloat(document.getElementById('custoValor').value) || 0;

        if (editId) {
            // Edição
            const idx = _custosFixosCache.findIndex((item, i) => (item.id === editId || ('idx_' + i) === editId));
            if (idx !== -1) {
                _custosFixosCache[idx].descricao = desc;
                _custosFixosCache[idx].categoria = cat;
                _custosFixosCache[idx].valor = val;

                const item = _custosFixosCache[idx];
                if (item.id && !item.id.toString().startsWith('temp_') && !item.id.toString().startsWith('c') && !item.id.toString().startsWith('idx_')) {
                    try {
                        await db.from('custos_fixos').update({
                            descricao: desc,
                            categoria: cat,
                            valor: val
                        }).eq('id', item.id);
                    } catch (_) {}
                }
            }
        } else {
            // Criação
            const novo = {
                descricao: desc,
                categoria: cat,
                valor: val,
                data_custo: new Date().toISOString().split('T')[0]
            };

            let salvoDb = false;
            try {
                const { data, error } = await db.from('custos_fixos').insert([novo]).select();
                if (!error && data && data.length > 0) {
                    _custosFixosCache.push(data[0]);
                    salvoDb = true;
                }
            } catch (_) {}

            if (!salvoDb) {
                novo.id = 'temp_' + Date.now();
                _custosFixosCache.push(novo);
            }
        }

        try { localStorage.setItem('wltec_custos_fixos', JSON.stringify(_custosFixosCache)); } catch (_) {}

        modalNovoCustoFixo.classList.add('hidden');
        formNovoCustoFixo.reset();
        await loadDreFinanceiro();
        alert('Custo/Investimento salvo com sucesso!');
    } catch (err) {
        alert('Erro ao salvar: ' + err.message);
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

// ── 📑 CENTRAL DE RELATÓRIOS INTELIGENTE & BI ───────────────────
let _relatorioUltimoResultado = {
    tipo: 'consolidado',
    titulo: 'Relatório',
    headers: [],
    linhas: []
};

function inicializarModuloRelatorios() {
    popularFiltroClientesRelatorio();
    atualizarDatasPorPeriodo();
    gerarRelatorio();
}

function popularFiltroClientesRelatorio() {
    const sel = document.getElementById('relClienteFiltro');
    if (!sel) return;
    const atual = sel.value;
    sel.innerHTML = '<option value="todos">Todos os Clientes</option>';

    const clientesSet = new Set();
    (_ordensCache || []).forEach(os => {
        const nome = os.clientes_os?.nome;
        if (nome && !clientesSet.has(nome)) {
            clientesSet.add(nome);
            const opt = document.createElement('option');
            opt.value = nome;
            opt.textContent = nome;
            sel.appendChild(opt);
        }
    });

    if (atual && sel.querySelector(`option[value="${atual}"]`)) {
        sel.value = atual;
    }
}

function atualizarDatasPorPeriodo() {
    const periodo = document.getElementById('relPeriodoSelect')?.value || 'este_mes';
    const inputIni = document.getElementById('relDataInicio');
    const inputFim = document.getElementById('relDataFim');
    if (!inputIni || !inputFim) return;

    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();

    let dataIni, dataFim;

    if (periodo === 'este_mes') {
        dataIni = new Date(ano, mes, 1);
        dataFim = new Date(ano, mes + 1, 0);
    } else if (periodo === 'mes_anterior') {
        dataIni = new Date(ano, mes - 1, 1);
        dataFim = new Date(ano, mes, 0);
    } else if (periodo === 'ultimos_30') {
        dataIni = new Date(hoje.getTime() - (30 * 24 * 60 * 60 * 1000));
        dataFim = hoje;
    } else if (periodo === 'ultimos_90') {
        dataIni = new Date(hoje.getTime() - (90 * 24 * 60 * 60 * 1000));
        dataFim = hoje;
    } else if (periodo === 'este_ano') {
        dataIni = new Date(ano, 0, 1);
        dataFim = new Date(ano, 11, 31);
    } else {
        return;
    }

    inputIni.value = dataIni.toISOString().split('T')[0];
    inputFim.value = dataFim.toISOString().split('T')[0];
}

document.getElementById('relPeriodoSelect')?.addEventListener('change', () => {
    atualizarDatasPorPeriodo();
});

window.carregarPresetRelatorio = function(preset) {
    const selPeriodo = document.getElementById('relPeriodoSelect');
    const selModulo  = document.getElementById('relTipoModulo');
    const selStatus  = document.getElementById('relStatusOs');
    const selCliente = document.getElementById('relClienteFiltro');

    if (preset === 'fechamento_mes') {
        selPeriodo.value = 'este_mes';
        selModulo.value = 'consolidado';
        selStatus.value = 'Concluído';
        if (selCliente) selCliente.value = 'todos';
    } else if (preset === 'pecas_cartao') {
        selPeriodo.value = 'este_ano';
        selModulo.value = 'pecas_insumos';
        selStatus.value = 'todos';
        if (selCliente) selCliente.value = 'todos';
    } else if (preset === 'servicos_lucro') {
        selPeriodo.value = 'este_ano';
        selModulo.value = 'servicos';
        selStatus.value = 'Concluído';
        if (selCliente) selCliente.value = 'todos';
    } else if (preset === 'ranking_clientes') {
        selPeriodo.value = 'este_ano';
        selModulo.value = 'clientes';
        selStatus.value = 'todos';
        if (selCliente) selCliente.value = 'todos';
    } else if (preset === 'gastos_fixos') {
        selPeriodo.value = 'este_ano';
        selModulo.value = 'custos_fixos';
        selStatus.value = 'todos';
        if (selCliente) selCliente.value = 'todos';
    } else if (preset === 'preventivas_vencer') {
        selPeriodo.value = 'este_ano';
        selModulo.value = 'preventivas';
        selStatus.value = 'todos';
        if (selCliente) selCliente.value = 'todos';
    }

    atualizarDatasPorPeriodo();
    gerarRelatorio();
};

document.getElementById('btnGerarRelatorio')?.addEventListener('click', () => {
    gerarRelatorio();
});

function gerarRelatorio() {
    const dataIniStr = document.getElementById('relDataInicio')?.value;
    const dataFimStr = document.getElementById('relDataFim')?.value;
    const modulo     = document.getElementById('relTipoModulo')?.value || 'consolidado';
    const statusFiltro = document.getElementById('relStatusOs')?.value || 'todos';
    const clienteFiltro = document.getElementById('relClienteFiltro')?.value || 'todos';

    const dtIni = dataIniStr ? new Date(dataIniStr + 'T00:00:00') : new Date('2020-01-01');
    const dtFim = dataFimStr ? new Date(dataFimStr + 'T23:59:59') : new Date('2030-12-31');

    // Filtra ordens de serviço
    const ordensFiltradas = (_ordensCache || []).filter(os => {
        const dtOs = new Date(os.criado_em || Date.now());
        if (dtOs < dtIni || dtOs > dtFim) return false;
        if (statusFiltro !== 'todos' && os.status !== statusFiltro) return false;
        if (clienteFiltro !== 'todos' && (os.clientes_os?.nome !== clienteFiltro)) return false;
        return true;
    });

    // Filtra custos fixos
    const custosFiltrados = (_custosFixosCache || []).filter(c => {
        const dtCusto = new Date(c.data_custo || Date.now());
        return (dtCusto >= dtIni && dtCusto <= dtFim);
    });

    const titElem = document.getElementById('relTituloGerado');
    const subElem = document.getElementById('relSubtituloGerado');
    const iniFormat = dtIni.toLocaleDateString('pt-BR');
    const fimFormat = dtFim.toLocaleDateString('pt-BR');

    subElem.textContent = `Período: ${iniFormat} até ${fimFormat} | Status: ${statusFiltro.toUpperCase()} | Cliente: ${clienteFiltro}`;

    if (modulo === 'consolidado') {
        titElem.textContent = '📊 Relatório: Fechamento Consolidado & DRE Executivo';
        renderRelatorioConsolidado(ordensFiltradas, custosFiltrados);
    } else if (modulo === 'pecas_insumos') {
        titElem.textContent = '🤝 Relatório: Peças, Insumos, Fornecedores & Cartão Parcelado';
        renderRelatorioPecasInsumos(ordensFiltradas);
    } else if (modulo === 'servicos') {
        titElem.textContent = '🔧 Relatório: Produtividade & Ranking por Tipo de Serviço';
        renderRelatorioServicos(ordensFiltradas);
    } else if (modulo === 'clientes') {
        titElem.textContent = '👥 Relatório: Clientes, Faturamento Acumulado & LTV';
        renderRelatorioClientes(ordensFiltradas);
    } else if (modulo === 'custos_fixos') {
        titElem.textContent = '💸 Relatório: Investimentos Comerciais, Marketing & Despesas Fixas';
        renderRelatorioCustosFixos(custosFiltrados);
    } else if (modulo === 'preventivas') {
        titElem.textContent = '📅 Relatório: CRM de Manutenções Preventivas (Oportunidades de Contato)';
        renderRelatorioPreventivas(ordensFiltradas);
    }
}

function renderRelatorioConsolidado(ordens, custos) {
    let faturamentoTot = 0;
    let custoPecasTot  = 0;
    let deslocamentoTot = 0;
    let fixosTot = 0;

    const thead = document.getElementById('theadRelatorio');
    const tbody = document.getElementById('tbodyRelatorio');
    thead.innerHTML = `
        <tr>
            <th>Data</th>
            <th>OS / Identificador</th>
            <th>Cliente / Equipamento</th>
            <th>Faturamento (R$)</th>
            <th style="color:#f87171">Custo Peças (R$)</th>
            <th>Deslocamento (R$)</th>
            <th style="color:#4ade80">Lucro OS (R$)</th>
            <th>Margem %</th>
        </tr>
    `;
    tbody.innerHTML = '';

    const linhasCsv = [];

    ordens.forEach(os => {
        const fat = parseFloat(os.valor_total || 0);
        const des = parseFloat(os.custo_deslocamento || 0);
        let cPecas = 0;

        let itens = os.itens_detalhados;
        if (!itens || itens.length === 0) {
            try {
                const local = localStorage.getItem(`wltec_os_itens_${os.id}`);
                if (local) itens = JSON.parse(local);
            } catch (_) {}
        }

        if (itens && Array.isArray(itens)) {
            itens.forEach(it => {
                if (it.tipo === 'peca_estoque' || it.tipo === 'peca_terceiro' || it.tipo === 'insumo') {
                    cPecas += (parseInt(it.qtd) || 1) * (parseFloat(it.custo_unitario) || 0);
                }
            });
        } else if (os.custo_pecas) {
            cPecas = parseFloat(os.custo_pecas || 0);
        }

        const lucroOs = fat - (cPecas + des);
        const margemOs = fat > 0 ? ((lucroOs / fat) * 100).toFixed(1) : '0';

        faturamentoTot += fat;
        custoPecasTot  += cPecas;
        deslocamentoTot += des;

        const dataStr = new Date(os.criado_em || Date.now()).toLocaleDateString('pt-BR');
        const osNum   = (os.numero_os || os.id.substring(0, 8)).toUpperCase();
        const nomeCli = os.clientes_os?.nome || 'Cliente';
        const equip   = os.equipamento || '—';

        linhasCsv.push([
            dataStr,
            `#${osNum}`,
            `${nomeCli} (${equip})`,
            fat.toFixed(2),
            cPecas.toFixed(2),
            des.toFixed(2),
            lucroOs.toFixed(2),
            `${margemOs}%`
        ]);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dataStr}</td>
            <td><strong>#${osNum}</strong> <br><span class="lead-pill" style="font-size:0.7rem">${os.status}</span></td>
            <td><strong>${escapeHTML(nomeCli)}</strong> <br><span class="text-muted text-sm">${escapeHTML(equip)}</span></td>
            <td style="color:var(--color-cyan);font-weight:700">R$ ${fat.toFixed(2)}</td>
            <td style="color:#f87171;font-weight:600">R$ ${cPecas.toFixed(2)}</td>
            <td>R$ ${des.toFixed(2)}</td>
            <td style="color:${lucroOs >= 0 ? '#22c55e' : '#ef4444'};font-weight:700">R$ ${lucroOs.toFixed(2)}</td>
            <td><span class="lead-pill" style="font-weight:600;color:${lucroOs >= 0 ? '#22c55e' : '#ef4444'}">${margemOs}%</span></td>
        `;
        tbody.appendChild(tr);
    });

    custos.forEach(c => {
        fixosTot += parseFloat(c.valor || 0);
    });

    if (ordens.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-muted text-center" style="padding:1.5rem;">Nenhuma ordem de serviço encontrada com os filtros selecionados.</td></tr>';
    }

    const outrosCustosTot = deslocamentoTot + fixosTot;
    const lucroLiquidoTot = faturamentoTot - (custoPecasTot + outrosCustosTot);
    const margemGeral     = faturamentoTot > 0 ? ((lucroLiquidoTot / faturamentoTot) * 100).toFixed(1) : '0';
    const ticketMedio     = ordens.length > 0 ? (faturamentoTot / ordens.length).toFixed(2) : '0.00';

    document.getElementById('relKpiFaturamento').textContent = `R$ ${faturamentoTot.toFixed(2)}`;
    document.getElementById('relKpiTotalOs').textContent = `${ordens.length} OSs no período`;

    document.getElementById('relKpiCustoPecas').textContent = `R$ ${custoPecasTot.toFixed(2)}`;
    document.getElementById('relKpiParcelasMes').textContent = `COGS de peças/insumos`;

    document.getElementById('relKpiOutrosCustos').textContent = `R$ ${outrosCustosTot.toFixed(2)}`;
    document.getElementById('relKpiLucroLiquido').textContent = `R$ ${lucroLiquidoTot.toFixed(2)}`;
    document.getElementById('relKpiLucroLiquido').style.color = lucroLiquidoTot >= 0 ? '#22c55e' : '#ef4444';
    document.getElementById('relKpiMargem').textContent = `Margem Líquida: ${margemGeral}%`;

    document.getElementById('relKpiTicketMedio').textContent = `R$ ${ticketMedio}`;

    _relatorioUltimoResultado = {
        tipo: 'consolidado',
        titulo: 'Relatório Consolidado Executivo & DRE',
        headers: ['Data', 'OS', 'Cliente / Equipamento', 'Faturamento (R$)', 'Custo Peças (R$)', 'Deslocamento (R$)', 'Lucro OS (R$)', 'Margem'],
        linhas: linhasCsv
    };
}

function renderRelatorioPecasInsumos(ordens) {
    const thead = document.getElementById('theadRelatorio');
    const tbody = document.getElementById('tbodyRelatorio');
    thead.innerHTML = `
        <tr>
            <th>Data</th>
            <th>Peça / Insumo</th>
            <th>OS &amp; Cliente</th>
            <th>Qtd</th>
            <th style="color:#f87171">Custo Unit. (R$)</th>
            <th style="color:#f87171">Custo Total (R$)</th>
            <th>💳 Pagamento / Parcelas</th>
            <th style="color:var(--color-cyan)">Venda Unit. (R$)</th>
            <th style="color:#4ade80">Lucro Revenda (R$)</th>
        </tr>
    `;
    tbody.innerHTML = '';

    let totalGastoPecas = 0;
    let totalVendaPecas = 0;
    let totalQtdPecas   = 0;
    let totalParcelado  = 0;
    const linhasCsv = [];

    ordens.forEach(os => {
        let itens = os.itens_detalhados;
        if (!itens || itens.length === 0) {
            try {
                const local = localStorage.getItem(`wltec_os_itens_${os.id}`);
                if (local) itens = JSON.parse(local);
            } catch (_) {}
        }

        if (itens && Array.isArray(itens)) {
            itens.forEach(it => {
                if (it.tipo === 'peca_estoque' || it.tipo === 'peca_terceiro' || it.tipo === 'insumo') {
                    const qtd = parseInt(it.qtd) || 1;
                    const cUnit = parseFloat(it.custo_unitario) || 0;
                    const vUnit = parseFloat(it.valor_unitario) || 0;
                    const parcelas = parseInt(it.parcelas) || 1;
                    const cTotal = qtd * cUnit;
                    const vTotal = qtd * vUnit;
                    const lucroItem = vTotal - cTotal;

                    totalGastoPecas += cTotal;
                    totalVendaPecas += vTotal;
                    totalQtdPecas   += qtd;
                    if (parcelas > 1) totalParcelado += cTotal;

                    const dataStr = new Date(os.criado_em || Date.now()).toLocaleDateString('pt-BR');
                    const osNum = (os.numero_os || os.id.substring(0, 8)).toUpperCase();
                    const nomeCli = os.clientes_os?.nome || 'Cliente';
                    const parcStr = parcelas > 1 ? `${parcelas}x de R$ ${(cTotal / parcelas).toFixed(2)}/mês` : 'À Vista (1x)';

                    linhasCsv.push([
                        dataStr,
                        it.descricao,
                        `OS #${osNum} - ${nomeCli}`,
                        String(qtd),
                        cUnit.toFixed(2),
                        cTotal.toFixed(2),
                        parcStr,
                        vUnit.toFixed(2),
                        lucroItem.toFixed(2)
                    ]);

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${dataStr}</td>
                        <td><strong>${escapeHTML(it.descricao)}</strong> <br><span class="lead-pill" style="font-size:0.7rem">${it.tipo}</span></td>
                        <td><strong>OS #${osNum}</strong> <br><span class="text-muted text-sm">${escapeHTML(nomeCli)}</span></td>
                        <td style="text-align:center;">${qtd}</td>
                        <td style="color:#f87171;font-weight:600">R$ ${cUnit.toFixed(2)}</td>
                        <td style="color:#f87171;font-weight:700">R$ ${cTotal.toFixed(2)}</td>
                        <td><span class="lead-pill" style="color:#fbbf24;background:rgba(251,191,36,0.15);font-weight:600">💳 ${parcStr}</span></td>
                        <td style="color:var(--color-cyan);font-weight:700">R$ ${vUnit.toFixed(2)}</td>
                        <td style="color:${lucroItem >= 0 ? '#22c55e' : '#ef4444'};font-weight:700">R$ ${lucroItem.toFixed(2)}</td>
                    `;
                    tbody.appendChild(tr);
                }
            });
        }
    });

    if (linhasCsv.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-muted text-center" style="padding:1.5rem;">Nenhuma peça ou insumo discriminado no período filtrado.</td></tr>';
    }

    const lucroBrutoPecas = totalVendaPecas - totalGastoPecas;
    const margemPecas = totalVendaPecas > 0 ? ((lucroBrutoPecas / totalVendaPecas) * 100).toFixed(1) : '0';

    document.getElementById('relKpiFaturamento').textContent = `R$ ${totalVendaPecas.toFixed(2)}`;
    document.getElementById('relKpiTotalOs').textContent = `Revenda Total de Peças`;

    document.getElementById('relKpiCustoPecas').textContent = `R$ ${totalGastoPecas.toFixed(2)}`;
    document.getElementById('relKpiParcelasMes').textContent = `Total Custo de Aquisição`;

    document.getElementById('relKpiOutrosCustos').textContent = `R$ ${totalParcelado.toFixed(2)}`;
    document.getElementById('relKpiLucroLiquido').textContent = `R$ ${lucroBrutoPecas.toFixed(2)}`;
    document.getElementById('relKpiLucroLiquido').style.color = lucroBrutoPecas >= 0 ? '#22c55e' : '#ef4444';
    document.getElementById('relKpiMargem').textContent = `Margem de Revenda: ${margemPecas}%`;

    document.getElementById('relKpiTicketMedio').textContent = `${totalQtdPecas} un`;

    _relatorioUltimoResultado = {
        tipo: 'pecas_insumos',
        titulo: 'Relatório de Peças, Insumos e Cartão',
        headers: ['Data', 'Peça / Insumo', 'OS / Cliente', 'Qtd', 'Custo Unit. (R$)', 'Custo Total (R$)', 'Pagamento / Parcelas', 'Venda Unit. (R$)', 'Lucro Revenda (R$)'],
        linhas: linhasCsv
    };
}

function renderRelatorioServicos(ordens) {
    const thead = document.getElementById('theadRelatorio');
    const tbody = document.getElementById('tbodyRelatorio');
    thead.innerHTML = `
        <tr>
            <th>Tipo de Serviço / Mão de Obra</th>
            <th style="text-align:center;">Qtd Realizada</th>
            <th>Faturamento Gerado (R$)</th>
            <th>Ticket Médio (R$)</th>
            <th>% do Faturamento de Serviços</th>
        </tr>
    `;
    tbody.innerHTML = '';

    const servicosMap = new Map();
    let totalFatServicos = 0;
    let totalQtdServicos = 0;

    ordens.forEach(os => {
        let itens = os.itens_detalhados;
        if (!itens || itens.length === 0) {
            try {
                const local = localStorage.getItem(`wltec_os_itens_${os.id}`);
                if (local) itens = JSON.parse(local);
            } catch (_) {}
        }

        if (itens && Array.isArray(itens)) {
            itens.forEach(it => {
                if (it.tipo === 'servico' || it.tipo === 'deslocamento') {
                    const desc = it.descricao || 'Serviço Técnico Especializado';
                    const qtd = parseInt(it.qtd) || 1;
                    const sub = parseFloat(it.subtotal || (qtd * (parseFloat(it.valor_unitario) || 0)));

                    totalFatServicos += sub;
                    totalQtdServicos += qtd;

                    if (!servicosMap.has(desc)) {
                        servicosMap.set(desc, { desc: desc, qtd: 0, total: 0 });
                    }
                    const s = servicosMap.get(desc);
                    s.qtd += qtd;
                    s.total += sub;
                }
            });
        }
    });

    const listaServicos = Array.from(servicosMap.values()).sort((a, b) => b.total - a.total);
    const linhasCsv = [];

    listaServicos.forEach(s => {
        const ticket = s.qtd > 0 ? (s.total / s.qtd).toFixed(2) : '0.00';
        const perc = totalFatServicos > 0 ? ((s.total / totalFatServicos) * 100).toFixed(1) : '0';

        linhasCsv.push([
            s.desc,
            String(s.qtd),
            s.total.toFixed(2),
            ticket,
            `${perc}%`
        ]);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>🔧 ${escapeHTML(s.desc)}</strong></td>
            <td style="text-align:center;font-weight:700">${s.qtd}</td>
            <td style="color:var(--color-cyan);font-weight:700">R$ ${s.total.toFixed(2)}</td>
            <td>R$ ${ticket}</td>
            <td><span class="lead-pill" style="font-weight:600;color:var(--color-amber)">${perc}%</span></td>
        `;
        tbody.appendChild(tr);
    });

    if (listaServicos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-muted text-center" style="padding:1.5rem;">Nenhum serviço registrado nas OSs filtradas.</td></tr>';
    }

    document.getElementById('relKpiFaturamento').textContent = `R$ ${totalFatServicos.toFixed(2)}`;
    document.getElementById('relKpiTotalOs').textContent = `${totalQtdServicos} serviços prestados`;

    document.getElementById('relKpiCustoPecas').textContent = `R$ 0,00`;
    document.getElementById('relKpiParcelasMes').textContent = `Mão de obra 100% líquida`;

    document.getElementById('relKpiOutrosCustos').textContent = `${listaServicos.length} tipos`;
    document.getElementById('relKpiLucroLiquido').textContent = `R$ ${totalFatServicos.toFixed(2)}`;
    document.getElementById('relKpiLucroLiquido').style.color = '#22c55e';
    document.getElementById('relKpiMargem').textContent = `Margem M.O.: 100%`;

    const ticketGlobal = totalQtdServicos > 0 ? (totalFatServicos / totalQtdServicos).toFixed(2) : '0.00';
    document.getElementById('relKpiTicketMedio').textContent = `R$ ${ticketGlobal}`;

    _relatorioUltimoResultado = {
        tipo: 'servicos',
        titulo: 'Relatório de Produtividade por Serviço',
        headers: ['Tipo de Serviço', 'Qtd Realizada', 'Faturamento Gerado (R$)', 'Ticket Médio (R$)', '% da Receita'],
        linhas: linhasCsv
    };
}

function renderRelatorioClientes(ordens) {
    const thead = document.getElementById('theadRelatorio');
    const tbody = document.getElementById('tbodyRelatorio');
    thead.innerHTML = `
        <tr>
            <th>Nome do Cliente</th>
            <th>Telefone / Contato</th>
            <th style="text-align:center;">Total de OSs</th>
            <th>Faturamento Acumulado (LTV)</th>
            <th>Ticket Médio (R$)</th>
            <th>Último Atendimento</th>
        </tr>
    `;
    tbody.innerHTML = '';

    const cliMap = new Map();
    let faturamentoGlobal = 0;

    ordens.forEach(os => {
        const nome = os.clientes_os?.nome || 'Cliente';
        const tel  = os.clientes_os?.telefone || '—';
        const fat  = parseFloat(os.valor_total || 0);
        const data = new Date(os.criado_em || Date.now());

        faturamentoGlobal += fat;

        if (!cliMap.has(nome)) {
            cliMap.set(nome, {
                nome: nome,
                telefone: tel,
                totalOs: 0,
                faturamento: 0,
                ultimaData: data
            });
        }

        const c = cliMap.get(nome);
        c.totalOs += 1;
        c.faturamento += fat;
        if (data > c.ultimaData) c.ultimaData = data;
    });

    const listaClientes = Array.from(cliMap.values()).sort((a, b) => b.faturamento - a.faturamento);
    const linhasCsv = [];

    listaClientes.forEach(c => {
        const ticket = c.totalOs > 0 ? (c.faturamento / c.totalOs).toFixed(2) : '0.00';
        const dtStr  = c.ultimaData.toLocaleDateString('pt-BR');

        linhasCsv.push([
            c.nome,
            c.telefone,
            String(c.totalOs),
            c.faturamento.toFixed(2),
            ticket,
            dtStr
        ]);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>👤 ${escapeHTML(c.nome)}</strong></td>
            <td><span class="lead-pill">📱 ${escapeHTML(c.telefone)}</span></td>
            <td style="text-align:center;font-weight:700">${c.totalOs}</td>
            <td style="color:var(--color-cyan);font-weight:700">R$ ${c.faturamento.toFixed(2)}</td>
            <td>R$ ${ticket}</td>
            <td>${dtStr}</td>
        `;
        tbody.appendChild(tr);
    });

    if (listaClientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-muted text-center" style="padding:1.5rem;">Nenhum cliente com atendimentos no período.</td></tr>';
    }

    const ticketMedioGeral = listaClientes.length > 0 ? (faturamentoGlobal / listaClientes.length).toFixed(2) : '0.00';

    document.getElementById('relKpiFaturamento').textContent = `R$ ${faturamentoGlobal.toFixed(2)}`;
    document.getElementById('relKpiTotalOs').textContent = `${listaClientes.length} clientes ativos`;

    document.getElementById('relKpiCustoPecas').textContent = listaClientes[0] ? listaClientes[0].nome : '—';
    document.getElementById('relKpiParcelasMes').textContent = `Cliente TOP #1 em Vendas`;

    document.getElementById('relKpiOutrosCustos').textContent = `${ordens.length} OSs`;
    document.getElementById('relKpiLucroLiquido').textContent = `R$ ${ticketMedioGeral}`;
    document.getElementById('relKpiLucroLiquido').style.color = 'var(--color-cyan)';
    document.getElementById('relKpiMargem').textContent = `Média por Cliente (LTV)`;

    document.getElementById('relKpiTicketMedio').textContent = `R$ ${ticketMedioGeral}`;

    _relatorioUltimoResultado = {
        tipo: 'clientes',
        titulo: 'Relatório de Ranking de Clientes (LTV)',
        headers: ['Nome do Cliente', 'Telefone', 'Total de OSs', 'Faturamento Acumulado (R$)', 'Ticket Médio (R$)', 'Último Atendimento'],
        linhas: linhasCsv
    };
}

function renderRelatorioCustosFixos(custos) {
    const thead = document.getElementById('theadRelatorio');
    const tbody = document.getElementById('tbodyRelatorio');
    thead.innerHTML = `
        <tr>
            <th>Data</th>
            <th>Descrição da Despesa / Investimento</th>
            <th>Categoria</th>
            <th>Valor (R$)</th>
            <th>Proporção %</th>
        </tr>
    `;
    tbody.innerHTML = '';

    let totalFixos = 0;
    custos.forEach(c => totalFixos += parseFloat(c.valor || 0));

    const linhasCsv = [];

    custos.forEach(c => {
        const val = parseFloat(c.valor || 0);
        const perc = totalFixos > 0 ? ((val / totalFixos) * 100).toFixed(1) : '0';
        const dtStr = new Date(c.data_custo || Date.now()).toLocaleDateString('pt-BR');

        linhasCsv.push([
            dtStr,
            c.descricao,
            c.categoria,
            val.toFixed(2),
            `${perc}%`
        ]);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dtStr}</td>
            <td><strong>${escapeHTML(c.descricao)}</strong></td>
            <td><span class="lead-pill">${escapeHTML(c.categoria)}</span></td>
            <td style="color:#ef4444;font-weight:700">R$ ${val.toFixed(2)}</td>
            <td><span class="lead-pill" style="font-weight:600">${perc}%</span></td>
        `;
        tbody.appendChild(tr);
    });

    if (custos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-muted text-center" style="padding:1.5rem;">Nenhum custo fixo registrado no período.</td></tr>';
    }

    document.getElementById('relKpiFaturamento').textContent = `R$ ${totalFixos.toFixed(2)}`;
    document.getElementById('relKpiTotalOs').textContent = `${custos.length} lançamentos`;

    document.getElementById('relKpiCustoPecas').textContent = `R$ ${totalFixos.toFixed(2)}`;
    document.getElementById('relKpiParcelasMes').textContent = `Total Despesas & Investimentos`;

    document.getElementById('relKpiOutrosCustos').textContent = `Bancada / Ads`;
    document.getElementById('relKpiLucroLiquido').textContent = `- R$ ${totalFixos.toFixed(2)}`;
    document.getElementById('relKpiLucroLiquido').style.color = '#ef4444';
    document.getElementById('relKpiMargem').textContent = `Total Saídas`;

    const mediaFixos = custos.length > 0 ? (totalFixos / custos.length).toFixed(2) : '0.00';
    document.getElementById('relKpiTicketMedio').textContent = `R$ ${mediaFixos}`;

    _relatorioUltimoResultado = {
        tipo: 'custos_fixos',
        titulo: 'Relatório de Custos Fixos e Marketing',
        headers: ['Data', 'Descrição', 'Categoria', 'Valor (R$)', 'Proporção %'],
        linhas: linhasCsv
    };
}

function renderRelatorioPreventivas(ordens) {
    const thead = document.getElementById('theadRelatorio');
    const tbody = document.getElementById('tbodyRelatorio');
    thead.innerHTML = `
        <tr>
            <th>Cliente</th>
            <th>Telefone / WhatsApp</th>
            <th>Equipamento</th>
            <th>Data do Último Serviço</th>
            <th>Tempo Decorrido</th>
            <th>Status Sugerido</th>
        </tr>
    `;
    tbody.innerHTML = '';

    const agora = new Date();
    const clientesProcessados = new Set();
    const linhasCsv = [];
    let prontasPreventiva = 0;

    ordens.forEach(os => {
        const nome = os.clientes_os?.nome || 'Cliente';
        if (clientesProcessados.has(nome)) return;
        clientesProcessados.add(nome);

        const tel = os.clientes_os?.telefone || '—';
        const equip = os.equipamento || 'Notebook / PC';
        const dtOs = new Date(os.criado_em || Date.now());
        const diffMeses = Math.floor((agora - dtOs) / (1000 * 60 * 60 * 24 * 30.43));

        let statusBadge = '';
        let statusCsv = '';
        if (diffMeses >= 6) {
            prontasPreventiva++;
            statusBadge = '<span class="lead-pill" style="background:rgba(239,68,68,0.2);color:#ef4444;font-weight:700">🚨 6+ Meses (Revisão Urgente)</span>';
            statusCsv = '6+ Meses (Urgente)';
        } else if (diffMeses >= 5) {
            prontasPreventiva++;
            statusBadge = '<span class="lead-pill" style="background:rgba(251,191,36,0.2);color:#fbbf24;font-weight:700">⚠️ 5 Meses (Momento Ideal)</span>';
            statusCsv = '5 Meses (Ideal)';
        } else {
            statusBadge = '<span class="lead-pill" style="background:rgba(34,197,94,0.15);color:#22c55e;font-weight:600">✅ Em dia (&lt; 5m)</span>';
            statusCsv = 'Em dia';
        }

        const dtStr = dtOs.toLocaleDateString('pt-BR');

        linhasCsv.push([
            nome,
            tel,
            equip,
            dtStr,
            `${diffMeses} meses`,
            statusCsv
        ]);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>👤 ${escapeHTML(nome)}</strong></td>
            <td><span class="lead-pill">📱 ${escapeHTML(tel)}</span></td>
            <td>${escapeHTML(equip)}</td>
            <td>${dtStr}</td>
            <td style="font-weight:700">${diffMeses} meses</td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });

    if (clientesProcessados.size === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-muted text-center" style="padding:1.5rem;">Nenhum cliente disponível para análise preventiva.</td></tr>';
    }

    const potencialReceita = prontasPreventiva * 120; // R$ 120 por preventiva de limpeza + pasta térmica

    document.getElementById('relKpiFaturamento').textContent = `R$ ${potencialReceita.toFixed(2)}`;
    document.getElementById('relKpiTotalOs').textContent = `Potencial de Receita Estimado`;

    document.getElementById('relKpiCustoPecas').textContent = `${prontasPreventiva} clientes`;
    document.getElementById('relKpiParcelasMes').textContent = `Prontos para Contatar (5-6m)`;

    document.getElementById('relKpiOutrosCustos').textContent = `${clientesProcessados.size} na Base`;
    document.getElementById('relKpiLucroLiquido').textContent = `${prontasPreventiva}`;
    document.getElementById('relKpiLucroLiquido').style.color = 'var(--color-amber)';
    document.getElementById('relKpiMargem').textContent = `Leads Quentes de Retorno`;

    document.getElementById('relKpiTicketMedio').textContent = `R$ 120,00`;

    _relatorioUltimoResultado = {
        tipo: 'preventivas',
        titulo: 'Relatório de CRM de Manutenção Preventiva',
        headers: ['Cliente', 'Telefone', 'Equipamento', 'Data Último Serviço', 'Tempo Decorrido', 'Status Sugerido'],
        linhas: linhasCsv
    };
}

// ── EXPORTAÇÃO CSV / EXCEL ────────────────────────────────────
document.getElementById('btnExportarCsvRelatorio')?.addEventListener('click', () => {
    if (!_relatorioUltimoResultado || !_relatorioUltimoResultado.linhas || _relatorioUltimoResultado.linhas.length === 0) {
        alert('Gere um relatório primeiro para poder exportar!');
        return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM para Excel
    csvContent += _relatorioUltimoResultado.headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';') + '\r\n';

    _relatorioUltimoResultado.linhas.forEach(row => {
        csvContent += row.map(col => `"${String(col).replace(/"/g, '""')}"`).join(';') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dtHoje = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `Relatorio_WLTEC_${_relatorioUltimoResultado.tipo}_${dtHoje}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// ── IMPRIMIR / SALVAR PDF ─────────────────────────────────────
document.getElementById('btnImprimirRelatorio')?.addEventListener('click', () => {
    window.print();
});

// Inicialização de dropdowns de estoque e terceiros ao carregar
loadEstoque();
loadTerceiros();

// ── Inicialização: Verifica a sessão do usuário ao carregar ──
checkAuthSession();

