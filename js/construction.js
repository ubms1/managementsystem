/* ========================================
   UBMS - Construction Hub Module
   Projects, Job Costing, Subcontractors
   ======================================== */

const Construction = {
    // ============================================================
    //  PROJECT MANAGEMENT
    // ============================================================
    render(container) {
        const projects = App.activeCompany === 'all'
            ? DataStore.projects
            : DataStore.projects.filter(p => p.company === App.activeCompany);

        const active = projects.filter(p => p.status === 'in-progress');
        const completed = projects.filter(p => p.status === 'completed');
        const totalBudget = projects.reduce((s, p) => s + p.budget, 0);

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon teal"><i class="fas fa-project-diagram"></i></div></div>
                <div class="stat-value">${projects.length}</div>
                <div class="stat-label">Total Projects</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon blue"><i class="fas fa-spinner"></i></div></div>
                <div class="stat-value">${active.length}</div>
                <div class="stat-label">Active Projects</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div></div>
                <div class="stat-value">${completed.length}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon orange"><i class="fas fa-peso-sign"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(totalBudget, true)}</div>
                <div class="stat-label">Total Budget</div>
            </div>
        </div>

        <!-- Project Cards -->
        <div class="section-header">
            <h2>Projects</h2>
            <div class="section-actions">
                <select class="form-control" style="width:160px" id="projStatusFilter" onchange="Construction.filterProjects()">
                    <option value="all">All Statuses</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                </select>
                <button class="btn btn-primary" onclick="Construction.openNewProject()"><i class="fas fa-plus"></i> New Project</button>
            </div>
        </div>

        <div id="projectCardContainer">
            ${this.renderProjectCards(projects)}
        </div>`;
    },

    renderProjectCards(projects) {
        if (projects.length === 0) {
            return '<div class="empty-state"><i class="fas fa-hard-hat"></i><h3>No Projects</h3><p>Create your first project to get started.</p></div>';
        }

        return `<div class="grid-2">${projects.map(p => {
            const co = DataStore.companies[p.company];
            const budgetUsed = p.budget > 0 ? ((p.actualCost / p.budget) * 100).toFixed(0) : 0;
            const overBudget = p.actualCost > p.budget * 0.9;
            const client = DataStore.customers.find(c => c.id === p.client);

            return `
            <div class="card" style="cursor:pointer" onclick="Construction.viewProject('${p.id}')">
                <div class="card-header" style="border-bottom:3px solid ${co?.color || 'var(--secondary)'}">
                    <div>
                        <h3>${p.name}</h3>
                        <span style="font-size:11px;color:var(--text-muted)">${p.id} • ${co?.name || p.company}</span>
                    </div>
                    <span class="badge-tag ${Utils.getStatusClass(p.status)}">${p.status}</span>
                </div>
                <div class="card-body">
                    <div style="margin-bottom:16px">
                        <div class="flex-between mb-1">
                            <span style="font-size:12px;color:var(--text-secondary)">Progress</span>
                            <span style="font-size:14px;font-weight:700;color:var(--secondary)">${p.progress}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill ${p.progress === 100 ? 'green' : p.progress > 50 ? 'blue' : 'orange'}" style="width:${p.progress}%"></div>
                        </div>
                    </div>

                    <div class="grid-2" style="gap:12px;font-size:12px">
                        <div>
                            <div style="color:var(--text-muted)">Budget</div>
                            <div style="font-weight:600">${Utils.formatCurrency(p.budget, true)}</div>
                        </div>
                        <div>
                            <div style="color:var(--text-muted)">Actual Cost</div>
                            <div style="font-weight:600;color:${overBudget ? 'var(--danger)' : 'inherit'}">${Utils.formatCurrency(p.actualCost, true)} (${budgetUsed}%)</div>
                        </div>
                        <div>
                            <div style="color:var(--text-muted)">Manager</div>
                            <div style="font-weight:500">${p.manager}</div>
                        </div>
                        <div>
                            <div style="color:var(--text-muted)">Client</div>
                            <div style="font-weight:500">${client?.name || 'N/A'}</div>
                        </div>
                        <div>
                            <div style="color:var(--text-muted)">Start</div>
                            <div>${Utils.formatDate(p.startDate)}</div>
                        </div>
                        <div>
                            <div style="color:var(--text-muted)">Target End</div>
                            <div>${Utils.formatDate(p.endDate)}</div>
                        </div>
                    </div>

                    ${overBudget ? `<div style="margin-top:12px;padding:8px 12px;background:rgba(239,68,68,0.08);border-radius:6px;font-size:12px;color:var(--danger)"><i class="fas fa-exclamation-triangle" style="margin-right:6px"></i>Near/Over budget alert</div>` : ''}
                </div>
            </div>`;
        }).join('')}</div>`;
    },

    filterProjects() {
        const status = document.getElementById('projStatusFilter')?.value || 'all';
        let projects = App.activeCompany === 'all' ? DataStore.projects : DataStore.projects.filter(p => p.company === App.activeCompany);
        if (status !== 'all') projects = projects.filter(p => p.status === status);
        document.getElementById('projectCardContainer').innerHTML = this.renderProjectCards(projects);
    },

    viewProject(id) {
        const p = DataStore.projects.find(proj => proj.id === id);
        if (!p) return;

        const client = DataStore.customers.find(c => c.id === p.client);
        const budgetUsed = p.budget > 0 ? ((p.actualCost / p.budget) * 100).toFixed(1) : 0;

        let html = `
        <div class="flex-between mb-3">
            <div>
                <h2 style="font-size:22px;margin-bottom:4px">${p.name}</h2>
                <p style="color:var(--text-secondary)">${p.description}</p>
            </div>
            <span class="badge-tag ${Utils.getStatusClass(p.status)}" style="font-size:14px;padding:6px 16px">${p.status}</span>
        </div>

        <div class="grid-4 mb-3" style="gap:12px">
            <div style="background:var(--bg);padding:16px;border-radius:var(--radius)">
                <div style="font-size:11px;color:var(--text-muted)">Budget</div>
                <div style="font-size:18px;font-weight:700">${Utils.formatCurrency(p.budget, true)}</div>
            </div>
            <div style="background:var(--bg);padding:16px;border-radius:var(--radius)">
                <div style="font-size:11px;color:var(--text-muted)">Spent</div>
                <div style="font-size:18px;font-weight:700;color:${p.actualCost > p.budget * 0.9 ? 'var(--danger)' : 'var(--secondary)'}">${Utils.formatCurrency(p.actualCost, true)}</div>
            </div>
            <div style="background:var(--bg);padding:16px;border-radius:var(--radius)">
                <div style="font-size:11px;color:var(--text-muted)">Remaining</div>
                <div style="font-size:18px;font-weight:700">${Utils.formatCurrency(p.budget - p.actualCost, true)}</div>
            </div>
            <div style="background:var(--bg);padding:16px;border-radius:var(--radius)">
                <div style="font-size:11px;color:var(--text-muted)">Progress</div>
                <div style="font-size:18px;font-weight:700;color:var(--secondary)">${p.progress}%</div>
            </div>
        </div>

        <div class="grid-2 mb-2" style="font-size:13px;gap:8px">
            <div><strong>Client:</strong> ${client?.name || 'N/A'}</div>
            <div><strong>Manager:</strong> ${p.manager}</div>
            <div><strong>Location:</strong> ${p.location}</div>
            <div><strong>Company:</strong> <span class="badge-tag badge-${p.company}">${p.company}</span></div>
            <div><strong>Start:</strong> ${Utils.formatDate(p.startDate)}</div>
            <div><strong>End:</strong> ${Utils.formatDate(p.endDate)}</div>
        </div>`;

        // Phases
        if (p.phases && p.phases.length > 0) {
            html += `
            <h4 style="margin:24px 0 12px">Project Phases</h4>
            ${p.phases.map(ph => `
                <div style="padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px">
                    <div class="flex-between mb-1">
                        <div>
                            <span style="font-weight:600">${ph.name}</span>
                            <span class="badge-tag ${Utils.getStatusClass(ph.status)}" style="margin-left:8px">${ph.status}</span>
                        </div>
                        <span style="font-weight:700;color:var(--secondary)">${ph.progress}%</span>
                    </div>
                    <div class="progress-bar" style="margin-bottom:8px">
                        <div class="progress-fill ${ph.progress === 100 ? 'green' : 'blue'}" style="width:${ph.progress}%"></div>
                    </div>
                    <div class="flex-between" style="font-size:12px;color:var(--text-secondary)">
                        <span>Budget: ${Utils.formatCurrency(ph.budget, true)}</span>
                        <span>Actual: ${Utils.formatCurrency(ph.actual, true)} (${ph.budget > 0 ? ((ph.actual / ph.budget) * 100).toFixed(0) : 0}%)</span>
                    </div>
                </div>
            `).join('')}`;

            // Gantt-like timeline
            html += `
            <h4 style="margin:24px 0 12px">Timeline (Gantt View)</h4>
            <div class="gantt-container">
                ${p.phases.map((ph, i) => {
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                    return `
                    <div class="gantt-row">
                        <div class="gantt-label">${ph.name}</div>
                        <div class="gantt-timeline">
                            <div class="gantt-bar" style="left:${i * 22}%;width:${Math.max(ph.progress * 0.7, 15)}%;background:${colors[i % colors.length]}">${ph.progress}%</div>
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
        }

        App.openModal('Project Details', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            ${Auth.canEditDelete() ? `<button class="btn btn-primary" onclick="Construction.openEditProject('${p.id}')"><i class="fas fa-edit"></i> Edit Project</button>` : ''}
        `, true);
    },

    openEditProject(id) {
        if (!Auth.canEditDelete()) { App.showToast('Only Owner or Super Admin can edit records', 'error'); return; }
        const p = DataStore.projects.find(pr => pr.id === id);
        if (!p) return;
        const html = `
        <form>
            <div class="form-row">
                <div class="form-group">
                    <label>Status</label>
                    <select class="form-control" id="editProjStatus">
                        ${['pending','active','on-hold','completed','cancelled'].map(s => `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <select class="form-control" id="editProjPriority">
                        ${['low','medium','high'].map(s => `<option value="${s}" ${p.priority === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Project Name <span class="required">*</span></label>
                <input type="text" class="form-control" id="editProjName" value="${Utils.escapeHtml(p.name)}">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea class="form-control" id="editProjDesc" rows="2">${Utils.escapeHtml(p.description || '')}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Project Manager</label>
                    <input type="text" class="form-control" id="editProjManager" value="${Utils.escapeHtml(p.manager || '')}">
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" class="form-control" id="editProjLocation" value="${Utils.escapeHtml(p.location || '')}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Budget (₱)</label>
                    <input type="number" class="form-control" id="editProjBudget" value="${p.budget}" min="0">
                </div>
                <div class="form-group">
                    <label>Progress (%)</label>
                    <input type="number" class="form-control" id="editProjProgress" value="${p.progress}" min="0" max="100">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Start Date</label>
                    <input type="date" class="form-control" id="editProjStart" value="${p.startDate || ''}">
                </div>
                <div class="form-group">
                    <label>Target End Date</label>
                    <input type="date" class="form-control" id="editProjEnd" value="${p.endDate || ''}">
                </div>
            </div>
        </form>`;
        App.openModal('Edit Project', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            <button class="btn btn-primary" onclick="Construction.saveEditProject('${id}')"><i class="fas fa-save"></i> Save Changes</button>
        `, true);
    },

    saveEditProject(id) {
        const idx = DataStore.projects.findIndex(pr => pr.id === id);
        if (idx < 0) return;
        const name = document.getElementById('editProjName')?.value.trim();
        if (!name) { App.showToast('Project name is required', 'error'); return; }
        const p = DataStore.projects[idx];
        p.name = name;
        p.description = document.getElementById('editProjDesc')?.value || '';
        p.status = document.getElementById('editProjStatus')?.value || p.status;
        p.priority = document.getElementById('editProjPriority')?.value || p.priority;
        p.manager = document.getElementById('editProjManager')?.value || '';
        p.location = document.getElementById('editProjLocation')?.value || '';
        p.budget = parseFloat(document.getElementById('editProjBudget')?.value || p.budget);
        p.progress = Math.min(100, Math.max(0, parseInt(document.getElementById('editProjProgress')?.value || p.progress)));
        p.startDate = document.getElementById('editProjStart')?.value || p.startDate;
        p.endDate = document.getElementById('editProjEnd')?.value || p.endDate;
        Database.save();
        App.closeModal();
        App.showToast(`Project "${name}" updated`, 'success');
        Database.addAuditEntry('Project Updated', `Project "${name}" was modified`, 'info');
        Construction.render(document.getElementById('contentArea'));
    },

    openNewProject() {
        const html = `
        <form>
            <div class="form-row">
                <div class="form-group">
                    <label>Company <span class="required">*</span></label>
                    <select class="form-control" id="newProjCompany">
                        <option value="dheekay" ${App.activeCompany === 'dheekay' ? 'selected' : ''}>Dheekay Builders OPC</option>
                        <option value="kdchavit" ${App.activeCompany === 'kdchavit' ? 'selected' : ''}>KDChavit Construction</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <select class="form-control" id="newProjPriority">
                        <option value="low">Low</option>
                        <option value="medium" selected>Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Project Name <span class="required">*</span></label>
                <input type="text" class="form-control" id="newProjName" placeholder="e.g., Tower Site Bravo">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea class="form-control" id="newProjDesc" rows="2"></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Client</label>
                    <select class="form-control" id="newProjClient">
                        ${DataStore.customers.filter(c => c.tags?.includes('construction-client')).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Project Manager</label>
                    <input type="text" class="form-control" id="newProjManager" placeholder="Engr. ...">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Budget (₱)</label>
                    <input type="number" class="form-control" id="newProjBudget" min="0">
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" class="form-control" id="newProjLocation">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Start Date</label>
                    <input type="date" class="form-control" id="newProjStart">
                </div>
                <div class="form-group">
                    <label>Target End Date</label>
                    <input type="date" class="form-control" id="newProjEnd">
                </div>
            </div>
        </form>`;

        App.openModal('Create New Project', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Construction.saveNewProject()"><i class="fas fa-save"></i> Create</button>
        `);
    },

    saveNewProject() {
        const name = document.getElementById('newProjName')?.value;
        if (!name) { App.showToast('Project name is required', 'error'); return; }

        DataStore.projects.push({
            id: Utils.generateId('PRJ'),
            company: document.getElementById('newProjCompany').value,
            name,
            description: document.getElementById('newProjDesc')?.value || '',
            client: document.getElementById('newProjClient').value,
            manager: document.getElementById('newProjManager')?.value || '',
            budget: parseFloat(document.getElementById('newProjBudget')?.value || 0),
            actualCost: 0,
            location: document.getElementById('newProjLocation')?.value || '',
            startDate: document.getElementById('newProjStart')?.value || '',
            endDate: document.getElementById('newProjEnd')?.value || '',
            status: 'pending',
            priority: document.getElementById('newProjPriority').value,
            progress: 0,
            phases: []
        });

        App.closeModal();
        App.showToast(`Project "${name}" created successfully`, 'success');
        this.render(document.getElementById('contentArea'));
    },

    // ============================================================
    //  JOB COSTING
    // ============================================================
    renderJobCosting(container) {
        const projects = App.activeCompany === 'all'
            ? DataStore.projects.filter(p => p.status === 'in-progress')
            : DataStore.projects.filter(p => p.company === App.activeCompany && p.status === 'in-progress');

        container.innerHTML = `
        <div class="section-header mb-3">
            <h2>Job Costing — Actual vs Budget</h2>
        </div>

        <div class="card mb-3">
            <div class="card-header"><h3>Budget vs Actual by Project</h3></div>
            <div class="card-body">
                <div class="chart-container large"><canvas id="jobCostChart"></canvas></div>
            </div>
        </div>

        <div class="card">
            <div class="card-header"><h3>Cost Breakdown</h3></div>
            <div class="card-body no-padding">
                ${Utils.buildTable(
                    [
                        { label: 'Project', render: r => `<strong>${r.name}</strong>` },
                        { label: 'Company', render: r => `<span class="badge-tag badge-${r.company}">${r.company}</span>` },
                        { label: 'Budget', render: r => Utils.formatCurrency(r.budget) },
                        { label: 'Actual', render: r => Utils.formatCurrency(r.actualCost) },
                        { label: 'Variance', render: r => {
                            const v = r.budget - r.actualCost;
                            return `<span class="${v >= 0 ? 'text-success' : 'text-danger'}">${v >= 0 ? '+' : ''}${Utils.formatCurrency(v, true)}</span>`;
                        }},
                        { label: '% Used', render: r => {
                            const pct = r.budget > 0 ? ((r.actualCost / r.budget) * 100).toFixed(1) : 0;
                            return `<div style="display:flex;align-items:center;gap:8px">
                                <div class="progress-bar" style="width:100px"><div class="progress-fill ${pct > 90 ? 'red' : pct > 70 ? 'orange' : 'green'}" style="width:${Math.min(pct, 100)}%"></div></div>
                                <span style="font-weight:600;font-size:12px">${pct}%</span>
                            </div>`;
                        }},
                        { label: 'Status', render: r => {
                            const pct = r.budget > 0 ? (r.actualCost / r.budget) * 100 : 0;
                            if (pct > 100) return '<span class="badge-tag badge-danger">Over Budget</span>';
                            if (pct > 90) return '<span class="badge-tag badge-warning">At Risk</span>';
                            return '<span class="badge-tag badge-success">On Track</span>';
                        }}
                    ],
                    projects
                )}
            </div>
        </div>`;

        // Init chart
        setTimeout(() => {
            const canvas = document.getElementById('jobCostChart');
            if (canvas) {
                Utils.destroyChart('jobCostChart');
                new Chart(canvas, {
                    type: 'bar',
                    data: {
                        labels: projects.map(p => p.name.substring(0, 25)),
                        datasets: [
                            { label: 'Budget', data: projects.map(p => p.budget), backgroundColor: '#3b82f680', borderColor: '#3b82f6', borderWidth: 1 },
                            { label: 'Actual Cost', data: projects.map(p => p.actualCost), backgroundColor: projects.map(p => p.actualCost > p.budget * 0.9 ? '#ef444480' : '#10b98180'), borderColor: projects.map(p => p.actualCost > p.budget * 0.9 ? '#ef4444' : '#10b981'), borderWidth: 1 }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${Utils.formatCurrency(ctx.raw, true)}` } } },
                        scales: { y: { beginAtZero: true, ticks: { callback: v => Utils.formatCurrency(v, true) } } }
                    }
                });
            }
        }, 100);
    },

    // ============================================================
    //  SUBCONTRACTORS
    // ============================================================
    renderSubcontractors(container) {
        const subs = App.activeCompany === 'all'
            ? DataStore.subcontractors
            : DataStore.subcontractors.filter(s => s.company === App.activeCompany);

        container.innerHTML = `
        <div class="section-header mb-3">
            <h2>Subcontractor Management</h2>
            <button class="btn btn-primary" onclick="Construction.openAddSubcontractor()"><i class="fas fa-plus"></i> Add Subcontractor</button>
        </div>

        <div class="grid-3 mb-3">
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon teal"><i class="fas fa-people-carry"></i></div></div>
                <div class="stat-value">${subs.length}</div>
                <div class="stat-label">Total Subcontractors</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon green"><i class="fas fa-check"></i></div></div>
                <div class="stat-value">${subs.filter(s => s.status === 'active').length}</div>
                <div class="stat-label">Active</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon orange"><i class="fas fa-star"></i></div></div>
                <div class="stat-value">${(subs.reduce((s, sub) => s + sub.rating, 0) / (subs.length || 1)).toFixed(1)}</div>
                <div class="stat-label">Avg Rating</div>
            </div>
        </div>

        <div class="card">
            <div class="card-body no-padding">
                ${Utils.buildTable(
                    [
                        { label: 'Subcontractor', render: r => `<div><strong>${r.name}</strong><div style="font-size:11px;color:var(--text-muted)">${r.email}</div></div>` },
                        { label: 'Specialty', render: r => `<span class="badge-tag badge-teal">${r.specialty}</span>` },
                        { label: 'Company', render: r => `<span class="badge-tag badge-${r.company}">${r.company}</span>` },
                        { label: 'Phone', key: 'phone' },
                        { label: 'Rating', render: r => `<span style="color:#f59e0b">★</span> ${r.rating}/5.0` },
                        { label: 'Status', render: r => `<span class="badge-tag ${r.status === 'active' ? 'badge-success' : 'badge-neutral'}">${r.status}</span>` }
                    ],
                    subs,
                    {
                        actions: (r) => `
                            <button class="btn btn-sm btn-secondary" title="View" onclick="Construction.viewSubcontractor('${r.id}')"><i class="fas fa-eye"></i></button>
                            <button class="btn btn-sm btn-secondary" title="Edit" style="margin-left:4px"><i class="fas fa-edit"></i></button>
                        `
                    }
                )}
            </div>
        </div>`;
    },

    viewSubcontractor(id) {
        const sub = DataStore.subcontractors.find(s => s.id === id);
        if (!sub) return;
        App.openModal('Subcontractor Details', `
            <div class="grid-2" style="gap:12px">
                <div><strong>Name:</strong> ${sub.name}</div>
                <div><strong>Specialty:</strong> ${sub.specialty}</div>
                <div><strong>Phone:</strong> ${sub.phone}</div>
                <div><strong>Email:</strong> ${sub.email}</div>
                <div><strong>Company:</strong> <span class="badge-tag badge-${sub.company}">${Utils.getCompanyName(sub.company)}</span></div>
                <div><strong>Rating:</strong> ★ ${sub.rating}/5.0</div>
                <div><strong>Status:</strong> <span class="badge-tag ${sub.status === 'active' ? 'badge-success' : 'badge-neutral'}">${sub.status}</span></div>
            </div>
            <h4 style="margin:20px 0 8px">Documents</h4>
            <div style="padding:16px;background:var(--bg);border-radius:var(--radius);text-align:center;color:var(--text-muted)">
                <i class="fas fa-file-alt" style="font-size:24px;margin-bottom:8px"></i><br>
                W-9, Insurance certificates, and contracts would be stored here
            </div>
        `);
    },

    openAddSubcontractor() {
        const html = `
        <form>
            <div class="form-row">
                <div class="form-group"><label>Company Name</label><input type="text" class="form-control" id="newSubName"></div>
                <div class="form-group"><label>Specialty</label><input type="text" class="form-control" id="newSubSpec" placeholder="e.g., Electrical"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Phone</label><input type="text" class="form-control" id="newSubPhone"></div>
                <div class="form-group"><label>Email</label><input type="email" class="form-control" id="newSubEmail"></div>
            </div>
            <div class="form-group">
                <label>Assigned Company</label>
                <select class="form-control" id="newSubCompany">
                    <option value="dheekay">Dheekay Builders</option>
                    <option value="kdchavit">KDChavit Construction</option>
                </select>
            </div>
        </form>`;

        App.openModal('Add Subcontractor', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Construction.saveSubcontractor()"><i class="fas fa-save"></i> Save</button>
        `);
    },

    saveSubcontractor() {
        const name = document.getElementById('newSubName')?.value;
        if (!name) { App.showToast('Name is required', 'error'); return; }

        DataStore.subcontractors.push({
            id: Utils.generateId('SUB'),
            name,
            specialty: document.getElementById('newSubSpec')?.value || '',
            phone: document.getElementById('newSubPhone')?.value || '',
            email: document.getElementById('newSubEmail')?.value || '',
            company: document.getElementById('newSubCompany').value,
            status: 'active',
            rating: 0
        });

        App.closeModal();
        App.showToast('Subcontractor added', 'success');
        this.renderSubcontractors(document.getElementById('contentArea'));
    },

    // ============================================================
    //  EQUIPMENT & FLEET MANAGEMENT
    // ============================================================
    renderEquipment(container) {
        const equipment = App.activeCompany === 'all'
            ? DataStore.equipment
            : DataStore.equipment.filter(e => e.company === App.activeCompany);

        const available = equipment.filter(e => e.status === 'available');
        const inUse = equipment.filter(e => e.status === 'in-use');
        const maintenance = equipment.filter(e => e.status === 'maintenance');

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon teal"><i class="fas fa-truck-monster"></i></div></div><div class="stat-value">${equipment.length}</div><div class="stat-label">Total Equipment</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div></div><div class="stat-value">${available.length}</div><div class="stat-label">Available</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-hard-hat"></i></div></div><div class="stat-value">${inUse.length}</div><div class="stat-label">In Use</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-tools"></i></div></div><div class="stat-value">${maintenance.length}</div><div class="stat-label">Under Maintenance</div></div>
        </div>

        <div class="section-header mb-2">
            <h2>Equipment & Fleet</h2>
            <div class="section-actions">
                <select class="form-control" style="width:150px" id="eqpStatusFilter" onchange="Construction.filterEquipment()">
                    <option value="all">All Status</option>
                    <option value="available">Available</option>
                    <option value="in-use">In Use</option>
                    <option value="maintenance">Maintenance</option>
                </select>
                <button class="btn btn-primary" onclick="Construction.openAddEquipment()"><i class="fas fa-plus"></i> Add Equipment</button>
            </div>
        </div>

        <div class="card">
            <div class="card-body no-padding" id="equipmentTableContainer">
                ${this.buildEquipmentTable(equipment)}
            </div>
        </div>`;
    },

    buildEquipmentTable(equipment) {
        if (equipment.length === 0) {
            return '<div class="empty-state"><i class="fas fa-truck-monster"></i><h3>No Equipment</h3><p>Add your first equipment or heavy machinery to track.</p></div>';
        }
        return Utils.buildTable(
            [
                { label: 'Equipment', render: r => `<div><strong>${r.name}</strong><div style="font-size:11px;color:var(--text-muted)">${r.type || ''} — ${r.id}</div></div>` },
                { label: 'Company', render: r => `<span class="badge-tag badge-${r.company}">${r.company}</span>` },
                { label: 'Plate / ID', render: r => `<span style="font-family:monospace;font-weight:600;background:var(--bg);padding:2px 8px;border-radius:4px">${r.plateNumber || r.serialNumber || 'N/A'}</span>` },
                { label: 'Assigned Project', render: r => { const p = DataStore.projects.find(pr => pr.id === r.projectId); return p ? p.name : '<span style="color:var(--text-muted)">Unassigned</span>'; }},
                { label: 'Operator', key: 'operator' },
                { label: 'Status', render: r => `<span class="badge-tag ${r.status === 'available' ? 'badge-success' : r.status === 'in-use' ? 'badge-info' : 'badge-warning'}">${r.status}</span>` },
                { label: 'Next Service', render: r => r.nextServiceDate ? Utils.formatDate(r.nextServiceDate) : '-' }
            ],
            equipment,
            {
                actions: (r) => `
                    <button class="btn btn-sm btn-secondary" onclick="Construction.viewEquipment('${r.id}')"><i class="fas fa-eye"></i></button>
                `
            }
        );
    },

    filterEquipment() {
        const status = document.getElementById('eqpStatusFilter')?.value || 'all';
        let equipment = App.activeCompany === 'all' ? DataStore.equipment : DataStore.equipment.filter(e => e.company === App.activeCompany);
        if (status !== 'all') equipment = equipment.filter(e => e.status === status);
        document.getElementById('equipmentTableContainer').innerHTML = this.buildEquipmentTable(equipment);
    },

    viewEquipment(id) {
        const eq = DataStore.equipment.find(e => e.id === id);
        if (!eq) return;
        const project = DataStore.projects.find(p => p.id === eq.projectId);
        App.openModal('Equipment Details', `
            <div class="grid-2" style="gap:16px;font-size:14px">
                <div><strong>Name:</strong> ${eq.name}</div>
                <div><strong>Type:</strong> ${eq.type || 'N/A'}</div>
                <div><strong>Make/Model:</strong> ${eq.make || ''} ${eq.model || ''}</div>
                <div><strong>Year:</strong> ${eq.year || 'N/A'}</div>
                <div><strong>Plate / Serial:</strong> ${eq.plateNumber || eq.serialNumber || 'N/A'}</div>
                <div><strong>Company:</strong> <span class="badge-tag badge-${eq.company}">${Utils.getCompanyName(eq.company)}</span></div>
                <div><strong>Status:</strong> <span class="badge-tag ${eq.status === 'available' ? 'badge-success' : eq.status === 'in-use' ? 'badge-info' : 'badge-warning'}">${eq.status}</span></div>
                <div><strong>Operator:</strong> ${eq.operator || 'None'}</div>
                <div><strong>Project:</strong> ${project?.name || 'Unassigned'}</div>
                <div><strong>Daily Rate:</strong> ${eq.dailyRate ? Utils.formatCurrency(eq.dailyRate) : 'N/A'}</div>
                <div><strong>Hours Used:</strong> ${eq.hoursUsed || 0} hrs</div>
                <div><strong>Next Service:</strong> ${eq.nextServiceDate ? Utils.formatDate(eq.nextServiceDate) : 'Not scheduled'}</div>
            </div>
            ${eq.notes ? `<div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:var(--radius);font-size:13px"><strong>Notes:</strong> ${eq.notes}</div>` : ''}
        `);
    },

    openAddEquipment() {
        const projects = App.activeCompany === 'all' ? DataStore.projects : DataStore.projects.filter(p => p.company === App.activeCompany);
        const html = `
        <form>
            <div class="form-row">
                <div class="form-group"><label>Company</label>
                    <select class="form-control" id="newEqpCompany">
                        <option value="dheekay" ${App.activeCompany === 'dheekay' ? 'selected' : ''}>Dheekay Builders</option>
                        <option value="kdchavit" ${App.activeCompany === 'kdchavit' ? 'selected' : ''}>KDChavit Construction</option>
                    </select>
                </div>
                <div class="form-group"><label>Type</label>
                    <select class="form-control" id="newEqpType">
                        <option value="Heavy Equipment">Heavy Equipment</option>
                        <option value="Light Equipment">Light Equipment</option>
                        <option value="Vehicle">Vehicle</option>
                        <option value="Power Tool">Power Tool</option>
                        <option value="Scaffolding">Scaffolding</option>
                        <option value="Crane">Crane</option>
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Equipment Name</label><input type="text" class="form-control" id="newEqpName" placeholder="e.g., CAT 320 Excavator"></div>
            <div class="form-row">
                <div class="form-group"><label>Make</label><input type="text" class="form-control" id="newEqpMake"></div>
                <div class="form-group"><label>Model</label><input type="text" class="form-control" id="newEqpModel"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Year</label><input type="number" class="form-control" id="newEqpYear" value="2024"></div>
                <div class="form-group"><label>Plate / Serial #</label><input type="text" class="form-control" id="newEqpPlate"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Operator</label><input type="text" class="form-control" id="newEqpOperator"></div>
                <div class="form-group"><label>Daily Rate (₱)</label><input type="number" class="form-control" id="newEqpRate" min="0"></div>
            </div>
            <div class="form-group"><label>Assign to Project</label>
                <select class="form-control" id="newEqpProject">
                    <option value="">Unassigned</option>
                    ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>
            </div>
        </form>`;

        App.openModal('Add Equipment', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Construction.saveEquipment()"><i class="fas fa-save"></i> Save</button>
        `);
    },

    saveEquipment() {
        const name = document.getElementById('newEqpName')?.value;
        if (!name) { App.showToast('Equipment name is required', 'error'); return; }

        Database.addEquipment({
            name,
            company: document.getElementById('newEqpCompany').value,
            type: document.getElementById('newEqpType').value,
            make: document.getElementById('newEqpMake')?.value || '',
            model: document.getElementById('newEqpModel')?.value || '',
            year: parseInt(document.getElementById('newEqpYear')?.value || 2024),
            plateNumber: document.getElementById('newEqpPlate')?.value || '',
            operator: document.getElementById('newEqpOperator')?.value || '',
            dailyRate: parseFloat(document.getElementById('newEqpRate')?.value || 0),
            projectId: document.getElementById('newEqpProject')?.value || '',
            status: 'available',
            hoursUsed: 0,
            nextServiceDate: '',
            notes: ''
        });

        App.closeModal();
        App.showToast('Equipment added successfully', 'success');
        this.renderEquipment(document.getElementById('contentArea'));
    },

    // ============================================================
    //  SAFETY / QHSE
    // ============================================================
    renderSafety(container) {
        const records = App.activeCompany === 'all'
            ? DataStore.safetyRecords
            : DataStore.safetyRecords.filter(r => r.company === App.activeCompany);

        const incidents = records.filter(r => r.type === 'incident');
        const inspections = records.filter(r => r.type === 'inspection');
        const trainings = records.filter(r => r.type === 'training');
        const daysWithoutIncident = this.calcDaysWithoutIncident(incidents);

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-calendar-check"></i></div></div><div class="stat-value">${daysWithoutIncident}</div><div class="stat-label">Days Without Incident</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-exclamation-triangle"></i></div></div><div class="stat-value">${incidents.length}</div><div class="stat-label">Total Incidents</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-clipboard-check"></i></div></div><div class="stat-value">${inspections.length}</div><div class="stat-label">Inspections</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon teal"><i class="fas fa-chalkboard-teacher"></i></div></div><div class="stat-value">${trainings.length}</div><div class="stat-label">Trainings</div></div>
        </div>

        <div class="section-header mb-2">
            <h2>Safety & QHSE Records</h2>
            <div class="section-actions">
                <select class="form-control" style="width:150px" id="safetyTypeFilter" onchange="Construction.filterSafety()">
                    <option value="all">All Types</option>
                    <option value="incident">Incidents</option>
                    <option value="inspection">Inspections</option>
                    <option value="training">Trainings</option>
                    <option value="toolbox-talk">Toolbox Talks</option>
                </select>
                <button class="btn btn-primary" onclick="Construction.openAddSafetyRecord()"><i class="fas fa-plus"></i> New Record</button>
            </div>
        </div>

        <div class="card">
            <div class="card-body no-padding" id="safetyTableContainer">
                ${this.buildSafetyTable(records)}
            </div>
        </div>`;
    },

    calcDaysWithoutIncident(incidents) {
        if (incidents.length === 0) return '∞';
        const lastIncident = incidents
            .filter(i => i.date)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (!lastIncident) return '∞';
        const diff = Math.floor((new Date() - new Date(lastIncident.date)) / (1000 * 60 * 60 * 24));
        return diff;
    },

    buildSafetyTable(records) {
        if (records.length === 0) {
            return '<div class="empty-state"><i class="fas fa-shield-alt"></i><h3>No Safety Records</h3><p>Record your first safety inspection, incident, or training.</p></div>';
        }
        return Utils.buildTable(
            [
                { label: 'Date', render: r => `<strong>${Utils.formatDate(r.date)}</strong>` },
                { label: 'Type', render: r => {
                    const icons = { incident: 'fa-exclamation-triangle', inspection: 'fa-clipboard-check', training: 'fa-chalkboard-teacher', 'toolbox-talk': 'fa-comments' };
                    const colors = { incident: 'badge-danger', inspection: 'badge-info', training: 'badge-teal', 'toolbox-talk': 'badge-neutral' };
                    return `<span class="badge-tag ${colors[r.type] || 'badge-neutral'}"><i class="fas ${icons[r.type] || 'fa-file'}"></i> ${r.type}</span>`;
                }},
                { label: 'Title', render: r => `<strong>${r.title}</strong>` },
                { label: 'Company', render: r => `<span class="badge-tag badge-${r.company}">${r.company}</span>` },
                { label: 'Project', render: r => { const p = DataStore.projects.find(pr => pr.id === r.projectId); return p ? p.name : '-'; }},
                { label: 'Severity', render: r => {
                    if (!r.severity) return '-';
                    const cls = { high: 'badge-danger', medium: 'badge-warning', low: 'badge-success' };
                    return `<span class="badge-tag ${cls[r.severity] || 'badge-neutral'}">${r.severity}</span>`;
                }},
                { label: 'Status', render: r => `<span class="badge-tag ${r.resolved ? 'badge-success' : 'badge-warning'}">${r.resolved ? 'Resolved' : 'Open'}</span>` }
            ],
            records
        );
    },

    filterSafety() {
        const type = document.getElementById('safetyTypeFilter')?.value || 'all';
        let records = App.activeCompany === 'all' ? DataStore.safetyRecords : DataStore.safetyRecords.filter(r => r.company === App.activeCompany);
        if (type !== 'all') records = records.filter(r => r.type === type);
        document.getElementById('safetyTableContainer').innerHTML = this.buildSafetyTable(records);
    },

    openAddSafetyRecord() {
        const projects = App.activeCompany === 'all' ? DataStore.projects : DataStore.projects.filter(p => p.company === App.activeCompany);
        const html = `
        <form>
            <div class="form-row">
                <div class="form-group"><label>Company</label>
                    <select class="form-control" id="newSafeCompany">
                        <option value="dheekay" ${App.activeCompany === 'dheekay' ? 'selected' : ''}>Dheekay Builders</option>
                        <option value="kdchavit" ${App.activeCompany === 'kdchavit' ? 'selected' : ''}>KDChavit Construction</option>
                    </select>
                </div>
                <div class="form-group"><label>Record Type</label>
                    <select class="form-control" id="newSafeType">
                        <option value="inspection">Safety Inspection</option>
                        <option value="incident">Incident Report</option>
                        <option value="training">Safety Training</option>
                        <option value="toolbox-talk">Toolbox Talk</option>
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Title</label><input type="text" class="form-control" id="newSafeTitle" placeholder="e.g., Monthly Site Inspection"></div>
            <div class="form-row">
                <div class="form-group"><label>Date</label><input type="date" class="form-control" id="newSafeDate" value="${new Date().toISOString().split('T')[0]}"></div>
                <div class="form-group"><label>Severity</label>
                    <select class="form-control" id="newSafeSeverity">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Project</label>
                <select class="form-control" id="newSafeProject">
                    <option value="">General</option>
                    ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Description</label><textarea class="form-control" id="newSafeDesc" rows="3"></textarea></div>
            <div class="form-group"><label>Corrective Actions</label><textarea class="form-control" id="newSafeActions" rows="2" placeholder="Actions taken or recommended..."></textarea></div>
        </form>`;

        App.openModal('New Safety Record', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Construction.saveSafetyRecord()"><i class="fas fa-save"></i> Save</button>
        `);
    },

    saveSafetyRecord() {
        const title = document.getElementById('newSafeTitle')?.value;
        if (!title) { App.showToast('Title is required', 'error'); return; }

        Database.addSafetyRecord({
            title,
            company: document.getElementById('newSafeCompany').value,
            type: document.getElementById('newSafeType').value,
            date: document.getElementById('newSafeDate').value,
            severity: document.getElementById('newSafeSeverity').value,
            projectId: document.getElementById('newSafeProject')?.value || '',
            description: document.getElementById('newSafeDesc')?.value || '',
            correctiveActions: document.getElementById('newSafeActions')?.value || '',
            resolved: false
        });

        App.closeModal();
        App.showToast('Safety record added', 'success');
        this.renderSafety(document.getElementById('contentArea'));
    },

    // ============================================================
    //  PROJECT MONITORING & AGING
    //  (Based on construction.xlsx telecom tower monitoring pattern)
    // ============================================================
    renderProjectMonitoring(container) {
        const projects = App.activeCompany === 'all'
            ? DataStore.projects
            : DataStore.projects.filter(p => p.company === App.activeCompany);

        const milestones = (DataStore.projectMilestones || []).filter(m =>
            App.activeCompany === 'all' || projects.some(p => p.id === m.projectId)
        );

        const now = new Date();
        const totalAging = milestones.reduce((s, m) => s + (m.agingDays || 0), 0);
        const avgAging = milestones.length > 0 ? Math.round(totalAging / milestones.length) : 0;
        const delayed = milestones.filter(m => m.status !== 'completed' && m.agingDays > 0);
        const critical = milestones.filter(m => m.status !== 'completed' && m.agingDays > 30);

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon teal"><i class="fas fa-tasks"></i></div></div>
                <div class="stat-value">${milestones.length}</div>
                <div class="stat-label">Total Milestones</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon orange"><i class="fas fa-hourglass-half"></i></div></div>
                <div class="stat-value">${delayed.length}</div>
                <div class="stat-label">Delayed</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div></div>
                <div class="stat-value">${critical.length}</div>
                <div class="stat-label">Critical (&gt;30 days)</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon blue"><i class="fas fa-calendar-day"></i></div></div>
                <div class="stat-value">${avgAging}d</div>
                <div class="stat-label">Avg Aging Days</div>
            </div>
        </div>

        <div class="tabs mb-3">
            <button class="tab-btn active" onclick="Construction.switchMonitorTab('overview',this)">
                <i class="fas fa-th-large" style="margin-right:5px"></i>Project Overview
            </button>
            <button class="tab-btn" onclick="Construction.switchMonitorTab('milestones',this)">
                <i class="fas fa-flag-checkered" style="margin-right:5px"></i>Milestone Tracker
            </button>
            <button class="tab-btn" onclick="Construction.switchMonitorTab('aging',this)">
                <i class="fas fa-clock" style="margin-right:5px"></i>Aging Report
            </button>
            <button class="tab-btn" onclick="Construction.switchMonitorTab('issues',this)">
                <i class="fas fa-bug" style="margin-right:5px"></i>Issues & Delays
            </button>
        </div>

        <div id="monitorTabContent">${this.renderMonitorOverview(projects, milestones)}</div>`;
    },

    switchMonitorTab(tab, btn) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const el = document.getElementById('monitorTabContent');
        const projects = App.activeCompany === 'all'
            ? DataStore.projects
            : DataStore.projects.filter(p => p.company === App.activeCompany);
        const milestones = (DataStore.projectMilestones || []).filter(m =>
            App.activeCompany === 'all' || projects.some(p => p.id === m.projectId)
        );
        switch (tab) {
            case 'overview':    el.innerHTML = this.renderMonitorOverview(projects, milestones); break;
            case 'milestones':  el.innerHTML = this.renderMilestoneTracker(projects, milestones); break;
            case 'aging':       el.innerHTML = this.renderProjectAgingReport(projects, milestones); break;
            case 'issues':      el.innerHTML = this.renderIssuesPanel(projects, milestones); break;
        }
    },

    renderMonitorOverview(projects, milestones) {
        if (projects.length === 0) {
            return '<div class="empty-state"><i class="fas fa-project-diagram"></i><h3>No Projects</h3><p>Create projects first to start monitoring.</p></div>';
        }

        return projects.map(p => {
            const pMilestones = milestones.filter(m => m.projectId === p.id);
            const completed = pMilestones.filter(m => m.status === 'completed').length;
            const total = pMilestones.length;
            const pctComplete = total > 0 ? Math.round((completed / total) * 100) : 0;
            const maxAging = pMilestones.reduce((max, m) => Math.max(max, m.agingDays || 0), 0);
            const now = new Date();
            const endDate = p.endDate ? new Date(p.endDate) : null;
            const daysLeft = endDate ? Math.floor((endDate - now) / (1000*60*60*24)) : null;

            const agingColor = maxAging === 0 ? 'var(--success)' : maxAging <= 15 ? 'var(--warning)' : 'var(--danger)';
            const daysLeftColor = daysLeft === null ? 'var(--text-muted)' : daysLeft < 0 ? 'var(--danger)' : daysLeft <= 14 ? 'var(--warning)' : 'var(--success)';

            // Milestone categories
            const categories = {};
            pMilestones.forEach(m => {
                if (!categories[m.category]) categories[m.category] = { total: 0, completed: 0 };
                categories[m.category].total++;
                if (m.status === 'completed') categories[m.category].completed++;
            });

            // Document status summary
            const docs = (DataStore.documents || []).filter(d => d.projectId === p.id);
            const docsApproved = docs.filter(d => d.status === 'approved').length;
            const docsPending = docs.filter(d => d.status === 'pending').length;

            return `
            <div class="card mb-2">
                <div class="card-header" style="border-left:4px solid ${agingColor}">
                    <div>
                        <h3 style="font-size:15px">${p.name}</h3>
                        <span style="font-size:11px;color:var(--text-muted)">${p.id} · ${p.manager || 'No Manager'} · ${p.location || ''}</span>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center">
                        <span class="badge-tag ${Utils.getStatusClass(p.status)}">${p.status}</span>
                        ${maxAging > 0 ? `<span class="badge-tag badge-danger" style="font-size:11px"><i class="fas fa-clock"></i> ${maxAging}d aging</span>` : ''}
                    </div>
                </div>
                <div class="card-body">
                    <div class="grid-4" style="gap:12px;margin-bottom:14px">
                        <div style="text-align:center;padding:10px;background:var(--bg);border-radius:var(--radius-sm)">
                            <div style="font-size:20px;font-weight:700;color:var(--secondary)">${pctComplete}%</div>
                            <div style="font-size:11px;color:var(--text-muted)">Milestones (${completed}/${total})</div>
                        </div>
                        <div style="text-align:center;padding:10px;background:var(--bg);border-radius:var(--radius-sm)">
                            <div style="font-size:20px;font-weight:700;color:${agingColor}">${maxAging}d</div>
                            <div style="font-size:11px;color:var(--text-muted)">Max Aging</div>
                        </div>
                        <div style="text-align:center;padding:10px;background:var(--bg);border-radius:var(--radius-sm)">
                            <div style="font-size:20px;font-weight:700;color:${daysLeftColor}">${daysLeft !== null ? (daysLeft < 0 ? Math.abs(daysLeft) + 'd late' : daysLeft + 'd') : 'N/A'}</div>
                            <div style="font-size:11px;color:var(--text-muted)">${daysLeft !== null && daysLeft < 0 ? 'Overdue' : 'Days Left'}</div>
                        </div>
                        <div style="text-align:center;padding:10px;background:var(--bg);border-radius:var(--radius-sm)">
                            <div style="font-size:20px;font-weight:700">${docsApproved}/${docs.length}</div>
                            <div style="font-size:11px;color:var(--text-muted)">Docs Approved</div>
                        </div>
                    </div>

                    ${Object.keys(categories).length > 0 ? `
                    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
                        ${Object.entries(categories).map(([cat, data]) => {
                            const pct = Math.round((data.completed / data.total) * 100);
                            const color = pct === 100 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
                            return `<div style="padding:6px 12px;background:var(--bg);border-radius:6px;font-size:12px;border-left:3px solid ${color};display:flex;align-items:center;gap:6px">
                                <span style="font-weight:600">${cat}</span>
                                <span style="color:${color};font-weight:700">${data.completed}/${data.total}</span>
                            </div>`;
                        }).join('')}
                    </div>` : '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px"><i class="fas fa-info-circle"></i> No milestones added yet</div>'}

                    <div style="display:flex;gap:8px">
                        <button class="btn btn-sm btn-primary" onclick="Construction.openAddMilestone('${p.id}')"><i class="fas fa-plus"></i> Add Milestone</button>
                        <button class="btn btn-sm btn-secondary" onclick="Construction.viewProjectMilestones('${p.id}')"><i class="fas fa-list"></i> View All</button>
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    renderMilestoneTracker(projects, milestones) {
        const projectFilter = `
        <div class="section-header mb-2">
            <h3>Milestone Tracker</h3>
            <div class="section-actions">
                <select class="form-control" style="width:200px" id="msProjectFilter" onchange="Construction.filterMilestones()">
                    <option value="all">All Projects</option>
                    ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>
                <select class="form-control" style="width:150px" id="msStatusFilter" onchange="Construction.filterMilestones()">
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="delayed">Delayed</option>
                    <option value="blocked">Blocked</option>
                </select>
            </div>
        </div>`;

        return projectFilter + `
        <div class="card">
            <div class="card-body no-padding" id="milestoneTableContainer">
                ${this.buildMilestoneTable(milestones, projects)}
            </div>
        </div>`;
    },

    buildMilestoneTable(milestones, projects) {
        if (milestones.length === 0) {
            return '<div class="empty-state"><i class="fas fa-flag-checkered"></i><h3>No Milestones</h3><p>Add milestones to your projects to start tracking.</p></div>';
        }
        return Utils.buildTable(
            [
                { label: 'Project', render: r => {
                    const p = projects.find(pr => pr.id === r.projectId);
                    return `<strong>${p?.name || r.projectId}</strong>`;
                }},
                { label: 'Milestone', render: r => `<div><strong>${r.milestoneName}</strong><div style="font-size:11px;color:var(--text-muted)">${r.category || 'General'}</div></div>` },
                { label: 'Target Date', render: r => r.targetDate ? Utils.formatDate(r.targetDate) : '-' },
                { label: 'Completed', render: r => r.completedDate ? `<span class="text-success">${Utils.formatDate(r.completedDate)}</span>` : '<span style="color:var(--text-muted)">—</span>' },
                { label: 'Aging', render: r => {
                    const days = r.agingDays || 0;
                    if (r.status === 'completed') return '<span class="badge-tag badge-success">Done</span>';
                    if (days === 0) return '<span class="badge-tag badge-success">On time</span>';
                    if (days <= 15) return `<span class="badge-tag badge-warning">${days}d</span>`;
                    if (days <= 30) return `<span class="badge-tag badge-danger">${days}d</span>`;
                    return `<span class="badge-tag badge-danger" style="background:#7f1d1d;color:#fca5a5">${days}d CRITICAL</span>`;
                }},
                { label: 'Status', render: r => `<span class="badge-tag ${Utils.getStatusClass(r.status)}">${r.status}</span>` },
                { label: 'Issues', render: r => r.issues ? `<span style="color:var(--danger);font-size:12px" title="${Utils.escapeHtml(r.issues)}"><i class="fas fa-exclamation-circle"></i> ${r.issues.substring(0, 30)}${r.issues.length > 30 ? '…' : ''}</span>` : '<span style="color:var(--text-muted)">—</span>' }
            ],
            milestones,
            {
                actions: r => `
                    <button class="btn btn-sm btn-secondary" onclick="Construction.openEditMilestone('${r.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    ${Auth.canEditDelete() ? `<button class="btn btn-sm btn-danger" onclick="Construction.deleteMilestone('${r.id}')" title="Delete" style="margin-left:4px"><i class="fas fa-trash"></i></button>` : ''}
                `
            }
        );
    },

    filterMilestones() {
        const projFilter = document.getElementById('msProjectFilter')?.value || 'all';
        const statusFilter = document.getElementById('msStatusFilter')?.value || 'all';
        const projects = App.activeCompany === 'all'
            ? DataStore.projects
            : DataStore.projects.filter(p => p.company === App.activeCompany);
        let milestones = (DataStore.projectMilestones || []).filter(m =>
            App.activeCompany === 'all' || projects.some(p => p.id === m.projectId)
        );
        if (projFilter !== 'all') milestones = milestones.filter(m => m.projectId === projFilter);
        if (statusFilter !== 'all') milestones = milestones.filter(m => m.status === statusFilter);
        document.getElementById('milestoneTableContainer').innerHTML = this.buildMilestoneTable(milestones, projects);
    },

    renderProjectAgingReport(projects, milestones) {
        const activeMilestones = milestones.filter(m => m.status !== 'completed');
        const buckets = { ontime: [], d15: [], d30: [], d60: [], d90: [] };

        activeMilestones.forEach(m => {
            const days = m.agingDays || 0;
            if (days <= 0) buckets.ontime.push(m);
            else if (days <= 15) buckets.d15.push(m);
            else if (days <= 30) buckets.d30.push(m);
            else if (days <= 60) buckets.d60.push(m);
            else buckets.d90.push(m);
        });

        const renderBucket = (items, label, badgeCls, color) => `
        <div class="card mb-2">
            <div class="card-header">
                <div style="display:flex;align-items:center;gap:12px">
                    <span class="badge-tag ${badgeCls}">${label}</span>
                    <span style="font-size:12px;color:var(--text-secondary)">${items.length} milestone(s)</span>
                </div>
            </div>
            ${items.length > 0 ? `<div class="card-body no-padding">
                <table class="data-table" style="font-size:12px">
                    <thead><tr><th>Project</th><th>Milestone</th><th>Category</th><th>Target Date</th><th>Aging Days</th><th>Issues</th></tr></thead>
                    <tbody>${items.map(m => {
                        const p = projects.find(pr => pr.id === m.projectId);
                        return `<tr>
                            <td><strong>${p?.name || m.projectId}</strong></td>
                            <td>${m.milestoneName}</td>
                            <td><span class="badge-tag badge-neutral">${m.category || 'General'}</span></td>
                            <td>${m.targetDate ? Utils.formatDate(m.targetDate) : '—'}</td>
                            <td><span style="color:${color};font-weight:700">${m.agingDays || 0}d</span></td>
                            <td style="font-size:11px">${m.issues || '—'}</td>
                        </tr>`;
                    }).join('')}</tbody>
                </table>
            </div>` : ''}
        </div>`;

        const summary = [
            { label: 'On Time',     count: buckets.ontime.length, color: 'var(--success)' },
            { label: '1-15 Days',   count: buckets.d15.length,    color: 'var(--warning)' },
            { label: '16-30 Days',  count: buckets.d30.length,    color: '#f97316' },
            { label: '31-60 Days',  count: buckets.d60.length,    color: 'var(--danger)' },
            { label: '61+ Days',    count: buckets.d90.length,    color: '#7f1d1d' }
        ];

        return `
        <div class="section-header mb-3">
            <h3>Project Aging Report</h3>
            <span style="font-size:13px;color:var(--text-secondary)">Active milestones: <strong>${activeMilestones.length}</strong></span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px">
            ${summary.map(b => `
            <div class="stat-card" style="border-top:3px solid ${b.color}">
                <div class="stat-value" style="font-size:22px;color:${b.color}">${b.count}</div>
                <div class="stat-label">${b.label}</div>
            </div>`).join('')}
        </div>

        ${renderBucket(buckets.ontime, 'On Time', 'badge-success', 'var(--success)')}
        ${renderBucket(buckets.d15, '1–15 Days Delayed', 'badge-warning', 'var(--warning)')}
        ${renderBucket(buckets.d30, '16–30 Days Delayed', 'badge-warning', '#f97316')}
        ${renderBucket(buckets.d60, '31–60 Days Delayed', 'badge-danger', 'var(--danger)')}
        ${renderBucket(buckets.d90, '61+ Days Delayed', 'badge-danger', '#7f1d1d')}

        ${activeMilestones.length === 0 ? '<div class="empty-state"><i class="fas fa-check-circle" style="color:var(--success)"></i><h3>All Clear</h3><p>No active milestones to track.</p></div>' : ''}`;
    },

    renderIssuesPanel(projects, milestones) {
        const withIssues = milestones.filter(m => m.issues || m.remarks || m.status === 'blocked' || m.status === 'delayed');

        if (withIssues.length === 0) {
            return '<div class="empty-state"><i class="fas fa-check-circle" style="color:var(--success);font-size:36px"></i><h3>No Issues</h3><p>All milestones are progressing normally.</p></div>';
        }

        return `
        <div class="section-header mb-2">
            <h3>Issues & Delay Log</h3>
            <span style="font-size:13px;color:var(--text-secondary)">${withIssues.length} item(s) with issues</span>
        </div>
        ${withIssues.map(m => {
            const p = projects.find(pr => pr.id === m.projectId);
            const agingColor = (m.agingDays || 0) > 30 ? 'var(--danger)' : (m.agingDays || 0) > 0 ? 'var(--warning)' : 'var(--success)';
            return `
            <div class="card mb-2" style="border-left:4px solid ${agingColor}">
                <div class="card-body">
                    <div class="flex-between mb-1">
                        <div>
                            <strong>${m.milestoneName}</strong>
                            <span style="font-size:12px;color:var(--text-muted);margin-left:8px">${p?.name || ''}</span>
                        </div>
                        <div style="display:flex;gap:6px">
                            <span class="badge-tag ${Utils.getStatusClass(m.status)}">${m.status}</span>
                            ${m.agingDays > 0 ? `<span class="badge-tag badge-danger">${m.agingDays}d</span>` : ''}
                        </div>
                    </div>
                    ${m.issues ? `<div style="padding:8px 12px;background:rgba(239,68,68,0.06);border-radius:6px;font-size:13px;margin-bottom:6px"><i class="fas fa-exclamation-circle" style="color:var(--danger);margin-right:6px"></i><strong>Issue:</strong> ${Utils.escapeHtml(m.issues)}</div>` : ''}
                    ${m.remarks ? `<div style="padding:8px 12px;background:var(--bg);border-radius:6px;font-size:13px"><i class="fas fa-sticky-note" style="color:var(--warning);margin-right:6px"></i><strong>Remarks:</strong> ${Utils.escapeHtml(m.remarks)}</div>` : ''}
                </div>
            </div>`;
        }).join('')}`;
    },

    // Milestone CRUD operations
    openAddMilestone(projectId) {
        const MILESTONE_CATEGORIES = [
            'Site Survey', 'Approved TSSR', 'BP Secured', 'Construction Started',
            'Construction Completed', 'Post-Construction', 'PQ/PO Tracking',
            'COOP Surveyed', 'Energization', 'Grid Connection', 'Permit',
            'Foundation', 'Structural', 'Electrical', 'Plumbing', 'Finishing',
            'Inspection', 'Handover', 'Other'
        ];

        const html = `
        <form>
            <div class="form-row">
                <div class="form-group">
                    <label>Milestone Name <span class="required">*</span></label>
                    <input type="text" class="form-control" id="newMsName" placeholder="e.g., Construction Started">
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select class="form-control" id="newMsCategory">
                        ${MILESTONE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Target Date</label>
                    <input type="date" class="form-control" id="newMsTarget">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select class="form-control" id="newMsStatus">
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="delayed">Delayed</option>
                        <option value="blocked">Blocked</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Issues / Delay Reason</label>
                <textarea class="form-control" id="newMsIssues" rows="2" placeholder="Describe any issues or delays..."></textarea>
            </div>
            <div class="form-group">
                <label>Remarks</label>
                <textarea class="form-control" id="newMsRemarks" rows="2" placeholder="Additional notes..."></textarea>
            </div>
        </form>`;

        App.openModal('Add Milestone', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Construction.saveMilestone('${projectId}')"><i class="fas fa-save"></i> Save</button>
        `);
    },

    saveMilestone(projectId) {
        const name = document.getElementById('newMsName')?.value?.trim();
        if (!name) { App.showToast('Milestone name is required', 'error'); return; }

        if (!DataStore.projectMilestones) DataStore.projectMilestones = [];

        const targetDate = document.getElementById('newMsTarget')?.value || '';
        const status = document.getElementById('newMsStatus')?.value || 'pending';
        let agingDays = 0;
        if (targetDate && status !== 'completed') {
            const diff = Math.floor((Date.now() - new Date(targetDate).getTime()) / (1000*60*60*24));
            agingDays = Math.max(0, diff);
        }

        DataStore.projectMilestones.push({
            id: Utils.generateId('MS'),
            projectId,
            milestoneName: name,
            category: document.getElementById('newMsCategory')?.value || 'Other',
            targetDate,
            completedDate: status === 'completed' ? new Date().toISOString().split('T')[0] : '',
            status,
            agingDays,
            issues: document.getElementById('newMsIssues')?.value || '',
            remarks: document.getElementById('newMsRemarks')?.value || ''
        });

        Database.save();
        App.closeModal();
        App.showToast(`Milestone "${name}" added`, 'success');
        this.renderProjectMonitoring(document.getElementById('contentArea'));
    },

    openEditMilestone(id) {
        const m = (DataStore.projectMilestones || []).find(ms => ms.id === id);
        if (!m) return;

        const MILESTONE_CATEGORIES = [
            'Site Survey', 'Approved TSSR', 'BP Secured', 'Construction Started',
            'Construction Completed', 'Post-Construction', 'PQ/PO Tracking',
            'COOP Surveyed', 'Energization', 'Grid Connection', 'Permit',
            'Foundation', 'Structural', 'Electrical', 'Plumbing', 'Finishing',
            'Inspection', 'Handover', 'Other'
        ];

        const html = `
        <form>
            <div class="form-row">
                <div class="form-group">
                    <label>Milestone Name <span class="required">*</span></label>
                    <input type="text" class="form-control" id="editMsName" value="${Utils.escapeHtml(m.milestoneName)}">
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select class="form-control" id="editMsCategory">
                        ${MILESTONE_CATEGORIES.map(c => `<option value="${c}" ${m.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Target Date</label>
                    <input type="date" class="form-control" id="editMsTarget" value="${m.targetDate || ''}">
                </div>
                <div class="form-group">
                    <label>Completed Date</label>
                    <input type="date" class="form-control" id="editMsCompleted" value="${m.completedDate || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select class="form-control" id="editMsStatus">
                    ${['pending','in-progress','completed','delayed','blocked'].map(s => `<option value="${s}" ${m.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Issues / Delay Reason</label>
                <textarea class="form-control" id="editMsIssues" rows="2">${Utils.escapeHtml(m.issues || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Remarks</label>
                <textarea class="form-control" id="editMsRemarks" rows="2">${Utils.escapeHtml(m.remarks || '')}</textarea>
            </div>
        </form>`;

        App.openModal('Edit Milestone', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Construction.saveEditMilestone('${id}')"><i class="fas fa-save"></i> Save</button>
        `);
    },

    saveEditMilestone(id) {
        const idx = (DataStore.projectMilestones || []).findIndex(ms => ms.id === id);
        if (idx < 0) return;
        const name = document.getElementById('editMsName')?.value?.trim();
        if (!name) { App.showToast('Milestone name is required', 'error'); return; }

        const m = DataStore.projectMilestones[idx];
        m.milestoneName = name;
        m.category = document.getElementById('editMsCategory')?.value || m.category;
        m.targetDate = document.getElementById('editMsTarget')?.value || '';
        m.completedDate = document.getElementById('editMsCompleted')?.value || '';
        m.status = document.getElementById('editMsStatus')?.value || m.status;
        m.issues = document.getElementById('editMsIssues')?.value || '';
        m.remarks = document.getElementById('editMsRemarks')?.value || '';

        // Recalculate aging
        if (m.status === 'completed' && m.completedDate) {
            m.agingDays = 0;
        } else if (m.targetDate) {
            const diff = Math.floor((Date.now() - new Date(m.targetDate).getTime()) / (1000*60*60*24));
            m.agingDays = Math.max(0, diff);
        } else {
            m.agingDays = 0;
        }

        Database.save();
        App.closeModal();
        App.showToast(`Milestone "${name}" updated`, 'success');
        this.renderProjectMonitoring(document.getElementById('contentArea'));
    },

    deleteMilestone(id) {
        if (!Auth.canEditDelete()) { App.showToast('Only Owner or Super Admin can delete', 'error'); return; }
        if (!confirm('Delete this milestone?')) return;
        DataStore.projectMilestones = (DataStore.projectMilestones || []).filter(m => m.id !== id);
        Database.save();
        App.showToast('Milestone deleted', 'success');
        this.renderProjectMonitoring(document.getElementById('contentArea'));
    },

    viewProjectMilestones(projectId) {
        const p = DataStore.projects.find(pr => pr.id === projectId);
        const milestones = (DataStore.projectMilestones || []).filter(m => m.projectId === projectId);

        let html = `<h3 style="margin-bottom:16px">${p?.name || projectId} — Milestones</h3>`;

        if (milestones.length === 0) {
            html += '<div style="text-align:center;padding:24px;color:var(--text-muted)">No milestones yet</div>';
        } else {
            html += '<table class="data-table" style="font-size:12px"><thead><tr><th>Milestone</th><th>Category</th><th>Target</th><th>Completed</th><th>Aging</th><th>Status</th><th>Issues</th></tr></thead><tbody>';
            milestones.forEach(m => {
                const agingColor = m.agingDays > 30 ? 'var(--danger)' : m.agingDays > 0 ? 'var(--warning)' : 'var(--success)';
                html += `<tr>
                    <td><strong>${m.milestoneName}</strong></td>
                    <td><span class="badge-tag badge-neutral">${m.category || ''}</span></td>
                    <td>${m.targetDate ? Utils.formatDate(m.targetDate) : '—'}</td>
                    <td>${m.completedDate ? `<span class="text-success">${Utils.formatDate(m.completedDate)}</span>` : '—'}</td>
                    <td><span style="color:${agingColor};font-weight:700">${m.status === 'completed' ? '✓' : (m.agingDays || 0) + 'd'}</span></td>
                    <td><span class="badge-tag ${Utils.getStatusClass(m.status)}">${m.status}</span></td>
                    <td style="font-size:11px;max-width:200px">${m.issues || '—'}</td>
                </tr>`;
            });
            html += '</tbody></table>';
        }

        App.openModal('Project Milestones', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            <button class="btn btn-primary" onclick="App.closeModal(); Construction.openAddMilestone('${projectId}')"><i class="fas fa-plus"></i> Add Milestone</button>
        `, true);
    },

    // ============================================================
    //  DOCUMENT MANAGEMENT (Enhanced with File Upload)
    // ============================================================
    renderDocuments(container) {
        const documents = App.activeCompany === 'all'
            ? DataStore.documents
            : DataStore.documents.filter(d => d.company === App.activeCompany);

        const rfis = documents.filter(d => d.category === 'RFI');
        const submittals = documents.filter(d => d.category === 'Submittal');
        const contracts = documents.filter(d => d.category === 'Contract');

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon teal"><i class="fas fa-folder-open"></i></div></div><div class="stat-value">${documents.length}</div><div class="stat-label">Total Documents</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-question-circle"></i></div></div><div class="stat-value">${rfis.length}</div><div class="stat-label">RFIs</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-paper-plane"></i></div></div><div class="stat-value">${submittals.length}</div><div class="stat-label">Submittals</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-file-signature"></i></div></div><div class="stat-value">${contracts.length}</div><div class="stat-label">Contracts</div></div>
        </div>

        <div class="section-header mb-2">
            <h2>Document Control</h2>
            <div class="section-actions">
                <select class="form-control" style="width:150px" id="docCategoryFilter" onchange="Construction.filterDocuments()">
                    <option value="all">All Categories</option>
                    <option value="RFI">RFIs</option>
                    <option value="Submittal">Submittals</option>
                    <option value="Contract">Contracts</option>
                    <option value="Drawing">Drawings</option>
                    <option value="Permit">Permits</option>
                    <option value="Specification">Specifications</option>
                    <option value="Report">Reports</option>
                    <option value="Other">Other</option>
                </select>
                <button class="btn btn-primary" onclick="Construction.openAddDocument()"><i class="fas fa-plus"></i> Add Document</button>
            </div>
        </div>

        <div class="card">
            <div class="card-body no-padding" id="documentsTableContainer">
                ${this.buildDocumentsTable(documents)}
            </div>
        </div>`;
    },

    buildDocumentsTable(documents) {
        if (documents.length === 0) {
            return '<div class="empty-state"><i class="fas fa-folder-open"></i><h3>No Documents</h3><p>Add RFIs, submittals, contracts, and other project documents.</p></div>';
        }
        return Utils.buildTable(
            [
                { label: 'Document', render: r => {
                    const icon = r.hasFile ? (r.fileType === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-image') : 'fa-file-alt';
                    const iconColor = r.hasFile ? (r.fileType === 'application/pdf' ? '#e74c3c' : '#3498db') : 'var(--text-muted)';
                    return `<div style="display:flex;align-items:center;gap:8px">
                        <i class="fas ${icon}" style="font-size:18px;color:${iconColor}"></i>
                        <div><strong>${r.title}</strong><div style="font-size:11px;color:var(--text-muted)">${r.id} — Rev ${r.revision || '0'}${r.hasFile ? ' · <span style="color:var(--success)"><i class="fas fa-paperclip"></i> File attached</span>' : ''}</div></div>
                    </div>`;
                }},
                { label: 'Category', render: r => {
                    const colors = { RFI: 'badge-info', Submittal: 'badge-warning', Contract: 'badge-teal', Drawing: 'badge-neutral', Permit: 'badge-success', Specification: 'badge-neutral', Report: 'badge-neutral' };
                    return `<span class="badge-tag ${colors[r.category] || 'badge-neutral'}">${r.category}</span>`;
                }},
                { label: 'Company', render: r => `<span class="badge-tag badge-${r.company}">${r.company}</span>` },
                { label: 'Project', render: r => { const p = DataStore.projects.find(pr => pr.id === r.projectId); return p ? p.name : '-'; }},
                { label: 'Date', render: r => Utils.formatDate(r.uploadDate) },
                { label: 'Status', render: r => `<span class="badge-tag ${r.status === 'approved' ? 'badge-success' : r.status === 'pending' ? 'badge-warning' : r.status === 'rejected' ? 'badge-danger' : 'badge-neutral'}">${r.status}</span>` }
            ],
            documents,
            {
                actions: (r) => `
                    <button class="btn btn-sm btn-secondary" onclick="Construction.viewDocument('${r.id}')"><i class="fas fa-eye"></i></button>
                    ${r.hasFile ? `<button class="btn btn-sm btn-secondary" onclick="Construction.downloadDocument('${r.id}')" title="Download" style="margin-left:4px"><i class="fas fa-download"></i></button>` : ''}
                `
            }
        );
    },

    filterDocuments() {
        const cat = document.getElementById('docCategoryFilter')?.value || 'all';
        let documents = App.activeCompany === 'all' ? DataStore.documents : DataStore.documents.filter(d => d.company === App.activeCompany);
        if (cat !== 'all') documents = documents.filter(d => d.category === cat);
        document.getElementById('documentsTableContainer').innerHTML = this.buildDocumentsTable(documents);
    },

    viewDocument(id) {
        const doc = DataStore.documents.find(d => d.id === id);
        if (!doc) return;
        const project = DataStore.projects.find(p => p.id === doc.projectId);
        App.openModal('Document Details', `
            <div class="grid-2" style="gap:16px;font-size:14px">
                <div><strong>Title:</strong> ${doc.title}</div>
                <div><strong>Category:</strong> <span class="badge-tag">${doc.category}</span></div>
                <div><strong>Document #:</strong> ${doc.id}</div>
                <div><strong>Revision:</strong> ${doc.revision || '0'}</div>
                <div><strong>Company:</strong> <span class="badge-tag badge-${doc.company}">${Utils.getCompanyName(doc.company)}</span></div>
                <div><strong>Project:</strong> ${project?.name || 'N/A'}</div>
                <div><strong>Date:</strong> ${Utils.formatDate(doc.uploadDate)}</div>
                <div><strong>Status:</strong> <span class="badge-tag ${doc.status === 'approved' ? 'badge-success' : doc.status === 'pending' ? 'badge-warning' : 'badge-neutral'}">${doc.status}</span></div>
                <div><strong>Author:</strong> ${doc.author || 'N/A'}</div>
                <div><strong>Assigned To:</strong> ${doc.assignedTo || 'N/A'}</div>
            </div>
            ${doc.hasFile ? `
            <div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:var(--radius);display:flex;align-items:center;gap:12px">
                <i class="fas ${doc.fileType === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-image'}" style="font-size:24px;color:${doc.fileType === 'application/pdf' ? '#e74c3c' : '#3498db'}"></i>
                <div>
                    <div style="font-weight:600">${doc.fileName || 'Attached File'}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${doc.fileType || ''} · ${doc.fileSize ? (doc.fileSize / 1024 / 1024).toFixed(2) + ' MB' : ''}</div>
                </div>
                <button class="btn btn-sm btn-primary" onclick="Construction.downloadDocument('${doc.id}')" style="margin-left:auto"><i class="fas fa-download"></i> Download</button>
            </div>` : '<div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:var(--radius);color:var(--text-muted);text-align:center"><i class="fas fa-file-alt" style="font-size:24px;margin-bottom:8px"></i><br>No file attached</div>'}
            ${doc.description ? `<div style="margin-top:8px;padding:12px;background:var(--bg);border-radius:var(--radius);font-size:13px"><strong>Description:</strong><br>${doc.description}</div>` : ''}
            ${doc.notes ? `<div style="margin-top:8px;padding:12px;background:var(--bg);border-radius:var(--radius);font-size:13px"><strong>Notes:</strong><br>${doc.notes}</div>` : ''}
        `, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            ${Auth.canEditDelete() ? `<button class="btn btn-primary" onclick="Construction.openEditDocumentStatus('${doc.id}')"><i class="fas fa-edit"></i> Update Status</button>` : ''}
        `);
    },

    openEditDocumentStatus(id) {
        const doc = DataStore.documents.find(d => d.id === id);
        if (!doc) return;
        const html = `
        <form>
            <div class="form-group">
                <label>Status</label>
                <select class="form-control" id="editDocStatus">
                    ${['pending','under-review','approved','rejected','superseded'].map(s => `<option value="${s}" ${doc.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea class="form-control" id="editDocNotes" rows="3">${Utils.escapeHtml(doc.notes || '')}</textarea>
            </div>
        </form>`;
        App.openModal('Update Document Status', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Construction.saveDocStatus('${id}')"><i class="fas fa-save"></i> Save</button>
        `);
    },

    saveDocStatus(id) {
        const doc = DataStore.documents.find(d => d.id === id);
        if (!doc) return;
        doc.status = document.getElementById('editDocStatus')?.value || doc.status;
        doc.notes = document.getElementById('editDocNotes')?.value || '';
        Database.save();
        App.closeModal();
        App.showToast('Document status updated', 'success');
        this.renderDocuments(document.getElementById('contentArea'));
    },

    async downloadDocument(id) {
        try {
            const resp = await fetch(`http://localhost:3000/api/documents/${encodeURIComponent(id)}/download`);
            if (!resp.ok) {
                // Fallback: document may only be in localStorage
                App.showToast('File not available for download from server', 'error');
                return;
            }
            const blob = await resp.blob();
            const doc = DataStore.documents.find(d => d.id === id);
            const filename = doc?.fileName || 'document';
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            App.showToast('Download failed: ' + err.message, 'error');
        }
    },

    openAddDocument() {
        const projects = App.activeCompany === 'all' ? DataStore.projects : DataStore.projects.filter(p => p.company === App.activeCompany);
        const html = `
        <form>
            <div class="form-row">
                <div class="form-group"><label>Company</label>
                    <select class="form-control" id="newDocCompany">
                        <option value="dheekay" ${App.activeCompany === 'dheekay' ? 'selected' : ''}>Dheekay Builders</option>
                        <option value="kdchavit" ${App.activeCompany === 'kdchavit' ? 'selected' : ''}>KDChavit Construction</option>
                    </select>
                </div>
                <div class="form-group"><label>Category</label>
                    <select class="form-control" id="newDocCategory">
                        <option value="RFI">RFI (Request for Information)</option>
                        <option value="Submittal">Submittal</option>
                        <option value="Contract">Contract</option>
                        <option value="Drawing">Drawing</option>
                        <option value="Permit">Permit</option>
                        <option value="Specification">Specification</option>
                        <option value="Report">Report</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Document Title</label><input type="text" class="form-control" id="newDocTitle" placeholder="e.g., RFI-001: Foundation Detail Clarification"></div>
            <div class="form-row">
                <div class="form-group"><label>Project</label>
                    <select class="form-control" id="newDocProject">
                        <option value="">General</option>
                        ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Revision</label><input type="text" class="form-control" id="newDocRev" value="0"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Author</label><input type="text" class="form-control" id="newDocAuthor"></div>
                <div class="form-group"><label>Assigned To</label><input type="text" class="form-control" id="newDocAssigned"></div>
            </div>
            <div class="form-group"><label>Description</label><textarea class="form-control" id="newDocDesc" rows="3"></textarea></div>
            <div class="form-group">
                <label><i class="fas fa-cloud-upload-alt" style="margin-right:6px"></i>Attach File (PDF, Image — max 16 MB)</label>
                <input type="file" class="form-control" id="newDocFile" accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp"
                       style="padding:10px;border:2px dashed var(--border);border-radius:var(--radius);cursor:pointer">
                <div id="newDocFileInfo" style="font-size:12px;color:var(--text-muted);margin-top:4px"></div>
            </div>
        </form>`;

        App.openModal('Add Document', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Construction.saveDocument()"><i class="fas fa-save"></i> Save</button>
        `);

        // File info preview
        setTimeout(() => {
            const fileInput = document.getElementById('newDocFile');
            if (fileInput) {
                fileInput.addEventListener('change', () => {
                    const file = fileInput.files[0];
                    const info = document.getElementById('newDocFileInfo');
                    if (file && info) {
                        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                        if (file.size > 16 * 1024 * 1024) {
                            info.innerHTML = `<span style="color:var(--danger)"><i class="fas fa-exclamation-triangle"></i> File too large (${sizeMB} MB). Max 16 MB.</span>`;
                        } else {
                            info.innerHTML = `<i class="fas fa-check-circle" style="color:var(--success)"></i> ${file.name} (${sizeMB} MB)`;
                        }
                    }
                });
            }
        }, 100);
    },

    async saveDocument() {
        const title = document.getElementById('newDocTitle')?.value;
        if (!title) { App.showToast('Document title is required', 'error'); return; }

        const fileInput = document.getElementById('newDocFile');
        const file = fileInput?.files?.[0];

        // Validate file size
        if (file && file.size > 16 * 1024 * 1024) {
            App.showToast('File is too large. Maximum 16 MB allowed.', 'error');
            return;
        }

        const company = document.getElementById('newDocCompany').value;
        const docData = {
            title,
            company,
            category: document.getElementById('newDocCategory').value,
            projectId: document.getElementById('newDocProject')?.value || '',
            revision: document.getElementById('newDocRev')?.value || '0',
            author: document.getElementById('newDocAuthor')?.value || '',
            assignedTo: document.getElementById('newDocAssigned')?.value || '',
            description: document.getElementById('newDocDesc')?.value || '',
            status: 'pending',
            notes: '',
            hasFile: !!file,
            fileName: file?.name || '',
            fileType: file?.type || '',
            fileSize: file?.size || 0
        };

        // Save metadata to DataStore (localStorage)
        Database.addDocument(docData);

        // If file attached, upload to backend
        if (file) {
            try {
                const reader = new FileReader();
                reader.onload = async function() {
                    const base64 = reader.result.split(',')[1];
                    try {
                        await fetch('http://localhost:3000/api/documents', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                title: docData.title,
                                company,
                                projectId: docData.projectId,
                                category: docData.category,
                                fileName: file.name,
                                fileType: file.type,
                                fileSize: file.size,
                                fileData: base64,
                                uploadedBy: Auth.session?.username || 'system'
                            })
                        });
                    } catch (uploadErr) {
                        console.warn('Backend upload failed, file saved locally only:', uploadErr);
                    }
                };
                reader.readAsDataURL(file);
            } catch (err) {
                console.warn('File read error:', err);
            }
        }

        App.closeModal();
        App.showToast('Document added' + (file ? ' with file attachment' : ''), 'success');
        this.renderDocuments(document.getElementById('contentArea'));
    },

    // ============================================================
    //  CREDIT & COLLECTION
    // ============================================================
    renderCreditCollection(container) {
        const company = App.activeCompany;
        const filter = arr => (company === 'all' ? arr : arr.filter(i => i.company === company));

        const invoices = filter(DataStore.invoices);
        const receipts = filter(DataStore.collectionReceipts || []);

        const totalBilled    = invoices.reduce((s, i) => s + i.amount, 0);
        const totalCollected = invoices.reduce((s, i) => s + i.paid, 0);
        const totalAR        = totalBilled - totalCollected;

        const now = new Date();
        const overdue = invoices.filter(i =>
            (i.status === 'unpaid' || i.status === 'partial') && new Date(i.dueDate) < now
        );
        const overdueAmount = overdue.reduce((s, i) => s + (i.amount - i.paid), 0);

        const thisMonthReceipts = receipts.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const collectedThisMonth = thisMonthReceipts.reduce((s, r) => s + r.amount, 0);

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon blue"><i class="fas fa-file-invoice-dollar"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(totalBilled, true)}</div>
                <div class="stat-label">Total Billed</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon green"><i class="fas fa-hand-holding-usd"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(totalCollected, true)}</div>
                <div class="stat-label">Total Collected</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon orange"><i class="fas fa-hourglass-half"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(totalAR, true)}</div>
                <div class="stat-label">Accounts Receivable</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon red"><i class="fas fa-exclamation-circle"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(overdueAmount, true)}</div>
                <div class="stat-label">Overdue (${overdue.length} inv.)</div>
            </div>
        </div>

        <div class="tabs mb-3">
            <button class="tab-btn active" onclick="Construction.switchCCTab('chargeInvoices',this)">
                <i class="fas fa-file-invoice" style="margin-right:5px"></i>Charge Invoices
            </button>
            <button class="tab-btn" onclick="Construction.switchCCTab('collectionReceipts',this)">
                <i class="fas fa-receipt" style="margin-right:5px"></i>Collection Receipts
                ${receipts.length > 0 ? `<span class="badge-tag badge-teal" style="margin-left:4px">${receipts.length}</span>` : ''}
            </button>
            <button class="tab-btn" onclick="Construction.switchCCTab('aging',this)">
                <i class="fas fa-clock" style="margin-right:5px"></i>Aging Report
            </button>
        </div>

        <div id="ccTabContent">${this.renderChargeInvoicesTab()}</div>`;
    },

    switchCCTab(tab, btn) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const el = document.getElementById('ccTabContent');
        switch (tab) {
            case 'chargeInvoices':      el.innerHTML = this.renderChargeInvoicesTab(); break;
            case 'collectionReceipts':  el.innerHTML = this.renderCollectionReceiptsTab(); break;
            case 'aging':               el.innerHTML = this.renderAgingReport(); break;
        }
    },

    renderChargeInvoicesTab() {
        const company = App.activeCompany;
        const invoices = company === 'all' ? DataStore.invoices : DataStore.invoices.filter(i => i.company === company);
        const total = invoices.reduce((s, i) => s + i.amount, 0);
        const collected = invoices.reduce((s, i) => s + i.paid, 0);

        return `
        <div class="card">
            <div class="card-header">
                <h3>Charge Invoices / Billing Statements</h3>
                <div class="card-actions">
                    <select class="form-control" style="width:140px" id="ccInvFilter" onchange="Construction.filterCCInvoices()">
                        <option value="all">All Statuses</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                    </select>
                    <button class="btn btn-primary" onclick="Construction.openNewChargeInvoice()">
                        <i class="fas fa-plus"></i> New Charge Invoice
                    </button>
                </div>
            </div>
            <div class="card-body no-padding" id="ccInvoiceTableContainer">
                ${this.buildCCInvoiceTable(invoices)}
            </div>
            <div class="card-footer">
                <span style="font-size:12px;color:var(--text-muted)">${invoices.length} invoice(s)</span>
                <div>
                    <span style="font-size:12px;margin-right:16px"><strong>Total Billed:</strong> ${Utils.formatCurrency(total)}</span>
                    <span style="font-size:12px"><strong>Collected:</strong> ${Utils.formatCurrency(collected)}</span>
                </div>
            </div>
        </div>`;
    },

    buildCCInvoiceTable(invoices) {
        if (!invoices.length) return '<div class="empty-state"><i class="fas fa-file-invoice"></i><h3>No Invoices</h3><p>Create a charge invoice to start billing clients.</p></div>';
        const now = new Date();
        const typeLabel = t => ({ 'charge': 'Charge Invoice', 'progress-billing': 'Progress Billing', 'sales': 'Sales Invoice', 'service': 'Service Invoice' }[t] || 'Invoice');

        return Utils.buildTable(
            [
                { label: 'Invoice #', render: r => `<span class="font-mono" style="font-weight:600">${r.id}</span>` },
                { label: 'Type', render: r => `<span class="badge-tag badge-neutral" style="font-size:11px">${typeLabel(r.type)}</span>` },
                { label: 'Client', render: r => {
                    const cust = DataStore.customers.find(c => c.id === r.customer);
                    return `<div><strong>${cust?.name || r.customer}</strong>${cust?.email ? `<div style="font-size:11px;color:var(--text-muted)">${cust.email}</div>` : ''}</div>`;
                }},
                { label: 'Project / Description', render: r => {
                    const proj = r.projectId ? DataStore.projects.find(p => p.id === r.projectId) : null;
                    return proj ? `<span style="font-size:12px">${proj.name}</span>` : `<span style="color:var(--text-muted);font-size:12px">${r.description || '—'}</span>`;
                }},
                { label: 'Amount',  render: r => `<strong>${Utils.formatCurrency(r.amount)}</strong>` },
                { label: 'Paid',    render: r => `<span class="text-success">${Utils.formatCurrency(r.paid)}</span>` },
                { label: 'Balance', render: r => {
                    const bal = r.amount - r.paid;
                    return bal > 0.01 ? `<strong class="text-danger">${Utils.formatCurrency(bal)}</strong>` : '<span class="text-success">₱0.00</span>';
                }},
                { label: 'Due Date', render: r => {
                    const over = (r.status !== 'paid') && new Date(r.dueDate) < now;
                    return `<span class="${over ? 'text-danger' : ''}">${Utils.formatDate(r.dueDate)}${over ? ' ⚠️' : ''}</span>`;
                }},
                { label: 'Status', render: r => `<span class="badge-tag ${Utils.getStatusClass(r.status)}">${r.status}</span>` }
            ],
            invoices,
            {
                actions: r => {
                    const bal = r.amount - r.paid;
                    return `
                    <button class="btn btn-sm btn-secondary" onclick="Construction.viewChargeInvoice('${r.id}')" title="View"><i class="fas fa-eye"></i></button>
                    ${bal > 0.01 ? `<button class="btn btn-sm btn-success" onclick="Construction.openRecordCollection('${r.id}')" title="Record Collection" style="margin-left:4px"><i class="fas fa-peso-sign"></i></button>` : ''}
                    <button class="btn btn-sm btn-secondary" onclick="Construction.printChargeInvoice('${r.id}')" title="Print" style="margin-left:4px"><i class="fas fa-print"></i></button>`;
                }
            }
        );
    },

    filterCCInvoices() {
        const status = document.getElementById('ccInvFilter')?.value || 'all';
        const company = App.activeCompany;
        let invoices = company === 'all' ? DataStore.invoices : DataStore.invoices.filter(i => i.company === company);
        const now = new Date();
        if (status === 'overdue') {
            invoices = invoices.filter(i => (i.status === 'unpaid' || i.status === 'partial') && new Date(i.dueDate) < now);
        } else if (status !== 'all') {
            invoices = invoices.filter(i => i.status === status);
        }
        document.getElementById('ccInvoiceTableContainer').innerHTML = this.buildCCInvoiceTable(invoices);
    },

    viewChargeInvoice(id) {
        const inv = DataStore.invoices.find(i => i.id === id);
        if (!inv) return;
        const cust = DataStore.customers.find(c => c.id === inv.customer);
        const co = DataStore.companies[inv.company];
        const project = inv.projectId ? DataStore.projects.find(p => p.id === inv.projectId) : null;
        const balance = inv.amount - inv.paid;
        const receipts = (DataStore.collectionReceipts || []).filter(r => r.invoiceId === id);
        const typeLabel = { 'charge': 'Charge Invoice', 'progress-billing': 'Progress Billing', 'sales': 'Sales Invoice', 'service': 'Service Invoice' };

        const html = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
            <div>
                <h3 style="font-size:20px;margin-bottom:4px">${inv.id}</h3>
                <p style="color:var(--text-secondary);margin:0;font-size:13px">${typeLabel[inv.type] || 'Invoice'}</p>
            </div>
            <span class="badge-tag ${Utils.getStatusClass(inv.status)}" style="font-size:14px;padding:6px 16px">${inv.status.toUpperCase()}</span>
        </div>

        <div class="grid-2 mb-3">
            <div class="card" style="padding:16px">
                <h4 style="font-size:11px;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase">FROM</h4>
                <div style="font-weight:600">${co?.name || inv.company}</div>
                <div style="font-size:12px;color:var(--text-secondary)">${co?.address || ''}</div>
                <div style="font-size:12px;color:var(--text-secondary)">TIN: ${co?.tin || ''}</div>
            </div>
            <div class="card" style="padding:16px">
                <h4 style="font-size:11px;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase">BILLED TO</h4>
                <div style="font-weight:600">${cust?.name || inv.customer}</div>
                <div style="font-size:12px;color:var(--text-secondary)">${cust?.address || ''}</div>
                <div style="font-size:12px;color:var(--text-secondary)">${cust?.email || ''}</div>
            </div>
        </div>

        <div class="grid-3 mb-3" style="font-size:13px;gap:8px">
            <div><strong>Issue Date:</strong> ${Utils.formatDate(inv.issueDate)}</div>
            <div><strong>Due Date:</strong> <span class="${balance > 0 && new Date(inv.dueDate) < new Date() ? 'text-danger' : ''}">${Utils.formatDate(inv.dueDate)}</span></div>
            <div><strong>Company:</strong> <span class="badge-tag badge-${inv.company}">${inv.company}</span></div>
        </div>
        ${project ? `<div style="margin-bottom:12px;padding:10px 14px;background:var(--bg);border-radius:var(--radius-sm);font-size:13px"><strong>Project:</strong> ${project.name}</div>` : ''}
        ${inv.billingPeriod ? `<div style="margin-bottom:12px;padding:10px 14px;background:var(--bg);border-radius:var(--radius-sm);font-size:13px"><strong>Billing Period:</strong> ${inv.billingPeriod}</div>` : ''}

        <table class="data-table">
            <thead><tr><th>Description / Scope of Work</th><th class="text-right">Amount</th></tr></thead>
            <tbody>
                <tr><td>${inv.description}</td><td class="text-right">${Utils.formatCurrency(inv.amount)}</td></tr>
                <tr><td><strong>Total Billed</strong></td><td class="text-right"><strong>${Utils.formatCurrency(inv.amount)}</strong></td></tr>
                <tr><td><span class="text-success">Total Collected</span></td><td class="text-right text-success">(${Utils.formatCurrency(inv.paid)})</td></tr>
                <tr style="background:var(--bg)">
                    <td><strong>Balance Due</strong></td>
                    <td class="text-right"><strong class="${balance > 0.01 ? 'text-danger' : 'text-success'}">${Utils.formatCurrency(balance)}</strong></td>
                </tr>
            </tbody>
        </table>

        ${receipts.length > 0 ? `
        <h4 style="margin:20px 0 10px"><i class="fas fa-receipt" style="margin-right:6px;color:var(--secondary)"></i>Collection History</h4>
        <table class="data-table" style="font-size:12px">
            <thead><tr><th>Receipt #</th><th>Date</th><th>Method</th><th>Reference</th><th class="text-right">Amount</th><th></th></tr></thead>
            <tbody>
                ${receipts.map(r => `<tr>
                    <td class="font-mono" style="font-weight:700;color:var(--secondary)">${r.id}</td>
                    <td>${Utils.formatDate(r.date)}</td>
                    <td><span class="badge-tag badge-${r.paymentMethod === 'cash' ? 'success' : 'info'}">${r.paymentMethod}</span></td>
                    <td>${r.referenceNo || '—'}</td>
                    <td class="text-right text-success">${Utils.formatCurrency(r.amount)}</td>
                    <td><button class="btn btn-sm btn-secondary" onclick="Construction.printCollectionReceipt('${r.id}')"><i class="fas fa-print"></i></button></td>
                </tr>`).join('')}
            </tbody>
        </table>` : ''}`;

        const footer = balance > 0.01 ? `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            <button class="btn btn-secondary" onclick="Construction.printChargeInvoice('${id}')"><i class="fas fa-print"></i> Print Invoice</button>
            <button class="btn btn-success" onclick="App.closeModal(); Construction.openRecordCollection('${id}')"><i class="fas fa-peso-sign"></i> Record Collection</button>
        ` : `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            <button class="btn btn-secondary" onclick="Construction.printChargeInvoice('${id}')"><i class="fas fa-print"></i> Print Invoice</button>
        `;

        App.openModal('Charge Invoice Details', html, footer, true);
    },

    openRecordCollection(invoiceId) {
        const inv = DataStore.invoices.find(i => i.id === invoiceId);
        if (!inv) return;
        const balance = inv.amount - inv.paid;
        const cust = DataStore.customers.find(c => c.id === inv.customer);

        const html = `
        <div style="background:var(--bg);padding:12px 16px;border-radius:var(--radius);margin-bottom:16px;font-size:13px">
            <div class="flex-between"><div><strong>Invoice:</strong> ${inv.id}</div><div><strong>Client:</strong> ${cust?.name || inv.customer}</div></div>
            <div style="margin-top:6px"><strong>Balance Due:</strong> <span class="text-danger" style="font-size:16px;font-weight:700">${Utils.formatCurrency(balance)}</span></div>
        </div>
        <form>
            <div class="form-row">
                <div class="form-group">
                    <label>Amount to Collect (₱) <span class="required">*</span></label>
                    <input type="number" class="form-control" id="crAmount" value="${balance.toFixed(2)}" min="0.01" step="0.01">
                </div>
                <div class="form-group">
                    <label>Date Received</label>
                    <input type="date" class="form-control" id="crDate" value="${new Date().toISOString().split('T')[0]}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Payment Method <span class="required">*</span></label>
                    <select class="form-control" id="crMethod" onchange="Construction.toggleCRRef(this.value)">
                        <option value="cash">Cash</option>
                        <option value="check">Check</option>
                        <option value="bank-transfer">Bank Transfer</option>
                        <option value="online">Online / GCash / PayMaya</option>
                    </select>
                </div>
                <div class="form-group" id="crRefGroup">
                    <label>Reference / Check No. (optional)</label>
                    <input type="text" class="form-control" id="crRef" placeholder="e.g., Check #00123">
                </div>
            </div>
            <div class="form-group">
                <label>Remarks</label>
                <input type="text" class="form-control" id="crNotes" placeholder="Optional notes">
            </div>
        </form>`;

        App.openModal('Record Collection Payment', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-success" onclick="Construction.saveCollectionReceipt('${invoiceId}')">
                <i class="fas fa-check"></i> Post & Generate Receipt
            </button>
        `);
    },

    toggleCRRef(method) {
        const label = document.querySelector('#crRefGroup label');
        const input = document.getElementById('crRef');
        if (!label || !input) return;
        const map = {
            cash: ['Reference No. (optional)', 'Optional'],
            check: ['Check Number *', 'e.g., Check #00123, Bank Name'],
            'bank-transfer': ['Bank Transfer Reference *', 'e.g., IBFT Ref No.'],
            online: ['Transaction Reference *', 'e.g., GCash Ref No.']
        };
        const [lbl, ph] = map[method] || map.cash;
        label.textContent = lbl;
        input.placeholder = ph;
    },

    saveCollectionReceipt(invoiceId) {
        const inv = DataStore.invoices.find(i => i.id === invoiceId);
        if (!inv) return;

        const amount  = parseFloat(document.getElementById('crAmount')?.value || 0);
        const balance = inv.amount - inv.paid;

        if (!amount || amount <= 0)       { App.showToast('Amount is required', 'error'); return; }
        if (amount > balance + 0.01)      { App.showToast(`Amount cannot exceed balance of ${Utils.formatCurrency(balance)}`, 'error'); return; }

        const method  = document.getElementById('crMethod')?.value || 'cash';
        const refNo   = document.getElementById('crRef')?.value || '';
        const date    = document.getElementById('crDate')?.value || new Date().toISOString().split('T')[0];
        const notes   = document.getElementById('crNotes')?.value || '';
        const cust    = DataStore.customers.find(c => c.id === inv.customer);

        if (!DataStore.collectionReceipts) DataStore.collectionReceipts = [];

        const receiptId = Utils.generateId('CR');
        DataStore.collectionReceipts.push({
            id: receiptId,
            company: inv.company,
            invoiceId: inv.id,
            customer: inv.customer,
            projectId: inv.projectId || '',
            amount,
            paymentMethod: method,
            referenceNo: refNo,
            date,
            notes,
            preparedBy: Auth.session?.username || 'system',
            postedAt: new Date().toISOString()
        });

        // Update invoice balances
        inv.paid += amount;
        if (inv.paid >= inv.amount - 0.01) { inv.paid = inv.amount; inv.status = 'paid'; }
        else { inv.status = 'partial'; }

        // Auto-create journal entry
        if (!DataStore.journalEntries) DataStore.journalEntries = [];
        const debitAcct = method === 'check' ? 'Cash and Cash Equivalents' : 'Cash and Cash Equivalents';
        DataStore.journalEntries.push({
            id: Utils.generateId('JE'), ref: receiptId,
            company: inv.company, date,
            description: `Collection – ${inv.id} from ${cust?.name || inv.customer} (${method})`,
            debits:  [{ account: debitAcct, amount }],
            credits: [{ account: 'Accounts Receivable', amount }]
        });

        Database.save();
        App.closeModal();
        App.showToast(`Receipt ${receiptId} posted — ${Utils.formatCurrency(amount)} collected`, 'success');

        setTimeout(() => {
            if (confirm(`Receipt ${receiptId} posted!\n\nWould you like to print the Collection Receipt?`)) {
                Construction.printCollectionReceipt(receiptId);
            }
        }, 300);

        this.renderCreditCollection(document.getElementById('contentArea'));
    },

    renderCollectionReceiptsTab() {
        const company = App.activeCompany;
        const receipts = (DataStore.collectionReceipts || [])
            .filter(r => company === 'all' || r.company === company)
            .sort((a, b) => (b.postedAt > a.postedAt ? 1 : -1));
        const totalCollected = receipts.reduce((s, r) => s + r.amount, 0);

        return `
        <div class="card">
            <div class="card-header">
                <h3>Collection Receipts (Official Receipts)</h3>
                <span style="font-size:13px;color:var(--text-secondary)">
                    Total Collected: <strong class="text-success">${Utils.formatCurrency(totalCollected)}</strong>
                </span>
            </div>
            <div class="card-body no-padding">
                ${!receipts.length
                    ? '<div class="empty-state" style="padding:40px"><i class="fas fa-receipt" style="font-size:32px;margin-bottom:12px"></i><h3>No Collection Receipts</h3><p>Receipts appear here after recording collections.</p></div>'
                    : Utils.buildTable(
                        [
                            { label: 'Receipt #',   render: r => `<span class="font-mono" style="font-weight:700;color:var(--secondary)">${r.id}</span>` },
                            { label: 'Date',        render: r => Utils.formatDate(r.date) },
                            { label: 'Invoice Ref', render: r => `<span class="font-mono">${r.invoiceId}</span>` },
                            { label: 'Client',      render: r => { const c = DataStore.customers.find(x => x.id === r.customer); return c?.name || r.customer; }},
                            { label: 'Project',     render: r => { const p = r.projectId ? DataStore.projects.find(x => x.id === r.projectId) : null; return p ? `<span style="font-size:12px">${p.name}</span>` : '<span style="color:var(--text-muted)">—</span>'; }},
                            { label: 'Method',      render: r => `<span class="badge-tag badge-${r.paymentMethod === 'cash' ? 'success' : r.paymentMethod === 'check' ? 'info' : 'neutral'}">${r.paymentMethod}</span>` },
                            { label: 'Reference',   render: r => r.referenceNo || '<span style="color:var(--text-muted)">—</span>' },
                            { label: 'Amount',      render: r => `<strong class="text-success">${Utils.formatCurrency(r.amount)}</strong>` }
                        ],
                        receipts,
                        { actions: r => `<button class="btn btn-sm btn-secondary" onclick="Construction.printCollectionReceipt('${r.id}')" title="Print"><i class="fas fa-print"></i></button>` }
                    )
                }
            </div>
        </div>`;
    },

    renderAgingReport() {
        const company = App.activeCompany;
        const invoices = (company === 'all' ? DataStore.invoices : DataStore.invoices.filter(i => i.company === company))
            .filter(i => i.status === 'unpaid' || i.status === 'partial');

        const now = new Date();
        const buckets = { current: [], d30: [], d60: [], d90: [], d120: [] };

        invoices.forEach(inv => {
            const balance = inv.amount - inv.paid;
            if (balance <= 0.01) return;
            const daysPast = Math.floor((now - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
            if (daysPast <= 0)        buckets.current.push({ inv, balance, daysPast: 0 });
            else if (daysPast <= 30)  buckets.d30.push({ inv, balance, daysPast });
            else if (daysPast <= 60)  buckets.d60.push({ inv, balance, daysPast });
            else if (daysPast <= 90)  buckets.d90.push({ inv, balance, daysPast });
            else                      buckets.d120.push({ inv, balance, daysPast });
        });

        const renderBucket = (items, label, badgeCls) => {
            const total = items.reduce((s, r) => s + r.balance, 0);
            const isDanger = badgeCls.includes('danger');
            return `
            <div class="card mb-2">
                <div class="card-header">
                    <div style="display:flex;align-items:center;gap:12px">
                        <span class="badge-tag ${badgeCls}">${label}</span>
                        <span style="font-size:12px;color:var(--text-secondary)">${items.length} invoice(s)</span>
                    </div>
                    <strong class="${isDanger ? 'text-danger' : 'text-success'}">${Utils.formatCurrency(total)}</strong>
                </div>
                ${items.length ? `
                <div class="card-body no-padding">
                    <table class="data-table" style="font-size:12px">
                        <thead><tr><th>Invoice #</th><th>Client</th><th>Due Date</th><th>Days Past Due</th><th class="text-right">Balance</th><th></th></tr></thead>
                        <tbody>
                            ${items.map(({ inv, balance, daysPast }) => {
                                const cust = DataStore.customers.find(c => c.id === inv.customer);
                                return `<tr>
                                    <td class="font-mono">${inv.id}</td>
                                    <td>${cust?.name || inv.customer}</td>
                                    <td>${Utils.formatDate(inv.dueDate)}</td>
                                    <td>${daysPast > 0 ? `<span class="text-danger font-bold">${daysPast}d</span>` : '<span class="text-success">Current</span>'}</td>
                                    <td class="text-right"><strong class="${isDanger ? 'text-danger' : ''}">${Utils.formatCurrency(balance)}</strong></td>
                                    <td><button class="btn btn-sm btn-success" onclick="Construction.openRecordCollection('${inv.id}')" title="Collect"><i class="fas fa-peso-sign"></i></button></td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>` : ''}
            </div>`;
        };

        const grandTotal = Object.values(buckets).flat().reduce((s, r) => s + r.balance, 0);
        const summary = [
            { label: 'Current',    amount: buckets.current.reduce((s,r)=>s+r.balance,0), color: 'var(--success)' },
            { label: '1-30 Days',  amount: buckets.d30.reduce((s,r)=>s+r.balance,0),     color: 'var(--warning)' },
            { label: '31-60 Days', amount: buckets.d60.reduce((s,r)=>s+r.balance,0),     color: '#f97316' },
            { label: '61-90 Days', amount: buckets.d90.reduce((s,r)=>s+r.balance,0),     color: 'var(--danger)' },
            { label: '91+ Days',   amount: buckets.d120.reduce((s,r)=>s+r.balance,0),    color: '#7f1d1d' }
        ];

        return `
        <div class="section-header mb-3">
            <h3>Accounts Receivable Aging Report</h3>
            <span style="font-size:13px;color:var(--text-secondary)">Total Outstanding: <strong class="text-danger">${Utils.formatCurrency(grandTotal)}</strong></span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px">
            ${summary.map(b => `
            <div class="stat-card" style="border-top:3px solid ${b.color}">
                <div class="stat-value" style="font-size:16px;color:${b.color}">${Utils.formatCurrency(b.amount, true)}</div>
                <div class="stat-label">${b.label}</div>
            </div>`).join('')}
        </div>

        ${renderBucket(buckets.current, 'Current (Not Yet Due)', 'badge-success')}
        ${renderBucket(buckets.d30,    '1–30 Days Overdue',    'badge-warning')}
        ${renderBucket(buckets.d60,    '31–60 Days Overdue',   'badge-warning')}
        ${renderBucket(buckets.d90,    '61–90 Days Overdue',   'badge-danger')}
        ${renderBucket(buckets.d120,   '91+ Days Overdue',     'badge-danger')}

        ${!invoices.length ? '<div class="empty-state"><i class="fas fa-check-circle" style="color:var(--success);font-size:36px"></i><h3>All Clear</h3><p>No outstanding receivable balances.</p></div>' : ''}`;
    },

    openNewChargeInvoice() {
        const company = App.activeCompany;
        const projects = company === 'all' ? DataStore.projects : DataStore.projects.filter(p => p.company === company);

        const html = `
        <form>
            <div class="form-row">
                <div class="form-group">
                    <label>Company <span class="required">*</span></label>
                    <select class="form-control" id="ccInvCompany">
                        <option value="dheekay" ${company === 'dheekay' ? 'selected' : ''}>Dheekay Builders OPC</option>
                        <option value="kdchavit" ${company === 'kdchavit' ? 'selected' : ''}>KDChavit Construction</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Invoice Type</label>
                    <select class="form-control" id="ccInvType">
                        <option value="charge">Charge Invoice</option>
                        <option value="progress-billing">Progress Billing</option>
                        <option value="sales">Sales Invoice</option>
                        <option value="service">Service Invoice</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Client <span class="required">*</span></label>
                    <select class="form-control" id="ccInvCustomer">
                        <option value="">— Select Client —</option>
                        ${DataStore.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Linked Project</label>
                    <select class="form-control" id="ccInvProject">
                        <option value="">— No Project Link —</option>
                        ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Description / Scope of Work <span class="required">*</span></label>
                <textarea class="form-control" id="ccInvDesc" rows="2" placeholder="e.g., Progress Billing #4 — Foundation Work"></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Amount (₱) <span class="required">*</span></label>
                    <input type="number" class="form-control" id="ccInvAmount" min="0" step="0.01" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>Billing Period (optional)</label>
                    <input type="text" class="form-control" id="ccInvPeriod" placeholder="e.g., Jan 1 – Mar 31, 2026">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Issue Date</label>
                    <input type="date" class="form-control" id="ccInvIssue" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>Due Date</label>
                    <input type="date" class="form-control" id="ccInvDue" value="${new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}">
                </div>
            </div>
        </form>`;

        App.openModal('New Charge Invoice', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Construction.saveChargeInvoice()"><i class="fas fa-save"></i> Create Invoice</button>
        `);
    },

    saveChargeInvoice() {
        const amount   = parseFloat(document.getElementById('ccInvAmount')?.value || 0);
        const customer = document.getElementById('ccInvCustomer')?.value;
        const desc     = document.getElementById('ccInvDesc')?.value?.trim();

        if (!customer) { App.showToast('Please select a client', 'error'); return; }
        if (!amount || amount <= 0) { App.showToast('Amount is required', 'error'); return; }
        if (!desc) { App.showToast('Description is required', 'error'); return; }

        const newInv = {
            id: Utils.generateId('CI'),
            company:       document.getElementById('ccInvCompany')?.value || 'dheekay',
            type:          document.getElementById('ccInvType')?.value || 'charge',
            customer,
            projectId:     document.getElementById('ccInvProject')?.value || '',
            description:   desc,
            billingPeriod: document.getElementById('ccInvPeriod')?.value || '',
            amount,
            paid:          0,
            status:        'unpaid',
            issueDate:     document.getElementById('ccInvIssue')?.value || new Date().toISOString().split('T')[0],
            dueDate:       document.getElementById('ccInvDue')?.value || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
        };

        DataStore.invoices.push(newInv);
        Database.save();
        App.closeModal();
        App.showToast(`${newInv.id} created — ${Utils.formatCurrency(amount)}`, 'success');
        this.renderCreditCollection(document.getElementById('contentArea'));
    },

    printChargeInvoice(id) {
        const inv = DataStore.invoices.find(i => i.id === id);
        if (!inv) return;
        const cust    = DataStore.customers.find(c => c.id === inv.customer);
        const co      = DataStore.companies[inv.company];
        const project = inv.projectId ? DataStore.projects.find(p => p.id === inv.projectId) : null;
        const balance = inv.amount - inv.paid;
        const typeMap = { charge: 'CHARGE INVOICE', 'progress-billing': 'PROGRESS BILLING', sales: 'SALES INVOICE', service: 'SERVICE INVOICE' };

        const win = window.open('', '_blank', 'width=820,height=700');
        win.document.write(`<!DOCTYPE html><html><head><title>${inv.id}</title><style>
body{font-family:Arial,sans-serif;padding:36px;font-size:13px;color:#111;max-width:760px;margin:0 auto}
h1{margin:0;font-size:20px}h2{margin:0;font-size:15px}
table{width:100%;border-collapse:collapse;margin:14px 0}
th{background:#f4f4f4;padding:8px 12px;text-align:left;border-bottom:2px solid #ccc;font-size:12px}
td{padding:8px 12px;border-bottom:1px solid #eee}
.tr{text-align:right}.lbl{font-size:10px;color:#999;text-transform:uppercase;margin-bottom:3px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.total-row{background:#f4f4f4;font-weight:700}
.box{border:1px solid #ddd;padding:14px;border-radius:6px}
@media print{body{padding:16px}}</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2c3e50;padding-bottom:16px;margin-bottom:20px">
  <div><h1 style="color:#2c3e50">${co?.name || inv.company}</h1>
    <div style="color:#666;font-size:12px">${co?.address || ''}</div>
    <div style="color:#666;font-size:12px">TIN: ${co?.tin || ''}</div></div>
  <div style="text-align:right">
    <h2 style="color:#2c3e50;font-size:18px;font-weight:700">${typeMap[inv.type] || 'INVOICE'}</h2>
    <div style="font-size:22px;font-weight:700;color:#2c3e50">${inv.id}</div>
    <div style="font-size:13px;margin-top:6px;color:${inv.status === 'paid' ? '#16a085' : inv.status === 'partial' ? '#f39c12' : '#e74c3c'};font-weight:700;text-transform:uppercase;border:1px solid currentColor;display:inline-block;padding:2px 12px;border-radius:4px">${inv.status}</div>
  </div>
</div>
<div class="g2" style="margin-bottom:20px">
  <div class="box"><div class="lbl">Billed To</div>
    <div style="font-weight:600">${cust?.name || inv.customer}</div>
    <div style="color:#666">${cust?.address || ''}</div>
    <div style="color:#666">${cust?.email || ''}</div>
    ${cust?.contactPerson ? `<div style="color:#666">Attn: ${cust.contactPerson}</div>` : ''}
  </div>
  <div style="text-align:right">
    <div class="lbl">Invoice Date</div><div>${new Date(inv.issueDate).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}</div>
    <div class="lbl" style="margin-top:8px">Due Date</div><div style="color:#e74c3c;font-weight:700">${new Date(inv.dueDate).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}</div>
    ${project ? `<div class="lbl" style="margin-top:8px">Project</div><div>${project.name}</div>` : ''}
    ${inv.billingPeriod ? `<div class="lbl" style="margin-top:8px">Billing Period</div><div>${inv.billingPeriod}</div>` : ''}
  </div>
</div>
<table>
  <thead><tr><th>Description / Scope of Work</th><th class="tr">Amount (₱)</th></tr></thead>
  <tbody>
    <tr><td>${inv.description}</td><td class="tr">${Utils.formatCurrency(inv.amount)}</td></tr>
    <tr class="total-row"><td>TOTAL AMOUNT</td><td class="tr">${Utils.formatCurrency(inv.amount)}</td></tr>
    ${inv.paid > 0 ? `<tr><td style="color:#16a085">Less: Collections Received</td><td class="tr" style="color:#16a085">(${Utils.formatCurrency(inv.paid)})</td></tr>` : ''}
    <tr class="total-row"><td style="color:${balance > 0 ? '#e74c3c' : '#16a085'}">BALANCE DUE</td><td class="tr" style="color:${balance > 0 ? '#e74c3c' : '#16a085'}">${balance > 0 ? Utils.formatCurrency(balance) : 'FULLY PAID'}</td></tr>
  </tbody>
</table>
<div style="margin-top:40px;display:flex;justify-content:space-between">
  <div style="text-align:center;width:200px"><div style="border-top:1px solid #000;margin-top:40px;padding-top:4px;font-size:11px">Prepared by</div></div>
  <div style="text-align:center;width:200px"><div style="border-top:1px solid #000;margin-top:40px;padding-top:4px;font-size:11px">Received by</div></div>
  <div style="text-align:center;width:200px"><div style="border-top:1px solid #000;margin-top:40px;padding-top:4px;font-size:11px">Date Received</div></div>
</div>
<div style="margin-top:24px;font-size:10px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:12px">
  Please remit to: ${co?.name || ''} | ${co?.email || ''} | System-generated document.
</div></body></html>`);
        win.document.close();
        win.print();
    },

    printCollectionReceipt(receiptId) {
        const receipt = (DataStore.collectionReceipts || []).find(r => r.id === receiptId);
        if (!receipt) { App.showToast('Receipt not found', 'error'); return; }
        const inv     = DataStore.invoices.find(i => i.id === receipt.invoiceId);
        const cust    = DataStore.customers.find(c => c.id === receipt.customer);
        const co      = DataStore.companies[receipt.company];
        const project = receipt.projectId ? DataStore.projects.find(p => p.id === receipt.projectId) : null;

        const win = window.open('', '_blank', 'width=600,height=520');
        win.document.write(`<!DOCTYPE html><html><head><title>Receipt ${receipt.id}</title><style>
body{font-family:Arial,sans-serif;padding:32px;font-size:13px;max-width:480px;margin:0 auto}
h2{margin:0;font-size:18px;text-align:center}
.center{text-align:center}.gray{color:#888;font-size:11px}
table{width:100%;border-collapse:collapse;margin:10px 0}
td{padding:6px 0;vertical-align:top}
td.lbl{color:#666;font-size:11px;width:140px;text-transform:uppercase}
.dash{border-top:1px dashed #ccc;margin:12px 0}
.amount-box{background:#f0f9f0;border:2px solid #16a085;padding:14px;text-align:center;border-radius:8px;margin:16px 0}
@media print{body{padding:10px}}</style></head><body>
<div class="center gray" style="margin-bottom:4px">OFFICIAL COLLECTION RECEIPT</div>
<h2>${co?.name || receipt.company}</h2>
<div class="center gray">${co?.address || ''}</div>
<div class="dash"></div>
<table>
  <tr><td class="lbl">OR No.</td><td><strong>${receipt.id}</strong></td></tr>
  <tr><td class="lbl">Date</td><td>${new Date(receipt.date).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}</td></tr>
  <tr><td class="lbl">Received From</td><td><strong>${cust?.name || receipt.customer}</strong></td></tr>
  <tr><td class="lbl">Invoice Ref.</td><td>${receipt.invoiceId}</td></tr>
  ${project ? `<tr><td class="lbl">Project</td><td>${project.name}</td></tr>` : ''}
  ${inv ? `<tr><td class="lbl">For</td><td>${inv.description}</td></tr>` : ''}
  <tr><td class="lbl">Payment Mode</td><td>${receipt.paymentMethod.toUpperCase()}</td></tr>
  ${receipt.referenceNo ? `<tr><td class="lbl">Reference</td><td>${receipt.referenceNo}</td></tr>` : ''}
  ${receipt.notes ? `<tr><td class="lbl">Remarks</td><td>${receipt.notes}</td></tr>` : ''}
</table>
<div class="amount-box">
  <div class="gray" style="margin-bottom:4px">AMOUNT RECEIVED</div>
  <div style="font-size:28px;font-weight:700;color:#16a085">${Utils.formatCurrency(receipt.amount)}</div>
</div>
<div class="dash"></div>
<div style="display:flex;justify-content:space-between;margin-top:30px">
  <div class="center" style="width:160px"><div style="border-top:1px solid #000;margin-top:30px;padding-top:4px;font-size:10px">Issued by</div></div>
  <div class="center" style="width:160px"><div style="border-top:1px solid #000;margin-top:30px;padding-top:4px;font-size:10px">Received by</div></div>
</div>
<div class="center gray" style="margin-top:16px">This is a system-generated receipt. Keep for your records.</div>
</body></html>`);
        win.document.close();
        win.print();
    }
};
