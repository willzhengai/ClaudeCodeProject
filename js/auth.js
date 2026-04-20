// === Authentication & Permissions ===

const Auth = {
    currentUser: null,

    login(userId) {
        const user = Store.getUser(userId);
        if (!user) return false;
        this.currentUser = user;
        sessionStorage.setItem('crm401k_session', userId);
        return true;
    },

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('crm401k_session');
    },

    restore() {
        const userId = sessionStorage.getItem('crm401k_session');
        if (userId) {
            const user = Store.getUser(userId);
            if (user) {
                this.currentUser = user;
                return true;
            }
        }
        return false;
    },

    isLoggedIn() {
        return this.currentUser !== null;
    },

    // Permission checks
    canEditDeal(deal) {
        if (!this.currentUser) return false;
        const role = ROLES[this.currentUser.role];
        if (role.canEditAll) return true;
        return deal.advisorId === this.currentUser.id || deal.createdBy === this.currentUser.id;
    },

    canDeleteDeal(deal) {
        if (!this.currentUser) return false;
        return ROLES[this.currentUser.role].canEditAll;
    },

    canViewDeal(deal) {
        if (!this.currentUser) return false;
        const role = ROLES[this.currentUser.role];
        if (role.canViewAll) return true;
        return deal.advisorId === this.currentUser.id || deal.createdBy === this.currentUser.id;
    },

    canManageUsers() {
        if (!this.currentUser) return false;
        return ROLES[this.currentUser.role].canManageUsers;
    },

    isAdmin() {
        return this.currentUser?.role === 'admin';
    }
};
