/* ========================================
   UBMS - Authentication Module (Enhanced)
   Super Admin + Database-backed auth + RBAC
   ======================================== */

const Auth = {
    session: null,

    init() {
        const stored = localStorage.getItem('ubms_session');
        if (!stored) {
            window.location.href = this.getLoginUrl();
            return false;
        }
        this.session = JSON.parse(stored);
        if (!this.session.isLoggedIn) {
            window.location.href = this.getLoginUrl();
            return false;
        }
        return true;
    },

    getLoginUrl() {
        if (window.UBMS_STANDALONE) {
            return window.UBMS_STANDALONE.loginUrl || 'login.html';
        }
        return 'login.html';
    },

    getSession() { return this.session; },
    getRole() { return this.session?.role || 'staff'; },
    getCompany() { return this.session?.company || 'all'; },
    getName() { return this.session?.name || 'User'; },
    getAvatar() { return this.session?.avatar || 'U'; },
    getUserId() { return this.session?.userId || null; },

    isSuperAdmin() {
        return this.session?.role === 'superadmin' || this.session?.isSuperAdmin === true;
    },

    isOwner() {
        return this.session?.role === 'owner' || this.isSuperAdmin();
    },

    isManager() {
        return ['owner', 'manager', 'superadmin'].includes(this.session?.role);
    },

    canEditDelete() {
        return this.isSuperAdmin() || this.session?.role === 'owner';
    },

    /* New granular permissions:
       canEdit()   → superadmin, owner, manager
       canDelete() → superadmin only */
    canEdit() {
        return this.isSuperAdmin() || this.session?.role === 'owner' || this.session?.role === 'manager';
    },

    canDelete() {
        return this.isSuperAdmin();
    },

    canAccessCompany(companyId) {
        if (this.isSuperAdmin() || this.isOwner() || this.session?.role === 'accountant') return true;
        const companies = this.session?.companies || [this.session?.company];
        return companies.includes(companyId) || companies.includes('all');
    },

    canAccessModule(module) {
        const role = this.getRole();
        const company = this.getCompany();

        if (role === 'superadmin' || role === 'owner') return true;

        // Check user's assigned modules
        const allowedModules = this.session?.modules || [];
        if (allowedModules.includes('all')) return true;
        if (allowedModules.length > 0 && !allowedModules.includes(module)) return false;

        if (role === 'accountant') {
            return ['dashboard', 'financial', 'reports', 'invoicing', 'payroll', 'inventory', 'settings'].includes(module);
        }

        const constructionModules = ['construction', 'jobcosting', 'subcontractors', 'equipment', 'safety', 'documents'];
        const wellnessModules = ['booking', 'therapists', 'membership', 'spainventory'];
        const automotiveModules = ['workshop', 'vehicles', 'parts', 'inspections', 'estimates', 'appointments'];
        // 'pos' is shared across all company types

        if (company === 'dheekay' || company === 'kdchavit') {
            return !wellnessModules.includes(module) && !automotiveModules.includes(module);
        }
        if (company === 'nuatthai') {
            return !constructionModules.includes(module) && !automotiveModules.includes(module);
        }
        if (company === 'autocasa') {
            return !constructionModules.includes(module) && !wellnessModules.includes(module);
        }
        return true;
    },

    // ---- Database-backed login ----
    async login(username, password, company) {
        const result = await Database.authenticate(username, password, company);
        if (!result.success) return result;

        const session = {
            userId: result.user.id,
            username: result.user.username,
            role: result.user.role,
            name: result.user.name,
            email: result.user.email,
            company: result.user.company,
            companies: result.user.companies,
            modules: result.user.modules,
            isSuperAdmin: result.user.isSuperAdmin,
            avatar: result.user.avatar,
            loginTime: new Date().toISOString(),
            isLoggedIn: true
        };
        localStorage.setItem('ubms_session', JSON.stringify(session));
        Database.addAuditEntry('Login', `${result.user.name} logged in as ${result.user.role}`, 'success');
        // Trigger full bidirectional sync after login (push local → server, pull server → local)
        if (Database.fullSync) Database.fullSync();
        return { success: true, mustChangePassword: result.user.mustChangePassword === true };
    },

    // ---- Super Admin Login with unique code ----
    async loginSuperAdmin(code) {
        const result = await Database.authenticateSuperAdmin(code);
        if (!result.success) return result;

        const session = {
            userId: result.user.id,
            username: result.user.username,
            role: 'superadmin',
            name: result.user.name,
            email: result.user.email,
            company: 'all',
            companies: ['all'],
            modules: ['all'],
            isSuperAdmin: true,
            avatar: 'SA',
            loginTime: new Date().toISOString(),
            isLoggedIn: true
        };
        localStorage.setItem('ubms_session', JSON.stringify(session));
        Database.addAuditEntry('Super Admin Login', 'Super Admin accessed the system', 'warning');
        // Trigger full bidirectional sync after login (push local → server, pull server → local)
        if (Database.fullSync) Database.fullSync();
        return { success: true };
    },

    logout() {
        Database.addAuditEntry('Logout', `${this.getName()} logged out`);
        localStorage.removeItem('ubms_session');
        window.location.href = this.getLoginUrl();
    }
};
