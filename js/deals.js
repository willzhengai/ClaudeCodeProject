// === Deals Management ===

const Deals = {
    sortField: 'dealCreated',
    sortDir: 'desc',

    render() {
        this.populateFilters();
        this.renderTable();
    },

    populateFilters() {
        const stageSelect = document.getElementById('filterStage');
        const advisorSelect = document.getElementById('filterAdvisor');
        const sourceSelect = document.getElementById('filterSource');

        // Stages
        if (stageSelect.options.length <= 1) {
            DEAL_STAGES.forEach(s => {
                stageSelect.add(new Option(s.label, s.id));
            });
        }

        // Advisors
        const currentAdvisorVal = advisorSelect.value;
        while (advisorSelect.options.length > 1) advisorSelect.remove(1);
        const users = Store.getUsers();
        users.forEach(u => {
            advisorSelect.add(new Option(u.name, u.id));
        });
        advisorSelect.value = currentAdvisorVal;

        // Sources
        if (sourceSelect.options.length <= 1) {
            LEAD_SOURCES.forEach(s => {
                sourceSelect.add(new Option(s, s));
            });
        }
    },

    getFilteredDeals() {
        let deals = Store.getDeals();

        // Permission filter
        if (!ROLES[Auth.currentUser.role].canViewAll) {
            deals = deals.filter(d => d.advisorId === Auth.currentUser.id || d.createdBy === Auth.currentUser.id);
        }

        const search = document.getElementById('searchDeals').value.toLowerCase();
        const stage = document.getElementById('filterStage').value;
        const advisor = document.getElementById('filterAdvisor').value;
        const source = document.getElementById('filterSource').value;

        if (search) {
            deals = deals.filter(d =>
                d.companyName.toLowerCase().includes(search) ||
                (d.advisorName || '').toLowerCase().includes(search) ||
                (d.website || '').toLowerCase().includes(search)
            );
        }
        if (stage) deals = deals.filter(d => d.dealStage === stage);
        if (advisor) deals = deals.filter(d => d.advisorId === advisor);
        if (source) deals = deals.filter(d => d.leadSource === source);

        // Sort
        deals.sort((a, b) => {
            let va = a[this.sortField] || '';
            let vb = b[this.sortField] || '';
            if (this.sortField === 'estimatedAUM') {
                va = Number(va) || 0;
                vb = Number(vb) || 0;
            }
            if (va < vb) return this.sortDir === 'asc' ? -1 : 1;
            if (va > vb) return this.sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return deals;
    },

    renderTable() {
        const tbody = document.getElementById('dealsTableBody');
        const deals = this.getFilteredDeals();

        if (deals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted)">No deals found. Click "+ New Deal" to add one.</td></tr>';
            return;
        }

        tbody.innerHTML = deals.map(d => {
            const canEdit = Auth.canEditDeal(d);
            const canDelete = Auth.canDeleteDeal(d);
            return `<tr data-id="${d.id}">
                <td>
                    <strong>${this.escHtml(d.companyName)}</strong>
                    ${d.website ? `<br><a href="${this.escHtml(d.website)}" target="_blank" style="font-size:0.75rem;color:var(--primary)">${this.escHtml(d.website)}</a>` : ''}
                </td>
                <td><span class="stage-badge ${stageClass(d.dealStage)}">${stageLabel(d.dealStage)}</span></td>
                <td>${this.escHtml(d.advisorName || '')}</td>
                <td>${formatCurrency(d.estimatedAUM)}</td>
                <td>${this.escHtml(d.leadSource || '')}</td>
                <td>${formatDate(d.dealCreated)}</td>
                <td>${formatDate(d.stageChanged)}</td>
                <td class="action-btns">
                    ${canEdit ? `<button class="btn btn-sm btn-outline" onclick="Deals.edit('${d.id}')">Edit</button>` : ''}
                    ${canDelete ? `<button class="btn btn-sm btn-danger" onclick="Deals.remove('${d.id}')">Del</button>` : ''}
                </td>
            </tr>`;
        }).join('');
    },

    openNew() {
        document.getElementById('dealModalTitle').textContent = 'New Deal';
        document.getElementById('dealId').value = '';
        document.getElementById('dealCompany').value = '';
        document.getElementById('dealWebsite').value = '';
        document.getElementById('dealAUM').value = '';
        document.getElementById('dealNotes').value = '';
        document.getElementById('dealCreatedDate').value = new Date().toISOString().split('T')[0];

        // Populate dropdowns
        this.populateDealForm();

        document.getElementById('dealStage').value = 'prospect';
        document.getElementById('dealSource').value = 'Referral';
        document.getElementById('dealAdvisor').value = Auth.currentUser.id;

        document.getElementById('dealModal').classList.remove('hidden');
    },

    edit(id) {
        const deal = Store.getDeal(id);
        if (!deal) return;
        if (!Auth.canEditDeal(deal)) {
            showToast('You do not have permission to edit this deal', 'error');
            return;
        }

        document.getElementById('dealModalTitle').textContent = 'Edit Deal';
        document.getElementById('dealId').value = deal.id;
        document.getElementById('dealCompany').value = deal.companyName;
        document.getElementById('dealWebsite').value = deal.website || '';
        document.getElementById('dealAUM').value = deal.estimatedAUM || '';
        document.getElementById('dealNotes').value = deal.notes || '';
        document.getElementById('dealCreatedDate').value = deal.dealCreated || '';

        this.populateDealForm();

        document.getElementById('dealStage').value = deal.dealStage;
        document.getElementById('dealSource').value = deal.leadSource || '';
        document.getElementById('dealAdvisor').value = deal.advisorId || '';

        document.getElementById('dealModal').classList.remove('hidden');
    },

    populateDealForm() {
        const stageSelect = document.getElementById('dealStage');
        const sourceSelect = document.getElementById('dealSource');
        const advisorSelect = document.getElementById('dealAdvisor');

        stageSelect.innerHTML = '';
        DEAL_STAGES.forEach(s => stageSelect.add(new Option(s.label, s.id)));

        sourceSelect.innerHTML = '';
        LEAD_SOURCES.forEach(s => sourceSelect.add(new Option(s, s)));

        advisorSelect.innerHTML = '';
        Store.getUsers().forEach(u => advisorSelect.add(new Option(u.name, u.id)));
    },

    save() {
        const companyName = document.getElementById('dealCompany').value.trim();
        if (!companyName) {
            showToast('Company name is required', 'error');
            return;
        }

        const id = document.getElementById('dealId').value || generateId();
        const advisorId = document.getElementById('dealAdvisor').value;
        const advisor = Store.getUser(advisorId);

        const deal = {
            id,
            companyName,
            website: document.getElementById('dealWebsite').value.trim(),
            dealStage: document.getElementById('dealStage').value,
            leadSource: document.getElementById('dealSource').value,
            dealCreated: document.getElementById('dealCreatedDate').value,
            advisorId: advisorId,
            advisorName: advisor ? advisor.name : '',
            estimatedAUM: parseFloat(document.getElementById('dealAUM').value) || 0,
            notes: document.getElementById('dealNotes').value.trim()
        };

        // Preserve existing fields on edit
        const existing = Store.getDeal(id);
        if (existing) {
            deal.stageChanged = existing.stageChanged;
            deal.createdBy = existing.createdBy;
        }

        Store.saveDeal(deal, Auth.currentUser.id);
        document.getElementById('dealModal').classList.add('hidden');
        this.render();
        Pipeline.render();
        showToast(existing ? 'Deal updated' : 'Deal created', 'success');
    },

    remove(id) {
        if (!confirm('Are you sure you want to delete this deal?')) return;
        Store.deleteDeal(id, Auth.currentUser.id);
        this.render();
        Pipeline.render();
        showToast('Deal deleted', 'success');
    },

    sort(field) {
        if (this.sortField === field) {
            this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDir = 'asc';
        }
        this.renderTable();
    },

    escHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
