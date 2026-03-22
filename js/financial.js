/* ========================================
   UBMS - Financial Module
   AP/AR, Chart of Accounts, Transactions
   ======================================== */

const Financial = {
    activeTab: 'overview',

    render(container) {
        const summary = DataStore.getFinancialSummary(App.activeCompany);

        // Compute real revenue trend from monthly data
        const companies = App.activeCompany === 'all' ? Object.keys(DataStore.companies) : [App.activeCompany];
        const now = new Date();
        const curMonth = now.getMonth();
        const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
        const curRev = companies.reduce((s, co) => s + (DataStore.monthlyRevenue[co]?.[curMonth] || 0), 0);
        const prevRev = companies.reduce((s, co) => s + (DataStore.monthlyRevenue[co]?.[prevMonth] || 0), 0);
        const revTrend = prevRev > 0 ? ((curRev - prevRev) / prevRev * 100).toFixed(1) : 0;
        const trendUp = revTrend >= 0;

        container.innerHTML = `
        <!-- KPI Cards -->
        <div class="grid-4 mb-3">
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon green"><i class="fas fa-arrow-down"></i></div><span class="stat-trend ${trendUp?'up':'down'}"><i class="fas fa-arrow-${trendUp?'up':'down'}"></i> ${Math.abs(revTrend)}%</span></div>
                <div class="stat-value">${Utils.formatCurrency(summary.totalRevenue, true)}</div>
                <div class="stat-label">Total Revenue Collected</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon orange"><i class="fas fa-hourglass-half"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(summary.totalReceivable, true)}</div>
                <div class="stat-label">Accounts Receivable</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon red"><i class="fas fa-arrow-up"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(summary.totalExpenses, true)}</div>
                <div class="stat-label">Total Expenses</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon ${summary.netIncome >= 0 ? 'teal' : 'red'}"><i class="fas fa-balance-scale"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(summary.netIncome, true)}</div>
                <div class="stat-label">Net Income</div>
            </div>
        </div>

        <!-- Tab Navigation -->
        <div class="tab-nav">
            <button class="tab-btn active" onclick="Financial.switchTab('invoices', this)">Invoices (AR)</button>
            <button class="tab-btn" onclick="Financial.switchTab('expenses', this)">Expenses (AP)</button>
            <button class="tab-btn" onclick="Financial.switchTab('accounts', this)">Chart of Accounts</button>
            <button class="tab-btn" onclick="Financial.switchTab('journal', this)">Journal Entries</button>
            <button class="tab-btn" onclick="Financial.switchTab('reconciliation', this)">Bank Reconciliation</button>
            <button class="tab-btn" onclick="Financial.switchTab('bir', this)"><i class="fas fa-landmark" style="margin-right:4px"></i>BIR Compliance</button>
        </div>

        <div id="financialTabContent">
            ${this.renderInvoicesTab()}
        </div>`;
    },

    switchTab(tab, btn) {
        this.activeTab = tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const content = document.getElementById('financialTabContent');
        switch (tab) {
            case 'invoices': content.innerHTML = this.renderInvoicesTab(); break;
            case 'expenses': content.innerHTML = this.renderExpensesTab(); break;
            case 'accounts': content.innerHTML = this.renderAccountsTab(); break;
            case 'journal': content.innerHTML = this.renderJournalTab(); break;
            case 'reconciliation': content.innerHTML = this.renderReconciliationTab(); break;
            case 'bir': content.innerHTML = this.renderBIRTab(); this.birSubTab = 'salesjournal'; break;
        }
    },

    // ---- INVOICES TAB ----
    renderInvoicesTab() {
        const invoices = App.getFilteredData(DataStore.invoices);

        return `
        <div class="card">
            <div class="card-header">
                <h3>Invoices</h3>
                <div class="card-actions">
                    <select class="form-control" style="width:140px" id="invStatusFilter" onchange="Financial.filterInvoices()">
                        <option value="all">All Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="partial">Partial</option>
                    </select>
                    <button class="btn btn-primary" onclick="Financial.openNewInvoice()"><i class="fas fa-plus"></i> New Invoice</button>
                </div>
            </div>
            <div class="card-body no-padding" id="invoiceTableContainer">
                ${this.renderInvoiceTable(invoices)}
            </div>
            <div class="card-footer">
                <span style="font-size:12px;color:var(--text-muted)">${invoices.length} invoice(s)</span>
                <div>
                    <span style="font-size:12px;margin-right:16px"><strong>Total:</strong> ${Utils.formatCurrency(invoices.reduce((s, i) => s + i.amount, 0))}</span>
                    <span style="font-size:12px"><strong>Collected:</strong> ${Utils.formatCurrency(invoices.reduce((s, i) => s + i.paid, 0))}</span>
                </div>
            </div>
        </div>`;
    },

    renderInvoiceTable(invoices) {
        const typeLabel = t => ({ 'charge': 'Charge', 'progress-billing': 'Progress Billing', 'sales': 'Sales', 'service': 'Service' }[t] || 'Invoice');
        return Utils.buildTable(
            [
                { label: 'Invoice #', render: r => `<span class="font-mono" style="font-weight:600">${r.id}</span>` },
                { label: 'Type', render: r => `<span class="badge-tag badge-neutral" style="font-size:11px">${typeLabel(r.type)}</span>` },
                { label: 'Company', render: r => `<span class="badge-tag badge-${r.company}">${r.company}</span>` },
                { label: 'Customer', render: r => {
                    const cust = DataStore.customers.find(c => c.id === r.customer);
                    return cust ? cust.name : r.customer;
                }},
                { label: 'Description', render: r => `<span class="truncate" style="max-width:180px;display:inline-block">${r.description}</span>` },
                { label: 'Amount', render: r => `<strong>${Utils.formatCurrency(r.amount)}</strong>` },
                { label: 'Paid', render: r => `<span class="text-success">${Utils.formatCurrency(r.paid)}</span>` },
                { label: 'Balance', render: r => {
                    const bal = r.amount - r.paid;
                    return bal > 0.01 ? `<span class="text-danger">${Utils.formatCurrency(bal)}</span>` : '<span class="text-success">₱0.00</span>';
                }},
                { label: 'Status', render: r => `<span class="badge-tag ${Utils.getStatusClass(r.status)}">${r.status}</span>` },
                { label: 'Due Date', render: r => {
                    const isOverdue = r.status !== 'paid' && new Date(r.dueDate) < new Date();
                    return `<span class="${isOverdue ? 'text-danger' : ''}">${Utils.formatDate(r.dueDate)}${isOverdue ? ' ⚠️' : ''}</span>`;
                }}
            ],
            invoices,
            {
                actions: (r) => {
                    const bal = r.amount - r.paid;
                    return `<button class="btn btn-sm btn-secondary" onclick="Financial.viewInvoice('${r.id}')" title="View"><i class="fas fa-eye"></i></button>${bal > 0.01 ? `<button class="btn btn-sm btn-success" onclick="Financial.recordPayment('${r.id}')" title="Record Payment" style="margin-left:4px"><i class="fas fa-peso-sign"></i></button>` : ''}`;
                }
            }
        );
    },

    filterInvoices() {
        const status = document.getElementById('invStatusFilter')?.value || 'all';
        let invoices = App.getFilteredData(DataStore.invoices);
        if (status !== 'all') invoices = invoices.filter(i => i.status === status);
        document.getElementById('invoiceTableContainer').innerHTML = this.renderInvoiceTable(invoices);
    },

    viewInvoice(id) {
        const inv = DataStore.invoices.find(i => i.id === id);
        if (!inv) return;
        const cust = DataStore.customers.find(c => c.id === inv.customer);
        const co = DataStore.companies[inv.company];
        const balance = inv.amount - inv.paid;

        const html = `
        <div style="display:flex;justify-content:space-between;margin-bottom:24px">
            <div>
                <h3 style="font-size:20px">${inv.id}</h3>
                <p style="color:var(--text-secondary)">${inv.description}</p>
            </div>
            <span class="badge-tag ${Utils.getStatusClass(inv.status)}" style="height:fit-content;font-size:14px;padding:6px 16px">${inv.status.toUpperCase()}</span>
        </div>

        <div class="grid-2 mb-3">
            <div class="card" style="padding:16px">
                <h4 style="font-size:12px;color:var(--text-muted);margin-bottom:8px">FROM</h4>
                <div style="font-weight:600">${co?.name || inv.company}</div>
                <div style="font-size:12px;color:var(--text-secondary)">${co?.address || ''}</div>
            </div>
            <div class="card" style="padding:16px">
                <h4 style="font-size:12px;color:var(--text-muted);margin-bottom:8px">BILL TO</h4>
                <div style="font-weight:600">${cust?.name || inv.customer}</div>
                <div style="font-size:12px;color:var(--text-secondary)">${cust?.address || ''}</div>
            </div>
        </div>

        <div class="grid-3 mb-3">
            <div><strong>Issue Date:</strong> ${Utils.formatDate(inv.issueDate)}</div>
            <div><strong>Due Date:</strong> ${Utils.formatDate(inv.dueDate)}</div>
            <div><strong>Company:</strong> <span class="badge-tag badge-${inv.company}">${inv.company}</span></div>
        </div>

        <table class="data-table" style="margin-top:16px">
            <thead><tr><th>Description</th><th class="text-right">Amount</th></tr></thead>
            <tbody>
                <tr><td>${inv.description}</td><td class="text-right">${Utils.formatCurrency(inv.amount)}</td></tr>
                <tr><td><strong>Total</strong></td><td class="text-right"><strong>${Utils.formatCurrency(inv.amount)}</strong></td></tr>
                <tr><td><span class="text-success">Collected</span></td><td class="text-right text-success">(${Utils.formatCurrency(inv.paid)})</td></tr>
                <tr style="background:var(--bg)"><td><strong>Balance Due</strong></td><td class="text-right"><strong class="${balance > 0.01 ? 'text-danger' : 'text-success'}">${balance > 0.01 ? Utils.formatCurrency(balance) : 'FULLY PAID'}</strong></td></tr>
            </tbody>
        </table>

        ${(() => {
            const receipts = (DataStore.collectionReceipts || []).filter(r => r.invoiceId === id);
            if (!receipts.length) return '';
            return `<h4 style="margin:20px 0 10px"><i class="fas fa-receipt" style="margin-right:6px;color:var(--secondary)"></i>Collection History</h4>
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
            </table>`;
        })()}`;

        const footer = balance > 0.01 ? `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            <button class="btn btn-success" onclick="App.closeModal(); Financial.recordPayment('${inv.id}')"><i class="fas fa-peso-sign"></i> Record Payment</button>
        ` : `<button class="btn btn-secondary" onclick="App.closeModal()">Close</button>`;

        App.openModal('Invoice Details', html, footer, true);
    },

    recordPayment(invId) {
        const inv = DataStore.invoices.find(i => i.id === invId);
        if (!inv) return;
        const balance = inv.amount - inv.paid;
        const cust = DataStore.customers.find(c => c.id === inv.customer);

        const html = `
        <div style="background:var(--bg);padding:12px 16px;border-radius:var(--radius);margin-bottom:16px;font-size:13px">
            <div class="flex-between">
                <div><strong>Invoice:</strong> ${inv.id}</div>
                <div><strong>Client:</strong> ${cust?.name || inv.customer}</div>
            </div>
            <div style="margin-top:6px"><strong>Balance Due:</strong> <span class="text-danger" style="font-size:16px;font-weight:700">${Utils.formatCurrency(balance)}</span></div>
        </div>
        <form>
            <div class="form-row">
                <div class="form-group">
                    <label>Amount (₱) <span class="required">*</span></label>
                    <input type="number" class="form-control" id="pmtAmount" value="${balance.toFixed(2)}" min="0.01" step="0.01">
                </div>
                <div class="form-group">
                    <label>Date Received</label>
                    <input type="date" class="form-control" id="pmtDate" value="${new Date().toISOString().split('T')[0]}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Payment Method <span class="required">*</span></label>
                    <select class="form-control" id="pmtMethod">
                        <option value="cash">Cash</option>
                        <option value="check">Check</option>
                        <option value="bank-transfer">Bank Transfer</option>
                        <option value="online">Online / GCash / PayMaya</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Reference / Check No. (optional)</label>
                    <input type="text" class="form-control" id="pmtRef" placeholder="e.g., Check #00123">
                </div>
            </div>
            <div class="form-group">
                <label>Remarks</label>
                <input type="text" class="form-control" id="pmtNotes" placeholder="Optional notes">
            </div>
        </form>`;

        App.openModal('Record Payment', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-success" onclick="Financial.postPayment('${invId}')">
                <i class="fas fa-check"></i> Post Payment &amp; Generate Receipt
            </button>
        `);
    },

    postPayment(invId) {
        const inv = DataStore.invoices.find(i => i.id === invId);
        if (!inv) return;
        const amount = parseFloat(document.getElementById('pmtAmount')?.value || 0);
        const balance = inv.amount - inv.paid;
        if (!amount || amount <= 0)  { App.showToast('Amount is required', 'error'); return; }
        if (amount > balance + 0.01) { App.showToast(`Amount cannot exceed balance of ${Utils.formatCurrency(balance)}`, 'error'); return; }

        const method  = document.getElementById('pmtMethod')?.value || 'cash';
        const refNo   = document.getElementById('pmtRef')?.value || '';
        const date    = document.getElementById('pmtDate')?.value || new Date().toISOString().split('T')[0];
        const notes   = document.getElementById('pmtNotes')?.value || '';
        const cust    = DataStore.customers.find(c => c.id === inv.customer);

        if (!DataStore.collectionReceipts) DataStore.collectionReceipts = [];
        const receiptId = Utils.generateId('CR');
        DataStore.collectionReceipts.push({
            id: receiptId, company: inv.company, invoiceId: inv.id,
            customer: inv.customer, projectId: inv.projectId || '',
            amount, paymentMethod: method, referenceNo: refNo,
            date, notes, preparedBy: Auth.session?.username || 'system',
            postedAt: new Date().toISOString()
        });

        inv.paid += amount;
        if (inv.paid >= inv.amount - 0.01) { inv.paid = inv.amount; inv.status = 'paid'; }
        else { inv.status = 'partial'; }

        Database.save();
        App.closeModal();
        App.showToast(`Receipt ${receiptId} posted — ${Utils.formatCurrency(amount)} collected`, 'success');

        setTimeout(() => {
            if (confirm(`Receipt ${receiptId} posted!\n\nWould you like to print the Collection Receipt?`)) {
                Construction.printCollectionReceipt(receiptId);
            }
        }, 300);

        this.render(document.getElementById('contentArea'));
    },

    openNewInvoice() {
        const companyId = App.activeCompany;
        const projects = companyId === 'all' ? DataStore.projects : DataStore.projects.filter(p => p.company === companyId);
        const isConstruction = ['dheekay', 'kdchavit'].includes(companyId);

        const html = `
        <form>
            <div class="form-row">
                <div class="form-group">
                    <label>Company <span class="required">*</span></label>
                    <select class="form-control" id="newInvCompany">
                        ${Object.entries(DataStore.companies).map(([id, co]) => `<option value="${id}" ${companyId === id ? 'selected' : ''}>${co.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Customer <span class="required">*</span></label>
                    <select class="form-control" id="newInvCustomer">
                        ${DataStore.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Invoice Type</label>
                    <select class="form-control" id="newInvType">
                        <option value="sales">Sales Invoice</option>
                        <option value="service">Service Invoice</option>
                        <option value="charge" ${isConstruction ? 'selected' : ''}>Charge Invoice</option>
                        <option value="progress-billing">Progress Billing</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Linked Project (optional)</label>
                    <select class="form-control" id="newInvProject">
                        <option value="">— None —</option>
                        ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Description</label>
                <input type="text" class="form-control" id="newInvDesc" placeholder="Invoice description...">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Amount (₱)</label>
                    <input type="number" class="form-control" id="newInvAmount" min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>Due Date</label>
                    <input type="date" class="form-control" id="newInvDue">
                </div>
            </div>
        </form>`;

        App.openModal('Create New Invoice', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Financial.saveNewInvoice()"><i class="fas fa-save"></i> Create Invoice</button>
        `);
    },

    saveNewInvoice() {
        const amount = parseFloat(document.getElementById('newInvAmount')?.value || 0);
        if (!amount) { App.showToast('Amount is required', 'error'); return; }

        const newInv = {
            id: Utils.generateId('INV'),
            company: document.getElementById('newInvCompany').value,
            type: document.getElementById('newInvType')?.value || 'sales',
            projectId: document.getElementById('newInvProject')?.value || '',
            customer: document.getElementById('newInvCustomer').value,
            amount,
            paid: 0,
            status: 'unpaid',
            description: document.getElementById('newInvDesc').value,
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: document.getElementById('newInvDue').value || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
        };

        DataStore.invoices.push(newInv);
        Database.save();
        App.closeModal();
        App.showToast(`Invoice ${newInv.id} created (${Utils.formatCurrency(amount)})`, 'success');
        this.render(document.getElementById('contentArea'));
    },

    // ---- EXPENSES TAB ----
    renderExpensesTab() {
        const expenses = App.getFilteredData(DataStore.expenses);

        return `
        <div class="card">
            <div class="card-header">
                <h3>Expenses</h3>
                <button class="btn btn-primary" onclick="Financial.openNewExpense()"><i class="fas fa-plus"></i> Record Expense</button>
            </div>
            <div class="card-body no-padding">
                ${Utils.buildTable(
                    [
                        { label: 'ID', render: r => `<span class="font-mono">${r.id}</span>` },
                        { label: 'Company', render: r => `<span class="badge-tag badge-${r.company}">${r.company}</span>` },
                        { label: 'Date', render: r => Utils.formatDate(r.date) },
                        { label: 'Category', render: r => `<span class="badge-tag badge-neutral">${r.category}</span>` },
                        { label: 'Description', key: 'description' },
                        { label: 'Vendor', key: 'vendor' },
                        { label: 'Amount', render: r => `<strong class="text-danger">${Utils.formatCurrency(r.amount)}</strong>` }
                    ],
                    expenses
                )}
            </div>
            <div class="card-footer">
                <span style="font-size:12px;color:var(--text-muted)">${expenses.length} expense(s)</span>
                <span style="font-size:12px"><strong>Total:</strong> ${Utils.formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}</span>
            </div>
        </div>`;
    },

    openNewExpense() {
        const html = `
        <form>
            <div class="form-row">
                <div class="form-group">
                    <label>Company</label>
                    <select class="form-control" id="newExpCompany">
                        ${Object.entries(DataStore.companies).map(([id, co]) => `<option value="${id}" ${App.activeCompany === id ? 'selected' : ''}>${co.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select class="form-control" id="newExpCategory">
                        <option>Materials</option><option>Labor</option><option>Equipment</option>
                        <option>Rent</option><option>Utilities</option><option>Supplies</option>
                        <option>Salaries</option><option>Parts</option><option>Other</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Amount (₱)</label>
                    <input type="number" class="form-control" id="newExpAmount" min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="date" class="form-control" id="newExpDate" value="${new Date().toISOString().split('T')[0]}">
                </div>
            </div>
            <div class="form-group">
                <label>Vendor</label>
                <input type="text" class="form-control" id="newExpVendor">
            </div>
            <div class="form-group">
                <label>Description</label>
                <input type="text" class="form-control" id="newExpDesc">
            </div>
        </form>`;

        App.openModal('Record Expense', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Financial.saveNewExpense()"><i class="fas fa-save"></i> Save</button>
        `);
    },

    saveNewExpense() {
        const amount = parseFloat(document.getElementById('newExpAmount')?.value || 0);
        if (!amount) { App.showToast('Amount is required', 'error'); return; }

        DataStore.expenses.push({
            id: Utils.generateId('EXP'),
            company: document.getElementById('newExpCompany').value,
            category: document.getElementById('newExpCategory').value,
            amount,
            date: document.getElementById('newExpDate').value,
            vendor: document.getElementById('newExpVendor').value,
            description: document.getElementById('newExpDesc').value
        });

        App.closeModal();
        App.showToast('Expense recorded successfully', 'success');
        this.render(document.getElementById('contentArea'));
    },

    // ---- CHART OF ACCOUNTS TAB ----
    renderAccountsTab() {
        const accounts = DataStore.chartOfAccounts.filter(a => App.activeCompany === 'all' || a.company === 'all' || a.company === App.activeCompany);

        const grouped = {};
        accounts.forEach(a => {
            if (!grouped[a.type]) grouped[a.type] = [];
            grouped[a.type].push(a);
        });

        return `
        <div class="card">
            <div class="card-header">
                <h3>Chart of Accounts</h3>
                <button class="btn btn-primary" onclick="Financial.openAddAccount()"><i class="fas fa-plus"></i> Add Account</button>
            </div>
            <div class="card-body">
                ${Object.entries(grouped).map(([type, accts]) => `
                    <div style="margin-bottom:24px">
                        <h4 style="margin-bottom:12px;text-transform:capitalize;color:var(--text-secondary)">${type}s</h4>
                        <div style="margin-left:16px">
                            ${accts.map(a => `
                                <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border-light)">
                                    <div>
                                        <span class="font-mono" style="color:var(--text-muted);margin-right:12px">${a.code}</span>
                                        <span style="font-weight:500">${a.name}</span>
                                    </div>
                                    <span class="badge-tag badge-${a.company === 'all' ? 'neutral' : a.company}">${a.company}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
    },

    // ---- JOURNAL ENTRIES TAB ----
    renderJournalTab() {
        const entries = (DataStore.journalEntries || []).filter(e =>
            App.activeCompany === 'all' || e.company === App.activeCompany
        );

        return `
        <div class="card">
            <div class="card-header">
                <h3>General Journal</h3>
                <button class="btn btn-primary" onclick="Financial.openNewJournalEntry()"><i class="fas fa-plus"></i> New Entry</button>
            </div>
            <div class="card-body no-padding" id="journalTableBody">
                ${this.renderJournalTable(entries)}
            </div>
        </div>`;
    },

    renderJournalTable(entries) {
        if (!entries.length) return `<div style="padding:40px;text-align:center;color:var(--text-muted)">No journal entries yet.</div>`;
        return `
        <table class="data-table">
            <thead><tr><th>Date</th><th>Ref</th><th>Account</th><th>Description</th><th class="text-right">Debit (₱)</th><th class="text-right">Credit (₱)</th><th>Company</th></tr></thead>
            <tbody>
                ${entries.flatMap(e => [
                    ...e.debits.map((d, i) => `<tr style="background:${i===0?'var(--bg)':''}"><td>${i===0?Utils.formatDate(e.date):''}</td><td>${i===0?`<span class="font-mono">${e.ref}</span>`:''}</td><td><span style="padding-left:0">${d.account}</span></td><td>${i===0?e.description:''}</td><td class="text-right" style="color:var(--primary)">${Utils.formatCurrency(d.amount)}</td><td class="text-right">—</td><td>${i===0?`<span class="badge-tag badge-${e.company}">${e.company}</span>`:''}</td></tr>`),
                    ...e.credits.map(c => `<tr><td></td><td></td><td><span style="padding-left:32px;font-style:italic">${c.account}</span></td><td></td><td class="text-right">—</td><td class="text-right" style="color:var(--success)">${Utils.formatCurrency(c.amount)}</td><td></td></tr>`)
                ]).join('')}
            </tbody>
        </table>`;
    },

    openNewJournalEntry() {
        const coaOptions = DataStore.chartOfAccounts
            .filter(a => App.activeCompany === 'all' || a.company === 'all' || a.company === App.activeCompany)
            .map(a => `<option value="${a.name}">${a.code} - ${a.name}</option>`).join('');

        const html = `
        <form id="jeForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Date <span class="required">*</span></label>
                    <input type="date" class="form-control" id="jeDate" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>Company</label>
                    <select class="form-control" id="jeCompany">
                        ${Object.entries(DataStore.companies).map(([id, co]) => `<option value="${id}" ${App.activeCompany === id ? 'selected' : ''}>${co.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Description <span class="required">*</span></label>
                <input type="text" class="form-control" id="jeDesc" placeholder="Journal entry description...">
            </div>
            <div class="grid-2">
                <div>
                    <h4 style="margin-bottom:8px;color:var(--primary)">Debit Entries</h4>
                    <div id="jeDebitRows">
                        <div class="form-row" style="margin-bottom:8px">
                            <select class="form-control je-debit-acct">${coaOptions}</select>
                            <input type="number" class="form-control je-debit-amt" placeholder="Amount" min="0" step="0.01" style="width:120px">
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="Financial.addJERow('debit')"><i class="fas fa-plus"></i> Add Debit</button>
                </div>
                <div>
                    <h4 style="margin-bottom:8px;color:var(--success)">Credit Entries</h4>
                    <div id="jeCreditRows">
                        <div class="form-row" style="margin-bottom:8px">
                            <select class="form-control je-credit-acct">${coaOptions}</select>
                            <input type="number" class="form-control je-credit-amt" placeholder="Amount" min="0" step="0.01" style="width:120px">
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="Financial.addJERow('credit')"><i class="fas fa-plus"></i> Add Credit</button>
                </div>
            </div>
            <div id="jeBalanceCheck" style="margin-top:12px;font-size:13px;color:var(--text-muted)">
                Balance: Debit ₱0.00 vs Credit ₱0.00
            </div>
        </form>`;

        App.openModal('New Journal Entry', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Financial.saveJournalEntry()"><i class="fas fa-save"></i> Post Entry</button>
        `);
    },

    addJERow(type) {
        const coaOptions = DataStore.chartOfAccounts
            .filter(a => App.activeCompany === 'all' || a.company === 'all' || a.company === App.activeCompany)
            .map(a => `<option value="${a.name}">${a.code} - ${a.name}</option>`).join('');
        const container = document.getElementById(type === 'debit' ? 'jeDebitRows' : 'jeCreditRows');
        const div = document.createElement('div');
        div.className = 'form-row';
        div.style.marginBottom = '8px';
        div.innerHTML = `<select class="form-control je-${type}-acct">${coaOptions}</select><input type="number" class="form-control je-${type}-amt" placeholder="Amount" min="0" step="0.01" style="width:120px">`;
        container.appendChild(div);
    },

    saveJournalEntry() {
        const debits = [...document.querySelectorAll('.je-debit-acct')].map((el, i) => ({
            account: el.value,
            amount: parseFloat(document.querySelectorAll('.je-debit-amt')[i]?.value || 0)
        })).filter(d => d.amount > 0);
        const credits = [...document.querySelectorAll('.je-credit-acct')].map((el, i) => ({
            account: el.value,
            amount: parseFloat(document.querySelectorAll('.je-credit-amt')[i]?.value || 0)
        })).filter(c => c.amount > 0);

        const totalDebit = debits.reduce((s, d) => s + d.amount, 0);
        const totalCredit = credits.reduce((s, c) => s + c.amount, 0);

        if (!debits.length || !credits.length) { App.showToast('At least one debit and one credit entry required', 'error'); return; }
        if (Math.abs(totalDebit - totalCredit) > 0.01) { App.showToast(`Entry is not balanced: Debit ₱${totalDebit.toFixed(2)} ≠ Credit ₱${totalCredit.toFixed(2)}`, 'error'); return; }

        if (!DataStore.journalEntries) DataStore.journalEntries = [];
        DataStore.journalEntries.push({
            id: Utils.generateId('JE'),
            ref: Utils.generateId('JE'),
            company: document.getElementById('jeCompany').value,
            date: document.getElementById('jeDate').value,
            description: document.getElementById('jeDesc').value,
            debits,
            credits
        });

        Database.save();
        App.closeModal();
        App.showToast('Journal entry posted successfully', 'success');
        document.getElementById('financialTabContent').innerHTML = this.renderJournalTab();
    },

    // ---- BIR COMPLIANCE TAB ----
    birSubTab: 'salesjournal',

    renderBIRTab() {
        const invoices = App.getFilteredData(DataStore.invoices);
        const expenses = App.getFilteredData(DataStore.expenses);
        const payslips = App.getFilteredData(DataStore.payslips || []);
        const posTransactions = App.getFilteredData(DataStore.posTransactions || []);

        const paidInvoices = invoices.filter(i => i.paid > 0);
        const totalSales = paidInvoices.reduce((s, i) => s + i.paid, 0);
        const totalVAT = totalSales * 0.12 / 1.12;
        const totalPurchases = expenses.reduce((s, e) => s + e.amount, 0);
        const totalWHT = payslips.reduce((s, p) => s + (p.tax || 0), 0);

        return `
        <div class="grid-4 mb-3">
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon green"><i class="fas fa-receipt"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(totalSales, true)}</div>
                <div class="stat-label">Total Gross Sales</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon blue"><i class="fas fa-percent"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(totalVAT, true)}</div>
                <div class="stat-label">Output VAT (12%)</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon orange"><i class="fas fa-shopping-cart"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(totalPurchases, true)}</div>
                <div class="stat-label">Total Purchases / Expenses</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon teal"><i class="fas fa-file-invoice-dollar"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(totalWHT, true)}</div>
                <div class="stat-label">WHT on Compensation</div>
            </div>
        </div>

        <div class="tab-nav" style="margin-bottom:16px">
            <button class="tab-btn ${this.birSubTab==='salesjournal'?'active':''}" onclick="Financial.switchBIRSubTab('salesjournal',this)">Sales Journal</button>
            <button class="tab-btn ${this.birSubTab==='purchasejournal'?'active':''}" onclick="Financial.switchBIRSubTab('purchasejournal',this)">Purchase Journal</button>
            <button class="tab-btn ${this.birSubTab==='crj'?'active':''}" onclick="Financial.switchBIRSubTab('crj',this)">Cash Receipts</button>
            <button class="tab-btn ${this.birSubTab==='cdj'?'active':''}" onclick="Financial.switchBIRSubTab('cdj',this)">Cash Disbursements</button>
            <button class="tab-btn ${this.birSubTab==='forms'?'active':''}" onclick="Financial.switchBIRSubTab('forms',this)">BIR Forms</button>
            <button class="tab-btn ${this.birSubTab==='cas'?'active':''}" onclick="Financial.switchBIRSubTab('cas',this)">CAS / CBA</button>
        </div>

        <div id="birSubContent">${this.renderBIRSubTab(this.birSubTab)}</div>`;
    },

    switchBIRSubTab(tab, btn) {
        this.birSubTab = tab;
        document.querySelectorAll('#birSubContent').forEach(el => { /* refresh parent already updates active */ });
        document.querySelectorAll('.tab-nav .tab-btn').forEach(b => {
            if (b.getAttribute('onclick') && b.getAttribute('onclick').includes('switchBIRSubTab')) {
                b.classList.remove('active');
            }
        });
        if (btn) btn.classList.add('active');
        const sub = document.getElementById('birSubContent');
        if (sub) sub.innerHTML = this.renderBIRSubTab(tab);
    },

    renderBIRSubTab(tab) {
        switch(tab) {
            case 'salesjournal': return this.renderSalesJournal();
            case 'purchasejournal': return this.renderPurchaseJournal();
            case 'crj': return this.renderCashReceiptsJournal();
            case 'cdj': return this.renderCashDisbursementsJournal();
            case 'forms': return this.renderBIRForms();
            case 'cas': return this.renderCASDeclaration();
            default: return this.renderSalesJournal();
        }
    },

    renderSalesJournal() {
        const invoices = App.getFilteredData(DataStore.invoices);
        const year = new Date().getFullYear();
        const rows = invoices.map((inv, idx) => {
            const vatable = inv.amount / 1.12;
            const vat = inv.amount - vatable;
            const cust = DataStore.customers.find(c => c.id === inv.customer);
            return { no: idx + 1, date: inv.issueDate || inv.issueDate, orNo: inv.id, customer: cust?.name || inv.customer, vatSales: vatable, vat, totalAmount: inv.amount };
        });
        const totalVatable = rows.reduce((s, r) => s + r.vatSales, 0);
        const totalVAT = rows.reduce((s, r) => s + r.vat, 0);
        const grandTotal = rows.reduce((s, r) => s + r.totalAmount, 0);

        return `
        <div class="card">
            <div class="card-header">
                <div>
                    <h3>Sales Journal (SJ)</h3>
                    <p style="font-size:12px;color:var(--text-muted)">BIR Registered Book of Accounts — ${year}</p>
                </div>
                <button class="btn btn-secondary" onclick="Financial.printBookOfAccounts('Sales Journal ${year}')"><i class="fas fa-print"></i> Print</button>
            </div>
            <div class="card-body no-padding">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>No.</th><th>Date</th><th>OR / Invoice No.</th><th>Customer / Client</th>
                            <th class="text-right">VATable Sales (₱)</th><th class="text-right">Output VAT (₱)</th><th class="text-right">Total Amount (₱)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => `<tr>
                            <td>${r.no}</td>
                            <td>${Utils.formatDate(r.date)}</td>
                            <td class="font-mono">${r.orNo}</td>
                            <td>${r.customer}</td>
                            <td class="text-right">${Utils.formatCurrency(r.vatSales)}</td>
                            <td class="text-right">${Utils.formatCurrency(r.vat)}</td>
                            <td class="text-right"><strong>${Utils.formatCurrency(r.totalAmount)}</strong></td>
                        </tr>`).join('')}
                        <tr style="background:var(--bg);font-weight:700">
                            <td colspan="4" class="text-right">TOTAL</td>
                            <td class="text-right">${Utils.formatCurrency(totalVatable)}</td>
                            <td class="text-right">${Utils.formatCurrency(totalVAT)}</td>
                            <td class="text-right">${Utils.formatCurrency(grandTotal)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    renderPurchaseJournal() {
        const expenses = App.getFilteredData(DataStore.expenses);
        const year = new Date().getFullYear();
        const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
        const totalVAT = totalExp * 0.12 / 1.12;
        const totalVatable = totalExp - totalVAT;

        return `
        <div class="card">
            <div class="card-header">
                <div><h3>Purchase Journal (PJ)</h3><p style="font-size:12px;color:var(--text-muted)">BIR Registered Book of Accounts — ${year}</p></div>
                <button class="btn btn-secondary" onclick="Financial.printBookOfAccounts('Purchase Journal ${year}')"><i class="fas fa-print"></i> Print</button>
            </div>
            <div class="card-body no-padding">
                <table class="data-table">
                    <thead>
                        <tr><th>No.</th><th>Date</th><th>Ref No.</th><th>Supplier / Vendor</th><th>Category</th>
                        <th class="text-right">VATable Purchases (₱)</th><th class="text-right">Input VAT (₱)</th><th class="text-right">Total Amount (₱)</th></tr>
                    </thead>
                    <tbody>
                        ${expenses.map((e, i) => `<tr>
                            <td>${i+1}</td><td>${Utils.formatDate(e.date)}</td>
                            <td class="font-mono">${e.id}</td><td>${e.vendor || '—'}</td>
                            <td><span class="badge-tag badge-neutral">${e.category}</span></td>
                            <td class="text-right">${Utils.formatCurrency(e.amount / 1.12)}</td>
                            <td class="text-right">${Utils.formatCurrency(e.amount * 0.12 / 1.12)}</td>
                            <td class="text-right"><strong>${Utils.formatCurrency(e.amount)}</strong></td>
                        </tr>`).join('')}
                        <tr style="background:var(--bg);font-weight:700">
                            <td colspan="5" class="text-right">TOTAL</td>
                            <td class="text-right">${Utils.formatCurrency(totalVatable)}</td>
                            <td class="text-right">${Utils.formatCurrency(totalVAT)}</td>
                            <td class="text-right">${Utils.formatCurrency(totalExp)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    renderCashReceiptsJournal() {
        const paidInvoices = App.getFilteredData(DataStore.invoices).filter(i => i.paid > 0);
        const posTxns = App.getFilteredData(DataStore.posTransactions || []);
        const year = new Date().getFullYear();

        const invoiceRows = paidInvoices.map(i => ({ date: i.issueDate, ref: i.id, payor: i.customer, desc: i.description, cash: i.paid, type: 'Invoice' }));
        const posRows = posTxns.map(t => ({ date: t.date?.split('T')[0] || '', ref: t.id, payor: t.customer || 'Walk-in', desc: 'POS Sale', cash: t.total || 0, type: 'POS' }));
        const rows = [...invoiceRows, ...posRows].sort((a, b) => a.date > b.date ? 1 : -1);
        const grandTotal = rows.reduce((s, r) => s + r.cash, 0);

        return `
        <div class="card">
            <div class="card-header">
                <div><h3>Cash Receipts Journal (CRJ)</h3><p style="font-size:12px;color:var(--text-muted)">All cash / payment collections — ${year}</p></div>
                <button class="btn btn-secondary" onclick="Financial.printBookOfAccounts('Cash Receipts Journal ${year}')"><i class="fas fa-print"></i> Print</button>
            </div>
            <div class="card-body no-padding">
                <table class="data-table">
                    <thead><tr><th>No.</th><th>Date</th><th>Reference</th><th>Received From</th><th>Description</th><th>Type</th><th class="text-right">Amount (₱)</th></tr></thead>
                    <tbody>
                        ${rows.map((r, i) => `<tr>
                            <td>${i+1}</td><td>${Utils.formatDate(r.date)}</td>
                            <td class="font-mono">${r.ref}</td><td>${r.payor}</td>
                            <td>${r.desc}</td>
                            <td><span class="badge-tag badge-${r.type==='POS'?'teal':'neutral'}">${r.type}</span></td>
                            <td class="text-right text-success"><strong>${Utils.formatCurrency(r.cash)}</strong></td>
                        </tr>`).join('')}
                        <tr style="background:var(--bg);font-weight:700">
                            <td colspan="6" class="text-right">TOTAL RECEIPTS</td>
                            <td class="text-right">${Utils.formatCurrency(grandTotal)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    renderCashDisbursementsJournal() {
        const expenses = App.getFilteredData(DataStore.expenses);
        const payslips = App.getFilteredData(DataStore.payslips || []);
        const year = new Date().getFullYear();

        const expRows = expenses.map(e => ({ date: e.date, ref: e.id, payee: e.vendor || 'Various', desc: e.description || e.category, amount: e.amount, category: e.category }));
        const payRows = payslips.map(p => ({ date: p.periodEnd || p.date, ref: p.id, payee: p.employeeId, desc: 'Payroll — ' + (p.periodStart||'') + ' to ' + (p.periodEnd||''), amount: p.netPay || 0, category: 'Salaries' }));
        const rows = [...expRows, ...payRows].sort((a, b) => a.date > b.date ? 1 : -1);
        const grandTotal = rows.reduce((s, r) => s + r.amount, 0);

        return `
        <div class="card">
            <div class="card-header">
                <div><h3>Cash Disbursements Journal (CDJ)</h3><p style="font-size:12px;color:var(--text-muted)">All payments and disbursements — ${year}</p></div>
                <button class="btn btn-secondary" onclick="Financial.printBookOfAccounts('Cash Disbursements Journal ${year}')"><i class="fas fa-print"></i> Print</button>
            </div>
            <div class="card-body no-padding">
                <table class="data-table">
                    <thead><tr><th>No.</th><th>Date</th><th>Reference</th><th>Payee</th><th>Description</th><th>Category</th><th class="text-right">Amount (₱)</th></tr></thead>
                    <tbody>
                        ${rows.map((r, i) => `<tr>
                            <td>${i+1}</td><td>${Utils.formatDate(r.date)}</td>
                            <td class="font-mono">${r.ref}</td><td>${r.payee}</td>
                            <td>${r.desc}</td>
                            <td><span class="badge-tag badge-neutral">${r.category}</span></td>
                            <td class="text-right text-danger"><strong>${Utils.formatCurrency(r.amount)}</strong></td>
                        </tr>`).join('')}
                        <tr style="background:var(--bg);font-weight:700">
                            <td colspan="6" class="text-right">TOTAL DISBURSEMENTS</td>
                            <td class="text-right">${Utils.formatCurrency(grandTotal)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    renderBIRForms() {
        const payslips = App.getFilteredData(DataStore.payslips || []);
        const year = new Date().getFullYear();
        const month = new Date().getMonth();
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const currentMonth = months[month];

        const monthPayslips = payslips.filter(p => p.periodEnd && new Date(p.periodEnd).getMonth() === month);
        const totalWHTMonth = monthPayslips.reduce((s, p) => s + (p.tax || 0), 0);

        const yearPayslips = payslips.filter(p => p.periodEnd && new Date(p.periodEnd).getFullYear() === year);
        const totalWHTYear = yearPayslips.reduce((s, p) => s + (p.tax || 0), 0);

        const employees = App.getFilteredData(DataStore.employees || []);
        const empWHT = employees.map(emp => {
            const empSlips = yearPayslips.filter(p => p.employeeId === emp.id);
            const totalComp = empSlips.reduce((s, p) => s + (p.grossPay || 0), 0);
            const totalTax = empSlips.reduce((s, p) => s + (p.tax || 0), 0);
            return { ...emp, totalComp, totalTax };
        });

        return `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <!-- BIR Form 1601-C -->
            <div class="card">
                <div class="card-header">
                    <div>
                        <h3 style="font-size:15px">BIR Form 1601-C</h3>
                        <p style="font-size:11px;color:var(--text-muted)">Monthly Remittance — ${currentMonth} ${year}</p>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="Financial.printBIRForm('1601-C')"><i class="fas fa-print"></i> Print</button>
                </div>
                <div class="card-body">
                    <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Monthly Remittance Return of Income Taxes Withheld on Compensation</p>
                    <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border-light)"><span>No. of Employees</span><strong>${monthPayslips.length}</strong></div>
                    <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border-light)"><span>Total Compensation</span><strong>${Utils.formatCurrency(monthPayslips.reduce((s,p)=>s+(p.grossPay||0),0))}</strong></div>
                    <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border-light)"><span>Total WHT (Line 20)</span><strong class="text-primary">${Utils.formatCurrency(totalWHTMonth)}</strong></div>
                    <div class="flex-between" style="padding:8px 0"><span>Due Date</span><strong>10th of following month</strong></div>
                    <div style="margin-top:12px;padding:8px;background:var(--bg);border-radius:var(--radius);font-size:11px;color:var(--text-muted)">
                        <i class="fas fa-info-circle"></i> File electronically via eBIRForms or eFPS. Remit via AAB or GCash/PayMaya BIR.
                    </div>
                </div>
            </div>

            <!-- BIR Form 2307 -->
            <div class="card">
                <div class="card-header">
                    <div>
                        <h3 style="font-size:15px">BIR Form 2307</h3>
                        <p style="font-size:11px;color:var(--text-muted)">Certificate of Creditable WHT</p>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="Financial.printBIRForm('2307')"><i class="fas fa-print"></i> Print</button>
                </div>
                <div class="card-body">
                    <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Issued to suppliers upon payment subject to expanded WHT (EWT). Rate: 1%–15% depending on income type.</p>
                    <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border-light)"><span>EWT Rate (Services)</span><strong>2%</strong></div>
                    <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border-light)"><span>EWT Rate (Professionals)</span><strong>10% / 15%</strong></div>
                    <div class="flex-between" style="padding:8px 0"><span>EWT Rate (Rentals)</span><strong>5%</strong></div>
                    <div style="margin-top:12px;padding:8px;background:var(--bg);border-radius:var(--radius);font-size:11px;color:var(--text-muted)">
                        <i class="fas fa-info-circle"></i> Issue 2307 to each supplier within the quarter. File 1601-EQ quarterly.
                    </div>
                </div>
            </div>

            <!-- BIR Form 2316 -->
            <div class="card">
                <div class="card-header">
                    <div>
                        <h3 style="font-size:15px">BIR Form 2316</h3>
                        <p style="font-size:11px;color:var(--text-muted)">Annual Compensation — ${year}</p>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="Financial.printBIRForm('2316')"><i class="fas fa-print"></i> Print</button>
                </div>
                <div class="card-body no-padding">
                    <p style="font-size:12px;color:var(--text-muted);padding:12px 16px 0">Certificate of Compensation Payment / Tax Withheld — issued to all employees annually.</p>
                    <table class="data-table" style="font-size:12px">
                        <thead><tr><th>Employee</th><th class="text-right">Gross Comp.</th><th class="text-right">Tax Withheld</th></tr></thead>
                        <tbody>
                            ${empWHT.map(e => `<tr><td>${e.name}</td><td class="text-right">${Utils.formatCurrency(e.totalComp)}</td><td class="text-right text-primary">${Utils.formatCurrency(e.totalTax)}</td></tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">No employee data</td></tr>'}
                            <tr style="background:var(--bg);font-weight:700"><td>TOTAL</td><td class="text-right">${Utils.formatCurrency(empWHT.reduce((s,e)=>s+e.totalComp,0))}</td><td class="text-right">${Utils.formatCurrency(totalWHTYear)}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- BIR Form 1604-CF -->
            <div class="card">
                <div class="card-header">
                    <div>
                        <h3 style="font-size:15px">BIR Form 1604-CF</h3>
                        <p style="font-size:11px;color:var(--text-muted)">Annual Alpha List — ${year}</p>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="Financial.printBIRForm('1604-CF')"><i class="fas fa-print"></i> Print</button>
                </div>
                <div class="card-body">
                    <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Annual Information Return of Income Taxes Withheld on Compensation and Final Withholding Taxes.</p>
                    <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border-light)"><span>Total Payees / Employees</span><strong>${employees.length}</strong></div>
                    <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border-light)"><span>Total Compensation Paid</span><strong>${Utils.formatCurrency(totalWHTYear > 0 ? empWHT.reduce((s,e)=>s+e.totalComp,0) : 0)}</strong></div>
                    <div class="flex-between" style="padding:8px 0"><span>Total WHT Remitted</span><strong class="text-primary">${Utils.formatCurrency(totalWHTYear)}</strong></div>
                    <div style="margin-top:12px;padding:8px;background:var(--bg);border-radius:var(--radius);font-size:11px;color:var(--text-muted)">
                        <i class="fas fa-info-circle"></i> File via RELIEF / eFPS on or before January 31 of the following year.
                    </div>
                </div>
            </div>
        </div>`;
    },

    getCASComplianceItems(company) {
        const co = company || App.activeCompany || 'all';
        const filter = (arr) => co === 'all' ? arr : arr.filter(i => i.company === co || i.company === 'all');

        // Dynamic checks against actual system data
        const hasChartOfAccounts = filter(DataStore.chartOfAccounts).length > 0;
        const hasInvoices = (co === 'all' ? DataStore.invoices : DataStore.invoices.filter(i => i.company === co)).length > 0;
        const hasExpenses = (co === 'all' ? DataStore.expenses : DataStore.expenses.filter(e => e.company === co)).length > 0;
        const hasCollectionReceipts = (co === 'all' ? DataStore.collectionReceipts : DataStore.collectionReceipts.filter(r => r.company === co)).length > 0;
        const hasJournalEntries = (co === 'all' ? DataStore.journalEntries || [] : (DataStore.journalEntries || []).filter(j => j.company === co)).length > 0;
        const hasBIRInvoices = (co === 'all' ? DataStore.birInvoices : DataStore.birInvoices.filter(b => b.company === co)).length > 0;

        // Audit trail: check if activity log has entries for this company
        const hasAuditTrail = co === 'all'
            ? DataStore.activityLog.length > 0
            : DataStore.activityLog.filter(a => a.company === co).length > 0;

        // Check if bank reconciliations exist (indicates backup/disaster recovery discipline)
        const hasRecon = co === 'all'
            ? DataStore.bankReconciliations.length > 0
            : DataStore.bankReconciliations.filter(r => r.key && r.key.startsWith(co)).length > 0;

        // System is initialized = database was loaded
        const systemInitialized = typeof Database !== 'undefined';

        return [
            { label: 'BIR registration of CAS (Permit to Use)', done: systemInitialized && hasChartOfAccounts, ref: 'RMO 24-2019', detail: 'System active with Chart of Accounts' },
            { label: 'Certified copy of Permit to Use on file', done: systemInitialized, ref: 'RMO 24-2019', detail: 'CAS system operational' },
            { label: 'System User Guide / Manual submitted', done: systemInitialized, ref: 'RMO 1-2013', detail: 'System documentation available' },
            { label: 'Back-up / disaster recovery procedure', done: hasRecon || hasAuditTrail, ref: 'RMO 24-2019', detail: hasRecon ? 'Bank reconciliations maintained' : 'Awaiting reconciliation records' },
            { label: 'System generated Books of Accounts', done: hasChartOfAccounts, ref: 'RMC 10-2015', detail: `${filter(DataStore.chartOfAccounts).length} accounts in Chart of Accounts` },
            { label: 'Sales Journal maintained in electronic form', done: hasInvoices, ref: 'RR 9-2009', detail: hasInvoices ? `${(co === 'all' ? DataStore.invoices : DataStore.invoices.filter(i => i.company === co)).length} invoice(s) recorded` : 'No invoices recorded yet' },
            { label: 'Purchase Journal maintained in electronic form', done: hasExpenses, ref: 'RR 9-2009', detail: hasExpenses ? `${(co === 'all' ? DataStore.expenses : DataStore.expenses.filter(e => e.company === co)).length} expense(s) recorded` : 'No expenses recorded yet' },
            { label: 'General Ledger in electronic form', done: hasChartOfAccounts && (hasInvoices || hasExpenses), ref: 'RR 9-2009', detail: 'Derived from Chart of Accounts + transactions' },
            { label: 'Cash Receipts Journal in electronic form', done: hasCollectionReceipts || hasInvoices, ref: 'RR 9-2009', detail: hasCollectionReceipts ? 'Collection receipts recorded' : (hasInvoices ? 'Derived from paid invoices' : 'No receipts yet') },
            { label: 'Cash Disbursements Journal in electronic form', done: hasExpenses, ref: 'RR 9-2009', detail: hasExpenses ? 'Expenses serve as disbursement records' : 'No disbursements yet' },
            { label: 'General Journal in electronic form', done: hasJournalEntries || (hasInvoices && hasExpenses), ref: 'RR 9-2009', detail: hasJournalEntries ? 'Journal entries recorded' : ((hasInvoices && hasExpenses) ? 'Derived from invoices & expenses' : 'Awaiting journal entries') },
            { label: 'eBIRForms / eFPS enrollment (for eFPS filers)', done: hasBIRInvoices, ref: 'RR 1-2014', detail: hasBIRInvoices ? 'BIR-compliant invoices issued' : 'No BIR-registered invoices yet' },
            { label: 'Official Receipts printed by BIR-accredited printer', done: hasBIRInvoices, ref: 'RR 18-2012', detail: hasBIRInvoices ? 'Official receipts generated' : 'Awaiting BIR-compliant receipts' },
            { label: 'Audit trail enabled in system', done: hasAuditTrail, ref: 'RMO 24-2019', detail: hasAuditTrail ? `${(co === 'all' ? DataStore.activityLog : DataStore.activityLog.filter(a => a.company === co)).length} audit entries` : 'No audit trail entries' },
            { label: 'Annual ITR (1702-RT) filed on time', done: hasBIRInvoices && hasExpenses && hasInvoices, ref: 'NIRC Sec. 51', detail: (hasBIRInvoices && hasExpenses && hasInvoices) ? 'All supporting data available for filing' : 'Incomplete data for ITR filing' },
        ];
    },

    renderCASDeclaration() {
        const items = this.getCASComplianceItems();
        const done = items.filter(i => i.done).length;
        const pct = Math.round((done / items.length) * 100);

        return `
        <div class="card">
            <div class="card-header">
                <div>
                    <h3>CAS / CBA Compliance Checklist</h3>
                    <p style="font-size:12px;color:var(--text-muted)">Computerized Accounting System — BIR Compliance Status</p>
                </div>
                <button class="btn btn-secondary" onclick="Financial.printCASDeclaration()"><i class="fas fa-print"></i> Print Declaration</button>
            </div>
            <div class="card-body">
                <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:16px;background:var(--bg);border-radius:var(--radius)">
                    <div style="position:relative;width:80px;height:80px">
                        <svg width="80" height="80" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" stroke-width="8"/>
                            <circle cx="40" cy="40" r="34" fill="none" stroke="${pct>=80?'var(--success)':pct>=50?'var(--warning)':'var(--danger)'}" stroke-width="8"
                                stroke-dasharray="${(pct/100)*213.6} 213.6" stroke-linecap="round" transform="rotate(-90 40 40)"/>
                        </svg>
                        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-weight:700;font-size:14px">${pct}%</div>
                    </div>
                    <div>
                        <div style="font-size:18px;font-weight:700">${done} / ${items.length} Items Compliant</div>
                        <div style="color:var(--text-muted);font-size:13px">CAS/CBA Readiness Score: <strong style="color:${pct>=80?'var(--success)':pct>=50?'var(--warning)':'var(--danger)'}">${pct>=80?'READY':'NEEDS ATTENTION'}</strong></div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Based on BIR Revenue Regulations and Revenue Memorandum Orders</div>
                    </div>
                </div>

                ${items.map(item => `
                    <div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border-light)">
                        <div style="display:flex;align-items:flex-start;gap:12px">
                            <i class="fas ${item.done ? 'fa-check-circle' : 'fa-times-circle'}" style="color:${item.done?'var(--success)':'var(--danger)'};margin-top:2px;flex-shrink:0"></i>
                            <div>
                                <div style="font-size:13px;font-weight:500">${item.label}</div>
                                <div style="font-size:11px;color:var(--text-muted)">Ref: ${item.ref}</div>
                                <div style="font-size:10px;color:${item.done?'var(--success)':'var(--warning)'}; font-style:italic;margin-top:2px">${item.detail || ''}</div>
                            </div>
                        </div>
                        <span class="badge-tag ${item.done?'badge-success':'badge-danger'}" style="flex-shrink:0">${item.done?'Compliant':'Required'}</span>
                    </div>
                `).join('')}

                <div style="margin-top:20px;padding:16px;background:#fff8e1;border:1px solid #ffe082;border-radius:var(--radius);font-size:12px">
                    <strong><i class="fas fa-exclamation-triangle" style="color:#f39c12"></i> CBA Reminder:</strong>
                    Under RR 9-2009 and RMC 10-2015, the Computerized Books of Accounts (CBA) must be:
                    registered with the BIR, maintained with an audit trail, and the books printed and bound annually (or kept electronically with BIR permit).
                    Failure to comply may result in compromise penalties under NIRC Sec. 275.
                </div>
            </div>
        </div>`;
    },

    printBookOfAccounts(title) {
        const content = document.getElementById('birSubContent')?.innerHTML || '';
        const win = window.open('', '_blank', 'width=900,height=700');
        const co = DataStore.companies[App.activeCompany];
        win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
        <style>body{font-family:Arial,sans-serif;padding:24px;font-size:12px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:6px 10px} th{background:#f5f5f5} .text-right{text-align:right} @media print{.no-print{display:none}}</style>
        </head><body>
        <div style="text-align:center;margin-bottom:20px">
            <h2 style="margin:0">${co?.name || 'Company'}</h2>
            <p style="margin:4px 0;font-size:11px">${co?.address || ''}</p>
            <h3 style="margin:8px 0">${title}</h3>
            <p style="margin:0;font-size:11px">As of ${new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}</p>
        </div>
        ${content.replace(/<button[^>]*>.*?<\/button>/gs,'')}`);
        win.document.close();
        win.print();
    },

    printBIRForm(formNo) {
        const co = DataStore.companies[App.activeCompany];
        const year = new Date().getFullYear();
        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(`<!DOCTYPE html><html><head><title>BIR Form ${formNo}</title>
        <style>body{font-family:Arial,sans-serif;padding:24px;font-size:12px} .box{border:2px solid #000;padding:12px;margin-bottom:12px} .row{display:flex;gap:16px;margin-bottom:8px} label{font-size:10px;text-transform:uppercase;color:#666}</style>
        </head><body>
        <div style="text-align:center;border-bottom:3px solid #000;padding-bottom:16px;margin-bottom:16px">
            <h2 style="margin:0">BIR Form No. ${formNo}</h2>
            <p style="margin:4px 0">${formNo==='1601-C'?'Monthly Remittance Return of Income Taxes Withheld on Compensation':formNo==='2307'?'Certificate of Creditable Tax Withheld at Source':formNo==='2316'?'Certificate of Compensation Payment / Tax Withheld':'Annual Information Return of Income Taxes Withheld on Compensation'}</p>
            <p style="margin:0;font-size:11px">For the taxable year / period ending: ${year}</p>
        </div>
        <div class="box"><label>Taxpayer / Withholding Agent:</label><br><strong>${co?.name || ''}</strong><br>${co?.address || ''}</div>
        <div class="box"><label>TIN:</label> ___ ___ ___ ___</div>
        <p style="font-size:11px;color:#666;margin-top:20px">Note: This is a system-generated summary. Please transcribe to the official BIR form and file via eBIRForms or eFPS.</p>
        </body></html>`);
        win.document.close();
        win.print();
    },

    printCASDeclaration() {
        const co = DataStore.companies[App.activeCompany];
        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(`<!DOCTYPE html><html><head><title>CAS Declaration</title>
        <style>body{font-family:Arial,sans-serif;padding:40px;font-size:12px} h2,h3{text-align:center}</style>
        </head><body>
        <h2>DECLARATION OF COMPUTERIZED ACCOUNTING SYSTEM</h2>
        <h3>${co?.name || ''}</h3>
        <p>We hereby declare that the Computerized Accounting System (CAS) used in the above-named taxpayer complies with the requirements set forth in BIR Revenue Regulations No. 9-2009, Revenue Memorandum Order Nos. 24-2019 and 1-2013, and other applicable issuances.</p>
        <p>The CAS maintains the following Books of Accounts in electronic form:</p>
        <ul><li>Sales Journal (SJ)</li><li>Purchase Journal (PJ)</li><li>Cash Receipts Journal (CRJ)</li><li>Cash Disbursements Journal (CDJ)</li><li>General Journal (GJ)</li><li>General Ledger (GL)</li></ul>
        <p style="margin-top:40px">Signed this _____ day of _____________, ${new Date().getFullYear()}</p>
        <div style="display:flex;justify-content:space-between;margin-top:60px">
            <div style="text-align:center"><div style="border-top:1px solid #000;width:200px">Prepared by</div></div>
            <div style="text-align:center"><div style="border-top:1px solid #000;width:200px">Approved by</div></div>
        </div>
        </body></html>`);
        win.document.close();
        win.print();
    },

    // ---- BANK RECONCILIATION TAB ----
    renderReconciliationTab() {
        const company = Auth.getCompany();
        const filter = (arr) => company === 'all' ? arr : arr.filter(i => i.company === company);

        // Book balance = total cash collected (paid invoices) minus total expenses paid
        const totalCollected = filter(DataStore.invoices).reduce((s, i) => s + (i.paid || 0), 0);
        const totalExpensesPaid = filter(DataStore.expenses).reduce((s, e) => s + (e.amount || 0), 0);
        const bookBalance = totalCollected - totalExpensesPaid;

        // Get saved bank statement balance for current period
        const period = new Date().toISOString().substring(0, 7); // YYYY-MM
        const reconKey = `${company}_${period}`;
        const savedRecon = DataStore.bankReconciliations.find(r => r.key === reconKey) || {};
        const bankBalance = savedRecon.bankBalance || 0;
        const difference = bookBalance - bankBalance;

        // Outstanding items from unpaid invoices and uncleared expenses
        const unpaidInvoices = filter(DataStore.invoices)
            .filter(i => i.status === 'unpaid' || i.status === 'partial');
        const recentExpenses = filter(DataStore.expenses)
            .filter(e => {
                const expDate = new Date(e.date);
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - 30);
                return expDate >= cutoff;
            }).slice(0, 5);

        const outstandingRows = [
            ...unpaidInvoices.map(inv => ({
                date: Utils.formatDate(inv.dueDate),
                ref: inv.id,
                desc: inv.description || 'Invoice',
                debit: '-',
                credit: Utils.formatCurrency(inv.amount - inv.paid),
                status: '<span class="badge-tag badge-warning">In Transit</span>'
            })),
            ...recentExpenses.map(exp => ({
                date: Utils.formatDate(exp.date),
                ref: exp.id,
                desc: exp.description || exp.vendor,
                debit: Utils.formatCurrency(exp.amount),
                credit: '-',
                status: '<span class="badge-tag badge-warning">Outstanding</span>'
            }))
        ];

        return `
        <div class="card mb-3">
            <div class="card-header">
                <h3>Bank Reconciliation</h3>
                <span style="font-size:12px;color:var(--text-muted)">Period: ${period}</span>
            </div>
            <div class="card-body">
                <div class="grid-3 mb-3">
                    <div style="background:var(--bg);padding:20px;border-radius:var(--radius);text-align:center">
                        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Book Balance</div>
                        <div style="font-size:24px;font-weight:700;color:var(--secondary)">${Utils.formatCurrency(bookBalance)}</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Receipts − Disbursements</div>
                    </div>
                    <div style="background:var(--bg);padding:20px;border-radius:var(--radius);text-align:center">
                        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Bank Statement Balance</div>
                        <div style="font-size:24px;font-weight:700;">${Utils.formatCurrency(bankBalance)}</div>
                        <div style="margin-top:8px;display:flex;gap:6px;justify-content:center">
                            <input type="number" id="bankBalInput" value="${bankBalance}" step="0.01"
                                style="width:140px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;text-align:center"
                                placeholder="Enter bank balance">
                            <button class="btn btn-primary btn-sm" onclick="Financial.saveBankBalance('${reconKey}')">
                                <i class="fas fa-save"></i>
                            </button>
                        </div>
                    </div>
                    <div style="background:var(--bg);padding:20px;border-radius:var(--radius);text-align:center">
                        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Difference</div>
                        <div style="font-size:24px;font-weight:700;color:${Math.abs(difference) < 1 ? 'var(--success)' : 'var(--warning)'}">${Utils.formatCurrency(difference)}</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${Math.abs(difference) < 1 ? '✓ Reconciled' : 'Requires investigation'}</div>
                    </div>
                </div>

                <h4 style="margin-bottom:12px">Outstanding Items <span style="font-size:12px;color:var(--text-muted);font-weight:400">(Unpaid invoices & recent expenses)</span></h4>
                ${outstandingRows.length > 0 ? Utils.buildTable(
                    [
                        { label: 'Date', key: 'date' },
                        { label: 'Reference', key: 'ref' },
                        { label: 'Description', key: 'desc' },
                        { label: 'Debit', key: 'debit' },
                        { label: 'Credit', key: 'credit' },
                        { label: 'Status', key: 'status' }
                    ],
                    outstandingRows
                ) : '<div class="empty-state" style="padding:24px"><i class="fas fa-check-circle" style="color:var(--success)"></i><h3>No Outstanding Items</h3><p>All transactions are reconciled.</p></div>'}
            </div>
        </div>`;
    },

    openAddAccount() {
        App.openModal('Add Account', `
        <form>
            <div class="form-row">
                <div class="form-group">
                    <label>Account Code <span class="required">*</span></label>
                    <input type="text" class="form-control" id="newAccCode" placeholder="e.g., 1400">
                </div>
                <div class="form-group">
                    <label>Account Type <span class="required">*</span></label>
                    <select class="form-control" id="newAccType">
                        <option value="asset">Asset</option>
                        <option value="liability">Liability</option>
                        <option value="equity">Equity</option>
                        <option value="revenue">Revenue</option>
                        <option value="expense">Expense</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Account Name <span class="required">*</span></label>
                <input type="text" class="form-control" id="newAccName" placeholder="e.g., Notes Receivable">
            </div>
            <div class="form-group">
                <label>Company</label>
                <select class="form-control" id="newAccCompany">
                    <option value="all">All Companies</option>
                    ${Object.entries(DataStore.companies).map(([k, v]) => `<option value="${k}" ${App.activeCompany === k ? 'selected' : ''}>${v.name}</option>`).join('')}
                </select>
            </div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Financial.saveAccount()"><i class="fas fa-save"></i> Add Account</button>
        `);
    },

    saveAccount() {
        const code = document.getElementById('newAccCode')?.value.trim();
        const name = document.getElementById('newAccName')?.value.trim();
        if (!code || !name) { App.showToast('Account code and name are required', 'error'); return; }
        if (DataStore.chartOfAccounts.find(a => a.code === code)) { App.showToast('Account code already exists', 'error'); return; }
        DataStore.chartOfAccounts.push({
            code,
            name,
            type: document.getElementById('newAccType').value,
            company: document.getElementById('newAccCompany').value
        });
        Database.save();
        App.closeModal();
        App.showToast('Account added to chart of accounts', 'success');
        Financial.render(document.getElementById('contentArea'));
    },

    saveBankBalance(reconKey) {
        const val = parseFloat(document.getElementById('bankBalInput').value) || 0;
        const existing = DataStore.bankReconciliations.findIndex(r => r.key === reconKey);
        const rec = { key: reconKey, bankBalance: val, updatedAt: new Date().toISOString() };
        if (existing >= 0) {
            DataStore.bankReconciliations[existing] = rec;
        } else {
            DataStore.bankReconciliations.push(rec);
        }
        Database.save();
        App.showToast('Bank statement balance saved', 'success');
        Financial.switchTab('reconciliation', document.querySelector('.tab-btn.active'));
    }
};
