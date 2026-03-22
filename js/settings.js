/* ========================================
   UBMS - Settings / Administration Module
   Users, Roles, Company, Audit Log
   ======================================== */

const Settings = {
    render(container) {
        container.innerHTML = `
        <div class="section-header mb-3">
            <h2>Administration & Settings</h2>
        </div>

        <div class="tabs mb-3">
            <button class="tab-btn active" onclick="Settings.switchTab('users',this)">Users</button>
            <button class="tab-btn" onclick="Settings.switchTab('roles',this)">Roles & Permissions</button>
            <button class="tab-btn" onclick="Settings.switchTab('companies',this)">Company Settings</button>
            <button class="tab-btn" onclick="Settings.switchTab('audit',this)">Audit Log</button>
            <button class="tab-btn" onclick="Settings.switchTab('myaccount',this)"><i class="fas fa-user-shield" style="margin-right:5px"></i>My Account</button>
            ${Auth.isSuperAdmin() ? '<button class="tab-btn" onclick="Settings.switchTab(\'system\',this)"><i class="fas fa-server" style="margin-right:5px"></i>System</button>' : ''}
        </div>

        <div id="settingsContent">
            ${this.renderUsers()}
        </div>`;
    },

    switchTab(tab, btn) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const el = document.getElementById('settingsContent');
        switch (tab) {
            case 'users': el.innerHTML = this.renderUsers(); break;
            case 'roles': el.innerHTML = this.renderRoles(); break;
            case 'companies': el.innerHTML = this.renderCompanySettings(); break;
            case 'audit': el.innerHTML = this.renderAuditLog(); break;
            case 'myaccount': el.innerHTML = this.renderMyAccount(); break;
            case 'system': el.innerHTML = this.renderSystem(); break;
        }
    },

    renderUsers() {
        const users = Database.getUsers().filter(u => !u.isSuperAdmin);

        return `
        <div class="section-header mb-2">
            <h3>User Management</h3>
            <button class="btn btn-primary" onclick="Admin.openAddUser()"><i class="fas fa-user-plus"></i> Add User</button>
        </div>

        <div class="card">
            <div class="card-body no-padding">
                ${Utils.buildTable(
                    [
                        { label: 'User', render: r => `<div style="display:flex;align-items:center;gap:10px"><div class="avatar" style="background:var(--secondary);color:#fff">${(r.avatar || r.name[0])}</div><div><strong>${r.name}</strong><div style="font-size:11px;color:var(--text-muted)">@${r.username}</div></div></div>` },
                        { label: 'Role', render: r => `<span class="badge-tag badge-${r.role === 'owner' ? 'danger' : r.role === 'manager' ? 'warning' : r.role === 'accountant' ? 'info' : 'neutral'}">${r.role}</span>` },
                        { label: 'Email', render: r => `<a href="mailto:${r.email}" style="color:var(--primary);text-decoration:none">${r.email}</a>` },
                        { label: 'Companies', render: r => r.companies.includes('all') ? '<span class="badge-tag badge-teal">All Companies</span>' : r.companies.map(c => `<span class="badge-tag" style="background:${Utils.getCompanyColor(c)}20;color:${Utils.getCompanyColor(c)}">${c}</span>`).join(' ') },
                        { label: 'Last Login', render: r => r.lastLogin ? Utils.formatDateTime(r.lastLogin) : 'Never' },
                        { label: 'Status', render: r => `<span class="badge-tag ${r.status === 'active' ? 'badge-success' : 'badge-danger'}">${r.status}</span>` }
                    ],
                    users,
                    {
                        actions: r => `
                            ${Auth.canEditDelete() ? `<button class="btn btn-sm btn-secondary" onclick="Settings.openEditUser('${r.id}')" title="Edit"><i class="fas fa-edit"></i></button>` : ''}
                            ${Auth.canEditDelete() && r.role !== 'owner' ? `<button class="btn btn-sm btn-danger" style="margin-left:4px" onclick="Settings.toggleUserStatus('${r.id}')" title="Deactivate"><i class="fas fa-ban"></i></button>` : ''}
                        `
                    }
                )}
            </div>
        </div>`;
    },

    openAddUser() {
        App.openModal('Add User', `
        <form>
            <div class="form-row">
                <div class="form-group"><label>Full Name</label><input type="text" class="form-control" id="newUserName"></div>
                <div class="form-group"><label>Username</label><input type="text" class="form-control" id="newUserUsername"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Email</label><input type="email" class="form-control" id="newUserEmail"></div>
                <div class="form-group"><label>Role</label>
                    <select class="form-control" id="newUserRole">
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="accountant">Accountant</option>
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Company Access</label>
                <div style="display:flex;gap:12px;flex-wrap:wrap">
                    ${Object.entries(DataStore.companies).map(([k, v]) => `<label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="checkbox" value="${k}"> ${v.name}</label>`).join('')}
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Password</label><input type="password" class="form-control" id="newUserPass"></div>
                <div class="form-group"><label>Confirm Password</label><input type="password" class="form-control" id="newUserPassConfirm"></div>
            </div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Admin.saveNewUser()"><i class="fas fa-save"></i> Create User</button>
        `);
    },

    renderRoles() {
        const roles = [
            { role: 'Super Admin', description: 'Highest authority. Unique access code. Full system control including database management, user creation, and all business operations.',
              perms: ['Everything', 'Database Reset', 'User Management', 'Tab Assignment', 'Business Assignment', 'Audit Log'] },
            { role: 'Owner', description: 'Full system access. Can manage all companies, users, and settings.',
              perms: ['Dashboard (Group)', 'CRM', 'Financial', 'Reports', 'Construction Hub', 'Wellness Hub', 'Automotive Hub', 'Settings', 'Admin Panel', 'Audit Log'] },
            { role: 'Manager', description: 'Company-level access. Can manage operations within assigned companies.',
              perms: ['Dashboard (Company)', 'CRM', 'Financial', 'Reports', 'Industry Hub (assigned)', 'Staff Management'] },
            { role: 'Accountant', description: 'Financial access across companies. Read-only on operational modules.',
              perms: ['Dashboard (Read)', 'Financial (Full)', 'Reports', 'Chart of Accounts', 'Tax Reports'] },
            { role: 'Staff', description: 'Limited access to assigned company modules. Cannot modify financial data.',
              perms: ['Dashboard (Company, Read)', 'CRM (Read)', 'Industry Hub (assigned, limited)'] }
        ];

        return `
        <h3 class="mb-2">Role Definitions & Permissions</h3>
        <div class="grid-2" style="gap:16px">
            ${roles.map(r => `
            <div class="card">
                <div class="card-header"><h3>${r.role}</h3></div>
                <div class="card-body">
                    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">${r.description}</p>
                    <h4 style="font-size:12px;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase">Permissions</h4>
                    <div style="display:flex;flex-wrap:wrap;gap:6px">
                        ${r.perms.map(p => `<span class="badge-tag badge-teal" style="font-size:11px">${p}</span>`).join('')}
                    </div>
                </div>
            </div>`).join('')}
        </div>`;
    },

    renderCompanySettings() {
        return `
        <h3 class="mb-2">Company Profiles</h3>
        ${Object.entries(DataStore.companies).map(([key, co]) => `
        <div class="card mb-2">
            <div class="card-header" style="border-bottom:3px solid ${co.color}">
                <div style="display:flex;align-items:center;gap:12px">
                    <div style="width:40px;height:40px;background:${co.color};border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px">
                        <i class="fas fa-${co.icon}"></i>
                    </div>
                    <div>
                        <h3>${co.name}</h3>
                        <span style="font-size:12px;color:var(--text-muted)">${key.toUpperCase()}</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-secondary" onclick="Settings.openEditCompany('${key}')"><i class="fas fa-edit"></i> Edit</button>
            </div>
            <div class="card-body">
                <div class="grid-2" style="gap:12px;font-size:13px">
                    <div><strong>Address:</strong> ${co.address}</div>
                    <div><strong>TIN:</strong> ${co.tin}</div>
                    <div><strong>Industry:</strong> ${key === 'dheekay' || key === 'kdchavit' ? 'Construction' : key === 'nuatthai' ? 'Wellness & Spa' : 'Automotive'}</div>
                    <div><strong>Brand Color:</strong> <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:14px;height:14px;background:${co.color};border-radius:3px;display:inline-block"></span>${co.color}</span></div>
                </div>
            </div>
        </div>`).join('')}

        <div class="card mt-3">
            <div class="card-header"><h3>System Preferences</h3></div>
            <div class="card-body">
                <div class="grid-2" style="gap:16px">
                    <div class="form-group">
                        <label>Currency</label>
                        <select class="form-control" id="prefCurrency"><option value="₱ Philippine Peso (PHP)" selected>₱ Philippine Peso (PHP)</option></select>
                    </div>
                    <div class="form-group">
                        <label>Date Format</label>
                        <select class="form-control" id="prefDateFormat"><option value="MMM DD, YYYY" selected>MMM DD, YYYY</option><option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="YYYY-MM-DD">YYYY-MM-DD</option></select>
                    </div>
                    <div class="form-group">
                        <label>Fiscal Year Start</label>
                        <select class="form-control" id="prefFiscalYear"><option value="January" selected>January</option></select>
                    </div>
                    <div class="form-group">
                        <label>Default Tax Rate (VAT)</label>
                        <input type="number" class="form-control" id="prefTaxRate" value="12" min="0" max="100">
                    </div>
                </div>
                <button class="btn btn-primary mt-2" onclick="Settings.savePreferences()"><i class="fas fa-save"></i> Save Preferences</button>
            </div>
        </div>`;
    },

    renderMyAccount() {
        const u = Auth.session;
        return `
        <h3 class="mb-3">My Account</h3>
        <div class="grid-2" style="gap:20px">

            <div class="card">
                <div class="card-header"><h3><i class="fas fa-id-card" style="margin-right:8px"></i>Profile</h3></div>
                <div class="card-body">
                    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
                        <div class="avatar" style="width:56px;height:56px;font-size:22px;background:var(--secondary);color:#fff">${u ? (u.name ? u.name[0] : u.username[0]).toUpperCase() : '?'}</div>
                        <div>
                            <div style="font-size:16px;font-weight:600">${u ? u.name : ''}</div>
                            <div style="font-size:13px;color:var(--text-muted)">@${u ? u.username : ''}</div>
                            <span class="badge-tag badge-${u && u.role === 'owner' ? 'danger' : u && u.role === 'manager' ? 'warning' : u && u.role === 'accountant' ? 'info' : 'neutral'}" style="margin-top:4px">${u ? u.role : ''}</span>
                        </div>
                    </div>
                    <div style="font-size:13px;line-height:2">
                        <div><strong>Email:</strong> ${u ? (u.email || '—') : '—'}</div>
                        <div><strong>Last Login:</strong> ${u && u.lastLogin ? Utils.formatDateTime(u.lastLogin) : 'This session'}</div>
                        <div><strong>Company Access:</strong> ${u && u.companies ? (u.companies.includes('all') ? 'All Companies' : u.companies.join(', ')) : '—'}</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3><i class="fas fa-lock" style="margin-right:8px"></i>Change Password</h3></div>
                <div class="card-body">
                    <div id="pwChangeMsg" style="margin-bottom:12px"></div>
                    <div class="form-group">
                        <label>Current Password</label>
                        ${Utils.pwWrap('<input type="password" class="form-control" id="curPw" placeholder="Enter your current password">')}
                    </div>
                    <div class="form-group">
                        <label>New Password <span style="font-size:11px;color:var(--text-muted)">(min 8 characters)</span></label>
                        ${Utils.pwWrap('<input type="password" class="form-control" id="newPw" placeholder="Enter new password">')}
                    </div>
                    <div class="form-group">
                        <label>Confirm New Password</label>
                        ${Utils.pwWrap('<input type="password" class="form-control" id="confirmPw" placeholder="Re-enter new password">')}
                    </div>
                    <button class="btn btn-primary" onclick="Settings.saveMyPassword()" style="width:100%">
                        <i class="fas fa-key"></i> Update Password
                    </button>
                </div>
            </div>

        </div>`;
    },

    saveMyPassword() {
        const curPw = document.getElementById('curPw').value.trim();
        const newPw = document.getElementById('newPw').value.trim();
        const confirmPw = document.getElementById('confirmPw').value.trim();
        const msgEl = document.getElementById('pwChangeMsg');

        const showMsg = (text, type) => {
            msgEl.innerHTML = `<div class="alert alert-${type}" style="padding:10px 14px;border-radius:6px;font-size:13px;background:${type==='danger'?'#ffeaea':'#eaffea'};color:${type==='danger'?'#c0392b':'#27ae60'};border:1px solid ${type==='danger'?'#f5c6cb':'#a3d9a5'}">${text}</div>`;
        };

        if (!curPw || !newPw || !confirmPw) { showMsg('All fields are required.', 'danger'); return; }
        if (newPw.length < 8) { showMsg('New password must be at least 8 characters.', 'danger'); return; }
        if (newPw !== confirmPw) { showMsg('New passwords do not match.', 'danger'); return; }

        const username = Auth.session && Auth.session.username;
        if (!username) { showMsg('Session error. Please log in again.', 'danger'); return; }

        const user = Database.getUsers().find(u => u.username === username);
        if (!user) { showMsg('User account not found.', 'danger'); return; }
        if (user.password !== curPw) { showMsg('Current password is incorrect.', 'danger'); return; }
        if (newPw === curPw) { showMsg('New password must differ from current password.', 'danger'); return; }

        Database.updateUser(user.id, { password: newPw, mustChangePassword: false });
        Database.addAuditEntry('Password Changed', `${username} changed their account password`, 'info');

        document.getElementById('curPw').value = '';
        document.getElementById('newPw').value = '';
        document.getElementById('confirmPw').value = '';
        showMsg('Password updated successfully.', 'success');
        App.showToast('Password updated successfully', 'success');
    },

    renderAuditLog() {
        const logs = Database.getAuditLog().slice(0, 50);

        return `
        <div class="section-header mb-2">
            <h3>Audit Log</h3>
            <div class="section-actions">
                <select class="form-control" style="width:120px">
                    <option value="all">All Levels</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="success">Success</option>
                </select>
                <button class="btn btn-secondary" onclick="Settings.exportAuditLog()"><i class="fas fa-download"></i> Export</button>
            </div>
        </div>

        <div class="card">
            <div class="card-body no-padding">
                ${Utils.buildTable(
                    [
                        { label: 'Timestamp', render: r => `<span style="font-family:monospace;font-size:12px">${Utils.formatDateTime(r.time)}</span>` },
                        { label: 'User', render: r => `<span class="badge-tag badge-neutral">${r.user}</span>` },
                        { label: 'Action', render: r => `<strong>${r.action}</strong>` },
                        { label: 'Details', render: r => `<span style="font-size:12px;color:var(--text-secondary)">${r.detail}</span>` },
                        { label: 'Level', render: r => `<span class="badge-tag ${r.level === 'warning' ? 'badge-warning' : r.level === 'success' ? 'badge-success' : 'badge-info'}">${r.level}</span>` }
                    ],
                    logs
                )}
            </div>
        </div>`;
    },

    openEditUser(userId) {
        if (!Auth.canEditDelete()) { App.showToast('Only Owner or Super Admin can edit users', 'error'); return; }
        Admin.openEditUser(userId);
        setTimeout(() => {
            const saveBtn = document.querySelector('#modalFooter .btn-primary');
            if (saveBtn) saveBtn.setAttribute('onclick', 'Settings._doSaveEditUser()');
        }, 0);
    },

    _doSaveEditUser() {
        const userId = document.getElementById('editUserId')?.value;
        if (!userId) return;
        const updates = {
            name: document.getElementById('editUserName')?.value.trim(),
            email: document.getElementById('editUserEmail')?.value.trim(),
            role: document.getElementById('editUserRole')?.value,
            companies: Array.from(document.querySelectorAll('.edit-user-company:checked')).map(c => c.value),
            modules: document.getElementById('editUserAllModules')?.checked ? ['all'] :
                Array.from(document.querySelectorAll('.edit-user-module:checked')).map(c => c.value)
        };
        const newPass = document.getElementById('editUserPass')?.value;
        if (newPass) updates.password = newPass;
        if (!updates.name || !updates.email) { App.showToast('Name and email are required', 'error'); return; }
        const result = Database.updateUser(userId, updates);
        if (result.success) {
            App.closeModal();
            App.showToast('User updated successfully', 'success');
            const el = document.getElementById('settingsContent');
            if (el) el.innerHTML = Settings.renderUsers();
        } else {
            App.showToast(result.error, 'error');
        }
    },

    toggleUserStatus(userId) {
        if (!Auth.canEditDelete()) { App.showToast('Only Owner or Super Admin can modify users', 'error'); return; }
        const user = Database.getUsers().find(u => u.id === userId);
        if (!user) return;
        const result = user.status === 'active' ? Database.deactivateUser(userId) : Database.activateUser(userId);
        if (result.success) {
            App.showToast(`User ${user.name} ${user.status === 'active' ? 'deactivated' : 'activated'}`, 'success');
            const el = document.getElementById('settingsContent');
            if (el) el.innerHTML = Settings.renderUsers();
        }
    },

    openEditCompany(key) {
        const co = DataStore.companies[key];
        if (!co) return;
        App.openModal(`Edit Company — ${co.name}`, `
        <form>
            <div class="form-group">
                <label>Company Name <span class="required">*</span></label>
                <input type="text" class="form-control" id="editCoName" value="${Utils.escapeHtml(co.name)}">
            </div>
            <div class="form-group">
                <label>Address</label>
                <input type="text" class="form-control" id="editCoAddress" value="${Utils.escapeHtml(co.address || '')}">
            </div>
            <div class="form-group">
                <label>TIN</label>
                <input type="text" class="form-control" id="editCoTin" value="${Utils.escapeHtml(co.tin || '')}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Brand Color</label>
                    <input type="color" class="form-control" id="editCoColor" value="${co.color}" style="height:42px;padding:4px">
                </div>
                <div class="form-group">
                    <label>Icon (FontAwesome class)</label>
                    <input type="text" class="form-control" id="editCoIcon" value="${co.icon}" placeholder="e.g., fa-hard-hat">
                </div>
            </div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Settings.saveEditCompany('${key}')"><i class="fas fa-save"></i> Save Changes</button>
        `);
    },

    saveEditCompany(key) {
        const co = DataStore.companies[key];
        if (!co) return;
        const name = document.getElementById('editCoName')?.value.trim();
        if (!name) { App.showToast('Company name is required', 'error'); return; }
        co.name = name;
        co.address = document.getElementById('editCoAddress')?.value.trim() || co.address;
        co.tin = document.getElementById('editCoTin')?.value.trim() || co.tin;
        co.color = document.getElementById('editCoColor')?.value || co.color;
        co.icon = document.getElementById('editCoIcon')?.value.trim() || co.icon;
        Database.save();
        App.closeModal();
        App.showToast(`${name} updated successfully`, 'success');
        Database.addAuditEntry('Company Updated', `Company profile "${name}" was updated`, 'info');
        const el = document.getElementById('settingsContent');
        if (el) el.innerHTML = Settings.renderCompanySettings();
    },

    savePreferences() {
        const prefs = {
            currency: document.getElementById('prefCurrency')?.value || '₱ Philippine Peso (PHP)',
            dateFormat: document.getElementById('prefDateFormat')?.value || 'MMM DD, YYYY',
            fiscalYear: document.getElementById('prefFiscalYear')?.value || 'January',
            taxRate: parseFloat(document.getElementById('prefTaxRate')?.value || 12)
        };
        Utils.storage.set('preferences', prefs);
        Database.addAuditEntry('Settings Updated', 'System preferences saved', 'info');
        App.showToast('Preferences saved successfully', 'success');
    },

    exportAuditLog() {
        const logs = DataStore.auditLog || [];
        if (!logs.length) { App.showToast('No audit log entries to export', 'info'); return; }

        const rows = [['Timestamp', 'User', 'Action', 'Details', 'Level']];
        logs.forEach(r => rows.push([
            Utils.formatDateTime(r.time),
            r.user,
            r.action,
            r.detail,
            r.level
        ]));

        const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `UBMS_AuditLog_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        App.showToast('Audit log exported as CSV', 'success');
    },

    // ============================================================
    //  SYSTEM TAB (Super Admin only)
    // ============================================================
    renderSystem() {
        if (!Auth.isSuperAdmin()) return '<div class="empty-state"><i class="fas fa-lock"></i><h3>Access Denied</h3><p>Only Super Admin can access system settings.</p></div>';

        const dbRaw = localStorage.getItem('ubms_database');
        const usersRaw = localStorage.getItem('ubms_users');
        const auditRaw = localStorage.getItem('ubms_audit');
        const totalBytes = (dbRaw?.length || 0) + (usersRaw?.length || 0) + (auditRaw?.length || 0);
        const totalKB = (totalBytes / 1024).toFixed(1);

        const counts = {
            customers: (DataStore.customers || []).length,
            invoices: (DataStore.invoices || []).length,
            expenses: (DataStore.expenses || []).length,
            projects: (DataStore.projects || []).length,
            bookings: (DataStore.bookings || []).length,
            jobCards: (DataStore.jobCards || []).length,
            vehicles: (DataStore.vehicles || []).length,
            employees: (DataStore.employees || []).length,
            payslips: (DataStore.payslips || []).length,
            inventoryItems: (DataStore.inventoryItems || []).length,
            posTransactions: (DataStore.posTransactions || []).length,
            users: Database.getUsers().length
        };

        return `
        <div class="card mb-3">
            <div class="card-header"><i class="fas fa-database" style="margin-right:8px"></i>Database Statistics</div>
            <div class="card-body">
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:16px">
                    ${Object.entries(counts).map(([k, v]) => `
                        <div style="padding:12px;background:var(--bg);border-radius:var(--radius);text-align:center">
                            <div style="font-size:22px;font-weight:700;color:var(--primary)">${v}</div>
                            <div style="font-size:11px;color:var(--text-muted);text-transform:capitalize">${k.replace(/([A-Z])/g, ' $1')}</div>
                        </div>
                    `).join('')}
                </div>
                <div style="padding:12px;background:var(--bg);border-radius:var(--radius);display:flex;justify-content:space-between;align-items:center">
                    <span><i class="fas fa-hdd" style="margin-right:8px;color:var(--secondary)"></i>Total Storage Used</span>
                    <strong>${totalKB} KB</strong>
                </div>
            </div>
        </div>

        <div class="card mb-3">
            <div class="card-header"><i class="fas fa-shield-alt" style="margin-right:8px"></i>Backup & Restore</div>
            <div class="card-body">
                <div style="display:flex;gap:12px;flex-wrap:wrap">
                    <button class="btn btn-primary" onclick="Settings.backupDatabase()"><i class="fas fa-download"></i> Backup Database</button>
                    <label class="btn btn-info" style="cursor:pointer"><i class="fas fa-upload"></i> Restore from Backup<input type="file" accept=".json" style="display:none" onchange="Settings.restoreDatabase(event)"></label>
                </div>
                <p style="margin-top:12px;font-size:12px;color:var(--text-muted)"><i class="fas fa-info-circle"></i> Backup exports all data, users, and audit logs as a JSON file. Restore will overwrite all current data.</p>
            </div>
        </div>

        <div class="card mb-3">
            <div class="card-header" style="color:#f44336"><i class="fas fa-exclamation-triangle" style="margin-right:8px"></i>Danger Zone</div>
            <div class="card-body">
                <div style="display:flex;gap:12px;flex-wrap:wrap">
                    <button class="btn btn-warning" onclick="Settings.clearTransactionalData()"><i class="fas fa-eraser"></i> Clear All Transactions</button>
                    <button class="btn btn-danger" onclick="Settings.resetEntireDatabase()"><i class="fas fa-bomb"></i> Full Database Reset</button>
                </div>
                <p style="margin-top:12px;font-size:12px;color:var(--text-muted)"><i class="fas fa-exclamation-triangle" style="color:#f44336"></i> <strong>Clear Transactions</strong> removes all business data but keeps users and settings. <strong>Full Reset</strong> erases everything and restores factory defaults.</p>
            </div>
        </div>`;
    },

    backupDatabase() {
        if (!Auth.isSuperAdmin()) { App.showToast('Only Super Admin can backup the database', 'error'); return; }
        const backup = {
            version: 'UBMS-BACKUP-v1',
            exportedAt: new Date().toISOString(),
            exportedBy: Auth.getName(),
            database: localStorage.getItem('ubms_database'),
            users: localStorage.getItem('ubms_users'),
            audit: localStorage.getItem('ubms_audit')
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `UBMS_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        App.showToast('Database backup downloaded', 'success');
    },

    restoreDatabase(event) {
        if (!Auth.isSuperAdmin()) { App.showToast('Only Super Admin can restore the database', 'error'); return; }
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const backup = JSON.parse(e.target.result);
                if (backup.version !== 'UBMS-BACKUP-v1') {
                    App.showToast('Invalid backup file format', 'error');
                    return;
                }
                if (!confirm('Are you sure you want to restore from this backup? This will OVERWRITE all current data.\n\nBackup from: ' + (backup.exportedAt || 'Unknown') + '\nExported by: ' + (backup.exportedBy || 'Unknown'))) return;
                if (backup.database) localStorage.setItem('ubms_database', backup.database);
                if (backup.users) localStorage.setItem('ubms_users', backup.users);
                if (backup.audit) localStorage.setItem('ubms_audit', backup.audit);
                App.showToast('Database restored successfully. Reloading...', 'success');
                setTimeout(() => location.reload(), 1500);
            } catch (err) {
                App.showToast('Failed to parse backup file', 'error');
            }
        };
        reader.readAsText(file);
    },

    clearTransactionalData() {
        if (!Auth.isSuperAdmin()) { App.showToast('Only Super Admin can clear data', 'error'); return; }
        if (!confirm('Clear ALL transactional data? This removes customers, invoices, bookings, employees, etc. but keeps users and system settings.\n\nThis action CANNOT be undone!')) return;
        if (!confirm('FINAL CONFIRMATION: Are you absolutely sure? Type OK on the next prompt to proceed.')) return;
        Database.clearTransactionalData();
        Database.save();
        App.showToast('All transactional data cleared. Reloading...', 'success');
        setTimeout(() => location.reload(), 1500);
    },

    resetEntireDatabase() {
        if (!Auth.isSuperAdmin()) { App.showToast('Only Super Admin can reset the database', 'error'); return; }
        if (!confirm('FULL DATABASE RESET: This will erase ALL data including users, transactions, and settings.\n\nThis action CANNOT be undone!')) return;
        if (!confirm('FINAL CONFIRMATION: Are you absolutely sure you want to reset everything to factory defaults?')) return;
        Database.reset();
    }
};
