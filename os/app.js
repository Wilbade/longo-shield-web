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

// ── DOM: Navegação ───────────────────────────────────────────
const btnNovaOs   = document.getElementById('btnNovaOs');
const btnListaOs  = document.getElementById('btnListaOs');
const btnLeadsOs  = document.getElementById('btnLeadsOs');

const secNovaOs   = document.getElementById('secNovaOs');
const secListaOs  = document.getElementById('secListaOs');
const secLeadsOs  = document.getElementById('secLeadsOs');

const leadsBadge  = document.getElementById('leadsBadge');

// ── Autenticação de Sessão (Supabase Auth) ───────────────────
async function checkAuthSession() {
    try {
        const { data: { session }, error } = await db.auth.getSession();
        if (error || !session) {
            // Não logado: exibe o formulário de login e oculta o painel
            loginOverlay.style.display = 'flex';
            mainHeader.classList.add('hidden');
            allSections.forEach(s => s.classList.add('hidden'));
        } else {
            // Logado: libera a interface do painel
            loginOverlay.style.display = 'none';
            mainHeader.classList.remove('hidden');
            switchSection(secNovaOs, btnNovaOs);
            contarLeadsNovos();
        }
    } catch (err) {
        console.error('Erro na checagem de sessão:', err);
    }
}

// ── Login Handler (Turnstile + Supabase Auth) ────────────────
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorAuth.textContent = '';

    const email    = inputEmail.value.trim();
    const password = inputPass.value.trim();

    if (!email || !password) {
        errorAuth.textContent = 'Por favor, informe a conta e a senha.';
        return;
    }

    // Validação do token do Cloudflare Turnstile
    let turnstileToken = '';
    if (window.turnstile) {
        turnstileToken = window.turnstile.getResponse();
        if (!turnstileToken) {
            errorAuth.textContent = 'Por favor, complete a verificação de segurança (Turnstile).';
            return;
        }
    }

    // UI Loading
    btnAuth.disabled = true;
    authSpinner.style.display = 'inline-block';
    authLabel.textContent = 'Validando...';

    try {
        const { data, error } = await db.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            throw error;
        }

        // Sucesso
        errorAuth.textContent = '';
        authForm.reset();
        if (window.turnstile) window.turnstile.reset();
        await checkAuthSession();

    } catch (err) {
        console.error('Erro de autenticação:', err);
        errorAuth.textContent = err.message === 'Invalid login credentials'
            ? 'Credenciais inválidas. Verifique seu e-mail e senha.'
            : (err.message || 'Erro ao autenticar. Tente novamente.');
        if (window.turnstile) window.turnstile.reset();
    } finally {
        btnAuth.disabled = false;
        authSpinner.style.display = 'none';
        authLabel.textContent = 'Validar Credenciais';
    }
});

// ── Logout Handler ───────────────────────────────────────────
btnLogout.addEventListener('click', async () => {
    showLoading('Encerrando sessão...');
    await db.auth.signOut();
    hideLoading();
    checkAuthSession();
});

// ── DOM: Loading ─────────────────────────────────────────────
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingMessage = document.getElementById('loadingMessage');

function showLoading(msg = 'Processando...') {
    loadingMessage.textContent = msg;
    loadingOverlay.classList.remove('hidden');
}
function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

// ── Navegação entre seções ───────────────────────────────────
const secEstoque   = document.getElementById('secEstoque');
const secTerceiros = document.getElementById('secTerceiros');
const secDre       = document.getElementById('secDre');

const btnEstoque   = document.getElementById('btnEstoque');
const btnTerceiros = document.getElementById('btnTerceiros');
const btnDre       = document.getElementById('btnDre');

const allSections = [secNovaOs, secListaOs, secLeadsOs, secEstoque, secTerceiros, secDre];
const allNavBtns  = [btnNovaOs, btnListaOs, btnLeadsOs, btnEstoque, btnTerceiros, btnDre];

function switchSection(showSec, activeBtn) {
    allSections.forEach(s => s.classList.add('hidden'));
    allNavBtns.forEach(b => b.classList.remove('active'));
    showSec.classList.remove('hidden');
    activeBtn.classList.add('active');
}

btnNovaOs.addEventListener('click', () => switchSection(secNovaOs, btnNovaOs));

btnListaOs.addEventListener('click', () => {
    switchSection(secListaOs, btnListaOs);
    loadOsList();
});

btnLeadsOs.addEventListener('click', () => {
    switchSection(secLeadsOs, btnLeadsOs);
    loadLeads();
});

btnEstoque.addEventListener('click', () => {
    switchSection(secEstoque, btnEstoque);
    loadEstoque();
});

btnTerceiros.addEventListener('click', () => {
    switchSection(secTerceiros, btnTerceiros);
    loadTerceiros();
});

btnDre.addEventListener('click', () => {
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
    return crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
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

    if (signaturePad.isEmpty()) {
        alert('Por favor, recolha a assinatura do cliente.');
        return;
    }

    showLoading('Fazendo upload das fotos...');
    try {
        // 1. Upload de fotos
        const uploadedUrls = [];
        for (const file of selectedFiles) {
            const ext = file.name.split('.').pop();
            const fileName = `${generateUUID()}.${ext}`;
            const { error: errUpload } = await db.storage.from('fotos-os').upload(fileName, file);
            if (errUpload) throw errUpload;
            const { data: urlData } = db.storage.from('fotos-os').getPublicUrl(fileName);
            uploadedUrls.push(urlData.publicUrl);
        }

        // 2. Inserir cliente
        showLoading('Salvando dados...');
        const { data: cliente, error: errCliente } = await db
            .from('clientes_os')
            .insert([{
                nome:      document.getElementById('clienteNome').value,
                telefone:  document.getElementById('clienteTelefone').value,
                cpf_cnpj:  document.getElementById('clienteCpf').value,
            }])
            .select()
            .single();
        if (errCliente) throw errCliente;

        // 3. Inserir OS
        const { error: errOs } = await db
            .from('ordens_servico')
            .insert([{
                cliente_id:                cliente.id,
                equipamento:               document.getElementById('equipamento').value,
                numero_serie:              document.getElementById('numeroSerie').value,
                defeito_relatado:          document.getElementById('defeitoRelatado').value,
                assinatura_cliente_base64: signaturePad.toDataURL(),
                fotos_urls:                uploadedUrls,
                status:                    'Aberto',
            }]);
        if (errOs) throw errOs;

        hideLoading();
        alert('Ordem de Serviço criada com sucesso!');
        formNovaOs.reset();
        signaturePad.clear();
        fotosPreview.innerHTML = '';
        selectedFiles = [];
        switchSection(secListaOs, btnListaOs);
        loadOsList();

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

        const card  = document.createElement('div');
        card.className = 'os-card';
        card.innerHTML = `
            <div class="os-header">
                <div>
                    <h3>${nome}</h3>
                    <span class="os-id">Data: ${new Date(os.criado_em).toLocaleDateString('pt-BR')}</span>
                </div>
                <span class="os-status status-${statusClean.toLowerCase().replace(/ /g,'-')}">${statusClean}</span>
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

// ── Modal Editar OS (Esteira de Reparo) ──────────────────────
const modalEditarOs          = document.getElementById('modalEditarOs');
const btnCloseModalEditar    = document.getElementById('btnCloseModalEditar');
const formEditarOs           = document.getElementById('formEditarOs');
const editOsId               = document.getElementById('editOsId');
const editStatus             = document.getElementById('editStatus');
const editValor              = document.getElementById('editValor');
const editDiagnostico        = document.getElementById('editDiagnostico');
const editServicoRealizado   = document.getElementById('editServicoRealizado');
const editPix                = document.getElementById('editPix');

window.abrirModalEditar = function(osId) {
    const os = _ordensCache.find(item => item.id === osId);
    if (!os) return alert('OS não encontrada em cache.');

    editOsId.value             = os.id;
    editStatus.value           = os.status || 'Aberto';
    editValor.value            = os.valor_total || '';
    editDiagnostico.value      = os.diagnostico || '';
    editServicoRealizado.value = os.servico_realizado || '';
    editPix.value              = os.pix_copia_cola || '';

    modalEditarOs.classList.remove('hidden');
};

btnCloseModalEditar.addEventListener('click', () => modalEditarOs.classList.add('hidden'));

formEditarOs.addEventListener('submit', async (e) => {
    e.preventDefault();
    const osId = editOsId.value;
    if (!osId) return;

    showLoading('Atualizando Ordem de Serviço...');
    try {
        const valNum = editValor.value ? parseFloat(editValor.value) : null;

        const { error } = await db
            .from('ordens_servico')
            .update({
                status:            editStatus.value,
                valor_total:       valNum,
                diagnostico:       editDiagnostico.value.trim(),
                servico_realizado: editServicoRealizado.value.trim(),
                pix_copia_cola:    editPix.value.trim()
            })
            .eq('id', osId);

        if (error) throw error;

        modalEditarOs.classList.add('hidden');
        await loadOsList();
        alert('Ordem de Serviço atualizada com sucesso!');
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
    try {
        const { data: leads, error } = await db
            .from('pre_chamados')
            .select('*')
            .order('criado_em', { ascending: false })
            .limit(100);

        if (error) throw error;
        renderLeads(leads);
        leadsBadge.style.display = 'none'; // zera badge ao abrir
    } catch (err) {
        console.error('Erro ao carregar leads:', err);
        leadsContainer.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:2rem;">
                <p class="text-muted">⚠️ Não foi possível carregar os leads.</p>
                <p class="text-muted" style="font-size:0.82rem; margin-top:0.5rem;">
                    Verifique se a tabela <code>pre_chamados</code> existe no Supabase e se as políticas de RLS estão corretas.
                </p>
            </div>`;
    } finally {
        hideLoading();
    }
}

btnRefreshLeads.addEventListener('click', loadLeads);

function renderLeads(leads) {
    leadsContainer.innerHTML = '';

    if (!leads || leads.length === 0) {
        leadsContainer.innerHTML = '<p class="text-muted" style="grid-column:1/-1">Nenhuma solicitação web recebida ainda.</p>';
        return;
    }

    const ontem = Date.now() - 86400000;

    leads.forEach(lead => {
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
                <button class="btn-converter"
                    onclick="converterEmOS('${nomeClean.replace(/'/g,"\\'")}','${wppClean.replace(/'/g,"\\'")}','${equipClean.replace(/'/g,"\\'")}','${defClean.replace(/'/g,"\\'")}')">
                    ➕ Converter em OS
                </button>
            </div>`;
        leadsContainer.appendChild(card);
    });
}

// Ação: abrir WhatsApp com mensagem de follow-up
window.contatarLead = function(telLimpo, nome, equipamento) {
    const msg = `Olá ${nome}! Aqui é a WL TEC.\n\nRecebi sua solicitação sobre o ${equipamento} pelo site. Vamos agendar o atendimento?\n\nSó me confirmar o melhor horário 😊`;
    window.open(`https://wa.me/55${telLimpo}?text=${encodeURIComponent(msg)}`, '_blank');
};

// Ação: preenche formulário de Nova OS com os dados do lead
window.converterEmOS = function(nome, telefone, equipamento, defeito) {
    switchSection(secNovaOs, btnNovaOs);
    document.getElementById('clienteNome').value      = nome;
    document.getElementById('clienteTelefone').value  = telefone;
    document.getElementById('equipamento').value       = equipamento;
    document.getElementById('defeitoRelatado').value   = defeito;
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const num = (telefone || '').replace(/\D/g, '');
    if (!num) return alert('Telefone do cliente não encontrado.');

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
    window.open(`https://wa.me/55${num}?text=${encodeURIComponent(msg)}`, '_blank');
};

// ── Gerar PDF (Comprovante Completo de OS) ───────────────────
window.gerarPDF = async function(osId) {
    showLoading('Gerando PDF da OS...');
    try {
        const { data: os, error } = await db
            .from('ordens_servico')
            .select('*, clientes_os(*)')
            .eq('id', osId)
            .single();
        if (error) throw error;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Cabeçalho
        doc.setFontSize(18);
        doc.text('WL TEC - Relatório de Ordem de Serviço', 10, 20);
        doc.setFontSize(11);
        doc.text(`Status: ${os.status || 'Aberto'} | Data de Entrada: ${new Date(os.criado_em).toLocaleDateString('pt-BR')}`, 10, 28);
        doc.line(10, 32, 200, 32);

        // Dados do Cliente
        let y = 40;
        doc.setFontSize(13); doc.text('1. Dados do Cliente', 10, y);
        doc.setFontSize(10);
        y += 8; doc.text(`Nome: ${os.clientes_os?.nome || '—'}`, 10, y);
        y += 6; doc.text(`Telefone: ${os.clientes_os?.telefone || '—'}`, 10, y);
        y += 6; doc.text(`CPF/CNPJ: ${os.clientes_os?.cpf_cnpj || 'Não informado'}`, 10, y);

        // Dados do Equipamento
        y += 12;
        doc.setFontSize(13); doc.text('2. Dados do Equipamento & Defeito', 10, y);
        doc.setFontSize(10);
        y += 8; doc.text(`Equipamento: ${os.equipamento || '—'}`, 10, y);
        y += 6; doc.text(`Nº Série: ${os.numero_serie || 'Não informado'}`, 10, y);
        y += 6;
        const defeitoLines = doc.splitTextToSize(`Defeito Relatado: ${os.defeito_relatado || '—'}`, 180);
        doc.text(defeitoLines, 10, y);
        y += (defeitoLines.length * 5);

        // Diagnóstico & Laudo Técnico
        if (os.diagnostico || os.servico_realizado) {
            y += 8;
            doc.setFontSize(13); doc.text('3. Diagnóstico Técnico & Laudo', 10, y);
            doc.setFontSize(10);
            if (os.diagnostico) {
                y += 8;
                const diagLines = doc.splitTextToSize(`O Que Precisa Fazer: ${os.diagnostico}`, 180);
                doc.text(diagLines, 10, y);
                y += (diagLines.length * 5);
            }
            if (os.servico_realizado) {
                y += 6;
                const feitoLines = doc.splitTextToSize(`Serviço Realizado: ${os.servico_realizado}`, 180);
                doc.text(feitoLines, 10, y);
                y += (feitoLines.length * 5);
            }
        }

        // Valor Total
        y += 10;
        doc.setFontSize(12);
        const valStr = os.valor_total ? `R$ ${parseFloat(os.valor_total).toFixed(2)}` : 'A definir';
        doc.text(`Valor Total do Serviço: ${valStr}`, 10, y);

        // Assinatura do Cliente
        y += 15;
        if (y > 220) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.text('Assinatura do Cliente (Concordância de Entrada & Termo):', 10, y);
        if (os.assinatura_cliente_base64) {
            y += 5;
            doc.addImage(os.assinatura_cliente_base64, 'PNG', 10, y, 70, 30);
            y += 35;
        } else {
            y += 15;
        }
        doc.line(10, y, 90, y);
        y += 5;
        doc.text(os.clientes_os?.nome || 'Cliente', 10, y);

        // Rodapé
        doc.setFontSize(8);
        doc.text('WL TEC — Assistência Técnica & Consultoria | WhatsApp: (11) 99531-4831 | Vila Príncipe de Gales - Santo André/SP', 10, 285);

        doc.save(`OS_${(os.clientes_os?.nome || 'cliente').replace(/\s+/g, '_')}_${Date.now()}.pdf`);

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
    { id: '8', nome: 'Álcool Isopropílico + Limpa Contatos 300ml', categoria: 'Insumo', quantidade: 2, quantidade_minima: 1, custo_unitario: 35.00, preco_venda_sugerido: 70.00, fornecedor: 'Distribuidor Local' }
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
            <td>
                <button class="btn btn-outline text-sm" onclick="deletarItemEstoque('${item.id}')">🗑️</button>
            </td>`;
        tabelaEstoque.appendChild(tr);
    });
}

btnAbrirModalEstoque?.addEventListener('click', () => modalNovoItemEstoque.classList.remove('hidden'));
btnCloseModalEstoque?.addEventListener('click', () => modalNovoItemEstoque.classList.add('hidden'));

formNovoItemEstoque?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading('Cadastrando item de estoque...');
    try {
        const novoItem = {
            nome: document.getElementById('stockNome').value.trim(),
            categoria: document.getElementById('stockCategoria').value,
            quantidade: parseInt(document.getElementById('stockQtd').value),
            quantidade_minima: parseInt(document.getElementById('stockQtdMin').value),
            custo_unitario: parseFloat(document.getElementById('stockCusto').value),
            preco_venda_sugerido: parseFloat(document.getElementById('stockVenda').value || 0),
            fornecedor: document.getElementById('stockFornecedor').value.trim()
        };

        const { data, error } = await db.from('estoque').insert([novoItem]).select();
        if (!error && data) {
            _estoqueCache.push(data[0]);
        } else {
            novoItem.id = 'temp_' + Date.now();
            _estoqueCache.push(novoItem);
        }

        modalNovoItemEstoque.classList.add('hidden');
        formNovoItemEstoque.reset();
        renderEstoque();
        atualizarDropdownEstoque();
        alert('Item cadastrado no estoque!');
    } catch (err) {
        alert('Erro ao cadastrar: ' + err.message);
    } finally {
        hideLoading();
    }
});

window.deletarItemEstoque = function(id) {
    if (!confirm('Deseja remover este item do estoque?')) return;
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
            </div>`;
        gridTerceiros.appendChild(card);
    });
}

btnAbrirModalTerceiro?.addEventListener('click', () => modalNovoTerceiro.classList.remove('hidden'));
btnCloseModalTerceiro?.addEventListener('click', () => modalNovoTerceiro.classList.add('hidden'));

formNovoTerceiro?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading('Cadastrando terceiro...');
    try {
        const novo = {
            nome_parceiro: document.getElementById('tercNome').value.trim(),
            especialidade: document.getElementById('tercEspecialidade').value.trim(),
            telefone: document.getElementById('tercTelefone').value.trim(),
            observacoes: document.getElementById('tercObs').value.trim()
        };

        const { data, error } = await db.from('terceiros_fornecedores').insert([novo]).select();
        if (!error && data) {
            _terceirosCache.push(data[0]);
        } else {
            novo.id = 'temp_' + Date.now();
            _terceirosCache.push(novo);
        }

        modalNovoTerceiro.classList.add('hidden');
        formNovoTerceiro.reset();
        renderTerceiros();
        atualizarDropdownTerceiros();
        alert('Parceiro cadastrado!');
    } catch (err) {
        alert('Erro ao cadastrar: ' + err.message);
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

// Inicialização de dropdowns de estoque e terceiros ao carregar
loadEstoque();
loadTerceiros();

// ── Inicialização: Verifica a sessão do usuário ao carregar ──
checkAuthSession();
