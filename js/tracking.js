// js/tracking.js

document.addEventListener('DOMContentLoaded', () => {
    iniciarCarrossel();
});

// --- LÓGICA DE BUSCA (RASTREADOR) ---
async function buscarPedidoReal() {
    const cpfInput = document.getElementById('input-cpf');
    const cpf = cpfInput.value.trim();
    const btn = document.getElementById('btn-buscar');
    const resultDiv = document.getElementById('resultado-rastreio');
    const imgDiv = document.getElementById('imagem-rastreio');

    if (!cpf) {
        return Utils.notify.error('Por favor, digite o CPF.');
    }

    // Efeito de carregamento
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    btn.disabled = true;

    try {
        // 1. Busca Cliente + Projetos + Etapas
        const { data: cliente, error: errCli } = await supabaseClient
            .from('clients')
            .select('*, projects(*, project_steps(*))')
            .eq('cpf', cpf)
            .single();

        if (errCli || !cliente) throw new Error('Cliente não encontrado');

        // 2. Pega o projeto mais recente
        // Ordena por data de criação (do mais novo para o mais velho) e pega o primeiro [0]
        const projeto = cliente.projects.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];

        if (!projeto) throw new Error('Nenhum projeto ativo.');

        // 3. Preencher Dados na Tela
        document.getElementById('cliente-nome').innerText = cliente.full_name;
        document.getElementById('projeto-titulo').innerText = projeto.title;

        // Botão Render 3D (Se tiver link)
        const btnRender = document.getElementById('btn-render');
        if(projeto.render_url) {
            btnRender.href = projeto.render_url;
            btnRender.classList.remove('hidden');
        } else {
            btnRender.classList.add('hidden');
        }

        // 4. Renderizar Timeline (Bolinhas)
        const steps = projeto.project_steps.sort((a,b) => a.display_order - b.display_order);
        let timelineHTML = '';
        
        steps.forEach(step => {
            const activeClass = step.is_completed ? 'completed' : '';
            const dotClass = step.is_completed ? 'bg-nec-gold shadow-lg shadow-nec-gold/50' : 'bg-gray-300';
            const textClass = step.is_completed ? 'text-nec-gold font-bold' : 'text-gray-400';
            
            // Efeito de "Pulsar" se for a etapa atual
            const isCurrent = step.is_completed && (!steps[step.display_order] || !steps[step.display_order].is_completed);
            const pulse = isCurrent ? 'animate-pulse' : '';

            timelineHTML += `
            <div class="timeline-item ${activeClass}">
                <div class="timeline-dot ${dotClass} ${pulse}"></div>
                <h4 class="text-sm uppercase ${textClass}">${step.step_name}</h4>
                <p class="text-xs text-gray-400">${step.is_completed ? 'Concluído' : 'Pendente'}</p>
            </div>`;
        });

        document.getElementById('timeline-container').innerHTML = timelineHTML;

        // Troca a visualização (Esconde lupa -> Mostra resultado)
        imgDiv.classList.add('hidden');
        resultDiv.classList.remove('hidden');

    } catch (error) {
        console.error(error);
        Utils.notify.error('CPF não encontrado ou sem contratos ativos.');
        imgDiv.classList.remove('hidden');
        resultDiv.classList.add('hidden');
    } finally {
        btn.innerHTML = 'BUSCAR';
        btn.disabled = false;
    }
}

// --- LÓGICA VISUAL (CARROSSEL) ---
function iniciarCarrossel() {
    const videos = document.querySelectorAll('.video-slide');
    if (videos.length === 0) return;

    let currentVideo = 0;
    const duration = 6000; // 6 segundos

    // Função para trocar vídeo
    const nextVideo = () => {
        videos[currentVideo].classList.remove('active');
        currentVideo = (currentVideo + 1) % videos.length;
        videos[currentVideo].classList.add('active');
        
        // Reinicia barra de progresso
        const bar = document.getElementById('progress-bar');
        if(bar) {
            bar.style.transition = 'none'; 
            bar.style.width = '0';
            setTimeout(() => { 
                bar.style.transition = `width ${duration}ms linear`; 
                bar.style.width = '100%'; 
            }, 50);
        }
    };

    // Inicia a barra na primeira vez
    const bar = document.getElementById('progress-bar');
    if(bar) {
        bar.style.transition = `width ${duration}ms linear`; 
        bar.style.width = '100%';
    }

    setInterval(nextVideo, duration);
}

// js/tracking.js (Adicione no final do arquivo)

// --- ENVIO DE LEAD (COMERCIAL) ---
async function enviarLead(e) {
    e.preventDefault();
    
    const btn = document.getElementById('btn-enviar');
    const nome = document.getElementById('lead-nome').value;
    const whatsapp = document.getElementById('lead-zap').value;
    const ambiente = document.getElementById('lead-ambiente').value;
    const msg = document.getElementById('lead-msg').value;

    btn.innerHTML = 'Enviando...'; btn.disabled = true;

    try {
        const { error } = await supabaseClient
            .from('leads')
            .insert([{ nome, whatsapp, ambiente, mensagem: msg }]);

        if (error) throw error;

        Utils.notify.success('Recebemos seu contato!', 'Nossa equipe comercial chamará você no WhatsApp em breve.');
        document.getElementById('form-contato').reset();

    } catch (err) {
        console.error(err);
        Utils.notify.error('Erro ao enviar. Tente nos chamar no WhatsApp direto.');
    } finally {
        btn.innerHTML = 'SOLICITAR ORÇAMENTO';
        btn.disabled = false;
    }
}