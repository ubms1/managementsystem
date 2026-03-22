/* ========================================
   UBMS - ISO Compliance Module
   ISO 9001 / 14001 / 45001 / OHSAS
   Document Control, Audits, NCR, CPAR
   ======================================== */

const ISO = {
    activeTab: 'overview',

    getApplicableStandards() {
        const co = DataStore.companies[App.activeCompany];
        const type = co ? co.type : 'construction';
        if (type === 'wellness') {
            return [
                { code: 'ISO 9001:2015', title: 'Quality Management System', scope: 'Spa & Wellness Service Delivery', color: '#27ae60', icon: 'fa-medal' },
                { code: 'ISO 45001:2018', title: 'Occupational Health & Safety', scope: 'Therapist & Staff Safety', color: '#e74c3c', icon: 'fa-hard-hat' }
            ];
        }
        if (type === 'automotive') {
            return [
                { code: 'ISO 9001:2015', title: 'Quality Management System', scope: 'Automotive Service & Parts Operations', color: '#27ae60', icon: 'fa-medal' },
                { code: 'IATF 16949:2016', title: 'Automotive QMS Standard', scope: 'Workshop Operations & Service Quality', color: '#8e44ad', icon: 'fa-car-side' },
                { code: 'ISO 45001:2018', title: 'Occupational Health & Safety', scope: 'Workshop & Technician Safety', color: '#e74c3c', icon: 'fa-hard-hat' }
            ];
        }
        return [
            { code: 'ISO 9001:2015', title: 'Quality Management System', scope: 'Design, Procurement & Construction Services', color: '#27ae60', icon: 'fa-medal' },
            { code: 'ISO 14001:2015', title: 'Environmental Management System', scope: 'Construction Site Environmental Compliance', color: '#2980b9', icon: 'fa-leaf' },
            { code: 'ISO 45001:2018', title: 'Occupational Health & Safety', scope: 'Site Safety & Worker Well-being', color: '#e74c3c', icon: 'fa-hard-hat' }
        ];
    },

    render(container) {
        const docs = this.getFilteredDocs();
        const ncrs = this.getFilteredNCRs();
        const audits = this.getFilteredAudits();
        const cpars = this.getFilteredCPARs();
        const openNCRs = ncrs.filter(n => n.status !== 'closed').length;
        const overdueCPARs = cpars.filter(c => c.status !== 'closed' && new Date(c.dueDate) < new Date()).length;
        const upcomingAudits = audits.filter(a => a.status === 'scheduled').length;
        const standards = this.getApplicableStandards();

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon teal"><i class="fas fa-file-alt"></i></div></div>
                <div class="stat-value">${docs.length}</div>
                <div class="stat-label">Controlled Documents</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon ${openNCRs > 0 ? 'red' : 'green'}"><i class="fas fa-exclamation-triangle"></i></div></div>
                <div class="stat-value">${openNCRs}</div>
                <div class="stat-label">Open NCRs</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon orange"><i class="fas fa-clipboard-list"></i></div></div>
                <div class="stat-value">${upcomingAudits}</div>
                <div class="stat-label">Scheduled Audits</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon ${overdueCPARs > 0 ? 'red' : 'green'}"><i class="fas fa-tasks"></i></div></div>
                <div class="stat-value">${overdueCPARs}</div>
                <div class="stat-label">Overdue CPARs</div>
            </div>
        </div>

        <!-- Standards Overview Cards -->
        <div class="grid-${standards.length} mb-3">
            ${standards.map(s => `
            <div class="card" style="border-top:3px solid ${s.color}">
                <div class="card-body" style="text-align:center;padding:20px 16px">
                    <div style="width:48px;height:48px;background:${s.color}20;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
                        <i class="fas ${s.icon}" style="color:${s.color};font-size:20px"></i>
                    </div>
                    <div style="font-weight:700;font-size:13px;margin-bottom:4px">${s.code}</div>
                    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">${s.title}</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">${s.scope}</div>
                    <span class="badge-tag" style="background:#f59e0b20;color:#f59e0b"><i class="fas fa-spinner fa-spin" style="font-size:9px;margin-right:4px"></i>On-Process</span>
                </div>
            </div>`).join('')}
        </div>

        <!-- Tab Navigation -->
        <div class="tab-nav">
            <button class="tab-btn ${this.activeTab === 'documents' ? 'active' : ''}" onclick="ISO.switchTab('documents', this)"><i class="fas fa-file-alt"></i> Documents</button>
            <button class="tab-btn ${this.activeTab === 'audits' ? 'active' : ''}" onclick="ISO.switchTab('audits', this)"><i class="fas fa-clipboard-check"></i> Audits</button>
            <button class="tab-btn ${this.activeTab === 'ncr' ? 'active' : ''}" onclick="ISO.switchTab('ncr', this)"><i class="fas fa-exclamation-circle"></i> NCR</button>
            <button class="tab-btn ${this.activeTab === 'cpar' ? 'active' : ''}" onclick="ISO.switchTab('cpar', this)"><i class="fas fa-tasks"></i> CPAR</button>
            <button class="tab-btn ${this.activeTab === 'kpi' ? 'active' : ''}" onclick="ISO.switchTab('kpi', this)"><i class="fas fa-chart-bar"></i> KPIs</button>
        </div>

        <div id="isoTabContent">
            ${this.renderTabContent(this.activeTab)}
        </div>`;
    },

    switchTab(tab, btn) {
        this.activeTab = tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        const content = document.getElementById('isoTabContent');
        if (content) content.innerHTML = this.renderTabContent(tab);
    },

    renderTabContent(tab) {
        switch (tab) {
            case 'documents': return this.renderDocumentsTab();
            case 'audits': return this.renderAuditsTab();
            case 'ncr': return this.renderNCRTab();
            case 'cpar': return this.renderCPARTab();
            case 'kpi': return this.renderKPITab();
            default: return this.renderDocumentsTab();
        }
    },

    getFilteredDocs() {
        return (DataStore.isoDocuments || []).filter(d =>
            App.activeCompany === 'all' || d.company === App.activeCompany
        );
    },
    getFilteredNCRs() {
        return (DataStore.isoNcrs || []).filter(n =>
            App.activeCompany === 'all' || n.company === App.activeCompany
        );
    },
    getFilteredAudits() {
        return (DataStore.isoAudits || []).filter(a =>
            App.activeCompany === 'all' || a.company === App.activeCompany
        );
    },
    getFilteredCPARs() {
        return (DataStore.isoCpars || []).filter(c =>
            App.activeCompany === 'all' || c.company === App.activeCompany
        );
    },

    // ---- DOCUMENTS TAB ----
    renderDocumentsTab() {
        const docs = this.getFilteredDocs();
        const docTypes = ['Quality Manual', 'Procedure', 'Work Instruction', 'Form', 'External Document', 'Record'];

        return `
        <div class="card">
            <div class="card-header">
                <h3>Document Control Register</h3>
                <div class="card-actions">
                    <input type="text" class="form-control" placeholder="Search documents..." id="docSearch" oninput="ISO.searchDocs()" style="width:200px">
                    <button class="btn btn-primary" onclick="ISO.openNewDocument()"><i class="fas fa-plus"></i> New Document</button>
                </div>
            </div>
            <div class="card-body no-padding" id="docTableBody">
                ${this.renderDocTable(docs)}
            </div>
        </div>`;
    },

    renderDocTable(docs) {
        if (!docs.length) return `<div style="padding:40px;text-align:center;color:var(--text-muted)"><i class="fas fa-file-alt fa-2x" style="margin-bottom:12px;display:block"></i>No documents registered. Click "New Document" to add one.</div>`;
        return Utils.buildTable(
            [
                { label: 'Doc No.', render: d => `<span class="font-mono" style="font-weight:600">${d.docNo}</span>` },
                { label: 'Title', render: d => `<span style="font-weight:500">${d.title}</span>` },
                { label: 'Type', render: d => `<span class="badge-tag badge-neutral">${d.type}</span>` },
                { label: 'Standard', render: d => `<span class="badge-tag" style="background:#e8f5e9;color:#2e7d32">${d.standard}</span>` },
                { label: 'Rev.', render: d => `<span class="font-mono">${d.revision}</span>` },
                { label: 'Effective Date', render: d => Utils.formatDate(d.effectiveDate) },
                { label: 'Owner', key: 'owner' },
                { label: 'Status', render: d => `<span class="badge-tag ${d.status === 'active' ? 'badge-success' : d.status === 'draft' ? 'badge-warning' : 'badge-danger'}">${d.status}</span>` }
            ],
            docs,
            {
                actions: d => `
                    <button class="btn btn-sm btn-secondary" onclick="ISO.viewDocument('${d.id}')" title="View"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-secondary" onclick="ISO.printDocument('${d.id}')" title="Print"><i class="fas fa-print"></i></button>
                `
            }
        );
    },

    searchDocs() {
        const q = document.getElementById('docSearch')?.value?.toLowerCase() || '';
        const docs = this.getFilteredDocs().filter(d =>
            d.title.toLowerCase().includes(q) || d.docNo.toLowerCase().includes(q) || d.type.toLowerCase().includes(q)
        );
        document.getElementById('docTableBody').innerHTML = this.renderDocTable(docs);
    },

    openNewDocument() {
        const standards = this.getApplicableStandards().map(s => s.code);
        const html = `
        <form>
            <div class="form-row">
                <div class="form-group">
                    <label>Document Number <span class="required">*</span></label>
                    <input type="text" class="form-control" id="docNo" placeholder="e.g. QM-001">
                </div>
                <div class="form-group">
                    <label>Document Type <span class="required">*</span></label>
                    <select class="form-control" id="docType">
                        <option>Quality Manual</option><option>Procedure</option><option>Work Instruction</option>
                        <option>Form</option><option>External Document</option><option>Record</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Title <span class="required">*</span></label>
                <input type="text" class="form-control" id="docTitle" placeholder="Document title...">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ISO Standard</label>
                    <select class="form-control" id="docStandard">
                        ${standards.map(s => `<option>${s}</option>`).join('')}
                        <option>General</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Revision</label>
                    <input type="text" class="form-control" id="docRevision" value="Rev. 0">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Effective Date</label>
                    <input type="date" class="form-control" id="docEffective" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>Review Date</label>
                    <input type="date" class="form-control" id="docReview">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Document Owner / Author</label>
                    <input type="text" class="form-control" id="docOwner" placeholder="Name or department">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select class="form-control" id="docStatus">
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="obsolete">Obsolete</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Scope / Description</label>
                <textarea class="form-control" id="docScope" rows="2" placeholder="Brief scope or description..."></textarea>
            </div>
        </form>`;

        App.openModal('New Controlled Document', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="ISO.saveDocument()"><i class="fas fa-save"></i> Register Document</button>
        `);
    },

    saveDocument() {
        const docNo = document.getElementById('docNo')?.value?.trim();
        const title = document.getElementById('docTitle')?.value?.trim();
        if (!docNo || !title) { App.showToast('Document number and title are required', 'error'); return; }

        if (!DataStore.isoDocuments) DataStore.isoDocuments = [];
        DataStore.isoDocuments.push({
            id: Utils.generateId('DOC'),
            docNo,
            title,
            type: document.getElementById('docType').value,
            standard: document.getElementById('docStandard').value,
            revision: document.getElementById('docRevision').value,
            effectiveDate: document.getElementById('docEffective').value,
            reviewDate: document.getElementById('docReview').value,
            owner: document.getElementById('docOwner').value,
            status: document.getElementById('docStatus').value,
            scope: document.getElementById('docScope').value,
            company: App.activeCompany,
            createdAt: new Date().toISOString()
        });

        Database.save();
        App.closeModal();
        App.showToast(`Document ${docNo} registered successfully`, 'success');
        document.getElementById('isoTabContent').innerHTML = this.renderDocumentsTab();
    },

    viewDocument(id) {
        const doc = (DataStore.isoDocuments || []).find(d => d.id === id);
        if (!doc) return;
        const html = `
        <div class="grid-2 mb-3">
            <div><label style="font-size:11px;color:var(--text-muted)">DOCUMENT NUMBER</label><div style="font-weight:700;font-size:16px">${doc.docNo}</div></div>
            <div><label style="font-size:11px;color:var(--text-muted)">STATUS</label><div><span class="badge-tag ${doc.status === 'active' ? 'badge-success' : doc.status === 'draft' ? 'badge-warning' : 'badge-danger'}" style="font-size:14px">${doc.status.toUpperCase()}</span></div></div>
        </div>
        <div style="margin-bottom:12px"><strong>${doc.title}</strong></div>
        <div class="grid-3" style="gap:12px;font-size:13px">
            <div><label style="font-size:11px;color:var(--text-muted);display:block">TYPE</label>${doc.type}</div>
            <div><label style="font-size:11px;color:var(--text-muted);display:block">STANDARD</label>${doc.standard}</div>
            <div><label style="font-size:11px;color:var(--text-muted);display:block">REVISION</label>${doc.revision}</div>
            <div><label style="font-size:11px;color:var(--text-muted);display:block">OWNER</label>${doc.owner || '—'}</div>
            <div><label style="font-size:11px;color:var(--text-muted);display:block">EFFECTIVE DATE</label>${Utils.formatDate(doc.effectiveDate)}</div>
            <div><label style="font-size:11px;color:var(--text-muted);display:block">REVIEW DATE</label>${Utils.formatDate(doc.reviewDate) || '—'}</div>
        </div>
        ${doc.scope ? `<div style="margin-top:12px;padding:12px;background:var(--bg);border-radius:var(--radius);font-size:13px"><strong>Scope:</strong> ${doc.scope}</div>` : ''}`;

        App.openModal('Document Details', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            <button class="btn btn-primary" onclick="ISO.printDocument('${id}')"><i class="fas fa-print"></i> Print</button>
        `);
    },

    printDocument(id) {
        const doc = (DataStore.isoDocuments || []).find(d => d.id === id);
        if (!doc) return;
        const co = DataStore.companies[doc.company || App.activeCompany];
        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(`<!DOCTYPE html><html><head><title>${doc.docNo} - ${doc.title}</title>
        <style>body{font-family:Arial,sans-serif;padding:40px;font-size:12px} .header{display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:16px;margin-bottom:24px} table{width:100%;border-collapse:collapse} td,th{border:1px solid #999;padding:8px} th{background:#eee} .footer{margin-top:60px;display:flex;justify-content:space-between}</style>
        </head><body>
        <div class="header">
            <div><h2 style="margin:0">${co?.name || ''}</h2><p style="margin:4px 0;font-size:11px">${co?.address || ''}</p></div>
            <div style="text-align:right"><strong>${doc.standard}</strong><br><span style="font-size:11px">Document Control</span></div>
        </div>
        <table><tr><th colspan="4" style="font-size:15px;text-align:center">${doc.title}</th></tr>
        <tr><td><strong>Doc No.:</strong> ${doc.docNo}</td><td><strong>Revision:</strong> ${doc.revision}</td><td><strong>Type:</strong> ${doc.type}</td><td><strong>Status:</strong> ${doc.status}</td></tr>
        <tr><td><strong>Owner:</strong> ${doc.owner || '—'}</td><td><strong>Effective Date:</strong> ${Utils.formatDate(doc.effectiveDate)}</td><td><strong>Review Date:</strong> ${Utils.formatDate(doc.reviewDate) || '—'}</td><td><strong>Standard:</strong> ${doc.standard}</td></tr>
        ${doc.scope ? `<tr><td colspan="4"><strong>Scope:</strong> ${doc.scope}</td></tr>` : ''}</table>
        <div style="margin-top:40px;min-height:200px;border:1px solid #ccc;padding:16px"><p style="color:#999;font-size:11px">Document Content (attach or type here)</p></div>
        <div class="footer">
            <div style="text-align:center"><div style="border-top:1px solid #000;width:150px;margin:0 auto">Prepared by</div></div>
            <div style="text-align:center"><div style="border-top:1px solid #000;width:150px;margin:0 auto">Reviewed by</div></div>
            <div style="text-align:center"><div style="border-top:1px solid #000;width:150px;margin:0 auto">Approved by</div></div>
        </div>
        </body></html>`);
        win.document.close();
        win.print();
    },

    // ---- AUDITS TAB ----
    renderAuditsTab() {
        const audits = this.getFilteredAudits();
        const standards = this.getApplicableStandards();

        return `
        <div class="card">
            <div class="card-header">
                <h3>Internal Audit Schedule & Results</h3>
                <button class="btn btn-primary" onclick="ISO.openScheduleAudit()"><i class="fas fa-plus"></i> Schedule Audit</button>
            </div>
            <div class="card-body no-padding">
                ${audits.length ? Utils.buildTable(
                    [
                        { label: 'Audit No.', render: a => `<span class="font-mono">${a.auditNo}</span>` },
                        { label: 'Standard', render: a => `<span class="badge-tag" style="background:#e8f5e9;color:#2e7d32">${a.standard}</span>` },
                        { label: 'Scope', key: 'scope' },
                        { label: 'Lead Auditor', key: 'auditor' },
                        { label: 'Audit Date', render: a => Utils.formatDate(a.auditDate) },
                        { label: 'NCRs Found', render: a => a.ncrsFound > 0 ? `<span class="text-danger font-mono">${a.ncrsFound}</span>` : `<span class="text-success">0</span>` },
                        { label: 'Status', render: a => `<span class="badge-tag ${a.status === 'completed' ? 'badge-success' : a.status === 'scheduled' ? 'badge-warning' : 'badge-neutral'}">${a.status}</span>` }
                    ],
                    audits,
                    { actions: a => `<button class="btn btn-sm btn-secondary" onclick="ISO.viewAudit('${a.id}')"><i class="fas fa-eye"></i></button>` }
                ) : `<div style="padding:40px;text-align:center;color:var(--text-muted)"><i class="fas fa-clipboard-check fa-2x" style="margin-bottom:12px;display:block"></i>No audits scheduled yet.</div>`}
            </div>
        </div>`;
    },

    openScheduleAudit() {
        const standards = this.getApplicableStandards().map(s => s.code);
        const html = `
        <form>
            <div class="form-row">
                <div class="form-group">
                    <label>Audit Number <span class="required">*</span></label>
                    <input type="text" class="form-control" id="auditNo" placeholder="e.g. IA-2025-001">
                </div>
                <div class="form-group">
                    <label>ISO Standard <span class="required">*</span></label>
                    <select class="form-control" id="auditStandard">
                        ${standards.map(s => `<option>${s}</option>`).join('')}
                        <option>All Standards</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Audit Scope <span class="required">*</span></label>
                <input type="text" class="form-control" id="auditScope" placeholder="e.g. Production, QC, Procurement">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Lead Auditor</label>
                    <input type="text" class="form-control" id="auditLead" placeholder="Auditor name">
                </div>
                <div class="form-group">
                    <label>Audit Date <span class="required">*</span></label>
                    <input type="date" class="form-control" id="auditDate" value="${new Date().toISOString().split('T')[0]}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>NCRs Found</label>
                    <input type="number" class="form-control" id="auditNCRs" value="0" min="0">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select class="form-control" id="auditStatus">
                        <option value="scheduled">Scheduled</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Findings / Remarks</label>
                <textarea class="form-control" id="auditFindings" rows="3" placeholder="Summary of audit findings..."></textarea>
            </div>
        </form>`;

        App.openModal('Schedule Internal Audit', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="ISO.saveAudit()"><i class="fas fa-save"></i> Save Audit</button>
        `);
    },

    saveAudit() {
        const auditNo = document.getElementById('auditNo')?.value?.trim();
        if (!auditNo) { App.showToast('Audit number is required', 'error'); return; }

        if (!DataStore.isoAudits) DataStore.isoAudits = [];
        DataStore.isoAudits.push({
            id: Utils.generateId('AUD'),
            auditNo,
            standard: document.getElementById('auditStandard').value,
            scope: document.getElementById('auditScope').value,
            auditor: document.getElementById('auditLead').value,
            auditDate: document.getElementById('auditDate').value,
            ncrsFound: parseInt(document.getElementById('auditNCRs').value || 0),
            status: document.getElementById('auditStatus').value,
            findings: document.getElementById('auditFindings').value,
            company: App.activeCompany,
            createdAt: new Date().toISOString()
        });

        Database.save();
        App.closeModal();
        App.showToast('Audit record saved successfully', 'success');
        document.getElementById('isoTabContent').innerHTML = this.renderAuditsTab();
    },

    viewAudit(id) {
        const a = (DataStore.isoAudits || []).find(x => x.id === id);
        if (!a) return;
        App.openModal('Audit Details — ' + a.auditNo, `
            <div class="grid-2 mb-3" style="font-size:13px">
                <div><label style="font-size:11px;color:var(--text-muted)">STANDARD</label><div>${a.standard}</div></div>
                <div><label style="font-size:11px;color:var(--text-muted)">STATUS</label><div><span class="badge-tag ${a.status === 'completed' ? 'badge-success' : 'badge-warning'}">${a.status}</span></div></div>
                <div><label style="font-size:11px;color:var(--text-muted)">SCOPE</label><div>${a.scope}</div></div>
                <div><label style="font-size:11px;color:var(--text-muted)">LEAD AUDITOR</label><div>${a.auditor || '—'}</div></div>
                <div><label style="font-size:11px;color:var(--text-muted)">DATE</label><div>${Utils.formatDate(a.auditDate)}</div></div>
                <div><label style="font-size:11px;color:var(--text-muted)">NCRs FOUND</label><div class="${a.ncrsFound > 0 ? 'text-danger' : 'text-success'}">${a.ncrsFound}</div></div>
            </div>
            ${a.findings ? `<div style="padding:12px;background:var(--bg);border-radius:var(--radius);font-size:13px"><strong>Findings:</strong> ${a.findings}</div>` : ''}
        `, `<button class="btn btn-secondary" onclick="App.closeModal()">Close</button>`);
    },

    // ---- NCR TAB ----
    renderNCRTab() {
        const ncrs = this.getFilteredNCRs();

        return `
        <div class="card">
            <div class="card-header">
                <h3>Non-Conformance Reports (NCR)</h3>
                <div class="card-actions">
                    <select class="form-control" style="width:150px" id="ncrStatusFilter" onchange="ISO.filterNCRs()">
                        <option value="all">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="closed">Closed</option>
                    </select>
                    <button class="btn btn-primary" onclick="ISO.openNewNCR()"><i class="fas fa-plus"></i> Raise NCR</button>
                </div>
            </div>
            <div class="card-body no-padding" id="ncrTableBody">
                ${this.renderNCRTable(ncrs)}
            </div>
        </div>`;
    },

    renderNCRTable(ncrs) {
        if (!ncrs.length) return `<div style="padding:40px;text-align:center;color:var(--text-muted)"><i class="fas fa-check-circle fa-2x" style="color:var(--success);display:block;margin-bottom:12px"></i>No NCRs recorded.</div>`;
        return Utils.buildTable(
            [
                { label: 'NCR No.', render: n => `<span class="font-mono" style="font-weight:600">${n.ncrNo}</span>` },
                { label: 'Standard', render: n => `<span class="badge-tag" style="background:#e8f5e9;color:#2e7d32">${n.standard}</span>` },
                { label: 'Clause', render: n => `<span class="font-mono">${n.clause}</span>` },
                { label: 'Description', render: n => `<span class="truncate" style="max-width:220px;display:inline-block">${n.description}</span>` },
                { label: 'Severity', render: n => `<span class="badge-tag ${n.severity === 'major' ? 'badge-danger' : n.severity === 'minor' ? 'badge-warning' : 'badge-neutral'}">${n.severity}</span>` },
                { label: 'Source', render: n => `<span class="badge-tag badge-neutral">${n.source}</span>` },
                { label: 'Raised On', render: n => Utils.formatDate(n.raisedDate) },
                { label: 'Status', render: n => `<span class="badge-tag ${n.status === 'closed' ? 'badge-success' : n.status === 'in-progress' ? 'badge-warning' : 'badge-danger'}">${n.status}</span>` }
            ],
            ncrs,
            { actions: n => `<button class="btn btn-sm btn-secondary" onclick="ISO.viewNCR('${n.id}')"><i class="fas fa-eye"></i></button>` }
        );
    },

    filterNCRs() {
        const status = document.getElementById('ncrStatusFilter')?.value || 'all';
        let ncrs = this.getFilteredNCRs();
        if (status !== 'all') ncrs = ncrs.filter(n => n.status === status);
        document.getElementById('ncrTableBody').innerHTML = this.renderNCRTable(ncrs);
    },

    openNewNCR() {
        const standards = this.getApplicableStandards().map(s => s.code);
        const html = `
        <form>
            <div class="form-row">
                <div class="form-group">
                    <label>NCR Number <span class="required">*</span></label>
                    <input type="text" class="form-control" id="ncrNo" placeholder="e.g. NCR-2025-001">
                </div>
                <div class="form-group">
                    <label>ISO Standard <span class="required">*</span></label>
                    <select class="form-control" id="ncrStandard">
                        ${standards.map(s => `<option>${s}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ISO Clause</label>
                    <input type="text" class="form-control" id="ncrClause" placeholder="e.g. 8.5.2">
                </div>
                <div class="form-group">
                    <label>Severity</label>
                    <select class="form-control" id="ncrSeverity">
                        <option value="minor">Minor</option>
                        <option value="major">Major</option>
                        <option value="observation">Observation</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Source</label>
                    <select class="form-control" id="ncrSource">
                        <option>Internal Audit</option><option>External Audit</option>
                        <option>Customer Complaint</option><option>Process Monitoring</option><option>Management Review</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Raised Date</label>
                    <input type="date" class="form-control" id="ncrDate" value="${new Date().toISOString().split('T')[0]}">
                </div>
            </div>
            <div class="form-group">
                <label>Description of Non-Conformance <span class="required">*</span></label>
                <textarea class="form-control" id="ncrDesc" rows="3" placeholder="Describe the non-conformance in detail..."></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Assigned To</label>
                    <input type="text" class="form-control" id="ncrAssignee" placeholder="Person / department responsible">
                </div>
                <div class="form-group">
                    <label>Target Closure Date</label>
                    <input type="date" class="form-control" id="ncrTarget">
                </div>
            </div>
        </form>`;

        App.openModal('Raise Non-Conformance Report', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="ISO.saveNCR()"><i class="fas fa-save"></i> Raise NCR</button>
        `);
    },

    saveNCR() {
        const ncrNo = document.getElementById('ncrNo')?.value?.trim();
        const desc = document.getElementById('ncrDesc')?.value?.trim();
        if (!ncrNo || !desc) { App.showToast('NCR number and description are required', 'error'); return; }

        if (!DataStore.isoNcrs) DataStore.isoNcrs = [];
        DataStore.isoNcrs.push({
            id: Utils.generateId('NCR'),
            ncrNo,
            standard: document.getElementById('ncrStandard').value,
            clause: document.getElementById('ncrClause').value,
            severity: document.getElementById('ncrSeverity').value,
            source: document.getElementById('ncrSource').value,
            raisedDate: document.getElementById('ncrDate').value,
            description: desc,
            assignee: document.getElementById('ncrAssignee').value,
            targetDate: document.getElementById('ncrTarget').value,
            status: 'open',
            company: App.activeCompany,
            createdAt: new Date().toISOString()
        });

        Database.save();
        App.closeModal();
        App.showToast(`NCR ${ncrNo} raised successfully`, 'success');
        document.getElementById('isoTabContent').innerHTML = this.renderNCRTab();
    },

    viewNCR(id) {
        const n = (DataStore.isoNcrs || []).find(x => x.id === id);
        if (!n) return;
        const statusOptions = ['open', 'in-progress', 'closed'].map(s =>
            `<option value="${s}" ${n.status === s ? 'selected' : ''}>${s}</option>`
        ).join('');

        App.openModal('NCR — ' + n.ncrNo, `
            <div class="grid-3 mb-3" style="font-size:13px">
                <div><label style="font-size:11px;color:var(--text-muted)">STANDARD</label><div>${n.standard}</div></div>
                <div><label style="font-size:11px;color:var(--text-muted)">CLAUSE</label><div class="font-mono">${n.clause || '—'}</div></div>
                <div><label style="font-size:11px;color:var(--text-muted)">SEVERITY</label><div><span class="badge-tag ${n.severity === 'major' ? 'badge-danger' : n.severity === 'minor' ? 'badge-warning' : 'badge-neutral'}">${n.severity}</span></div></div>
                <div><label style="font-size:11px;color:var(--text-muted)">SOURCE</label><div>${n.source}</div></div>
                <div><label style="font-size:11px;color:var(--text-muted)">RAISED DATE</label><div>${Utils.formatDate(n.raisedDate)}</div></div>
                <div><label style="font-size:11px;color:var(--text-muted)">ASSIGNED TO</label><div>${n.assignee || '—'}</div></div>
            </div>
            <div style="padding:12px;background:var(--bg);border-radius:var(--radius);margin-bottom:12px;font-size:13px"><strong>Description:</strong><br>${n.description}</div>
            <div class="form-group">
                <label>Update Status</label>
                <select class="form-control" id="ncrStatusUpdate" style="width:200px">${statusOptions}</select>
            </div>
        `, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            <button class="btn btn-primary" onclick="ISO.updateNCRStatus('${id}')"><i class="fas fa-save"></i> Update Status</button>
        `);
    },

    updateNCRStatus(id) {
        const n = (DataStore.isoNcrs || []).find(x => x.id === id);
        if (!n) return;
        n.status = document.getElementById('ncrStatusUpdate').value;
        Database.save();
        App.closeModal();
        App.showToast('NCR status updated', 'success');
        document.getElementById('isoTabContent').innerHTML = this.renderNCRTab();
    },

    // ---- CPAR TAB ----
    renderCPARTab() {
        const cpars = this.getFilteredCPARs();

        return `
        <div class="card">
            <div class="card-header">
                <h3>Corrective / Preventive Action Reports (CPAR)</h3>
                <div class="card-actions">
                    <select class="form-control" style="width:150px" id="cparStatusFilter" onchange="ISO.filterCPARs()">
                        <option value="all">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="closed">Closed</option>
                    </select>
                    <button class="btn btn-primary" onclick="ISO.openNewCPAR()"><i class="fas fa-plus"></i> New CPAR</button>
                </div>
            </div>
            <div class="card-body no-padding" id="cparTableBody">
                ${this.renderCPARTable(cpars)}
            </div>
        </div>`;
    },

    renderCPARTable(cpars) {
        if (!cpars.length) return `<div style="padding:40px;text-align:center;color:var(--text-muted)"><i class="fas fa-tasks fa-2x" style="display:block;margin-bottom:12px"></i>No CPARs recorded.</div>`;
        return Utils.buildTable(
            [
                { label: 'CPAR No.', render: c => `<span class="font-mono" style="font-weight:600">${c.cparNo}</span>` },
                { label: 'Type', render: c => `<span class="badge-tag ${c.type === 'corrective' ? 'badge-danger' : 'badge-warning'}">${c.type}</span>` },
                { label: 'Source / Reference', key: 'source' },
                { label: 'Root Cause', render: c => `<span class="truncate" style="max-width:180px;display:inline-block">${c.rootCause}</span>` },
                { label: 'Action Taken', render: c => `<span class="truncate" style="max-width:180px;display:inline-block">${c.actionTaken}</span>` },
                { label: 'Due Date', render: c => {
                    const overdue = c.status !== 'closed' && new Date(c.dueDate) < new Date();
                    return `<span class="${overdue ? 'text-danger' : ''}">${Utils.formatDate(c.dueDate)}${overdue ? ' ⚠️' : ''}</span>`;
                }},
                { label: 'Status', render: c => `<span class="badge-tag ${c.status === 'closed' ? 'badge-success' : c.status === 'in-progress' ? 'badge-warning' : 'badge-danger'}">${c.status}</span>` }
            ],
            cpars,
            { actions: c => `<button class="btn btn-sm btn-secondary" onclick="ISO.viewCPAR('${c.id}')"><i class="fas fa-eye"></i></button>` }
        );
    },

    filterCPARs() {
        const status = document.getElementById('cparStatusFilter')?.value || 'all';
        let cpars = this.getFilteredCPARs();
        if (status !== 'all') cpars = cpars.filter(c => c.status === status);
        document.getElementById('cparTableBody').innerHTML = this.renderCPARTable(cpars);
    },

    openNewCPAR() {
        const html = `
        <form>
            <div class="form-row">
                <div class="form-group">
                    <label>CPAR Number <span class="required">*</span></label>
                    <input type="text" class="form-control" id="cparNo" placeholder="e.g. CPAR-2025-001">
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select class="form-control" id="cparType">
                        <option value="corrective">Corrective</option>
                        <option value="preventive">Preventive</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Source / Reference (NCR No., Audit No., etc.)</label>
                <input type="text" class="form-control" id="cparSource" placeholder="e.g. NCR-2025-001 or Customer Complaint">
            </div>
            <div class="form-group">
                <label>Problem / Non-Conformance Statement <span class="required">*</span></label>
                <textarea class="form-control" id="cparProblem" rows="2" placeholder="Describe the issue..."></textarea>
            </div>
            <div class="form-group">
                <label>Root Cause Analysis <span class="required">*</span></label>
                <textarea class="form-control" id="cparRoot" rows="2" placeholder="5-Why, Fishbone, or other RCA method result..."></textarea>
            </div>
            <div class="form-group">
                <label>Corrective / Preventive Action Taken <span class="required">*</span></label>
                <textarea class="form-control" id="cparAction" rows="2" placeholder="Actions implemented or planned..."></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Responsible Person</label>
                    <input type="text" class="form-control" id="cparResponsible" placeholder="Name">
                </div>
                <div class="form-group">
                    <label>Target Closure Date</label>
                    <input type="date" class="form-control" id="cparDue">
                </div>
            </div>
        </form>`;

        App.openModal('New Corrective / Preventive Action Report', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="ISO.saveCPAR()"><i class="fas fa-save"></i> Save CPAR</button>
        `);
    },

    saveCPAR() {
        const cparNo = document.getElementById('cparNo')?.value?.trim();
        const rootCause = document.getElementById('cparRoot')?.value?.trim();
        const actionTaken = document.getElementById('cparAction')?.value?.trim();
        if (!cparNo || !rootCause || !actionTaken) { App.showToast('CPAR number, root cause, and action taken are required', 'error'); return; }

        if (!DataStore.isoCpars) DataStore.isoCpars = [];
        DataStore.isoCpars.push({
            id: Utils.generateId('CPAR'),
            cparNo,
            type: document.getElementById('cparType').value,
            source: document.getElementById('cparSource').value,
            problem: document.getElementById('cparProblem').value,
            rootCause,
            actionTaken,
            responsible: document.getElementById('cparResponsible').value,
            dueDate: document.getElementById('cparDue').value,
            status: 'open',
            company: App.activeCompany,
            createdAt: new Date().toISOString()
        });

        Database.save();
        App.closeModal();
        App.showToast(`CPAR ${cparNo} saved successfully`, 'success');
        document.getElementById('isoTabContent').innerHTML = this.renderCPARTab();
    },

    viewCPAR(id) {
        const c = (DataStore.isoCpars || []).find(x => x.id === id);
        if (!c) return;
        const statusOptions = ['open', 'in-progress', 'closed'].map(s =>
            `<option value="${s}" ${c.status === s ? 'selected' : ''}>${s}</option>`
        ).join('');

        App.openModal('CPAR — ' + c.cparNo, `
            <div class="grid-2 mb-3" style="font-size:13px">
                <div><label style="font-size:11px;color:var(--text-muted)">TYPE</label><div><span class="badge-tag ${c.type === 'corrective' ? 'badge-danger' : 'badge-warning'}">${c.type}</span></div></div>
                <div><label style="font-size:11px;color:var(--text-muted)">SOURCE</label><div>${c.source || '—'}</div></div>
                <div><label style="font-size:11px;color:var(--text-muted)">RESPONSIBLE</label><div>${c.responsible || '—'}</div></div>
                <div><label style="font-size:11px;color:var(--text-muted)">DUE DATE</label><div>${Utils.formatDate(c.dueDate) || '—'}</div></div>
            </div>
            ${c.problem ? `<div style="padding:10px;background:var(--bg);border-radius:var(--radius);margin-bottom:8px;font-size:13px"><strong>Problem:</strong> ${c.problem}</div>` : ''}
            <div style="padding:10px;background:var(--bg);border-radius:var(--radius);margin-bottom:8px;font-size:13px"><strong>Root Cause:</strong> ${c.rootCause}</div>
            <div style="padding:10px;background:var(--bg);border-radius:var(--radius);margin-bottom:12px;font-size:13px"><strong>Action Taken:</strong> ${c.actionTaken}</div>
            <div class="form-group">
                <label>Update Status</label>
                <select class="form-control" id="cparStatusUpdate" style="width:200px">${statusOptions}</select>
            </div>
        `, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            <button class="btn btn-primary" onclick="ISO.updateCPARStatus('${id}')"><i class="fas fa-save"></i> Update Status</button>
        `);
    },

    updateCPARStatus(id) {
        const c = (DataStore.isoCpars || []).find(x => x.id === id);
        if (!c) return;
        c.status = document.getElementById('cparStatusUpdate').value;
        Database.save();
        App.closeModal();
        App.showToast('CPAR status updated', 'success');
        document.getElementById('isoTabContent').innerHTML = this.renderCPARTab();
    },

    // ---- KPI TAB ----
    renderKPITab() {
        const standards = this.getApplicableStandards();
        const ncrs = this.getFilteredNCRs();
        const cpars = this.getFilteredCPARs();
        const audits = this.getFilteredAudits();
        const docs = this.getFilteredDocs();

        const openNCRs = ncrs.filter(n => n.status === 'open').length;
        const closedNCRs = ncrs.filter(n => n.status === 'closed').length;
        const ncrClosure = ncrs.length > 0 ? Math.round((closedNCRs / ncrs.length) * 100) : 100;
        const cparClosure = cpars.length > 0 ? Math.round((cpars.filter(c => c.status === 'closed').length / cpars.length) * 100) : 100;
        const completedAudits = audits.filter(a => a.status === 'completed').length;
        const activeDocs = docs.filter(d => d.status === 'active').length;

        const kpis = [
            { label: 'NCR Closure Rate', value: ncrClosure, unit: '%', target: 90, icon: 'fa-times-circle', color: ncrClosure >= 90 ? 'var(--success)' : ncrClosure >= 60 ? 'var(--warning)' : 'var(--danger)' },
            { label: 'CPAR Closure Rate', value: cparClosure, unit: '%', target: 85, icon: 'fa-tasks', color: cparClosure >= 85 ? 'var(--success)' : cparClosure >= 60 ? 'var(--warning)' : 'var(--danger)' },
            { label: 'Completed Audits', value: completedAudits, unit: '', target: null, icon: 'fa-clipboard-check', color: 'var(--primary)' },
            { label: 'Active Documents', value: activeDocs, unit: '', target: null, icon: 'fa-file-alt', color: 'var(--secondary)' },
            { label: 'Open NCRs', value: openNCRs, unit: '', target: 0, icon: 'fa-exclamation-circle', color: openNCRs === 0 ? 'var(--success)' : 'var(--danger)' },
        ];

        return `
        <div class="card mb-3">
            <div class="card-header"><h3>ISO Quality KPI Dashboard</h3></div>
            <div class="card-body">
                <div class="grid-${kpis.length}" style="gap:16px;margin-bottom:24px">
                    ${kpis.map(k => `
                    <div style="text-align:center;padding:16px;background:var(--bg);border-radius:var(--radius)">
                        <i class="fas ${k.icon}" style="font-size:24px;color:${k.color};margin-bottom:8px;display:block"></i>
                        <div style="font-size:28px;font-weight:700;color:${k.color}">${k.value}${k.unit}</div>
                        <div style="font-size:12px;color:var(--text-muted)">${k.label}</div>
                        ${k.target !== null ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">Target: ${k.target}${k.unit}</div>` : ''}
                    </div>`).join('')}
                </div>

                <h4 style="margin-bottom:12px">Standards Compliance Summary</h4>
                ${standards.map(s => {
                    const sNCRs = ncrs.filter(n => n.standard === s.code);
                    const sClosed = sNCRs.filter(n => n.status === 'closed').length;
                    const sPct = sNCRs.length > 0 ? Math.round((sClosed / sNCRs.length) * 100) : 100;
                    return `
                    <div style="display:flex;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid var(--border-light)">
                        <div style="width:40px;height:40px;background:${s.color}20;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                            <i class="fas ${s.icon}" style="color:${s.color}"></i>
                        </div>
                        <div style="flex:1">
                            <div style="font-weight:600;font-size:13px">${s.code} — ${s.title}</div>
                            <div style="font-size:11px;color:var(--text-muted)">${sNCRs.length} total NCRs | ${sClosed} closed</div>
                            <div style="margin-top:6px;height:6px;background:var(--border);border-radius:3px">
                                <div style="width:${sPct}%;height:100%;background:${sPct>=80?'var(--success)':sPct>=50?'var(--warning)':'var(--danger)'};border-radius:3px"></div>
                            </div>
                        </div>
                        <div style="text-align:right;flex-shrink:0">
                            <div style="font-weight:700;color:${sPct>=80?'var(--success)':sPct>=50?'var(--warning)':'var(--danger)'}">${sPct}%</div>
                            <div style="font-size:11px;color:var(--text-muted)">NCR Closure</div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }
};
