// js/admin.js - VERSÃO OTIMIZADA FASE 2

// 1. ESTADO GLOBAL
let estado = { 
    projetos: [], 
    receber: [], 
    pagar: [], 
    fornecedores: [], 
    leads: [] 
};
let projetoUploadId = null;

// 2. AUTENTICAÇÃO
async function checarSessao() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        document.getElementById('app-content').classList.add('flex');
        carregarTudo();
    } else {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app-content').classList.add('hidden');
    }
}

async function fazerLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const btn = document.getElementById('btn-login');
    const txtOriginal = btn.innerText;
    btn.innerText = 'ENTRANDO...'; btn.disabled = true;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        document.getElementById('error-msg').innerText = "Credenciais inválidas.";
        document.getElementById('error-msg').classList.remove('hidden');
        btn.innerText = txtOriginal; btn.disabled = false;
    } else {
        location.reload();
    }
}

async function fazerLogout() {
    await supabaseClient.auth.signOut();
    location.reload();
}

document.addEventListener('DOMContentLoaded', () => { checarSessao(); });

// 3. NAVEGAÇÃO
function mudarAba(aba) {
    ['comercial', 'producao', 'financeiro'].forEach(nome => {
        document.getElementById('view-' + nome).classList.add('hidden');
        document.getElementById('tab-' + nome).className = "px-4 py-1.5 rounded font-bold text-xs uppercase hover:bg-gray-200 text-gray-600 transition-all";
    });
    document.getElementById('view-' + aba).classList.remove('hidden');
    document.getElementById('tab-' + aba).className = "px-4 py-1.5 rounded font-bold text-xs uppercase bg-modelo-bordo text-white shadow transition-all";
}

// 4. CARREGAMENTO (Com Tratamento de Erro Melhorado)
async function carregarTudo() {
    try {
        const [resProj, resRec, resPag, resForn, resLeads] = await Promise.all([
            supabaseClient.from('projects').select('*, clients(full_name, cpf, whatsapp), project_steps(*)').order('created_at', {ascending: false}),
            supabaseClient.from('contas_receber').select('*, projects(title, clients(full_name))').order('data_vencimento'),
            supabaseClient.from('contas_pagar').select('*, fornecedores(nome_empresa)').order('data_vencimento'),
            supabaseClient.from('fornecedores').select('*').order('nome_empresa'),
            supabaseClient.from('leads').select('*').neq('status', 'Arquivado').order('created_at', {ascending: false})
        ]);

        estado.projetos = resProj.data || [];
        estado.receber = resRec.data || [];
        estado.pagar = resPag.data || [];
        estado.fornecedores = resForn.data || [];
        estado.leads = resLeads.data || [];

        renderProjetos();
        renderFinanceiro();
        renderComercial();

    } catch (err) { 
        console.error(err); 
        Utils.notify.error('Erro de conexão com o banco de dados.'); 
    }
}

// 5. RENDERIZAÇÃO COMERCIAL (COM PDF)
function renderComercial() {
    const container = document.getElementById('lista-leads');
    if (!container) return;
    
    if(!estado.leads.length) {
        container.innerHTML = '';
        return document.getElementById('empty-leads').classList.remove('hidden');
    }
    document.getElementById('empty-leads').classList.add('hidden');

    // Otimização: Criar string única
    const html = estado.leads.map(lead => {
        const isNovo = lead.status === 'Novo';
        const borderClass = isNovo ? 'border-l-4 border-green-500' : 'border-l-4 border-gray-300';
        const badge = isNovo ? '<span class="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase ml-2">Novo</span>' : '';

        return `
            <div class="bg-white p-5 rounded shadow hover:shadow-md transition-shadow ${borderClass}">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-gray-800 text-lg">${lead.nome} ${badge}</h3>
                    <button onclick="arquivarLead('${lead.id}')" class="text-gray-300 hover:text-red-500 transition-colors" title="Arquivar"><i class="fa-solid fa-times"></i></button>
                </div>
                <p class="text-xs text-modelo-bordo font-bold uppercase mb-2"><i class="fa-solid fa-layer-group mr-1"></i> ${lead.ambiente || 'Geral'}</p>
                <div class="bg-gray-50 p-3 rounded text-sm text-gray-600 mb-4 italic border border-gray-100">"${lead.mensagem || 'Sem mensagem.'}"</div>

                <div class="grid grid-cols-3 gap-2">
                    <button onclick="chamarZap('${lead.whatsapp}', '${lead.nome}')" class="bg-green-500 text-white py-2 rounded text-xs font-bold hover:bg-green-600 transition flex items-center justify-center gap-1" title="WhatsApp">
                        <i class="fa-brands fa-whatsapp text-lg"></i>
                    </button>
                    
                    <button onclick="gerarPropostaPDF('${lead.nome}', '${lead.ambiente}')" class="bg-blue-600 text-white py-2 rounded text-xs font-bold hover:bg-blue-700 transition flex items-center justify-center gap-1" title="Gerar Proposta PDF">
                        <i class="fa-solid fa-file-pdf text-lg"></i>
                    </button>

                    <button onclick="converterLead('${lead.id}', '${lead.nome}', '${lead.whatsapp}')" class="bg-nec-dark text-white py-2 rounded text-xs font-bold hover:bg-nec-gold hover:text-nec-dark transition flex items-center justify-center gap-1" title="Virar Contrato">
                        <i class="fa-solid fa-file-signature text-lg"></i>
                    </button>
                </div>
                <p class="text-[10px] text-gray-400 mt-2 text-center">Recebido: ${Utils.formatData(lead.created_at)}</p>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// --- FUNÇÃO MÁGICA: GERAR PDF PROPOSTA ---
async function gerarPropostaPDF(nomeCliente, ambiente) {
    const { value: valor } = await Swal.fire({
        title: 'Gerar Proposta',
        input: 'text',
        inputLabel: 'Valor Estimado do Projeto (R$)',
        inputPlaceholder: 'Ex: 15.000,00',
        showCancelButton: true,
        confirmButtonColor: '#800000',
        confirmButtonText: 'Gerar PDF'
    });

    if (!valor) return; 

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFillColor(128, 0, 0); 
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(197, 160, 89); 
    doc.setFontSize(22);
    doc.setFont("times", "bold");
    doc.text("MARCENARIA MODELO", 105, 20, null, null, "center");
    
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.text("Excelência em Planejados", 105, 28, null, null, "center");

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text("PROPOSTA COMERCIAL", 105, 60, null, null, "center");

    doc.setFontSize(12);
    doc.text(`Cliente: ${nomeCliente}`, 20, 80);
    doc.text(`Ambiente: ${ambiente || 'Projeto Personalizado'}`, 20, 90);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 100);

    doc.setFillColor(245, 245, 245);
    doc.rect(20, 115, 170, 30, 'F');
    doc.setFontSize(14);
    doc.setTextColor(128, 0, 0); 
    doc.text(`Investimento Estimado: R$ ${valor}`, 105, 135, null, null, "center");

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(10);
    doc.text("Condições Gerais:", 20, 160);
    doc.text("1. Validade da proposta: 10 dias úteis.", 20, 170);
    doc.text("2. Prazo de entrega: A definir em contrato (aprox. 45 dias).", 20, 176);
    doc.text("3. Materiais: 100% MDF com ferragens de amortecimento.", 20, 182);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Marcenaria Modelo - Parque Industrial 2, Andradina/SP", 105, 280, null, null, "center");
    doc.text("Tel: (18) 99777-7079", 105, 285, null, null, "center");

    doc.save(`Proposta_${nomeCliente.replace(/ /g, '_')}.pdf`);
    
    Utils.notify.success('Sucesso', 'Proposta gerada! Envie para o cliente.');
}

// --- RESTO DAS FUNÇÕES ---
function chamarZap(tel, nome) {
    if(!tel) return Utils.notify.error("Telefone não cadastrado.");
    const phone = tel.replace(/\D/g, ''); 
    const text = `Olá ${nome}, tudo bem? Sou da Marcenaria Modelo. Segue sua proposta comercial...`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`, '_blank');
}

async function arquivarLead(id) {
    if((await Utils.notify.confirm('Arquivar?', 'O lead sairá da lista.')).isConfirmed) {
        await supabaseClient.from('leads').update({status: 'Arquivado'}).eq('id', id);
        carregarTudo();
    }
}

function converterLead(id, nome, zap) {
    document.getElementById('proj-nome').value = nome;
    document.getElementById('proj-whatsapp').value = zap;
    document.getElementById('modal-projeto').showModal();
}

// --- PRODUÇÃO ---
function renderProjetos() {
    const tbody = document.getElementById('lista-projetos'); 
    
    if(!estado.projetos.length) {
        tbody.innerHTML = '';
        return document.getElementById('empty-projetos').classList.remove('hidden');
    }
    document.getElementById('empty-projetos').classList.add('hidden');

    const html = estado.projetos.map(p => {
        const steps = p.project_steps ? p.project_steps.sort((a,b) => a.display_order - b.display_order) : [];
        const pct = steps.length ? Math.round((steps.filter(s=>s.is_completed).length / steps.length)*100) : 0;
        const imgClass = p.render_url ? 'text-nec-gold border-nec-gold bg-yellow-50' : 'text-gray-300 border-dashed hover:text-nec-gold';
        
        let timeline = '<div class="flex gap-1">';
        steps.forEach(s => {
            let cor = s.is_completed ? 'bg-nec-gold text-white border-nec-gold' : 'bg-white text-gray-300 border-gray-300';
            let icon = s.is_completed ? '<i class="fa-solid fa-check"></i>' : s.display_order;
            timeline += `<div onclick="toggleStep('${s.id}', ${!s.is_completed}, '${(p.clients?.full_name||'').replace(/'/g, "")}', '${(p.title||'').replace(/'/g, "")}', '${s.step_name}', '${p.clients?.whatsapp}')" class="cursor-pointer w-6 h-6 rounded-full border flex items-center justify-center text-[10px] hover:scale-110 transition ${cor}" title="${s.step_name}">${icon}</div>`;
        });
        timeline += `</div><div class="text-[10px] text-gray-400 mt-1">${pct}% Pronto</div>`;
        
        return `<tr class="hover:bg-gray-50 border-b"><td class="p-4 font-mono font-bold text-gray-500">${p.clients?.cpf || '-'}</td><td class="p-4"><div class="flex gap-3 items-center"><button onclick="triggerUpload('${p.id}')" class="w-10 h-10 rounded border flex items-center justify-center transition ${imgClass}"><i class="fa-solid fa-image"></i></button><div><div class="font-bold text-gray-800">${p.clients?.full_name || 'Desconhecido'}</div><div class="text-xs text-nec-gold uppercase">${p.title}</div></div></div></td><td class="p-4">${timeline}</td><td class="p-4 text-center"><span class="px-2 py-1 rounded text-[10px] font-bold ${pct===100?'bg-green-100 text-green-700':'bg-blue-50 text-blue-700'}">${pct===100?'ENTREGUE':'EM PRODUÇÃO'}</span></td><td class="p-4 text-right space-x-2 flex justify-end"><button onclick="apagarProjeto('${p.id}')" class="text-gray-300 hover:text-gray-500 w-8 h-8 transition-colors"><i class="fa-solid fa-trash"></i></button></td></tr>`;
    }).join('');

    tbody.innerHTML = html;
}

// --- FUNÇÕES CRUD E AÇÕES ---
async function salvarProjeto(e) { 
    e.preventDefault(); 
    const nome=document.getElementById('proj-nome').value, cpf=document.getElementById('proj-cpf').value, whatsapp=document.getElementById('proj-whatsapp').value, tit=document.getElementById('proj-titulo').value, pra=document.getElementById('proj-prazo').value; 
    
    Utils.notify.loading('Criando contrato...'); 
    try { 
        // Verifica se cliente já existe pelo CPF para não duplicar (Simulação simples)
        // OBS: Ideal seria usar "upsert", mas faremos insert normal para simplificar Fase 1
        let clienteId;
        const { data: clienteExistente } = await supabaseClient.from('clients').select('id').eq('cpf', cpf).single();

        if (clienteExistente) {
             clienteId = clienteExistente.id;
        } else {
             let c = await supabaseClient.from('clients').insert([{full_name:nome, cpf, whatsapp}]).select().single(); 
             if(c.error) throw c.error; 
             clienteId = c.data.id;
        }

        let p = await supabaseClient.from('projects').insert([{client_id:clienteId, title:tit, delivery_date:pra, status:'producao'}]).select().single(); 
        
        await supabaseClient.from('project_steps').insert([
            {project_id:p.data.id, step_name:'Projeto', display_order:1, is_completed:true, completed_at:new Date()},
            {project_id:p.data.id, step_name:'Corte', display_order:2},
            {project_id:p.data.id, step_name:'Pintura', display_order:3},
            {project_id:p.data.id, step_name:'Montagem', display_order:4}
        ]); 
        
        document.getElementById('modal-projeto').close(); 
        e.target.reset(); // Limpa formulário
        Utils.notify.success('Sucesso', 'Contrato criado!'); 
        carregarTudo(); 
    } catch(err){ 
        console.error(err);
        Utils.notify.error('Erro ao criar contrato. Verifique os dados.'); 
    } 
}

async function toggleStep(idStep, novoStatus, nomeCliente, nomeProjeto, nomeEtapa, zapCliente) { 
    try { 
        await supabaseClient.from('project_steps').update({is_completed: novoStatus}).eq('id', idStep); 
        if(novoStatus === true) { 
            const result = await Utils.notify.confirm('Etapa Concluída!', `Deseja avisar ${nomeCliente} no WhatsApp?`, 'Sim, Avisar'); 
            if (result.isConfirmed) { 
                const msg = `Olá ${nomeCliente}! \n\nAtualização do seu projeto *${nomeProjeto}*:\n\nA etapa *${nomeEtapa}* foi concluída com sucesso! ✅\n\nAcompanhe aqui: https://necplanejados.vercel.app/tracker`; 
                const link = `https://wa.me/${zapCliente}?text=${encodeURIComponent(msg)}`; 
                window.open(link, '_blank'); 
            } 
        } 
        carregarTudo(); 
    } catch (error) { 
        Utils.notify.error('Erro ao atualizar etapa.'); 
    } 
}

async function apagarProjeto(id){ 
    const result = await Utils.notify.confirm('Apagar Contrato?', 'Isso apagará todo o histórico e financeiro do projeto.'); 
    if(result.isConfirmed){ 
        await supabaseClient.from('projects').delete().eq('id',id); 
        carregarTudo(); 
    } 
}

function triggerUpload(id){projetoUploadId=id;document.getElementById('input-upload').click();}
document.getElementById('input-upload').addEventListener('change',async(e)=>{ const f=e.target.files[0];if(!f)return; Utils.notify.loading('Enviando imagem...'); const n=`render-${projetoUploadId}-${Date.now()}.jpg`; const { error } = await supabaseClient.storage.from('nec-arquivos').upload(n,f); if(error) { Utils.notify.error('Erro no upload.'); return; } const{data:{publicUrl}}=supabaseClient.storage.from('nec-arquivos').getPublicUrl(n); await supabaseClient.from('projects').update({render_url:publicUrl}).eq('id',projetoUploadId); Utils.notify.success('Imagem salva!'); carregarTudo(); });

// --- FINANCEIRO ---
function renderFinanceiro() { 
    const tr = estado.receber.reduce((acc, c) => acc + c.valor, 0); 
    const tp = estado.pagar.reduce((acc, c) => acc + c.valor, 0); 
    
    document.getElementById('kpi-receber').innerText = Utils.formatMoeda(tr); 
    document.getElementById('kpi-pagar').innerText = Utils.formatMoeda(tp); 
    document.getElementById('kpi-saldo').innerText = Utils.formatMoeda(tr - tp); 
    
    const tbRec = document.getElementById('lista-receber'); 
    tbRec.innerHTML = estado.receber.map(r => { 
        const c = r.status==='Pago'?'text-green-600':'text-orange-500'; 
        return `<tr class="hover:bg-gray-50"><td class="p-2 font-mono">${Utils.formatData(r.data_vencimento)}</td><td class="p-2"><div class="font-bold">${r.descricao}</div><div class="text-[10px] text-gray-400">${r.projects?.clients?.full_name||'-'}</div></td><td class="p-2 text-right font-bold">${Utils.formatMoeda(r.valor)}</td><td class="p-2 text-center text-[10px] font-bold uppercase cursor-pointer ${c}" onclick="toggleStatusReceber('${r.id}','${r.status}')">${r.status}</td></tr>`; 
    }).join(''); 
    
    const tbPag = document.getElementById('lista-pagar'); 
    tbPag.innerHTML = estado.pagar.map(p => { 
        const c = p.status==='Pago'?'text-green-600':'text-red-500'; 
        return `<tr class="hover:bg-gray-50"><td class="p-2 font-mono">${Utils.formatData(p.data_vencimento)}</td><td class="p-2"><div class="font-bold">${p.descricao}</div><div class="text-[10px] text-gray-400">${p.fornecedores?.nome_empresa||'-'}</div></td><td class="p-2 text-right font-bold">${Utils.formatMoeda(p.valor)}</td><td class="p-2 text-center text-[10px] font-bold uppercase cursor-pointer ${c}" onclick="toggleStatusPagar('${p.id}','${p.status}')">${p.status}</td></tr>`; 
    }).join(''); 
}

function abrirModalReceita(){
    const s=document.getElementById('rec-projeto');
    s.innerHTML='<option value="">Selecione...</option>' + estado.projetos.map(p=>`<option value="${p.id}">${p.clients?.full_name} - ${p.title}</option>`).join('');
    document.getElementById('modal-receita').showModal();
}

async function salvarReceita(e){
    e.preventDefault();
    await supabaseClient.from('contas_receber').insert([{projeto_id:document.getElementById('rec-projeto').value,descricao:document.getElementById('rec-desc').value,valor:document.getElementById('rec-valor').value,data_vencimento:document.getElementById('rec-data').value}]);
    document.getElementById('modal-receita').close();
    e.target.reset();
    carregarTudo();
}

async function toggleStatusReceber(id,s){
    await supabaseClient.from('contas_receber').update({status:s==='Pendente'?'Pago':'Pendente'}).eq('id',id);
    carregarTudo();
}

function abrirModalDespesa(){
    const s=document.getElementById('pag-fornecedor');
    s.innerHTML='<option value="">Selecione...</option>' + estado.fornecedores.map(f=>`<option value="${f.id}">${f.nome_empresa}</option>`).join('');
    document.getElementById('modal-despesa').showModal();
}

async function salvarDespesa(e){
    e.preventDefault();
    await supabaseClient.from('contas_pagar').insert([{fornecedor_id:document.getElementById('pag-fornecedor').value,descricao:document.getElementById('pag-desc').value,valor:document.getElementById('pag-valor').value,data_vencimento:document.getElementById('pag-data').value}]);
    document.getElementById('modal-despesa').close();
    e.target.reset();
    carregarTudo();
}

async function toggleStatusPagar(id,s){
    await supabaseClient.from('contas_pagar').update({status:s==='Pendente'?'Pago':'Pendente'}).eq('id',id);
    carregarTudo();
}

function abrirModalFornecedor(){document.getElementById('modal-fornecedor').showModal();}
async function salvarFornecedor(e){e.preventDefault();await supabaseClient.from('fornecedores').insert([{nome_empresa:document.getElementById('forn-nome').value,categoria:document.getElementById('forn-cat').value}]);document.getElementById('modal-fornecedor').close();e.target.reset();carregarTudo();}
// js/admin.js

function toggleSenha() {
    const input = document.getElementById('password');
    const icon = document.getElementById('eye-icon');

    if (input.type === "password") {
        input.type = "text"; // Mostra a senha
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash'); // Ícone de "olho cortado"
    } else {
        input.type = "password"; // Esconde a senha
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye'); // Ícone de "olho normal"
    }
}
