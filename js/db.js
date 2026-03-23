/* ========================================
   UBMS - Database Persistence Layer
   localStorage-backed with auto-save
   Supports unified + standalone modes
   ======================================== */

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
    resetPassword(username, email, newPassword, company) {
        const user = this.findUser(username);
        if (!user) return { success: false, error: 'No account found with that username.' };
        if (user.email !== email) return { success: false, error: 'Username and email do not match.' };
        if (user.status !== 'active') return { success: false, error: 'This account is deactivated.' };
        if (user.isSuperAdmin) return { success: false, error: 'Super Admin password cannot be reset here.' };
        // Check company access if specified
        if (company && !user.companies.includes('all') && !user.companies.includes(company)) {
            return { success: false, error: 'This account does not have access to this business.' };
        }
        if (!newPassword || newPassword.length < 8) return { success: false, error: 'Password must be at least 8 characters.' };
        this.updateUser(user.id, { password: newPassword, mustChangePassword: false });
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
                    'performanceReviews', 'timesheets', 'incidentReports'
                ];
                mutableKeys.forEach(key => {
                    if (data[key] !== undefined) {
                        DataStore[key] = data[key];
                    }
                });
            }
        } catch (e) {
            console.error('Database load error:', e);
        }
    },

    // ---- Save to localStorage ----
    save() {
        try {
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

    // ---- Get all users ----
    getUsers() {
        try {
            const data = localStorage.getItem(this.USERS_KEY);
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    },

    // ---- Save users ----
    saveUsers(users) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    },

    // ---- Find user by username ----
    findUser(username) {
        return this.getUsers().find(u => u.username === username);
    },

    // ---- Find user by email ----
    findUserByEmail(email) {
        return this.getUsers().find(u => u.email === email);
    },

    // ---- Authenticate user ----
    authenticate(username, password, company) {
        const user = this.findUser(username);
        if (!user) return { success: false, error: 'User not found' };
        if (user.password !== password) return { success: false, error: 'Invalid password' };
        if (user.status !== 'active') return { success: false, error: 'Account is deactivated' };

        // Check company access
        if (!user.companies.includes('all') && company !== 'all' && !user.companies.includes(company)) {
            return { success: false, error: 'No access to this company' };
        }

        // Update last login
        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === user.id);
        if (idx >= 0) {
            users[idx].lastLogin = new Date().toISOString();
            this.saveUsers(users);
        }

        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
                companies: user.companies,
                modules: user.modules,
                company: user.companies.includes('all') ? (company || 'all') : user.companies[0],
                isSuperAdmin: user.isSuperAdmin || false,
                avatar: user.avatar
            }
        };
    },

    // ---- Authenticate Super Admin by code ----
    authenticateSuperAdmin(code) {
        if (code !== this.getSuperAdminCode()) {
            return { success: false, error: 'Invalid Super Admin code' };
        }
        const user = this.getUsers().find(u => u.isSuperAdmin);
        if (!user) return { success: false, error: 'Super Admin account not found' };

        // Update last login
        const users = this.getUsers();
        const idx = users.findIndex(u => u.isSuperAdmin);
        if (idx >= 0) {
            users[idx].lastLogin = new Date().toISOString();
            this.saveUsers(users);
        }

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
                avatar: 'SA'
            }
        };
    },

    // ---- Add user ----
    addUser(userData) {
        const users = this.getUsers();
        if (users.find(u => u.username === userData.username)) {
            return { success: false, error: 'Username already exists' };
        }
        if (users.find(u => u.email === userData.email)) {
            return { success: false, error: 'Email already registered' };
        }
        const newUser = {
            id: 'USR-' + Date.now().toString(36).toUpperCase(),
            name: userData.name,
            username: userData.username,
            email: userData.email,
            password: userData.password,
            role: userData.role,
            companies: userData.companies || [],
            modules: userData.modules || [],
            status: 'active',
            mustChangePassword: userData.mustChangePassword !== undefined ? userData.mustChangePassword : true,
            created: new Date().toISOString(),
            lastLogin: null,
            avatar: userData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        };
        users.push(newUser);
        this.saveUsers(users);
        this.addAuditEntry('User Created', `Created user ${newUser.name} (${newUser.email}) with role: ${newUser.role}`);
        return { success: true, user: newUser };
    },

    // ---- Update user ----
    updateUser(userId, updates) {
        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx < 0) return { success: false, error: 'User not found' };

        // Don't allow changing Super Admin's core properties
        if (users[idx].isSuperAdmin && (updates.role || updates.status === 'inactive')) {
            return { success: false, error: 'Cannot modify Super Admin core settings' };
        }

        Object.assign(users[idx], updates);
        if (updates.name) {
            users[idx].avatar = updates.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        }
        this.saveUsers(users);
        this.addAuditEntry('User Updated', `Updated user ${users[idx].name}: ${Object.keys(updates).join(', ')}`);
        return { success: true, user: users[idx] };
    },

    // ---- Deactivate user ----
    deactivateUser(userId) {
        return this.updateUser(userId, { status: 'inactive' });
    },

    // ---- Activate user ----
    activateUser(userId) {
        return this.updateUser(userId, { status: 'active' });
    },

    // ---- Delete user ----
    deleteUser(userId) {
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);
        if (!user) return { success: false, error: 'User not found' };
        if (user.isSuperAdmin) return { success: false, error: 'Cannot delete Super Admin' };
        const filtered = users.filter(u => u.id !== userId);
        this.saveUsers(filtered);
        this.addAuditEntry('User Deleted', `Deleted user ${user.name} (${user.email})`);
        return { success: true };
    },

    // ============================================================
    //  AUDIT LOG
    // ============================================================
    addAuditEntry(action, detail, level = 'info') {
        try {
            const logs = this.getAuditLog();
            const session = JSON.parse(localStorage.getItem('ubms_session') || '{}');
            logs.unshift({
                time: new Date().toISOString(),
                user: session.username || 'system',
                action,
                detail,
                level
            });
            // Keep last 500 entries
            if (logs.length > 500) logs.length = 500;
            localStorage.setItem(this.AUDIT_KEY, JSON.stringify(logs));
        } catch (e) {
            console.error('Audit log error:', e);
        }
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

    // ---- POS Transaction (Wellness) ----
    processTransaction(transaction) {
        // Create invoice from POS sale
        const invoice = {
            id: Utils.generateId('POS'),
            company: 'nuatthai',
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
        this.addActivity('success', `POS Sale: ${Utils.formatCurrency(transaction.total)}`, 'nuatthai');
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
    }
};
