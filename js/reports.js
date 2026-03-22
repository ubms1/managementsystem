/* ========================================
   UBMS - Reports Module
   Consolidated P&L, Cash Flow, Tax, Budget
   ======================================== */

const Reports = {
    render(container) {
        container.innerHTML = `
        <div class="section-header mb-3">
            <h2>Reports Center</h2>
            <div class="section-actions">
                <select class="form-control" style="width:140px" id="reportPeriod" onchange="Reports.render(document.getElementById('contentArea'))">
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual" selected>Annual</option>
                </select>
                <button class="btn btn-secondary" onclick="Reports.exportReport()"><i class="fas fa-file-export"></i> Export</button>
            </div>
        </div>

        <div class="tabs mb-3">
            <button class="tab-btn active" onclick="Reports.switchTab('pnl',this)">P&L Statement</button>
            <button class="tab-btn" onclick="Reports.switchTab('cashflow',this)">Cash Flow</button>
            <button class="tab-btn" onclick="Reports.switchTab('tax',this)">Tax Summary</button>
            <button class="tab-btn" onclick="Reports.switchTab('budget',this)">Budget vs Actual</button>
        </div>

        <div id="reportContent">
            ${this.renderPnL()}
        </div>`;
    },

    switchTab(tab, btn) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const el = document.getElementById('reportContent');
        switch (tab) {
            case 'pnl': el.innerHTML = this.renderPnL(); break;
            case 'cashflow': el.innerHTML = this.renderCashFlow(); break;
            case 'tax': el.innerHTML = this.renderTaxSummary(); break;
            case 'budget': el.innerHTML = this.renderBudgetVsActual(); break;
        }
    },

    renderPnL() {
        const companies = Object.keys(DataStore.companies);
        const active = App.activeCompany === 'all' ? companies : [App.activeCompany];

        const summaries = active.map(co => {
            const summary = DataStore.getCompanySummary(co);
            const revenue = DataStore.monthlyRevenue[co]?.reduce((s, v) => s + v, 0) || 0;
            const coExpenses = DataStore.expenses.filter(e => e.company === co);
            const expenses = coExpenses.reduce((s, e) => s + e.amount, 0);
            const netIncome = revenue - expenses;

            // Compute invoice-based revenue breakdown
            const coInvoices = DataStore.invoices.filter(i => i.company === co);
            const serviceRevenue = coInvoices.filter(i => ['service', 'progress-billing'].includes(i.type)).reduce((s, i) => s + i.paid, 0);
            const otherRevenue = coInvoices.filter(i => !['service', 'progress-billing'].includes(i.type)).reduce((s, i) => s + i.paid, 0);
            // If no invoices categorized, apportion from monthly revenue
            const hasInvoiceBreakdown = coInvoices.length > 0;
            const displayServiceRev = hasInvoiceBreakdown ? serviceRevenue : revenue;
            const displayOtherRev = hasInvoiceBreakdown ? otherRevenue : 0;

            // Compute actual expense breakdown by category
            const payrollCats = ['Labor', 'Salaries', 'Payroll', 'Wages'];
            const utilityCats = ['Utilities', 'Rent', 'Office Supplies'];
            const payrollExp = coExpenses.filter(e => payrollCats.some(c => e.category?.includes(c) || e.vendor === 'Payroll')).reduce((s, e) => s + e.amount, 0);
            const utilityExp = coExpenses.filter(e => utilityCats.some(c => e.category?.includes(c))).reduce((s, e) => s + e.amount, 0);
            const operatingExp = expenses - payrollExp - utilityExp;

            return { co, name: DataStore.companies[co]?.name || co, revenue, expenses, netIncome,
                     displayServiceRev, displayOtherRev, payrollExp, utilityExp, operatingExp, ...summary };
        });

        const totalRevenue = summaries.reduce((s, c) => s + c.revenue, 0);
        const totalExpenses = summaries.reduce((s, c) => s + c.expenses, 0);
        const totalNet = totalRevenue - totalExpenses;

        return `
        ${active.length > 1 ? `
        <div class="card mb-3" style="border-left:4px solid var(--secondary)">
            <div class="card-header"><h3>Consolidated Group P&L</h3></div>
            <div class="card-body">
                <div class="grid-3" style="gap:16px;margin-bottom:20px">
                    <div style="padding:16px;background:var(--bg);border-radius:var(--radius);text-align:center">
                        <div style="font-size:11px;color:var(--text-muted)">Total Revenue</div>
                        <div style="font-size:24px;font-weight:800;color:var(--secondary)">${Utils.formatCurrency(totalRevenue, true)}</div>
                    </div>
                    <div style="padding:16px;background:var(--bg);border-radius:var(--radius);text-align:center">
                        <div style="font-size:11px;color:var(--text-muted)">Total Expenses</div>
                        <div style="font-size:24px;font-weight:800;color:var(--danger)">${Utils.formatCurrency(totalExpenses, true)}</div>
                    </div>
                    <div style="padding:16px;background:var(--bg);border-radius:var(--radius);text-align:center">
                        <div style="font-size:11px;color:var(--text-muted)">Net Income</div>
                        <div style="font-size:24px;font-weight:800;color:${totalNet >= 0 ? 'var(--secondary)' : 'var(--danger)'}">${Utils.formatCurrency(totalNet, true)}</div>
                    </div>
                </div>
                <div class="chart-container" style="height:250px"><canvas id="pnlGroupChart"></canvas></div>
            </div>
        </div>` : ''}

        ${summaries.map(c => `
        <div class="card mb-2">
            <div class="card-header" style="border-bottom:3px solid ${DataStore.companies[c.co]?.color || 'var(--secondary)'}">
                <h3>${c.name}</h3>
                <span class="badge-tag ${c.netIncome >= 0 ? 'badge-success' : 'badge-danger'}">${c.netIncome >= 0 ? 'Profitable' : 'Loss'}</span>
            </div>
            <div class="card-body no-padding">
                <table class="data-table">
                    <tbody>
                        <tr style="font-weight:600;background:rgba(16,185,129,0.05)"><td colspan="2">Revenue</td><td style="text-align:right">${Utils.formatCurrency(c.revenue)}</td></tr>
                        <tr><td colspan="2" style="padding-left:24px">Service Revenue</td><td style="text-align:right">${Utils.formatCurrency(c.displayServiceRev)}</td></tr>
                        <tr><td colspan="2" style="padding-left:24px">Other Income</td><td style="text-align:right">${Utils.formatCurrency(c.displayOtherRev)}</td></tr>
                        <tr style="font-weight:600;background:rgba(239,68,68,0.05)"><td colspan="2">Expenses</td><td style="text-align:right">(${Utils.formatCurrency(c.expenses)})</td></tr>
                        <tr><td colspan="2" style="padding-left:24px">Operating Expenses</td><td style="text-align:right">(${Utils.formatCurrency(c.operatingExp)})</td></tr>
                        <tr><td colspan="2" style="padding-left:24px">Payroll</td><td style="text-align:right">(${Utils.formatCurrency(c.payrollExp)})</td></tr>
                        <tr><td colspan="2" style="padding-left:24px">Utilities & Other</td><td style="text-align:right">(${Utils.formatCurrency(c.utilityExp)})</td></tr>
                        <tr style="font-weight:700;font-size:15px;border-top:2px solid var(--border)">
                            <td colspan="2">Net Income</td>
                            <td style="text-align:right;color:${c.netIncome >= 0 ? 'var(--secondary)' : 'var(--danger)'}">${Utils.formatCurrency(c.netIncome)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>`).join('')}`;
    },

    renderCashFlow() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const companies = App.activeCompany === 'all' ? Object.keys(DataStore.companies) : [App.activeCompany];

        const monthlyInflow = months.map((_, i) => companies.reduce((s, co) => s + (DataStore.monthlyRevenue[co]?.[i] || 0), 0));
        const monthlyOutflow = months.map((_, i) =>
            companies.reduce((sum, co) =>
                sum + DataStore.expenses
                    .filter(e => e.company === co && new Date(e.date).getMonth() === i)
                    .reduce((s, e) => s + (e.amount || 0), 0), 0)
        );
        const netFlow = monthlyInflow.map((v, i) => v - monthlyOutflow[i]);
        // Compute opening balance from total invoices collected minus total expenses (prior accumulated cash)
        const totalCollected = companies.reduce((s, co) => s + DataStore.invoices.filter(i => i.company === co).reduce((sum, inv) => sum + inv.paid, 0), 0);
        const totalExpPaid = companies.reduce((s, co) => s + DataStore.expenses.filter(e => e.company === co).reduce((sum, exp) => sum + exp.amount, 0), 0);
        let runningBalance = totalCollected - totalExpPaid;
        const balances = netFlow.map(v => { runningBalance += v; return runningBalance; });

        return `
        <div class="card mb-3">
            <div class="card-header"><h3>Cash Flow Statement</h3></div>
            <div class="card-body">
                <div class="chart-container large"><canvas id="cashFlowChart"></canvas></div>
            </div>
        </div>

        <div class="card">
            <div class="card-body no-padding">
                <table class="data-table">
                    <thead><tr><th>Month</th><th>Inflow</th><th>Outflow</th><th>Net</th><th>Balance</th></tr></thead>
                    <tbody>
                        ${months.map((m, i) => `
                        <tr>
                            <td><strong>${m}</strong></td>
                            <td style="color:var(--secondary)">${Utils.formatCurrency(monthlyInflow[i], true)}</td>
                            <td style="color:var(--danger)">(${Utils.formatCurrency(monthlyOutflow[i], true)})</td>
                            <td style="color:${netFlow[i] >= 0 ? 'var(--secondary)' : 'var(--danger)'}"><strong>${Utils.formatCurrency(netFlow[i], true)}</strong></td>
                            <td><strong>${Utils.formatCurrency(balances[i], true)}</strong></td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    renderTaxSummary() {
        const companies = App.activeCompany === 'all' ? Object.keys(DataStore.companies) : [App.activeCompany];

        const data = companies.map(co => {
            const revenue = DataStore.monthlyRevenue[co]?.reduce((s, v) => s + v, 0) || 0;
            const vat = revenue * 0.12;
            const incomeTax = revenue * 0.25;
            const withholdingTax = revenue * 0.02;
            return { co, name: DataStore.companies[co]?.name || co, revenue, vat, incomeTax, withholdingTax, totalTax: vat + incomeTax + withholdingTax };
        });

        const totalTax = data.reduce((s, d) => s + d.totalTax, 0);

        return `
        <div class="card mb-3" style="border-left:4px solid #8b5cf6">
            <div class="card-header"><h3>Tax Liability Summary (Annual)</h3></div>
            <div class="card-body">
                <div class="grid-3 mb-3" style="gap:16px">
                    <div style="padding:16px;background:var(--bg);border-radius:var(--radius);text-align:center">
                        <div style="font-size:11px;color:var(--text-muted)">Total VAT</div>
                        <div style="font-size:20px;font-weight:700">${Utils.formatCurrency(data.reduce((s, d) => s + d.vat, 0), true)}</div>
                    </div>
                    <div style="padding:16px;background:var(--bg);border-radius:var(--radius);text-align:center">
                        <div style="font-size:11px;color:var(--text-muted)">Income Tax</div>
                        <div style="font-size:20px;font-weight:700">${Utils.formatCurrency(data.reduce((s, d) => s + d.incomeTax, 0), true)}</div>
                    </div>
                    <div style="padding:16px;background:var(--bg);border-radius:var(--radius);text-align:center">
                        <div style="font-size:11px;color:var(--text-muted)">Total Tax Liability</div>
                        <div style="font-size:20px;font-weight:700;color:var(--danger)">${Utils.formatCurrency(totalTax, true)}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-body no-padding">
                ${Utils.buildTable(
                    [
                        { label: 'Company', render: r => `<strong>${r.name}</strong>` },
                        { label: 'Gross Revenue', render: r => Utils.formatCurrency(r.revenue) },
                        { label: 'VAT (12%)', render: r => Utils.formatCurrency(r.vat) },
                        { label: 'Income Tax (25%)', render: r => Utils.formatCurrency(r.incomeTax) },
                        { label: 'Withholding (2%)', render: r => Utils.formatCurrency(r.withholdingTax) },
                        { label: 'Total Tax', render: r => `<strong style="color:var(--danger)">${Utils.formatCurrency(r.totalTax)}</strong>` }
                    ],
                    data
                )}
            </div>
        </div>

        <div class="card mt-3">
            <div class="card-header"><h3>BIR Filing Calendar</h3></div>
            <div class="card-body">
                <div class="timeline">
                    <div class="timeline-item"><div class="timeline-dot green"></div><div class="timeline-content"><strong>Monthly VAT (BIR 2550M)</strong><div style="font-size:12px;color:var(--text-muted)">Due: 20th of following month</div></div></div>
                    <div class="timeline-item"><div class="timeline-dot blue"></div><div class="timeline-content"><strong>Quarterly VAT (BIR 2550Q)</strong><div style="font-size:12px;color:var(--text-muted)">Due: 25th of month following quarter</div></div></div>
                    <div class="timeline-item"><div class="timeline-dot orange"></div><div class="timeline-content"><strong>Quarterly Income Tax (BIR 1702Q)</strong><div style="font-size:12px;color:var(--text-muted)">Due: 60 days after quarter end</div></div></div>
                    <div class="timeline-item"><div class="timeline-dot red"></div><div class="timeline-content"><strong>Annual Income Tax (BIR 1702)</strong><div style="font-size:12px;color:var(--text-muted)">Due: April 15</div></div></div>
                    <div class="timeline-item"><div class="timeline-dot teal"></div><div class="timeline-content"><strong>Withholding Tax (BIR 1601C/E)</strong><div style="font-size:12px;color:var(--text-muted)">Due: 10th of following month</div></div></div>
                </div>
            </div>
        </div>`;
    },

    renderBudgetVsActual() {
        const projects = App.activeCompany === 'all'
            ? DataStore.projects
            : DataStore.projects.filter(p => p.company === App.activeCompany);

        return `
        <div class="card mb-3">
            <div class="card-header"><h3>Budget vs Actual — Projects</h3></div>
            <div class="card-body">
                <div class="chart-container large"><canvas id="budgetChart"></canvas></div>
            </div>
        </div>

        <div class="card">
            <div class="card-body no-padding">
                ${Utils.buildTable(
                    [
                        { label: 'Project', render: r => `<strong>${r.name}</strong>` },
                        { label: 'Company', render: r => `<span class="badge-tag badge-${r.company}">${r.company}</span>` },
                        { label: 'Budget', render: r => Utils.formatCurrency(r.budget) },
                        { label: 'Actual', render: r => Utils.formatCurrency(r.actualCost) },
                        { label: 'Variance', render: r => {
                            const v = r.budget - r.actualCost;
                            return `<span style="color:${v >= 0 ? 'var(--secondary)' : 'var(--danger)'}">${v >= 0 ? '+' : ''}${Utils.formatCurrency(v, true)}</span>`;
                        }},
                        { label: 'Utilization', render: r => {
                            const pct = r.budget > 0 ? ((r.actualCost / r.budget) * 100).toFixed(1) : 0;
                            return `<div class="progress-bar" style="width:120px"><div class="progress-fill ${pct > 100 ? 'red' : pct > 90 ? 'orange' : 'green'}" style="width:${Math.min(pct, 100)}%"></div></div><span style="font-size:12px;margin-left:4px">${pct}%</span>`;
                        }}
                    ],
                    projects
                )}
            </div>
        </div>`;
    },

    exportReport() {
        // Collect visible table data from the current report tab
        const table = document.querySelector('#reportContent .data-table');
        if (!table) { App.showToast('No tabular data to export on this tab', 'info'); return; }

        const period = document.getElementById('reportPeriod')?.value || 'annual';
        const rows = [];

        // Headers
        const headers = [];
        table.querySelectorAll('thead th').forEach(th => headers.push(th.textContent.trim()));
        rows.push(headers);

        // Data rows (strip HTML tags)
        table.querySelectorAll('tbody tr').forEach(tr => {
            const cells = [];
            tr.querySelectorAll('td').forEach(td => cells.push(td.textContent.trim().replace(/\s+/g, ' ')));
            if (cells.some(c => c)) rows.push(cells);
        });

        // Build CSV
        const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `UBMS_Report_${period}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        App.showToast('Report exported as CSV', 'success');
    }
};
