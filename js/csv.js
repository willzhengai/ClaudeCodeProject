// === CSV Import/Export ===

const CSV = {
    exportDeals() {
        let deals = Store.getDeals();

        // Permission filter
        if (!ROLES[Auth.currentUser.role].canViewAll) {
            deals = deals.filter(d => d.advisorId === Auth.currentUser.id || d.createdBy === Auth.currentUser.id);
        }

        const headers = [
            'ID', 'Company Name', 'Website', 'Deal Stage', 'Lead Source',
            'Deal Created', 'Stage Changed', 'Advisor Name', 'Estimated AUM',
            'Notes', 'Created By', 'Last Modified By', 'Last Modified At',
            // Salesforce mapping columns
            'SF_Account_Name', 'SF_StageName', 'SF_LeadSource', 'SF_Amount'
        ];

        const rows = deals.map(d => [
            d.id,
            d.companyName,
            d.website || '',
            stageLabel(d.dealStage),
            d.leadSource || '',
            d.dealCreated || '',
            d.stageChanged || '',
            d.advisorName || '',
            d.estimatedAUM || 0,
            d.notes || '',
            Store.getUser(d.createdBy)?.name || d.createdBy || '',
            Store.getUser(d.lastModifiedBy)?.name || d.lastModifiedBy || '',
            d.lastModifiedAt || '',
            // SF mapping columns (same data, labeled for SF import)
            d.companyName,
            stageLabel(d.dealStage),
            d.leadSource || '',
            d.estimatedAUM || 0
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `401k_deals_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Exported ${deals.length} deals`, 'success');
    },

    importDeals(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const rows = this.parseCSV(text);
                if (rows.length < 2) {
                    showToast('CSV file is empty or has no data rows', 'error');
                    return;
                }

                const headers = rows[0].map(h => h.trim().toLowerCase());
                const deals = [];

                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (row.length < 2) continue;

                    const getValue = (names) => {
                        for (const name of names) {
                            const idx = headers.indexOf(name.toLowerCase());
                            if (idx >= 0 && row[idx]) return row[idx].trim();
                        }
                        return '';
                    };

                    const stageName = getValue(['deal stage', 'stage', 'stagename', 'sf_stagename']);
                    const stageObj = DEAL_STAGES.find(s =>
                        s.label.toLowerCase() === stageName.toLowerCase() ||
                        s.id === stageName.toLowerCase()
                    );

                    deals.push({
                        id: getValue(['id', 'external_id', 'sf_external_id']) || generateId(),
                        companyName: getValue(['company name', 'company', 'account name', 'sf_account_name']),
                        website: getValue(['website', 'url']),
                        dealStage: stageObj ? stageObj.id : 'prospect',
                        leadSource: getValue(['lead source', 'source', 'leadsource', 'sf_leadsource']),
                        dealCreated: getValue(['deal created', 'created date', 'createddate']) || new Date().toISOString().split('T')[0],
                        stageChanged: getValue(['stage changed', 'last stage change']) || new Date().toISOString().split('T')[0],
                        advisorName: getValue(['advisor name', 'advisor', 'owner']),
                        advisorId: this.findAdvisorId(getValue(['advisor name', 'advisor', 'owner'])),
                        estimatedAUM: parseFloat(getValue(['estimated aum', 'aum', 'amount', 'sf_amount']).replace(/[,$]/g, '')) || 0,
                        notes: getValue(['notes', 'description'])
                    });
                }

                const validDeals = deals.filter(d => d.companyName);
                if (validDeals.length === 0) {
                    showToast('No valid deals found in CSV. Ensure "Company Name" column exists.', 'error');
                    return;
                }

                const count = Store.importDeals(validDeals, Auth.currentUser.id);
                Deals.render();
                Pipeline.render();
                showToast(`Imported ${count} deals`, 'success');
            } catch (err) {
                showToast('Error parsing CSV: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    },

    findAdvisorId(name) {
        if (!name) return Auth.currentUser.id;
        const user = Store.getUsers().find(u => u.name.toLowerCase() === name.toLowerCase());
        return user ? user.id : Auth.currentUser.id;
    },

    parseCSV(text) {
        const rows = [];
        let current = [];
        let field = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const next = text[i + 1];

            if (inQuotes) {
                if (char === '"' && next === '"') {
                    field += '"';
                    i++;
                } else if (char === '"') {
                    inQuotes = false;
                } else {
                    field += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',') {
                    current.push(field);
                    field = '';
                } else if (char === '\n' || (char === '\r' && next === '\n')) {
                    current.push(field);
                    field = '';
                    rows.push(current);
                    current = [];
                    if (char === '\r') i++;
                } else {
                    field += char;
                }
            }
        }
        if (field || current.length > 0) {
            current.push(field);
            rows.push(current);
        }
        return rows;
    }
};
