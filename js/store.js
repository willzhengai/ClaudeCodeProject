// === LocalStorage Store with Audit Trail ===

const Store = {
    _prefix: 'crm401k_',

    _get(key) {
        try {
            const data = localStorage.getItem(this._prefix + key);
            return data ? JSON.parse(data) : null;
        } catch { return null; }
    },

    _set(key, value) {
        localStorage.setItem(this._prefix + key, JSON.stringify(value));
    },

    init() {
        if (!this._get('initialized')) {
            this._set('users', DEFAULT_USERS);
            this._set('deals', DEFAULT_DEALS);
            this._set('auditLog', []);
            this._set('automations', {
                weeklyEmail: { enabled: true, day: 5, time: '09:00',
                    subject: 'Weekly Deal Update - Please Report New Deals & Changes',
                    body: document.getElementById('autoBody')?.value || '' },
                stageNotify: true,
                closedWonNotify: true
            });
            this._set('initialized', true);
        }
    },

    // Users
    getUsers() { return this._get('users') || []; },
    getUser(id) { return this.getUsers().find(u => u.id === id); },
    saveUser(user) {
        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === user.id);
        if (idx >= 0) users[idx] = user;
        else users.push(user);
        this._set('users', users);
    },
    deleteUser(id) {
        this._set('users', this.getUsers().filter(u => u.id !== id));
    },

    // Deals
    getDeals() { return this._get('deals') || []; },
    getDeal(id) { return this.getDeals().find(d => d.id === id); },

    saveDeal(deal, currentUserId) {
        const deals = this.getDeals();
        const idx = deals.findIndex(d => d.id === deal.id);
        const now = new Date().toISOString();

        if (idx >= 0) {
            // Track changes for audit
            const old = deals[idx];
            const fields = ['companyName','website','dealStage','leadSource','advisorName','advisorId','estimatedAUM','notes'];
            fields.forEach(field => {
                if (String(old[field] || '') !== String(deal[field] || '')) {
                    this.addAuditEntry({
                        dealId: deal.id,
                        dealName: deal.companyName,
                        userId: currentUserId,
                        action: 'update',
                        field: field,
                        oldValue: old[field],
                        newValue: deal[field]
                    });
                }
            });

            // Track stage change date
            if (old.dealStage !== deal.dealStage) {
                deal.stageChanged = now.split('T')[0];
            }

            deal.lastModifiedBy = currentUserId;
            deal.lastModifiedAt = now;
            deals[idx] = deal;
        } else {
            deal.createdBy = currentUserId;
            deal.lastModifiedBy = currentUserId;
            deal.lastModifiedAt = now;
            if (!deal.dealCreated) deal.dealCreated = now.split('T')[0];
            if (!deal.stageChanged) deal.stageChanged = deal.dealCreated;
            deals.push(deal);
            this.addAuditEntry({
                dealId: deal.id,
                dealName: deal.companyName,
                userId: currentUserId,
                action: 'create',
                field: '',
                oldValue: '',
                newValue: 'New deal created'
            });
        }
        this._set('deals', deals);
    },

    deleteDeal(id, currentUserId) {
        const deal = this.getDeal(id);
        if (deal) {
            this.addAuditEntry({
                dealId: id,
                dealName: deal.companyName,
                userId: currentUserId,
                action: 'delete',
                field: '',
                oldValue: deal.companyName,
                newValue: ''
            });
        }
        this._set('deals', this.getDeals().filter(d => d.id !== id));
    },

    // Audit Log
    getAuditLog() { return this._get('auditLog') || []; },
    addAuditEntry(entry) {
        const log = this.getAuditLog();
        log.unshift({
            id: generateId(),
            timestamp: new Date().toISOString(),
            userName: this.getUser(entry.userId)?.name || entry.userId,
            ...entry
        });
        // Keep last 1000 entries
        if (log.length > 1000) log.length = 1000;
        this._set('auditLog', log);
    },

    // Automations
    getAutomations() { return this._get('automations') || {}; },
    saveAutomations(settings) { this._set('automations', settings); },

    // Bulk import
    importDeals(deals, currentUserId) {
        let imported = 0;
        deals.forEach(d => {
            if (!d.companyName) return;
            if (!d.id) d.id = generateId();
            this.saveDeal(d, currentUserId);
            imported++;
        });
        return imported;
    },

    // Export all data (for Salesforce migration)
    exportAll() {
        return {
            deals: this.getDeals(),
            users: this.getUsers(),
            auditLog: this.getAuditLog(),
            exportDate: new Date().toISOString(),
            fieldMapping: SF_FIELD_MAP
        };
    }
};
