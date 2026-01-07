/* SISCOV WEB - SCRIPT UNIFICADO (COM SUPABASE) */

// ==========================================
// 1. CONFIGURAÇÃO DO SUPABASE
// ==========================================
// Substitua abaixo pelos seus dados do Project Settings > API
const SUPABASE_URL = 'COLE_AQUI_SUA_URL'; 
const SUPABASE_KEY = 'COLE_AQUI_SUA_CHAVE_ANON';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 2. ROTEAMENTO E INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.id;

    // Verifica segurança em todas as páginas
    checkSession(pageId);

    // Inicializa a lógica específica de cada página
    if (pageId === 'page-login') initLogin();
    if (pageId === 'page-index') initIndex(); // <--- Nova página inicial
    if (pageId === 'page-admin') initAdmin();
    if (pageId === 'page-checklist') initChecklist();
});

// ==========================================
// 3. FUNÇÕES DE AUTENTICAÇÃO E SEGURANÇA
// ==========================================
async function checkSession(pageId) {
    const { data: { session } } = await supabase.auth.getSession();

    // Se NÃO tem sessão e NÃO está no login -> manda pro login
    if (!session && pageId !== 'page-login') {
        window.location.href = 'login.html';
        return;
    }
    
    // Se TEM sessão e tenta acessar login -> manda pro início
    if (session && pageId === 'page-login') {
        window.location.href = 'index.html';
        return;
    }
}

async function logout() {
    if(confirm("Deseja realmente sair do sistema?")) {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            window.location.href = 'login.html';
        } else {
            alert("Erro ao sair: " + error.message);
        }
    }
}

// ==========================================
// 4. LÓGICA DA TELA DE LOGIN (login.html)
// ==========================================
function initLogin() {
    const form = document.getElementById('form-login');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('senha').value;
            const btn = form.querySelector('button');

            try {
                // Feedback visual de carregamento
                btn.textContent = 'Autenticando...';
                btn.disabled = true;

                // Login no Supabase
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) throw error;

                // Sucesso: Vai para o Menu Principal
                window.location.href = 'index.html';

            } catch (erro) {
                alert("Erro ao entrar: " + erro.message);
                btn.textContent = 'Entrar no Sistema';
                btn.disabled = false;
            }
        });
    }
}

// ==========================================
// 5. LÓGICA DA TELA INICIAL (index.html)
// ==========================================
async function initIndex() {
    // Busca dados do usuário logado
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // Mostra o email na saudação
        const userNameElement = document.getElementById('user-name');
        if(userNameElement) userNameElement.innerText = user.email;

        // Lógica de Admin: Se o email tiver "admin", mostra o botão do painel
        if (user.email && user.email.toLowerCase().includes('admin')) {
            const btnAdmin = document.getElementById('btn-admin-panel');
            if(btnAdmin) btnAdmin.classList.remove('hidden');
        }
    }
}

// ==========================================
// 6. LÓGICA DA TELA DE ADMIN (admin.html)
// ==========================================
function initAdmin() {
    // Lógica das Abas
    const tabs = document.querySelectorAll('.admin-tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.add('hidden'));

            tab.classList.add('active');
            const targetId = 'tab-' + tab.getAttribute('data-tab');
            document.getElementById(targetId).classList.remove('hidden');
        });
    });
}

// Funções chamadas via onclick no HTML do Admin
function abrirRelatorio(viatura) {
    console.log("Abrindo relatório da " + viatura);
    abrirModal('modal-relatorio');
}

function aprovarUsuario(cardId) {
    if(confirm("Confirmar aprovação deste militar?")) {
        const card = document.getElementById(cardId);
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 300);
        alert("Acesso liberado com sucesso.");
    }
}

// ==========================================
// 7. LÓGICA DA TELA DE CHECKLIST (checklist.html)
// ==========================================
function initChecklist() {
    // Funções iniciadas apenas por interação do usuário
}

function selectStatus(element) {
    const group = element.parentElement;
    
    // 1. Limpa seleção dos irmãos
    group.querySelectorAll('.status-option').forEach(opt => {
        opt.classList.remove('selected');
    });

    // 2. Seleciona o atual
    element.classList.add('selected');

    // 3. Lógica da Caixa de Observação
    const statusVal = element.getAttribute('data-val');
    const container = group.parentElement; 
    const textArea = container.querySelector('.obs-box');

    if (statusVal === 'falta' || statusVal === 'dano') {
        textArea.classList.remove('hidden');
        textArea.focus();
    } else {
        textArea.classList.add('hidden');
        textArea.value = ''; 
    }
}

function finalizarChecklist() {
    if(confirm("Finalizar e enviar conferência para o comando?")) {
        // Futuramente: enviar dados pro Supabase aqui
        alert("Enviado com sucesso!");
        window.location.href = 'index.html'; // Volta para o menu principal
    }
}

// ==========================================
// 8. FUNÇÕES GLOBAIS DE UI (MODAIS)
// ==========================================
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.classList.add('open');
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.classList.remove('open');
}