/* ========================================
   UBMS - BIR-Compliant Invoice Generator
   Charge Invoice, Collection Receipt,
   Service Invoice, Sales Invoice, OR, BS
   Per BIR Revenue Regulations
   ======================================== */

const Invoicing = {
    // Invoice types available per business type
    invoiceTypesByBusiness: {
        construction: [
            { value: 'charge-invoice', label: 'Charge Invoice (CI)', abbr: 'CI' },
            { value: 'collection-receipt', label: 'Collection Receipt (CR)', abbr: 'CR' },
            { value: 'service-invoice', label: 'Service Invoice (SVI)', abbr: 'SVI' },
            { value: 'sales-invoice', label: 'Sales Invoice (SI)', abbr: 'SI' }
        ],
        wellness: [
            { value: 'service-invoice', label: 'Service Invoice (SVI)', abbr: 'SVI' }
        ],
        automotive: [
            { value: 'sales-invoice', label: 'Sales Invoice (SI)', abbr: 'SI' },
            { value: 'service-invoice', label: 'Service Invoice (SVI)', abbr: 'SVI' }
        ]
    },

    getAllInvoiceTypes() {
        return [
            { value: 'charge-invoice', label: 'Charge Invoice (CI)', abbr: 'CI' },
            { value: 'collection-receipt', label: 'Collection Receipt (CR)', abbr: 'CR' },
            { value: 'service-invoice', label: 'Service Invoice (SVI)', abbr: 'SVI' },
            { value: 'sales-invoice', label: 'Sales Invoice (SI)', abbr: 'SI' },
            { value: 'official-receipt', label: 'Official Receipt (OR)', abbr: 'OR' },
            { value: 'billing-statement', label: 'Billing Statement (BS)', abbr: 'BS' }
        ];
    },

    getInvoiceTypesForCompany(companyId) {
        if (!companyId || companyId === 'all') return this.getAllInvoiceTypes();
        const type = DataStore.companies[companyId]?.type;
        return this.invoiceTypesByBusiness[type] || this.getAllInvoiceTypes();
    },

    getTypeLabel(invoiceType) {
        const all = this.getAllInvoiceTypes();
        const found = all.find(t => t.value === invoiceType);
        return found ? found.label : invoiceType;
    },

    getTypeAbbr(invoiceType) {
        const all = this.getAllInvoiceTypes();
        const found = all.find(t => t.value === invoiceType);
        return found ? found.abbr : invoiceType;
    },

    // ============================================================
    //  RENDER MAIN VIEW
    // ============================================================
    render(container) {
        const invoices = this.getFilteredInvoices();
        const totalSales = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
        const totalVat = invoices.reduce((s, i) => s + (i.vatAmount || 0), 0);
        const pending = invoices.filter(i => i.status === 'draft');
        const issued = invoices.filter(i => i.status === 'issued');

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon teal"><i class="fas fa-file-invoice"></i></div></div><div class="stat-value">${invoices.length}</div><div class="stat-label">Total Invoices</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-peso-sign"></i></div></div><div class="stat-value">${Utils.formatCurrency(totalSales)}</div><div class="stat-label">Total Sales</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-percentage"></i></div></div><div class="stat-value">${Utils.formatCurrency(totalVat)}</div><div class="stat-label">Total VAT (12%)</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-check-double"></i></div></div><div class="stat-value">${issued.length} / ${pending.length}</div><div class="stat-label">Issued / Drafts</div></div>
        </div>

        <div class="section-header mb-2">
            <h2>BIR-Compliant Invoices</h2>
            <div class="section-actions">
                <select class="form-control" style="width:180px" id="invTypeFilter" onchange="Invoicing.filterView()">
                    <option value="all">All Types</option>
                    ${this.getInvoiceTypesForCompany(App.activeCompany).map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
                </select>
                <select class="form-control" style="width:130px" id="invStatusFilter" onchange="Invoicing.filterView()">
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="issued">Issued</option>
                    <option value="paid">Paid</option>
                    <option value="void">Void</option>
                </select>
                <button class="btn btn-primary" onclick="Invoicing.openCreate()"><i class="fas fa-plus"></i> New Invoice</button>
            </div>
        </div>

        <div class="card">
            <div class="card-body no-padding" id="birInvoiceTableContainer">
                ${this.buildTable(invoices)}
            </div>
        </div>`;
    },

    getFilteredInvoices() {
        return App.activeCompany === 'all'
            ? DataStore.birInvoices
            : DataStore.birInvoices.filter(i => i.company === App.activeCompany);
    },

    filterView() {
        const type = document.getElementById('invTypeFilter')?.value || 'all';
        const status = document.getElementById('invStatusFilter')?.value || 'all';
        let invoices = this.getFilteredInvoices();
        if (type !== 'all') invoices = invoices.filter(i => i.invoiceType === type);
        if (status !== 'all') invoices = invoices.filter(i => i.status === status);
        document.getElementById('birInvoiceTableContainer').innerHTML = this.buildTable(invoices);
    },

    buildTable(invoices) {
        if (invoices.length === 0) {
            return '<div class="empty-state"><i class="fas fa-file-invoice"></i><h3>No Invoices Yet</h3><p>Create your first BIR-compliant invoice or official receipt.</p></div>';
        }
        return Utils.buildTable([
            { label: 'Series No.', render: r => `<strong style="font-family:monospace">${r.seriesNo || r.id}</strong>` },
            { label: 'Date', render: r => Utils.formatDate(r.date) },
            { label: 'Type', render: r => {
                return `<span class="badge-tag badge-info">${Invoicing.getTypeAbbr(r.invoiceType)}</span>`;
            }},
            { label: 'Customer', render: r => `<strong>${r.customerName}</strong>${r.customerTin ? `<div style="font-size:11px;color:var(--text-muted)">TIN: ${r.customerTin}</div>` : ''}` },
            { label: 'Company', render: r => `<span class="badge-tag badge-${r.company}">${r.company}</span>` },
            { label: 'Vatable Sales', render: r => Utils.formatCurrency(r.vatableSales || 0) },
            { label: 'VAT (12%)', render: r => Utils.formatCurrency(r.vatAmount || 0) },
            { label: 'Total', render: r => `<strong>${Utils.formatCurrency(r.totalAmount || 0)}</strong>` },
            { label: 'Status', render: r => {
                const cls = { draft: 'badge-neutral', issued: 'badge-info', paid: 'badge-success', void: 'badge-danger' };
                return `<span class="badge-tag ${cls[r.status] || 'badge-neutral'}">${r.status}</span>`;
            }}
        ], invoices, {
            actions: (r) => `
                <button class="btn btn-sm btn-secondary" onclick="Invoicing.viewInvoice('${r.id}')" title="View"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-success" onclick="Invoicing.printInvoice('${r.id}')" title="Print"><i class="fas fa-print"></i></button>
            `
        });
    },

    // ============================================================
    //  CREATE INVOICE
    // ============================================================
    openCreate() {
        const companies = this.getCompanyOptions();
        const customers = App.activeCompany === 'all' ? DataStore.customers : DataStore.customers.filter(c => c.companies?.includes(App.activeCompany));
        const defaultCompany = App.activeCompany !== 'all' ? App.activeCompany : 'dheekay';
        const seriesNo = Database.getNextBirSeriesNo(defaultCompany);
        const types = this.getInvoiceTypesForCompany(defaultCompany);

        const html = `
        <form id="birInvoiceForm">
            <div style="padding:12px;background:var(--bg);border-radius:var(--radius);margin-bottom:16px;font-size:13px">
                <i class="fas fa-info-circle" style="color:var(--primary)"></i>
                <strong>BIR Compliance:</strong> Invoices follow BIR Revenue Regulations. Series numbers are auto-generated. TIN fields are required for VAT-registered transactions.
            </div>
            <div class="form-row">
                <div class="form-group"><label>Invoice Type</label>
                    <select class="form-control" id="birType">
                        ${types.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Company (Issuer)</label>
                    <select class="form-control" id="birCompany" onchange="Invoicing.onCompanyChange()">
                        ${companies}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Series No.</label><input type="text" class="form-control" id="birSeriesNo" value="${seriesNo}" readonly style="font-family:monospace;font-weight:700"></div>
                <div class="form-group"><label>Date</label><input type="date" class="form-control" id="birDate" value="${new Date().toISOString().split('T')[0]}"></div>
            </div>

            <h4 style="margin:16px 0 8px;font-size:14px;color:var(--text-muted)">CUSTOMER INFORMATION</h4>
            <div class="form-row">
                <div class="form-group"><label>Customer Name</label>
                    <input type="text" class="form-control" id="birCustName" list="birCustList" placeholder="Search or type customer name">
                    <datalist id="birCustList">${customers.map(c => `<option value="${c.name}">`).join('')}</datalist>
                </div>
                <div class="form-group"><label>Customer TIN</label><input type="text" class="form-control" id="birCustTin" placeholder="000-000-000-000"></div>
            </div>
            <div class="form-group"><label>Customer Address</label><input type="text" class="form-control" id="birCustAddress" placeholder="Complete business/billing address"></div>

            <h4 style="margin:16px 0 8px;font-size:14px;color:var(--text-muted)">LINE ITEMS</h4>
            <div id="birLineItems"></div>
            <button type="button" class="btn btn-sm btn-secondary" style="margin:8px 0 16px" onclick="Invoicing.addLineItem()"><i class="fas fa-plus"></i> Add Item</button>

            <h4 style="margin:16px 0 8px;font-size:14px;color:var(--text-muted)">TAX COMPUTATION</h4>
            <div class="form-row">
                <div class="form-group"><label>VAT Type</label>
                    <select class="form-control" id="birVatType" onchange="Invoicing.recalcTotals()">
                        <option value="vat">VAT Registered (12%)</option>
                        <option value="non-vat">Non-VAT / Exempt</option>
                        <option value="zero-rated">Zero-Rated</option>
                    </select>
                </div>
                <div class="form-group"><label>Withholding Tax Rate (%)</label>
                    <select class="form-control" id="birWht" onchange="Invoicing.recalcTotals()">
                        <option value="0">None (0%)</option>
                        <option value="1">1% - Professional Fees</option>
                        <option value="2">2% - Contractors / Services</option>
                        <option value="5">5% - Government</option>
                        <option value="10">10% - Professional (Individual)</option>
                        <option value="15">15% - Professional (Corp)</option>
                    </select>
                </div>
            </div>

            <div style="padding:16px;background:var(--bg);border-radius:var(--radius);margin-top:8px">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Vatable Sales:</span><strong id="birVatableSales">₱0.00</strong></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>VAT-Exempt Sales:</span><strong id="birVatExempt">₱0.00</strong></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Zero-Rated Sales:</span><strong id="birZeroRated">₱0.00</strong></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>VAT (12%):</span><strong id="birVatAmt">₱0.00</strong></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:var(--danger)"><span>Less: Withholding Tax:</span><strong id="birWhtAmt">₱0.00</strong></div>
                <div style="display:flex;justify-content:space-between;font-size:18px;border-top:2px solid var(--border);padding-top:8px;margin-top:8px"><span>TOTAL AMOUNT DUE:</span><strong id="birTotal">₱0.00</strong></div>
            </div>

            <div class="form-group" style="margin-top:16px"><label>Terms / Remarks</label><textarea class="form-control" id="birRemarks" rows="2" placeholder="Payment terms, delivery notes, etc."></textarea></div>
        </form>`;

        App.openModal('Create BIR Invoice', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-info" onclick="Invoicing.saveInvoice('draft')"><i class="fas fa-save"></i> Save Draft</button>
            <button class="btn btn-primary" onclick="Invoicing.saveInvoice('issued')"><i class="fas fa-file-export"></i> Issue Invoice</button>
        `, true);

        this.lineCounter = 0;
        this.addLineItem();
    },

    getCompanyOptions() {
        const all = Object.values(DataStore.companies);
        const filtered = App.activeCompany === 'all' ? all : all.filter(c => c.id === App.activeCompany);
        return filtered.map(c => `<option value="${c.id}" ${c.id === App.activeCompany ? 'selected' : ''}>${c.name}</option>`).join('');
    },

    onCompanyChange() {
        const company = document.getElementById('birCompany')?.value;
        const seriesNo = Database.getNextBirSeriesNo(company);
        const field = document.getElementById('birSeriesNo');
        if (field) field.value = seriesNo;
        // Update invoice types based on company
        const typeSelect = document.getElementById('birType');
        if (typeSelect) {
            const types = this.getInvoiceTypesForCompany(company);
            typeSelect.innerHTML = types.map(t => `<option value="${t.value}">${t.label}</option>`).join('');
        }
    },

    lineCounter: 0,

    addLineItem() {
        this.lineCounter++;
        const n = this.lineCounter;
        const div = document.createElement('div');
        div.className = 'form-row';
        div.style.marginBottom = '6px';
        div.id = `birLine_${n}`;
        div.innerHTML = `
            <div class="form-group" style="flex:3"><input type="text" class="form-control" placeholder="Description" data-bir-desc></div>
            <div class="form-group" style="flex:1"><input type="number" class="form-control" placeholder="Qty" min="1" value="1" data-bir-qty oninput="Invoicing.recalcTotals()"></div>
            <div class="form-group" style="flex:1"><input type="text" class="form-control" placeholder="Unit" value="pcs" data-bir-unit></div>
            <div class="form-group" style="flex:1.5"><input type="number" class="form-control" placeholder="Unit Price" min="0" step="0.01" data-bir-price oninput="Invoicing.recalcTotals()"></div>
            <button type="button" class="btn btn-sm btn-danger" style="margin-top:24px;height:36px" onclick="document.getElementById('birLine_${n}').remove();Invoicing.recalcTotals()"><i class="fas fa-trash"></i></button>
        `;
        document.getElementById('birLineItems').appendChild(div);
    },

    recalcTotals() {
        const rows = document.querySelectorAll('#birLineItems .form-row');
        let subtotal = 0;
        rows.forEach(row => {
            const qty = parseFloat(row.querySelector('[data-bir-qty]')?.value || 0);
            const price = parseFloat(row.querySelector('[data-bir-price]')?.value || 0);
            subtotal += qty * price;
        });

        const vatType = document.getElementById('birVatType')?.value || 'vat';
        const whtRate = parseFloat(document.getElementById('birWht')?.value || 0) / 100;

        let vatableSales = 0, vatExempt = 0, zeroRated = 0, vatAmt = 0;

        if (vatType === 'vat') {
            // BIR: Total is VAT-inclusive; vatable sales = total / 1.12; VAT = vatable * 0.12
            vatableSales = subtotal / 1.12;
            vatAmt = vatableSales * 0.12;
        } else if (vatType === 'non-vat') {
            vatExempt = subtotal;
        } else {
            zeroRated = subtotal;
        }

        const whtAmt = vatableSales * whtRate;
        const total = subtotal - whtAmt;

        document.getElementById('birVatableSales').textContent = Utils.formatCurrency(vatableSales);
        document.getElementById('birVatExempt').textContent = Utils.formatCurrency(vatExempt);
        document.getElementById('birZeroRated').textContent = Utils.formatCurrency(zeroRated);
        document.getElementById('birVatAmt').textContent = Utils.formatCurrency(vatAmt);
        document.getElementById('birWhtAmt').textContent = Utils.formatCurrency(whtAmt);
        document.getElementById('birTotal').textContent = Utils.formatCurrency(total);
    },

    saveInvoice(status) {
        const custName = document.getElementById('birCustName')?.value;
        if (!custName) { App.showToast('Customer name is required', 'error'); return; }

        const rows = document.querySelectorAll('#birLineItems .form-row');
        const lineItems = [];
        let subtotal = 0;
        rows.forEach(row => {
            const desc = row.querySelector('[data-bir-desc]')?.value;
            const qty = parseFloat(row.querySelector('[data-bir-qty]')?.value || 0);
            const unit = row.querySelector('[data-bir-unit]')?.value || 'pcs';
            const price = parseFloat(row.querySelector('[data-bir-price]')?.value || 0);
            if (desc && qty > 0) {
                lineItems.push({ description: desc, qty, unit, unitPrice: price, amount: qty * price });
                subtotal += qty * price;
            }
        });

        if (lineItems.length === 0) { App.showToast('Add at least one line item', 'error'); return; }

        const vatType = document.getElementById('birVatType')?.value || 'vat';
        const whtRate = parseFloat(document.getElementById('birWht')?.value || 0) / 100;
        const company = document.getElementById('birCompany')?.value;
        const companyData = DataStore.companies[company];

        let vatableSales = 0, vatExempt = 0, zeroRated = 0, vatAmount = 0;
        if (vatType === 'vat') { vatableSales = subtotal / 1.12; vatAmount = vatableSales * 0.12; }
        else if (vatType === 'non-vat') { vatExempt = subtotal; }
        else { zeroRated = subtotal; }

        const whtAmount = vatableSales * whtRate;
        const totalAmount = subtotal - whtAmount;

        Database.addBirInvoice({
            invoiceType: document.getElementById('birType')?.value || 'official-receipt',
            company,
            companyName: companyData?.name || company,
            companyTin: companyData?.tin || '',
            companyAddress: companyData?.address || '',
            seriesNo: document.getElementById('birSeriesNo')?.value,
            date: document.getElementById('birDate')?.value,
            customerName: custName,
            customerTin: document.getElementById('birCustTin')?.value || '',
            customerAddress: document.getElementById('birCustAddress')?.value || '',
            lineItems,
            vatType,
            vatableSales,
            vatExempt,
            zeroRated,
            vatAmount,
            whtRate,
            whtAmount,
            subtotal,
            totalAmount,
            remarks: document.getElementById('birRemarks')?.value || '',
            status
        });

        App.closeModal();
        App.showToast(`Invoice ${status === 'issued' ? 'issued' : 'saved as draft'}`, 'success');
        this.render(document.getElementById('contentArea'));
    },

    // ============================================================
    //  VIEW INVOICE
    // ============================================================
    viewInvoice(id) {
        const inv = DataStore.birInvoices.find(i => i.id === id);
        if (!inv) return;
        App.openModal(`${this.getTypeLabel(inv.invoiceType)} — ${inv.seriesNo || inv.id}`, this.buildInvoicePreview(inv), `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            ${inv.status === 'draft' ? `<button class="btn btn-info" onclick="Invoicing.issueInvoice('${inv.id}')"><i class="fas fa-file-export"></i> Issue</button>` : ''}
            ${inv.status === 'issued' ? `<button class="btn btn-success" onclick="Invoicing.markPaid('${inv.id}')"><i class="fas fa-check"></i> Mark Paid</button>` : ''}
            <button class="btn btn-primary" onclick="Invoicing.printInvoice('${inv.id}')"><i class="fas fa-print"></i> Print</button>
        `, true);
    },

    buildInvoicePreview(inv) {
        const typeName = this.getTypeLabel(inv.invoiceType).toUpperCase();
        const itemRows = (inv.lineItems || []).map((li, i) => `
            <tr><td style="padding:6px 8px">${i + 1}</td><td style="padding:6px 8px">${li.description}</td><td style="padding:6px 8px;text-align:center">${li.qty}</td><td style="padding:6px 8px;text-align:center">${li.unit}</td><td style="padding:6px 8px;text-align:right">${Utils.formatCurrency(li.unitPrice)}</td><td style="padding:6px 8px;text-align:right">${Utils.formatCurrency(li.amount)}</td></tr>
        `).join('');

        return `
        <div id="invoicePrintArea" style="font-family:'Inter',sans-serif;font-size:13px;max-width:700px;margin:auto">
            <div style="text-align:center;margin-bottom:16px;border-bottom:3px double var(--border);padding-bottom:12px">
                <h2 style="margin:0;font-size:18px">${inv.companyName || inv.company}</h2>
                <div style="font-size:12px;color:var(--text-muted)">${inv.companyAddress || ''}</div>
                <div style="font-size:12px;color:var(--text-muted)">TIN: ${inv.companyTin || 'N/A'}</div>
                <div style="margin-top:8px;font-weight:700;font-size:16px;letter-spacing:2px">${typeName}</div>
            </div>

            <div style="display:flex;justify-content:space-between;margin-bottom:12px">
                <div>
                    <div><strong>Customer:</strong> ${inv.customerName}</div>
                    <div><strong>TIN:</strong> ${inv.customerTin || 'N/A'}</div>
                    <div><strong>Address:</strong> ${inv.customerAddress || 'N/A'}</div>
                </div>
                <div style="text-align:right">
                    <div><strong>No:</strong> <span style="font-family:monospace;font-weight:700">${inv.seriesNo || inv.id}</span></div>
                    <div><strong>Date:</strong> ${Utils.formatDate(inv.date)}</div>
                    <div><strong>Status:</strong> <span class="badge-tag ${inv.status === 'paid' ? 'badge-success' : inv.status === 'issued' ? 'badge-info' : 'badge-neutral'}">${inv.status}</span></div>
                </div>
            </div>

            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
                <thead><tr style="background:var(--bg);border-bottom:2px solid var(--border)">
                    <th style="padding:8px;text-align:left">#</th>
                    <th style="padding:8px;text-align:left">Description</th>
                    <th style="padding:8px;text-align:center">Qty</th>
                    <th style="padding:8px;text-align:center">Unit</th>
                    <th style="padding:8px;text-align:right">Unit Price</th>
                    <th style="padding:8px;text-align:right">Amount</th>
                </tr></thead>
                <tbody>${itemRows}</tbody>
            </table>

            <div style="display:flex;justify-content:flex-end">
                <div style="width:300px">
                    <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Vatable Sales:</span><span>${Utils.formatCurrency(inv.vatableSales || 0)}</span></div>
                    <div style="display:flex;justify-content:space-between;padding:4px 0"><span>VAT-Exempt Sales:</span><span>${Utils.formatCurrency(inv.vatExempt || 0)}</span></div>
                    <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Zero-Rated Sales:</span><span>${Utils.formatCurrency(inv.zeroRated || 0)}</span></div>
                    <div style="display:flex;justify-content:space-between;padding:4px 0"><span>VAT (12%):</span><span>${Utils.formatCurrency(inv.vatAmount || 0)}</span></div>
                    ${inv.whtAmount ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:var(--danger)"><span>Less: WHT (${(inv.whtRate * 100).toFixed(0)}%):</span><span>(${Utils.formatCurrency(inv.whtAmount)})</span></div>` : ''}
                    <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid var(--text);font-weight:700;font-size:16px"><span>TOTAL:</span><span>${Utils.formatCurrency(inv.totalAmount || 0)}</span></div>
                </div>
            </div>

            ${inv.remarks ? `<div style="margin-top:16px;padding:8px;border:1px dashed var(--border);border-radius:4px;font-size:12px"><strong>Remarks:</strong> ${inv.remarks}</div>` : ''}

            <div style="margin-top:24px;display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);border-top:1px solid var(--border);padding-top:8px">
                <span>This document is system-generated. BIR Permit to Print: Pending</span>
                <span>Powered by UBMS</span>
            </div>
        </div>`;
    },

    issueInvoice(id) {
        Database.updateBirInvoice(id, { status: 'issued' });
        App.closeModal();
        App.showToast('Invoice issued', 'success');
        this.render(document.getElementById('contentArea'));
    },

    markPaid(id) {
        Database.updateBirInvoice(id, { status: 'paid', paidDate: new Date().toISOString().split('T')[0] });
        App.closeModal();
        App.showToast('Invoice marked as paid', 'success');
        this.render(document.getElementById('contentArea'));
    },

    // ============================================================
    //  PRINT INVOICE
    // ============================================================
    printInvoice(id) {
        const inv = DataStore.birInvoices.find(i => i.id === id);
        if (!inv) return;

        const printContent = this.buildInvoicePreview(inv);
        const printWindow = window.open('', '_blank', 'width=800,height=900');
        printWindow.document.write(`<!DOCTYPE html><html><head><title>${inv.seriesNo || inv.id}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; padding: 24px; font-size: 13px; color: #1a1a2e; }
            .badge-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
            .badge-success { background: #d4edda; color: #155724; }
            .badge-info { background: #d1ecf1; color: #0c5460; }
            .badge-neutral { background: #e9ecef; color: #495057; }
            @media print { body { padding: 0; } }
        </style></head><body>${printContent}
        <script>setTimeout(function(){window.print();},300);<\/script></body></html>`);
        printWindow.document.close();
    }
};
