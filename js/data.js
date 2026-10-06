// === Data Model & Constants ===
// Designed to mirror Salesforce Opportunity object fields for easy sync

const DEAL_STAGES = [
    { id: 'prospect', label: 'Prospect', order: 1 },
    { id: 'qualified', label: 'Qualified', order: 2 },
    { id: 'proposal', label: 'Proposal', order: 3 },
    { id: 'negotiation', label: 'Negotiation', order: 4 },
    { id: 'closed-won', label: 'Closed Won', order: 5 },
    { id: 'closed-lost', label: 'Closed Lost', order: 6 }
];

const LEAD_SOURCES = [
    'Referral',
    'Cold Call',
    'Website',
    'Conference',
    'Partner',
    'Existing Client',
    'Marketing Campaign',
    'Other'
];

const ROLES = {
    admin: { label: 'Admin', canEditAll: true, canViewAll: true, canManageUsers: true },
    manager: { label: 'Manager', canEditAll: false, canViewAll: true, canManageUsers: false },
    advisor: { label: 'Advisor', canEditAll: false, canViewAll: false, canManageUsers: false }
};

// Salesforce field mapping for future integration
const SF_FIELD_MAP = {
    companyName: 'Account.Name',
    website: 'Account.Website',
    dealStage: 'StageName',
    leadSource: 'LeadSource',
    dealCreated: 'CreatedDate',
    stageChanged: 'LastStageChangeDate__c',
    advisorName: 'Owner.Name',
    estimatedAUM: 'Amount',
    notes: 'Description',
    id: 'External_Id__c'
};

// Default seed data
const DEFAULT_USERS = [
    { id: 'u1', name: 'Sarah Johnson', email: 'sarah@advisory.com', role: 'admin' },
    { id: 'u2', name: 'Mike Chen', email: 'mike@advisory.com', role: 'advisor' },
    { id: 'u3', name: 'Lisa Park', email: 'lisa@advisory.com', role: 'advisor' },
    { id: 'u4', name: 'David Kim', email: 'david@advisory.com', role: 'manager' }
];

const DEFAULT_DEALS = [
    {
        id: 'd1', companyName: 'Acme Manufacturing', website: 'https://acme.com',
        dealStage: 'proposal', leadSource: 'Referral', dealCreated: '2026-03-01',
        stageChanged: '2026-03-20', advisorId: 'u2', advisorName: 'Mike Chen',
        estimatedAUM: 5000000, notes: 'Large manufacturing company, 200+ employees',
        createdBy: 'u2', lastModifiedBy: 'u2', lastModifiedAt: '2026-03-20T10:00:00Z'
    },
    {
        id: 'd2', companyName: 'TechFlow Inc', website: 'https://techflow.io',
        dealStage: 'qualified', leadSource: 'Website', dealCreated: '2026-03-10',
        stageChanged: '2026-03-15', advisorId: 'u3', advisorName: 'Lisa Park',
        estimatedAUM: 3200000, notes: 'Fast-growing tech startup',
        createdBy: 'u3', lastModifiedBy: 'u3', lastModifiedAt: '2026-03-15T14:00:00Z'
    },
    {
        id: 'd3', companyName: 'Green Valley Foods', website: 'https://greenvalley.com',
        dealStage: 'negotiation', leadSource: 'Conference', dealCreated: '2026-02-15',
        stageChanged: '2026-03-25', advisorId: 'u2', advisorName: 'Mike Chen',
        estimatedAUM: 8500000, notes: 'Regional food distributor',
        createdBy: 'u2', lastModifiedBy: 'u2', lastModifiedAt: '2026-03-25T09:00:00Z'
    },
    {
        id: 'd4', companyName: 'Sunrise Healthcare', website: 'https://sunrisehealth.com',
        dealStage: 'closed-won', leadSource: 'Referral', dealCreated: '2026-01-10',
        stageChanged: '2026-03-01', advisorId: 'u3', advisorName: 'Lisa Park',
        estimatedAUM: 12000000, notes: 'Healthcare group, 5 locations',
        createdBy: 'u3', lastModifiedBy: 'u3', lastModifiedAt: '2026-03-01T11:00:00Z'
    },
    {
        id: 'd5', companyName: 'Pacific Logistics', website: 'https://paclog.com',
        dealStage: 'prospect', leadSource: 'Cold Call', dealCreated: '2026-03-28',
        stageChanged: '2026-03-28', advisorId: 'u2', advisorName: 'Mike Chen',
        estimatedAUM: 2000000, notes: 'Initial contact made',
        createdBy: 'u2', lastModifiedBy: 'u2', lastModifiedAt: '2026-03-28T16:00:00Z'
    },
    {
        id: 'd6', companyName: 'Metro Construction', website: 'https://metroconstruct.com',
        dealStage: 'closed-lost', leadSource: 'Partner', dealCreated: '2026-02-01',
        stageChanged: '2026-03-10', advisorId: 'u3', advisorName: 'Lisa Park',
        estimatedAUM: 4000000, notes: 'Went with competitor',
        createdBy: 'u3', lastModifiedBy: 'u3', lastModifiedAt: '2026-03-10T10:00:00Z'
    },
    {
        id: 'd7', companyName: 'Summit Financial Group', website: 'https://summitfg.com',
        dealStage: 'proposal', leadSource: 'Existing Client', dealCreated: '2026-03-05',
        stageChanged: '2026-03-22', advisorId: 'u2', advisorName: 'Mike Chen',
        estimatedAUM: 15000000, notes: 'Expanding existing 401k plan',
        createdBy: 'u2', lastModifiedBy: 'u1', lastModifiedAt: '2026-03-22T08:00:00Z'
    },
    {
        id: 'd8', companyName: 'BlueStar Retail', website: 'https://bluestar.com',
        dealStage: 'qualified', leadSource: 'Marketing Campaign', dealCreated: '2026-03-18',
        stageChanged: '2026-03-25', advisorId: 'u3', advisorName: 'Lisa Park',
        estimatedAUM: 6000000, notes: 'Chain of retail stores, 150 employees',
        createdBy: 'u3', lastModifiedBy: 'u3', lastModifiedAt: '2026-03-25T13:00:00Z'
    }
];

function generateId() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function formatCurrency(n) {
    if (n == null || isNaN(n)) return '$0';
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
    return '$' + Number(n).toLocaleString();
}

function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysBetween(d1, d2) {
    const a = new Date(d1);
    const b = new Date(d2);
    return Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

function stageClass(stageId) {
    return 'stage-' + stageId;
}

function stageLabel(stageId) {
    const s = DEAL_STAGES.find(s => s.id === stageId);
    return s ? s.label : stageId;
}
