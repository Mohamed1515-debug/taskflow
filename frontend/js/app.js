// ==============================
// CONFIG
// ==============================
const API = 'http://localhost:4000/api';
let currentProjectId = null;
let currentPage = 1;
let isOwner = false;

// Axios interceptor — injecte le token automatiquement
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ==============================
// INIT
// ==============================
window.onload = () => {
  const token = localStorage.getItem('token');
  if (token) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('nav-username').textContent = user.name || '';
    document.getElementById('navbar').classList.remove('hidden');
    showPage('dashboard');
    startNotifPolling();
  } else {
    showPage('auth');
  }
};

// ==============================
// NAVIGATION
// ==============================
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(`page-${name}`).classList.remove('hidden');
  if (name === 'dashboard') loadDashboard();
  if (name === 'projects')  loadProjects();
}

// ==============================
// AUTH
// ==============================
function switchTab(tab) {
  document.getElementById('tab-login').classList.toggle('hidden', tab !== 'login');
  document.getElementById('tab-register').classList.toggle('hidden', tab !== 'register');
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
  });
}

async function login() {
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    const { data } = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    document.getElementById('nav-username').textContent = data.user.name;
    document.getElementById('navbar').classList.remove('hidden');
    showPage('dashboard');
    startNotifPolling();
  } catch (err) {
    showAuthError(err.response?.data?.message || 'Erreur de connexion');
  }
}

async function register() {
  const name     = document.getElementById('reg-name').value;
  const email    = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  try {
    await axios.post(`${API}/auth/register`, { name, email, password });
    switchTab('login');
    showAuthError('Compte créé ! Connectez-vous.');
  } catch (err) {
    showAuthError(err.response?.data?.message || 'Erreur inscription');
  }
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  clearInterval(window._notifInterval);
  document.getElementById('navbar').classList.add('hidden');
  showPage('auth');
}

// ==============================
// DASHBOARD
// ==============================
async function loadDashboard() {
  try {
    const { data } = await axios.get(`${API}/dashboard`);
    document.getElementById('stat-projects').textContent = data.activeProjects;
    document.getElementById('stat-tasks').textContent    = data.assignedTasks;
    document.getElementById('stat-done').textContent     = data.doneTasks;
    document.getElementById('stat-late').textContent     = data.lateTasks;

    const list = document.getElementById('dashboard-tasks');
    list.innerHTML = data.inProgressTasks.length === 0
      ? '<p style="color:var(--text-muted)">Aucune tâche en cours.</p>'
      : data.inProgressTasks.map(renderTaskCard).join('');
  } catch (err) { console.error(err); }
}

// ==============================
// PROJECTS
// ==============================
async function loadProjects() {
  try {
    const { data } = await axios.get(`${API}/projects?limit=50`);
    const list = document.getElementById('projects-list');
    list.innerHTML = data.data.length === 0
      ? '<p style="color:var(--text-muted)">Aucun projet. Créez-en un !</p>'
      : data.data.map(p => `
        <div class="project-card" onclick="openProject('${p._id}')">
          <h3>${escHtml(p.title)}</h3>
          <p>${escHtml(p.description || '')}</p>
          <span class="badge-status ${p.status === 'en pause' ? 'pause' : p.status === 'archivé' ? 'archive' : ''}">${p.status}</span>
        </div>
      `).join('');
  } catch (err) { console.error(err); }
}

async function openProject(id) {
  currentProjectId = id;
  currentPage = 1;
  try {
    const { data: p } = await axios.get(`${API}/projects/${id}`);
    const me = JSON.parse(localStorage.getItem('user') || '{}');
    isOwner = p.owner._id === me.id;

    document.getElementById('detail-title').textContent       = p.title;
    document.getElementById('detail-description').textContent = p.description || '';
    document.getElementById('detail-status').textContent      = p.status;
    document.getElementById('owner-actions').style.display    = isOwner ? 'flex' : 'none';

    showPage('project-detail');
    switchDetailTab('tasks');
    loadTasks();
  } catch (err) { console.error(err); }
}

function openProjectModal() {
  document.getElementById('proj-title').value       = '';
  document.getElementById('proj-description').value = '';
  document.getElementById('proj-deadline').value    = '';
  openModal('modal-project');
}

async function createProject() {
  const title       = document.getElementById('proj-title').value;
  const description = document.getElementById('proj-description').value;
  const deadline    = document.getElementById('proj-deadline').value;
  if (!title) return alert('Titre requis');
  try {
    await axios.post(`${API}/projects`, { title, description, deadline: deadline || undefined });
    closeModal('modal-project');
    loadProjects();
  } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
}

async function deleteProject() {
  if (!confirm('Supprimer ce projet et toutes ses tâches ?')) return;
  try {
    await axios.delete(`${API}/projects/${currentProjectId}`);
    showPage('projects');
  } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
}

// ==============================
// TASKS
// ==============================
async function loadTasks() {
  const status   = document.getElementById('filter-status')?.value   || '';
  const priority = document.getElementById('filter-priority')?.value || '';
  const search   = document.getElementById('filter-search')?.value   || '';

  const params = new URLSearchParams({ page: currentPage, limit: 10 });
  if (status)   params.set('status',   status);
  if (priority) params.set('priority', priority);
  if (search)   params.set('search',   search);

  try {
    const { data } = await axios.get(`${API}/tasks/project/${currentProjectId}?${params}`);
    const list = document.getElementById('tasks-list');
    list.innerHTML = data.data.length === 0
      ? '<p style="color:var(--text-muted)">Aucune tâche.</p>'
      : data.data.map(renderTaskCard).join('');

    renderPagination(data.totalPages);
  } catch (err) { console.error(err); }
}

function renderTaskCard(t) {
  const doneClass = t.status === 'terminé' ? 'done' : '';
  const assigned  = t.assignedTo ? `👤 ${t.assignedTo.name}` : '';
  const deadline  = t.deadline ? `📅 ${new Date(t.deadline).toLocaleDateString('fr-FR')}` : '';
  return `
    <div class="task-card ${t.priority} ${doneClass}">
      <div class="task-info">
        <h4>${escHtml(t.title)}</h4>
        <small>${assigned} ${deadline} — Priorité: ${t.priority}</small>
      </div>
      <div class="task-actions">
        <select onchange="updateStatus('${t._id}', this.value)">
          <option value="à faire"  ${t.status === 'à faire'  ? 'selected' : ''}>À faire</option>
          <option value="en cours" ${t.status === 'en cours' ? 'selected' : ''}>En cours</option>
          <option value="terminé"  ${t.status === 'terminé'  ? 'selected' : ''}>Terminé</option>
        </select>
        ${isOwner ? `<button onclick="deleteTask('${t._id}')" class="btn btn-sm btn-danger">✕</button>` : ''}
      </div>
    </div>
  `;
}

async function updateStatus(taskId, status) {
  try {
    await axios.patch(`${API}/tasks/${taskId}/status`, { status });
    loadTasks();
  } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
}

async function deleteTask(taskId) {
  if (!confirm('Supprimer cette tâche ?')) return;
  try {
    await axios.delete(`${API}/tasks/${taskId}`);
    loadTasks();
  } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
}

async function openTaskModal() {
  // Charger les membres pour l'assignation
  try {
    const { data: p } = await axios.get(`${API}/projects/${currentProjectId}`);
    const sel = document.getElementById('task-assignedTo');
    sel.innerHTML = '<option value="">Non assignée</option>';
    const all = [p.owner, ...p.members];
    all.forEach(m => {
      if (!m) return;
      sel.innerHTML += `<option value="${m._id}">${escHtml(m.name)}</option>`;
    });
  } catch (err) {}

  // Restaurer le brouillon
  const draftKey = `draft_task_${currentProjectId}`;
  const draft = localStorage.getItem(draftKey);
  if (draft) {
    const d = JSON.parse(draft);
    document.getElementById('task-title').value       = d.title || '';
    document.getElementById('task-description').value = d.description || '';
    document.getElementById('task-priority').value    = d.priority || 'moyenne';
    document.getElementById('task-deadline').value    = d.deadline || '';
    document.getElementById('draft-banner').classList.remove('hidden');
  } else {
    document.getElementById('task-title').value       = '';
    document.getElementById('task-description').value = '';
    document.getElementById('task-priority').value    = 'moyenne';
    document.getElementById('task-deadline').value    = '';
    document.getElementById('draft-banner').classList.add('hidden');
  }

  // Auto-save brouillon à chaque input
  ['task-title','task-description','task-priority','task-deadline'].forEach(id => {
    document.getElementById(id).addEventListener('input', saveDraft);
  });

  openModal('modal-task');
}

function saveDraft() {
  const draftKey = `draft_task_${currentProjectId}`;
  localStorage.setItem(draftKey, JSON.stringify({
    title:       document.getElementById('task-title').value,
    description: document.getElementById('task-description').value,
    priority:    document.getElementById('task-priority').value,
    deadline:    document.getElementById('task-deadline').value,
  }));
}

function clearDraft() {
  localStorage.removeItem(`draft_task_${currentProjectId}`);
  document.getElementById('task-title').value       = '';
  document.getElementById('task-description').value = '';
  document.getElementById('task-priority').value    = 'moyenne';
  document.getElementById('task-deadline').value    = '';
  document.getElementById('draft-banner').classList.add('hidden');
}

async function createTask() {
  const title       = document.getElementById('task-title').value;
  const description = document.getElementById('task-description').value;
  const priority    = document.getElementById('task-priority').value;
  const deadline    = document.getElementById('task-deadline').value;
  const assignedTo  = document.getElementById('task-assignedTo').value;
  if (!title) return alert('Titre requis');
  try {
    await axios.post(`${API}/tasks`, {
      title, description, priority,
      deadline: deadline || undefined,
      project: currentProjectId,
      assignedTo: assignedTo || undefined
    });
    localStorage.removeItem(`draft_task_${currentProjectId}`);
    closeModal('modal-task');
    loadTasks();
  } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
}

function renderPagination(totalPages) {
  const el = document.getElementById('tasks-pagination');
  el.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    el.innerHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
  }
}

function goPage(n) {
  currentPage = n;
  loadTasks();
}

// ==============================
// MEMBERS
// ==============================
async function loadMembers() {
  try {
    const { data: p } = await axios.get(`${API}/projects/${currentProjectId}`);
    const list = document.getElementById('members-list');
    const me = JSON.parse(localStorage.getItem('user') || '{}');
    const all = [{ ...p.owner, role: 'Créateur' }, ...p.members.map(m => ({ ...m, role: 'Membre' }))];
    list.innerHTML = all.map(m => `
      <div class="member-row">
        <div class="member-info">
          <strong>${escHtml(m.name)}</strong>
          <small>${escHtml(m.email)} — ${m.role}</small>
        </div>
        ${isOwner && m._id !== p.owner._id ? `<button onclick="removeMember('${m._id}')" class="btn btn-sm btn-danger">Retirer</button>` : ''}
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

function openInviteModal() {
  document.getElementById('invite-email').value = '';
  openModal('modal-invite');
}

async function inviteMember() {
  const email = document.getElementById('invite-email').value;
  try {
    await axios.post(`${API}/projects/${currentProjectId}/invite`, { email });
    closeModal('modal-invite');
    loadMembers();
  } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
}

async function removeMember(userId) {
  if (!confirm('Retirer ce membre ?')) return;
  try {
    await axios.delete(`${API}/projects/${currentProjectId}/members/${userId}`);
    loadMembers();
  } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
}

// ==============================
// ACTIVITIES
// ==============================
async function loadActivities() {
  try {
    const { data } = await axios.get(`${API}/projects/${currentProjectId}/activities`);
    const list = document.getElementById('activities-list');
    list.innerHTML = data.length === 0
      ? '<p style="color:var(--text-muted)">Aucune activité.</p>'
      : data.map(a => `
        <div class="activity-item">
          <strong>${escHtml(a.user?.name || 'Système')}</strong> — ${escHtml(a.details)}
          <small>${timeAgo(a.createdAt)}</small>
        </div>
      `).join('');
  } catch (err) { console.error(err); }
}

// ==============================
// NOTIFICATIONS
// ==============================
let notifData = [];

async function fetchNotifications() {
  try {
    const { data } = await axios.get(`${API}/notifications`);
    notifData = data;

    // Archiver les lues dans localStorage
    const archived = JSON.parse(localStorage.getItem('notif_archive') || '[]');
    const unread = data.filter(n => !n.read && !archived.includes(n._id));

    const badge = document.getElementById('notif-badge');
    badge.textContent = unread.length;
    badge.classList.toggle('hidden', unread.length === 0);

    const list = document.getElementById('notif-list');
    list.innerHTML = data.map(n => `
      <li class="${n.read ? 'read' : ''}" onclick="markRead('${n._id}')">
        ${escHtml(n.message)}
        <small>${timeAgo(n.createdAt)}</small>
      </li>
    `).join('') || '<li>Aucune notification</li>';
  } catch {}
}

async function markRead(id) {
  try {
    await axios.patch(`${API}/notifications/${id}/read`);
    // Archiver dans localStorage
    const archived = JSON.parse(localStorage.getItem('notif_archive') || '[]');
    if (!archived.includes(id)) {
      archived.push(id);
      localStorage.setItem('notif_archive', JSON.stringify(archived));
    }
    fetchNotifications();
  } catch {}
}

function toggleNotifPanel() {
  document.getElementById('notif-panel').classList.toggle('hidden');
}

function startNotifPolling() {
  fetchNotifications();
  window._notifInterval = setInterval(fetchNotifications, 30000);
}

// ==============================
// DETAIL TABS
// ==============================
function switchDetailTab(tab) {
  ['tasks', 'members', 'activities'].forEach(t => {
    document.getElementById(`detail-${t}`).classList.toggle('hidden', t !== tab);
  });
  document.querySelectorAll('.tabs .tab-btn').forEach((b, i) => {
    b.classList.toggle('active', ['tasks','members','activities'][i] === tab);
  });
  if (tab === 'members')    loadMembers();
  if (tab === 'activities') loadActivities();
}

// ==============================
// MODAL HELPERS
// ==============================
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Fermer modal en cliquant dehors
document.addEventListener('click', e => {
  document.querySelectorAll('.modal').forEach(m => {
    if (e.target === m) m.classList.add('hidden');
  });
  // Fermer notif panel
  if (!e.target.closest('.notif-bell') && !e.target.closest('.notif-panel')) {
    document.getElementById('notif-panel')?.classList.add('hidden');
  }
});

// ==============================
// UTILS
// ==============================
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff/3600)} h`;
  return `il y a ${Math.floor(diff/86400)} j`;
}
// notifications 
// notifications 
