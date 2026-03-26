/* ========================================
   UBMS - Database Persistence Layer
   localStorage-backed with auto-save
   Supports unified + standalone modes
   ======================================== */

const API_BASE_URL = (function() {
    // Allow manual override via localStorage (set in Settings or console)
    const custom = localStorage.getItem('ubms_server_url');
    if (custom) return custom.replace(/\/$/, '') + '/api';

    const loc = window.location;

    // GitHub Pages or external hosting — connect to the LAN backend server
    if (loc.hostname.includes('github.io') || (loc.protocol === 'https:' && loc.port !== '3443')) {
        return 'http://10.56.221.132:3000/api';
    }
    // If served from the backend (port 3000 or 3443), use same origin
    if (loc.port === '3000' || loc.port === '3443') {
        return loc.origin + '/api';
    }
    // If opened as a file, try localhost
    if (loc.protocol === 'file:') {
        return 'http://localhost:3000/api';
    }
    // Default: use same hostname but port 3000
    return loc.protocol + '//' + loc.hostname + ':3000/api';
})();
let _apiAvailable = null; // null = unknown, true/false after check
let _apiCheckTime = 0;    // timestamp of last check

async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!response.ok) {
        let errorMsg = 'Request failed';
        try {
            const errData = await response.json();
            errorMsg = errData.error || errData.message || JSON.stringify(errData);
        } catch {
            errorMsg = await response.text();
        }
        throw new Error(errorMsg);
    }
    _apiAvailable = true;
    return response.json();
}

// Check if backend API is reachable (re-checks every 30s instead of caching permanently)
async function checkApiHealth() {
    const now = Date.now();
    if (_apiAvailable !== null && (now - _apiCheckTime) < 30000) return _apiAvailable;
    try {
        const resp = await fetch(`${API_BASE_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
        _apiAvailable = resp.ok;
    } catch {
        _apiAvailable = false;
    }
    _apiCheckTime = now;
    return _apiAvailable;
}

const Database = {
    DB_KEY: 'ubms_database',
    USERS_KEY: 'ubms_users',
    AUDIT_KEY: 'ubms_audit',
    INITIALIZED_KEY: 'ubms_initialized',
    DB_VERSION: 7, // Bumped to force re-init with membership packages

    // Super Admin access code — unique, required for full system access
    DEFAULT_SA_CODE: 'DK-SA-7829-UBMS',
    SA_CODE_KEY: 'ubms_sa_code',

    getSuperAdminCode() {
        return localStorage.getItem(this.SA_CODE_KEY) || this.DEFAULT_SA_CODE;
    },

    updateSuperAdminCode(currentCode, newCode) {
        if (currentCode !== this.getSuperAdminCode()) {
            return { success: false, error: 'Current access code is incorrect.' };
        }
        if (!newCode || newCode.length < 6) {
            return { success: false, error: 'New code must be at least 6 characters.' };
        }
        localStorage.setItem(this.SA_CODE_KEY, newCode);
        this.addAuditEntry('SA Code Changed', 'Super Admin access code was updated', 'warning');
        return { success: true };
    },

    // ---- Reset password via forgot-password (username + email verification) ----
    async resetPassword(username, email, newPassword, company) {
        const user = await this.findUser(username);
        if (!user) return { success: false, error: 'No account found with that username.' };
        if (user.email !== email) return { success: false, error: 'Username and email do not match.' };
        if (user.status !== 'active') return { success: false, error: 'This account is deactivated.' };
        if (user.isSuperAdmin) return { success: false, error: 'Super Admin password cannot be reset here.' };
        // Check company access if specified
        if (company && !(user.companies || []).includes('all') && !(user.companies || []).includes(company)) {
            return { success: false, error: 'This account does not have access to this business.' };
        }
        if (!newPassword || newPassword.length < 8) return { success: false, error: 'Password must be at least 8 characters.' };
        await this.updateUser(user.id, { password: newPassword, mustChangePassword: false });
        this.addAuditEntry('Password Reset', `Password reset via forgot-password for ${username}`, 'warning');
        return { success: true };
    },

    // ---- Initialize ----
    init() {
        const savedVersion = localStorage.getItem('ubms_db_version');
        const isInitialized = localStorage.getItem(this.INITIALIZED_KEY);

        if (isInitialized && parseInt(savedVersion) === this.DB_VERSION) {
            this.load();
        } else {
            // Fresh start: clear demo data, seed users
            this.clearTransactionalData();
            this.seedUsers();
            this.save();
            localStorage.setItem(this.INITIALIZED_KEY, 'true');
            localStorage.setItem('ubms_db_version', String(this.DB_VERSION));
        }
        this.startAutoSave();
        // Seed default transformer inventory items if missing
        this.seedTransformers();
        // Full bidirectional sync: push local → server, then pull server → local
        this.fullSync();
    },

    // Full bidirectional sync — push local data first, then pull everything from server
    async fullSync() {
        try {
            const healthy = await checkApiHealth();
            if (!healthy) {
                console.log('Server unreachable — running in offline mode');
                return;
            }
            // 1. Push our local data + users to the server first
            await this.syncAllToServer();
            // 2. Pull ALL data from server (includes data from other users/PCs)
            await this.loadFromServer();
            // 3. Refresh users cache from server
            await this.refreshUsersFromServer();
            console.log('✓ Full sync completed');
        } catch (e) {
            console.error('fullSync error:', e.message);
        }
    },

    // ---- Clear all transactional data for fresh start ----
    clearTransactionalData() {
        DataStore.customers = [];
        DataStore.invoices = [];
        DataStore.expenses = [];
        DataStore.projects = [];
        DataStore.subcontractors = [];
        DataStore.therapists = [];
        DataStore.bookings = [];
        DataStore.memberships = [];
        DataStore.membershipPackages = [
            { id: 'PKG-001', name: 'Platinum', price: 9999, sessions: 30, sessionsLabel: 'Unlimited', period: 'month', benefits: ['Unlimited massage sessions', '20% discount on add-ons', 'Priority booking', 'Free hot stone upgrade'], status: 'active' },
            { id: 'PKG-002', name: 'Gold', price: 5999, sessions: 12, sessionsLabel: '12 sessions', period: 'month', benefits: ['12 sessions per month', '10% discount on add-ons', 'Birthday free session', '1 free guest pass/month'], status: 'active' },
            { id: 'PKG-003', name: 'Silver', price: 2999, sessions: 6, sessionsLabel: '6 sessions', period: 'month', benefits: ['6 sessions per month', '5% discount on services', 'Priority booking', 'Special promo access'], status: 'active' }
        ];
        DataStore.vehicles = [];
        DataStore.jobCards = [];
        DataStore.autoParts = [];
        DataStore.equipment = [];
        DataStore.safetyRecords = [];
        DataStore.documents = [];
        DataStore.spaInventory = [];
        DataStore.estimates = [];
        DataStore.birInvoices = [];
        DataStore.employees = [];
        DataStore.payslips = [];
        DataStore.attendanceRecords = [];
        DataStore.workSchedules = [];
        DataStore.posTransactions = [];
        DataStore.journalEntries = [];
        DataStore.isoDocuments = [];
        DataStore.isoAudits = [];
        DataStore.isoNcrs = [];
        DataStore.isoCpars = [];
        DataStore.inventoryItems = [];
        DataStore.inventoryTransactions = [];
        DataStore.inspections = [];
        DataStore.activityLog = [];
        DataStore.notifications = [];
        DataStore.bankReconciliations = [];
        DataStore.collectionReceipts = [];
        DataStore.biometricLogs = [];
        DataStore.performanceReviews = [];
        DataStore.timesheets = [];
        DataStore.incidentReports = [];
        DataStore.monthlyRevenue = {
            dheekay: [0,0,0,0,0,0,0,0,0,0,0,0],
            kdchavit: [0,0,0,0,0,0,0,0,0,0,0,0],
            nuatthai: [0,0,0,0,0,0,0,0,0,0,0,0],
            autocasa: [0,0,0,0,0,0,0,0,0,0,0,0]
        };
    },

    // Compute monthlyRevenue from actual invoices
    recalcMonthlyRevenue() {
        const rev = {
            dheekay:  [0,0,0,0,0,0,0,0,0,0,0,0],
            kdchavit: [0,0,0,0,0,0,0,0,0,0,0,0],
            nuatthai: [0,0,0,0,0,0,0,0,0,0,0,0],
            autocasa: [0,0,0,0,0,0,0,0,0,0,0,0]
        };
        const now = new Date();
        const year = now.getFullYear();
        (DataStore.invoices || []).forEach(inv => {
            const co = inv.company;
            if (!rev[co]) return;
            const paid = inv.paid || 0;
            if (paid <= 0) return;
            // Use issueDate or created date to determine the month
            const dateStr = inv.issueDate || inv.created;
            if (!dateStr) return;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return;
            if (d.getFullYear() === year) {
                rev[co][d.getMonth()] += paid;
            }
        });
        // Also include POS transactions from birInvoices
        (DataStore.birInvoices || []).forEach(inv => {
            const co = inv.company;
            if (!rev[co]) return;
            const amount = inv.totalAmount || inv.amount || 0;
            if (amount <= 0) return;
            const dateStr = inv.date || inv.issueDate;
            if (!dateStr) return;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return;
            if (d.getFullYear() === year) {
                rev[co][d.getMonth()] += amount;
            }
        });
        DataStore.monthlyRevenue = rev;
    },

    // ---- Load from localStorage ----
    load() {
        try {
            const saved = localStorage.getItem(this.DB_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                // Merge saved data into DataStore
                const mutableKeys = [
                    'customers', 'invoices', 'expenses', 'projects', 'subcontractors',
                    'bookings', 'memberships', 'membershipPackages', 'jobCards', 'vehicles', 'autoParts',
                    'therapists', 'activityLog', 'notifications', 'monthlyRevenue',
                    'spaServices', 'autoServices', 'chartOfAccounts',
                    'equipment', 'safetyRecords', 'documents', 'spaInventory', 'estimates',
                    'birInvoices', 'employees', 'payslips', 'attendanceRecords', 'workSchedules',
                    'posTransactions', 'journalEntries', 'isoDocuments', 'isoAudits', 'isoNcrs', 'isoCpars',
                    'inventoryItems', 'inventoryTransactions',
                    'inspections', 'bankReconciliations', 'biometricLogs',
                    'performanceReviews', 'timesheets', 'incidentReports',
                    'projectMilestones'
                ];
                mutableKeys.forEach(key => {
                    if (data[key] !== undefined) {
                        DataStore[key] = data[key];
                    }
                });
                // Ensure all customer objects have a companies array
                if (Array.isArray(DataStore.customers)) {
                    DataStore.customers = DataStore.customers.filter(c => c && c.id);
                    DataStore.customers.forEach(c => { if (!c.companies) c.companies = []; });
                }
            }
            // Always recompute monthly revenue from actual invoice data
            this.recalcMonthlyRevenue();
        } catch (e) {
            console.error('Database load error:', e);
        }
    },

    // ---- Save to localStorage ----
    save() {
        try {
            // Recompute monthly revenue from actual invoices before saving
            this.recalcMonthlyRevenue();
            const data = {
                customers: DataStore.customers,
                invoices: DataStore.invoices,
                expenses: DataStore.expenses,
                projects: DataStore.projects,
                subcontractors: DataStore.subcontractors,
                bookings: DataStore.bookings,
                memberships: DataStore.memberships,
                membershipPackages: DataStore.membershipPackages,
                jobCards: DataStore.jobCards,
                vehicles: DataStore.vehicles,
                autoParts: DataStore.autoParts,
                therapists: DataStore.therapists,
                activityLog: DataStore.activityLog,
                notifications: DataStore.notifications,
                monthlyRevenue: DataStore.monthlyRevenue,
                spaServices: DataStore.spaServices,
                autoServices: DataStore.autoServices,
                chartOfAccounts: DataStore.chartOfAccounts,
                equipment: DataStore.equipment,
                safetyRecords: DataStore.safetyRecords,
                documents: DataStore.documents,
                spaInventory: DataStore.spaInventory,
                estimates: DataStore.estimates,
                birInvoices: DataStore.birInvoices,
                employees: DataStore.employees,
                payslips: DataStore.payslips,
                attendanceRecords: DataStore.attendanceRecords,
                workSchedules: DataStore.workSchedules,
                posTransactions: DataStore.posTransactions,
                journalEntries: DataStore.journalEntries,
                isoDocuments: DataStore.isoDocuments,
                isoAudits: DataStore.isoAudits,
                isoNcrs: DataStore.isoNcrs,
                isoCpars: DataStore.isoCpars,
                inventoryItems: DataStore.inventoryItems,
                inventoryTransactions: DataStore.inventoryTransactions,
                inspections: DataStore.inspections,
                bankReconciliations: DataStore.bankReconciliations,
                collectionReceipts: DataStore.collectionReceipts,
                biometricLogs: DataStore.biometricLogs || [],
                performanceReviews: DataStore.performanceReviews || [],
                timesheets: DataStore.timesheets || [],
                incidentReports: DataStore.incidentReports || [],
                projectMilestones: DataStore.projectMilestones || [],
                _lastSaved: new Date().toISOString()
            };
            localStorage.setItem(this.DB_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Database save error:', e);
        }
    },

    // ---- Auto-save every 30 seconds ----
    startAutoSave() {
        setInterval(() => this.save(), 30000);
    },

    // ---- Reset database to fresh state ----
    reset() {
        localStorage.removeItem(this.DB_KEY);
        localStorage.removeItem(this.USERS_KEY);
        localStorage.removeItem(this.AUDIT_KEY);
        localStorage.removeItem(this.INITIALIZED_KEY);
        localStorage.removeItem('ubms_session');
        window.location.reload();
    },

    // ============================================================
    //  USER MANAGEMENT
    // ============================================================
    seedUsers() {
        const users = [
            // ── Super Administrator ──
            {
                id: 'USR-SUPERADMIN',
                name: 'DK Super Administrator',
                username: 'superadmin',
                email: 'superadmin@ubms.ph',
                password: 'DK-SA-7829-UBMS',
                role: 'superadmin',
                companies: ['all'],
                modules: ['all'],
                status: 'active',
                created: '2026-01-01T00:00:00',
                lastLogin: null,
                avatar: 'SA',
                isSuperAdmin: true,
                mustChangePassword: false
            },
            // ── Group Owner ──
            {
                id: 'USR-001',
                name: 'Dhomer Bangayan',
                username: 'dhomer.bangayan',
                email: 'dhomer.bangayan@ubms.ph',
                password: 'DB@UBMS2026!',
                role: 'owner',
                companies: ['all'],
                modules: ['all'],
                status: 'active',
                created: '2026-01-01T08:00:00',
                lastLogin: null,
                avatar: 'DB',
                mustChangePassword: true
            },
            // ── Dheekay Builders — Manager ──
            {
                id: 'USR-002',
                name: 'Dheekay Manager',
                username: 'dheekay.manager',
                email: 'dheekay.manager@dheekaybuilders.com',
                password: 'DK12345678',
                role: 'manager',
                companies: ['dheekay'],
                modules: ['dashboard', 'crm', 'financial', 'reports', 'invoicing', 'payroll',
                           'inventory', 'construction', 'jobcosting', 'subcontractors',
                           'equipment', 'safety', 'documents', 'iso', 'settings'],
                status: 'active',
                created: '2026-01-05T09:00:00',
                lastLogin: null,
                avatar: 'MV',
                mustChangePassword: true
            },
            // ── KDChavit Construction — Manager ──
            {
                id: 'USR-003',
                name: 'Kdchavit Manager',
                username: 'kdchavit.manager',
                email: 'kdchavit.manager@kdchavitconstruction.com',
                password: 'KD12345678',
                role: 'manager',
                companies: ['kdchavit'],
                modules: ['dashboard', 'crm', 'financial', 'reports', 'invoicing', 'payroll',
                           'inventory', 'construction', 'jobcosting', 'subcontractors',
                           'equipment', 'safety', 'documents', 'iso', 'settings'],
                status: 'active',
                created: '2026-01-05T09:00:00',
                lastLogin: null,
                avatar: 'AR',
                mustChangePassword: true
            },
            // ── Nuat Thai Massage — Manager ──
            {
                id: 'USR-004',
                name: 'Nuatthai Manager',
                username: 'nuatthai.manager',
                email: 'nuatthai.manager@nuatthai.com',
                password: 'NT12345678',
                role: 'manager',
                companies: ['nuatthai'],
                modules: ['dashboard', 'crm', 'financial', 'reports', 'invoicing', 'payroll',
                           'inventory', 'booking', 'therapists', 'pos', 'membership',
                           'spainventory', 'iso', 'settings'],
                status: 'active',
                created: '2026-01-10T09:00:00',
                lastLogin: null,
                avatar: 'PM',
                mustChangePassword: true
            },
            // ── AutoCasa Auto Expert — Manager ──
            {
                id: 'USR-005',
                name: 'Autocasa Manager',
                username: 'autocasa.manager',
                email: 'autocasa.manager@autocasa.com',
                password: 'AC12345678',
                role: 'manager',
                companies: ['autocasa'],
                modules: ['dashboard', 'crm', 'financial', 'reports', 'invoicing', 'payroll',
                           'inventory', 'workshop', 'vehicles', 'parts', 'inspections',
                           'estimates', 'appointments', 'pos', 'iso', 'settings'],
                status: 'active',
                created: '2026-01-10T09:00:00',
                lastLogin: null,
                avatar: 'MS',
                mustChangePassword: true
            },
            // ── Group Accountant ──
            {
                id: 'USR-006',
                name: 'Group Accountant',
                username: 'group.accountant',
                email: 'group.accountant@ubms.com',
                password: 'GA12345678',
                role: 'accountant',
                companies: ['all'],
                modules: ['dashboard', 'financial', 'reports', 'invoicing', 'payroll', 'inventory', 'settings'],
                status: 'active',
                created: '2026-01-15T09:00:00',
                lastLogin: null,
                avatar: 'GL',
                mustChangePassword: true
            }
        ];
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    },

    // ============================================================
    //  SEED DEFAULT TRANSFORMERS (Construction Inventory)
    // ============================================================
    seedTransformers() {
        const types = DataStore.transformerTypes || ['Silicon', 'Amorphous'];
        const ratings = DataStore.transformerRatings || ['10 KVA', '25 KVA', '37.5 KVA', '50 KVA', '75 KVA', '100 KVA'];
        const companies = ['dheekay', 'kdchavit'];
        let count = 0;
        for (const company of companies) {
            for (const type of types) {
                for (const rating of ratings) {
                    const code = `XFMR-${type.substring(0,3).toUpperCase()}-${rating.replace(/\s/g, '')}`;
                    const existing = DataStore.inventoryItems.find(i => i.code === code && i.company === company);
                    if (existing) continue;
                    DataStore.inventoryItems.push({
                        id: Utils.generateId('INV'),
                        name: `${type} Transformer ${rating}`,
                        code: code,
                        barcode: '',
                        company: company,
                        category: 'Transformers',
                        subcategory: type,
                        unit: 'pcs',
                        quantity: 0,
                        reorderLevel: 2,
                        unitCost: 0,
                        location: '',
                        transformerType: type,
                        transformerRating: rating,
                        specifications: { type, rating, phase: 'Single Phase', voltage: '13.8kV / 240V-120V' },
                        projectId: null,
                        createdAt: new Date().toISOString()
                    });
                    count++;
                }
            }
        }
        if (count > 0) this.save();
    },

    // ---- Get all users (synchronous from localStorage cache) ----

    getUsers() {
        try {
            const data = localStorage.getItem(this.USERS_KEY);
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    },

    // ---- Refresh users cache from server ----
    async refreshUsersFromServer() {
        try {
            const serverUsers = await apiRequest('/users');
            const localRaw = localStorage.getItem(this.USERS_KEY);
            const localUsers = localRaw ? JSON.parse(localRaw) : [];
            // Keep superadmin from local (API excludes superadmin)
            const localSA = localUsers.filter(u => u.isSuperAdmin);
            const byId = new Map(localSA.map(u => [u.id, u]));
            for (const u of serverUsers) byId.set(u.id, u);
            // Also preserve any local-only users not yet on server
            for (const u of localUsers) {
                if (!byId.has(u.id)) byId.set(u.id, u);
            }
            localStorage.setItem(this.USERS_KEY, JSON.stringify(Array.from(byId.values())));
        } catch (e) {
            console.log('refreshUsersFromServer:', e.message);
        }
    },

    // ---- Save users ----

    saveUsers(users) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    },

    // ---- Find user by username (synchronous) ----

    findUser(username) {
        try {
            const data = localStorage.getItem(this.USERS_KEY);
            const users = data ? JSON.parse(data) : [];
            return users.find(u => u.username === username) || null;
        } catch { return null; }
    },

    // ---- Find user by email (synchronous) ----

    findUserByEmail(email) {
        try {
            const data = localStorage.getItem(this.USERS_KEY);
            const users = data ? JSON.parse(data) : [];
            return users.find(u => u.email === email) || null;
        } catch { return null; }
    },

    // ---- Authenticate user ----

    async authenticate(username, password, company) {
        try {
            return await apiRequest('/auth/login', 'POST', { username, password, company });
        } catch (e) {
            // Fallback to localStorage auth
            try {
                const data = localStorage.getItem(this.USERS_KEY);
                const users = data ? JSON.parse(data) : [];
                const user = users.find(u => u.username === username);
                if (!user) return { success: false, error: 'User not found' };
                if (user.password !== password) return { success: false, error: 'Invalid password' };
                if (user.status !== 'active') return { success: false, error: 'Account is deactivated' };
                const companies = typeof user.companies === 'string' ? JSON.parse(user.companies) : (user.companies || []);
                if (!companies.includes('all') && company !== 'all' && !companies.includes(company)) {
                    return { success: false, error: 'No access to this company' };
                }
                const modules = typeof user.modules === 'string' ? JSON.parse(user.modules) : (user.modules || []);
                return {
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        companies: companies,
                        modules: modules,
                        company: companies.includes('all') ? (company || 'all') : companies[0],
                        isSuperAdmin: user.isSuperAdmin,
                        avatar: user.avatar,
                        mustChangePassword: user.mustChangePassword ? true : false
                    }
                };
            } catch {
                return { success: false, error: e.message || 'Authentication failed' };
            }
        }
    },

    // ---- Authenticate Super Admin by code ----

    async authenticateSuperAdmin(code) {
        try {
            return await apiRequest('/auth/superadmin', 'POST', { code });
        } catch (e) {
            // Fallback: check localStorage superadmin
            try {
                const configuredCode = this.getSuperAdminCode();
                const data = localStorage.getItem(this.USERS_KEY);
                const users = data ? JSON.parse(data) : [];
                const user = users.find(u => u.username === 'superadmin');
                if (code !== configuredCode && (!user || code !== user.password)) {
                    return { success: false, error: 'Invalid Super Admin code' };
                }
                if (!user) return { success: false, error: 'Super Admin account not found' };
                return {
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        name: user.name,
                        email: user.email,
                        role: 'superadmin',
                        companies: ['all'],
                        modules: ['all'],
                        company: 'all',
                        isSuperAdmin: true,
                        avatar: user.avatar || 'SA'
                    }
                };
            } catch {
                return { success: false, error: e.message || 'Super Admin authentication failed' };
            }
        }
    },

    // ---- Add user ----

    async addUser(userData) {
        try {
            const result = await apiRequest('/users', 'POST', userData);
            // Sync new user to localStorage cache
            if (result.success && result.user) {
                const data = localStorage.getItem(this.USERS_KEY);
                const users = data ? JSON.parse(data) : [];
                users.push(result.user);
                localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
            }
            return result;
        } catch (e) {
            // Fallback: add to localStorage
            try {
                const data = localStorage.getItem(this.USERS_KEY);
                const users = data ? JSON.parse(data) : [];
                const newUser = {
                    id: userData.id || Utils.generateId('USR'),
                    name: userData.name,
                    username: userData.username,
                    email: userData.email,
                    password: userData.password,
                    role: userData.role || 'staff',
                    companies: userData.companies || [],
                    modules: userData.modules || [],
                    status: 'active',
                    avatar: userData.name ? userData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U',
                    mustChangePassword: userData.mustChangePassword !== undefined ? userData.mustChangePassword : true,
                    created: new Date().toISOString()
                };
                users.push(newUser);
                localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
                return { success: true, user: newUser };
            } catch {
                return { success: false, error: e.message };
            }
        }
    },

    // ---- Update user ----

    async updateUser(userId, updates) {
        try {
            const result = await apiRequest(`/users/${encodeURIComponent(userId)}`, 'PUT', updates);
            // Sync update to localStorage cache
            if (result.success) {
                const data = localStorage.getItem(this.USERS_KEY);
                const users = data ? JSON.parse(data) : [];
                const idx = users.findIndex(u => u.id === userId);
                if (idx >= 0) {
                    Object.assign(users[idx], updates);
                    if (result.user) Object.assign(users[idx], result.user);
                    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
                }
            }
            return result;
        } catch (e) {
            // Fallback: update in localStorage
            try {
                const data = localStorage.getItem(this.USERS_KEY);
                const users = data ? JSON.parse(data) : [];
                const idx = users.findIndex(u => u.id === userId);
                if (idx >= 0) {
                    Object.assign(users[idx], updates);
                    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
                    return { success: true, user: users[idx] };
                }
                return { success: false, error: 'User not found' };
            } catch {
                return { success: false, error: e.message };
            }
        }
    },

    // ---- Deactivate user ----
    async deactivateUser(userId) {
        try {
            const result = await apiRequest(`/users/${encodeURIComponent(userId)}/deactivate`, 'PATCH');
            if (result.success) {
                const data = localStorage.getItem(this.USERS_KEY);
                const users = data ? JSON.parse(data) : [];
                const idx = users.findIndex(u => u.id === userId);
                if (idx >= 0) { users[idx].status = 'inactive'; localStorage.setItem(this.USERS_KEY, JSON.stringify(users)); }
            }
            return result;
        } catch {
            return await this.updateUser(userId, { status: 'inactive' });
        }
    },

    // ---- Activate user ----
    async activateUser(userId) {
        try {
            const result = await apiRequest(`/users/${encodeURIComponent(userId)}/activate`, 'PATCH');
            if (result.success) {
                const data = localStorage.getItem(this.USERS_KEY);
                const users = data ? JSON.parse(data) : [];
                const idx = users.findIndex(u => u.id === userId);
                if (idx >= 0) { users[idx].status = 'active'; localStorage.setItem(this.USERS_KEY, JSON.stringify(users)); }
            }
            return result;
        } catch {
            return await this.updateUser(userId, { status: 'active' });
        }
    },

    // ---- Delete user ----

    async deleteUser(userId) {
        try {
            const result = await apiRequest(`/users/${encodeURIComponent(userId)}`, 'DELETE');
            if (result.success) {
                const data = localStorage.getItem(this.USERS_KEY);
                const users = data ? JSON.parse(data) : [];
                localStorage.setItem(this.USERS_KEY, JSON.stringify(users.filter(u => u.id !== userId)));
            }
            return result;
        } catch (e) {
            // Fallback: delete from localStorage
            try {
                const data = localStorage.getItem(this.USERS_KEY);
                const users = data ? JSON.parse(data) : [];
                localStorage.setItem(this.USERS_KEY, JSON.stringify(users.filter(u => u.id !== userId)));
                return { success: true, message: 'User deleted' };
            } catch {
                return { success: false, error: e.message };
            }
        }
    },

    // ============================================================
    //  AUDIT LOG
    // ============================================================
    addAuditEntry(action, detail, level = 'info', module = null) {
        try {
            const logs = this.getAuditLog();
            const session = JSON.parse(localStorage.getItem('ubms_session') || '{}');
            const company = (typeof App !== 'undefined' && App.activeCompany) ? App.activeCompany : (session.company || 'all');
            const currentModule = module || ((typeof App !== 'undefined' && App.currentModule) ? App.currentModule : null);
            const entry = {
                time: new Date().toISOString(),
                user: session.username || 'system',
                action,
                detail,
                level,
                company,
                module: currentModule
            };
            logs.unshift(entry);
            // Keep last 500 entries
            if (logs.length > 500) logs.length = 500;
            localStorage.setItem(this.AUDIT_KEY, JSON.stringify(logs));
            // Also push to server (fire-and-forget)
            apiRequest('/unified/audit', 'POST', {
                user: entry.user, action, detail, level,
                company, module: currentModule
            }).catch(() => {});
        } catch (e) {
            console.error('Audit log error:', e);
        }
    },

    // Fetch audit log from server (for managers/superadmin cross-device visibility)
    async getServerAuditLog(limit = 200, filters = {}) {
        try {
            let qs = `limit=${limit}`;
            if (filters.company && filters.company !== 'all') qs += `&company=${encodeURIComponent(filters.company)}`;
            if (filters.user) qs += `&user=${encodeURIComponent(filters.user)}`;
            if (filters.level) qs += `&level=${encodeURIComponent(filters.level)}`;
            if (filters.module) qs += `&module=${encodeURIComponent(filters.module)}`;
            if (filters.since) qs += `&since=${encodeURIComponent(filters.since)}`;
            const result = await apiRequest(`/unified/audit?${qs}`);
            if (result.success && result.data) return result.data;
        } catch {}
        return this.getAuditLog();
    },

    // Fetch consolidated activity grouped by user
    async getActivityByUser(company = 'all', days = 7) {
        try {
            let qs = `days=${days}`;
            if (company && company !== 'all') qs += `&company=${encodeURIComponent(company)}`;
            const result = await apiRequest(`/unified/activity/by-user?${qs}`);
            if (result.success) return result;
        } catch {}
        return { success: false, data: [], raw: [] };
    },

    // Fetch activity summary stats
    async getActivitySummary(company = 'all', days = 7) {
        try {
            let qs = `days=${days}`;
            if (company && company !== 'all') qs += `&company=${encodeURIComponent(company)}`;
            const result = await apiRequest(`/unified/activity/summary?${qs}`);
            if (result.success) return result.data;
        } catch {}
        return { totalActions: 0, byUser: [], byModule: [], byLevel: [], byDay: [] };
    },

    getAuditLog() {
        try {
            const data = localStorage.getItem(this.AUDIT_KEY);
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    },

    // ============================================================
    //  CRUD OPERATIONS (all auto-save)
    // ============================================================

    // ---- Customers ----
    addCustomer(customer) {
        customer.id = customer.id || Utils.generateId('CUS');
        customer.created = customer.created || new Date().toISOString().split('T')[0];
        customer.totalSpent = customer.totalSpent || 0;
        DataStore.customers.push(customer);
        this.save();
        this.addAuditEntry('Customer Created', `Added ${customer.name}`);
        return customer;
    },

    updateCustomer(id, updates) {
        const idx = DataStore.customers.findIndex(c => c.id === id);
        if (idx >= 0) {
            Object.assign(DataStore.customers[idx], updates);
            this.save();
            this.addAuditEntry('Customer Updated', `Updated ${DataStore.customers[idx].name}`);
        }
    },

    deleteCustomer(id) {
        DataStore.customers = DataStore.customers.filter(c => c.id !== id);
        this.save();
        this.addAuditEntry('Customer Deleted', `Removed customer ${id}`);
    },

    // ---- Invoices ----
    addInvoice(invoice) {
        invoice.id = invoice.id || Utils.generateId('INV');
        invoice.issueDate = invoice.issueDate || new Date().toISOString().split('T')[0];
        DataStore.invoices.push(invoice);
        this.save();
        this.addAuditEntry('Invoice Created', `${invoice.id} — ${Utils.formatCurrency(invoice.amount)}`);
        return invoice;
    },

    updateInvoice(id, updates) {
        const idx = DataStore.invoices.findIndex(i => i.id === id);
        if (idx >= 0) {
            Object.assign(DataStore.invoices[idx], updates);
            this.save();
            this.addAuditEntry('Invoice Updated', `Updated ${id}`);
        }
    },

    recordPayment(invoiceId, amount) {
        const inv = DataStore.invoices.find(i => i.id === invoiceId);
        if (inv) {
            inv.paid = (inv.paid || 0) + amount;
            if (inv.paid >= inv.amount) {
                inv.status = 'paid';
                inv.paid = inv.amount;
            } else {
                inv.status = 'partial';
            }
            this.save();
            this.addAuditEntry('Payment Recorded', `${Utils.formatCurrency(amount)} for ${invoiceId}`, 'success');
        }
    },

    // ---- Expenses ----
    addExpense(expense) {
        expense.id = expense.id || Utils.generateId('EXP');
        expense.date = expense.date || new Date().toISOString().split('T')[0];
        DataStore.expenses.push(expense);
        this.save();
        this.addAuditEntry('Expense Recorded', `${expense.id} — ${Utils.formatCurrency(expense.amount)}`);
        return expense;
    },

    // ---- Projects ----
    addProject(project) {
        project.id = project.id || Utils.generateId('PRJ');
        DataStore.projects.push(project);
        this.save();
        this.addAuditEntry('Project Created', `${project.name}`);
        return project;
    },

    updateProject(id, updates) {
        const idx = DataStore.projects.findIndex(p => p.id === id);
        if (idx >= 0) {
            Object.assign(DataStore.projects[idx], updates);
            this.save();
            this.addAuditEntry('Project Updated', `Updated ${DataStore.projects[idx].name}`);
        }
    },

    // ---- Bookings ----
    addBooking(booking) {
        booking.id = booking.id || Utils.generateId('BK');
        booking.company = booking.company || 'nuatthai';
        DataStore.bookings.push(booking);
        this.save();
        this.addAuditEntry('Booking Created', `${booking.id} — ${booking.date} ${booking.time}`);
        return booking;
    },

    updateBooking(id, updates) {
        const idx = DataStore.bookings.findIndex(b => b.id === id);
        if (idx >= 0) {
            Object.assign(DataStore.bookings[idx], updates);
            this.save();
            this.addAuditEntry('Booking Updated', `Updated ${id}`);
        }
    },

    // ---- Job Cards ----
    addJobCard(jobCard) {
        jobCard.id = jobCard.id || Utils.generateId('JC');
        jobCard.company = jobCard.company || 'autocasa';
        jobCard.dateIn = jobCard.dateIn || new Date().toISOString().split('T')[0];
        DataStore.jobCards.push(jobCard);
        this.save();
        this.addAuditEntry('Job Card Created', `${jobCard.id}`);
        return jobCard;
    },

    updateJobCard(id, updates) {
        const idx = DataStore.jobCards.findIndex(j => j.id === id);
        if (idx >= 0) {
            Object.assign(DataStore.jobCards[idx], updates);
            this.save();
            this.addAuditEntry('Job Card Updated', `Updated ${id}`);
        }
    },

    // ---- Vehicles ----
    addVehicle(vehicle) {
        vehicle.id = vehicle.id || Utils.generateId('VH');
        DataStore.vehicles.push(vehicle);
        this.save();
        this.addAuditEntry('Vehicle Registered', `${vehicle.make} ${vehicle.model} (${vehicle.plate})`);
        return vehicle;
    },

    // ---- Parts Inventory ----
    updatePartStock(partId, quantityChange) {
        const part = DataStore.autoParts.find(p => p.id === partId);
        if (part) {
            part.quantity += quantityChange;
            if (part.quantity < 0) part.quantity = 0;
            this.save();
            this.addAuditEntry('Inventory Updated', `${part.name}: ${quantityChange > 0 ? '+' : ''}${quantityChange} (now: ${part.quantity})`);
        }
    },

    addPart(part) {
        part.id = part.id || Utils.generateId('PT');
        DataStore.autoParts.push(part);
        this.save();
        this.addAuditEntry('Part Added', `${part.name} (${part.sku})`);
        return part;
    },

    // ---- Memberships ----
    addMembership(membership) {
        membership.id = membership.id || Utils.generateId('MEM');
        membership.purchaseDate = membership.purchaseDate || new Date().toISOString().split('T')[0];
        DataStore.memberships.push(membership);
        this.save();
        this.addAuditEntry('Membership Created', `${membership.type} for ${membership.customer}`);
        return membership;
    },

    // ---- Therapists ----
    updateTherapist(id, updates) {
        const idx = DataStore.therapists.findIndex(t => t.id === id);
        if (idx >= 0) {
            Object.assign(DataStore.therapists[idx], updates);
            this.save();
        }
    },

    // ---- Activity Log ----
    addActivity(type, message, company) {
        DataStore.activityLog.unshift({
            type,
            message,
            company: company || 'all',
            time: new Date().toISOString()
        });
        if (DataStore.activityLog.length > 100) DataStore.activityLog.length = 100;
        this.save();
    },

    // ---- Notifications ----
    addNotification(type, icon, title, message) {
        DataStore.notifications.unshift({
            id: Date.now(),
            type,
            icon,
            title,
            message,
            time: new Date().toISOString(),
            read: false
        });
        if (DataStore.notifications.length > 50) DataStore.notifications.length = 50;
        this.save();
    },

    // ---- Subcontractors ----
    addSubcontractor(sub) {
        sub.id = sub.id || Utils.generateId('SUB');
        DataStore.subcontractors.push(sub);
        this.save();
        this.addAuditEntry('Subcontractor Added', `${sub.name} — ${sub.specialty}`);
        return sub;
    },

    // ---- POS Transaction ----
    processTransaction(transaction) {
        const company = transaction.company || ((typeof App !== 'undefined' && App.activeCompany !== 'all') ? App.activeCompany : 'nuatthai');
        // Create invoice from POS sale
        const invoice = {
            id: Utils.generateId('POS'),
            company: company,
            customer: transaction.customer,
            amount: transaction.total,
            paid: transaction.total,
            status: 'paid',
            dueDate: new Date().toISOString().split('T')[0],
            issueDate: new Date().toISOString().split('T')[0],
            description: `POS: ${transaction.items.map(i => i.name).join(', ')}`,
            paymentMethod: transaction.paymentMethod
        };
        DataStore.invoices.push(invoice);

        // Update therapist status
        if (transaction.therapist) {
            this.updateTherapist(transaction.therapist, { status: 'in-session' });
        }

        // Use membership session if applicable
        if (transaction.membershipId) {
            const mem = DataStore.memberships.find(m => m.id === transaction.membershipId);
            if (mem && mem.sessionsUsed < mem.sessionsTotal) {
                mem.sessionsUsed++;
            }
        }

        this.save();
        this.addActivity('success', `POS Sale: ${Utils.formatCurrency(transaction.total)}`, company);
        this.addAuditEntry('POS Transaction', `${invoice.id} — ${Utils.formatCurrency(transaction.total)}`, 'success');
        return invoice;
    },

    // ---- Inspections ----
    saveInspection(inspection) {
        if (!DataStore.inspections) DataStore.inspections = [];
        inspection.id = inspection.id || Utils.generateId('INS');
        inspection.date = inspection.date || new Date().toISOString();
        inspection.company = 'autocasa';
        DataStore.inspections.push(inspection);
        this.save();
        this.addAuditEntry('Inspection Saved', `${inspection.id} for vehicle ${inspection.vehicleId}`);
        return inspection;
    },

    getInspections() {
        return DataStore.inspections || [];
    },

    // ---- Equipment & Fleet (Construction) ----
    addEquipment(item) {
        item.id = item.id || Utils.generateId('EQP');
        item.dateAdded = item.dateAdded || new Date().toISOString().split('T')[0];
        DataStore.equipment.push(item);
        this.save();
        this.addAuditEntry('Equipment Added', `${item.name} (${item.type})`);
        return item;
    },

    updateEquipment(id, updates) {
        const idx = DataStore.equipment.findIndex(e => e.id === id);
        if (idx >= 0) {
            Object.assign(DataStore.equipment[idx], updates);
            this.save();
            this.addAuditEntry('Equipment Updated', `Updated ${id}`);
        }
    },

    deleteEquipment(id) {
        DataStore.equipment = DataStore.equipment.filter(e => e.id !== id);
        this.save();
        this.addAuditEntry('Equipment Removed', `Removed ${id}`);
    },

    // ---- Safety / QHSE (Construction) ----
    addSafetyRecord(record) {
        record.id = record.id || Utils.generateId('SAF');
        record.date = record.date || new Date().toISOString().split('T')[0];
        DataStore.safetyRecords.push(record);
        this.save();
        this.addAuditEntry('Safety Record', `${record.type}: ${record.title}`);
        return record;
    },

    updateSafetyRecord(id, updates) {
        const idx = DataStore.safetyRecords.findIndex(s => s.id === id);
        if (idx >= 0) {
            Object.assign(DataStore.safetyRecords[idx], updates);
            this.save();
        }
    },

    // ---- Documents (Construction) ----
    addDocument(doc) {
        doc.id = doc.id || Utils.generateId('DOC');
        doc.uploadDate = doc.uploadDate || new Date().toISOString().split('T')[0];
        DataStore.documents.push(doc);
        this.save();
        this.addAuditEntry('Document Added', `${doc.title} (${doc.category})`);
        return doc;
    },

    updateDocument(id, updates) {
        const idx = DataStore.documents.findIndex(d => d.id === id);
        if (idx >= 0) {
            Object.assign(DataStore.documents[idx], updates);
            this.save();
        }
    },

    deleteDocument(id) {
        DataStore.documents = DataStore.documents.filter(d => d.id !== id);
        this.save();
        this.addAuditEntry('Document Deleted', `Removed ${id}`);
    },

    // ---- Spa Inventory (Wellness) ----
    addSpaInventoryItem(item) {
        item.id = item.id || Utils.generateId('SPI');
        DataStore.spaInventory.push(item);
        this.save();
        this.addAuditEntry('Spa Item Added', `${item.name}`);
        return item;
    },

    updateSpaInventory(id, updates) {
        const idx = DataStore.spaInventory.findIndex(i => i.id === id);
        if (idx >= 0) {
            Object.assign(DataStore.spaInventory[idx], updates);
            this.save();
        }
    },

    // ---- Estimates / Quotes (Automotive) ----
    addEstimate(estimate) {
        estimate.id = estimate.id || Utils.generateId('EST');
        estimate.date = estimate.date || new Date().toISOString().split('T')[0];
        estimate.company = estimate.company || 'autocasa';
        DataStore.estimates.push(estimate);
        this.save();
        this.addAuditEntry('Estimate Created', `${estimate.id} — ${Utils.formatCurrency(estimate.total)}`);
        return estimate;
    },

    updateEstimate(id, updates) {
        const idx = DataStore.estimates.findIndex(e => e.id === id);
        if (idx >= 0) {
            Object.assign(DataStore.estimates[idx], updates);
            this.save();
        }
    },

    convertEstimateToJob(estimateId) {
        const est = DataStore.estimates.find(e => e.id === estimateId);
        if (!est) return null;
        est.status = 'converted';
        const jobCard = this.addJobCard({
            customer: est.customer,
            vehicle: est.vehicle,
            services: est.services,
            total: est.total,
            priority: est.priority || 'normal',
            notes: `Converted from Estimate ${est.id}`
        });
        this.save();
        return jobCard;
    },

    // ============================================================
    //  BIR INVOICES / OFFICIAL RECEIPTS
    // ============================================================
    addBirInvoice(invoice) {
        const id = Utils.generateId('BIR');
        const entry = { id, ...invoice, date: invoice.date || new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() };
        DataStore.birInvoices.push(entry);
        this.save();
        this.addAuditEntry('BIR Invoice Created', `Invoice ${id} for ${invoice.customerName || 'customer'}`);
        return entry;
    },
    updateBirInvoice(id, updates) {
        const inv = DataStore.birInvoices.find(i => i.id === id);
        if (inv) { Object.assign(inv, updates); this.save(); }
        return inv;
    },
    deleteBirInvoice(id) {
        DataStore.birInvoices = DataStore.birInvoices.filter(i => i.id !== id);
        this.save();
    },
    getNextBirSeriesNo(company) {
        const companyInvs = DataStore.birInvoices.filter(i => i.company === company);
        return String(companyInvs.length + 1).padStart(7, '0');
    },

    // ============================================================
    //  EMPLOYEES
    // ============================================================
    addEmployee(employee) {
        const id = Utils.generateId('EMP');
        // Auto-generate numeric userId if not provided (4-digit, starts at 1001)
        let userId = employee.userId;
        if (!userId) {
            const existingIds = DataStore.employees.map(e => parseInt(e.userId, 10)).filter(n => !isNaN(n));
            const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 1000;
            userId = String(maxId + 1);
        }
        const entry = { id, ...employee, userId, createdAt: new Date().toISOString() };
        DataStore.employees.push(entry);
        this.save();
        this.addAuditEntry('Employee Added', `${employee.name} (${employee.company}) — User ID: ${userId}`);
        return entry;
    },
    updateEmployee(id, updates) {
        const emp = DataStore.employees.find(e => e.id === id);
        if (emp) { Object.assign(emp, updates); this.save(); }
        return emp;
    },
    deleteEmployee(id) {
        DataStore.employees = DataStore.employees.filter(e => e.id !== id);
        this.save();
    },

    // ============================================================
    //  PAYSLIPS
    // ============================================================
    addPayslip(payslip) {
        const id = Utils.generateId('PAY');
        const entry = { id, ...payslip, generatedAt: new Date().toISOString() };
        DataStore.payslips.push(entry);
        this.save();
        this.addAuditEntry('Payslip Generated', `Payslip ${id} for ${payslip.employeeName}`);
        return entry;
    },
    updatePayslip(id, updates) {
        const ps = DataStore.payslips.find(p => p.id === id);
        if (ps) { Object.assign(ps, updates); this.save(); }
        return ps;
    },

    // ============================================================
    //  INVENTORY ITEMS
    // ============================================================
    addInventoryItem(item) {
        const id = Utils.generateId('INV');
        const entry = { id, ...item, quantity: item.quantity || 0, createdAt: new Date().toISOString() };
        DataStore.inventoryItems.push(entry);
        this.save();
        this.addAuditEntry('Inventory Item Added', `${item.name} (${item.company})`);
        return entry;
    },
    updateInventoryItem(id, updates) {
        const item = DataStore.inventoryItems.find(i => i.id === id);
        if (item) { Object.assign(item, updates); this.save(); }
        return item;
    },
    deleteInventoryItem(id) {
        DataStore.inventoryItems = DataStore.inventoryItems.filter(i => i.id !== id);
        this.save();
    },

    // ============================================================
    //  INVENTORY TRANSACTIONS (IN / OUT log)
    // ============================================================
    addInventoryTransaction(txn) {
        const id = Utils.generateId('TXN');
        const entry = { id, ...txn, timestamp: new Date().toISOString() };
        DataStore.inventoryTransactions.push(entry);
        // Update item quantity
        const item = DataStore.inventoryItems.find(i => i.id === txn.itemId);
        if (item) {
            if (txn.direction === 'in') item.quantity = (item.quantity || 0) + txn.qty;
            else if (txn.direction === 'out') item.quantity = Math.max(0, (item.quantity || 0) - txn.qty);
        }
        this.save();
        return entry;
    },

    // ============================================================
    //  PERFORMANCE REVIEWS
    // ============================================================
    addPerformanceReview(review) {
        const id = Utils.generateId('PRV');
        const entry = { id, ...review, createdAt: new Date().toISOString() };
        DataStore.performanceReviews.push(entry);
        this.save();
        this.addAuditEntry('Performance Review Added', `Review ${id} for ${review.employeeName || review.employeeId}`);
        return entry;
    },
    updatePerformanceReview(id, updates) {
        const r = DataStore.performanceReviews.find(p => p.id === id);
        if (r) { Object.assign(r, updates); this.save(); }
        return r;
    },
    deletePerformanceReview(id) {
        DataStore.performanceReviews = DataStore.performanceReviews.filter(p => p.id !== id);
        this.save();
    },

    // ============================================================
    //  TIMESHEETS
    // ============================================================
    addTimesheet(ts) {
        const id = Utils.generateId('TS');
        const entry = { id, ...ts, createdAt: new Date().toISOString() };
        DataStore.timesheets.push(entry);
        this.save();
        this.addAuditEntry('Timesheet Generated', `Timesheet ${id} for ${ts.employeeName || ts.employeeId}`);
        return entry;
    },
    updateTimesheet(id, updates) {
        const ts = DataStore.timesheets.find(t => t.id === id);
        if (ts) { Object.assign(ts, updates); this.save(); }
        return ts;
    },
    deleteTimesheet(id) {
        DataStore.timesheets = DataStore.timesheets.filter(t => t.id !== id);
        this.save();
    },

    // ============================================================
    //  INCIDENT REPORTS
    // ============================================================
    addIncidentReport(report) {
        const id = Utils.generateId('INC');
        const entry = { id, ...report, createdAt: new Date().toISOString() };
        DataStore.incidentReports.push(entry);
        this.save();
        this.addAuditEntry('Incident Report Filed', `Incident ${id}: ${report.type} - ${report.severity}`);
        return entry;
    },
    updateIncidentReport(id, updates) {
        const r = DataStore.incidentReports.find(i => i.id === id);
        if (r) { Object.assign(r, updates); this.save(); }
        return r;
    },
    deleteIncidentReport(id) {
        DataStore.incidentReports = DataStore.incidentReports.filter(i => i.id !== id);
        this.save();
    },

    // ============================================================
    //  SERVER SYNCHRONIZATION
    // ============================================================

    // Pull all data from server and merge into local DataStore.
    // Server data is authoritative — overwrites local for matching IDs, adds new.
    // Superadmin/owner with company='all' gets data from ALL businesses.
    async loadFromServer() {
        if (typeof navigator === 'undefined' || !navigator.onLine) return;
        try {
            const healthy = await checkApiHealth();
            if (!healthy) return;

            const session = JSON.parse(localStorage.getItem('ubms_session') || '{}');
            // Superadmin and owner see ALL data across all companies
            const role = session.role || '';
            const business = (role === 'superadmin' || role === 'owner' || (session.companies && session.companies.includes('all')))
                ? 'all' : (session.company || 'all');

            const response = await fetch(`${API_BASE_URL}/data/export?business=${encodeURIComponent(business)}`, {
                signal: AbortSignal.timeout(15000)
            });
            if (!response.ok) return;
            const result = await response.json();
            if (!result.success || !result.data) return;

            // Merge server users into localStorage — server wins for existing users
            if (result.data._users && Array.isArray(result.data._users)) {
                const localRaw = localStorage.getItem(this.USERS_KEY);
                const localUsers = localRaw ? JSON.parse(localRaw) : [];
                const byId = new Map(localUsers.map(u => [u.id, u]));
                for (const su of result.data._users) {
                    const existing = byId.get(su.id);
                    if (existing) {
                        // Merge: prefer server data, but keep local password only if server doesn't have one
                        const mergedPass = su.password || existing.password;
                        byId.set(su.id, { ...existing, ...su, password: mergedPass });
                    } else {
                        byId.set(su.id, su);
                    }
                }
                localStorage.setItem(this.USERS_KEY, JSON.stringify(Array.from(byId.values())));
            }

            // Merge server entities into DataStore — server wins for matching IDs
            const entityTypes = [
                'customers', 'invoices', 'expenses', 'projects', 'bookings',
                'jobCards', 'vehicles', 'autoParts', 'memberships', 'employees',
                'payslips', 'inventoryItems', 'inventoryTransactions', 'estimates',
                'birInvoices', 'equipment', 'safetyRecords', 'documents',
                'spaInventory', 'performanceReviews', 'timesheets', 'incidentReports',
                'subcontractors', 'inspections', 'therapists', 'posTransactions',
                'attendanceRecords', 'journalEntries', 'isoDocuments', 'isoAudits',
                'isoNcrs', 'isoCpars', 'bankReconciliations', 'collectionReceipts',
                'workSchedules', 'biometricLogs'
            ];
            let merged = 0;
            for (const type of entityTypes) {
                if (!result.data[type] || !Array.isArray(result.data[type])) continue;
                if (!Array.isArray(DataStore[type])) DataStore[type] = [];
                const localById = new Map(DataStore[type].filter(x => x && x.id).map(x => [x.id, x]));
                for (const item of result.data[type]) {
                    if (!item || !item.id) continue;
                    const { _createdBy, _business, _createdAt, _updatedAt, ...clean } = item;
                    // Ensure customer objects always have a companies array
                    if (type === 'customers' && !clean.companies) clean.companies = [];
                    if (localById.has(item.id)) {
                        // Server wins: update local with server data
                        Object.assign(localById.get(item.id), clean);
                    } else {
                        // New item from another user/PC
                        localById.set(item.id, clean);
                    }
                    merged++;
                }
                DataStore[type] = Array.from(localById.values());
            }

            this._saveLocal();
            if (merged > 0) {
                console.log(`✓ Synced ${merged} records from server`);
                window.dispatchEvent(new CustomEvent('ubms-data-loaded', { detail: { count: merged } }));
            }
        } catch (e) {
            console.error('loadFromServer error:', e.message);
        }
    },

    // Push all localStorage users to the server (captures users created offline)
    async syncUsersToServer() {
        try {
            if (!navigator.onLine) return;
            const raw = localStorage.getItem(this.USERS_KEY);
            if (!raw) return;
            const users = JSON.parse(raw);
            if (!users || users.length === 0) return;
            await fetch(`${API_BASE_URL}/data/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { _users: users }, userId: 'system', business: 'all' })
            });
        } catch (e) {
            console.error('syncUsersToServer error:', e.message);
        }
    },

    // Push all local DataStore data to the server (call manually or on reconnect)
    async syncAllToServer() {
        try {
            if (!navigator.onLine) return { success: false, error: 'Offline' };
            const healthy = await checkApiHealth();
            if (!healthy) return { success: false, error: 'Server unreachable' };

            const session = JSON.parse(localStorage.getItem('ubms_session') || '{}');
            const userId = session.userId || session.id || session.username || 'unknown';
            const business = session.company || 'all';

            const entityTypes = [
                'customers', 'invoices', 'expenses', 'projects', 'bookings',
                'jobCards', 'vehicles', 'autoParts', 'memberships', 'employees',
                'payslips', 'inventoryItems', 'inventoryTransactions', 'estimates',
                'birInvoices', 'equipment', 'safetyRecords', 'documents',
                'spaInventory', 'performanceReviews', 'timesheets', 'incidentReports',
                'subcontractors', 'inspections', 'therapists', 'posTransactions',
                'attendanceRecords', 'journalEntries', 'isoDocuments', 'isoAudits',
                'isoNcrs', 'isoCpars', 'bankReconciliations', 'collectionReceipts',
                'workSchedules', 'biometricLogs'
            ];
            const payload = {};
            for (const type of entityTypes) {
                if (DataStore[type] && DataStore[type].length > 0) {
                    payload[type] = DataStore[type];
                }
            }
            const users = JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]');
            if (users.length > 0) payload._users = users;

            // Also include audit log
            const auditRaw = localStorage.getItem(this.AUDIT_KEY);
            if (auditRaw) {
                try { payload.activityLog = JSON.parse(auditRaw); } catch {}
            }

            const response = await fetch(`${API_BASE_URL}/data/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: payload, userId, business })
            });
            const result = await response.json();
            return result;
        } catch (e) {
            console.error('syncAllToServer error:', e.message);
            return { success: false, error: e.message };
        }
    },

    // Internal: save to localStorage without triggering sync wrappers
    _saveLocal() {
        this.save();
    }
};
