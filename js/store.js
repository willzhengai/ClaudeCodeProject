// === Supabase Store with Audit Trail ===

const Store = {
    // Cache to minimize DB calls
    _cache: { users: null, deals: null },

    async init() {
        // Pre-load cache
        await Promise.all([this.getUsers(), this.getDeals()]);
    },

    // Users
    async getUsers() {
        const { data, error } = await db.from('crm_users').select('*').order('name');
        if (error) { console.error('getUsers error:', error); return this._cache.users || []; }
        this._cache.users = data.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
        return this._cache.users;
    },

    async getUser(id) {
        const users = this._cache.users || await this.getUsers();
        return users.find(u => u.id === id);
    },

    async saveUser(user) {
        const { error } = await db.from('crm_users').upsert({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        });
        if (error) { console.error('saveUser error:', error); return; }
        this._cache.users = null;
    },

    async deleteUser(id) {
        const { error } = await db.from('crm_users').delete().eq('id', id);
        if (error) console.error('deleteUser error:', error);
        this._cache.users = null;
    },

    // Deals
    async getDeals() {
        const { data, error } = await db.from('deals').select('*').order('deal_created', { ascending: false });
        if (error) { console.error('getDeals error:', error); return this._cache.deals || []; }
        this._cache.deals = data.map(d => ({
            id: d.id,
            companyName: d.company_name,
            website: d.website,
            dealStage: d.deal_stage,
            leadSource: d.lead_source,
            dealCreated: d.deal_created,
            stageChanged: d.stage_changed,
            advisorId: d.advisor_id,
            advisorName: d.advisor_name,
            estimatedAUM: Number(d.estimated_aum) || 0,
            notes: d.notes,
            createdBy: d.created_by,
            lastModifiedBy: d.last_modified_by,
            lastModifiedAt: d.last_modified_at
        }));
        return this._cache.deals;
    },

    async getDeal(id) {
        const deals = this._cache.deals || await this.getDeals();
        return deals.find(d => d.id === id);
    },

    async saveDeal(deal, currentUserId) {
        const now = new Date().toISOString();
        const existing = await this.getDeal(deal.id);

        if (existing) {
            // Track changes for audit
            const fields = ['companyName','website','dealStage','leadSource','advisorName','advisorId','estimatedAUM','notes'];
            for (const field of fields) {
                if (String(existing[field] || '') !== String(deal[field] || '')) {
                    await this.addAuditEntry({
                        dealId: deal.id,
                        dealName: deal.companyName,
                        userId: currentUserId,
                        action: 'update',
                        field: field,
                        oldValue: existing[field],
                        newValue: deal[field]
                    });
                }
            }

            // Track stage change date
            if (existing.dealStage !== deal.dealStage) {
                deal.stageChanged = now.split('T')[0];
            }
            deal.lastModifiedBy = currentUserId;
            deal.lastModifiedAt = now;
        } else {
            deal.createdBy = currentUserId;
            deal.lastModifiedBy = currentUserId;
            deal.lastModifiedAt = now;
            if (!deal.dealCreated) deal.dealCreated = now.split('T')[0];
            if (!deal.stageChanged) deal.stageChanged = deal.dealCreated;

            await this.addAuditEntry({
                dealId: deal.id,
                dealName: deal.companyName,
                userId: currentUserId,
                action: 'create',
                field: '',
                oldValue: '',
                newValue: 'New deal created'
            });
        }

        const { error } = await db.from('deals').upsert({
            id: deal.id,
            company_name: deal.companyName,
            website: deal.website || null,
            deal_stage: deal.dealStage,
            lead_source: deal.leadSource || null,
            deal_created: deal.dealCreated || null,
            stage_changed: deal.stageChanged || null,
            advisor_id: deal.advisorId || null,
            advisor_name: deal.advisorName || null,
            estimated_aum: deal.estimatedAUM || 0,
            notes: deal.notes || null,
            created_by: deal.createdBy || null,
            last_modified_by: deal.lastModifiedBy || null,
            last_modified_at: deal.lastModifiedAt || null
        });
        if (error) console.error('saveDeal error:', error);
        this._cache.deals = null;
    },

    async deleteDeal(id, currentUserId) {
        const deal = await this.getDeal(id);
        if (deal) {
            await this.addAuditEntry({
                dealId: id,
                dealName: deal.companyName,
                userId: currentUserId,
                action: 'delete',
                field: '',
                oldValue: deal.companyName,
                newValue: ''
            });
        }
        const { error } = await db.from('deals').delete().eq('id', id);
        if (error) console.error('deleteDeal error:', error);
        this._cache.deals = null;
    },

    // Audit Log
    async getAuditLog() {
        const { data, error } = await db.from('audit_log').select('*').order('timestamp', { ascending: false }).limit(200);
        if (error) { console.error('getAuditLog error:', error); return []; }
        return data.map(e => ({
            id: e.id,
            timestamp: e.timestamp,
            userId: e.user_id,
            userName: e.user_name,
            dealId: e.deal_id,
            dealName: e.deal_name,
            action: e.action,
            field: e.field,
            oldValue: e.old_value,
            newValue: e.new_value
        }));
    },

    async addAuditEntry(entry) {
        const user = await this.getUser(entry.userId);
        const { error } = await db.from('audit_log').insert({
            id: generateId(),
            timestamp: new Date().toISOString(),
            user_id: entry.userId,
            user_name: user?.name || entry.userId,
            deal_id: entry.dealId,
            deal_name: entry.dealName,
            action: entry.action,
            field: entry.field || null,
            old_value: String(entry.oldValue ?? ''),
            new_value: String(entry.newValue ?? '')
        });
        if (error) console.error('addAuditEntry error:', error);
    },

    // Automations
    async getAutomations() {
        const { data, error } = await db.from('automations').select('settings').eq('id', 1).single();
        if (error || !data) return {};
        return data.settings;
    },

    async saveAutomations(settings) {
        const { error } = await db.from('automations').upsert({ id: 1, settings, updated_at: new Date().toISOString() });
        if (error) console.error('saveAutomations error:', error);
    },

    // Bulk import
    async importDeals(deals, currentUserId) {
        let imported = 0;
        for (const d of deals) {
            if (!d.companyName) continue;
            if (!d.id) d.id = generateId();
            await this.saveDeal(d, currentUserId);
            imported++;
        }
        return imported;
    },

    // Export all data
    async exportAll() {
        const [deals, users, auditLog] = await Promise.all([
            this.getDeals(),
            this.getUsers(),
            this.getAuditLog()
        ]);
        return {
            deals,
            users,
            auditLog,
            exportDate: new Date().toISOString(),
            fieldMapping: SF_FIELD_MAP
        };
    }
};
