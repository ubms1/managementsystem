/* ========================================
   UBMS - CRM Module
   Unified Customer Relationship Management
   ======================================== */

const CRM = {
    currentFilter: 'all',

    render(container) {
        const customers = this.getFilteredCustomers();
        const totalCustomers = customers.length;
        const corporateCount = customers.filter(c => c.type === 'corporate').length;
        const crossSellCount = customers.filter(c => (c.companies || []).length > 1).length;
        const totalSpent = customers.reduce((s, c) => s + (c.totalSpent || 0), 0);

        container.innerHTML = `
        <!-- KPI Cards -->
        <div class="grid-4 mb-3">
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon teal"><i class="fas fa-users"></i></div></div>
                <div class="stat-value">${totalCustomers}</div>
                <div class="stat-label">Total Customers</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon blue"><i class="fas fa-building"></i></div></div>
                <div class="stat-value">${corporateCount}</div>
                <div class="stat-label">Corporate Accounts</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon purple"><i class="fas fa-exchange-alt"></i></div></div>
                <div class="stat-value">${crossSellCount}</div>
                <div class="stat-label">Cross-Company Clients</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon green"><i class="fas fa-peso-sign"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(totalSpent, true)}</div>
                <div class="stat-label">Total Revenue</div>
            </div>
        </div>

        <!-- Filter Bar + Table -->
        <div class="card">
            <div class="card-header">
                <h3>Customer Directory</h3>
                <div class="card-actions">
                    ${Auth.canEdit() ? `<button class="btn btn-primary" onclick="CRM.openAddCustomer()">
                        <i class="fas fa-plus"></i> Add Customer
                    </button>` : ''}
                </div>
            </div>
            <div style="padding:16px 24px;border-bottom:1px solid var(--border)">
                <div class="filter-bar" style="margin-bottom:0;padding:0;background:none;border:none">
                    <div class="topbar-search" style="flex:1">
                        <i class="fas fa-search"></i>
                        <input type="text" class="form-control" placeholder="Search customers..." id="crmSearch" oninput="CRM.filterCustomers()" style="padding-left:36px">
                    </div>
                    <select class="form-control" style="width:160px" id="crmTypeFilter" onchange="CRM.filterCustomers()">
                        <option value="all">All Types</option>
                        <option value="individual">Individual</option>
                        <option value="corporate">Corporate</option>
                        <option value="government">Government</option>
                    </select>
                    <select class="form-control" style="width:180px" id="crmCompanyFilter" onchange="CRM.filterCustomers()">
                        <option value="all">All Companies</option>
                        ${Auth.isSuperAdmin() || Auth.isOwner() ? `
                        <option value="dheekay">Dheekay Builders</option>
                        <option value="kdchavit">KDChavit Construction</option>
                        <option value="nuatthai">Nuat Thai</option>
                        <option value="autocasa">AutoCasa</option>` :
                        (() => {
                            const uCo = Auth.getSession()?.companies || [Auth.getCompany()];
                            const names = {dheekay:'Dheekay Builders',kdchavit:'KDChavit Construction',nuatthai:'Nuat Thai',autocasa:'AutoCasa'};
                            return uCo.filter(c=>c!=='all').map(c=>`<option value="${c}">${names[c]||c}</option>`).join('');
                        })()}
                    </select>
                </div>
            </div>
            <div class="card-body no-padding" id="customerTableContainer">
                ${this.renderCustomerTable(customers)}
            </div>
        </div>`;
    },

    getFilteredCustomers() {
        let customers = DataStore.customers;
        // Superadmin sees ALL customers across ALL businesses
        if (Auth.isSuperAdmin()) return customers;
        // Manager/owner see their assigned companies' customers
        if (Auth.isManager()) {
            const userCompanies = Auth.getSession()?.companies || [Auth.getCompany()];
            if (!userCompanies.includes('all')) {
                customers = customers.filter(c => (c.companies || []).some(co => userCompanies.includes(co)));
            }
            return customers;
        }
        // Other roles: filter by active company or their assigned companies
        if (App.activeCompany !== 'all') {
            customers = customers.filter(c => (c.companies || []).includes(App.activeCompany));
        } else {
            const userCompanies = Auth.getSession()?.companies || [Auth.getCompany()];
            if (!userCompanies.includes('all')) {
                customers = customers.filter(c => (c.companies || []).some(co => userCompanies.includes(co)));
            }
        }
        return customers;
    },

    renderCustomerTable(customers) {
        return Utils.buildTable(
            [
                { label: 'Customer', render: c => `
                    <div style="display:flex;align-items:center;gap:10px">
                        <div class="avatar" style="background:${c.type === 'corporate' ? 'var(--info)' : c.type === 'government' ? '#8b5cf6' : 'var(--secondary)'}">
                            ${c.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <div>
                            <div style="font-weight:600">${c.name}</div>
                            <div style="font-size:11px;color:var(--text-muted)">${c.email || ''}</div>
                        </div>
                    </div>` },
                { label: 'Type', render: c => `<span class="badge-tag ${c.type === 'corporate' ? 'badge-info' : c.type === 'government' ? 'badge-purple' : 'badge-neutral'}">${c.type}</span>` },
                { label: 'Companies', render: c => (c.companies || []).map(co =>
                    `<span class="badge-tag badge-${co}" style="margin-right:4px">${co}</span>`
                ).join('') },
                { label: 'Tags', render: c => (c.tags || []).slice(0, 2).map(t =>
                    `<span class="badge-tag badge-teal" style="margin-right:4px">${t}</span>`
                ).join('') },
                { label: 'Total Spent', render: c => `<strong>${Utils.formatCurrency(c.totalSpent, true)}</strong>` },
                { label: 'Since', render: c => Utils.formatDate(c.created) }
            ],
            customers,
            {
                actions: (c) => `
                    <button class="btn btn-sm btn-secondary" onclick="CRM.viewCustomer('${c.id}')" title="View"><i class="fas fa-eye"></i></button>
                    ${Auth.canEdit() ? `<button class="btn btn-sm btn-secondary" onclick="CRM.editCustomer('${c.id}')" title="Edit" style="margin-left:4px"><i class="fas fa-edit"></i></button>` : ''}
                    ${Auth.canDelete() ? `<button class="btn btn-sm btn-danger" onclick="CRM.deleteCustomer('${c.id}')" title="Delete" style="margin-left:4px"><i class="fas fa-trash"></i></button>` : ''}
                `
            }
        );
    },

    filterCustomers() {
        const search = document.getElementById('crmSearch')?.value.toLowerCase() || '';
        const type = document.getElementById('crmTypeFilter')?.value || 'all';
        const company = document.getElementById('crmCompanyFilter')?.value || 'all';

        let filtered = this.getFilteredCustomers();
        if (search) filtered = filtered.filter(c => c.name.toLowerCase().includes(search) || c.email?.toLowerCase().includes(search));
        if (type !== 'all') filtered = filtered.filter(c => c.type === type);
        if (company !== 'all') filtered = filtered.filter(c => (c.companies || []).includes(company));

        document.getElementById('customerTableContainer').innerHTML = this.renderCustomerTable(filtered);
    },

    viewCustomer(id) {
        const c = DataStore.customers.find(cust => cust.id === id);
        if (!c) return;

        const invoices = DataStore.invoices.filter(inv => inv.customer === id);
        const bookings = DataStore.bookings.filter(b => b.customer === id);
        const vehicles = DataStore.vehicles.filter(v => v.customer === id);

        let html = `
        <div style="display:flex;gap:20px;align-items:flex-start">
            <div class="avatar" style="width:60px;height:60px;font-size:24px;background:var(--secondary)">${c.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
            <div style="flex:1">
                <h3 style="font-size:20px;margin-bottom:4px">${c.name}</h3>
                <p style="color:var(--text-secondary)">${c.type} • ${c.address || 'No address'}</p>
                <div style="margin-top:8px">
                    ${(c.companies || []).map(co => `<span class="badge-tag badge-${co}" style="margin-right:4px">${Utils.getCompanyName(co)}</span>`).join('')}
                </div>
            </div>
        </div>
        <hr style="margin:20px 0;border:none;border-top:1px solid var(--border)">

        <div class="grid-2 mb-2" style="gap:12px">
            <div><strong>Email:</strong> ${c.email || '-'}</div>
            <div><strong>Phone:</strong> ${c.phone || '-'}</div>
            <div><strong>Total Spent:</strong> ${Utils.formatCurrency(c.totalSpent)}</div>
            <div><strong>Customer Since:</strong> ${Utils.formatDate(c.created)}</div>
        </div>

        ${c.contactPerson ? `<div class="mb-2"><strong>Contact Person:</strong> ${c.contactPerson}</div>` : ''}
        ${c.notes ? `<div class="mb-2"><strong>Notes:</strong> ${c.notes}</div>` : ''}
        ${c.vehicle ? `<div class="mb-2"><strong>Vehicle:</strong> ${c.vehicle}</div>` : ''}

        <div style="margin-top:20px">
            <h4 style="margin-bottom:12px">Tags</h4>
            <div>${(c.tags || []).map(t => `<span class="badge-tag badge-teal" style="margin-right:6px">${t}</span>`).join('')}</div>
        </div>

        ${invoices.length > 0 ? `
        <div style="margin-top:20px">
            <h4 style="margin-bottom:12px">Recent Invoices</h4>
            ${Utils.buildTable(
                [
                    { label: 'ID', key: 'id' },
                    { label: 'Amount', render: r => Utils.formatCurrency(r.amount) },
                    { label: 'Status', render: r => `<span class="badge-tag ${Utils.getStatusClass(r.status)}">${r.status}</span>` },
                    { label: 'Due', render: r => Utils.formatDate(r.dueDate) }
                ],
                invoices
            )}
        </div>` : ''}

        ${bookings.length > 0 ? `
        <div style="margin-top:20px">
            <h4 style="margin-bottom:12px">Booking History</h4>
            ${Utils.buildTable(
                [
                    { label: 'Date', render: r => Utils.formatDate(r.date) },
                    { label: 'Service', render: r => DataStore.spaServices.find(s => s.id === r.service)?.name || '' },
                    { label: 'Status', render: r => `<span class="badge-tag ${Utils.getStatusClass(r.status)}">${r.status}</span>` }
                ],
                bookings
            )}
        </div>` : ''}

        ${vehicles.length > 0 ? `
        <div style="margin-top:20px">
            <h4 style="margin-bottom:12px">Registered Vehicles</h4>
            ${Utils.buildTable(
                [
                    { label: 'Vehicle', render: r => `${r.make} ${r.model} (${r.year})` },
                    { label: 'Plate', key: 'plate' },
                    { label: 'Mileage', render: r => Utils.formatNumber(r.mileage) + ' km' }
                ],
                vehicles
            )}
        </div>` : ''}`;

        App.openModal('Customer Details', html, '', true);
    },

    openAddCustomer() {
        const html = `
        <form id="addCustomerForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Full Name <span class="required">*</span></label>
                    <input type="text" class="form-control" id="custName" required>
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select class="form-control" id="custType">
                        <option value="individual">Individual</option>
                        <option value="corporate">Corporate</option>
                        <option value="government">Government</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" class="form-control" id="custEmail">
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="text" class="form-control" id="custPhone">
                </div>
            </div>
            <div class="form-group">
                <label>Address</label>
                <input type="text" class="form-control" id="custAddress">
            </div>
            <div class="form-group">
                <label>Associated Companies</label>
                <div class="checkbox-group">
                    <label class="checkbox-label"><input type="checkbox" value="dheekay"> Dheekay Builders</label>
                    <label class="checkbox-label"><input type="checkbox" value="kdchavit"> KDChavit Construction</label>
                    <label class="checkbox-label"><input type="checkbox" value="nuatthai"> Nuat Thai</label>
                    <label class="checkbox-label"><input type="checkbox" value="autocasa"> AutoCasa</label>
                </div>
            </div>
            <div class="form-group">
                <label>Tags (comma-separated)</label>
                <input type="text" class="form-control" id="custTags" placeholder="e.g., construction-client, car-owner">
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea class="form-control" id="custNotes" rows="3"></textarea>
            </div>
        </form>`;

        const footer = `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="CRM.saveNewCustomer()"><i class="fas fa-save"></i> Save Customer</button>
        `;
        App.openModal('Add New Customer', html, footer);
    },

    saveNewCustomer() {
        const name = document.getElementById('custName')?.value;
        if (!name) { App.showToast('Name is required', 'error'); return; }

        const companies = [];
        document.querySelectorAll('#modalBody .checkbox-group input:checked').forEach(cb => companies.push(cb.value));

        const newCustomer = {
            id: Utils.generateId('CUS'),
            name,
            type: document.getElementById('custType').value,
            email: document.getElementById('custEmail').value,
            phone: document.getElementById('custPhone').value,
            address: document.getElementById('custAddress').value,
            companies: companies.length > 0 ? companies : ['all'],
            tags: document.getElementById('custTags').value.split(',').map(t => t.trim()).filter(Boolean),
            notes: document.getElementById('custNotes').value,
            created: new Date().toISOString().split('T')[0],
            totalSpent: 0
        };

        DataStore.customers.push(newCustomer);
        App.closeModal();
        App.showToast(`Customer "${name}" added successfully`, 'success');
        this.render(document.getElementById('contentArea'));
    },

    editCustomer(id) {
        if (!Auth.canEdit()) { App.showToast('You do not have permission to edit records', 'error'); return; }
        const c = DataStore.customers.find(cu => cu.id === id);
        if (!c) return;

        const html = `
        <form id="editCustomerForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Full Name <span class="required">*</span></label>
                    <input type="text" class="form-control" id="editCustName" value="${Utils.escapeHtml(c.name)}" required>
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select class="form-control" id="editCustType">
                        <option value="individual" ${c.type === 'individual' ? 'selected' : ''}>Individual</option>
                        <option value="corporate" ${c.type === 'corporate' ? 'selected' : ''}>Corporate</option>
                        <option value="government" ${c.type === 'government' ? 'selected' : ''}>Government</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" class="form-control" id="editCustEmail" value="${Utils.escapeHtml(c.email || '')}">
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="text" class="form-control" id="editCustPhone" value="${Utils.escapeHtml(c.phone || '')}">
                </div>
            </div>
            <div class="form-group">
                <label>Address</label>
                <input type="text" class="form-control" id="editCustAddress" value="${Utils.escapeHtml(c.address || '')}">
            </div>
            <div class="form-group">
                <label>Associated Companies</label>
                <div class="checkbox-group">
                    <label class="checkbox-label"><input type="checkbox" value="dheekay" ${(c.companies||[]).includes('dheekay') ? 'checked' : ''}> Dheekay Builders</label>
                    <label class="checkbox-label"><input type="checkbox" value="kdchavit" ${(c.companies||[]).includes('kdchavit') ? 'checked' : ''}> KDChavit Construction</label>
                    <label class="checkbox-label"><input type="checkbox" value="nuatthai" ${(c.companies||[]).includes('nuatthai') ? 'checked' : ''}> Nuat Thai</label>
                    <label class="checkbox-label"><input type="checkbox" value="autocasa" ${(c.companies||[]).includes('autocasa') ? 'checked' : ''}> AutoCasa</label>
                </div>
            </div>
            <div class="form-group">
                <label>Tags (comma-separated)</label>
                <input type="text" class="form-control" id="editCustTags" value="${Utils.escapeHtml((c.tags || []).join(', '))}">
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea class="form-control" id="editCustNotes" rows="3">${Utils.escapeHtml(c.notes || '')}</textarea>
            </div>
        </form>`;

        App.openModal('Edit Customer', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="CRM.saveEditCustomer('${id}')"><i class="fas fa-save"></i> Save Changes</button>
        `);
    },

    saveEditCustomer(id) {
        const c = DataStore.customers.find(cu => cu.id === id);
        if (!c) return;
        const name = document.getElementById('editCustName')?.value?.trim();
        if (!name) { App.showToast('Name is required', 'error'); return; }

        const companies = [];
        document.querySelectorAll('#modalBody .checkbox-group input:checked').forEach(cb => companies.push(cb.value));

        c.name    = name;
        c.type    = document.getElementById('editCustType').value;
        c.email   = document.getElementById('editCustEmail').value;
        c.phone   = document.getElementById('editCustPhone').value;
        c.address = document.getElementById('editCustAddress').value;
        c.companies = companies.length > 0 ? companies : (c.companies || ['all']);
        c.tags    = document.getElementById('editCustTags').value.split(',').map(t => t.trim()).filter(Boolean);
        c.notes   = document.getElementById('editCustNotes').value;

        Database.save();
        App.closeModal();
        App.showToast(`Customer "${name}" updated`, 'success');
        this.render(document.getElementById('contentArea'));
    },

    deleteCustomer(id) {
        if (!Auth.canDelete()) { App.showToast('Only Super Admin can delete records', 'error'); return; }
        const c = DataStore.customers.find(cu => cu.id === id);
        if (!c) return;

        App.openModal('Confirm Delete', `
            <p>Are you sure you want to delete customer <strong>${Utils.escapeHtml(c.name)}</strong>?</p>
            <p style="color:var(--danger);font-size:13px"><i class="fas fa-exclamation-triangle"></i> This action cannot be undone.</p>
        `, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-danger" onclick="CRM.confirmDeleteCustomer('${id}')"><i class="fas fa-trash"></i> Delete</button>
        `);
    },

    confirmDeleteCustomer(id) {
        Database.deleteCustomer(id);
        App.closeModal();
        App.showToast('Customer deleted', 'success');
        this.render(document.getElementById('contentArea'));
    }
};
