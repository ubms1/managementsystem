/* ========================================
   UBMS - Admin Management Module
   Super Admin: User, Role, Tab & Business Assignment
   ======================================== */

const Admin = {
    allModules: [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-th-large', group: 'Core' },
        { id: 'crm', label: 'CRM', icon: 'fa-users', group: 'Core' },
        { id: 'financial', label: 'Financial', icon: 'fa-peso-sign', group: 'Core' },
        { id: 'reports', label: 'Reports', icon: 'fa-chart-bar', group: 'Core' },
        { id: 'construction', label: 'Projects', icon: 'fa-hard-hat', group: 'Construction' },
        { id: 'jobcosting', label: 'Job Costing', icon: 'fa-calculator', group: 'Construction' },
        { id: 'subcontractors', label: 'Subcontractors', icon: 'fa-people-carry', group: 'Construction' },
        { id: 'booking', label: 'Bookings', icon: 'fa-calendar-check', group: 'Wellness' },
        { id: 'therapists', label: 'Therapists', icon: 'fa-user-nurse', group: 'Wellness' },
        { id: 'pos', label: 'POS', icon: 'fa-cash-register', group: 'All' },
        { id: 'membership', label: 'Membership', icon: 'fa-id-card', group: 'Wellness' },
        { id: 'workshop', label: 'Workshop', icon: 'fa-wrench', group: 'Automotive' },
        { id: 'vehicles', label: 'Vehicles', icon: 'fa-car', group: 'Automotive' },
        { id: 'parts', label: 'Parts Inventory', icon: 'fa-cogs', group: 'Automotive' },
        { id: 'inspections', label: 'Inspections', icon: 'fa-clipboard-check', group: 'Automotive' },
        { id: 'settings', label: 'Settings', icon: 'fa-cog', group: 'Admin' }
    ],

    render(container) {
        if (!Auth.isSuperAdmin() && !Auth.isOwner()) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><h3>Access Denied</h3><p>Only Super Admin and Owner can access this module.</p></div>`;
            return;
        }

        const users = Database.getUsers().filter(u => !u.isSuperAdmin);
        const activeUsers = users.filter(u => u.status === 'active').length;

        container.innerHTML = `
        <div class="section-header mb-3">
            <h2><i class="fas fa-shield-alt" style="color:var(--primary)"></i> Admin Control Panel</h2>
            <div class="section-actions">
                <button class="btn btn-primary" onclick="Admin.openAddUser()"><i class="fas fa-user-plus"></i> Add User</button>
                ${Auth.isSuperAdmin() ? `<button class="btn btn-danger" onclick="Admin.confirmResetDB()"><i class="fas fa-database"></i> Reset Database</button>` : ''}
            </div>
        </div>

        <!-- Stats -->
        <div class="grid-4 mb-3">
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(0,137,123,0.12);color:#00897b"><i class="fas fa-users"></i></div>
                <div class="stat-info"><h3>${users.length}</h3><span>Total Users</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(76,175,80,0.12);color:#4caf50"><i class="fas fa-user-check"></i></div>
                <div class="stat-info"><h3>${activeUsers}</h3><span>Active Users</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(255,152,0,0.12);color:#ff9800"><i class="fas fa-building"></i></div>
                <div class="stat-info"><h3>4</h3><span>Businesses</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(244,67,54,0.12);color:#f44336"><i class="fas fa-user-times"></i></div>
                <div class="stat-info"><h3>${users.length - activeUsers}</h3><span>Inactive Users</span></div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="tabs mb-3">
            <button class="tab-btn active" onclick="Admin.switchTab('users',this)">
                <i class="fas fa-users"></i> User Management
            </button>
            <button class="tab-btn" onclick="Admin.switchTab('assignments',this)">
                <i class="fas fa-tasks"></i> Tab & Business Assignments
            </button>
            <button class="tab-btn" onclick="Admin.switchTab('activity',this)">
                <i class="fas fa-stream"></i> User Activity
            </button>
            <button class="tab-btn" onclick="Admin.switchTab('audit',this)">
                <i class="fas fa-history"></i> System Audit Log
            </button>
        </div>

        <div id="adminContent">${this.renderUserManagement()}</div>`;
    },

    async switchTab(tab, btn) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const el = document.getElementById('adminContent');
        switch (tab) {
            case 'users': el.innerHTML = this.renderUserManagement(); break;
            case 'assignments': el.innerHTML = this.renderAssignments(); break;
            case 'activity': el.innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>Loading activity...</p></div>'; el.innerHTML = await this.renderActivityDashboard(); break;
            case 'audit': el.innerHTML = await this.renderAuditLog(); break;
        }
    },

    // ============================================================
    //  USER MANAGEMENT TAB
    // ============================================================
    renderUserManagement() {
        const users = Database.getUsers();
        const roleColors = { superadmin: 'danger', owner: 'warning', manager: 'info', accountant: 'teal', staff: 'neutral' };

        let html = `<div class="card"><div class="card-body no-padding">
        <div class="table-wrapper"><table class="data-table">
        <thead><tr>
            <th>User</th><th>Role</th><th>Email</th><th>Companies</th><th>Modules</th><th>Last Login</th><th>Status</th><th>Actions</th>
        </tr></thead><tbody>`;

        users.forEach(u => {
            const companies = (u.companies || []).includes('all') ? '<span class="badge-tag badge-teal">All Companies</span>' :
                (u.companies || []).map(c => `<span class="badge-tag" style="background:${Utils.getCompanyColor(c)}20;color:${Utils.getCompanyColor(c)}">${Utils.getCompanyName(c)}</span>`).join(' ');

            const moduleCount = (u.modules || []).includes('all') ? 'All' : (u.modules || []).length;

            html += `<tr>
                <td>
                    <div style="display:flex;align-items:center;gap:10px">
                        <div class="avatar" style="background:${u.isSuperAdmin ? '#f44336' : 'var(--primary)'};color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">${u.avatar || u.name[0]}</div>
                        <div><strong>${u.name}</strong><div style="font-size:11px;color:var(--text-muted)">@${u.username}</div></div>
                    </div>
                </td>
                <td><span class="badge-tag badge-${roleColors[u.role] || 'neutral'}">${u.isSuperAdmin ? '🔐 Super Admin' : u.role}</span></td>
                <td><a href="mailto:${u.email}" style="color:var(--primary);text-decoration:none">${u.email}</a></td>
                <td>${companies}</td>
                <td><span class="badge-tag badge-neutral">${moduleCount} modules</span></td>
                <td style="font-size:12px;color:var(--text-muted)">${u.lastLogin ? Utils.formatDateTime(u.lastLogin) : 'Never'}</td>
                <td><span class="badge-tag ${u.status === 'active' ? 'badge-success' : 'badge-danger'}">${u.status}</span></td>
                <td>
                    ${!u.isSuperAdmin ? `
                        <button class="btn btn-sm btn-secondary" onclick="Admin.openEditUser('${u.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm ${u.status === 'active' ? 'btn-warning' : 'btn-success'}" onclick="Admin.toggleUserStatus('${u.id}')" title="${u.status === 'active' ? 'Deactivate' : 'Activate'}">
                            <i class="fas ${u.status === 'active' ? 'fa-ban' : 'fa-check'}"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="Admin.confirmDeleteUser('${u.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    ` : '<span style="font-size:11px;color:var(--text-muted)">Protected</span>'}
                </td>
            </tr>`;
        });

        html += '</tbody></table></div></div></div>';
        return html;
    },

    // ============================================================
    //  TAB & BUSINESS ASSIGNMENTS TAB
    // ============================================================
    renderAssignments() {
        const users = Database.getUsers().filter(u => !u.isSuperAdmin && u.role !== 'owner');

        let html = `
        <div class="card mb-3">
            <div class="card-header"><h3><i class="fas fa-info-circle"></i> How Assignments Work</h3></div>
            <div class="card-body" style="font-size:13px;color:var(--text-secondary)">
                <p>Assign specific <strong>businesses</strong> and <strong>tabs/modules</strong> to each user. Managers see only their assigned business. Staff see only their assigned modules within their business.</p>
            </div>
        </div>`;

        users.forEach(u => {
            const companyChecks = Object.entries(DataStore.companies).map(([key, co]) => {
                const checked = (u.companies || []).includes('all') || (u.companies || []).includes(key);
                return `<label style="display:flex;align-items:center;gap:6px;font-size:12px;padding:4px 0">
                    <input type="checkbox" ${checked ? 'checked' : ''} onchange="Admin.toggleCompanyAccess('${u.id}','${key}',this.checked)" 
                        style="accent-color:${co.color}">
                    <span style="color:${co.color};font-weight:600"><i class="fas ${co.icon}"></i></span> ${co.name}
                </label>`;
            }).join('');

            const groups = {};
            this.allModules.forEach(m => {
                if (!groups[m.group]) groups[m.group] = [];
                groups[m.group].push(m);
            });

            let moduleChecks = '';
            Object.entries(groups).forEach(([group, modules]) => {
                moduleChecks += `<div style="margin-bottom:8px"><strong style="font-size:11px;text-transform:uppercase;color:var(--text-muted)">${group}</strong><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">`;
                modules.forEach(m => {
                    const checked = (u.modules || []).includes('all') || (u.modules || []).includes(m.id);
                    moduleChecks += `<label style="display:flex;align-items:center;gap:4px;font-size:11px;background:var(--card-bg);border:1px solid var(--border);padding:4px 8px;border-radius:6px;cursor:pointer">
                        <input type="checkbox" ${checked ? 'checked' : ''} onchange="Admin.toggleModuleAccess('${u.id}','${m.id}',this.checked)">
                        <i class="fas ${m.icon}" style="font-size:10px"></i> ${m.label}
                    </label>`;
                });
                moduleChecks += '</div></div>';
            });

            html += `
            <div class="card mb-2">
                <div class="card-header">
                    <div style="display:flex;align-items:center;gap:10px">
                        <div style="width:36px;height:36px;background:var(--primary);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">${u.avatar}</div>
                        <div>
                            <h3 style="font-size:14px">${u.name}</h3>
                            <span style="font-size:11px;color:var(--text-muted)">${u.email} — <span class="badge-tag badge-${u.role === 'manager' ? 'info' : u.role === 'accountant' ? 'teal' : 'neutral'}" style="font-size:10px">${u.role}</span></span>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="grid-2" style="gap:24px">
                        <div>
                            <h4 style="font-size:12px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px"><i class="fas fa-building"></i> Business Access</h4>
                            ${companyChecks}
                        </div>
                        <div>
                            <h4 style="font-size:12px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px"><i class="fas fa-th-large"></i> Tab/Module Access</h4>
                            ${moduleChecks}
                        </div>
                    </div>
                </div>
            </div>`;
        });

        if (users.length === 0) {
            html += '<div class="empty-state"><i class="fas fa-user-plus"></i><h3>No Assignable Users</h3><p>Add managers or staff to assign businesses and tabs.</p></div>';
        }

        return html;
    },

    // ============================================================
    //  USER ACTIVITY DASHBOARD TAB (consolidated changes by user)
    // ============================================================
    async renderActivityDashboard(days = 7) {
        const company = (typeof App !== 'undefined') ? App.activeCompany : 'all';
        const [activityResult, summary] = await Promise.all([
            Database.getActivityByUser(company, days),
            Database.getActivitySummary(company, days)
        ]);

        const grouped = activityResult.data || [];
        const raw = activityResult.raw || [];
        const users = Database.getUsers();

        // Build user lookup
        const userMap = {};
        users.forEach(u => { userMap[u.username] = u; });

        // Company color map
        const companyColors = {};
        Object.entries(DataStore.companies || {}).forEach(([k, v]) => { companyColors[k] = v.color || '#888'; });

        let html = `
        <div class="section-header mb-2">
            <h3><i class="fas fa-stream" style="color:var(--primary)"></i> User Activity — Last ${days} Days</h3>
            <div class="section-actions" style="gap:8px;display:flex;align-items:center">
                <select class="form-control" style="width:100px" onchange="Admin.reloadActivity(this.value)" id="activityDays">
                    <option value="1" ${days===1?'selected':''}>Today</option>
                    <option value="3" ${days===3?'selected':''}>3 Days</option>
                    <option value="7" ${days===7?'selected':''}>7 Days</option>
                    <option value="14" ${days===14?'selected':''}>14 Days</option>
                    <option value="30" ${days===30?'selected':''}>30 Days</option>
                </select>
                <button class="btn btn-secondary btn-sm" onclick="Admin.exportActivityCSV()"><i class="fas fa-download"></i> Export</button>
            </div>
        </div>

        <!-- Summary Cards -->
        <div class="grid-4 mb-3">
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(0,137,123,0.12);color:#00897b"><i class="fas fa-bolt"></i></div>
                <div class="stat-info"><h3>${summary.totalActions || 0}</h3><span>Total Actions</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(33,150,243,0.12);color:#2196f3"><i class="fas fa-user-clock"></i></div>
                <div class="stat-info"><h3>${grouped.length}</h3><span>Active Users</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(255,152,0,0.12);color:#ff9800"><i class="fas fa-layer-group"></i></div>
                <div class="stat-info"><h3>${(summary.byModule || []).length}</h3><span>Modules Used</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(244,67,54,0.12);color:#f44336"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="stat-info"><h3>${(summary.byLevel || []).find(l => l.level === 'warning')?.count || 0}</h3><span>Warnings</span></div>
            </div>
        </div>

        <!-- Top Users & Module Breakdown side by side -->
        <div class="grid-2 mb-3">
            <div class="card"><div class="card-header"><h4>Top Users by Activity</h4></div><div class="card-body no-padding">
                <table class="data-table"><thead><tr><th>User</th><th>Role</th><th>Actions</th><th>Bar</th></tr></thead><tbody>`;

        const maxCount = grouped.length > 0 ? Math.max(...grouped.map(g => g.count)) : 1;
        grouped.sort((a, b) => b.count - a.count).slice(0, 15).forEach(g => {
            const u = userMap[g.user];
            const role = u ? u.role : 'system';
            const roleColors = { superadmin: '#f44336', owner: '#ff9800', manager: '#2196f3', accountant: '#009688', staff: '#9e9e9e' };
            const pct = Math.round((g.count / maxCount) * 100);
            html += `<tr>
                <td><strong>${g.user}</strong></td>
                <td><span class="badge-tag" style="background:${roleColors[role] || '#888'}20;color:${roleColors[role] || '#888'}">${role}</span></td>
                <td style="font-weight:600">${g.count}</td>
                <td style="width:120px"><div style="background:var(--primary);height:8px;border-radius:4px;width:${pct}%"></div></td>
            </tr>`;
        });

        html += `</tbody></table></div></div>
            <div class="card"><div class="card-header"><h4>Activity by Module</h4></div><div class="card-body no-padding">
                <table class="data-table"><thead><tr><th>Module</th><th>Actions</th><th>Bar</th></tr></thead><tbody>`;

        const byMod = summary.byModule || [];
        const maxMod = byMod.length > 0 ? Math.max(...byMod.map(m => m.count)) : 1;
        byMod.slice(0, 15).forEach(m => {
            const pct = Math.round((m.count / maxMod) * 100);
            html += `<tr>
                <td><strong>${m.module || 'general'}</strong></td>
                <td style="font-weight:600">${m.count}</td>
                <td style="width:120px"><div style="background:#ff9800;height:8px;border-radius:4px;width:${pct}%"></div></td>
            </tr>`;
        });

        html += `</tbody></table></div></div></div>

        <!-- Detailed Activity Feed -->
        <div class="card"><div class="card-header"><h4>Detailed Activity Feed</h4><span style="font-size:12px;color:var(--text-muted)">${raw.length} entries</span></div>
        <div class="card-body no-padding"><div class="table-wrapper"><table class="data-table">
        <thead><tr><th>Time</th><th>User</th><th>Business</th><th>Module</th><th>Action</th><th>Details</th><th>Level</th></tr></thead>
        <tbody>`;

        if (raw.length === 0) {
            html += '<tr><td colspan="7" class="text-center text-muted" style="padding:40px">No activity recorded in the selected period</td></tr>';
        }
        raw.slice(0, 200).forEach(r => {
            const co = r.company || 'all';
            const coColor = companyColors[co] || '#888';
            const coName = DataStore.companies[co]?.name || co;
            html += `<tr>
                <td><span style="font-family:monospace;font-size:11px">${Utils.formatDateTime(r.time)}</span></td>
                <td><span class="badge-tag badge-neutral">${r.user}</span></td>
                <td><span class="badge-tag" style="background:${coColor}18;color:${coColor};font-size:11px">${coName}</span></td>
                <td style="font-size:12px">${r.module || '—'}</td>
                <td><strong>${r.action}</strong></td>
                <td style="font-size:12px;color:var(--text-secondary);max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.detail || ''}</td>
                <td><span class="badge-tag ${r.level === 'warning' ? 'badge-warning' : r.level === 'success' ? 'badge-success' : r.level === 'danger' ? 'badge-danger' : 'badge-info'}">${r.level}</span></td>
            </tr>`;
        });

        html += '</tbody></table></div></div></div>';
        return html;
    },

    async reloadActivity(days) {
        const el = document.getElementById('adminContent');
        el.innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>Loading activity...</p></div>';
        el.innerHTML = await this.renderActivityDashboard(parseInt(days));
    },

    exportActivityCSV() {
        const table = document.querySelector('#adminContent .data-table:last-of-type');
        if (!table) return;
        const rows = [];
        table.querySelectorAll('tr').forEach(tr => {
            const cells = [];
            tr.querySelectorAll('th,td').forEach(td => cells.push('"' + td.textContent.replace(/"/g, '""').trim() + '"'));
            rows.push(cells.join(','));
        });
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `activity-report-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    },

    // ============================================================
    //  AUDIT LOG TAB
    // ============================================================
    async renderAuditLog() {
        const logs = await Database.getServerAuditLog(200);

        let html = `
        <div class="section-header mb-2">
            <h3>System Audit Trail</h3>
            <span style="font-size:12px;color:var(--text-muted)">${logs.length} entries</span>
        </div>
        <div class="card"><div class="card-body no-padding">
        <div class="table-wrapper"><table class="data-table">
        <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Details</th><th>Level</th></tr></thead>
        <tbody>`;

        const display = logs.slice(0, 100);
        if (display.length === 0) {
            html += `<tr><td colspan="5" class="text-center text-muted" style="padding:40px">No audit entries yet</td></tr>`;
        }
        display.forEach(log => {
            html += `<tr>
                <td><span style="font-family:monospace;font-size:11px">${Utils.formatDateTime(log.time)}</span></td>
                <td><span class="badge-tag badge-neutral">${log.user}</span></td>
                <td><strong>${log.action}</strong></td>
                <td style="font-size:12px;color:var(--text-secondary);max-width:300px;overflow:hidden;text-overflow:ellipsis">${log.detail}</td>
                <td><span class="badge-tag ${log.level === 'warning' ? 'badge-warning' : log.level === 'success' ? 'badge-success' : log.level === 'danger' ? 'badge-danger' : 'badge-info'}">${log.level}</span></td>
            </tr>`;
        });

        html += '</tbody></table></div></div></div>';
        return html;
    },

    // ============================================================
    //  USER CRUD MODALS
    // ============================================================
    openAddUser() {
        const companyOptions = Object.entries(DataStore.companies).map(([k, v]) =>
            `<label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="checkbox" value="${k}" class="new-user-company"> ${v.name}</label>`
        ).join('');

        const groups = {};
        this.allModules.forEach(m => {
            if (!groups[m.group]) groups[m.group] = [];
            groups[m.group].push(m);
        });
        let moduleOptions = '';
        Object.entries(groups).forEach(([group, modules]) => {
            moduleOptions += `<div style="margin-bottom:8px"><strong style="font-size:11px;color:var(--text-muted)">${group}</strong><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">`;
            modules.forEach(m => {
                moduleOptions += `<label style="display:flex;align-items:center;gap:4px;font-size:12px"><input type="checkbox" value="${m.id}" class="new-user-module"> <i class="fas ${m.icon}" style="font-size:10px"></i> ${m.label}</label>`;
            });
            moduleOptions += '</div></div>';
        });

        App.openModal('Add New User', `
        <form id="addUserForm">
            <div class="form-row">
                <div class="form-group"><label>Full Name *</label><input type="text" class="form-control" id="newUserName" required placeholder="e.g. Juan dela Cruz"></div>
                <div class="form-group"><label>Username *</label><input type="text" class="form-control" id="newUserUsername" required placeholder="e.g. juan.d"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Email Address *</label><input type="email" class="form-control" id="newUserEmail" required placeholder="e.g. juan@company.com"></div>
                <div class="form-group"><label>Role *</label>
                    <select class="form-control" id="newUserRole">
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="accountant">Accountant</option>
                        <option value="owner">Owner</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Password *</label>${Utils.pwWrap('<input type="password" class="form-control" id="newUserPass" required minlength="6" placeholder="Min 6 characters">')}</div>
                <div class="form-group"><label>Confirm Password *</label>${Utils.pwWrap('<input type="password" class="form-control" id="newUserPassConfirm" required>')}</div>
            </div>
            <div class="form-group">
                <label>Business Access</label>
                <div style="display:flex;gap:16px;flex-wrap:wrap">${companyOptions}</div>
            </div>
            <div class="form-group">
                <label>Module/Tab Access</label>
                <div style="max-height:200px;overflow-y:auto;padding:8px;border:1px solid var(--border);border-radius:8px">
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:8px;font-weight:600">
                        <input type="checkbox" id="newUserAllModules" onchange="document.querySelectorAll('.new-user-module').forEach(c=>c.checked=this.checked)"> Select All Modules
                    </label>
                    ${moduleOptions}
                </div>
            </div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Admin.saveNewUser()"><i class="fas fa-save"></i> Create User</button>
        `, true);
    },

    async saveNewUser() {
        const name = document.getElementById('newUserName').value.trim();
        const username = document.getElementById('newUserUsername').value.trim();
        const email = document.getElementById('newUserEmail').value.trim();
        const role = document.getElementById('newUserRole').value;
        const password = document.getElementById('newUserPass').value;
        const confirm = document.getElementById('newUserPassConfirm').value;

        if (!name || !username || !email || !password) {
            App.showToast('Please fill in all required fields', 'error');
            return;
        }
        if (password !== confirm) {
            App.showToast('Passwords do not match', 'error');
            return;
        }
        if (password.length < 8) {
            App.showToast('Password must be at least 8 characters', 'error');
            return;
        }

        const companies = Array.from(document.querySelectorAll('.new-user-company:checked')).map(c => c.value);
        const modules = document.getElementById('newUserAllModules')?.checked ? ['all'] :
            Array.from(document.querySelectorAll('.new-user-module:checked')).map(c => c.value);

        if (companies.length === 0) {
            App.showToast('Please select at least one business', 'error');
            return;
        }

        const result = await Database.addUser({ name, username, email, role, password, companies, modules, mustChangePassword: true });
        if (result.success) {
            App.closeModal();
            App.showToast(`User ${name} created successfully`, 'success');
            Admin.render(document.getElementById('contentArea'));
        } else {
            App.showToast(result.error, 'error');
        }
    },

    openEditUser(userId) {
        if (!Auth.canEdit()) { App.showToast('You do not have permission to edit users', 'error'); return; }
        const user = Database.getUsers().find(u => u.id === userId);
        if (!user) return;

        const companyOptions = Object.entries(DataStore.companies).map(([k, v]) => {
            const checked = (user.companies || []).includes('all') || (user.companies || []).includes(k);
            return `<label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="checkbox" value="${k}" class="edit-user-company" ${checked ? 'checked' : ''}> ${v.name}</label>`;
        }).join('');

        const groups = {};
        this.allModules.forEach(m => {
            if (!groups[m.group]) groups[m.group] = [];
            groups[m.group].push(m);
        });
        let moduleOptions = '';
        Object.entries(groups).forEach(([group, modules]) => {
            moduleOptions += `<div style="margin-bottom:8px"><strong style="font-size:11px;color:var(--text-muted)">${group}</strong><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">`;
            modules.forEach(m => {
                const checked = (user.modules || []).includes('all') || (user.modules || []).includes(m.id);
                moduleOptions += `<label style="display:flex;align-items:center;gap:4px;font-size:12px"><input type="checkbox" value="${m.id}" class="edit-user-module" ${checked ? 'checked' : ''}> <i class="fas ${m.icon}" style="font-size:10px"></i> ${m.label}</label>`;
            });
            moduleOptions += '</div></div>';
        });

        App.openModal(`Edit User: ${user.name}`, `
        <form id="editUserForm">
            <input type="hidden" id="editUserId" value="${user.id}">
            <div class="form-row">
                <div class="form-group"><label>Full Name</label><input type="text" class="form-control" id="editUserName" value="${user.name}"></div>
                <div class="form-group"><label>Username</label><input type="text" class="form-control" id="editUserUsername" value="${user.username}" readonly style="background:var(--bg-alt)"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Email Address</label><input type="email" class="form-control" id="editUserEmail" value="${user.email}"></div>
                <div class="form-group"><label>Role</label>
                    <select class="form-control" id="editUserRole">
                        <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Staff</option>
                        <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>Manager</option>
                        <option value="accountant" ${user.role === 'accountant' ? 'selected' : ''}>Accountant</option>
                        <option value="owner" ${user.role === 'owner' ? 'selected' : ''}>Owner</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>New Password <span style="font-size:11px;color:var(--text-muted)">(leave blank to keep current)</span></label>
                ${Utils.pwWrap('<input type="password" class="form-control" id="editUserPass" placeholder="Enter new password">')}
            </div>
            <div class="form-group">
                <label>Business Access</label>
                <div style="display:flex;gap:16px;flex-wrap:wrap">${companyOptions}</div>
            </div>
            <div class="form-group">
                <label>Module/Tab Access</label>
                <div style="max-height:200px;overflow-y:auto;padding:8px;border:1px solid var(--border);border-radius:8px">
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:8px;font-weight:600">
                        <input type="checkbox" id="editUserAllModules" ${(user.modules || []).includes('all') ? 'checked' : ''}
                            onchange="document.querySelectorAll('.edit-user-module').forEach(c=>c.checked=this.checked)"> Select All Modules
                    </label>
                    ${moduleOptions}
                </div>
            </div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Admin.saveEditUser()"><i class="fas fa-save"></i> Save Changes</button>
        `, true);
    },

    async saveEditUser() {
        const userId = document.getElementById('editUserId').value;
        const updates = {
            name: document.getElementById('editUserName').value.trim(),
            email: document.getElementById('editUserEmail').value.trim(),
            role: document.getElementById('editUserRole').value,
            companies: Array.from(document.querySelectorAll('.edit-user-company:checked')).map(c => c.value),
            modules: document.getElementById('editUserAllModules')?.checked ? ['all'] :
                Array.from(document.querySelectorAll('.edit-user-module:checked')).map(c => c.value)
        };

        const newPass = document.getElementById('editUserPass').value;
        if (newPass) updates.password = newPass;

        if (!updates.name || !updates.email) {
            App.showToast('Name and email are required', 'error');
            return;
        }

        const result = await Database.updateUser(userId, updates);
        if (result.success) {
            App.closeModal();
            App.showToast('User updated successfully', 'success');
            Admin.render(document.getElementById('contentArea'));
        } else {
            App.showToast(result.error, 'error');
        }
    },

    async toggleUserStatus(userId) {
        if (!Auth.canEdit()) { App.showToast('You do not have permission to modify users', 'error'); return; }
        const users = Database.getUsers();
        const user = users.find(u => u.id === userId);
        if (!user) return;

        const result = user.status === 'active' ?
            await Database.deactivateUser(userId) :
            await Database.activateUser(userId);

        if (result.success) {
            App.showToast(`User ${user.name} ${user.status === 'active' ? 'deactivated' : 'activated'}`, 'success');
            Admin.render(document.getElementById('contentArea'));
        }
    },

    confirmDeleteUser(userId) {
        if (!Auth.canDelete()) { App.showToast('Only Super Admin can delete users', 'error'); return; }
        const user = Database.getUsers().find(u => u.id === userId);
        if (!user) return;

        App.openModal('Confirm Delete', `
            <div style="text-align:center;padding:20px">
                <i class="fas fa-exclamation-triangle" style="font-size:48px;color:#f44336;margin-bottom:16px"></i>
                <h3>Delete User: ${user.name}?</h3>
                <p style="color:var(--text-secondary);margin-top:8px">${user.email}<br>This action cannot be undone.</p>
            </div>
        `, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-danger" onclick="Admin.deleteUser('${userId}')"><i class="fas fa-trash"></i> Delete Permanently</button>
        `);
    },

    async deleteUser(userId) {
        if (!Auth.canDelete()) { App.showToast('Only Super Admin can delete users', 'error'); return; }
        const result = await Database.deleteUser(userId);
        if (result.success) {
            App.closeModal();
            App.showToast('User deleted', 'success');
            Admin.render(document.getElementById('contentArea'));
        } else {
            App.showToast(result.error, 'error');
        }
    },

    // ---- Toggle company access for user ----
    async toggleCompanyAccess(userId, company, checked) {
        const users = Database.getUsers();
        const user = users.find(u => u.id === userId);
        if (!user) return;

        if (!user.companies) user.companies = [];
        if (checked) {
            if (!user.companies.includes(company)) user.companies.push(company);
        } else {
            user.companies = user.companies.filter(c => c !== company);
        }
        await Database.updateUser(userId, { companies: user.companies });
        App.showToast(`Updated ${user.name}'s business access`, 'info');
    },

    // ---- Toggle module access for user ----
    async toggleModuleAccess(userId, module, checked) {
        const users = Database.getUsers();
        const user = users.find(u => u.id === userId);
        if (!user) return;

        if (!user.modules) user.modules = [];
        // Remove 'all' if unchecking individual
        if (!checked && user.modules.includes('all')) {
            user.modules = this.allModules.map(m => m.id).filter(m => m !== module);
        } else if (checked) {
            if (!user.modules.includes(module)) user.modules.push(module);
        } else {
            user.modules = user.modules.filter(m => m !== module);
        }
        await Database.updateUser(userId, { modules: user.modules });
        App.showToast(`Updated ${user.name}'s module access`, 'info');
    },

    // ---- Database Reset ----
    confirmResetDB() {
        App.openModal('Reset Database', `
            <div style="text-align:center;padding:20px">
                <i class="fas fa-exclamation-triangle" style="font-size:48px;color:#f44336;margin-bottom:16px"></i>
                <h3 style="color:#f44336">Reset Entire Database?</h3>
                <p style="color:var(--text-secondary);margin-top:8px">This will erase ALL data and return to fresh state.<br>All users, transactions, and settings will be lost.</p>
                <p style="font-size:12px;margin-top:12px;color:var(--text-muted)">Type <strong>RESET</strong> to confirm:</p>
                <input type="text" id="resetConfirm" class="form-control" style="max-width:200px;margin:8px auto;text-align:center" placeholder="Type RESET">
            </div>
        `, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-danger" onclick="Admin.executeReset()"><i class="fas fa-database"></i> Reset Database</button>
        `);
    },

    executeReset() {
        const confirm = document.getElementById('resetConfirm')?.value;
        if (confirm !== 'RESET') {
            App.showToast('Type RESET to confirm', 'error');
            return;
        }
        Database.reset();
    }
};
