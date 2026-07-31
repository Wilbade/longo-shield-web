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

// ── DOM: Navegação ───────────────────────────────────────────
const btnNovaOs   = document.getElementById('btnNovaOs');
const btnListaOs  = document.getElementById('btnListaOs');
const btnLeadsOs  = document.getElementById('btnLeadsOs');

const secNovaOs   = document.getElementById('secNovaOs');
const secListaOs  = document.getElementById('secListaOs');
const secLeadsOs  = document.getElementById('secLeadsOs');

const leadsBadge  = document.getElementById('leadsBadge');

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
const allSections = [secNovaOs, secListaOs, secLeadsOs];
const allNavBtns  = [btnNovaOs, btnListaOs, btnLeadsOs];

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

// ── Upload de Fotos ──────────────────────────────────────────
const fotosUpload  = document.getElementById('fotosUpload');
const fotosPreview = document.getElementById('fotosPreview');
let selectedFiles  = [];

fotosUpload.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(file => {
        selectedFiles.push(file);
        const reader = new FileReader();
        reader.onload = ev => {
            const img = document.createElement('img');
            img.src = ev.target.result;
            img.className = 'foto-preview';
            fotosPreview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
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

async function loadOsList() {
    showLoading('Carregando OS...');
    try {
        let query = db
            .from('ordens_servico')
            .select('*, clientes_os(nome, telefone)')
            .order('criado_em', { ascending: false });

        const f = filterStatus.value;
        if (f !== 'Todos') query = query.eq('status', f);

        const { data: ordens, error } = await query;
        if (error) throw error;
        renderOsList(ordens);
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
        const nome  = os.clientes_os?.nome || 'Cliente Desconhecido';
        const tel   = os.clientes_os?.telefone || '';
        const card  = document.createElement('div');
        card.className = 'os-card';
        card.innerHTML = `
            <div class="os-header">
                <div>
                    <h3>${nome}</h3>
                    <span class="os-id">Data: ${new Date(os.criado_em).toLocaleDateString('pt-BR')}</span>
                </div>
                <span class="os-status status-${os.status.toLowerCase().replace(/ /g,'-')}">${os.status}</span>
            </div>
            <div class="os-body">
                <p><strong>Equip:</strong> ${os.equipamento}</p>
                <p><strong>Defeito:</strong> ${os.defeito_relatado}</p>
                <p><strong>Valor:</strong> R$ ${os.valor_total ? os.valor_total.toFixed(2) : 'A definir'}</p>
            </div>
            <div class="os-actions">
                <button class="btn btn-secondary btn-action" onclick="gerarPDF('${os.id}')">Gerar PDF</button>
                <button class="btn btn-primary btn-action" onclick="enviarWhatsApp('${tel}','${nome}','${os.equipamento}',${os.valor_total||0},'${os.pix_copia_cola||''}')">WhatsApp + PIX</button>
                ${os.fotos_urls?.length ? `<button class="btn btn-outline btn-action" onclick='verFotos(${JSON.stringify(os.fotos_urls)})'>Ver Fotos</button>` : ''}
            </div>`;
        osListContainer.appendChild(card);
    });
}

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

    // Determina quais são "novos" (últimas 24h) para exibir o ponto laranja
    const ontem = Date.now() - 86400000;

    leads.forEach(lead => {
        const isNovo   = new Date(lead.criado_em).getTime() > ontem;
        const levaTraz = lead.leva_e_traz;

        // Monta endereço completo se existir
        const endParts = [lead.logradouro, lead.numero, lead.complemento, lead.bairro_cidade, lead.cep ? `CEP: ${lead.cep}` : ''].filter(Boolean);
        const endStr   = endParts.join(', ');

        const card = document.createElement('div');
        card.className = `lead-card${levaTraz ? ' lead-leva-traz' : ''}`;
        card.innerHTML = `
            ${isNovo ? '<div class="lead-new-dot" title="Novo nas últimas 24h"></div>' : ''}
            <div class="lead-header">
                <div>
                    <div class="lead-name">${lead.nome_cliente || '—'}</div>
                    <div class="lead-date">${formatDate(lead.criado_em)}</div>
                </div>
                <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
                    <span class="lead-pill">📱 ${lead.whatsapp || '—'}</span>
                    ${levaTraz ? '<span class="lead-pill leva">🚗 Leva &amp; Traz</span>' : ''}
                </div>
            </div>
            <div class="lead-body">
                <p><strong>Equipamento:</strong> ${lead.equipamento || '—'}</p>
                <p><strong>Defeito:</strong> ${lead.defeito_relatado || '—'}</p>
                ${endStr ? `<div class="lead-address">📍 ${endStr}</div>` : ''}
            </div>
            <div class="lead-actions">
                <button class="btn-wpp"
                    onclick="contatarLead('${(lead.whatsapp||'').replace(/\D/g,'')}','${(lead.nome_cliente||'').replace(/'/g,"\\'")}','${(lead.equipamento||'').replace(/'/g,"\\'")}')">
                    💬 Chamar no WhatsApp
                </button>
                <button class="btn-converter"
                    onclick="converterEmOS('${lead.nome_cliente||''}','${lead.whatsapp||''}','${lead.equipamento||''}','${lead.defeito_relatado||''}')">
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
window.enviarWhatsApp = function(telefone, cliente, equip, valor, pix) {
    const num = telefone.replace(/\D/g, '');
    let msg = `Olá ${cliente}!\nSomos da WL TEC.\n\nSeu equipamento: *${equip}*\n`;
    if (valor > 0) {
        msg += `O valor do serviço ficou em *R$ ${parseFloat(valor).toFixed(2)}*.\n\n`;
        if (pix) msg += `PIX Copia e Cola:\n${pix}\n\n`;
    } else {
        msg += `Seu equipamento está em análise. Em breve enviaremos o orçamento.\n\n`;
    }
    msg += `Qualquer dúvida, estamos à disposição!`;
    window.open(`https://wa.me/55${num}?text=${encodeURIComponent(msg)}`, '_blank');
};

// ── Gerar PDF ────────────────────────────────────────────────
window.gerarPDF = async function(osId) {
    showLoading('Gerando PDF...');
    try {
        const { data: os, error } = await db
            .from('ordens_servico')
            .select('*, clientes_os(*)')
            .eq('id', osId)
            .single();
        if (error) throw error;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text('WL TEC - Comprovante de Entrada', 10, 20);
        doc.setFontSize(12);
        doc.text(`Data: ${new Date(os.criado_em).toLocaleDateString('pt-BR')}`, 10, 30);

        doc.setFontSize(14); doc.text('Dados do Cliente:', 10, 45);
        doc.setFontSize(12);
        doc.text(`Nome: ${os.clientes_os.nome}`, 10, 55);
        doc.text(`Telefone: ${os.clientes_os.telefone}`, 10, 65);
        doc.text(`CPF/CNPJ: ${os.clientes_os.cpf_cnpj || 'Não informado'}`, 10, 75);

        doc.setFontSize(14); doc.text('Dados do Equipamento:', 10, 90);
        doc.setFontSize(12);
        doc.text(`Equipamento: ${os.equipamento}`, 10, 100);
        doc.text(`Nº Série: ${os.numero_serie || 'Não informado'}`, 10, 110);
        doc.text(doc.splitTextToSize(`Defeito: ${os.defeito_relatado}`, 180), 10, 120);

        doc.text('Assinatura do Cliente:', 10, 160);
        if (os.assinatura_cliente_base64) {
            doc.addImage(os.assinatura_cliente_base64, 'PNG', 10, 170, 80, 40);
        }
        doc.line(10, 210, 90, 210);
        doc.save(`OS_${os.clientes_os.nome}_${Date.now()}.pdf`);

    } catch (err) {
        console.error('Erro PDF:', err);
        alert('Erro ao gerar PDF. Verifique o console (F12).');
    } finally {
        hideLoading();
    }
};

// ── Inicialização: conta leads novos ao carregar ─────────────
contarLeadsNovos();
