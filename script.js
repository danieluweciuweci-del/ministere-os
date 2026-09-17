'use strict';

const KEYS = {
  members: 'min_os_members',
  workers: 'min_os_workers',
  activities: 'min_os_activities',
  contributions: 'min_os_contributions',
  notifications: 'min_os_notifications',
  announcements: 'min_os_announcements',
  live: 'min_os_live'
};

const ABSENCE_THRESHOLD = 3;

const USERS = [
  { username: 'admin', password: 'admin123', name: 'Administrateur', role: 'admin' },
  { username: 'finance', password: 'finance123', name: 'Responsable financier', role: 'finance' },
   { username: 'membre', password: 'membre123', name: 'membre', role: 'member' },
  
];

let currentUser = JSON.parse(sessionStorage.getItem('min_os_current_user') || 'null');

function isFinanceAllowed() { return currentUser && ['admin', 'finance'].includes(currentUser.role); }
function isAdmin() { return currentUser?.role === 'admin'; }
function canSeeNotification(n) {
  if (isAdmin()) return true;
  if (n.recipient === 'Tous') return true;
  if (currentUser?.role === 'finance' && (n.type === 'finance' || n.recipient === 'Finances')) return true;
  return n.recipient === currentUser?.name;
}

function applyPermissions() {
  document.body.classList.toggle('auth-locked', !currentUser);
  document.getElementById('loginScreen').classList.toggle('open', !currentUser);
  document.getElementById('loginScreen').setAttribute('aria-hidden', String(!!currentUser));
  document.getElementById('currentUserName').textContent = currentUser?.name || '—';
  const roleLabels = {admin:'Administrateur', finance:'Responsable financier', worker:'Serviteur'};
  document.getElementById('currentUserRole').textContent = roleLabels[currentUser?.role] || '—';
  document.querySelectorAll('.finance-only').forEach(el => el.classList.toggle('hidden-by-role', !isFinanceAllowed()));
}

function login(event) {
  event.preventDefault();
  const username = document.getElementById('loginUsername').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const found = USERS.find(u => u.username === username && u.password === password);
  if (!found) { document.getElementById('loginError').textContent = 'Identifiant ou mot de passe incorrect.'; return; }
  currentUser = { username: found.username, name: found.name, role: found.role };
  sessionStorage.setItem('min_os_current_user', JSON.stringify(currentUser));
  document.getElementById('loginForm').reset();
  document.getElementById('loginError').textContent = '';
  applyPermissions();
  renderAll();
}

function logout() {
  sessionStorage.removeItem('min_os_current_user');
  currentUser = null;
  applyPermissions();
}
const state = {
  members: load(KEYS.members, []),
  workers: load(KEYS.workers, []),
  activities: load(KEYS.activities, []),
  contributions: load(KEYS.contributions, []),
  notifications: load(KEYS.notifications, []),
  announcements: load(KEYS.announcements, []),
  live: load(KEYS.live, null)
};

const pageTitles = {
  dashboard: 'Tableau de bord', membres: 'Membres', ouvriers: 'Ouvriers', activites: 'Activités',
  contributions: 'Contributions', notifications: 'Notifications', communication: 'Communication',
  direct: 'Direct', statistiques: 'Statistiques'
};

function load(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error('Erreur localStorage:', error);
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function formatMoney(value, currency = 'CDF') {
  const amount = new Intl.NumberFormat('fr-FR').format(Number(value) || 0);
  return currency === 'USD' ? `${amount} $` : `${amount} FC`;
}

function formatContributionTotals(contributions) {
  const cdf = contributions.filter(c => (c.currency || 'CDF') === 'CDF').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const usd = contributions.filter(c => (c.currency || 'CDF') === 'USD').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  return `${formatMoney(cdf, 'CDF')} · ${formatMoney(usd, 'USD')}`;
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function formatDateTime(dateString, timeString = '') {
  if (!dateString) return '—';
  return `${formatDate(dateString)}${timeString ? ` à ${timeString}` : ''}`;
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return 'à l’instant';
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function navigate(page) {
  if (!currentUser) return;
  if (page === 'contributions' && !isFinanceAllowed()) { showToast('Accès réservé aux finances.', 'error'); return; }
  document.querySelectorAll('.page').forEach(section => section.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (!target) return;
  target.classList.add('active');
  document.querySelectorAll('.nav-btn[data-page]').forEach(btn => btn.classList.toggle('active', btn.dataset.page === page));
  document.getElementById('pageTitle').textContent = pageTitles[page] || 'Ministère OS';
  document.getElementById('sidebar').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function addNotification({ title, message, recipient = 'Tous', type = 'info', link = '', activityId = '', role = '', assignmentId = '' }) {
  state.notifications.unshift({
    id: uid('notif'), title, message, recipient, type, link, activityId, role, assignmentId,
    read: false, response: 'pending', createdAt: new Date().toISOString()
  });
  if (state.notifications.length > 300) state.notifications.length = 300;
  save(KEYS.notifications, state.notifications);
  renderNotifications();
  updateNotificationCount();
}

function updateNotificationCount() {
  const unread = state.notifications.filter(n => !n.read && canSeeNotification(n)).length;
  document.getElementById('navNotificationCount').textContent = unread;
  document.getElementById('topNotificationCount').textContent = unread;
}

function notificationActions(notification) {
  if (!notification.activityId || !notification.assignmentId || notification.response !== 'pending') return '';
  return `<div class="notification-actions">
    <button class="btn btn-primary btn-small" data-notification-action="confirm" data-id="${escapeHTML(notification.id)}">✓ Je confirme</button>
    <button class="btn btn-danger btn-small" data-notification-action="unavailable" data-id="${escapeHTML(notification.id)}">Je suis indisponible</button>
  </div>`;
}

function notificationHTML(n) {
  const link = n.link && /^https:\/\//i.test(n.link)
    ? `<a class="notification-link" href="${escapeHTML(n.link)}" target="_blank" rel="noopener">Ouvrir le lien</a>` : '';
  const response = n.response === 'confirmed' ? '<span class="status status-success">Confirmé</span>' : n.response === 'unavailable' ? '<span class="status status-danger">Indisponible</span>' : '';
  return `<article class="notification-item ${n.read ? '' : 'unread'}">
    <strong>${escapeHTML(n.title)}</strong> ${response}
    <p>${escapeHTML(n.message)}</p>
    <span class="notification-time">${escapeHTML(n.recipient)} · ${relativeTime(n.createdAt)}</span>
    ${link}${notificationActions(n)}
  </article>`;
}

function renderNotifications() {
  const sorted = state.notifications.filter(canSeeNotification).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const page = document.getElementById('notificationsPage');
  const recent = document.getElementById('recentNotifications');
  page.innerHTML = sorted.length ? sorted.map(notificationHTML).join('') : '<div class="empty">Aucune notification.</div>';
  recent.innerHTML = sorted.slice(0, 5).map(notificationHTML).join('') || '<div class="empty">Aucune notification récente.</div>';
  updateNotificationCount();
}

function markNotificationRead(id) {
  const item = state.notifications.find(n => n.id === id);
  if (!item) return;
  item.read = true;
  save(KEYS.notifications, state.notifications);
  renderNotifications();
}

function respondToNotification(id, response) {
  const notification = state.notifications.find(n => n.id === id);
  if (!notification || !notification.activityId || !notification.assignmentId) return;
  const activity = state.activities.find(a => a.id === notification.activityId);
  if (!activity) return;
  const assignment = activity.assignments.find(a => a.id === notification.assignmentId);
  if (!assignment) return;
  assignment.response = response;
  notification.response = response;
  notification.read = true;
  save(KEYS.activities, state.activities);
  save(KEYS.notifications, state.notifications);
  renderActivities();
  renderNotifications();
  showToast(response === 'confirmed' ? 'Programmation confirmée.' : 'Indisponibilité enregistrée.', response === 'confirmed' ? 'success' : 'error');
}

function addMember(event) {
  event.preventDefault();
  const name = document.getElementById('memberName').value.trim();
  const phone = document.getElementById('memberPhone').value.trim();
  const group = document.getElementById('memberGroup').value.trim();
  const status = document.getElementById('memberStatus').value;
  if (!name) return;
  state.members.unshift({ id: uid('member'), name, phone, group, status, createdAt: new Date().toISOString() });
  save(KEYS.members, state.members);
  event.target.reset();
  closeModal('memberModal');
  renderAll();
  showToast('Membre enregistré.');
}

function addWorker(event) {
  event.preventDefault();
  const name = document.getElementById('workerName').value.trim();
  const role = document.getElementById('workerRole').value.trim();
  const phone = document.getElementById('workerPhone').value.trim();
  if (!name || !role) return;
  state.workers.unshift({ id: uid('worker'), name, role, phone, absences: 0, createdAt: new Date().toISOString() });
  save(KEYS.workers, state.workers);
  event.target.reset();
  closeModal('workerModal');
  renderAll();
  showToast('Ouvrier enregistré.');
}

function workerOptions() {
  const options = state.workers.map(w => `<option value="${escapeHTML(w.id)}">${escapeHTML(w.name)} — ${escapeHTML(w.role)}</option>`).join('');
  return `<option value="">Non défini</option>${options}`;
}

function refreshWorkerSelects() {
  ['activitySpeaker', 'activityModerator', 'activityInterpreter'].forEach(id => {
    const select = document.getElementById(id);
    const old = select.value;
    select.innerHTML = workerOptions();
    if ([...select.options].some(o => o.value === old)) select.value = old;
  });
}

function addActivity(event) {
  if (!isAdmin()) return;
  event.preventDefault();
  const name = document.getElementById('activityName').value.trim();
  const date = document.getElementById('activityDate').value;
  const time = document.getElementById('activityTime').value;
  const place = document.getElementById('activityPlace').value.trim();
  const selected = [
    ['Orateur', document.getElementById('activitySpeaker').value],
    ['Modérateur', document.getElementById('activityModerator').value],
    ['Interprète', document.getElementById('activityInterpreter').value]
  ];
  if (!name || !date || !time) return;
  const assignments = selected.filter(([, workerId]) => workerId).map(([role, workerId]) => {
    const worker = state.workers.find(w => w.id === workerId);
    return { id: uid('assign'), role, workerId, workerName: worker?.name || '', response: 'pending' };
  });
  const activity = { id: uid('activity'), name, date, time, place, assignments, createdAt: new Date().toISOString() };
  state.activities.push(activity);
  state.activities.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  save(KEYS.activities, state.activities);
  assignments.forEach(assignment => addNotification({
    title: `Nouvelle programmation — ${assignment.role}`,
    message: `Vous êtes programmé(e) comme ${assignment.role} pour « ${name} », le ${formatDateTime(date, time)}${place ? ` à ${place}` : ''}.`,
    recipient: assignment.workerName,
    type: 'assignment', activityId: activity.id, role: assignment.role, assignmentId: assignment.id
  }));
  addNotification({ title: 'Nouvelle activité programmée', message: `${name} — ${formatDateTime(date, time)}${place ? ` — ${place}` : ''}.`, recipient: 'Tous', type: 'activity' });
  event.target.reset();
  closeModal('activityModal');
  renderAll();
  showToast('Activité programmée et personnes notifiées.');
}

function deleteActivity(id) {
   if (!isAdmin()) return;
  const activity = state.activities.find(a => a.id === id);
  if (!activity || !confirm(`Supprimer « ${activity.name} » ?`)) return;
  state.activities = state.activities.filter(a => a.id !== id);
  save(KEYS.activities, state.activities);
  renderAll();
  showToast('Activité supprimée.');
}

function recordAbsence(id) {
  const worker = state.workers.find(w => w.id === id);
  if (!worker) return;
  worker.absences = Number(worker.absences || 0) + 1;
  save(KEYS.workers, state.workers);
  if (worker.absences === ABSENCE_THRESHOLD) {
    addNotification({ title: 'Alerte personnelle de présence', message: `Vous avez atteint ${ABSENCE_THRESHOLD} absences consécutives ou enregistrées. Merci de contacter le responsable si nécessaire.`, recipient: worker.name, type: 'warning' });
    addNotification({ title: 'Alerte de présence', message: `${worker.name} atteint ${ABSENCE_THRESHOLD} absences. Une vérification est recommandée.`, recipient: 'Responsables', type: 'warning' });
  }
  renderAll();
  showToast(`Absence enregistrée pour ${worker.name}.`, worker.absences >= ABSENCE_THRESHOLD ? 'error' : 'success');
}

function resetAbsences(id) {
  const worker = state.workers.find(w => w.id === id);
  if (!worker) return;
  worker.absences = 0;
  save(KEYS.workers, state.workers);
  renderAll();
  showToast('Compteur d’absences réinitialisé.');
}

function addContribution(event) {
  if (!isFinanceAllowed()) { showToast('Accès réservé aux finances.', 'error'); return; }
  event.preventDefault();
  const name = document.getElementById('contributorName').value.trim();
  const phone = document.getElementById('contributorPhone').value.trim();
  const amount = Number(document.getElementById('contributionAmount').value);
  const currency = document.getElementById('contributionCurrency').value;
  const reference = document.getElementById('contributionReference').value.trim();
  const purpose = document.getElementById('contributionPurpose').value;
  if (!name || !phone || !reference || !Number.isFinite(amount) || amount <= 0) {
    showToast('Veuillez remplir correctement les informations.', 'error');
    return;
  }
  const contribution = {
    id: uid('contribution'), name, phone, amount, currency, reference, purpose,
    status: 'pending', receiptNumber: `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-7)}`,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  state.contributions.unshift(contribution);
  save(KEYS.contributions, state.contributions);
  event.target.reset();
  closeModal('contributionModal');
  addNotification({ title: 'Contribution reçue', message: `${name} a déclaré une contribution de ${formatMoney(amount, currency)} (${purpose}). Référence : ${reference}.`, recipient: 'Finances', type: 'finance' });
  renderAll();
  showToast('Contribution enregistrée en attente de vérification.');
}

function confirmContribution(id) {
  const contribution = state.contributions.find(c => c.id === id);
  if (!contribution) return;
  contribution.status = 'confirmed';
  contribution.updatedAt = new Date().toISOString();
  save(KEYS.contributions, state.contributions);
  addNotification({ title: 'Contribution confirmée', message: `Votre contribution de ${formatMoney(contribution.amount, contribution.currency || 'CDF')} a été confirmée. Reçu ${contribution.receiptNumber}.`, recipient: contribution.name, type: 'finance' });
  renderAll();
  openReceipt(id);
  showToast('Contribution confirmée et reçu mis à jour.');
}

function rejectContribution(id) {
  const contribution = state.contributions.find(c => c.id === id);
  if (!contribution) return;
  contribution.status = 'rejected';
  contribution.updatedAt = new Date().toISOString();
  save(KEYS.contributions, state.contributions);
  addNotification({ title: 'Contribution rejetée', message: `La contribution ${contribution.receiptNumber} nécessite une vérification.`, recipient: contribution.name, type: 'finance' });
  renderAll();
  showToast('Contribution marquée comme rejetée.', 'error');
}

function receiptStatus(status) {
  if (status === 'confirmed') return '<span class="status status-success">CONFIRMÉ</span>';
  if (status === 'rejected') return '<span class="status status-danger">REJETÉ</span>';
  return '<span class="status status-warning">EN ATTENTE</span>';
}

function openReceipt(id) {
  const c = state.contributions.find(item => item.id === id);
  if (!c) return;
  document.getElementById('receiptContent').innerHTML = `<div class="receipt">
    <div class="receipt-top"><div><h2>Ministère OS</h2><small>Reçu de contribution</small></div><div><strong>${escapeHTML(c.receiptNumber)}</strong><br><small>${escapeHTML(formatDate(new Date(c.createdAt).toISOString().slice(0,10)))}</small></div></div>
    <table class="receipt-table"><tbody>
      <tr><td>Contributeur</td><td>${escapeHTML(c.name)}</td></tr>
      <tr><td>Téléphone</td><td>${escapeHTML(c.phone)}</td></tr>
      <tr><td>Motif</td><td>${escapeHTML(c.purpose)}</td></tr>
      <tr><td>Référence transaction</td><td>${escapeHTML(c.reference)}</td></tr>
      <tr><td>Statut</td><td>${receiptStatus(c.status)}</td></tr>
    </tbody></table>
    <div class="receipt-total">${formatMoney(c.amount, c.currency || 'CDF')}</div>
    <p><small>Dernière mise à jour : ${escapeHTML(new Date(c.updatedAt).toLocaleString('fr-FR'))}</small></p>
  </div>`;
  document.getElementById('receiptModal').dataset.contributionId = id;
  openModal('receiptModal');
}

function renderMembers() {
  const query = document.getElementById('memberSearch').value.trim().toLowerCase();
  const rows = state.members.filter(m => `${m.name} ${m.phone} ${m.group}`.toLowerCase().includes(query));
  document.getElementById('membersTable').innerHTML = rows.length ? rows.map(m => `<tr>
    <td><strong>${escapeHTML(m.name)}</strong></td><td>${escapeHTML(m.phone || '—')}</td><td>${escapeHTML(m.group || '—')}</td>
    <td><span class="status ${m.status === 'Actif' ? 'status-success' : m.status === 'Nouveau' ? 'status-warning' : 'status-neutral'}">${escapeHTML(m.status)}</span></td>
    <td>${escapeHTML(formatDate(new Date(m.createdAt).toISOString().slice(0,10)))}</td><td>—</td></tr>`).join('') : '<tr><td colspan="6" class="empty">Aucun membre trouvé.</td></tr>';
}

function renderWorkers() {
  document.getElementById('workersTable').innerHTML = state.workers.length ? state.workers.map(w => `<tr>
    <td><strong>${escapeHTML(w.name)}</strong></td><td>${escapeHTML(w.role)}</td><td>${escapeHTML(w.phone || '—')}</td>
    <td><span class="status ${w.absences >= ABSENCE_THRESHOLD ? 'status-danger' : w.absences > 0 ? 'status-warning' : 'status-success'}">${w.absences || 0}</span></td>
    <td>${w.absences >= ABSENCE_THRESHOLD ? '<span class="status status-danger">À surveiller</span>' : '<span class="status status-success">Normal</span>'}</td>
    <td><div class="notification-actions"><button class="btn btn-danger" data-worker-action="absence" data-id="${escapeHTML(w.id)}">+ Absence</button><button class="btn btn-secondary" data-worker-action="reset" data-id="${escapeHTML(w.id)}">Réinitialiser</button></div></td>
  </tr>`).join('') : '<tr><td colspan="6" class="empty">Aucun ouvrier enregistré.</td></tr>';
}

function activityStatus(a) {
  const date = new Date(`${a.date}T${a.time}`);
  if (date.getTime() < Date.now()) return '<span class="status status-neutral">Passée</span>';
  return '<span class="status status-success">Programmée</span>';
}

function renderActivities() {
  const sorted = [...state.activities].sort((a,b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  document.getElementById('activitiesGrid').innerHTML = sorted.length ? sorted.map(a => `<article class="activity-card">
    <div class="panel-head"><span class="activity-date">${escapeHTML(formatDateTime(a.date, a.time))}</span>${activityStatus(a)}</div>
    <h3>${escapeHTML(a.name)}</h3><div class="activity-meta"><span>⌖ ${escapeHTML(a.place || 'Lieu non défini')}</span><span>👥 ${a.assignments.length} personne(s) affectée(s)</span></div>
    <div class="assignment-list">${a.assignments.length ? a.assignments.map(x => `<div class="assignment"><span><strong>${escapeHTML(x.role)}</strong> — ${escapeHTML(x.workerName)}</span><span class="response ${x.response === 'confirmed' ? 'confirmed' : x.response === 'unavailable' ? 'unavailable' : ''}">${x.response === 'confirmed' ? 'Confirmé' : x.response === 'unavailable' ? 'Indisponible' : 'En attente'}</span></div>`).join('') : '<small>Aucune affectation.</small>'}</div>
    <div class="form-actions"><button class="btn btn-danger" data-activity-delete="${escapeHTML(a.id)}">Supprimer</button></div>
  </article>`).join('') : '<div class="panel empty">Aucune activité programmée.</div>';
}

function renderContributions() {
  if (!isFinanceAllowed()) return;
  const confirmedContributions = state.contributions.filter(c => c.status === 'confirmed');
  const pendingContributions = state.contributions.filter(c => c.status === 'pending');
  document.getElementById('confirmedTotal').textContent = formatContributionTotals(confirmedContributions);
  document.getElementById('pendingTotal').textContent = formatContributionTotals(pendingContributions);
  document.getElementById('contributionCount').textContent = state.contributions.length;
  document.getElementById('contributionsTable').innerHTML = state.contributions.length ? state.contributions.map(c => `<tr>
    <td><strong>${escapeHTML(c.name)}</strong><br><small>${escapeHTML(c.purpose)}</small></td><td>${escapeHTML(c.phone)}</td><td>${formatMoney(c.amount, c.currency || 'CDF')}</td><td>${escapeHTML(c.reference)}</td>
    <td>${receiptStatus(c.status)}</td><td><button class="btn btn-secondary" data-receipt="${escapeHTML(c.id)}">Voir reçu</button></td>
    <td>${c.status === 'pending' ? `<div class="notification-actions"><button class="btn btn-primary" data-contribution-action="confirm" data-id="${escapeHTML(c.id)}">Confirmer</button><button class="btn btn-danger" data-contribution-action="reject" data-id="${escapeHTML(c.id)}">Rejeter</button></div>` : '—'}</td>
  </tr>`).join('') : '<tr><td colspan="7" class="empty">Aucune contribution.</td></tr>';
}

function renderAnnouncements() {
  document.getElementById('announcementsList').innerHTML = state.announcements.length ? state.announcements.map(a => `<article class="announcement"><span class="status status-neutral">${escapeHTML(a.type)}</span><h4>${escapeHTML(a.title)}</h4><p>${escapeHTML(a.message)}</p><small>${escapeHTML(new Date(a.createdAt).toLocaleString('fr-FR'))}</small></article>`).join('') : '<div class="empty">Aucune annonce publiée.</div>';
}

function renderDashboard() {
  const confirmed = state.contributions.filter(c => c.status === 'confirmed').reduce((sum,c) => sum + c.amount, 0);
  document.getElementById('dashMembers').textContent = state.members.length;
  document.getElementById('dashWorkers').textContent = state.workers.length;
  document.getElementById('dashActivities').textContent = state.activities.length;
  document.getElementById('dashContributions').textContent = formatMoney(confirmed);
  document.getElementById('currentDate').textContent = new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(new Date());
  const upcoming = [...state.activities].filter(a => new Date(`${a.date}T${a.time}`).getTime() >= Date.now()).sort((a,b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`)).slice(0,5);
  document.getElementById('upcomingActivities').innerHTML = upcoming.length ? upcoming.map(a => `<div class="notification-item"><strong>${escapeHTML(a.name)}</strong><p>${escapeHTML(formatDateTime(a.date,a.time))} · ${escapeHTML(a.place || 'Lieu non défini')}</p></div>`).join('') : '<div class="empty">Aucune activité à venir.</div>';
}

function renderDirect() {
  const live = state.live;
  const dot = document.getElementById('liveDot');
  const status = document.getElementById('liveStatusText');
  const title = document.getElementById('liveTitleDisplay');
  const platform = document.getElementById('livePlatformDisplay');
  const link = document.getElementById('liveLink');
  if (live?.online && /^https:\/\//i.test(live.url)) {
    document.querySelector('.live-status').classList.add('online');
    status.textContent = 'En direct'; title.textContent = live.title || 'Direct en cours'; platform.textContent = live.platform;
    link.href = live.url; link.classList.remove('disabled');
  } else {
    document.querySelector('.live-status').classList.remove('online');
    status.textContent = 'Hors ligne'; title.textContent = 'Aucun direct en cours'; platform.textContent = '—'; link.href = '#'; link.classList.add('disabled');
  }
}

function launchLive(event) {
  event.preventDefault();
  const platform = document.getElementById('livePlatform').value;
  const url = document.getElementById('liveUrl').value.trim();
  const title = document.getElementById('liveTitle').value.trim() || 'Direct en cours';
  if (!/^https:\/\//i.test(url)) { showToast('Le lien doit commencer par https://', 'error'); return; }
  state.live = { online: true, platform, url, title, startedAt: new Date().toISOString() };
  save(KEYS.live, state.live);
  addNotification({ title: `🔴 Direct en cours — ${platform}`, message: `${title}. La diffusion est maintenant disponible.`, recipient: 'Tous', type: 'live', link: url });
  renderDirect();
  showToast('Direct lancé et notification envoyée.');
}

function stopLive() {
  if (!state.live?.online) return;
  state.live = { ...state.live, online: false, stoppedAt: new Date().toISOString() };
  save(KEYS.live, state.live);
  addNotification({ title: 'Direct terminé', message: 'La diffusion en direct vient d’être arrêtée.', recipient: 'Tous', type: 'live' });
  renderDirect();
  showToast('Direct arrêté.');
}

function publishAnnouncement(event) {
  event.preventDefault();
  const title = document.getElementById('announcementTitle').value.trim();
  const message = document.getElementById('announcementMessage').value.trim();
  const type = document.getElementById('announcementType').value;
  if (!title || !message) return;
  state.announcements.unshift({ id: uid('announcement'), title, message, type, createdAt: new Date().toISOString() });
  save(KEYS.announcements, state.announcements);
  addNotification({ title, message, recipient: 'Tous', type: 'announcement' });
  event.target.reset();
  renderAnnouncements();
  showToast('Annonce publiée et notification créée.');
}

function renderStatistics() {
  const activeMembers = state.members.filter(m => m.status === 'Actif').length;
  const completed = state.activities.filter(a => new Date(`${a.date}T${a.time}`).getTime() < Date.now()).length;
  const unread = state.notifications.filter(n => !n.read).length;
  document.getElementById('statActiveMembers').textContent = activeMembers;
  document.getElementById('statWorkers').textContent = state.workers.length;
  document.getElementById('statCompletedActivities').textContent = completed;
  document.getElementById('statUnread').textContent = unread;
  const counts = Array.from({length:6}, (_, index) => {
    const date = new Date(); date.setMonth(date.getMonth() - (5-index));
    return { label: date.toLocaleDateString('fr-FR',{month:'short'}), year:date.getFullYear(), month:date.getMonth(), count:0 };
  });
  state.activities.forEach(a => { const d = new Date(`${a.date}T00:00:00`); const item = counts.find(c => c.year === d.getFullYear() && c.month === d.getMonth()); if(item) item.count++; });
  const max = Math.max(1, ...counts.map(c=>c.count));
  document.getElementById('monthlyStats').innerHTML = counts.map(c => `<div class="bar-row"><span>${escapeHTML(c.label)}</span><div class="bar"><i style="width:${Math.round(c.count/max*100)}%"></i></div><strong>${c.count}</strong></div>`).join('');
  const flagged = state.workers.filter(w => Number(w.absences) > 0).sort((a,b) => b.absences-a.absences);
  document.getElementById('absenceStats').innerHTML = flagged.length ? flagged.map(w => `<div class="absence-row"><span>${escapeHTML(w.name)}<br><small>${escapeHTML(w.role)}</small></span><strong>${w.absences} absence(s)</strong></div>`).join('') : '<div class="empty">Aucune absence enregistrée.</div>';
}

function renderAll() {
  refreshWorkerSelects();
  renderMembers(); renderWorkers(); renderActivities(); renderContributions(); renderAnnouncements(); renderNotifications(); renderDashboard(); renderDirect(); renderStatistics();
}

function seedDemo() {
  if (state.workers.length || state.members.length || state.activities.length || state.contributions.length) return;
  const today = new Date();
  const future = new Date(today); future.setDate(today.getDate() + 2);
  const date = future.toISOString().slice(0,10);
  const workers = [
    {id:uid('worker'),name:'Équipe Intercession',role:'Interprète',phone:'',absences:0,createdAt:new Date().toISOString()}
  ];
  state.workers.push(...workers);
  state.members.push({id:uid('member'),name:'Membre exemple',phone:'',group:'Général',status:'Actif',createdAt:new Date().toISOString()});
  const assignments = [
    {id:uid('assign'),role:'Orateur',workerId:workers[0].id,workerName:workers[0].name,response:'pending'},
    {id:uid('assign'),role:'Modérateur',workerId:workers[0].id,workerName:workers[0].name,response:'pending'}
  ];
  state.activities.push({id:uid('activity'),name:'Culte de démonstration',date,time:'15:00',place:'Salle principale',assignments,createdAt:new Date().toISOString()});
  save(KEYS.workers,state.workers); save(KEYS.members,state.members); save(KEYS.activities,state.activities);
}

function bindEvents() {
  document.getElementById('loginForm').addEventListener('submit', login);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.addEventListener('click', event => {
    const pageButton = event.target.closest('[data-page]');
    if (pageButton) { navigate(pageButton.dataset.page); return; }
    const close = event.target.closest('[data-close]');
    if (close) { closeModal(close.dataset.close); return; }
    const notifAction = event.target.closest('[data-notification-action]');
    if (notifAction) { respondToNotification(notifAction.dataset.id, notifAction.dataset.notificationAction === 'confirm' ? 'confirmed' : 'unavailable'); return; }
    const receipt = event.target.closest('[data-receipt]');
    if (receipt) { openReceipt(receipt.dataset.receipt); return; }
    const contributionAction = event.target.closest('[data-contribution-action]');
    if (contributionAction) { contributionAction.dataset.contributionAction === 'confirm' ? confirmContribution(contributionAction.dataset.id) : rejectContribution(contributionAction.dataset.id); return; }
    const workerAction = event.target.closest('[data-worker-action]');
    if (workerAction) { workerAction.dataset.workerAction === 'absence' ? recordAbsence(workerAction.dataset.id) : resetAbsences(workerAction.dataset.id); return; }
    const activityDelete = event.target.closest('[data-activity-delete]');
    if (activityDelete) { deleteActivity(activityDelete.dataset.activityDelete); return; }
  

  document.getElementById('openMemberModal').addEventListener('click', () => openModal('memberModal'));
  document.getElementById('openWorkerModal').addEventListener('click', () => openModal('workerModal'));
  document.getElementById('openActivityModal').addEventListener('click', () => {
  if (!isAdmin()) return;
  refreshWorkerSelects();
  openModal('activityModal');
});
  document.getElementById('openContributionModal').addEventListener('click', () => openModal('contributionModal'));
  document.getElementById('memberForm').addEventListener('submit', addMember);
  document.getElementById('workerForm').addEventListener('submit', addWorker);
  document.getElementById('activityForm').addEventListener('submit', addActivity);
  document.getElementById('contributionForm').addEventListener('submit', addContribution);
  document.getElementById('announcementForm').addEventListener('submit', publishAnnouncement);
  document.getElementById('liveForm').addEventListener('submit', launchLive);
  document.getElementById('stopLiveBtn').addEventListener('click', stopLive);
  document.getElementById('printReceipt').addEventListener('click', () => window.print());
  document.getElementById('memberSearch').addEventListener('input', renderMembers);
  document.getElementById('markAllRead').addEventListener('click', () => { state.notifications.filter(canSeeNotification).forEach(n => n.read = true); save(KEYS.notifications,state.notifications); renderNotifications(); showToast('Toutes les notifications sont lues.'); });
  document.getElementById('notificationBell').addEventListener('click', () => navigate('notifications'));
  document.getElementById('mobileMenu').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
  document.querySelectorAll('.modal').forEach(modal => modal.addEventListener('click', event => { if (event.target === modal) closeModal(modal.id); }));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') document.querySelectorAll('.modal.open').forEach(m => closeModal(m.id)); });
}

function init() {
  applyPermissions();
  seedDemo();
  bindEvents();
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
