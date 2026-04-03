// === Main App Controller ===

function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type;
    setTimeout(() => toast.className = 'toast hidden', 3000);
}

const App = {
    init() {
        Store.init();

        // Try restore session
        if (Auth.restore()) {
            this.showApp();
        } else {
            this.showLogin();
        }

        this.bindEvents();
    },

    showLogin() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');

        // Populate user dropdown
        const select = document.getElementById('loginUser');
        select.innerHTML = '';
        Store.getUsers().forEach(u => {
            select.add(new Option(`${u.name} (${u.role})`, u.id));
        });
    },

    showApp() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('currentUser').textContent = `${Auth.currentUser.name} (${Auth.currentUser.role})`;

        // Show/hide admin tab
        document.getElementById('adminTab').classList.toggle('hidden', !Auth.canManageUsers());

        this.switchView('deals');
    },

    switchView(viewName) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

        document.getElementById(viewName + 'View').classList.add('active');
        document.querySelector(`.nav-tab[data-view="${viewName}"]`)?.classList.add('active');

        if (viewName === 'deals') Deals.render();
        else if (viewName === 'pipeline') Pipeline.render();
        else if (viewName === 'dashboard') Dashboard.render();
        else if (viewName === 'admin') this.renderAdmin();
        else if (viewName === 'automations') this.loadAutomationSettings();
    },

    renderAdmin() {
        if (!Auth.canManageUsers()) {
            showToast('Access denied', 'error');
            return;
        }
        this.renderUsersTable();
        this.renderAuditLog();
    },

    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        const users = Store.getUsers();
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${Deals.escHtml(u.name)}</td>
                <td>${Deals.escHtml(u.email)}</td>
                <td><span class="stage-badge ${u.role === 'admin' ? 'stage-closed-won' : u.role === 'manager' ? 'stage-proposal' : 'stage-qualified'}">${ROLES[u.role]?.label || u.role}</span></td>
                <td class="action-btns">
                    <button class="btn btn-sm btn-outline" onclick="App.editUser('${u.id}')">Edit</button>
                    ${u.id !== Auth.currentUser.id ? `<button class="btn btn-sm btn-danger" onclick="App.deleteUser('${u.id}')">Del</button>` : ''}
                </td>
            </tr>
        `).join('');
    },

    renderAuditLog() {
        const tbody = document.getElementById('auditTableBody');
        const search = (document.getElementById('auditSearch')?.value || '').toLowerCase();
        let log = Store.getAuditLog();

        if (search) {
            log = log.filter(e =>
                (e.userName || '').toLowerCase().includes(search) ||
                (e.dealName || '').toLowerCase().includes(search) ||
                (e.action || '').toLowerCase().includes(search) ||
                (e.field || '').toLowerCase().includes(search)
            );
        }

        // Show last 200
        log = log.slice(0, 200);

        tbody.innerHTML = log.map(e => `
            <tr>
                <td style="white-space:nowrap;font-size:0.8rem">${new Date(e.timestamp).toLocaleString()}</td>
                <td>${Deals.escHtml(e.userName || '')}</td>
                <td>${Deals.escHtml(e.dealName || '')}</td>
                <td><span class="stage-badge ${e.action === 'create' ? 'stage-closed-won' : e.action === 'delete' ? 'stage-closed-lost' : 'stage-proposal'}">${e.action}</span></td>
                <td>${Deals.escHtml(e.field || '')}</td>
                <td style="font-size:0.8rem">${Deals.escHtml(String(e.oldValue || ''))}</td>
                <td style="font-size:0.8rem">${Deals.escHtml(String(e.newValue || ''))}</td>
            </tr>
        `).join('');
    },

    // User CRUD
    openNewUser() {
        document.getElementById('userModalTitle').textContent = 'Add User';
        document.getElementById('userId').value = '';
        document.getElementById('userName').value = '';
        document.getElementById('userEmail').value = '';
        document.getElementById('userRole').value = 'advisor';
        document.getElementById('userModal').classList.remove('hidden');
    },

    editUser(id) {
        const user = Store.getUser(id);
        if (!user) return;
        document.getElementById('userModalTitle').textContent = 'Edit User';
        document.getElementById('userId').value = user.id;
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userRole').value = user.role;
        document.getElementById('userModal').classList.remove('hidden');
    },

    saveUser() {
        const name = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        if (!name || !email) {
            showToast('Name and email are required', 'error');
            return;
        }

        const user = {
            id: document.getElementById('userId').value || generateId(),
            name,
            email,
            role: document.getElementById('userRole').value
        };

        Store.saveUser(user);
        document.getElementById('userModal').classList.add('hidden');
        this.renderUsersTable();
        showToast('User saved', 'success');
    },

    deleteUser(id) {
        if (!confirm('Are you sure you want to delete this user?')) return;
        Store.deleteUser(id);
        this.renderUsersTable();
        showToast('User deleted', 'success');
    },

    // Automations
    loadAutomationSettings() {
        const settings = Store.getAutomations();
        if (settings.weeklyEmail) {
            document.getElementById('autoDay').value = settings.weeklyEmail.day || 5;
            document.getElementById('autoTime').value = settings.weeklyEmail.time || '09:00';
            document.getElementById('autoSubject').value = settings.weeklyEmail.subject || '';
            if (settings.weeklyEmail.body) {
                document.getElementById('autoBody').value = settings.weeklyEmail.body;
            }
            document.getElementById('autoEnabled').checked = settings.weeklyEmail.enabled !== false;
        }
        document.getElementById('stageNotifyEnabled').checked = settings.stageNotify !== false;
        document.getElementById('closedWonNotify').checked = settings.closedWonNotify !== false;
    },

    saveAutomations() {
        const settings = {
            weeklyEmail: {
                enabled: document.getElementById('autoEnabled').checked,
                day: parseInt(document.getElementById('autoDay').value),
                time: document.getElementById('autoTime').value,
                subject: document.getElementById('autoSubject').value,
                body: document.getElementById('autoBody').value
            },
            stageNotify: document.getElementById('stageNotifyEnabled').checked,
            closedWonNotify: document.getElementById('closedWonNotify').checked
        };
        Store.saveAutomations(settings);
        showToast('Automation settings saved', 'success');
    },

    sendTestEmail() {
        // Simulate sending test email
        const advisorDeals = Store.getDeals().filter(d => d.advisorId === Auth.currentUser.id);
        const totalAUM = advisorDeals.reduce((s, d) => s + (Number(d.estimatedAUM) || 0), 0);

        let body = document.getElementById('autoBody').value;
        body = body.replace('{{advisor_name}}', Auth.currentUser.name);
        body = body.replace('{{crm_link}}', window.location.href);
        body = body.replace('{{deal_count}}', advisorDeals.length);
        body = body.replace('{{pipeline_aum}}', formatCurrency(totalAUM));

        // In a real implementation, this would call an email API
        alert(`Test Email Preview:\n\nTo: ${Auth.currentUser.email}\nSubject: ${document.getElementById('autoSubject').value}\n\n${body}`);
        showToast('Test email preview shown (email sending requires backend integration)', 'success');
    },

    bindEvents() {
        // Login
        document.getElementById('loginBtn').addEventListener('click', () => {
            const userId = document.getElementById('loginUser').value;
            if (Auth.login(userId)) {
                this.showApp();
            }
        });

        document.getElementById('loginPass').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('loginBtn').click();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            Auth.logout();
            this.showLogin();
        });

        // Navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchView(tab.dataset.view);
            });
        });

        // Deal CRUD
        document.getElementById('newDealBtn').addEventListener('click', () => Deals.openNew());
        document.getElementById('saveDealBtn').addEventListener('click', () => Deals.save());
        document.getElementById('cancelDealBtn').addEventListener('click', () => {
            document.getElementById('dealModal').classList.add('hidden');
        });
        document.getElementById('closeDealModal').addEventListener('click', () => {
            document.getElementById('dealModal').classList.add('hidden');
        });

        // Deal filters & sort
        document.getElementById('searchDeals').addEventListener('input', () => Deals.renderTable());
        document.getElementById('filterStage').addEventListener('change', () => Deals.renderTable());
        document.getElementById('filterAdvisor').addEventListener('change', () => Deals.renderTable());
        document.getElementById('filterSource').addEventListener('change', () => Deals.renderTable());

        document.querySelectorAll('#dealsTable th[data-sort]').forEach(th => {
            th.addEventListener('click', () => Deals.sort(th.dataset.sort));
        });

        // CSV
        document.getElementById('exportCsvBtn').addEventListener('click', () => CSV.exportDeals());
        document.getElementById('importCsvBtn').addEventListener('click', () => {
            document.getElementById('csvFileInput').click();
        });
        document.getElementById('csvFileInput').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                CSV.importDeals(e.target.files[0]);
                e.target.value = '';
            }
        });

        // User CRUD
        document.getElementById('addUserBtn').addEventListener('click', () => this.openNewUser());
        document.getElementById('saveUserBtn').addEventListener('click', () => this.saveUser());
        document.getElementById('cancelUserBtn').addEventListener('click', () => {
            document.getElementById('userModal').classList.add('hidden');
        });
        document.getElementById('closeUserModal').addEventListener('click', () => {
            document.getElementById('userModal').classList.add('hidden');
        });

        // Automations
        document.getElementById('saveAutoBtn').addEventListener('click', () => this.saveAutomations());
        document.getElementById('testAutoBtn').addEventListener('click', () => this.sendTestEmail());

        // Dashboard period
        document.getElementById('dashboardPeriod').addEventListener('change', () => Dashboard.render());

        // Audit search
        document.getElementById('auditSearch')?.addEventListener('input', () => this.renderAuditLog());

        // Modal overlay close
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', () => {
                overlay.parentElement.classList.add('hidden');
            });
        });
    }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
