/* ========================================
   UBMS - Certificate of Employment Module
   Generate COE per employee, per business
   Print / Save as PDF via browser
   ======================================== */

const COE = {
    activeTab: 'generate',
    history: [],

    // ============================================================
    //  MAIN RENDER
    // ============================================================
    render(container) {
        this.history = JSON.parse(localStorage.getItem('ubms_coe_history') || '[]');
        container.innerHTML = `
        <div class="section-header mb-3">
            <h2><i class="fas fa-file-contract"></i> Certificate of Employment</h2>
        </div>

        <div class="tabs mb-3">
            <button class="tab-btn active" onclick="COE.switchTab('generate',this)">
                <i class="fas fa-plus-circle"></i> Generate COE
            </button>
            <button class="tab-btn" onclick="COE.switchTab('history',this)">
                <i class="fas fa-history"></i> History
            </button>
        </div>

        <div id="coeTabContent"></div>`;
        this.renderTabContent();
    },

    switchTab(tab, btn) {
        document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        this.activeTab = tab;
        this.renderTabContent();
    },

    renderTabContent() {
        const el = document.getElementById('coeTabContent');
        if (!el) return;
        if (this.activeTab === 'generate') {
            el.innerHTML = this.renderGenerateForm();
        } else {
            el.innerHTML = this.renderHistory();
        }
    },

    // ============================================================
    //  GENERATE FORM
    // ============================================================
    renderGenerateForm() {
        const employees = this.getFilteredEmployees();
        return `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-search"></i> Search Employee</h3></div>
            <div class="card-body">
                <div class="form-row" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
                    <div class="form-group" style="flex:1;min-width:250px">
                        <label>Search by User ID or Name</label>
                        <input type="text" id="coeSearch" class="form-control" placeholder="Enter User ID or employee name..." oninput="COE.searchEmployee()" autofocus>
                    </div>
                    <div class="form-group" style="min-width:200px">
                        <label>Company</label>
                        <select id="coeCompany" class="form-control" onchange="COE.searchEmployee()">
                            ${App.activeCompany !== 'all' ? `<option value="${App.activeCompany}">${DataStore.companies[App.activeCompany]?.name || App.activeCompany}</option>` : Object.entries(DataStore.companies).map(([k,v]) => `<option value="${k}">${v.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div id="coeSearchResults" class="mt-2"></div>
            </div>
        </div>

        <div id="coePreviewArea" class="mt-3"></div>`;
    },

    getFilteredEmployees() {
        const company = App.activeCompany;
        if (company === 'all') return DataStore.employees || [];
        return (DataStore.employees || []).filter(e => e.company === company);
    },

    searchEmployee() {
        const query = (document.getElementById('coeSearch')?.value || '').trim().toLowerCase();
        const company = document.getElementById('coeCompany')?.value || '';
        const container = document.getElementById('coeSearchResults');
        if (!container) return;

        if (!query) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Type a User ID or name to search...</p>';
            return;
        }

        let employees = DataStore.employees || [];
        if (company) employees = employees.filter(e => e.company === company);

        const results = employees.filter(e => {
            const name = (e.name || '').toLowerCase();
            const userId = (e.userId || '').toString().toLowerCase();
            const id = (e.id || '').toLowerCase();
            return name.includes(query) || userId.includes(query) || id.includes(query);
        });

        if (results.length === 0) {
            container.innerHTML = '<div class="empty-state" style="padding:24px"><i class="fas fa-user-slash"></i><h3>No employee found</h3><p>Try a different User ID or name.</p></div>';
            return;
        }

        container.innerHTML = `
        <div style="max-height:300px;overflow-y:auto">
            <table class="data-table">
                <thead><tr>
                    <th>User ID</th><th>Name</th><th>Position</th><th>Company</th><th>Status</th><th>Action</th>
                </tr></thead>
                <tbody>
                ${results.map(e => {
                    const co = DataStore.companies[e.company];
                    return `<tr>
                        <td><strong>${e.userId || e.id}</strong></td>
                        <td>${e.name}</td>
                        <td>${e.position || '—'}</td>
                        <td><span class="badge" style="background:${co?.color || '#666'};color:#fff">${co?.name || e.company}</span></td>
                        <td><span class="badge badge-${e.status === 'active' ? 'success' : 'neutral'}">${e.status || 'active'}</span></td>
                        <td><button class="btn btn-sm btn-primary" onclick="COE.selectEmployee('${e.id}')"><i class="fas fa-file-contract"></i> Generate COE</button></td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table>
        </div>`;
    },

    // ============================================================
    //  SELECT EMPLOYEE & SHOW COE FORM
    // ============================================================
    selectEmployee(empId) {
        const emp = (DataStore.employees || []).find(e => e.id === empId);
        if (!emp) return;
        const co = DataStore.companies[emp.company] || {};
        const preview = document.getElementById('coePreviewArea');
        if (!preview) return;

        const today = new Date().toISOString().split('T')[0];
        const hireDate = emp.createdAt ? emp.createdAt.split('T')[0] : '';

        preview.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-file-contract"></i> COE Details for ${emp.name}</h3>
            </div>
            <div class="card-body">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                    <div class="form-group">
                        <label>Employee Name</label>
                        <input type="text" id="coeName" class="form-control" value="${emp.name}" readonly>
                    </div>
                    <div class="form-group">
                        <label>User ID</label>
                        <input type="text" id="coeUserId" class="form-control" value="${emp.userId || emp.id}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Position / Designation</label>
                        <input type="text" id="coePosition" class="form-control" value="${emp.position || ''}">
                    </div>
                    <div class="form-group">
                        <label>Company</label>
                        <input type="text" id="coeCompanyName" class="form-control" value="${co.name || emp.company}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Date of Employment (Start)</label>
                        <input type="date" id="coeDateStart" class="form-control" value="${hireDate}">
                    </div>
                    <div class="form-group">
                        <label>Date of Employment (End)</label>
                        <input type="date" id="coeDateEnd" class="form-control" value="" placeholder="Leave blank if currently employed">
                        <small style="color:var(--text-muted)">Leave blank if currently employed</small>
                    </div>
                    <div class="form-group">
                        <label>Monthly Compensation</label>
                        <input type="number" id="coeMonthly" class="form-control" value="${emp.monthlyRate || 0}">
                    </div>
                    <div class="form-group">
                        <label>Date of Issuance</label>
                        <input type="date" id="coeIssueDate" class="form-control" value="${today}">
                    </div>
                    <div class="form-group" style="grid-column:1/-1">
                        <label>Purpose</label>
                        <input type="text" id="coePurpose" class="form-control" value="whatever legal purpose it may serve" placeholder="e.g. whatever legal purpose it may serve">
                    </div>
                    <div class="form-group">
                        <label>Signatory Name</label>
                        <input type="text" id="coeSignatory" class="form-control" value="${this.getDefaultSignatory(emp.company)}" placeholder="Owner / HR Manager name">
                    </div>
                    <div class="form-group">
                        <label>Signatory Title</label>
                        <input type="text" id="coeSignatoryTitle" class="form-control" value="${this.getDefaultSignatoryTitle(emp.company)}" placeholder="e.g. Owner / President / HR Manager">
                    </div>
                </div>
                <div class="mt-3" style="display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap">
                    <button class="btn btn-secondary" onclick="COE.previewCOE('${emp.id}')"><i class="fas fa-eye"></i> Preview</button>
                    <button class="btn btn-primary" onclick="COE.printCOE('${emp.id}')"><i class="fas fa-print"></i> Print / Save as PDF</button>
                </div>
            </div>
        </div>
        <div id="coeCertPreview" class="mt-3"></div>`;
    },

    // ============================================================
    //  DEFAULT SIGNATORIES PER BUSINESS
    // ============================================================
    getDefaultSignatory(companyId) {
        const signatories = JSON.parse(localStorage.getItem('ubms_coe_signatories') || '{}');
        if (signatories[companyId]) return signatories[companyId].name;
        const defaults = {
            dheekay: 'DK Chavit',
            kdchavit: 'KD Chavit',
            nuatthai: 'DK Chavit',
            autocasa: 'DK Chavit'
        };
        return defaults[companyId] || 'Business Owner';
    },

    getDefaultSignatoryTitle(companyId) {
        const signatories = JSON.parse(localStorage.getItem('ubms_coe_signatories') || '{}');
        if (signatories[companyId]) return signatories[companyId].title;
        const defaults = {
            dheekay: 'Owner / Proprietor',
            kdchavit: 'Owner / Proprietor',
            nuatthai: 'Owner / Proprietor',
            autocasa: 'Owner / Proprietor'
        };
        return defaults[companyId] || 'Owner / Proprietor';
    },

    // ============================================================
    //  GATHER FORM DATA
    // ============================================================
    gatherFormData(empId) {
        const emp = (DataStore.employees || []).find(e => e.id === empId);
        if (!emp) return null;
        const co = DataStore.companies[emp.company] || {};
        return {
            emp,
            co,
            name: document.getElementById('coeName')?.value || emp.name,
            userId: document.getElementById('coeUserId')?.value || emp.userId || emp.id,
            position: document.getElementById('coePosition')?.value || emp.position || '',
            companyName: document.getElementById('coeCompanyName')?.value || co.name || '',
            dateStart: document.getElementById('coeDateStart')?.value || '',
            dateEnd: document.getElementById('coeDateEnd')?.value || '',
            monthlyRate: parseFloat(document.getElementById('coeMonthly')?.value || 0),
            issueDate: document.getElementById('coeIssueDate')?.value || new Date().toISOString().split('T')[0],
            purpose: document.getElementById('coePurpose')?.value || 'whatever legal purpose it may serve',
            signatory: document.getElementById('coeSignatory')?.value || 'Business Owner',
            signatoryTitle: document.getElementById('coeSignatoryTitle')?.value || 'Owner / Proprietor'
        };
    },

    // ============================================================
    //  FORMAT HELPERS
    // ============================================================
    formatDateLong(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    },

    formatCurrency(amount) {
        return '₱' + Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    numberToWords(num) {
        if (num === 0) return 'Zero';
        const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
            'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
        const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
        const scales = ['','Thousand','Million','Billion'];

        function convert(n) {
            if (n === 0) return '';
            if (n < 20) return ones[n] + ' ';
            if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '') + ' ';
            if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + convert(n % 100);
            for (let i = scales.length - 1; i >= 1; i--) {
                const unit = Math.pow(1000, i);
                if (n >= unit) return convert(Math.floor(n / unit)) + scales[i] + ' ' + convert(n % unit);
            }
            return '';
        }

        const whole = Math.floor(Math.abs(num));
        const cents = Math.round((Math.abs(num) - whole) * 100);
        let result = convert(whole).trim();
        if (cents > 0) result += ' and ' + cents + '/100';
        else result += ' and 00/100';
        return result + ' Pesos';
    },

    // ============================================================
    //  BUSINESS-SPECIFIC COE TEMPLATES
    // ============================================================
    buildCOEContent(data) {
        const companyId = data.co.id || data.emp.company;
        switch (companyId) {
            case 'dheekay':   return this.templateDheekay(data);
            case 'kdchavit':  return this.templateKdchavit(data);
            case 'nuatthai':  return this.templateNuatthai(data);
            case 'autocasa':  return this.templateAutocasa(data);
            default:          return this.templateGeneric(data);
        }
    },

    // ---- Shared header builder ----
    buildHeader(data, subtitle) {
        const logoSrc = data.co.logo || '';
        return `
        <div style="text-align:center;padding-bottom:16px;margin-bottom:20px;border-bottom:3px double #333">
            ${logoSrc ? `<img src="${logoSrc}" alt="${data.companyName}" style="height:70px;margin-bottom:8px;object-fit:contain" onerror="this.style.display='none'">` : ''}
            <h1 style="margin:0;font-size:22px;font-weight:800;letter-spacing:1px;color:#1a1a2e">${data.companyName.toUpperCase()}</h1>
            ${subtitle ? `<div style="font-size:12px;color:#555;margin-top:2px">${subtitle}</div>` : ''}
            <div style="font-size:12px;color:#666;margin-top:4px">${data.co.address || ''}</div>
            <div style="font-size:12px;color:#666">Tel: ${data.co.phone || ''} | Email: ${data.co.email || ''}</div>
            ${data.co.tin ? `<div style="font-size:11px;color:#888;margin-top:2px">TIN: ${data.co.tin}</div>` : ''}
        </div>`;
    },

    // ---- Shared body builder ----
    buildBody(data) {
        const isCurrentlyEmployed = !data.dateEnd;
        const employmentPeriod = data.dateStart
            ? `from <strong>${this.formatDateLong(data.dateStart)}</strong> ${isCurrentlyEmployed ? 'up to the present' : `to <strong>${this.formatDateLong(data.dateEnd)}</strong>`}`
            : (isCurrentlyEmployed ? 'and is currently employed' : 'was previously employed');

        return `
        <h2 style="text-align:center;font-size:20px;margin:30px 0 8px;font-weight:700;letter-spacing:3px;text-decoration:underline">CERTIFICATE OF EMPLOYMENT</h2>
        <p style="text-align:center;font-size:13px;color:#666;margin-bottom:30px">Date Issued: ${this.formatDateLong(data.issueDate)}</p>

        <p style="font-size:14px;margin-bottom:16px"><strong>TO WHOM IT MAY CONCERN:</strong></p>

        <p style="font-size:14px;line-height:2;text-align:justify;text-indent:40px">
            This is to certify that <strong style="text-decoration:underline">${data.name.toUpperCase()}</strong>,
            with Employee ID <strong>${data.userId}</strong>,
            ${isCurrentlyEmployed ? 'is' : 'was'} a <em>bona fide</em> employee of
            <strong>${data.companyName}</strong>,
            holding the position of <strong>${data.position || 'Employee'}</strong>,
            ${employmentPeriod}.
        </p>

        ${data.monthlyRate > 0 ? `
        <p style="font-size:14px;line-height:2;text-align:justify;text-indent:40px">
            ${isCurrentlyEmployed ? 'He/She receives' : 'He/She received'} a monthly compensation of
            <strong>${this.formatCurrency(data.monthlyRate)}</strong>
            (${this.numberToWords(data.monthlyRate)}).
        </p>` : ''}

        <p style="font-size:14px;line-height:2;text-align:justify;text-indent:40px">
            This certification is being issued upon the request of the above-named employee for
            <strong>${data.purpose}</strong>.
        </p>

        <p style="font-size:14px;line-height:2;text-align:justify;text-indent:40px">
            Issued this <strong>${this.formatDateLong(data.issueDate)}</strong> at <strong>${data.co.address || 'company premises'}</strong>.
        </p>`;
    },

    // ---- Shared signature block ----
    buildSignature(data) {
        return `
        <div style="margin-top:60px">
            <div style="float:right;text-align:center;width:280px">
                <div style="border-bottom:1px solid #333;padding-bottom:4px;font-weight:700;font-size:14px">${data.signatory.toUpperCase()}</div>
                <div style="font-size:12px;color:#555;margin-top:4px">${data.signatoryTitle}</div>
            </div>
            <div style="clear:both"></div>
        </div>

        <div style="margin-top:40px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:12px">
            <em>This document is computer-generated. Not valid without authorized signature and company seal.</em><br>
            <em>Document Reference: COE-${data.userId}-${data.issueDate.replace(/-/g, '')}</em>
        </div>`;
    },

    // ============================================================
    //  TEMPLATE: DHEEKAY BUILDERS OPC
    // ============================================================
    templateDheekay(data) {
        return `
        <div style="border:2px solid #16a085;padding:40px;max-width:800px;margin:0 auto;font-family:'Inter',sans-serif;position:relative">
            <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#16a085,#1abc9c)"></div>
            ${this.buildHeader(data, 'General Construction & Building Services')}
            ${this.buildBody(data)}
            ${this.buildSignature(data)}
        </div>`;
    },

    // ============================================================
    //  TEMPLATE: KDCHAVIT CONSTRUCTION
    // ============================================================
    templateKdchavit(data) {
        return `
        <div style="border:2px solid #2c3e50;padding:40px;max-width:800px;margin:0 auto;font-family:'Inter',sans-serif;position:relative">
            <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#2c3e50,#34495e)"></div>
            ${this.buildHeader(data, 'Construction & Project Management')}
            ${this.buildBody(data)}
            ${this.buildSignature(data)}
        </div>`;
    },

    // ============================================================
    //  TEMPLATE: NUAT THAI FOOT & BODY MASSAGE
    // ============================================================
    templateNuatthai(data) {
        return `
        <div style="border:2px solid #DAA520;padding:40px;max-width:800px;margin:0 auto;font-family:'Inter',sans-serif;position:relative">
            <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#FFD700,#DAA520)"></div>
            ${this.buildHeader(data, 'Wellness & Therapeutic Massage Services')}
            ${this.buildBody(data)}
            ${this.buildSignature(data)}
        </div>`;
    },

    // ============================================================
    //  TEMPLATE: AUTOCASA AUTO EXPERT & REPAIR SERVICES
    // ============================================================
    templateAutocasa(data) {
        return `
        <div style="border:2px solid #e74c3c;padding:40px;max-width:800px;margin:0 auto;font-family:'Inter',sans-serif;position:relative">
            <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#e74c3c,#c0392b)"></div>
            ${this.buildHeader(data, 'Automotive Repair, Maintenance & Expert Services')}
            ${this.buildBody(data)}
            ${this.buildSignature(data)}
        </div>`;
    },

    // ============================================================
    //  TEMPLATE: GENERIC (fallback)
    // ============================================================
    templateGeneric(data) {
        return `
        <div style="border:2px solid #333;padding:40px;max-width:800px;margin:0 auto;font-family:'Inter',sans-serif">
            ${this.buildHeader(data, '')}
            ${this.buildBody(data)}
            ${this.buildSignature(data)}
        </div>`;
    },

    // ============================================================
    //  PREVIEW COE
    // ============================================================
    previewCOE(empId) {
        const data = this.gatherFormData(empId);
        if (!data) return;
        const preview = document.getElementById('coeCertPreview');
        if (!preview) return;

        const content = this.buildCOEContent(data);
        preview.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-eye"></i> Certificate Preview</h3>
                <div>
                    <button class="btn btn-sm btn-primary" onclick="COE.printCOE('${empId}')"><i class="fas fa-print"></i> Print / PDF</button>
                </div>
            </div>
            <div class="card-body" style="background:#f8f9fa;padding:24px">
                ${content}
            </div>
        </div>`;

        preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // ============================================================
    //  PRINT / SAVE AS PDF
    // ============================================================
    printCOE(empId) {
        const data = this.gatherFormData(empId);
        if (!data) return;

        // Save signatory for this company
        const signatories = JSON.parse(localStorage.getItem('ubms_coe_signatories') || '{}');
        signatories[data.co.id || data.emp.company] = { name: data.signatory, title: data.signatoryTitle };
        localStorage.setItem('ubms_coe_signatories', JSON.stringify(signatories));

        const content = this.buildCOEContent(data);
        const logoSrc = data.co.logo || '';

        // Convert logo to base64 for the print window
        const buildAndPrint = (logoBase64) => {
            let printContent = content;
            if (logoBase64 && logoSrc) {
                // Replace the logo src with base64 so it works in the print window
                printContent = content.replace(`src="${logoSrc}"`, `src="${logoBase64}"`);
            }

            const printWindow = window.open('', '_blank', 'width=900,height=1000');
            if (!printWindow) {
                if (typeof App !== 'undefined' && App.showToast) App.showToast('Pop-up blocked. Please allow pop-ups for this site.', 'error');
                return;
            }
            printWindow.document.write(`<!DOCTYPE html><html><head>
                <title>COE - ${data.name}</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Inter', sans-serif; padding: 20px; font-size: 14px; color: #1a1a2e; background: #fff; }
                    @media print {
                        body { padding: 0; }
                        @page { margin: 15mm 15mm 15mm 15mm; size: A4; }
                    }
                </style>
            </head><body>${printContent}
                <script>
                    setTimeout(function(){
                        window.print();
                    }, 500);
                <\/script>
            </body></html>`);
            printWindow.document.close();
        };

        // Save to history
        this.saveToHistory(data);

        // Try to convert logo to base64 for cross-origin print window
        if (logoSrc) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    buildAndPrint(canvas.toDataURL('image/png'));
                } catch (e) {
                    buildAndPrint(null);
                }
            };
            img.onerror = function() {
                buildAndPrint(null);
            };
            img.src = logoSrc;
        } else {
            buildAndPrint(null);
        }
    },

    // ============================================================
    //  HISTORY
    // ============================================================
    saveToHistory(data) {
        const entry = {
            id: 'COE-' + Date.now(),
            employeeId: data.emp.id,
            employeeName: data.name,
            userId: data.userId,
            position: data.position,
            company: data.emp.company,
            companyName: data.companyName,
            dateStart: data.dateStart,
            dateEnd: data.dateEnd,
            issueDate: data.issueDate,
            purpose: data.purpose,
            signatory: data.signatory,
            signatoryTitle: data.signatoryTitle,
            generatedAt: new Date().toISOString(),
            generatedBy: (typeof Auth !== 'undefined' && Auth.session) ? Auth.session.name || Auth.session.username : 'System'
        };
        this.history.unshift(entry);
        if (this.history.length > 200) this.history = this.history.slice(0, 200);
        localStorage.setItem('ubms_coe_history', JSON.stringify(this.history));
    },

    renderHistory() {
        if (!this.history.length) {
            return '<div class="empty-state"><i class="fas fa-history"></i><h3>No Certificates Generated Yet</h3><p>Generated certificates will appear here for tracking.</p></div>';
        }

        return `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-history"></i> Generated Certificates (${this.history.length})</h3>
            </div>
            <div class="card-body no-padding">
                <div style="max-height:500px;overflow-y:auto">
                    <table class="data-table">
                        <thead><tr>
                            <th>Date Issued</th><th>Employee</th><th>User ID</th><th>Position</th><th>Company</th><th>Purpose</th><th>Generated By</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                        ${this.history.map(h => {
                            const co = DataStore.companies[h.company];
                            return `<tr>
                                <td>${this.formatDateLong(h.issueDate)}</td>
                                <td><strong>${h.employeeName}</strong></td>
                                <td>${h.userId}</td>
                                <td>${h.position || '—'}</td>
                                <td><span class="badge" style="background:${co?.color || '#666'};color:#fff">${h.companyName || h.company}</span></td>
                                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${h.purpose || ''}">${h.purpose || '—'}</td>
                                <td>${h.generatedBy}</td>
                                <td>
                                    <button class="btn btn-sm btn-primary" onclick="COE.reprintFromHistory('${h.id}')" title="Reprint"><i class="fas fa-print"></i></button>
                                    ${Auth.canDelete() ? `<button class="btn btn-sm btn-danger" onclick="COE.deleteHistoryEntry('${h.id}')" title="Delete"><i class="fas fa-trash"></i></button>` : ''}
                                </td>
                            </tr>`;
                        }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
    },

    reprintFromHistory(historyId) {
        const h = this.history.find(e => e.id === historyId);
        if (!h) return;
        const emp = (DataStore.employees || []).find(e => e.id === h.employeeId);
        if (!emp) {
            if (typeof App !== 'undefined' && App.showToast) App.showToast('Employee record not found. They may have been deleted.', 'error');
            return;
        }
        const co = DataStore.companies[emp.company] || {};
        const data = {
            emp,
            co,
            name: h.employeeName,
            userId: h.userId,
            position: h.position,
            companyName: h.companyName || co.name || '',
            dateStart: h.dateStart,
            dateEnd: h.dateEnd,
            monthlyRate: emp.monthlyRate || 0,
            issueDate: h.issueDate,
            purpose: h.purpose,
            signatory: h.signatory || this.getDefaultSignatory(emp.company),
            signatoryTitle: h.signatoryTitle || this.getDefaultSignatoryTitle(emp.company)
        };

        const content = this.buildCOEContent(data);
        const printWindow = window.open('', '_blank', 'width=900,height=1000');
        if (!printWindow) {
            if (typeof App !== 'undefined' && App.showToast) App.showToast('Pop-up blocked. Please allow pop-ups.', 'error');
            return;
        }
        printWindow.document.write(`<!DOCTYPE html><html><head>
            <title>COE - ${data.name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Inter', sans-serif; padding: 20px; font-size: 14px; color: #1a1a2e; background: #fff; }
                @media print {
                    body { padding: 0; }
                    @page { margin: 15mm 15mm 15mm 15mm; size: A4; }
                }
            </style>
        </head><body>${content}
            <script>setTimeout(function(){window.print();},500);<\/script>
        </body></html>`);
        printWindow.document.close();
    },

    deleteHistoryEntry(historyId) {
        if (!confirm('Delete this certificate record from history?')) return;
        this.history = this.history.filter(e => e.id !== historyId);
        localStorage.setItem('ubms_coe_history', JSON.stringify(this.history));
        this.renderTabContent();
        if (typeof App !== 'undefined' && App.showToast) App.showToast('History entry deleted', 'success');
    }
};
