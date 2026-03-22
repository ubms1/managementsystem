/* ========================================
   UBMS — Import / Export Module
   Excel (XLSX) & CSV Import / Export
   Uses SheetJS (xlsx) CDN library
   ======================================== */

const ImportExport = {

    // ============================================================
    //  EXPORT SCHEMAS — define columns per data module
    // ============================================================
    EXPORT_SCHEMAS: {
        Employees: {
            storeKey: 'employees',
            cols: [
                { key: 'userId', label: 'User ID' },
                { key: 'name', label: 'Full Name' },
                { key: 'position', label: 'Position' },
                { key: 'company', label: 'Company' },
                { key: 'monthlyRate', label: 'Monthly Rate' },
                { key: 'dailyRate', label: 'Daily Rate' },
                { key: 'payFrequency', label: 'Pay Frequency' },
                { key: 'sssNo', label: 'SSS No' },
                { key: 'philhealthNo', label: 'PhilHealth No' },
                { key: 'pagibigNo', label: 'Pag-IBIG No' },
                { key: 'tin', label: 'TIN' },
                { key: 'status', label: 'Status' }
            ]
        },
        Attendance: {
            storeKey: 'attendanceRecords',
            cols: [
                { key: 'employeeId', label: 'Employee ID' },
                { key: 'date', label: 'Date' },
                { key: 'timeIn', label: 'Time In' },
                { key: 'timeOut', label: 'Time Out' },
                { key: 'status', label: 'Status' },
                { key: 'lateMinutes', label: 'Late (min)' },
                { key: 'undertimeMinutes', label: 'Undertime (min)' },
                { key: 'overtimeHours', label: 'OT (hrs)' },
                { key: 'source', label: 'Source' },
                { key: 'notes', label: 'Notes' }
            ]
        },
        Customers: {
            storeKey: 'customers',
            cols: [
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'phone', label: 'Phone' },
                { key: 'type', label: 'Type' },
                { key: 'address', label: 'Address' },
                { key: 'contactPerson', label: 'Contact Person' },
                { key: 'notes', label: 'Notes' },
                { key: 'totalSpent', label: 'Total Spent' }
            ],
            companyField: 'companies'
        },
        Invoices: {
            storeKey: 'invoices',
            cols: [
                { key: 'id', label: 'Invoice No' },
                { key: 'company', label: 'Company' },
                { key: 'customer', label: 'Customer ID' },
                { key: 'description', label: 'Description' },
                { key: 'amount', label: 'Amount' },
                { key: 'paid', label: 'Paid' },
                { key: 'status', label: 'Status' },
                { key: 'issueDate', label: 'Issue Date' },
                { key: 'dueDate', label: 'Due Date' }
            ]
        },
        Expenses: {
            storeKey: 'expenses',
            cols: [
                { key: 'company', label: 'Company' },
                { key: 'category', label: 'Category' },
                { key: 'description', label: 'Description' },
                { key: 'amount', label: 'Amount' },
                { key: 'date', label: 'Date' },
                { key: 'vendor', label: 'Vendor' }
            ]
        },
        Projects: {
            storeKey: 'projects',
            cols: [
                { key: 'name', label: 'Project Name' },
                { key: 'company', label: 'Company' },
                { key: 'client', label: 'Client ID' },
                { key: 'status', label: 'Status' },
                { key: 'priority', label: 'Priority' },
                { key: 'progress', label: 'Progress %' },
                { key: 'budget', label: 'Budget' },
                { key: 'actualCost', label: 'Actual Cost' },
                { key: 'startDate', label: 'Start Date' },
                { key: 'endDate', label: 'End Date' },
                { key: 'location', label: 'Location' },
                { key: 'manager', label: 'Manager' }
            ]
        },
        Inventory: {
            storeKey: 'inventoryItems',
            cols: [
                { key: 'name', label: 'Item Name' },
                { key: 'category', label: 'Category' },
                { key: 'unit', label: 'Unit' },
                { key: 'quantity', label: 'Quantity' },
                { key: 'unitCost', label: 'Unit Cost' },
                { key: 'company', label: 'Company' },
                { key: 'location', label: 'Location' },
                { key: 'minStock', label: 'Min Stock' }
            ]
        },
        Vehicles: {
            storeKey: 'vehicles',
            cols: [
                { key: 'plate', label: 'Plate No' },
                { key: 'make', label: 'Make' },
                { key: 'model', label: 'Model' },
                { key: 'year', label: 'Year' },
                { key: 'color', label: 'Color' },
                { key: 'customer', label: 'Customer ID' },
                { key: 'mileage', label: 'Mileage' }
            ]
        },
        'Auto Parts': {
            storeKey: 'autoParts',
            cols: [
                { key: 'name', label: 'Part Name' },
                { key: 'sku', label: 'SKU' },
                { key: 'quantity', label: 'Qty' },
                { key: 'minStock', label: 'Min Stock' },
                { key: 'price', label: 'Price' },
                { key: 'supplier', label: 'Supplier' }
            ]
        },
        Bookings: {
            storeKey: 'bookings',
            cols: [
                { key: 'company', label: 'Company' },
                { key: 'customer', label: 'Customer ID' },
                { key: 'therapist', label: 'Therapist ID' },
                { key: 'service', label: 'Service ID' },
                { key: 'branch', label: 'Branch' },
                { key: 'date', label: 'Date' },
                { key: 'time', label: 'Time' },
                { key: 'status', label: 'Status' },
                { key: 'amount', label: 'Amount' },
                { key: 'notes', label: 'Notes' }
            ]
        },
        Payslips: {
            storeKey: 'payslips',
            cols: [
                { key: 'employeeName', label: 'Employee' },
                { key: 'company', label: 'Company' },
                { key: 'payFrequency', label: 'Pay Freq' },
                { key: 'periodStart', label: 'Period Start' },
                { key: 'periodEnd', label: 'Period End' },
                { key: 'daysWorked', label: 'Days Worked' },
                { key: 'basicPay', label: 'Basic Pay' },
                { key: 'overtimePay', label: 'OT Pay' },
                { key: 'grossPay', label: 'Gross Pay' },
                { key: 'sss', label: 'SSS' },
                { key: 'philhealth', label: 'PhilHealth' },
                { key: 'pagibig', label: 'Pag-IBIG' },
                { key: 'tax', label: 'Tax' },
                { key: 'totalDeductions', label: 'Total Deductions' },
                { key: 'netPay', label: 'Net Pay' }
            ]
        },
        'Job Cards': {
            storeKey: 'jobCards',
            cols: [
                { key: 'id', label: 'Job Card No' },
                { key: 'company', label: 'Company' },
                { key: 'vehicle', label: 'Vehicle ID' },
                { key: 'customer', label: 'Customer ID' },
                { key: 'status', label: 'Status' },
                { key: 'technician', label: 'Technician' },
                { key: 'priority', label: 'Priority' },
                { key: 'dateIn', label: 'Date In' },
                { key: 'estimatedOut', label: 'Est. Out' },
                { key: 'totalAmount', label: 'Total Amount' },
                { key: 'notes', label: 'Notes' }
            ]
        },
        'Performance Reviews': {
            storeKey: 'performanceReviews',
            cols: [
                { key: 'employeeName', label: 'Employee' },
                { key: 'company', label: 'Company' },
                { key: 'reviewPeriod', label: 'Review Period' },
                { key: 'attendanceScore', label: 'Attendance Score' },
                { key: 'punctualityScore', label: 'Punctuality Score' },
                { key: 'supervisorScore', label: 'Supervisor Score' },
                { key: 'overallScore', label: 'Overall Score' },
                { key: 'rating', label: 'Rating' },
                { key: 'reviewDate', label: 'Review Date' }
            ]
        },
        'Incident Reports': {
            storeKey: 'incidentReports',
            cols: [
                { key: 'company', label: 'Company' },
                { key: 'reportedBy', label: 'Reported By' },
                { key: 'date', label: 'Date' },
                { key: 'type', label: 'Type' },
                { key: 'severity', label: 'Severity' },
                { key: 'location', label: 'Location' },
                { key: 'description', label: 'Description' },
                { key: 'status', label: 'Status' },
                { key: 'actionTaken', label: 'Action Taken' }
            ]
        }
    },

    // ============================================================
    //  IMPORT SCHEMAS  
    // ============================================================
    IMPORT_SCHEMAS: {
        employees: {
            label: 'Employees',
            requiredCols: ['name', 'company'],
            save(row) {
                Database.addEmployee({
                    name: row.name || row['Full Name'],
                    position: row.position || row['Position'] || '',
                    company: row.company || row['Company'],
                    payFrequency: row.payFrequency || row['Pay Frequency'] || 'monthly',
                    monthlyRate: parseFloat(row.monthlyRate || row['Monthly Rate'] || 0),
                    dailyRate: parseFloat(row.dailyRate || row['Daily Rate'] || 0),
                    sssNo: row.sssNo || row['SSS No'] || '',
                    philhealthNo: row.philhealthNo || row['PhilHealth No'] || '',
                    pagibigNo: row.pagibigNo || row['Pag-IBIG No'] || '',
                    tin: row.tin || row['TIN'] || '',
                    userId: row.userId || row['User ID'] || undefined,
                    status: row.status || 'active'
                });
            }
        },
        customers: {
            label: 'Customers',
            requiredCols: ['name'],
            save(row) {
                Database.addCustomer({
                    name: row.name || row['Name'],
                    email: row.email || row['Email'] || '',
                    phone: row.phone || row['Phone'] || '',
                    type: row.type || row['Type'] || 'individual',
                    companies: row.companies ? (typeof row.companies === 'string' ? row.companies.split(',').map(s => s.trim()) : row.companies) : [row.company || row['Company'] || 'dheekay'],
                    address: row.address || row['Address'] || '',
                    contactPerson: row.contactPerson || row['Contact Person'] || '',
                    notes: row.notes || row['Notes'] || '',
                    totalSpent: parseFloat(row.totalSpent || row['Total Spent'] || 0)
                });
            }
        },
        expenses: {
            label: 'Expenses',
            requiredCols: ['description', 'amount', 'company'],
            save(row) {
                Database.addExpense({
                    company: row.company || row['Company'],
                    category: row.category || row['Category'] || 'Operating',
                    description: row.description || row['Description'],
                    amount: parseFloat(row.amount || row['Amount'] || 0),
                    date: row.date || row['Date'] || new Date().toISOString().split('T')[0],
                    vendor: row.vendor || row['Vendor'] || ''
                });
            }
        },
        inventory: {
            label: 'Inventory Items',
            requiredCols: ['name', 'company'],
            save(row) {
                Database.addInventoryItem({
                    name: row.name || row['Item Name'],
                    category: row.category || row['Category'] || 'General',
                    unit: row.unit || row['Unit'] || 'pcs',
                    quantity: parseInt(row.quantity || row['Quantity'] || 0),
                    unitCost: parseFloat(row.unitCost || row['Unit Cost'] || 0),
                    company: row.company || row['Company'],
                    location: row.location || row['Location'] || '',
                    minStock: parseInt(row.minStock || row['Min Stock'] || 0)
                });
            }
        },
        projects: {
            label: 'Projects',
            requiredCols: ['name', 'company'],
            save(row) {
                Database.addProject({
                    name: row.name || row['Project Name'],
                    company: row.company || row['Company'],
                    client: row.client || row['Client ID'] || '',
                    status: row.status || row['Status'] || 'pending',
                    priority: row.priority || row['Priority'] || 'medium',
                    progress: parseInt(row.progress || row['Progress %'] || 0),
                    budget: parseFloat(row.budget || row['Budget'] || 0),
                    actualCost: parseFloat(row.actualCost || row['Actual Cost'] || 0),
                    startDate: row.startDate || row['Start Date'] || '',
                    endDate: row.endDate || row['End Date'] || '',
                    location: row.location || row['Location'] || '',
                    manager: row.manager || row['Manager'] || ''
                });
            }
        },
        bookings: {
            label: 'Bookings',
            requiredCols: ['customer', 'date'],
            save(row) {
                Database.addBooking({
                    company: row.company || row['Company'] || 'nuatthai',
                    customer: row.customer || row['Customer ID'],
                    therapist: row.therapist || row['Therapist ID'] || '',
                    service: row.service || row['Service ID'] || '',
                    branch: row.branch || row['Branch'] || '',
                    date: row.date || row['Date'],
                    time: row.time || row['Time'] || '10:00',
                    status: row.status || row['Status'] || 'scheduled',
                    amount: parseFloat(row.amount || row['Amount'] || 0),
                    notes: row.notes || row['Notes'] || ''
                });
            }
        },
        vehicles: {
            label: 'Vehicles',
            requiredCols: ['plate', 'make', 'model'],
            save(row) {
                Database.addVehicle({
                    plate: row.plate || row['Plate No'],
                    make: row.make || row['Make'],
                    model: row.model || row['Model'],
                    year: parseInt(row.year || row['Year'] || new Date().getFullYear()),
                    color: row.color || row['Color'] || '',
                    customer: row.customer || row['Customer ID'] || '',
                    mileage: parseInt(row.mileage || row['Mileage'] || 0)
                });
            }
        },
        autoParts: {
            label: 'Auto Parts',
            requiredCols: ['name'],
            save(row) {
                Database.addPart({
                    name: row.name || row['Part Name'],
                    sku: row.sku || row['SKU'] || '',
                    quantity: parseInt(row.quantity || row['Qty'] || 0),
                    minStock: parseInt(row.minStock || row['Min Stock'] || 0),
                    price: parseFloat(row.price || row['Price'] || 0),
                    supplier: row.supplier || row['Supplier'] || ''
                });
            }
        },
        invoices: {
            label: 'Invoices',
            requiredCols: ['company', 'amount'],
            save(row) {
                Database.addInvoice({
                    company: row.company || row['Company'],
                    customer: row.customer || row['Customer ID'] || '',
                    description: row.description || row['Description'] || '',
                    amount: parseFloat(row.amount || row['Amount'] || 0),
                    paid: parseFloat(row.paid || row['Paid'] || 0),
                    status: row.status || row['Status'] || 'unpaid',
                    issueDate: row.issueDate || row['Issue Date'] || new Date().toISOString().split('T')[0],
                    dueDate: row.dueDate || row['Due Date'] || ''
                });
            }
        }
    },

    // ============================================================
    //  OPEN MODAL
    // ============================================================
    open(mode = 'export') {
        const html = `
        <div class="tabs mb-2">
            <button class="tab-btn ${mode === 'export' ? 'active' : ''}" onclick="ImportExport.switchTab('export')"><i class="fas fa-file-export"></i> Export Data</button>
            <button class="tab-btn ${mode === 'import' ? 'active' : ''}" onclick="ImportExport.switchTab('import')"><i class="fas fa-file-import"></i> Import Data</button>
        </div>
        <div id="ieTabContent"></div>`;
        App.openModal('Import / Export Data', html, '', true);
        this._mode = mode;
        this.renderTab();
    },

    switchTab(mode) {
        this._mode = mode;
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.toggle('active', b.textContent.toLowerCase().includes(mode));
        });
        this.renderTab();
    },

    renderTab() {
        const el = document.getElementById('ieTabContent');
        if (!el) return;
        el.innerHTML = this._mode === 'export' ? this.renderExportTab() : this.renderImportTab();
    },

    // ============================================================
    //  EXPORT TAB
    // ============================================================
    renderExportTab() {
        const company = App.activeCompany;
        const companyLabel = company === 'all' ? 'All Companies' : (DataStore.companies[company]?.name || company);

        let checkboxes = '';
        for (const [name, schema] of Object.entries(this.EXPORT_SCHEMAS)) {
            const data = this.getFilteredData(schema.storeKey, schema.companyField);
            checkboxes += `
            <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;margin-bottom:6px">
                <input type="checkbox" class="ie-export-check" value="${name}" ${data.length > 0 ? 'checked' : ''}>
                <span style="flex:1;font-weight:600">${name}</span>
                <span style="font-size:12px;color:var(--text-muted)">${data.length} records</span>
            </label>`;
        }

        return `
        <div style="margin-bottom:12px;padding:10px 14px;background:var(--bg);border-radius:8px;font-size:13px">
            <i class="fas fa-filter" style="margin-right:6px;color:var(--secondary)"></i>
            Filtering by: <strong>${companyLabel}</strong>
            <span style="font-size:11px;color:var(--text-muted);margin-left:8px">(Change company filter in the top bar)</span>
        </div>
        <div style="margin-bottom:12px">
            <label style="font-size:13px;font-weight:600;margin-bottom:6px;display:block">Select modules to export:</label>
            <div style="display:flex;gap:4px;margin-bottom:8px">
                <button class="btn btn-sm btn-secondary" onclick="document.querySelectorAll('.ie-export-check').forEach(c=>c.checked=true)">Select All</button>
                <button class="btn btn-sm btn-secondary" onclick="document.querySelectorAll('.ie-export-check').forEach(c=>c.checked=false)">Clear All</button>
            </div>
            ${checkboxes}
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-success" onclick="ImportExport.exportXLSX()"><i class="fas fa-file-excel"></i> Export Excel (.xlsx)</button>
            <button class="btn btn-secondary" onclick="ImportExport.exportCSV()"><i class="fas fa-file-csv"></i> Export CSV (selected)</button>
        </div>`;
    },

    getFilteredData(storeKey, companyField) {
        const data = DataStore[storeKey] || [];
        if (App.activeCompany === 'all') return data;
        if (companyField === 'companies') {
            return data.filter(d => d.companies && d.companies.includes(App.activeCompany));
        }
        return data.filter(d => !d.company || d.company === App.activeCompany);
    },

    getSelectedModules() {
        return Array.from(document.querySelectorAll('.ie-export-check:checked')).map(c => c.value);
    },

    exportXLSX() {
        if (typeof XLSX === 'undefined') { App.showToast('SheetJS library not loaded', 'error'); return; }
        const selected = this.getSelectedModules();
        if (selected.length === 0) { App.showToast('Select at least one module', 'error'); return; }

        const wb = XLSX.utils.book_new();
        let totalRows = 0;

        selected.forEach(name => {
            const schema = this.EXPORT_SCHEMAS[name];
            if (!schema) return;
            const data = this.getFilteredData(schema.storeKey, schema.companyField);
            const headers = schema.cols.map(c => c.label);
            const rows = data.map(item => schema.cols.map(c => {
                const val = item[c.key];
                return Array.isArray(val) ? val.join(', ') : (val ?? '');
            }));
            const wsData = [headers, ...rows];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            // Auto-width columns
            ws['!cols'] = headers.map((h, i) => ({
                wch: Math.max(h.length, ...rows.map(r => String(r[i] || '').length).slice(0, 50)) + 2
            }));
            XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31));
            totalRows += rows.length;
        });

        const company = App.activeCompany === 'all' ? 'AllCompanies' : App.activeCompany;
        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `UBMS_Export_${company}_${date}.xlsx`);
        App.showToast(`Exported ${totalRows} records across ${selected.length} sheets`, 'success');
    },

    exportCSV() {
        if (typeof XLSX === 'undefined') { App.showToast('SheetJS library not loaded', 'error'); return; }
        const selected = this.getSelectedModules();
        if (selected.length === 0) { App.showToast('Select at least one module', 'error'); return; }

        selected.forEach(name => {
            const schema = this.EXPORT_SCHEMAS[name];
            if (!schema) return;
            const data = this.getFilteredData(schema.storeKey, schema.companyField);
            const headers = schema.cols.map(c => c.label);
            const rows = data.map(item => schema.cols.map(c => {
                const val = item[c.key];
                return Array.isArray(val) ? val.join(', ') : (val ?? '');
            }));
            const wsData = [headers, ...rows];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const csv = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `UBMS_${name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        });
        App.showToast(`CSV files exported for ${selected.length} modules`, 'success');
    },

    // ============================================================
    //  IMPORT TAB
    // ============================================================
    renderImportTab() {
        const moduleOptions = Object.entries(this.IMPORT_SCHEMAS)
            .map(([key, schema]) => `<option value="${key}">${schema.label}</option>`)
            .join('');

        return `
        <div style="margin-bottom:16px">
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">1. Select target module:</label>
            <select class="form-control" id="ieImportModule" onchange="ImportExport.updateImportHelp()">
                ${moduleOptions}
            </select>
        </div>
        <div id="ieImportHelp" style="margin-bottom:16px;padding:10px 14px;background:#f0fdf4;border-radius:8px;font-size:12px;color:#166534"></div>
        <div style="margin-bottom:16px">
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">2. Choose a file (.xlsx, .xls, or .csv):</label>
            <input type="file" id="ieImportFile" accept=".xlsx,.xls,.csv" class="form-control" onchange="ImportExport.parseFile()">
        </div>
        <div id="ieImportPreview" style="margin-bottom:16px"></div>
        <div id="ieImportActions" style="display:none;text-align:right">
            <button class="btn btn-primary" onclick="ImportExport.confirmImport()"><i class="fas fa-cloud-upload-alt"></i> <span id="ieImportCount">Import</span></button>
        </div>
        <div id="ieImportResult"></div>`;
        setTimeout(() => this.updateImportHelp(), 50);
    },

    updateImportHelp() {
        const el = document.getElementById('ieImportHelp');
        const moduleKey = document.getElementById('ieImportModule')?.value;
        if (!el || !moduleKey) return;
        const schema = this.IMPORT_SCHEMAS[moduleKey];
        if (!schema) return;
        el.innerHTML = `<i class="fas fa-info-circle" style="margin-right:6px"></i>
            <strong>Required columns:</strong> ${schema.requiredCols.join(', ')}<br>
            <span style="color:var(--text-muted)">Column headers in your file should match the field names. Both camelCase (e.g. "monthlyRate") and label names (e.g. "Monthly Rate") are accepted.</span>`;
    },

    _parsedRows: null,

    parseFile() {
        const input = document.getElementById('ieImportFile');
        if (!input || !input.files[0]) return;
        if (typeof XLSX === 'undefined') { App.showToast('SheetJS library not loaded', 'error'); return; }

        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'array' });
                const firstSheet = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
                this._parsedRows = rows;
                this.showPreview(rows);
            } catch (err) {
                App.showToast('Error reading file: ' + err.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    },

    showPreview(rows) {
        const el = document.getElementById('ieImportPreview');
        const actionsEl = document.getElementById('ieImportActions');
        const countEl = document.getElementById('ieImportCount');
        if (!el) return;

        if (!rows || rows.length === 0) {
            el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted)">No data rows found in file.</div>';
            if (actionsEl) actionsEl.style.display = 'none';
            return;
        }

        const headers = Object.keys(rows[0]);
        const preview = rows.slice(0, 10);
        el.innerHTML = `
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Preview — showing ${Math.min(10, rows.length)} of ${rows.length} rows</div>
        <div style="overflow-x:auto;max-height:300px;border:1px solid var(--border);border-radius:8px">
            <table class="data-table" style="font-size:12px;min-width:600px">
                <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                <tbody>${preview.map(r => `<tr>${headers.map(h => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>
        </div>`;
        if (actionsEl) actionsEl.style.display = '';
        if (countEl) countEl.textContent = `Import ${rows.length} Records`;
    },

    confirmImport() {
        const moduleKey = document.getElementById('ieImportModule')?.value;
        const schema = this.IMPORT_SCHEMAS[moduleKey];
        if (!schema || !this._parsedRows || this._parsedRows.length === 0) {
            App.showToast('No data to import', 'error');
            return;
        }

        let success = 0, errors = 0;
        const errorMessages = [];

        this._parsedRows.forEach((row, i) => {
            try {
                // Validate required columns
                const missing = schema.requiredCols.filter(col => {
                    const val = row[col] || row[col.charAt(0).toUpperCase() + col.slice(1)] ||
                        Object.entries(row).find(([k]) => k.toLowerCase().replace(/\s/g, '') === col.toLowerCase())?.[1];
                    return !val;
                });
                if (missing.length > 0) {
                    errors++;
                    errorMessages.push(`Row ${i + 1}: Missing required: ${missing.join(', ')}`);
                    return;
                }
                // Normalize row keys
                const normalized = {};
                Object.entries(row).forEach(([k, v]) => {
                    const camel = k.replace(/\s+(.)/g, (_, c) => c.toUpperCase()).replace(/^\w/, c => c.toLowerCase());
                    normalized[k] = v;
                    normalized[camel] = v;
                });
                schema.save(normalized);
                success++;
            } catch (err) {
                errors++;
                errorMessages.push(`Row ${i + 1}: ${err.message}`);
            }
        });

        const resultEl = document.getElementById('ieImportResult');
        if (resultEl) {
            resultEl.innerHTML = `
            <div style="padding:14px;border-radius:8px;background:${errors > 0 ? '#fef2f2' : '#f0fdf4'};margin-top:12px">
                <div style="font-weight:700;margin-bottom:6px;color:${errors > 0 ? '#991b1b' : '#166534'}">
                    <i class="fas fa-${errors > 0 ? 'exclamation-triangle' : 'check-circle'}"></i>
                    Import Complete: ${success} success, ${errors} failed
                </div>
                ${errorMessages.length > 0 ? `<div style="font-size:12px;max-height:150px;overflow-y:auto">${errorMessages.map(m => `<div style="padding:2px 0;color:#991b1b">${m}</div>`).join('')}</div>` : ''}
            </div>`;
        }

        this._parsedRows = null;
        if (document.getElementById('ieImportActions')) document.getElementById('ieImportActions').style.display = 'none';
        App.showToast(`Imported ${success} records to ${schema.label}`, 'success');
    }
};
