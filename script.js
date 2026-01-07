// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = 'https://qazcbauqhwlppyxeqyqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhemNiYXVxaHdscHB5eGVxeXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3Nzc1MjYsImV4cCI6MjA4MzM1MzUyNn0.E0vMjSJ8ZCJdKASudwb9MvRDkZxsY_DstLuwnmVvJPY';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// =======================
// AUTENTICAÇÃO E NAVEGAÇÃO
// =======================

function toggleAuth(mode) {
    if(mode === 'signup') {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('signup-form').classList.remove('hidden');
    } else {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('signup-form').classList.add('hidden');
    }
}

async function handleLogin() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;

    const { data, error } = await supabase.auth.signInWithPassword({ email: email, password: pass });
    
    if (error) return alert("Erro: " + error.message);
    checkProfileAndRedirect(data.user.id);
}

async function handleSignup() {
    const email = document.getElementById('signup-email').value;
    const pass = document.getElementById('signup-password').value;

    const { data, error } = await supabase.auth.signUp({ email: email, password: pass });
    
    if (error) return alert("Erro: " + error.message);
    alert("Cadastro realizado! Aguarde a aprovação do administrador.");
    toggleAuth('login');
}

async function checkProfileAndRedirect(userId) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    
    if (!profile.is_approved) {
        await supabase.auth.signOut();
        return alert("Seu usuário ainda não foi aprovado pelo Admin.");
    }

    if (profile.role === 'admin') window.location.href = 'admin.html';
    else window.location.href = 'checklist.html';
}

async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

// Verifica se é Admin (para admin.html)
async function checkAdminAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.location.href = 'index.html';

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile.role !== 'admin') window.location.href = 'checklist.html';

    // Carregar dados iniciais
    loadPendingUsers();
    loadVehiclesForSelect('vehicle-select-material');
    loadReports();
}

// Verifica se é User (para checklist.html)
async function checkUserAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.location.href = 'index.html';
    loadVehiclesForSelect('vehicle-select-checklist');
}

// =======================
// FUNÇÕES DE ADMIN
// =======================

function showTab(tabId) {
    document.getElementById('tab-users').classList.add('hidden');
    document.getElementById('tab-fleet').classList.add('hidden');
    document.getElementById('tab-reports').classList.add('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.remove('hidden');
    event.target.classList.add('active');
}

// Usuários
async function loadPendingUsers() {
    const { data: users } = await supabase.from('profiles').select('*').eq('is_approved', false);
    const container = document.getElementById('pending-users-list');
    container.innerHTML = '';

    if(users.length === 0) container.innerHTML = '<p>Nenhum usuário pendente.</p>';

    users.forEach(u => {
        container.innerHTML += `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                <span>${u.email}</span>
                <button class="btn-success" style="width:auto; padding:5px 15px;" onclick="approveUser('${u.id}')">Aprovar</button>
            </div>
        `;
    });
}

async function approveUser(id) {
    await supabase.from('profiles').update({ is_approved: true }).eq('id', id);
    alert("Usuário aprovado!");
    loadPendingUsers();
}

// Frota
async function addVehicle() {
    const name = document.getElementById('new-vehicle-name').value;
    if(!name) return alert("Digite o nome");

    const { error } = await supabase.from('vehicles').insert([{ name: name }]);
    if(!error) {
        alert("Viatura adicionada");
        loadVehiclesForSelect('vehicle-select-material');
        document.getElementById('new-vehicle-name').value = '';
    }
}

async function loadVehiclesForSelect(elementId) {
    const { data: vehicles } = await supabase.from('vehicles').select('*');
    const select = document.getElementById(elementId);
    if(!select) return;
    
    select.innerHTML = '<option value="">Selecione...</option>';
    vehicles.forEach(v => {
        select.innerHTML += `<option value="${v.id}">${v.name}</option>`;
    });
}

async function addMaterial() {
    const vId = document.getElementById('vehicle-select-material').value;
    const name = document.getElementById('mat-name').value;
    const loc = document.getElementById('mat-loc').value;

    if(!vId || !name) return alert("Preencha os campos obrigatórios");

    const { error } = await supabase.from('materials').insert([
        { vehicle_id: vId, name: name, location: loc }
    ]);

    if(!error) {
        alert("Material salvo!");
        document.getElementById('mat-name').value = '';
        document.getElementById('mat-loc').value = '';
    }
}

// Relatórios
async function loadReports() {
    // Busca checklists e junta com nome da viatura
    const { data: checks } = await supabase.from('checklists').select(`*, vehicles(name), profiles(email)`).order('created_at', { ascending: false });
    const list = document.getElementById('reports-list');
    list.innerHTML = '';

    checks.forEach(c => {
        const date = new Date(c.created_at).toLocaleString('pt-BR');
        list.innerHTML += `
            <div class="card" onclick="viewReportDetails(${c.id})" style="cursor:pointer;">
                <strong>${c.vehicles.name}</strong> - <small>${date}</small><br>
                Responsável: ${c.profiles.email}
            </div>
        `;
    });
}

async function viewReportDetails(checklistId) {
    const { data: items } = await supabase.from('checklist_items').select('*').eq('checklist_id', checklistId);
    let html = '<ul style="list-style:none; padding:0;">';
    
    items.forEach(i => {
        let color = i.status === 'ok' ? 'green' : 'red';
        html += `<li style="padding:5px; border-bottom:1px solid #eee;">
            <strong style="color:${color}">${i.status.toUpperCase()}</strong> - ${i.material_name}
            ${i.observation ? `<br><small>Obs: ${i.observation}</small>` : ''}
        </li>`;
    });
    html += '</ul>';
    
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-details').classList.remove('hidden');
}

// =======================
// LÓGICA DO USUÁRIO (Checklist)
// =======================

let currentMaterials = [];
let currentVehicleId = null;

async function startChecklist() {
    const vId = document.getElementById('vehicle-select-checklist').value;
    if(!vId) return alert("Selecione uma viatura");
    
    currentVehicleId = vId;
    const { data: materials } = await supabase.from('materials').select('*').eq('vehicle_id', vId).order('location');
    currentMaterials = materials;

    document.getElementById('step-select').classList.add('hidden');
    document.getElementById('step-list').classList.remove('hidden');
    
    renderChecklist();
}

function renderChecklist() {
    const container = document.getElementById('materials-list');
    container.innerHTML = '';

    // Agrupar por Localização (Compartimento/Box)
    const grouped = {};
    currentMaterials.forEach(m => {
        const loc = m.location || 'Geral';
        if(!grouped[loc]) grouped[loc] = [];
        grouped[loc].push(m);
    });

    for (const [loc, items] of Object.entries(grouped)) {
        let html = `<h4 style="background:#ddd; padding:5px; margin-top:15px;">${loc}</h4>`;
        
        items.forEach(item => {
            html += `
            <div class="check-item" id="row-${item.id}">
                <div class="check-header">
                    <span>${item.name}</span>
                </div>
                <div class="check-actions">
                    <button class="check-btn" onclick="setItemStatus(${item.id}, 'ok')">OK</button>
                    <button class="check-btn" onclick="setItemStatus(${item.id}, 'falta')">FALTA</button>
                    <button class="check-btn" onclick="setItemStatus(${item.id}, 'quebrado')">DANO</button>
                </div>
                <input type="text" id="obs-${item.id}" placeholder="Observação (opcional)" style="margin-top:5px; display:none;">
            </div>
            `;
        });
        container.innerHTML += html;
    }
}

const checkResults = {};

function setItemStatus(materialId, status) {
    checkResults[materialId] = status;
    
    // Atualiza visual dos botões
    const row = document.getElementById(`row-${materialId}`);
    const btns = row.querySelectorAll('.check-btn');
    btns.forEach(b => {
        b.style.background = '#fff';
        b.style.color = '#333';
        if(b.innerText.toLowerCase().includes(status === 'quebrado' ? 'dano' : status)) {
            b.style.background = status === 'ok' ? 'var(--success)' : 'var(--primary)';
            b.style.color = 'white';
        }
    });

    // Mostra obs se não for OK
    const obsInput = document.getElementById(`obs-${materialId}`);
    if(status !== 'ok') obsInput.style.display = 'block';
    else obsInput.style.display = 'none';
}

async function finishChecklist() {
    // 1. Criar o cabeçalho do checklist
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: checkData, error: checkError } = await supabase
        .from('checklists')
        .insert([{ user_id: user.id, vehicle_id: currentVehicleId }])
        .select()
        .single();
    
    if(checkError) return alert("Erro ao salvar: " + checkError.message);

    const checklistId = checkData.id;
    const itemsToInsert = [];

    // 2. Preparar itens
    currentMaterials.forEach(m => {
        const status = checkResults[m.id] || 'ok'; // Default OK se esquecer de marcar
        const obs = document.getElementById(`obs-${m.id}`).value;
        
        itemsToInsert.push({
            checklist_id: checklistId,
            material_name: m.name,
            status: status,
            observation: obs
        });
    });

    // 3. Salvar itens em lote
    const { error: itemsError } = await supabase.from('checklist_items').insert(itemsToInsert);
    
    if(itemsError) alert("Erro nos itens: " + itemsError.message);
    else {
        alert("Conferência Finalizada com Sucesso!");
        window.location.reload();
    }
}

function cancelChecklist() {
    window.location.reload();
}
