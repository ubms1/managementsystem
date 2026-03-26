/* ========================================
   UBMS — Automated Payroll & Payslip System
   DOLE / BIR / SSS / PhilHealth / Pag-IBIG
   13th Month · OT · Absences · Late · Schedules
   Incentives · Allowances · Gov Reports
   ======================================== */

const Payroll = {
    activeTab: 'payslips',

    // ============================================================
    //  2024 SSS CONTRIBUTION TABLE (RA 11199)
    // ============================================================
    sssTable: [
        { min: 0, max: 4249.99, ee: 180, er: 390 },
        { min: 4250, max: 4749.99, ee: 202.50, er: 437.50 },
        { min: 4750, max: 5249.99, ee: 225, er: 485 },
        { min: 5250, max: 5749.99, ee: 247.50, er: 532.50 },
        { min: 5750, max: 6249.99, ee: 270, er: 580 },
        { min: 6250, max: 6749.99, ee: 292.50, er: 627.50 },
        { min: 6750, max: 7249.99, ee: 315, er: 675 },
        { min: 7250, max: 7749.99, ee: 337.50, er: 722.50 },
        { min: 7750, max: 8249.99, ee: 360, er: 770 },
        { min: 8250, max: 8749.99, ee: 382.50, er: 817.50 },
        { min: 8750, max: 9249.99, ee: 405, er: 865 },
        { min: 9250, max: 9749.99, ee: 427.50, er: 912.50 },
        { min: 9750, max: 10249.99, ee: 450, er: 960 },
        { min: 10250, max: 10749.99, ee: 472.50, er: 1007.50 },
        { min: 10750, max: 11249.99, ee: 495, er: 1055 },
        { min: 11250, max: 11749.99, ee: 517.50, er: 1102.50 },
        { min: 11750, max: 12249.99, ee: 540, er: 1150 },
        { min: 12250, max: 12749.99, ee: 562.50, er: 1197.50 },
        { min: 12750, max: 13249.99, ee: 585, er: 1245 },
        { min: 13250, max: 13749.99, ee: 607.50, er: 1292.50 },
        { min: 13750, max: 14249.99, ee: 630, er: 1340 },
        { min: 14250, max: 14749.99, ee: 652.50, er: 1387.50 },
        { min: 14750, max: 15249.99, ee: 675, er: 1435 },
        { min: 15250, max: 15749.99, ee: 697.50, er: 1482.50 },
        { min: 15750, max: 16249.99, ee: 720, er: 1530 },
        { min: 16250, max: 16749.99, ee: 742.50, er: 1577.50 },
        { min: 16750, max: 17249.99, ee: 765, er: 1625 },
        { min: 17250, max: 17749.99, ee: 787.50, er: 1672.50 },
        { min: 17750, max: 18249.99, ee: 810, er: 1720 },
        { min: 18250, max: 18749.99, ee: 832.50, er: 1767.50 },
        { min: 18750, max: 19249.99, ee: 855, er: 1815 },
        { min: 19250, max: 19749.99, ee: 877.50, er: 1862.50 },
        { min: 19750, max: 20249.99, ee: 900, er: 1900 },
        { min: 20250, max: 24749.99, ee: 1125, er: 2375 },
        { min: 24750, max: 29249.99, ee: 1350, er: 2850 },
        { min: 29250, max: Infinity, ee: 1350, er: 2850 }
    ],

    getSSSContribution(monthlySalary) {
        const row = this.sssTable.find(r => monthlySalary >= r.min && monthlySalary <= r.max);
        return row || { ee: 1350, er: 2850 };
    },

    getPhilHealthContribution(monthlySalary) {
        // 2024: 5% premium rate, split 50/50
        const rate = 0.05;
        const premium = monthlySalary * rate;
        const share = premium / 2;
        return { ee: Math.min(share, 5000), er: Math.min(share, 5000) };
    },

    getPagIBIGContribution(monthlySalary) {
        // Employee: 2% if > 1500, else 1%; Employer: 2%; Max ₱200 each
        const eeRate = monthlySalary > 1500 ? 0.02 : 0.01;
        return { ee: Math.min(monthlySalary * eeRate, 200), er: Math.min(monthlySalary * 0.02, 200) };
    },

    getWithholdingTax(taxableIncome, period) {
        // Monthly BIR tax table (2024 TRAIN law)
        const monthly = period === 'semi-monthly' ? taxableIncome * 2 : taxableIncome;
        let tax = 0;
        if (monthly <= 20833) tax = 0;
        else if (monthly <= 33333) tax = (monthly - 20833) * 0.15;
        else if (monthly <= 66667) tax = 1875 + (monthly - 33333) * 0.20;
        else if (monthly <= 166667) tax = 8541.80 + (monthly - 66667) * 0.25;
        else if (monthly <= 666667) tax = 33541.80 + (monthly - 166667) * 0.30;
        else tax = 183541.80 + (monthly - 666667) * 0.35;
        return period === 'semi-monthly' ? tax / 2 : tax;
    },

    // ============================================================
    //  RENDER MAIN VIEW
    // ============================================================
    render(container) {
        const employees = this.getFilteredEmployees();
        const payslips = this.getFilteredPayslips();
        const totalPayout = payslips.reduce((s, p) => s + (p.netPay || 0), 0);
        const thisMonth = payslips.filter(p => new Date(p.periodEnd).getMonth() === new Date().getMonth());
        const thirteenthTotal = this.compute13thMonthAll();

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon teal"><i class="fas fa-users"></i></div></div><div class="stat-value">${employees.length}</div><div class="stat-label">Employees</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-file-invoice-dollar"></i></div></div><div class="stat-value">${payslips.length}</div><div class="stat-label">Total Payslips</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-peso-sign"></i></div></div><div class="stat-value">${Utils.formatCurrency(totalPayout)}</div><div class="stat-label">Total Payouts</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-gift"></i></div></div><div class="stat-value">${Utils.formatCurrency(thirteenthTotal)}</div><div class="stat-label">13th Month (Est.)</div></div>
        </div>

        <!-- Tabs -->
        <div class="tabs mb-2" style="flex-wrap:wrap">
            <button class="tab-btn ${this.activeTab === 'payslips' ? 'active' : ''}" onclick="Payroll.switchTab('payslips')"><i class="fas fa-receipt"></i> Payslips</button>
            <button class="tab-btn ${this.activeTab === 'employees' ? 'active' : ''}" onclick="Payroll.switchTab('employees')"><i class="fas fa-id-badge"></i> Employees</button>
            <button class="tab-btn ${this.activeTab === 'attendance' ? 'active' : ''}" onclick="Payroll.switchTab('attendance')"><i class="fas fa-clock"></i> Attendance</button>
            <button class="tab-btn ${this.activeTab === 'timesheets' ? 'active' : ''}" onclick="Payroll.switchTab('timesheets')"><i class="fas fa-calendar-check"></i> Timesheets</button>
            <button class="tab-btn ${this.activeTab === 'performance' ? 'active' : ''}" onclick="Payroll.switchTab('performance')"><i class="fas fa-chart-line"></i> Performance</button>
            <button class="tab-btn ${this.activeTab === 'incidents' ? 'active' : ''}" onclick="Payroll.switchTab('incidents')"><i class="fas fa-exclamation-triangle"></i> Incidents</button>
            <button class="tab-btn ${this.activeTab === 'schedules' ? 'active' : ''}" onclick="Payroll.switchTab('schedules')"><i class="fas fa-calendar-alt"></i> Schedules</button>
            <button class="tab-btn ${this.activeTab === '13thmonth' ? 'active' : ''}" onclick="Payroll.switchTab('13thmonth')"><i class="fas fa-gift"></i> 13th Month</button>
            <button class="tab-btn ${this.activeTab === 'govreports' ? 'active' : ''}" onclick="Payroll.switchTab('govreports')"><i class="fas fa-university"></i> Gov Reports</button>
        </div>

        <div id="payrollTabContent"></div>`;

        this.renderTabContent();
    },

    switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
        const allBtns = document.querySelectorAll('.tabs .tab-btn');
        allBtns.forEach(b => {
            if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${tab}'`)) b.classList.add('active');
        });
        this.renderTabContent();
    },

    renderTabContent() {
        const el = document.getElementById('payrollTabContent');
        if (!el) return;
        switch (this.activeTab) {
            case 'payslips': el.innerHTML = this.renderPayslipsTab(); break;
            case 'employees': el.innerHTML = this.renderEmployeesTab(); break;
            case 'attendance': el.innerHTML = this.renderAttendanceTab(); this.loadFaceScanGallery(); break;
            case 'timesheets': el.innerHTML = this.renderTimesheetsTab(); break;
            case 'performance': el.innerHTML = this.renderPerformanceTab(); break;
            case 'incidents': el.innerHTML = this.renderIncidentsTab(); break;
            case 'schedules': el.innerHTML = this.renderSchedulesTab(); break;
            case '13thmonth': el.innerHTML = this.render13thMonthTab(); break;
            case 'govreports': el.innerHTML = this.renderGovReportsTab(); break;
        }
    },

    // ============================================================
    //  PAYSLIPS TAB
    // ============================================================
    renderPayslipsTab() {
        const payslips = this.getFilteredPayslips();
        return `<div class="card"><div class="card-header"><h3><i class="fas fa-receipt"></i> Payslips</h3>
            <div style="display:flex;gap:6px">
                <button class="btn btn-sm btn-primary" onclick="Payroll.openBatchGenerate()"><i class="fas fa-layer-group"></i> Batch Generate</button>
                <button class="btn btn-sm btn-primary" onclick="Payroll.openGeneratePayslip()"><i class="fas fa-plus"></i> Generate</button>
            </div></div>
            <div class="card-body no-padding">${this.buildPayslipList(payslips)}</div></div>`;
    },

    // ============================================================
    //  EMPLOYEES TAB
    // ============================================================
    renderEmployeesTab() {
        const employees = this.getFilteredEmployees();
        return `<div class="card"><div class="card-header"><h3><i class="fas fa-id-badge"></i> Employees</h3>
            <button class="btn btn-sm btn-primary" onclick="Payroll.openAddEmployee()"><i class="fas fa-plus"></i> Add</button></div>
            <div class="card-body no-padding">${this.buildEmployeeList(employees)}</div></div>`;
    },

    // ============================================================
    //  ATTENDANCE TAB
    // ============================================================
    renderAttendanceTab() {
        const employees = this.getFilteredEmployees();
        const _now = new Date();
        const today = _now.getFullYear() + '-' + String(_now.getMonth()+1).padStart(2,'0') + '-' + String(_now.getDate()).padStart(2,'0');
        const records = (DataStore.attendanceRecords || []).filter(r => {
            if (App.activeCompany !== 'all') {
                const emp = DataStore.employees.find(e => e.id === r.employeeId);
                if (!emp || emp.company !== App.activeCompany) return false;
            }
            return true;
        });
        const todayRecs = records.filter(r => r.date === today);

        // Build kiosk links
        const urlPrefix = window.UBMS_STANDALONE ? '../' : '';
        const activeCompany = App.activeCompany;
        const allCompanies = Object.keys(DataStore.companies);
        const targetLinks = activeCompany === 'all' ? allCompanies : [activeCompany];
        const kioskLinksHtml = targetLinks.map(co => {
            const c = DataStore.companies[co];
            if (!c) return '';
            const urlMgr = `${urlPrefix}timeinout.html?company=${co}&role=manager`;
            const urlEmp = `${urlPrefix}timeinout.html?company=${co}&role=employee`;
            return `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
                <div style="width:36px;height:36px;border-radius:50%;background:#fff;border:2px solid ${c.color}40;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                    <img src="${urlPrefix}${c.logo}" alt="${c.name}" style="width:100%;height:100%;object-fit:contain" onerror="this.parentElement.innerHTML='<i class=&quot;fas ${c.icon}&quot; style=&quot;color:${c.color};font-size:16px&quot;></i>'">
                </div>
                <div style="flex:1;min-width:0">
                    <div style="font-weight:700;font-size:13px">${c.name}</div>
                    <div style="font-size:11px;color:var(--text-muted)">Manager & Employee kiosk links</div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap">
                    <a href="${urlMgr}" target="_blank" class="btn btn-sm btn-primary" title="Manager Kiosk"><i class="fas fa-user-shield"></i> Manager</a>
                    <a href="${urlEmp}" target="_blank" class="btn btn-sm btn-secondary" title="Employee Kiosk"><i class="fas fa-user"></i> Employee</a>
                    <button class="btn btn-sm btn-secondary" onclick="Payroll.copyKioskLink('${urlMgr}')" title="Copy Manager Link"><i class="fas fa-copy"></i> Mgr</button>
                    <button class="btn btn-sm btn-secondary" onclick="Payroll.copyKioskLink('${urlEmp}')" title="Copy Employee Link"><i class="fas fa-copy"></i> Emp</button>
                </div>
            </div>`;
        }).join('');

        // Attendance stats cards
        const presentToday = todayRecs.filter(r => r.status === 'present' || r.status === 'late').length;
        const lateToday = todayRecs.filter(r => r.status === 'late').length;
        const absentToday = employees.length - presentToday;
        const geoTaggedToday = todayRecs.filter(r => r.location).length;

        return `
        <!-- Attendance Stats -->
        <div class="grid-4 mb-2">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-user-check"></i></div></div><div class="stat-value">${presentToday}</div><div class="stat-label">Present Today</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-user-clock"></i></div></div><div class="stat-value">${lateToday}</div><div class="stat-label">Late Today</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon red"><i class="fas fa-user-times"></i></div></div><div class="stat-value">${absentToday < 0 ? 0 : absentToday}</div><div class="stat-label">Absent Today</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-map-marker-alt"></i></div></div><div class="stat-value">${geoTaggedToday}</div><div class="stat-label">GPS Tagged</div></div>
        </div>

        <!-- Kiosk Links Card -->
        <div class="card mb-3" style="border-left:4px solid var(--secondary)">
            <div class="card-header">
                <h3><i class="fas fa-qrcode" style="margin-right:8px;color:var(--secondary)"></i>Digital Attendance Kiosk Links</h3>
                <span style="font-size:12px;color:var(--text-muted)">Share these links with employees to clock in/out via mobile or computer</span>
            </div>
            <div class="card-body">
                <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
                    <i class="fas fa-info-circle" style="color:var(--info)"></i>
                    Employees open the link on their device, select their name, tap <strong>TIME IN</strong> or <strong>TIME OUT</strong>. GPS location &amp; accuracy are captured automatically.
                </div>
                ${kioskLinksHtml}
            </div>
        </div>

        <div class="card mb-2">
            <div class="card-header"><h3><i class="fas fa-clock"></i> Daily Attendance — ${today}</h3>
                <div style="display:flex;gap:6px">
                    <select class="form-control" style="width:auto;font-size:12px" id="attDateFilter" onchange="Payroll.filterAttByDate()" value="${today}">
                        <option value="${today}">Today</option>
                        <option value="all">All Dates</option>
                    </select>
                    <button class="btn btn-sm btn-secondary" onclick="Payroll.renderTabContent()" title="Refresh"><i class="fas fa-sync-alt"></i></button>
                    <button class="btn btn-sm btn-primary" onclick="Payroll.openLogAttendance()"><i class="fas fa-plus"></i> Log Entry</button>
                </div>
            </div>
            <div class="card-body no-padding">
                <table class="data-table">
                    <thead><tr><th>Employee</th><th>Date</th><th>Time In</th><th>Time Out</th><th>Late</th><th>UT</th><th>OT</th><th>Geolocation</th><th>Source</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                    ${todayRecs.length === 0 ? '<tr><td colspan="11" style="text-align:center;padding:24px;color:var(--text-muted)"><i class="fas fa-clock" style="margin-right:6px"></i>No attendance records for today</td></tr>' :
                    todayRecs.map(r => {
                        const emp = DataStore.employees.find(e => e.id === r.employeeId);
                        const locDetail = this.renderGeoCell(r);
                        const srcBadge = r.source === 'kiosk' ? `<span class="badge-tag" style="background:#e0f2f1;color:#00897b;font-size:10px;padding:2px 6px">kiosk</span>` :
                            r.source === 'biometric' ? `<span class="badge-tag" style="background:#e8eaf6;color:#3f51b5;font-size:10px;padding:2px 6px">biometric</span>` :
                            `<span class="badge-tag" style="background:#f5f5f5;color:#666;font-size:10px;padding:2px 6px">manual</span>`;
                        const canClockOut = r.timeIn && !r.timeOut;
                        return `<tr>
                            <td><strong>${emp?.name || r.employeeId}</strong></td>
                            <td style="font-size:11px">${r.date}</td>
                            <td>${r.timeIn || '—'}</td>
                            <td>${r.timeOut || '<span style="color:var(--warning);font-size:11px">Pending</span>'}</td>
                            <td style="color:${r.lateMinutes > 0 ? 'var(--danger)' : ''}">${r.lateMinutes || 0}m</td>
                            <td style="color:${r.undertimeMinutes > 0 ? 'var(--danger)' : ''}">${r.undertimeMinutes || 0}m</td>
                            <td>${r.overtimeHours || 0}h</td>
                            <td>${locDetail}</td>
                            <td>${srcBadge}</td>
                            <td><span class="badge-tag badge-${r.status === 'present' ? 'green' : r.status === 'absent' ? 'red' : r.status === 'late' ? 'orange' : 'orange'}">${r.status || 'present'}</span></td>
                            <td>${canClockOut ? `<button class="btn btn-sm btn-danger" onclick="Payroll.adminClockOut('${r.id}')" title="Clock Out"><i class="fas fa-sign-out-alt"></i></button>` : '—'}</td>
                        </tr>`;
                    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-history"></i> Attendance Summary (Current Month)</h3></div>
            <div class="card-body no-padding">
                <table class="data-table">
                    <thead><tr><th>Employee</th><th>Days Present</th><th>Absences</th><th>Total Late (min)</th><th>Total Undertime</th><th>Total OT (hrs)</th><th>GPS Tagged</th><th>Attendance Rate</th></tr></thead>
                    <tbody>
                    ${employees.map(emp => {
                        const now = new Date();
                        const empRecs = records.filter(r => r.employeeId === emp.id && new Date(r.date).getMonth() === now.getMonth() && new Date(r.date).getFullYear() === now.getFullYear());
                        const present = empRecs.filter(r => r.status === 'present' || r.status === 'late').length;
                        const absent = empRecs.filter(r => r.status === 'absent').length;
                        const totalLate = empRecs.reduce((s, r) => s + (r.lateMinutes || 0), 0);
                        const totalUT = empRecs.reduce((s, r) => s + (r.undertimeMinutes || 0), 0);
                        const totalOT = empRecs.reduce((s, r) => s + (r.overtimeHours || 0), 0);
                        const geoCount = empRecs.filter(r => r.location).length;
                        const workDays = this.getWorkDaysInMonth(now.getFullYear(), now.getMonth());
                        const rate = workDays > 0 ? ((present / workDays) * 100).toFixed(0) : 0;
                        const rateColor = rate >= 95 ? 'var(--success)' : rate >= 80 ? 'var(--warning)' : 'var(--danger)';
                        return `<tr><td><strong>${emp.name}</strong></td><td>${present}</td><td style="color:${absent > 0 ? 'var(--danger)' : ''}">${absent}</td>
                        <td style="color:${totalLate > 0 ? 'var(--danger)' : ''}">${totalLate}</td><td>${totalUT}</td><td>${totalOT}</td>
                        <td>${geoCount}/${empRecs.length}</td>
                        <td><strong style="color:${rateColor}">${rate}%</strong></td></tr>`;
                    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Face Scan Gallery for Managers / Superadmin -->
        <div class="card mt-2">
            <div class="card-header">
                <h3><i class="fas fa-camera" style="margin-right:8px;color:var(--info)"></i>Face Scan Gallery</h3>
                <div style="display:flex;gap:6px">
                    <input type="date" class="form-control" style="width:auto;font-size:12px" id="faceScanDateFilter" value="${today}" onchange="Payroll.loadFaceScanGallery()">
                    <button class="btn btn-sm btn-secondary" onclick="Payroll.loadFaceScanGallery()" title="Refresh"><i class="fas fa-sync-alt"></i></button>
                </div>
            </div>
            <div class="card-body" id="faceScanGalleryBody">
                <div style="text-align:center;padding:24px;color:var(--text-muted)">
                    <i class="fas fa-spinner fa-spin" style="font-size:24px;margin-bottom:8px;display:block"></i>
                    Loading face scan images…
                </div>
            </div>
        </div>`;
    },

    renderGeoCell(record) {
        const loc = record.location;
        const locOut = record.locationOut;
        if (!loc && !locOut) return `<span style="color:var(--text-muted);font-size:11px">—</span>`;
        let html = '';
        if (loc) {
            const acc = loc.accuracy || '?';
            const accColor = acc <= 20 ? 'var(--success)' : acc <= 100 ? 'var(--warning)' : 'var(--danger)';
            html += `<a href="${loc.mapsUrl}" target="_blank" style="color:var(--secondary);font-size:11px;display:block" title="Time In: ${loc.lat}, ${loc.lng}"><i class="fas fa-map-marker-alt"></i> In <span style="color:${accColor};font-size:10px">(±${acc}m)</span></a>`;
        }
        if (locOut) {
            const acc = locOut.accuracy || '?';
            const accColor = acc <= 20 ? 'var(--success)' : acc <= 100 ? 'var(--warning)' : 'var(--danger)';
            html += `<a href="${locOut.mapsUrl}" target="_blank" style="color:var(--danger);font-size:11px;display:block" title="Time Out: ${locOut.lat}, ${locOut.lng}"><i class="fas fa-map-marker-alt"></i> Out <span style="color:${accColor};font-size:10px">(±${acc}m)</span></a>`;
        }
        return html;
    },

    getWorkDaysInMonth(year, month) {
        let count = 0;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const day = new Date(year, month, d).getDay();
            if (day !== 0 && day !== 6) count++;
        }
        return count;
    },

    filterAttByDate() {
        // Re-render with optional filter
        this.renderTabContent();
    },

    // Load face scan images from server for the gallery
    async loadFaceScanGallery() {
        const container = document.getElementById('faceScanGalleryBody');
        if (!container) return;
        const dateEl = document.getElementById('faceScanDateFilter');
        const localToday = new Date();
        const localDateStr = localToday.getFullYear() + '-' + String(localToday.getMonth()+1).padStart(2,'0') + '-' + String(localToday.getDate()).padStart(2,'0');
        const date = dateEl ? dateEl.value : localDateStr;
        const company = App.activeCompany || 'all';
        container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> Loading…</div>';
        try {
            const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : (window.location.origin + '/api');
            const params = new URLSearchParams({ date });
            if (company !== 'all') params.set('company', company);
            const resp = await fetch(`${apiBase}/attendance/images?${params}`, { signal: AbortSignal.timeout(10000) });
            if (!resp.ok) throw new Error('Server error');
            const result = await resp.json();
            const images = result.data || [];
            if (images.length === 0) {
                container.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted)"><i class="fas fa-camera-retro" style="font-size:36px;margin-bottom:8px;display:block;opacity:0.3"></i>No face scan images for this date</div>';
                return;
            }
            container.innerHTML = `
                <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px"><i class="fas fa-images"></i> ${images.length} snapshot(s) for ${date}</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
                    ${images.map(img => {
                        const emp = (DataStore.employees || []).find(e => e.id === img.employeeId);
                        const empName = emp ? emp.name : img.employeeId;
                        const typeLabel = img.imageType === 'clockin' ? 'Clock In' : img.imageType === 'clockout' ? 'Clock Out' : img.imageType === 'enrollment' ? 'Enrollment' : img.imageType;
                        const typeColor = img.imageType === 'clockin' ? '#27ae60' : img.imageType === 'clockout' ? '#e74c3c' : '#f39c12';
                        const time = img.capturedAt ? new Date(img.capturedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
                        const verified = img.faceVerified ? '<span style="color:#27ae60;font-size:10px"><i class="fas fa-check-circle"></i> Verified</span>' : '<span style="color:#e74c3c;font-size:10px"><i class="fas fa-times-circle"></i></span>';
                        const score = img.matchScore ? ` (${parseFloat(img.matchScore).toFixed(0)}%)` : '';
                        return `<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
                            <img src="${apiBase}/attendance/images/${img.id}/view" alt="${empName}" style="width:100%;height:160px;object-fit:cover;display:block;cursor:pointer" onclick="window.open(this.src,'_blank')" onerror="this.src='';this.alt='Image unavailable';this.style.background='#f1f5f9';this.style.display='flex';this.style.alignItems='center';this.style.justifyContent='center'">
                            <div style="padding:10px">
                                <div style="font-weight:700;font-size:13px;margin-bottom:2px">${empName}</div>
                                <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;flex-wrap:wrap">
                                    <span style="background:${typeColor}15;color:${typeColor};padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700">${typeLabel}</span>
                                    <span style="font-size:10px;color:var(--text-muted)">${time}</span>
                                </div>
                                <div style="margin-top:4px;font-size:11px">${verified}${score}</div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>`;
        } catch (err) {
            container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted)"><i class="fas fa-exclamation-triangle" style="color:var(--warning);font-size:24px;margin-bottom:8px;display:block"></i>Could not load face scan images.<br><span style="font-size:11px">${err.message}</span></div>`;
        }
    },

    openLogAttendance() {
        const employees = this.getFilteredEmployees();
        const today = new Date().toISOString().split('T')[0];
        App.openModal('Log Attendance', `
        <form>
            <div class="form-row">
                <div class="form-group"><label>Employee</label>
                    <select class="form-control" id="attEmployee">
                        ${employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Date</label><input type="date" class="form-control" id="attDate" value="${today}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Time In</label><input type="time" class="form-control" id="attTimeIn" value="08:00"></div>
                <div class="form-group"><label>Time Out</label><input type="time" class="form-control" id="attTimeOut" value="17:00"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Status</label>
                    <select class="form-control" id="attStatus">
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                        <option value="half-day">Half Day</option>
                        <option value="leave">On Leave</option>
                    </select>
                </div>
                <div class="form-group"><label>Late Minutes</label><input type="number" class="form-control" id="attLate" value="0" min="0"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Undertime (min)</label><input type="number" class="form-control" id="attUndertime" value="0" min="0"></div>
                <div class="form-group"><label>Overtime (hrs)</label><input type="number" class="form-control" id="attOT" value="0" min="0" step="0.5"></div>
            </div>
            <div class="form-group"><label>Notes</label><input type="text" class="form-control" id="attNotes" placeholder="Optional notes"></div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Payroll.saveAttendance()"><i class="fas fa-save"></i> Save</button>
        `);
    },

    saveAttendance() {
        const rec = {
            id: Utils.generateId('ATT'),
            employeeId: document.getElementById('attEmployee')?.value,
            date: document.getElementById('attDate')?.value,
            timeIn: document.getElementById('attTimeIn')?.value,
            timeOut: document.getElementById('attTimeOut')?.value,
            status: document.getElementById('attStatus')?.value || 'present',
            lateMinutes: parseInt(document.getElementById('attLate')?.value || 0),
            undertimeMinutes: parseInt(document.getElementById('attUndertime')?.value || 0),
            overtimeHours: parseFloat(document.getElementById('attOT')?.value || 0),
            notes: document.getElementById('attNotes')?.value || ''
        };
        if (!DataStore.attendanceRecords) DataStore.attendanceRecords = [];
        DataStore.attendanceRecords.push(rec);
        Database.save();
        App.closeModal();
        App.showToast('Attendance logged', 'success');
        this.renderTabContent();
    },

    adminClockOut(attId) {
        const rec = (DataStore.attendanceRecords || []).find(r => r.id === attId);
        if (!rec) { App.showToast('Record not found', 'error'); return; }
        const now = new Date();
        rec.timeOut = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
        rec.timeOutTimestamp = now.toISOString();
        // Compute undertime if schedule exists
        const sched = (DataStore.workSchedules || []).find(s => s.employeeId === rec.employeeId);
        if (sched && rec.timeIn) {
            const [h, m] = (sched.endTime || '17:00').split(':').map(Number);
            const schedEnd = new Date(now); schedEnd.setHours(h, m, 0, 0);
            if (now < schedEnd) rec.undertimeMinutes = Math.round((schedEnd - now) / 60000);
        }
        Database.save();
        App.showToast('Clock-out recorded', 'success');
        this.renderTabContent();
    },

    copyKioskLink(url) {
        navigator.clipboard.writeText(url).then(() => App.showToast('Link copied to clipboard!', 'success')).catch(() => {
            prompt('Copy this link:', url);
        });
    },

    // ============================================================
    //  SCHEDULES TAB
    // ============================================================
    renderSchedulesTab() {
        const employees = this.getFilteredEmployees();
        const schedules = (DataStore.workSchedules || []).filter(s => {
            if (App.activeCompany !== 'all') {
                const emp = DataStore.employees.find(e => e.id === s.employeeId);
                return emp && emp.company === App.activeCompany;
            }
            return true;
        });
        const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

        return `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-calendar-alt"></i> Work Schedules</h3>
                <button class="btn btn-sm btn-primary" onclick="Payroll.openSetSchedule()"><i class="fas fa-plus"></i> Set Schedule</button>
            </div>
            <div class="card-body no-padding">
                <table class="data-table">
                    <thead><tr><th>Employee</th>${days.map(d => `<th>${d.slice(0,3)}</th>`).join('')}<th>Hrs/Wk</th></tr></thead>
                    <tbody>
                    ${employees.map(emp => {
                        const sched = schedules.find(s => s.employeeId === emp.id) || {};
                        const totalHrs = days.reduce((s, d) => s + (sched[d.toLowerCase()]?.hours || 0), 0);
                        return `<tr><td><strong>${emp.name}</strong></td>
                        ${days.map(d => {
                            const day = sched[d.toLowerCase()];
                            return day?.off ? `<td style="color:var(--text-muted)">OFF</td>` :
                                day ? `<td style="font-size:11px">${day.start}-${day.end}</td>` : `<td style="color:var(--text-muted)">—</td>`;
                        }).join('')}
                        <td><strong>${totalHrs}</strong></td></tr>`;
                    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    openSetSchedule() {
        const employees = this.getFilteredEmployees();
        const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
        App.openModal('Set Work Schedule', `
        <form>
            <div class="form-group"><label>Employee</label>
                <select class="form-control" id="schedEmployee">
                    ${employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
                </select>
            </div>
            ${days.map(d => `
            <div class="form-row" style="align-items:center">
                <div class="form-group" style="flex:0.5"><label>${d.charAt(0).toUpperCase() + d.slice(1)}</label></div>
                <div class="form-group"><input type="time" class="form-control" id="sched_${d}_start" value="08:00"></div>
                <div class="form-group"><input type="time" class="form-control" id="sched_${d}_end" value="17:00"></div>
                <div class="form-group" style="flex:0.3"><label><input type="checkbox" id="sched_${d}_off"> OFF</label></div>
            </div>`).join('')}
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Payroll.saveSchedule()"><i class="fas fa-save"></i> Save</button>
        `, true);
    },

    saveSchedule() {
        const empId = document.getElementById('schedEmployee')?.value;
        const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
        const sched = { id: Utils.generateId('SCH'), employeeId: empId };
        days.forEach(d => {
            const off = document.getElementById(`sched_${d}_off`)?.checked;
            const start = document.getElementById(`sched_${d}_start`)?.value || '08:00';
            const end = document.getElementById(`sched_${d}_end`)?.value || '17:00';
            const hours = off ? 0 : this.computeHoursBetween(start, end);
            sched[d] = off ? { off: true, hours: 0 } : { start, end, hours };
        });
        if (!DataStore.workSchedules) DataStore.workSchedules = [];
        const idx = DataStore.workSchedules.findIndex(s => s.employeeId === empId);
        if (idx >= 0) DataStore.workSchedules[idx] = sched;
        else DataStore.workSchedules.push(sched);
        Database.save();
        App.closeModal();
        App.showToast('Schedule saved', 'success');
        this.renderTabContent();
    },

    computeHoursBetween(start, end) {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60 - 1); // minus 1hr lunch
    },

    // ============================================================
    //  13TH MONTH PAY TAB
    // ============================================================
    render13thMonthTab() {
        const employees = this.getFilteredEmployees();
        const year = new Date().getFullYear();

        return `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-gift"></i> 13th Month Pay — ${year}</h3>
                <button class="btn btn-sm btn-primary" onclick="Payroll.generateAll13thMonth()"><i class="fas fa-layer-group"></i> Generate All</button>
            </div>
            <div class="card-body no-padding">
                <table class="data-table">
                    <thead><tr><th>Employee</th><th>Company</th><th>Total Basic Earned (Jan-${new Date().toLocaleString('en',{month:'short'})})</th><th>Months Worked</th><th>13th Month Pay</th><th>Actions</th></tr></thead>
                    <tbody>
                    ${employees.map(emp => {
                        const data = this.compute13thMonth(emp, year);
                        return `<tr><td><strong>${emp.name}</strong></td><td>${DataStore.companies[emp.company]?.name || emp.company}</td>
                        <td>${Utils.formatCurrency(data.totalBasic)}</td><td>${data.monthsWorked}</td>
                        <td><strong style="color:var(--success)">${Utils.formatCurrency(data.thirteenthMonth)}</strong></td>
                        <td><button class="btn btn-sm btn-primary" onclick="Payroll.generate13thMonthPayslip('${emp.id}')"><i class="fas fa-receipt"></i></button></td></tr>`;
                    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    compute13thMonth(emp, year) {
        const payslips = DataStore.payslips.filter(p => p.employeeId === emp.id && new Date(p.periodEnd).getFullYear() === year);
        const totalBasic = payslips.reduce((s, p) => s + (p.basicPay || 0), 0);
        const months = new Set(payslips.map(p => new Date(p.periodEnd).getMonth())).size;
        return { totalBasic, monthsWorked: months || 1, thirteenthMonth: totalBasic / 12 };
    },

    compute13thMonthAll() {
        const employees = this.getFilteredEmployees();
        const year = new Date().getFullYear();
        return employees.reduce((s, emp) => s + this.compute13thMonth(emp, year).thirteenthMonth, 0);
    },

    generate13thMonthPayslip(empId) {
        const emp = DataStore.employees.find(e => e.id === empId);
        if (!emp) return;
        const year = new Date().getFullYear();
        const data = this.compute13thMonth(emp, year);

        Database.addPayslip({
            employeeId: emp.id, employeeName: emp.name, position: emp.position, company: emp.company,
            companyName: DataStore.companies[emp.company]?.name || emp.company,
            payFrequency: '13th-month', periodStart: `${year}-01-01`, periodEnd: `${year}-12-31`,
            daysWorked: data.monthsWorked * 26, dailyRate: emp.dailyRate || (emp.monthlyRate / 26),
            basicPay: data.thirteenthMonth, overtimePay: 0, allowance: 0, bonus: 0,
            grossPay: data.thirteenthMonth, sss: 0, philhealth: 0, pagibig: 0, tax: 0,
            sssER: 0, philhealthER: 0, pagibigER: 0, totalDeductions: 0, netPay: data.thirteenthMonth,
            sssNo: emp.sssNo, philhealthNo: emp.philhealthNo, pagibigNo: emp.pagibigNo, tin: emp.tin
        });
        App.showToast(`13th month payslip generated for ${emp.name}`, 'success');
        this.renderTabContent();
    },

    generateAll13thMonth() {
        const employees = this.getFilteredEmployees();
        employees.forEach(emp => this.generate13thMonthPayslip(emp.id));
        App.showToast(`13th month payslips generated for ${employees.length} employees`, 'success');
    },

    // ============================================================
    //  GOVERNMENT REPORTS TAB
    // ============================================================
    renderGovReportsTab() {
        const payslips = this.getFilteredPayslips();
        const now = new Date();
        const monthPayslips = payslips.filter(p => {
            const d = new Date(p.periodEnd);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        const totalSSS_EE = monthPayslips.reduce((s, p) => s + (p.sss || 0), 0);
        const totalSSS_ER = monthPayslips.reduce((s, p) => s + (p.sssER || 0), 0);
        const totalPH_EE = monthPayslips.reduce((s, p) => s + (p.philhealth || 0), 0);
        const totalPH_ER = monthPayslips.reduce((s, p) => s + (p.philhealthER || 0), 0);
        const totalPag_EE = monthPayslips.reduce((s, p) => s + (p.pagibig || 0), 0);
        const totalPag_ER = monthPayslips.reduce((s, p) => s + (p.pagibigER || 0), 0);
        const totalTax = monthPayslips.reduce((s, p) => s + (p.tax || 0), 0);
        const monthLabel = now.toLocaleString('en', { month: 'long', year: 'numeric' });

        return `
        <div class="grid-3 mb-2">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon teal"><i class="fas fa-shield-alt"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(totalSSS_EE + totalSSS_ER)}</div><div class="stat-label">SSS Total (EE+ER)</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-heartbeat"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(totalPH_EE + totalPH_ER)}</div><div class="stat-label">PhilHealth Total</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-home"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(totalPag_EE + totalPag_ER)}</div><div class="stat-label">Pag-IBIG Total</div></div>
        </div>
        <div class="card mb-2">
            <div class="card-header"><h3><i class="fas fa-university"></i> Government Contributions — ${monthLabel}</h3>
                <button class="btn btn-sm btn-success" onclick="Payroll.printGovReport()"><i class="fas fa-print"></i> Print Report</button>
            </div>
            <div class="card-body no-padding" id="govReportTable">
                <table class="data-table">
                    <thead><tr><th>Employee</th><th>SSS (EE)</th><th>SSS (ER)</th><th>PhilHealth (EE)</th><th>PhilHealth (ER)</th><th>Pag-IBIG (EE)</th><th>Pag-IBIG (ER)</th><th>WHT</th><th>Total</th></tr></thead>
                    <tbody>
                    ${monthPayslips.map(p => {
                        const total = (p.sss||0)+(p.sssER||0)+(p.philhealth||0)+(p.philhealthER||0)+(p.pagibig||0)+(p.pagibigER||0)+(p.tax||0);
                        return `<tr><td>${p.employeeName}</td><td>${Utils.formatCurrency(p.sss)}</td><td>${Utils.formatCurrency(p.sssER)}</td>
                        <td>${Utils.formatCurrency(p.philhealth)}</td><td>${Utils.formatCurrency(p.philhealthER)}</td>
                        <td>${Utils.formatCurrency(p.pagibig)}</td><td>${Utils.formatCurrency(p.pagibigER)}</td>
                        <td>${Utils.formatCurrency(p.tax)}</td><td><strong>${Utils.formatCurrency(total)}</strong></td></tr>`;
                    }).join('')}
                    <tr style="font-weight:700;background:var(--bg)"><td>TOTALS</td>
                        <td>${Utils.formatCurrency(totalSSS_EE)}</td><td>${Utils.formatCurrency(totalSSS_ER)}</td>
                        <td>${Utils.formatCurrency(totalPH_EE)}</td><td>${Utils.formatCurrency(totalPH_ER)}</td>
                        <td>${Utils.formatCurrency(totalPag_EE)}</td><td>${Utils.formatCurrency(totalPag_ER)}</td>
                        <td>${Utils.formatCurrency(totalTax)}</td>
                        <td>${Utils.formatCurrency(totalSSS_EE+totalSSS_ER+totalPH_EE+totalPH_ER+totalPag_EE+totalPag_ER+totalTax)}</td>
                    </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-chart-line"></i> BIR Withholding Tax Summary</h3></div>
            <div class="card-body">
                <div style="display:flex;justify-content:space-between;padding:12px;background:var(--bg);border-radius:var(--radius);margin-bottom:8px">
                    <span>Total Withholding Tax (${monthLabel}):</span><strong style="color:var(--danger)">${Utils.formatCurrency(totalTax)}</strong>
                </div>
                <div style="font-size:12px;color:var(--text-muted)">
                    <p><strong>BIR Form 1601-C:</strong> Monthly Remittance of Withholding Tax on Compensation</p>
                    <p><strong>BIR Form 2316:</strong> Certificate of Compensation Payment / Tax Withheld (Annual)</p>
                    <p>Tax computed per TRAIN Law (RA 10963) effective January 2018.</p>
                </div>
            </div>
        </div>`;
    },

    printGovReport() {
        const table = document.getElementById('govReportTable')?.innerHTML || '';
        const w = window.open('', '_blank', 'width=1000,height=700');
        const month = new Date().toLocaleString('en', { month: 'long', year: 'numeric' });
        w.document.write(`<!DOCTYPE html><html><head><title>Government Contributions Report</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>* { margin:0; padding:0; box-sizing:border-box; } body { font-family:'Inter',sans-serif; padding:24px; font-size:12px; }
        table { width:100%; border-collapse:collapse; } th,td { padding:8px; border:1px solid #ddd; text-align:right; } th { background:#f5f5f5; }
        td:first-child, th:first-child { text-align:left; } h2 { margin-bottom:16px; } @media print { body { padding:0; } }</style>
        </head><body><h2>Government Contributions Report — ${month}</h2>${table}
        <script>setTimeout(function(){window.print();},300)<\/script></body></html>`);
        w.document.close();
    },

    // ============================================================
    //  BATCH PAYSLIP GENERATION
    // ============================================================
    openBatchGenerate() {
        const employees = this.getFilteredEmployees().filter(e => e.status === 'active');
        if (employees.length === 0) { App.showToast('No active employees', 'error'); return; }
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');

        App.openModal('Batch Generate Payslips', `
        <form>
            <div class="form-row">
                <div class="form-group"><label>Period Start</label><input type="date" class="form-control" id="batchStart" value="${y}-${m}-01"></div>
                <div class="form-group"><label>Period End</label><input type="date" class="form-control" id="batchEnd" value="${y}-${m}-${new Date(y, today.getMonth()+1, 0).getDate()}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Pay Period</label>
                    <select class="form-control" id="batchPeriod"><option value="monthly">Monthly</option><option value="semi-monthly">Semi-Monthly</option></select>
                </div>
                <div class="form-group"><label>Working Days</label><input type="number" class="form-control" id="batchDays" value="26" min="1" max="31"></div>
            </div>
            <p style="font-size:13px;color:var(--text-muted);margin-top:8px">This will generate payslips for <strong>${employees.length}</strong> active employees. Attendance data will be applied automatically where available.</p>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Payroll.executeBatchGenerate()"><i class="fas fa-layer-group"></i> Generate All</button>
        `);
    },

    executeBatchGenerate() {
        const employees = this.getFilteredEmployees().filter(e => e.status === 'active');
        const period = document.getElementById('batchPeriod')?.value || 'monthly';
        const defaultDays = parseInt(document.getElementById('batchDays')?.value || 26);
        const startDate = document.getElementById('batchStart')?.value;
        const endDate = document.getElementById('batchEnd')?.value;

        let count = 0;
        employees.forEach(emp => {
            // Pull attendance data for the period
            const attData = this.getAttendanceSummary(emp.id, startDate, endDate);
            const daysWorked = attData.daysPresent || defaultDays;
            const otHours = attData.totalOT || 0;
            const lateDeduction = this.calcLateDeduction(emp, attData.totalLateMinutes || 0);

            const calc = this.calculatePayslip(emp, {
                period, daysWorked, otHours, otRate: 1.25,
                allowance: emp.allowance || 0,
                bonus: 0,
                lateDeduction,
                incentive: emp.incentive || 0
            });

            Database.addPayslip({
                employeeId: emp.id, employeeName: emp.name, position: emp.position,
                company: emp.company, companyName: DataStore.companies[emp.company]?.name || emp.company,
                payFrequency: period, periodStart: startDate, periodEnd: endDate,
                daysWorked, dailyRate: calc.dailyRate,
                basicPay: calc.basicPay, otHours, otRate: 1.25,
                overtimePay: calc.overtimePay, allowance: calc.allowance,
                bonus: calc.bonus, incentive: calc.incentive, lateDeduction: calc.lateDeduction,
                grossPay: calc.grossPay, sss: calc.sss, philhealth: calc.philhealth,
                pagibig: calc.pagibig, tax: calc.tax,
                sssER: calc.sssER, philhealthER: calc.philhealthER, pagibigER: calc.pagibigER,
                totalDeductions: calc.totalDeductions, netPay: calc.netPay,
                sssNo: emp.sssNo, philhealthNo: emp.philhealthNo, pagibigNo: emp.pagibigNo, tin: emp.tin
            });
            count++;
        });

        App.closeModal();
        App.showToast(`${count} payslips generated`, 'success');
        this.render(document.getElementById('contentArea'));
    },

    getAttendanceSummary(empId, startDate, endDate) {
        const records = (DataStore.attendanceRecords || []).filter(r =>
            r.employeeId === empId && r.date >= startDate && r.date <= endDate
        );
        return {
            daysPresent: records.filter(r => r.status === 'present' || r.status === 'late').length,
            daysAbsent: records.filter(r => r.status === 'absent').length,
            totalLateMinutes: records.reduce((s, r) => s + (r.lateMinutes || 0), 0),
            totalOT: records.reduce((s, r) => s + (r.overtimeHours || 0), 0)
        };
    },

    calcLateDeduction(emp, lateMinutes) {
        if (lateMinutes <= 0) return 0;
        const hourlyRate = (emp.dailyRate || (emp.monthlyRate / 26)) / 8;
        return (lateMinutes / 60) * hourlyRate;
    },

    getFilteredEmployees() {
        return App.activeCompany === 'all' ? DataStore.employees : DataStore.employees.filter(e => e.company === App.activeCompany);
    },

    getFilteredPayslips() {
        return App.activeCompany === 'all' ? DataStore.payslips : DataStore.payslips.filter(p => p.company === App.activeCompany);
    },

    buildEmployeeList(employees) {
        if (employees.length === 0) return '<div class="empty-state"><i class="fas fa-user-plus"></i><h3>No Employees</h3><p>Add employees to generate payslips.</p></div>';
        return employees.map(e => `
            <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
                <div>
                    <strong>${e.name}</strong>
                    ${e.userId ? `<span title="Biometric / Kiosk User ID" style="margin-left:8px;background:#e0f2f1;color:#00695c;font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;font-family:monospace"><i class="fas fa-id-card" style="margin-right:4px"></i>${e.userId}</span>` : ''}
                    <div style="font-size:12px;color:var(--text-muted)">${e.position} — ${DataStore.companies[e.company]?.name || e.company}</div>
                    <div style="font-size:12px;color:var(--text-muted)">Rate: ${Utils.formatCurrency(e.monthlyRate || 0)}/mo | ${e.payFrequency || 'monthly'}</div>
                </div>
                <div style="display:flex;gap:4px">
                    <button class="btn btn-sm btn-info" onclick="Payroll.openGeneratePayslip('${e.id}')" title="Generate Payslip"><i class="fas fa-receipt"></i></button>
                    ${Auth.canEdit() ? `<button class="btn btn-sm btn-secondary" onclick="Payroll.editEmployee('${e.id}')" title="Edit"><i class="fas fa-edit"></i></button>` : ''}
                    ${Auth.canDelete() ? `<button class="btn btn-sm btn-danger" onclick="Payroll.deleteEmployee('${e.id}')" title="Delete"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `).join('');
    },

    buildPayslipList(payslips) {
        if (payslips.length === 0) return '<div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><h3>No Payslips</h3><p>Generate payslips for your employees.</p></div>';
        const sorted = [...payslips].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return sorted.slice(0, 20).map(p => `
            <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
                <div>
                    <strong>${p.employeeName}</strong>
                    <div style="font-size:12px;color:var(--text-muted)">${p.periodStart} to ${p.periodEnd} (${p.payFrequency})</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    <strong style="color:var(--secondary)">${Utils.formatCurrency(p.netPay || 0)}</strong>
                    <button class="btn btn-sm btn-info" onclick="Payroll.viewPayslip('${p.id}')" title="View"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-success" onclick="Payroll.printPayslip('${p.id}')" title="Print"><i class="fas fa-print"></i></button>
                </div>
            </div>
        `).join('');
    },

    // ============================================================
    //  EMPLOYEE MANAGEMENT
    // ============================================================
    openAddEmployee() {
        const allCompanyOpts = Object.values(DataStore.companies).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        const companies = App.activeCompany === 'all'
            ? `<option value="all">All Companies</option>` + allCompanyOpts
            : `<option value="all">All Companies</option><option value="${App.activeCompany}" selected>${DataStore.companies[App.activeCompany]?.name}</option>` + Object.values(DataStore.companies).filter(c => c.id !== App.activeCompany).map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        // Figure out next auto userId (supports alphanumeric)
        const existingNumIds = DataStore.employees.map(e => parseInt(e.userId, 10)).filter(n => !isNaN(n));
        const nextUserId = existingNumIds.length > 0 ? Math.max(...existingNumIds) + 1 : 1001;

        App.openModal('Add Employee', `
        <form>
            <div class="form-row">
                <div class="form-group"><label>Full Name</label><input type="text" class="form-control" id="empName" placeholder="Juan dela Cruz"></div>
                <div class="form-group"><label>Position</label><input type="text" class="form-control" id="empPosition" placeholder="e.g. Foreman, Therapist"></div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label><i class="fas fa-id-card" style="margin-right:5px;color:var(--secondary)"></i>Biometric / Kiosk User ID</label>
                    <input type="text" class="form-control" id="empUserId" value="${nextUserId}" maxlength="20" placeholder="e.g. DK-EMP-1001" style="text-transform:uppercase;font-family:monospace;letter-spacing:1px">
                    <small style="color:var(--text-muted)">Alphanumeric ID for DTR kiosk &amp; biometric device (e.g. DK-EMP-1001, A1B2)</small>
                </div>
                <div class="form-group"><label>Company</label><select class="form-control" id="empCompany">${companies}</select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Pay Frequency</label>
                    <select class="form-control" id="empPayFreq">
                        <option value="monthly">Monthly</option>
                        <option value="semi-monthly">Semi-Monthly</option>
                    </select>
                </div>
                <div class="form-group"><label>Monthly Rate (₱)</label><input type="number" class="form-control" id="empRate" placeholder="15000" min="0" step="0.01"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Daily Rate (₱, optional)</label><input type="number" class="form-control" id="empDailyRate" placeholder="Auto-computed" min="0" step="0.01"></div>
                <div class="form-group"><label>TIN</label><input type="text" class="form-control" id="empTIN" placeholder="000-000-000-000"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>SSS No.</label><input type="text" class="form-control" id="empSSS" placeholder="00-0000000-0"></div>
                <div class="form-group"><label>PhilHealth No.</label><input type="text" class="form-control" id="empPhilHealth" placeholder="00-000000000-0"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Pag-IBIG No.</label><input type="text" class="form-control" id="empPagIBIG" placeholder="0000-0000-0000"></div>
            </div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Payroll.saveEmployee()"><i class="fas fa-save"></i> Save Employee</button>
        `);
    },

    saveEmployee() {
        const name = document.getElementById('empName')?.value;
        if (!name) { App.showToast('Employee name is required', 'error'); return; }
        const monthlyRate = parseFloat(document.getElementById('empRate')?.value || 0);
        const dailyRate = parseFloat(document.getElementById('empDailyRate')?.value) || (monthlyRate / 26);

        const userIdRaw = document.getElementById('empUserId')?.value;
        Database.addEmployee({
            name,
            position: document.getElementById('empPosition')?.value || '',
            company: document.getElementById('empCompany')?.value,
            payFrequency: document.getElementById('empPayFreq')?.value || 'monthly',
            monthlyRate,
            dailyRate,
            sssNo: document.getElementById('empSSS')?.value || '',
            philhealthNo: document.getElementById('empPhilHealth')?.value || '',
            pagibigNo: document.getElementById('empPagIBIG')?.value || '',
            tin: document.getElementById('empTIN')?.value || '',
            userId: userIdRaw ? userIdRaw.toString().toUpperCase().trim() : undefined,
            status: 'active'
        });

        App.closeModal();
        App.showToast('Employee added', 'success');
        this.render(document.getElementById('contentArea'));
    },

    editEmployee(id) {
        if (!Auth.canEdit()) { App.showToast('You do not have permission to edit records', 'error'); return; }
        const emp = DataStore.employees.find(e => e.id === id);
        if (!emp) return;

        App.openModal('Edit Employee', `
        <form>
            <div class="form-row">
                <div class="form-group"><label>Full Name</label><input type="text" class="form-control" id="empName" value="${emp.name}"></div>
                <div class="form-group"><label>Position</label><input type="text" class="form-control" id="empPosition" value="${emp.position || ''}"></div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label><i class="fas fa-id-card" style="margin-right:5px;color:var(--secondary)"></i>Biometric / Kiosk User ID</label>
                    <input type="text" class="form-control" id="empUserId" value="${emp.userId || ''}" maxlength="20" placeholder="e.g. DK-EMP-1001" style="text-transform:uppercase;font-family:monospace;letter-spacing:1px">
                    <small style="color:var(--text-muted)">Alphanumeric ID for DTR kiosk &amp; biometric device</small>
                </div>
                <div class="form-group"><label>Pay Frequency</label>
                    <select class="form-control" id="empPayFreq">
                        <option value="monthly" ${emp.payFrequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                        <option value="semi-monthly" ${emp.payFrequency === 'semi-monthly' ? 'selected' : ''}>Semi-Monthly</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Monthly Rate (₱)</label><input type="number" class="form-control" id="empRate" value="${emp.monthlyRate || 0}" min="0" step="0.01"></div>
                <div class="form-group"><label>Daily Rate (₱)</label><input type="number" class="form-control" id="empDailyRate" value="${emp.dailyRate || 0}" min="0" step="0.01"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>SSS No.</label><input type="text" class="form-control" id="empSSS" value="${emp.sssNo || ''}"></div>
                <div class="form-group"><label>PhilHealth No.</label><input type="text" class="form-control" id="empPhilHealth" value="${emp.philhealthNo || ''}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Pag-IBIG No.</label><input type="text" class="form-control" id="empPagIBIG" value="${emp.pagibigNo || ''}"></div>
                <div class="form-group"><label>TIN</label><input type="text" class="form-control" id="empTIN" value="${emp.tin || ''}"></div>
            </div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Payroll.updateEmployee('${id}')"><i class="fas fa-save"></i> Update</button>
        `);
    },

    updateEmployee(id) {
        const name = document.getElementById('empName')?.value;
        if (!name) { App.showToast('Name is required', 'error'); return; }
        const monthlyRate = parseFloat(document.getElementById('empRate')?.value || 0);

        Database.updateEmployee(id, {
            name,
            position: document.getElementById('empPosition')?.value || '',
            payFrequency: document.getElementById('empPayFreq')?.value || 'monthly',
            monthlyRate,
            dailyRate: parseFloat(document.getElementById('empDailyRate')?.value) || (monthlyRate / 26),
            tin: document.getElementById('empTIN')?.value || '',
            sssNo: document.getElementById('empSSS')?.value || '',
            philhealthNo: document.getElementById('empPhilHealth')?.value || '',
            pagibigNo: document.getElementById('empPagIBIG')?.value || '',
            userId: document.getElementById('empUserId')?.value ? document.getElementById('empUserId').value.toString().toUpperCase().trim() : undefined
        });

        App.closeModal();
        App.showToast('Employee updated', 'success');
        this.render(document.getElementById('contentArea'));
    },

    deleteEmployee(id) {
        if (!Auth.canDelete()) { App.showToast('Only Super Admin can delete records', 'error'); return; }
        if (!confirm('Delete this employee?')) return;
        Database.deleteEmployee(id);
        App.showToast('Employee deleted', 'success');
        this.render(document.getElementById('contentArea'));
    },

    // ============================================================
    //  PAYSLIP GENERATION
    // ============================================================
    openGeneratePayslip(empId) {
        const employees = this.getFilteredEmployees().filter(e => e.status === 'active');
        if (employees.length === 0) { App.showToast('Add employees first', 'error'); return; }

        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');

        App.openModal('Generate Payslip', `
        <form>
            <div class="form-group"><label>Employee</label>
                <select class="form-control" id="psEmployee" onchange="Payroll.previewDeductions()">
                    ${employees.map(e => `<option value="${e.id}" ${e.id === empId ? 'selected' : ''}>${e.name} — ${Utils.formatCurrency(e.monthlyRate || 0)}/mo</option>`).join('')}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Pay Period Type</label>
                    <select class="form-control" id="psPeriod" onchange="Payroll.previewDeductions()">
                        <option value="monthly">Monthly</option>
                        <option value="semi-monthly">Semi-Monthly (1st–15th)</option>
                    </select>
                </div>
                <div class="form-group"><label>Period Start</label><input type="date" class="form-control" id="psPeriodStart" value="${y}-${m}-01"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Period End</label><input type="date" class="form-control" id="psPeriodEnd" value="${y}-${m}-15"></div>
                <div class="form-group"><label>Days Worked</label><input type="number" class="form-control" id="psDaysWorked" value="13" min="0" max="31" onchange="Payroll.previewDeductions()"></div>
            </div>

            <h4 style="margin:16px 0 8px;font-size:14px;color:var(--text-muted)">ADDITIONAL EARNINGS</h4>
            <div class="form-row">
                <div class="form-group"><label>Overtime Hours</label><input type="number" class="form-control" id="psOT" value="0" min="0" step="0.5" onchange="Payroll.previewDeductions()"></div>
                <div class="form-group"><label>OT Rate Multiplier</label>
                    <select class="form-control" id="psOTRate">
                        <option value="1.25">Regular OT (125%)</option>
                        <option value="1.30">Special Holiday OT (130%)</option>
                        <option value="2.00">Regular Holiday OT (200%)</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Allowances (₱)</label><input type="number" class="form-control" id="psAllowance" value="0" min="0" step="0.01" onchange="Payroll.previewDeductions()"></div>
                <div class="form-group"><label>Bonuses (₱)</label><input type="number" class="form-control" id="psBonus" value="0" min="0" step="0.01" onchange="Payroll.previewDeductions()"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Incentive (₱)</label><input type="number" class="form-control" id="psIncentive" value="0" min="0" step="0.01" onchange="Payroll.previewDeductions()"></div>
                <div class="form-group"><label>Late Deduction (₱)</label><input type="number" class="form-control" id="psLateDeduction" value="0" min="0" step="0.01" onchange="Payroll.previewDeductions()"></div>
            </div>

            <h4 style="margin:16px 0 8px;font-size:14px;color:var(--text-muted)">DEDUCTIONS PREVIEW</h4>
            <div id="psDeductionPreview" style="padding:16px;background:var(--bg);border-radius:var(--radius);font-size:13px"></div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Payroll.generatePayslip()"><i class="fas fa-check"></i> Generate Payslip</button>
        `, true);

        this.previewDeductions();
    },

    previewDeductions() {
        const empId = document.getElementById('psEmployee')?.value;
        const emp = DataStore.employees.find(e => e.id === empId);
        if (!emp) return;

        const period = document.getElementById('psPeriod')?.value || 'monthly';
        const daysWorked = parseInt(document.getElementById('psDaysWorked')?.value || 0);
        const otHours = parseFloat(document.getElementById('psOT')?.value || 0);
        const otRate = parseFloat(document.getElementById('psOTRate')?.value || 1.25);
        const allowance = parseFloat(document.getElementById('psAllowance')?.value || 0);
        const bonus = parseFloat(document.getElementById('psBonus')?.value || 0);
        const incentive = parseFloat(document.getElementById('psIncentive')?.value || 0);
        const lateDeduction = parseFloat(document.getElementById('psLateDeduction')?.value || 0);

        const calc = this.calculatePayslip(emp, { period, daysWorked, otHours, otRate, allowance, bonus, incentive, lateDeduction });

        document.getElementById('psDeductionPreview').innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Basic Pay (${daysWorked} days):</span><strong>${Utils.formatCurrency(calc.basicPay)}</strong></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Overtime (${otHours}h × ${otRate}×):</span><strong>${Utils.formatCurrency(calc.overtimePay)}</strong></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Allowances:</span><strong>${Utils.formatCurrency(calc.allowance)}</strong></div>
            ${incentive > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Incentive:</span><strong>${Utils.formatCurrency(calc.incentive)}</strong></div>` : ''}
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:8px"><span><strong>Gross Pay:</strong></span><strong style="color:var(--secondary)">${Utils.formatCurrency(calc.grossPay)}</strong></div>

            <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:var(--danger)"><span>SSS (EE):</span><span>-${Utils.formatCurrency(calc.sss)}</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:var(--danger)"><span>PhilHealth (EE):</span><span>-${Utils.formatCurrency(calc.philhealth)}</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:var(--danger)"><span>Pag-IBIG (EE):</span><span>-${Utils.formatCurrency(calc.pagibig)}</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:var(--danger)"><span>Withholding Tax:</span><span>-${Utils.formatCurrency(calc.tax)}</span></div>
            ${lateDeduction > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;color:var(--danger)"><span>Late Deduction:</span><span>-${Utils.formatCurrency(calc.lateDeduction)}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:var(--danger);border-bottom:1px solid var(--border);padding-bottom:8px"><span>Total Deductions:</span><span>-${Utils.formatCurrency(calc.totalDeductions)}</span></div>

            <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:700;padding-top:4px"><span>NET PAY:</span><span style="color:var(--success)">${Utils.formatCurrency(calc.netPay)}</span></div>
        `;
    },

    calculatePayslip(emp, opts) {
        const { period, daysWorked, otHours, otRate, allowance, bonus,
                lateDeduction = 0, incentive = 0 } = opts;
        const dailyRate = emp.dailyRate || (emp.monthlyRate / 26);
        const hourlyRate = dailyRate / 8;

        const basicPay = dailyRate * daysWorked;
        const overtimePay = hourlyRate * otHours * otRate;
        const grossPay = basicPay + overtimePay + allowance + bonus + incentive;

        // Monthly equivalents for contribution computation
        const monthlyEquiv = period === 'semi-monthly' ? grossPay * 2 : grossPay;

        const sssRow = this.getSSSContribution(monthlyEquiv);
        const philRow = this.getPhilHealthContribution(monthlyEquiv);
        const pagRow = this.getPagIBIGContribution(monthlyEquiv);

        // For semi-monthly, split contributions in half
        const divisor = period === 'semi-monthly' ? 2 : 1;
        const sss = sssRow.ee / divisor;
        const philhealth = philRow.ee / divisor;
        const pagibig = pagRow.ee / divisor;

        // Taxable income = gross - mandatory contributions
        const totalContrib = sss + philhealth + pagibig;
        const taxableIncome = grossPay - totalContrib;
        const tax = this.getWithholdingTax(taxableIncome, period);

        const totalDeductions = totalContrib + tax + lateDeduction;
        const netPay = grossPay - totalDeductions;

        return {
            basicPay, overtimePay, allowance, bonus, incentive, lateDeduction, grossPay,
            sss, philhealth, pagibig, tax,
            sssER: sssRow.er / divisor, philhealthER: philRow.er / divisor, pagibigER: pagRow.er / divisor,
            totalDeductions, netPay, dailyRate, hourlyRate, monthlyEquiv
        };
    },

    generatePayslip() {
        const empId = document.getElementById('psEmployee')?.value;
        const emp = DataStore.employees.find(e => e.id === empId);
        if (!emp) { App.showToast('Select an employee', 'error'); return; }

        const period = document.getElementById('psPeriod')?.value || 'monthly';
        const daysWorked = parseInt(document.getElementById('psDaysWorked')?.value || 0);
        const otHours = parseFloat(document.getElementById('psOT')?.value || 0);
        const otRate = parseFloat(document.getElementById('psOTRate')?.value || 1.25);
        const allowance = parseFloat(document.getElementById('psAllowance')?.value || 0);
        const bonus = parseFloat(document.getElementById('psBonus')?.value || 0);
        const incentive = parseFloat(document.getElementById('psIncentive')?.value || 0);
        const lateDeduction = parseFloat(document.getElementById('psLateDeduction')?.value || 0);

        const calc = this.calculatePayslip(emp, { period, daysWorked, otHours, otRate, allowance, bonus, incentive, lateDeduction });

        Database.addPayslip({
            employeeId: empId,
            employeeName: emp.name,
            position: emp.position,
            company: emp.company,
            companyName: DataStore.companies[emp.company]?.name || emp.company,
            payFrequency: period,
            periodStart: document.getElementById('psPeriodStart')?.value,
            periodEnd: document.getElementById('psPeriodEnd')?.value,
            daysWorked,
            dailyRate: calc.dailyRate,
            basicPay: calc.basicPay,
            otHours,
            otRate,
            overtimePay: calc.overtimePay,
            allowance: calc.allowance,
            bonus: calc.bonus,
            incentive: calc.incentive,
            lateDeduction: calc.lateDeduction,
            grossPay: calc.grossPay,
            sss: calc.sss,
            philhealth: calc.philhealth,
            pagibig: calc.pagibig,
            tax: calc.tax,
            sssER: calc.sssER,
            philhealthER: calc.philhealthER,
            pagibigER: calc.pagibigER,
            totalDeductions: calc.totalDeductions,
            netPay: calc.netPay,
            sssNo: emp.sssNo,
            philhealthNo: emp.philhealthNo,
            pagibigNo: emp.pagibigNo,
            tin: emp.tin
        });

        App.closeModal();
        App.showToast('Payslip generated', 'success');
        this.render(document.getElementById('contentArea'));
    },

    // ============================================================
    //  VIEW / PRINT PAYSLIP
    // ============================================================
    viewPayslip(id) {
        const ps = DataStore.payslips.find(p => p.id === id);
        if (!ps) return;
        App.openModal(`Payslip — ${ps.employeeName}`, this.buildPayslipPreview(ps), `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            <button class="btn btn-primary" onclick="Payroll.printPayslip('${ps.id}')"><i class="fas fa-print"></i> Print</button>
        `, true);
    },

    buildPayslipPreview(ps) {
        return `
        <div id="payslipPrintArea" style="font-family:'Inter',sans-serif;font-size:13px;max-width:700px;margin:auto">
            <div style="text-align:center;border-bottom:3px double var(--border);padding-bottom:12px;margin-bottom:16px">
                <h2 style="margin:0;font-size:18px">${ps.companyName || ps.company}</h2>
                <div style="font-size:12px;color:var(--text-muted)">PAYSLIP</div>
                <div style="font-size:12px;color:var(--text-muted)">Period: ${ps.periodStart} to ${ps.periodEnd} (${ps.payFrequency})</div>
            </div>

            <div style="display:flex;justify-content:space-between;margin-bottom:16px">
                <div>
                    <div><strong>Employee:</strong> ${ps.employeeName}</div>
                    <div><strong>Position:</strong> ${ps.position || 'N/A'}</div>
                    <div><strong>TIN:</strong> ${ps.tin || 'N/A'}</div>
                </div>
                <div style="text-align:right">
                    <div><strong>SSS:</strong> ${ps.sssNo || 'N/A'}</div>
                    <div><strong>PhilHealth:</strong> ${ps.philhealthNo || 'N/A'}</div>
                    <div><strong>Pag-IBIG:</strong> ${ps.pagibigNo || 'N/A'}</div>
                </div>
            </div>

            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
                <thead><tr style="background:var(--bg)"><th style="padding:8px;text-align:left;border-bottom:2px solid var(--border)" colspan="2">EARNINGS</th><th style="padding:8px;text-align:right;border-bottom:2px solid var(--border)">AMOUNT</th></tr></thead>
                <tbody>
                    <tr><td style="padding:6px 8px" colspan="2">Basic Pay (${ps.daysWorked} days × ${Utils.formatCurrency(ps.dailyRate)}/day)</td><td style="padding:6px 8px;text-align:right">${Utils.formatCurrency(ps.basicPay)}</td></tr>
                    ${ps.overtimePay ? `<tr><td style="padding:6px 8px" colspan="2">Overtime (${ps.otHours}h × ${ps.otRate}×)</td><td style="padding:6px 8px;text-align:right">${Utils.formatCurrency(ps.overtimePay)}</td></tr>` : ''}
                    ${ps.allowance ? `<tr><td style="padding:6px 8px" colspan="2">Allowances</td><td style="padding:6px 8px;text-align:right">${Utils.formatCurrency(ps.allowance)}</td></tr>` : ''}
                    ${ps.bonus ? `<tr><td style="padding:6px 8px" colspan="2">Bonus</td><td style="padding:6px 8px;text-align:right">${Utils.formatCurrency(ps.bonus)}</td></tr>` : ''}
                    ${ps.incentive ? `<tr><td style="padding:6px 8px" colspan="2">Incentive</td><td style="padding:6px 8px;text-align:right">${Utils.formatCurrency(ps.incentive)}</td></tr>` : ''}
                    <tr style="font-weight:700;border-top:1px solid var(--border)"><td style="padding:8px" colspan="2">GROSS PAY</td><td style="padding:8px;text-align:right">${Utils.formatCurrency(ps.grossPay)}</td></tr>
                </tbody>
            </table>

            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
                <thead><tr style="background:var(--bg)"><th style="padding:8px;text-align:left;border-bottom:2px solid var(--border)" colspan="2">DEDUCTIONS</th><th style="padding:8px;text-align:right;border-bottom:2px solid var(--border)">AMOUNT</th></tr></thead>
                <tbody>
                    <tr><td style="padding:6px 8px" colspan="2">SSS Contribution (Employee)</td><td style="padding:6px 8px;text-align:right;color:var(--danger)">${Utils.formatCurrency(ps.sss)}</td></tr>
                    <tr><td style="padding:6px 8px" colspan="2">PhilHealth (Employee)</td><td style="padding:6px 8px;text-align:right;color:var(--danger)">${Utils.formatCurrency(ps.philhealth)}</td></tr>
                    <tr><td style="padding:6px 8px" colspan="2">Pag-IBIG (Employee)</td><td style="padding:6px 8px;text-align:right;color:var(--danger)">${Utils.formatCurrency(ps.pagibig)}</td></tr>
                    <tr><td style="padding:6px 8px" colspan="2">Withholding Tax</td><td style="padding:6px 8px;text-align:right;color:var(--danger)">${Utils.formatCurrency(ps.tax)}</td></tr>
                    ${ps.lateDeduction ? `<tr><td style="padding:6px 8px" colspan="2">Late / Undertime Deduction</td><td style="padding:6px 8px;text-align:right;color:var(--danger)">${Utils.formatCurrency(ps.lateDeduction)}</td></tr>` : ''}
                    <tr style="font-weight:700;border-top:1px solid var(--border)"><td style="padding:8px" colspan="2">TOTAL DEDUCTIONS</td><td style="padding:8px;text-align:right;color:var(--danger)">${Utils.formatCurrency(ps.totalDeductions)}</td></tr>
                </tbody>
            </table>

            <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
                <div style="width:300px;padding:16px;background:var(--bg);border-radius:var(--radius);border:2px solid var(--border)">
                    <div style="display:flex;justify-content:space-between;font-size:20px;font-weight:700"><span>NET PAY:</span><span style="color:var(--success)">${Utils.formatCurrency(ps.netPay)}</span></div>
                </div>
            </div>

            <div style="display:flex;justify-content:space-between;margin-top:32px;font-size:12px">
                <div style="text-align:center;width:200px"><div style="border-top:1px solid var(--text);padding-top:4px">Employee Signature</div></div>
                <div style="text-align:center;width:200px"><div style="border-top:1px solid var(--text);padding-top:4px">Authorized Signatory</div></div>
            </div>

            <div style="margin-top:24px;font-size:11px;color:var(--text-muted);border-top:1px solid var(--border);padding-top:8px;display:flex;justify-content:space-between">
                <span>DOLE-aligned payslip. Ref: RA 10396 / DOLE D.O. No. 183-17</span>
                <span>Generated by UBMS</span>
            </div>
        </div>`;
    },

    // ============================================================
    //  TIMESHEETS TAB
    // ============================================================
    renderTimesheetsTab() {
        const employees = this.getFilteredEmployees();
        const timesheets = (DataStore.timesheets || []).filter(ts => {
            if (App.activeCompany !== 'all') return ts.company === App.activeCompany;
            return true;
        }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        const statusCounts = { pending: 0, approved: 0, rejected: 0 };
        timesheets.forEach(ts => { if (statusCounts[ts.status] !== undefined) statusCounts[ts.status]++; });

        return `
        <div class="grid-4 mb-2">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-file-alt"></i></div></div><div class="stat-value">${timesheets.length}</div><div class="stat-label">Total Timesheets</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-hourglass-half"></i></div></div><div class="stat-value">${statusCounts.pending}</div><div class="stat-label">Pending Approval</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div></div><div class="stat-value">${statusCounts.approved}</div><div class="stat-label">Approved</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon red"><i class="fas fa-times-circle"></i></div></div><div class="stat-value">${statusCounts.rejected}</div><div class="stat-label">Rejected</div></div>
        </div>
        <div class="card mb-2">
            <div class="card-header"><h3><i class="fas fa-calendar-check"></i> Timesheets</h3>
                <div style="display:flex;gap:6px">
                    <button class="btn btn-sm btn-primary" onclick="Payroll.openGenerateTimesheet()"><i class="fas fa-plus"></i> Generate Timesheet</button>
                    <button class="btn btn-sm btn-secondary" onclick="Payroll.batchGenerateTimesheets()"><i class="fas fa-layer-group"></i> Batch Generate</button>
                </div>
            </div>
            <div class="card-body no-padding">
                <table class="data-table">
                    <thead><tr><th>Employee</th><th>Period</th><th>Regular Hrs</th><th>OT Hrs</th><th>Late (min)</th><th>Days Present</th><th>Days Absent</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                    ${timesheets.length === 0 ? '<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted)"><i class="fas fa-calendar-check" style="font-size:24px;margin-bottom:8px;display:block"></i>No timesheets generated yet.<br>Click <strong>Generate Timesheet</strong> to create one from attendance records.</td></tr>' :
                    timesheets.map(ts => {
                        const statusColor = ts.status === 'approved' ? 'green' : ts.status === 'rejected' ? 'red' : 'orange';
                        return `<tr>
                            <td><strong>${ts.employeeName}</strong></td>
                            <td style="font-size:11px">${ts.periodStart} — ${ts.periodEnd}</td>
                            <td>${(ts.regularHours || 0).toFixed(1)}</td>
                            <td>${(ts.overtimeHours || 0).toFixed(1)}</td>
                            <td style="color:${(ts.totalLateMinutes || 0) > 0 ? 'var(--danger)' : ''}">${ts.totalLateMinutes || 0}</td>
                            <td>${ts.daysPresent || 0}</td>
                            <td style="color:${(ts.daysAbsent || 0) > 0 ? 'var(--danger)' : ''}">${ts.daysAbsent || 0}</td>
                            <td><span class="badge-tag badge-${statusColor}">${ts.status}</span></td>
                            <td>
                                <div style="display:flex;gap:4px">
                                    <button class="btn btn-sm btn-secondary" onclick="Payroll.viewTimesheet('${ts.id}')" title="View"><i class="fas fa-eye"></i></button>
                                    ${ts.status === 'pending' ? `
                                    <button class="btn btn-sm btn-success" onclick="Payroll.approveTimesheet('${ts.id}')" title="Approve"><i class="fas fa-check"></i></button>
                                    <button class="btn btn-sm btn-danger" onclick="Payroll.rejectTimesheet('${ts.id}')" title="Reject"><i class="fas fa-times"></i></button>` : ''}
                                    <button class="btn btn-sm btn-primary" onclick="Payroll.printTimesheet('${ts.id}')" title="Print"><i class="fas fa-print"></i></button>
                                </div>
                            </td>
                        </tr>`;
                    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    openGenerateTimesheet() {
        const employees = this.getFilteredEmployees();
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

        const body = `
        <div class="form-group"><label>Employee</label>
            <select class="form-control" id="tsEmployee">
                ${employees.map(e => `<option value="${e.id}">${e.name} (${e.position || 'Staff'})</option>`).join('')}
            </select></div>
        <div class="form-row"><div class="form-group"><label>Period Start</label><input type="date" class="form-control" id="tsPeriodStart" value="${firstDay}"></div>
        <div class="form-group"><label>Period End</label><input type="date" class="form-control" id="tsPeriodEnd" value="${lastDay}"></div></div>`;
        const footer = `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Payroll.saveTimesheet()"><i class="fas fa-save"></i> Generate</button>`;
        App.openModal('Generate Timesheet', body, footer);
    },

    saveTimesheet() {
        const empId = document.getElementById('tsEmployee')?.value;
        const periodStart = document.getElementById('tsPeriodStart')?.value;
        const periodEnd = document.getElementById('tsPeriodEnd')?.value;
        if (!empId || !periodStart || !periodEnd) return App.showToast('Please fill all fields', 'error');
        if (periodEnd < periodStart) return App.showToast('End date must be after start date', 'error');

        const emp = DataStore.employees.find(e => e.id === empId);
        if (!emp) return App.showToast('Employee not found', 'error');

        const records = (DataStore.attendanceRecords || []).filter(r =>
            r.employeeId === empId && r.date >= periodStart && r.date <= periodEnd
        );

        const daysPresent = records.filter(r => r.status === 'present' || r.status === 'late').length;
        const daysAbsent = records.filter(r => r.status === 'absent').length;
        const totalLateMinutes = records.reduce((s, r) => s + (r.lateMinutes || 0), 0);
        const totalUndertimeMinutes = records.reduce((s, r) => s + (r.undertimeMinutes || 0), 0);
        const overtimeHours = records.reduce((s, r) => s + (r.overtimeHours || 0), 0);

        let regularHours = 0;
        records.forEach(r => {
            if (r.timeIn && r.timeOut) regularHours += this.computeHoursBetween(r.timeIn, r.timeOut);
            else if (r.status === 'present' || r.status === 'late') regularHours += 8;
        });

        const dailyBreakdown = records.map(r => ({
            date: r.date, timeIn: r.timeIn || '', timeOut: r.timeOut || '',
            hours: r.timeIn && r.timeOut ? this.computeHoursBetween(r.timeIn, r.timeOut) : (r.status === 'present' || r.status === 'late' ? 8 : 0),
            late: r.lateMinutes || 0, ot: r.overtimeHours || 0, status: r.status,
            hasGeo: !!(r.location)
        }));

        const workDays = this.getWorkDaysInRange(periodStart, periodEnd);
        const ts = Database.addTimesheet({
            employeeId: empId, employeeName: emp.name, company: emp.company,
            periodStart, periodEnd, regularHours, overtimeHours,
            totalLateMinutes, totalUndertimeMinutes, daysPresent, daysAbsent,
            workDays, dailyBreakdown, status: 'pending'
        });
        App.closeModal();
        App.showToast(`Timesheet ${ts.id} generated for ${emp.name}`, 'success');
        this.renderTabContent();
    },

    batchGenerateTimesheets() {
        const employees = this.getFilteredEmployees();
        if (employees.length === 0) return App.showToast('No employees found', 'error');
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

        const body = `<p>This will generate timesheets for <strong>${employees.length} employees</strong> for the current month (${firstDay} to ${lastDay}).</p>
        <p style="color:var(--text-muted);font-size:12px">Existing timesheets for the same period will be skipped.</p>`;
        const footer = `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Payroll.executeBatchTimesheets('${firstDay}','${lastDay}')"><i class="fas fa-layer-group"></i> Generate All</button>`;
        App.openModal('Batch Generate Timesheets', body, footer);
    },

    executeBatchTimesheets(periodStart, periodEnd) {
        const employees = this.getFilteredEmployees();
        let generated = 0, skipped = 0;
        employees.forEach(emp => {
            const exists = (DataStore.timesheets || []).find(ts =>
                ts.employeeId === emp.id && ts.periodStart === periodStart && ts.periodEnd === periodEnd
            );
            if (exists) { skipped++; return; }
            const records = (DataStore.attendanceRecords || []).filter(r =>
                r.employeeId === emp.id && r.date >= periodStart && r.date <= periodEnd
            );
            const daysPresent = records.filter(r => r.status === 'present' || r.status === 'late').length;
            const daysAbsent = records.filter(r => r.status === 'absent').length;
            const totalLateMinutes = records.reduce((s, r) => s + (r.lateMinutes || 0), 0);
            const totalUndertimeMinutes = records.reduce((s, r) => s + (r.undertimeMinutes || 0), 0);
            const overtimeHours = records.reduce((s, r) => s + (r.overtimeHours || 0), 0);
            let regularHours = 0;
            records.forEach(r => {
                if (r.timeIn && r.timeOut) regularHours += this.computeHoursBetween(r.timeIn, r.timeOut);
                else if (r.status === 'present' || r.status === 'late') regularHours += 8;
            });
            const dailyBreakdown = records.map(r => ({
                date: r.date, timeIn: r.timeIn || '', timeOut: r.timeOut || '',
                hours: r.timeIn && r.timeOut ? this.computeHoursBetween(r.timeIn, r.timeOut) : (r.status === 'present' || r.status === 'late' ? 8 : 0),
                late: r.lateMinutes || 0, ot: r.overtimeHours || 0, status: r.status, hasGeo: !!(r.location)
            }));
            const workDays = this.getWorkDaysInRange(periodStart, periodEnd);
            Database.addTimesheet({
                employeeId: emp.id, employeeName: emp.name, company: emp.company,
                periodStart, periodEnd, regularHours, overtimeHours,
                totalLateMinutes, totalUndertimeMinutes, daysPresent, daysAbsent,
                workDays, dailyBreakdown, status: 'pending'
            });
            generated++;
        });
        App.closeModal();
        App.showToast(`Generated ${generated} timesheets, skipped ${skipped}`, 'success');
        this.renderTabContent();
    },

    getWorkDaysInRange(start, end) {
        let count = 0;
        const d = new Date(start);
        const endD = new Date(end);
        while (d <= endD) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) count++;
            d.setDate(d.getDate() + 1);
        }
        return count;
    },

    viewTimesheet(id) {
        const ts = (DataStore.timesheets || []).find(t => t.id === id);
        if (!ts) return;
        const breakdown = (ts.dailyBreakdown || []).map(d => `
            <tr>
                <td>${d.date}</td><td>${d.timeIn || '—'}</td><td>${d.timeOut || '—'}</td>
                <td>${(d.hours || 0).toFixed(1)}</td>
                <td style="color:${d.late > 0 ? 'var(--danger)' : ''}">${d.late}m</td>
                <td>${d.ot}h</td>
                <td><span class="badge-tag badge-${d.status === 'present' ? 'green' : d.status === 'late' ? 'orange' : d.status === 'absent' ? 'red' : 'blue'}">${d.status}</span></td>
                <td>${d.hasGeo ? '<i class="fas fa-map-marker-alt" style="color:var(--success)"></i>' : '—'}</td>
            </tr>`).join('');

        const body = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
            <div><label style="font-size:11px;color:var(--text-muted)">Employee</label><div style="font-weight:700">${ts.employeeName}</div></div>
            <div><label style="font-size:11px;color:var(--text-muted)">Period</label><div>${ts.periodStart} — ${ts.periodEnd}</div></div>
            <div><label style="font-size:11px;color:var(--text-muted)">Status</label><div><span class="badge-tag badge-${ts.status === 'approved' ? 'green' : ts.status === 'rejected' ? 'red' : 'orange'}">${ts.status}</span></div></div>
            <div><label style="font-size:11px;color:var(--text-muted)">Generated</label><div style="font-size:12px">${ts.createdAt ? new Date(ts.createdAt).toLocaleString() : '—'}</div></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;text-align:center">
            <div style="padding:10px;background:var(--bg-secondary);border-radius:8px"><div style="font-size:20px;font-weight:700">${(ts.regularHours || 0).toFixed(1)}</div><div style="font-size:11px;color:var(--text-muted)">Regular Hrs</div></div>
            <div style="padding:10px;background:var(--bg-secondary);border-radius:8px"><div style="font-size:20px;font-weight:700">${(ts.overtimeHours || 0).toFixed(1)}</div><div style="font-size:11px;color:var(--text-muted)">OT Hrs</div></div>
            <div style="padding:10px;background:var(--bg-secondary);border-radius:8px"><div style="font-size:20px;font-weight:700">${ts.daysPresent || 0}/${ts.workDays || 0}</div><div style="font-size:11px;color:var(--text-muted)">Present/Work Days</div></div>
            <div style="padding:10px;background:var(--bg-secondary);border-radius:8px"><div style="font-size:20px;font-weight:700;color:var(--danger)">${ts.totalLateMinutes || 0}</div><div style="font-size:11px;color:var(--text-muted)">Late (min)</div></div>
        </div>
        <div style="max-height:300px;overflow-y:auto">
            <table class="data-table"><thead><tr><th>Date</th><th>In</th><th>Out</th><th>Hours</th><th>Late</th><th>OT</th><th>Status</th><th>GPS</th></tr></thead>
            <tbody>${breakdown || '<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">No daily records</td></tr>'}</tbody></table>
        </div>`;
        App.openModal(`Timesheet — ${ts.employeeName}`, body, `<button class="btn btn-primary" onclick="Payroll.printTimesheet('${ts.id}')"><i class="fas fa-print"></i> Print</button>
        <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>`, true);
    },

    approveTimesheet(id) {
        Database.updateTimesheet(id, { status: 'approved', approvedAt: new Date().toISOString() });
        App.showToast('Timesheet approved', 'success');
        this.renderTabContent();
    },

    rejectTimesheet(id) {
        Database.updateTimesheet(id, { status: 'rejected', rejectedAt: new Date().toISOString() });
        App.showToast('Timesheet rejected', 'warning');
        this.renderTabContent();
    },

    printTimesheet(id) {
        const ts = (DataStore.timesheets || []).find(t => t.id === id);
        if (!ts) return;
        const rows = (ts.dailyBreakdown || []).map(d => `<tr><td>${d.date}</td><td>${d.timeIn || '—'}</td><td>${d.timeOut || '—'}</td><td>${(d.hours || 0).toFixed(1)}</td><td>${d.late}m</td><td>${d.ot}h</td><td>${d.status}</td></tr>`).join('');
        const w = window.open('', '_blank', 'width=800,height=700');
        w.document.write(`<!DOCTYPE html><html><head><title>Timesheet - ${ts.employeeName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;padding:24px;font-size:12px;color:#1a1a2e}
        h2{margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:6px 10px;text-align:left}th{background:#f5f5f5;font-weight:600}
        .summary{display:flex;gap:24px;margin:12px 0}.summary div{text-align:center}.summary .val{font-size:20px;font-weight:700}.summary .lbl{font-size:10px;color:#666}
        @media print{body{padding:0}}</style></head><body>
        <h2>Employee Timesheet</h2>
        <p style="color:#666">${ts.periodStart} — ${ts.periodEnd}</p>
        <div style="margin-top:12px"><strong>Employee:</strong> ${ts.employeeName} &nbsp; | &nbsp; <strong>Status:</strong> ${ts.status}</div>
        <div class="summary">
            <div><div class="val">${(ts.regularHours||0).toFixed(1)}</div><div class="lbl">Regular Hrs</div></div>
            <div><div class="val">${(ts.overtimeHours||0).toFixed(1)}</div><div class="lbl">OT Hrs</div></div>
            <div><div class="val">${ts.daysPresent||0}/${ts.workDays||0}</div><div class="lbl">Present/Work Days</div></div>
            <div><div class="val">${ts.totalLateMinutes||0}m</div><div class="lbl">Total Late</div></div>
        </div>
        <table><thead><tr><th>Date</th><th>Time In</th><th>Time Out</th><th>Hours</th><th>Late</th><th>OT</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
        <div style="margin-top:32px;display:flex;justify-content:space-between">
            <div style="text-align:center"><div style="border-top:1px solid #333;width:200px;margin-top:40px;padding-top:4px">Employee Signature</div></div>
            <div style="text-align:center"><div style="border-top:1px solid #333;width:200px;margin-top:40px;padding-top:4px">Supervisor Signature</div></div>
        </div>
        <script>setTimeout(function(){window.print();},300);<\/script></body></html>`);
        w.document.close();
    },

    // ============================================================
    //  PERFORMANCE TAB
    // ============================================================
    renderPerformanceTab() {
        const employees = this.getFilteredEmployees();
        const reviews = (DataStore.performanceReviews || []).filter(r => {
            if (App.activeCompany !== 'all') return r.company === App.activeCompany;
            return true;
        }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        const avgScore = reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.overallScore || 0), 0) / reviews.length).toFixed(1) : 0;
        const outstanding = reviews.filter(r => (r.overallScore || 0) >= 90).length;
        const needsImprovement = reviews.filter(r => (r.overallScore || 0) < 70).length;

        return `
        <div class="grid-4 mb-2">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-chart-line"></i></div></div><div class="stat-value">${reviews.length}</div><div class="stat-label">Total Reviews</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-star"></i></div></div><div class="stat-value">${avgScore}%</div><div class="stat-label">Average Score</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-trophy"></i></div></div><div class="stat-value">${outstanding}</div><div class="stat-label">Outstanding</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon red"><i class="fas fa-exclamation-circle"></i></div></div><div class="stat-value">${needsImprovement}</div><div class="stat-label">Needs Improvement</div></div>
        </div>

        <!-- How Scoring Works -->
        <div class="card mb-2" style="border-left:4px solid var(--info)">
            <div class="card-body" style="padding:12px 16px">
                <div style="font-weight:700;font-size:13px;margin-bottom:6px"><i class="fas fa-info-circle" style="color:var(--info);margin-right:6px"></i>Automatic Performance Scoring</div>
                <div style="font-size:12px;color:var(--text-muted);display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
                    <div><strong>Attendance Rate (25%):</strong> Days present / work days</div>
                    <div><strong>Punctuality (25%):</strong> On-time arrivals / total present</div>
                    <div><strong>Supervisor Appraisal (50%):</strong> Avg of 5 criteria (1-5 scale)</div>
                    <div><strong>Rating:</strong> Outstanding ≥90 | Very Satisfactory ≥80 | Satisfactory ≥70 | Needs Improvement &lt;70</div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header"><h3><i class="fas fa-chart-line"></i> Performance Reviews</h3>
                <button class="btn btn-sm btn-primary" onclick="Payroll.openAddPerformanceReview()"><i class="fas fa-plus"></i> New Review</button>
            </div>
            <div class="card-body no-padding">
                <table class="data-table">
                    <thead><tr><th>Employee</th><th>Review Period</th><th>Attendance</th><th>Punctuality</th><th>Supervisor</th><th>Overall</th><th>Rating</th><th>Actions</th></tr></thead>
                    <tbody>
                    ${reviews.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)"><i class="fas fa-chart-line" style="font-size:24px;margin-bottom:8px;display:block"></i>No performance reviews yet.<br>Click <strong>New Review</strong> to evaluate an employee.</td></tr>' :
                    reviews.map(r => {
                        const ratingInfo = this.getPerformanceRating(r.overallScore || 0);
                        return `<tr>
                            <td><strong>${r.employeeName}</strong></td>
                            <td style="font-size:11px">${r.periodStart} — ${r.periodEnd}</td>
                            <td><strong>${(r.attendanceScore || 0).toFixed(0)}%</strong></td>
                            <td><strong>${(r.punctualityScore || 0).toFixed(0)}%</strong></td>
                            <td><strong>${(r.supervisorScore || 0).toFixed(0)}%</strong></td>
                            <td><strong style="font-size:14px">${(r.overallScore || 0).toFixed(1)}%</strong></td>
                            <td><span class="badge-tag badge-${ratingInfo.color}">${ratingInfo.label}</span></td>
                            <td>
                                <div style="display:flex;gap:4px">
                                    <button class="btn btn-sm btn-secondary" onclick="Payroll.viewPerformanceReview('${r.id}')" title="View"><i class="fas fa-eye"></i></button>
                                    ${Auth.canDelete() ? `<button class="btn btn-sm btn-danger" onclick="Payroll.deletePerformanceReview('${r.id}')" title="Delete"><i class="fas fa-trash"></i></button>` : ''}
                                </div>
                            </td>
                        </tr>`;
                    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    getPerformanceRating(score) {
        if (score >= 90) return { label: 'Outstanding', color: 'green' };
        if (score >= 80) return { label: 'Very Satisfactory', color: 'blue' };
        if (score >= 70) return { label: 'Satisfactory', color: 'orange' };
        return { label: 'Needs Improvement', color: 'red' };
    },

    computeAttendanceScore(empId, periodStart, periodEnd) {
        const records = (DataStore.attendanceRecords || []).filter(r =>
            r.employeeId === empId && r.date >= periodStart && r.date <= periodEnd
        );
        const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
        const workDays = this.getWorkDaysInRange(periodStart, periodEnd);
        return workDays > 0 ? (present / workDays) * 100 : 100;
    },

    computePunctualityScore(empId, periodStart, periodEnd) {
        const records = (DataStore.attendanceRecords || []).filter(r =>
            r.employeeId === empId && r.date >= periodStart && r.date <= periodEnd
        );
        const presentDays = records.filter(r => r.status === 'present' || r.status === 'late');
        if (presentDays.length === 0) return 100;
        const onTime = presentDays.filter(r => !r.lateMinutes || r.lateMinutes === 0).length;
        return (onTime / presentDays.length) * 100;
    },

    openAddPerformanceReview() {
        const employees = this.getFilteredEmployees();
        if (employees.length === 0) return App.showToast('No employees found', 'error');
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

        const body = `
        <div class="form-group"><label>Employee</label>
            <select class="form-control" id="prEmployee" onchange="Payroll.previewPerformanceScores()">
                <option value="">— Select Employee —</option>
                ${employees.map(e => `<option value="${e.id}">${e.name} (${e.position || 'Staff'})</option>`).join('')}
            </select></div>
        <div class="form-row">
            <div class="form-group"><label>Period Start</label><input type="date" class="form-control" id="prPeriodStart" value="${firstDay}" onchange="Payroll.previewPerformanceScores()"></div>
            <div class="form-group"><label>Period End</label><input type="date" class="form-control" id="prPeriodEnd" value="${lastDay}" onchange="Payroll.previewPerformanceScores()"></div>
        </div>

        <!-- Auto-computed scores preview -->
        <div id="prAutoScores" style="background:var(--bg-secondary);border-radius:8px;padding:12px;margin-bottom:12px">
            <div style="font-size:11px;color:var(--text-muted);text-align:center">Select an employee to auto-compute attendance & punctuality scores</div>
        </div>

        <div style="font-weight:700;font-size:13px;margin-bottom:10px;border-bottom:1px solid var(--border);padding-bottom:6px"><i class="fas fa-user-tie" style="margin-right:6px"></i>Supervisor Appraisal (1-5 scale)</div>
        <div class="form-row">
            <div class="form-group"><label>Work Quality</label><select class="form-control" id="prWorkQuality"><option value="5">5 - Excellent</option><option value="4">4 - Very Good</option><option value="3" selected>3 - Good</option><option value="2">2 - Fair</option><option value="1">1 - Poor</option></select></div>
            <div class="form-group"><label>Productivity</label><select class="form-control" id="prProductivity"><option value="5">5 - Excellent</option><option value="4">4 - Very Good</option><option value="3" selected>3 - Good</option><option value="2">2 - Fair</option><option value="1">1 - Poor</option></select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Teamwork</label><select class="form-control" id="prTeamwork"><option value="5">5 - Excellent</option><option value="4">4 - Very Good</option><option value="3" selected>3 - Good</option><option value="2">2 - Fair</option><option value="1">1 - Poor</option></select></div>
            <div class="form-group"><label>Initiative</label><select class="form-control" id="prInitiative"><option value="5">5 - Excellent</option><option value="4">4 - Very Good</option><option value="3" selected>3 - Good</option><option value="2">2 - Fair</option><option value="1">1 - Poor</option></select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Communication</label><select class="form-control" id="prCommunication"><option value="5">5 - Excellent</option><option value="4">4 - Very Good</option><option value="3" selected>3 - Good</option><option value="2">2 - Fair</option><option value="1">1 - Poor</option></select></div>
            <div class="form-group"><label>Reviewed By</label><input type="text" class="form-control" id="prReviewedBy" placeholder="Supervisor name"></div>
        </div>
        <div class="form-group"><label>Comments / Notes</label><textarea class="form-control" id="prComments" rows="2" placeholder="Additional remarks..."></textarea></div>`;

        const footer = `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Payroll.savePerformanceReview()"><i class="fas fa-save"></i> Save Review</button>`;
        App.openModal('New Performance Review', body, footer, true);
    },

    previewPerformanceScores() {
        const empId = document.getElementById('prEmployee')?.value;
        const periodStart = document.getElementById('prPeriodStart')?.value;
        const periodEnd = document.getElementById('prPeriodEnd')?.value;
        const el = document.getElementById('prAutoScores');
        if (!el || !empId || !periodStart || !periodEnd) {
            if (el) el.innerHTML = '<div style="font-size:11px;color:var(--text-muted);text-align:center">Select an employee to auto-compute scores</div>';
            return;
        }
        const attScore = this.computeAttendanceScore(empId, periodStart, periodEnd);
        const punctScore = this.computePunctualityScore(empId, periodStart, periodEnd);
        const attColor = attScore >= 90 ? 'var(--success)' : attScore >= 75 ? 'var(--warning)' : 'var(--danger)';
        const punctColor = punctScore >= 90 ? 'var(--success)' : punctScore >= 75 ? 'var(--warning)' : 'var(--danger)';
        el.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:center">
            <div><div style="font-size:22px;font-weight:700;color:${attColor}">${attScore.toFixed(1)}%</div><div style="font-size:11px;color:var(--text-muted)">Attendance Rate (auto)</div></div>
            <div><div style="font-size:22px;font-weight:700;color:${punctColor}">${punctScore.toFixed(1)}%</div><div style="font-size:11px;color:var(--text-muted)">Punctuality Rate (auto)</div></div>
        </div>`;
    },

    savePerformanceReview() {
        const empId = document.getElementById('prEmployee')?.value;
        const periodStart = document.getElementById('prPeriodStart')?.value;
        const periodEnd = document.getElementById('prPeriodEnd')?.value;
        if (!empId || !periodStart || !periodEnd) return App.showToast('Please select employee and period', 'error');

        const emp = DataStore.employees.find(e => e.id === empId);
        if (!emp) return App.showToast('Employee not found', 'error');

        const workQuality = parseInt(document.getElementById('prWorkQuality')?.value || 3);
        const productivity = parseInt(document.getElementById('prProductivity')?.value || 3);
        const teamwork = parseInt(document.getElementById('prTeamwork')?.value || 3);
        const initiative = parseInt(document.getElementById('prInitiative')?.value || 3);
        const communication = parseInt(document.getElementById('prCommunication')?.value || 3);
        const reviewedBy = document.getElementById('prReviewedBy')?.value || '';
        const comments = document.getElementById('prComments')?.value || '';

        const attendanceScore = this.computeAttendanceScore(empId, periodStart, periodEnd);
        const punctualityScore = this.computePunctualityScore(empId, periodStart, periodEnd);
        const supervisorAvg = (workQuality + productivity + teamwork + initiative + communication) / 5;
        const supervisorScore = (supervisorAvg / 5) * 100;
        const overallScore = (attendanceScore * 0.25) + (punctualityScore * 0.25) + (supervisorScore * 0.50);

        Database.addPerformanceReview({
            employeeId: empId, employeeName: emp.name, company: emp.company,
            periodStart, periodEnd,
            attendanceScore, punctualityScore,
            supervisorAppraisal: { workQuality, productivity, teamwork, initiative, communication },
            supervisorScore, overallScore,
            reviewedBy, comments,
            rating: this.getPerformanceRating(overallScore).label
        });

        App.closeModal();
        App.showToast(`Performance review saved for ${emp.name} — ${overallScore.toFixed(1)}%`, 'success');
        this.renderTabContent();
    },

    viewPerformanceReview(id) {
        const r = (DataStore.performanceReviews || []).find(p => p.id === id);
        if (!r) return;
        const ratingInfo = this.getPerformanceRating(r.overallScore || 0);
        const appraisal = r.supervisorAppraisal || {};
        const criteria = [
            { label: 'Work Quality', val: appraisal.workQuality || 0 },
            { label: 'Productivity', val: appraisal.productivity || 0 },
            { label: 'Teamwork', val: appraisal.teamwork || 0 },
            { label: 'Initiative', val: appraisal.initiative || 0 },
            { label: 'Communication', val: appraisal.communication || 0 }
        ];

        const body = `
        <div style="text-align:center;margin-bottom:16px">
            <div style="font-size:48px;font-weight:800;color:${ratingInfo.color === 'green' ? 'var(--success)' : ratingInfo.color === 'blue' ? 'var(--primary)' : ratingInfo.color === 'orange' ? 'var(--warning)' : 'var(--danger)'}">${(r.overallScore || 0).toFixed(1)}%</div>
            <span class="badge-tag badge-${ratingInfo.color}" style="font-size:14px;padding:4px 16px">${ratingInfo.label}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
            <div><label style="font-size:11px;color:var(--text-muted)">Employee</label><div style="font-weight:700">${r.employeeName}</div></div>
            <div><label style="font-size:11px;color:var(--text-muted)">Period</label><div>${r.periodStart} — ${r.periodEnd}</div></div>
            <div><label style="font-size:11px;color:var(--text-muted)">Reviewed By</label><div>${r.reviewedBy || '—'}</div></div>
            <div><label style="font-size:11px;color:var(--text-muted)">Date</label><div style="font-size:12px">${r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</div></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;text-align:center">
            <div style="padding:10px;background:var(--bg-secondary);border-radius:8px"><div style="font-size:20px;font-weight:700">${(r.attendanceScore || 0).toFixed(0)}%</div><div style="font-size:11px;color:var(--text-muted)">Attendance (25%)</div></div>
            <div style="padding:10px;background:var(--bg-secondary);border-radius:8px"><div style="font-size:20px;font-weight:700">${(r.punctualityScore || 0).toFixed(0)}%</div><div style="font-size:11px;color:var(--text-muted)">Punctuality (25%)</div></div>
            <div style="padding:10px;background:var(--bg-secondary);border-radius:8px"><div style="font-size:20px;font-weight:700">${(r.supervisorScore || 0).toFixed(0)}%</div><div style="font-size:11px;color:var(--text-muted)">Supervisor (50%)</div></div>
        </div>
        <div style="font-weight:700;font-size:13px;margin-bottom:8px">Supervisor Appraisal Breakdown</div>
        <div style="display:grid;gap:6px;margin-bottom:12px">
            ${criteria.map(c => `
            <div style="display:flex;align-items:center;gap:8px">
                <div style="width:120px;font-size:12px">${c.label}</div>
                <div style="flex:1;height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">
                    <div style="height:100%;width:${(c.val / 5) * 100}%;background:${c.val >= 4 ? 'var(--success)' : c.val >= 3 ? 'var(--warning)' : 'var(--danger)'};border-radius:4px"></div>
                </div>
                <div style="width:24px;text-align:center;font-weight:700;font-size:13px">${c.val}</div>
            </div>`).join('')}
        </div>
        ${r.comments ? `<div style="font-weight:700;font-size:13px;margin-bottom:4px">Comments</div><div style="padding:10px;background:var(--bg-secondary);border-radius:8px;font-size:12px">${r.comments}</div>` : ''}`;

        App.openModal(`Performance Review — ${r.employeeName}`, body, `<button class="btn btn-secondary" onclick="App.closeModal()">Close</button>`, true);
    },

    deletePerformanceReview(id) {
        if (!Auth.canDelete()) { App.showToast('Only Super Admin can delete records', 'error'); return; }
        if (!confirm('Delete this performance review?')) return;
        Database.deletePerformanceReview(id);
        App.showToast('Performance review deleted', 'success');
        this.renderTabContent();
    },

    // ============================================================
    //  INCIDENTS TAB
    // ============================================================
    renderIncidentsTab() {
        const incidents = (DataStore.incidentReports || []).filter(r => {
            if (App.activeCompany !== 'all') return r.company === App.activeCompany;
            return true;
        }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        const openCount = incidents.filter(i => i.status === 'open').length;
        const investigating = incidents.filter(i => i.status === 'investigating').length;
        const critical = incidents.filter(i => i.severity === 'critical').length;

        return `
        <div class="grid-4 mb-2">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-file-alt"></i></div></div><div class="stat-value">${incidents.length}</div><div class="stat-label">Total Incidents</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-exclamation-triangle"></i></div></div><div class="stat-value">${openCount}</div><div class="stat-label">Open</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-search"></i></div></div><div class="stat-value">${investigating}</div><div class="stat-label">Under Investigation</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon red"><i class="fas fa-skull-crossbones"></i></div></div><div class="stat-value">${critical}</div><div class="stat-label">Critical</div></div>
        </div>
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-exclamation-triangle"></i> Incident Reports</h3>
                <button class="btn btn-sm btn-primary" onclick="Payroll.openAddIncident()"><i class="fas fa-plus"></i> File Incident</button>
            </div>
            <div class="card-body no-padding">
                <table class="data-table">
                    <thead><tr><th>ID</th><th>Date</th><th>Employee</th><th>Type</th><th>Severity</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                    ${incidents.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)"><i class="fas fa-shield-alt" style="font-size:24px;margin-bottom:8px;display:block"></i>No incident reports filed.<br>Click <strong>File Incident</strong> to create a new report.</td></tr>' :
                    incidents.map(inc => {
                        const sevColor = inc.severity === 'critical' ? 'red' : inc.severity === 'high' ? 'orange' : inc.severity === 'medium' ? 'blue' : 'green';
                        const statColor = inc.status === 'open' ? 'orange' : inc.status === 'investigating' ? 'blue' : inc.status === 'resolved' ? 'green' : 'green';
                        return `<tr>
                            <td style="font-size:11px;font-weight:600">${inc.id}</td>
                            <td style="font-size:11px">${inc.incidentDate || inc.createdAt?.split('T')[0] || '—'}</td>
                            <td><strong>${inc.employeeName || '—'}</strong></td>
                            <td><span class="badge-tag" style="background:#f0f0f0;color:#333;font-size:10px">${inc.type}</span></td>
                            <td><span class="badge-tag badge-${sevColor}">${inc.severity}</span></td>
                            <td style="font-size:11px">${inc.incidentLocation || '—'}</td>
                            <td><span class="badge-tag badge-${statColor}">${inc.status}</span></td>
                            <td>
                                <div style="display:flex;gap:4px">
                                    <button class="btn btn-sm btn-secondary" onclick="Payroll.viewIncident('${inc.id}')" title="View"><i class="fas fa-eye"></i></button>
                                    ${inc.status !== 'closed' ? `<button class="btn btn-sm btn-primary" onclick="Payroll.updateIncidentStatus('${inc.id}')" title="Update Status"><i class="fas fa-edit"></i></button>` : ''}
                                    ${Auth.canDelete() ? `<button class="btn btn-sm btn-danger" onclick="Payroll.deleteIncident('${inc.id}')" title="Delete"><i class="fas fa-trash"></i></button>` : ''}
                                </div>
                            </td>
                        </tr>`;
                    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    openAddIncident() {
        const employees = this.getFilteredEmployees();
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toTimeString().slice(0, 5);
        const companySelect = App.activeCompany === 'all' ?
            `<div class="form-group"><label>Company</label><select class="form-control" id="incCompany">
                ${Object.entries(DataStore.companies).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}
            </select></div>` : '';

        const body = `
        ${companySelect}
        <div class="form-row">
            <div class="form-group"><label>Employee Involved</label>
                <select class="form-control" id="incEmployee">
                    <option value="">— None / General —</option>
                    ${employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
                </select></div>
            <div class="form-group"><label>Incident Date</label><input type="date" class="form-control" id="incDate" value="${today}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Time of Incident</label><input type="time" class="form-control" id="incTime" value="${now}"></div>
            <div class="form-group"><label>Location</label><input type="text" class="form-control" id="incLocation" placeholder="e.g. Main Office, Warehouse A"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Type</label>
                <select class="form-control" id="incType">
                    <option value="Safety">Safety</option>
                    <option value="Disciplinary">Disciplinary</option>
                    <option value="Property Damage">Property Damage</option>
                    <option value="Equipment Failure">Equipment Failure</option>
                    <option value="Accident">Accident</option>
                    <option value="Policy Violation">Policy Violation</option>
                    <option value="Harassment">Harassment</option>
                    <option value="Theft">Theft</option>
                    <option value="Other">Other</option>
                </select></div>
            <div class="form-group"><label>Severity</label>
                <select class="form-control" id="incSeverity">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                </select></div>
        </div>
        <div class="form-group"><label>Description</label><textarea class="form-control" id="incDescription" rows="3" placeholder="Detailed description of the incident..."></textarea></div>
        <div class="form-group"><label>Witnesses</label><input type="text" class="form-control" id="incWitnesses" placeholder="Names of witnesses (comma separated)"></div>
        <div class="form-group"><label>Immediate Action Taken</label><textarea class="form-control" id="incAction" rows="2" placeholder="What actions were taken immediately?"></textarea></div>
        <div class="form-group"><label>Reported By</label><input type="text" class="form-control" id="incReportedBy" placeholder="Name of person reporting"></div>`;

        const footer = `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Payroll.saveIncident()"><i class="fas fa-save"></i> File Report</button>`;
        App.openModal('File Incident Report', body, footer, true);
    },

    saveIncident() {
        const incDate = document.getElementById('incDate')?.value;
        const incType = document.getElementById('incType')?.value;
        const incSeverity = document.getElementById('incSeverity')?.value;
        const description = document.getElementById('incDescription')?.value;
        if (!incDate || !description) return App.showToast('Date and description are required', 'error');

        const empId = document.getElementById('incEmployee')?.value;
        const emp = empId ? DataStore.employees.find(e => e.id === empId) : null;
        const company = App.activeCompany !== 'all' ? App.activeCompany : (document.getElementById('incCompany')?.value || '');

        Database.addIncidentReport({
            company,
            employeeId: empId || '',
            employeeName: emp?.name || 'General',
            incidentDate: incDate,
            incidentTime: document.getElementById('incTime')?.value || '',
            type: incType,
            severity: incSeverity,
            incidentLocation: document.getElementById('incLocation')?.value || '',
            description,
            witnesses: document.getElementById('incWitnesses')?.value || '',
            actionTaken: document.getElementById('incAction')?.value || '',
            reportedBy: document.getElementById('incReportedBy')?.value || '',
            status: 'open'
        });

        App.closeModal();
        App.showToast('Incident report filed successfully', 'success');
        this.renderTabContent();
    },

    viewIncident(id) {
        const inc = (DataStore.incidentReports || []).find(i => i.id === id);
        if (!inc) return;
        const sevColor = inc.severity === 'critical' ? 'var(--danger)' : inc.severity === 'high' ? 'var(--warning)' : inc.severity === 'medium' ? 'var(--primary)' : 'var(--success)';

        const body = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:12px;background:var(--bg-secondary);border-radius:8px;border-left:4px solid ${sevColor}">
            <div style="font-size:28px;color:${sevColor}"><i class="fas fa-exclamation-triangle"></i></div>
            <div>
                <div style="font-weight:700;font-size:15px">${inc.type} Incident</div>
                <div style="font-size:12px;color:var(--text-muted)">${inc.id} — Filed ${inc.createdAt ? new Date(inc.createdAt).toLocaleString() : '—'}</div>
            </div>
            <div style="margin-left:auto"><span class="badge-tag badge-${inc.severity === 'critical' ? 'red' : inc.severity === 'high' ? 'orange' : inc.severity === 'medium' ? 'blue' : 'green'}" style="font-size:12px;padding:4px 12px">${inc.severity.toUpperCase()}</span></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
            <div><label style="font-size:11px;color:var(--text-muted)">Employee</label><div style="font-weight:600">${inc.employeeName || 'General'}</div></div>
            <div><label style="font-size:11px;color:var(--text-muted)">Date / Time</label><div>${inc.incidentDate} ${inc.incidentTime || ''}</div></div>
            <div><label style="font-size:11px;color:var(--text-muted)">Location</label><div>${inc.incidentLocation || '—'}</div></div>
            <div><label style="font-size:11px;color:var(--text-muted)">Status</label><div><span class="badge-tag badge-${inc.status === 'open' ? 'orange' : inc.status === 'investigating' ? 'blue' : 'green'}">${inc.status}</span></div></div>
            <div><label style="font-size:11px;color:var(--text-muted)">Reported By</label><div>${inc.reportedBy || '—'}</div></div>
            <div><label style="font-size:11px;color:var(--text-muted)">Witnesses</label><div>${inc.witnesses || '—'}</div></div>
        </div>
        <div style="margin-bottom:12px"><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Description</label>
            <div style="padding:10px;background:var(--bg-secondary);border-radius:8px;font-size:13px;white-space:pre-wrap">${inc.description || '—'}</div></div>
        <div><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Immediate Action Taken</label>
            <div style="padding:10px;background:var(--bg-secondary);border-radius:8px;font-size:13px;white-space:pre-wrap">${inc.actionTaken || '—'}</div></div>
        ${inc.resolution ? `<div style="margin-top:12px"><label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Resolution</label>
            <div style="padding:10px;background:#e8f5e9;border-radius:8px;font-size:13px;white-space:pre-wrap">${inc.resolution}</div></div>` : ''}`;

        App.openModal(`Incident Report — ${inc.id}`, body, `<button class="btn btn-secondary" onclick="App.closeModal()">Close</button>`, true);
    },

    updateIncidentStatus(id) {
        const inc = (DataStore.incidentReports || []).find(i => i.id === id);
        if (!inc) return;

        const body = `
        <div style="margin-bottom:12px"><strong>${inc.id}</strong> — ${inc.type} (${inc.severity})</div>
        <div class="form-group"><label>New Status</label>
            <select class="form-control" id="incNewStatus">
                <option value="open" ${inc.status === 'open' ? 'selected' : ''}>Open</option>
                <option value="investigating" ${inc.status === 'investigating' ? 'selected' : ''}>Under Investigation</option>
                <option value="resolved" ${inc.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                <option value="closed" ${inc.status === 'closed' ? 'selected' : ''}>Closed</option>
            </select></div>
        <div class="form-group"><label>Resolution Notes</label><textarea class="form-control" id="incResolution" rows="3" placeholder="Describe the resolution or update...">${inc.resolution || ''}</textarea></div>`;

        const footer = `<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Payroll.confirmUpdateIncident('${id}')"><i class="fas fa-save"></i> Update</button>`;
        App.openModal('Update Incident Status', body, footer);
    },

    confirmUpdateIncident(id) {
        const newStatus = document.getElementById('incNewStatus')?.value;
        const resolution = document.getElementById('incResolution')?.value || '';
        Database.updateIncidentReport(id, {
            status: newStatus,
            resolution,
            updatedAt: new Date().toISOString()
        });
        App.closeModal();
        App.showToast('Incident status updated', 'success');
        this.renderTabContent();
    },

    deleteIncident(id) {
        if (!Auth.canDelete()) { App.showToast('Only Super Admin can delete records', 'error'); return; }
        if (!confirm('Delete this incident report? This cannot be undone.')) return;
        Database.deleteIncidentReport(id);
        App.showToast('Incident report deleted', 'success');
        this.renderTabContent();
    },

    printPayslip(id) {
        const ps = DataStore.payslips.find(p => p.id === id);
        if (!ps) return;

        const printContent = this.buildPayslipPreview(ps);
        const printWindow = window.open('', '_blank', 'width=800,height=900');
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Payslip - ${ps.employeeName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; padding: 24px; font-size: 13px; color: #1a1a2e; }
            @media print { body { padding: 0; } }
        </style></head><body>${printContent}
        <script>setTimeout(function(){window.print();},300);<\/script></body></html>`);
        printWindow.document.close();
    }
};
