/* ========================================
   UBMS - Financial Analysis Module
   Real-time Financial Health & Analytics
   Per-company + Consolidated views
   ======================================== */

const FinancialAnalysis = {
    activeTab: 'health',

    render(container) {
        const isConsolidated = App.activeCompany === 'all';
        const companies = isConsolidated ? Object.keys(DataStore.companies) : [App.activeCompany];
        const health = this.computeFinancialHealth(companies);

        container.innerHTML = `
        <div class="section-header mb-3">
            <h2><i class="fas fa-heartbeat" style="margin-right:8px;color:var(--danger)"></i>Financial Analysis${isConsolidated ? ' — Consolidated' : ` — ${DataStore.companies[App.activeCompany]?.name || ''}`}</h2>
            <div class="section-actions">
                <button class="btn btn-secondary" onclick="FinancialAnalysis.exportAnalysis()"><i class="fas fa-file-export"></i> Export</button>
            </div>
        </div>

        <!-- Health Score Banner -->
        <div class="card mb-3" style="border-left:4px solid ${health.scoreColor}">
            <div class="card-body" style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
                <div style="position:relative;width:100px;height:100px;flex-shrink:0">
                    <svg width="100" height="100" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" stroke-width="10"/>
                        <circle cx="50" cy="50" r="42" fill="none" stroke="${health.scoreColor}" stroke-width="10"
                            stroke-dasharray="${(health.score/100)*263.9} 263.9" stroke-linecap="round" transform="rotate(-90 50 50)"/>
                    </svg>
                    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center">
                        <div style="font-size:22px;font-weight:800">${health.score}</div>
                        <div style="font-size:9px;color:var(--text-muted)">/ 100</div>
                    </div>
                </div>
                <div style="flex:1;min-width:200px">
                    <div style="font-size:20px;font-weight:700;color:${health.scoreColor}">${health.rating}</div>
                    <div style="font-size:13px;color:var(--text-muted);margin-top:4px">${health.summary}</div>
                    <div style="display:flex;gap:24px;margin-top:12px;flex-wrap:wrap">
                        <div><span style="font-size:11px;color:var(--text-muted)">Net Income</span><br><strong style="color:${health.netIncome >= 0 ? 'var(--success)' : 'var(--danger)'}">${Utils.formatCurrency(health.netIncome, true)}</strong></div>
                        <div><span style="font-size:11px;color:var(--text-muted)">Profit Margin</span><br><strong style="color:${health.profitMargin >= 0 ? 'var(--success)' : 'var(--danger)'}">${health.profitMargin.toFixed(1)}%</strong></div>
                        <div><span style="font-size:11px;color:var(--text-muted)">Revenue Trend</span><br><strong><span class="stat-trend ${health.revTrend >= 0 ? 'up' : 'down'}"><i class="fas fa-arrow-${health.revTrend >= 0 ? 'up' : 'down'}"></i> ${Math.abs(health.revTrend).toFixed(1)}%</span></strong></div>
                        <div><span style="font-size:11px;color:var(--text-muted)">CAS Compliance</span><br><strong style="color:${health.casScore >= 80 ? 'var(--success)' : health.casScore >= 50 ? 'var(--warning)' : 'var(--danger)'}">${health.casScore}%</strong></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tab Navigation -->
        <div class="tab-nav mb-3">
            <button class="tab-btn active" onclick="FinancialAnalysis.switchTab('health', this)">Financial Health</button>
            <button class="tab-btn" onclick="FinancialAnalysis.switchTab('ratios', this)">Key Ratios</button>
            <button class="tab-btn" onclick="FinancialAnalysis.switchTab('trends', this)">Trend Analysis</button>
            <button class="tab-btn" onclick="FinancialAnalysis.switchTab('cashflow', this)">Cash Flow Analysis</button>
            ${isConsolidated ? '<button class="tab-btn" onclick="FinancialAnalysis.switchTab(\'comparison\', this)">Company Comparison</button>' : ''}
            <button class="tab-btn" onclick="FinancialAnalysis.switchTab('compliance', this)">Compliance Overview</button>
        </div>

        <div id="faTabContent">
            ${this.renderHealthTab(companies)}
        </div>`;
    },

    switchTab(tab, btn) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = tab;
        const companies = App.activeCompany === 'all' ? Object.keys(DataStore.companies) : [App.activeCompany];
        const el = document.getElementById('faTabContent');
        switch (tab) {
            case 'health': el.innerHTML = this.renderHealthTab(companies); break;
            case 'ratios': el.innerHTML = this.renderRatiosTab(companies); break;
            case 'trends': el.innerHTML = this.renderTrendsTab(companies); this.initTrendCharts(companies); break;
            case 'cashflow': el.innerHTML = this.renderCashFlowAnalysis(companies); this.initCashFlowChart(companies); break;
            case 'comparison': el.innerHTML = this.renderComparisonTab(); this.initComparisonChart(); break;
            case 'compliance': el.innerHTML = this.renderComplianceOverview(companies); break;
        }
    },

    // ---- CORE COMPUTATION ENGINE ----
    computeFinancialHealth(companies) {
        const now = new Date();
        const curMonth = now.getMonth();
        const prevMonth = curMonth === 0 ? 11 : curMonth - 1;

        // Revenue
        const totalAnnualRevenue = companies.reduce((s, co) => s + (DataStore.monthlyRevenue[co]?.reduce((a, v) => a + v, 0) || 0), 0);
        const curMonthRev = companies.reduce((s, co) => s + (DataStore.monthlyRevenue[co]?.[curMonth] || 0), 0);
        const prevMonthRev = companies.reduce((s, co) => s + (DataStore.monthlyRevenue[co]?.[prevMonth] || 0), 0);
        const revTrend = prevMonthRev > 0 ? ((curMonthRev - prevMonthRev) / prevMonthRev * 100) : 0;

        // Expenses
        const totalExpenses = companies.reduce((s, co) => s + DataStore.expenses.filter(e => e.company === co).reduce((a, e) => a + e.amount, 0), 0);

        // Invoices
        const invoices = companies.reduce((arr, co) => arr.concat(DataStore.invoices.filter(i => i.company === co)), []);
        const totalCollected = invoices.reduce((s, i) => s + i.paid, 0);
        const totalReceivable = invoices.reduce((s, i) => s + (i.amount - i.paid), 0);
        const overdueInvoices = invoices.filter(i => i.status !== 'paid' && new Date(i.dueDate) < now).length;

        // Net income
        const netIncome = totalAnnualRevenue - totalExpenses;
        const profitMargin = totalAnnualRevenue > 0 ? (netIncome / totalAnnualRevenue * 100) : 0;

        // Collection efficiency
        const totalBilled = invoices.reduce((s, i) => s + i.amount, 0);
        const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled * 100) : 0;

        // Expense ratio
        const expenseRatio = totalAnnualRevenue > 0 ? (totalExpenses / totalAnnualRevenue * 100) : 0;

        // CAS compliance
        const casItems = typeof Financial !== 'undefined' && Financial.getCASComplianceItems
            ? Financial.getCASComplianceItems(companies.length === 1 ? companies[0] : 'all')
            : [];
        const casScore = casItems.length > 0 ? Math.round(casItems.filter(i => i.done).length / casItems.length * 100) : 0;

        // Financial Health Score (0-100)
        let score = 50; // Base
        // Profitability: +/- 20
        if (profitMargin > 20) score += 20;
        else if (profitMargin > 10) score += 15;
        else if (profitMargin > 0) score += 10;
        else if (profitMargin > -10) score -= 5;
        else score -= 15;
        // Revenue trend: +/- 10
        if (revTrend > 10) score += 10;
        else if (revTrend > 0) score += 5;
        else if (revTrend > -10) score -= 3;
        else score -= 10;
        // Collection rate: +/- 10
        if (collectionRate > 90) score += 10;
        else if (collectionRate > 70) score += 5;
        else score -= 5;
        // Expense control: +/- 10
        if (expenseRatio < 60) score += 10;
        else if (expenseRatio < 80) score += 5;
        else score -= 5;
        // Compliance
        score += Math.round((casScore / 100) * 10);
        // Overdue invoices penalty
        score -= Math.min(overdueInvoices * 3, 10);

        score = Math.max(0, Math.min(100, score));

        let rating, scoreColor;
        if (score >= 80) { rating = 'Excellent Financial Health'; scoreColor = 'var(--success)'; }
        else if (score >= 65) { rating = 'Good Financial Health'; scoreColor = '#2196f3'; }
        else if (score >= 50) { rating = 'Fair — Needs Improvement'; scoreColor = 'var(--warning)'; }
        else { rating = 'Poor — Urgent Attention Required'; scoreColor = 'var(--danger)'; }

        const summary = `Annual revenue ${Utils.formatCurrency(totalAnnualRevenue, true)} with ${profitMargin.toFixed(1)}% margin. Collection rate ${collectionRate.toFixed(0)}%, ${overdueInvoices} overdue invoice(s).`;

        return {
            totalAnnualRevenue, totalExpenses, netIncome, profitMargin, curMonthRev, prevMonthRev, revTrend,
            totalCollected, totalReceivable, totalBilled, collectionRate, expenseRatio, overdueInvoices,
            casScore, score, rating, scoreColor, summary
        };
    },

    getCompanyHealth(co) {
        return this.computeFinancialHealth([co]);
    },

    // ---- FINANCIAL HEALTH TAB ----
    renderHealthTab(companies) {
        const isConsolidated = companies.length > 1;

        if (isConsolidated) {
            // Show each company card
            return `
            <div class="grid-2 mb-3">
                ${Object.keys(DataStore.companies).map(co => {
                    const h = this.getCompanyHealth(co);
                    const coData = DataStore.companies[co];
                    return `
                    <div class="card" style="border-top:3px solid ${coData.color}">
                        <div class="card-header">
                            <h3>${coData.name}</h3>
                            <span class="badge-tag" style="background:${h.scoreColor};color:#fff">${h.score}/100</span>
                        </div>
                        <div class="card-body">
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                                <div style="padding:10px;background:var(--bg);border-radius:var(--radius)">
                                    <div style="font-size:10px;color:var(--text-muted)">Annual Revenue</div>
                                    <div style="font-size:16px;font-weight:700;color:var(--secondary)">${Utils.formatCurrency(h.totalAnnualRevenue, true)}</div>
                                </div>
                                <div style="padding:10px;background:var(--bg);border-radius:var(--radius)">
                                    <div style="font-size:10px;color:var(--text-muted)">Net Income</div>
                                    <div style="font-size:16px;font-weight:700;color:${h.netIncome >= 0 ? 'var(--success)' : 'var(--danger)'}">${Utils.formatCurrency(h.netIncome, true)}</div>
                                </div>
                                <div style="padding:10px;background:var(--bg);border-radius:var(--radius)">
                                    <div style="font-size:10px;color:var(--text-muted)">Profit Margin</div>
                                    <div style="font-size:16px;font-weight:700">${h.profitMargin.toFixed(1)}%</div>
                                </div>
                                <div style="padding:10px;background:var(--bg);border-radius:var(--radius)">
                                    <div style="font-size:10px;color:var(--text-muted)">Collection Rate</div>
                                    <div style="font-size:16px;font-weight:700">${h.collectionRate.toFixed(0)}%</div>
                                </div>
                            </div>
                            <div style="margin-top:12px;padding:8px;border-radius:var(--radius);background:${h.scoreColor}10;border:1px solid ${h.scoreColor}40">
                                <span style="font-size:12px;color:${h.scoreColor};font-weight:600">${h.rating}</span>
                            </div>
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
        }

        // Single company detailed view
        const h = this.computeFinancialHealth(companies);
        return `
        <div class="grid-4 mb-3">
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon green"><i class="fas fa-chart-line"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(h.totalAnnualRevenue, true)}</div>
                <div class="stat-label">Annual Revenue</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon ${h.netIncome >= 0 ? 'teal' : 'red'}"><i class="fas fa-coins"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(h.netIncome, true)}</div>
                <div class="stat-label">Net Income</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon blue"><i class="fas fa-percentage"></i></div></div>
                <div class="stat-value">${h.profitMargin.toFixed(1)}%</div>
                <div class="stat-label">Profit Margin</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon orange"><i class="fas fa-file-invoice-dollar"></i></div></div>
                <div class="stat-value">${h.collectionRate.toFixed(0)}%</div>
                <div class="stat-label">Collection Rate</div>
            </div>
        </div>

        <div class="grid-2 mb-3">
            <div class="card">
                <div class="card-header"><h3>Revenue vs Expenses</h3></div>
                <div class="card-body">
                    <div style="margin-bottom:16px">
                        <div class="flex-between" style="margin-bottom:6px">
                            <span style="font-size:12px">Revenue</span>
                            <span style="font-size:12px;font-weight:600;color:var(--secondary)">${Utils.formatCurrency(h.totalAnnualRevenue, true)}</span>
                        </div>
                        <div class="progress-bar"><div class="progress-fill green" style="width:100%"></div></div>
                    </div>
                    <div style="margin-bottom:16px">
                        <div class="flex-between" style="margin-bottom:6px">
                            <span style="font-size:12px">Expenses</span>
                            <span style="font-size:12px;font-weight:600;color:var(--danger)">${Utils.formatCurrency(h.totalExpenses, true)}</span>
                        </div>
                        <div class="progress-bar"><div class="progress-fill ${h.expenseRatio > 80 ? 'red' : h.expenseRatio > 60 ? 'orange' : 'green'}" style="width:${Math.min(h.expenseRatio, 100)}%"></div></div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Expense Ratio: ${h.expenseRatio.toFixed(1)}%</div>
                    </div>
                    <div>
                        <div class="flex-between" style="margin-bottom:6px">
                            <span style="font-size:12px">Receivable</span>
                            <span style="font-size:12px;font-weight:600;color:var(--warning)">${Utils.formatCurrency(h.totalReceivable, true)}</span>
                        </div>
                        <div class="progress-bar"><div class="progress-fill orange" style="width:${h.totalBilled > 0 ? ((h.totalReceivable / h.totalBilled) * 100).toFixed(0) : 0}%"></div></div>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3>Financial Indicators</h3></div>
                <div class="card-body">
                    ${this.renderIndicator('Profitability', h.profitMargin, '%', h.profitMargin > 20 ? 'green' : h.profitMargin > 0 ? 'orange' : 'red')}
                    ${this.renderIndicator('Expense Control', 100 - h.expenseRatio, '%', h.expenseRatio < 60 ? 'green' : h.expenseRatio < 80 ? 'orange' : 'red')}
                    ${this.renderIndicator('Collection Efficiency', h.collectionRate, '%', h.collectionRate > 90 ? 'green' : h.collectionRate > 70 ? 'orange' : 'red')}
                    ${this.renderIndicator('Revenue Growth', h.revTrend, '%', h.revTrend > 5 ? 'green' : h.revTrend > 0 ? 'orange' : 'red')}
                    ${this.renderIndicator('CAS Compliance', h.casScore, '%', h.casScore >= 80 ? 'green' : h.casScore >= 50 ? 'orange' : 'red')}
                </div>
            </div>
        </div>`;
    },

    renderIndicator(label, value, suffix, color) {
        return `
        <div style="margin-bottom:12px">
            <div class="flex-between" style="margin-bottom:4px">
                <span style="font-size:12px;font-weight:500">${label}</span>
                <span style="font-size:12px;font-weight:700;color:var(--${color === 'green' ? 'success' : color === 'red' ? 'danger' : 'warning'})">${value.toFixed(1)}${suffix}</span>
            </div>
            <div class="progress-bar"><div class="progress-fill ${color}" style="width:${Math.min(Math.max(value, 0), 100)}%"></div></div>
        </div>`;
    },

    // ---- KEY RATIOS TAB ----
    renderRatiosTab(companies) {
        const ratios = companies.map(co => {
            const h = this.getCompanyHealth(co);
            const coData = DataStore.companies[co];
            const invoices = DataStore.invoices.filter(i => i.company === co);
            const avgInvoice = invoices.length > 0 ? invoices.reduce((s, i) => s + i.amount, 0) / invoices.length : 0;

            // Gross margin (revenue - COGS) / revenue; approximate COGS from materials/parts expenses
            const coExpenses = DataStore.expenses.filter(e => e.company === co);
            const cogs = coExpenses.filter(e => ['Materials', 'Parts', 'Labor'].includes(e.category)).reduce((s, e) => s + e.amount, 0);
            const grossMargin = h.totalAnnualRevenue > 0 ? ((h.totalAnnualRevenue - cogs) / h.totalAnnualRevenue * 100) : 0;

            // Operating margin = (Revenue - all Expenses) / Revenue
            const operatingMargin = h.profitMargin;

            // Revenue per invoice
            const revenuePerInvoice = invoices.length > 0 ? h.totalCollected / invoices.length : 0;

            // Days receivable outstanding (DRO)
            const dailyRevenue = h.totalAnnualRevenue / 365;
            const daysReceivable = dailyRevenue > 0 ? h.totalReceivable / dailyRevenue : 0;

            return {
                co, name: coData.name, color: coData.color,
                grossMargin, operatingMargin, avgInvoice, revenuePerInvoice,
                collectionRate: h.collectionRate, expenseRatio: h.expenseRatio,
                daysReceivable, overdueCount: h.overdueInvoices,
                revenue: h.totalAnnualRevenue, netIncome: h.netIncome
            };
        });

        return `
        <div class="card">
            <div class="card-header"><h3>Key Financial Ratios</h3></div>
            <div class="card-body no-padding">
                ${Utils.buildTable(
                    [
                        { label: 'Company', render: r => `<strong style="color:${r.color}">${r.name}</strong>` },
                        { label: 'Gross Margin', render: r => `<span style="color:${r.grossMargin > 30 ? 'var(--success)' : 'var(--warning)'}">${r.grossMargin.toFixed(1)}%</span>` },
                        { label: 'Operating Margin', render: r => `<span style="color:${r.operatingMargin > 0 ? 'var(--success)' : 'var(--danger)'}">${r.operatingMargin.toFixed(1)}%</span>` },
                        { label: 'Expense Ratio', render: r => `<span style="color:${r.expenseRatio < 60 ? 'var(--success)' : r.expenseRatio < 80 ? 'var(--warning)' : 'var(--danger)'}">${r.expenseRatio.toFixed(1)}%</span>` },
                        { label: 'Collection Rate', render: r => `${r.collectionRate.toFixed(1)}%` },
                        { label: 'Days Receivable', render: r => `${r.daysReceivable.toFixed(0)} days` },
                        { label: 'Avg Invoice', render: r => Utils.formatCurrency(r.avgInvoice) },
                        { label: 'Overdue', render: r => r.overdueCount > 0 ? `<span class="badge-tag badge-danger">${r.overdueCount}</span>` : '<span class="badge-tag badge-success">0</span>' }
                    ],
                    ratios
                )}
            </div>
        </div>

        <div class="grid-2 mt-3">
            ${ratios.map(r => `
            <div class="card" style="border-top:3px solid ${r.color}">
                <div class="card-header"><h3>${r.name}</h3></div>
                <div class="card-body">
                    ${this.renderIndicator('Gross Margin', r.grossMargin, '%', r.grossMargin > 40 ? 'green' : r.grossMargin > 20 ? 'orange' : 'red')}
                    ${this.renderIndicator('Operating Margin', Math.max(r.operatingMargin, 0), '%', r.operatingMargin > 15 ? 'green' : r.operatingMargin > 0 ? 'orange' : 'red')}
                    ${this.renderIndicator('Collection Rate', r.collectionRate, '%', r.collectionRate > 90 ? 'green' : r.collectionRate > 70 ? 'orange' : 'red')}
                    ${this.renderIndicator('Expense Control', Math.max(100 - r.expenseRatio, 0), '%', r.expenseRatio < 60 ? 'green' : r.expenseRatio < 80 ? 'orange' : 'red')}
                </div>
            </div>`).join('')}
        </div>`;
    },

    // ---- TREND ANALYSIS TAB ----
    renderTrendsTab(companies) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Compute month-over-month changes
        const monthlyTotals = months.map((_, i) => companies.reduce((s, co) => s + (DataStore.monthlyRevenue[co]?.[i] || 0), 0));
        const momChanges = monthlyTotals.map((v, i) => i === 0 ? 0 : (monthlyTotals[i - 1] > 0 ? ((v - monthlyTotals[i - 1]) / monthlyTotals[i - 1] * 100) : 0));

        return `
        <div class="card mb-3">
            <div class="card-header"><h3>Revenue Trend (12 Months)</h3></div>
            <div class="card-body">
                <div class="chart-container large"><canvas id="faTrendChart"></canvas></div>
            </div>
        </div>

        <div class="card mb-3">
            <div class="card-header"><h3>Month-over-Month Growth</h3></div>
            <div class="card-body no-padding">
                <table class="data-table">
                    <thead><tr><th>Month</th><th>Revenue</th><th>MoM Change</th><th>Trend</th></tr></thead>
                    <tbody>
                        ${months.map((m, i) => `
                        <tr>
                            <td><strong>${m}</strong></td>
                            <td>${Utils.formatCurrency(monthlyTotals[i], true)}</td>
                            <td style="color:${momChanges[i] >= 0 ? 'var(--success)' : 'var(--danger)'}">${i === 0 ? '—' : `${momChanges[i] >= 0 ? '+' : ''}${momChanges[i].toFixed(1)}%`}</td>
                            <td>${i === 0 ? '' : `<i class="fas fa-arrow-${momChanges[i] >= 0 ? 'up' : 'down'}" style="color:${momChanges[i] >= 0 ? 'var(--success)' : 'var(--danger)'}"></i>`}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    initTrendCharts(companies) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        Utils.destroyChart('faTrendChart');

        const datasets = companies.map(co => ({
            label: DataStore.companies[co]?.name || co,
            data: DataStore.monthlyRevenue[co] || [],
            borderColor: DataStore.companies[co]?.color || '#999',
            backgroundColor: (DataStore.companies[co]?.color || '#999') + '20',
            fill: true,
            tension: 0.4
        }));

        if (companies.length > 1) {
            const totals = months.map((_, i) => companies.reduce((s, co) => s + (DataStore.monthlyRevenue[co]?.[i] || 0), 0));
            datasets.push({
                label: 'Consolidated',
                data: totals,
                borderColor: '#6366f1',
                backgroundColor: '#6366f120',
                fill: false,
                borderWidth: 3,
                borderDash: [5, 5],
                tension: 0.4
            });
        }

        new Chart(document.getElementById('faTrendChart'), {
            type: 'line',
            data: { labels: months, datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: true } },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => '₱' + (v / 1000000).toFixed(1) + 'M' } }
                }
            }
        });
    },

    // ---- CASH FLOW ANALYSIS TAB ----
    renderCashFlowAnalysis(companies) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const monthlyInflow = months.map((_, i) => companies.reduce((s, co) => s + (DataStore.monthlyRevenue[co]?.[i] || 0), 0));
        const monthlyOutflow = months.map((_, i) =>
            companies.reduce((sum, co) =>
                sum + DataStore.expenses.filter(e => e.company === co && new Date(e.date).getMonth() === i)
                    .reduce((s, e) => s + (e.amount || 0), 0), 0)
        );
        const netFlow = monthlyInflow.map((v, i) => v - monthlyOutflow[i]);

        // Opening balance from invoices paid minus expenses
        const totalCollected = companies.reduce((s, co) => s + DataStore.invoices.filter(i => i.company === co).reduce((sum, inv) => sum + inv.paid, 0), 0);
        const totalExpPaid = companies.reduce((s, co) => s + DataStore.expenses.filter(e => e.company === co).reduce((sum, exp) => sum + exp.amount, 0), 0);
        let runningBalance = totalCollected - totalExpPaid;
        const balances = netFlow.map(v => { runningBalance += v; return runningBalance; });

        const totalInflow = monthlyInflow.reduce((s, v) => s + v, 0);
        const totalOutflow = monthlyOutflow.reduce((s, v) => s + v, 0);
        const burnRate = totalOutflow / 12;
        const cashRunway = burnRate > 0 ? (balances[balances.length - 1] / burnRate).toFixed(1) : '∞';

        return `
        <div class="grid-4 mb-3">
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon green"><i class="fas fa-arrow-down"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(totalInflow, true)}</div>
                <div class="stat-label">Total Cash Inflow</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon red"><i class="fas fa-arrow-up"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(totalOutflow, true)}</div>
                <div class="stat-label">Total Cash Outflow</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon ${totalInflow - totalOutflow >= 0 ? 'teal' : 'red'}"><i class="fas fa-balance-scale"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(totalInflow - totalOutflow, true)}</div>
                <div class="stat-label">Net Cash Flow</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon blue"><i class="fas fa-hourglass-half"></i></div></div>
                <div class="stat-value">${cashRunway} mo</div>
                <div class="stat-label">Cash Runway</div>
            </div>
        </div>

        <div class="card mb-3">
            <div class="card-header"><h3>Cash Flow Over Time</h3></div>
            <div class="card-body">
                <div class="chart-container large"><canvas id="faCashFlowChart"></canvas></div>
            </div>
        </div>

        <div class="card">
            <div class="card-header"><h3>Monthly Cash Flow Breakdown</h3></div>
            <div class="card-body no-padding">
                <table class="data-table">
                    <thead><tr><th>Month</th><th>Inflow</th><th>Outflow</th><th>Net</th><th>Balance</th></tr></thead>
                    <tbody>
                        ${months.map((m, i) => `
                        <tr>
                            <td><strong>${m}</strong></td>
                            <td style="color:var(--success)">${Utils.formatCurrency(monthlyInflow[i], true)}</td>
                            <td style="color:var(--danger)">(${Utils.formatCurrency(monthlyOutflow[i], true)})</td>
                            <td style="color:${netFlow[i] >= 0 ? 'var(--success)' : 'var(--danger)'}"><strong>${Utils.formatCurrency(netFlow[i], true)}</strong></td>
                            <td><strong>${Utils.formatCurrency(balances[i], true)}</strong></td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    initCashFlowChart(companies) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        Utils.destroyChart('faCashFlowChart');

        const monthlyInflow = months.map((_, i) => companies.reduce((s, co) => s + (DataStore.monthlyRevenue[co]?.[i] || 0), 0));
        const monthlyOutflow = months.map((_, i) =>
            companies.reduce((sum, co) =>
                sum + DataStore.expenses.filter(e => e.company === co && new Date(e.date).getMonth() === i)
                    .reduce((s, e) => s + (e.amount || 0), 0), 0)
        );

        new Chart(document.getElementById('faCashFlowChart'), {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    { label: 'Inflow', data: monthlyInflow, backgroundColor: '#10b98140', borderColor: '#10b981', borderWidth: 1 },
                    { label: 'Outflow', data: monthlyOutflow.map(v => -v), backgroundColor: '#ef444440', borderColor: '#ef4444', borderWidth: 1 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: true } },
                scales: {
                    y: { ticks: { callback: v => '₱' + (Math.abs(v) / 1000000).toFixed(1) + 'M' } }
                }
            }
        });
    },

    // ---- COMPANY COMPARISON TAB (consolidated only) ----
    renderComparisonTab() {
        const allCo = Object.keys(DataStore.companies);
        const data = allCo.map(co => {
            const h = this.getCompanyHealth(co);
            const coData = DataStore.companies[co];
            return { ...h, co, name: coData.name, color: coData.color, type: coData.type };
        });

        const totalRev = data.reduce((s, d) => s + d.totalAnnualRevenue, 0);

        return `
        <div class="card mb-3">
            <div class="card-header"><h3>Revenue Distribution</h3></div>
            <div class="card-body">
                <div class="chart-container"><canvas id="faCompareChart"></canvas></div>
            </div>
        </div>

        <div class="card mb-3">
            <div class="card-header"><h3>Company Performance Comparison</h3></div>
            <div class="card-body no-padding">
                ${Utils.buildTable(
                    [
                        { label: 'Company', render: r => `<strong style="color:${r.color}">${r.name}</strong><br><span style="font-size:11px;color:var(--text-muted)">${r.type}</span>` },
                        { label: 'Revenue', render: r => `${Utils.formatCurrency(r.totalAnnualRevenue, true)}<br><span style="font-size:10px;color:var(--text-muted)">${totalRev > 0 ? ((r.totalAnnualRevenue / totalRev) * 100).toFixed(1) : 0}% of group</span>` },
                        { label: 'Net Income', render: r => `<span style="color:${r.netIncome >= 0 ? 'var(--success)' : 'var(--danger)'}">${Utils.formatCurrency(r.netIncome, true)}</span>` },
                        { label: 'Margin', render: r => `<span style="color:${r.profitMargin > 0 ? 'var(--success)' : 'var(--danger)'}">${r.profitMargin.toFixed(1)}%</span>` },
                        { label: 'Collection', render: r => `${r.collectionRate.toFixed(0)}%` },
                        { label: 'Trend', render: r => `<span class="stat-trend ${r.revTrend >= 0 ? 'up' : 'down'}"><i class="fas fa-arrow-${r.revTrend >= 0 ? 'up' : 'down'}"></i> ${Math.abs(r.revTrend).toFixed(1)}%</span>` },
                        { label: 'Health Score', render: r => `<span class="badge-tag" style="background:${r.scoreColor};color:#fff;font-weight:700">${r.score}/100</span>` }
                    ],
                    data
                )}
            </div>
        </div>

        <div class="card">
            <div class="card-header"><h3>Industry Breakdown</h3></div>
            <div class="card-body">
                ${['construction', 'wellness', 'automotive'].map(type => {
                    const typeData = data.filter(d => d.type === type);
                    if (typeData.length === 0) return '';
                    const typeRev = typeData.reduce((s, d) => s + d.totalAnnualRevenue, 0);
                    const typeNet = typeData.reduce((s, d) => s + d.netIncome, 0);
                    const typeMargin = typeRev > 0 ? (typeNet / typeRev * 100) : 0;
                    const icon = type === 'construction' ? 'fa-hard-hat' : type === 'wellness' ? 'fa-spa' : 'fa-car';
                    return `
                    <div style="padding:12px;background:var(--bg);border-radius:var(--radius);margin-bottom:8px;display:flex;align-items:center;gap:16px">
                        <i class="fas ${icon}" style="font-size:24px;color:var(--secondary);width:32px;text-align:center"></i>
                        <div style="flex:1">
                            <div style="font-weight:600;text-transform:capitalize">${type} (${typeData.length} ${typeData.length > 1 ? 'companies' : 'company'})</div>
                            <div style="font-size:12px;color:var(--text-muted)">${typeData.map(d => d.name).join(', ')}</div>
                        </div>
                        <div style="text-align:right">
                            <div style="font-weight:700;color:var(--secondary)">${Utils.formatCurrency(typeRev, true)}</div>
                            <div style="font-size:12px;color:${typeMargin >= 0 ? 'var(--success)' : 'var(--danger)'}">Margin: ${typeMargin.toFixed(1)}%</div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    },

    initComparisonChart() {
        Utils.destroyChart('faCompareChart');
        const allCo = Object.keys(DataStore.companies);

        new Chart(document.getElementById('faCompareChart'), {
            type: 'doughnut',
            data: {
                labels: allCo.map(co => DataStore.companies[co].name),
                datasets: [{
                    data: allCo.map(co => (DataStore.monthlyRevenue[co]?.reduce((s, v) => s + v, 0) || 0)),
                    backgroundColor: allCo.map(co => DataStore.companies[co].color),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.label}: ₱${(ctx.raw / 1000000).toFixed(1)}M`
                        }
                    }
                }
            }
        });
    },

    // ---- COMPLIANCE OVERVIEW TAB ----
    renderComplianceOverview(companies) {
        const isConsolidated = companies.length > 1;

        if (isConsolidated) {
            return `
            <div class="card mb-3">
                <div class="card-header"><h3>CAS/CBA Compliance — All Companies</h3></div>
                <div class="card-body">
                    ${Object.keys(DataStore.companies).map(co => {
                        const items = Financial.getCASComplianceItems(co);
                        const done = items.filter(i => i.done).length;
                        const pct = Math.round((done / items.length) * 100);
                        const coData = DataStore.companies[co];
                        return `
                        <div style="padding:16px;background:var(--bg);border-radius:var(--radius);margin-bottom:12px;border-left:4px solid ${coData.color}">
                            <div class="flex-between" style="margin-bottom:8px">
                                <div>
                                    <strong style="color:${coData.color}">${coData.name}</strong>
                                    <span style="font-size:12px;color:var(--text-muted);margin-left:8px">${done}/${items.length} compliant</span>
                                </div>
                                <span class="badge-tag ${pct >= 80 ? 'badge-success' : pct >= 50 ? 'badge-warning' : 'badge-danger'}">${pct}%</span>
                            </div>
                            <div class="progress-bar"><div class="progress-fill ${pct >= 80 ? 'green' : pct >= 50 ? 'orange' : 'red'}" style="width:${pct}%"></div></div>
                            <div style="margin-top:8px;font-size:11px;color:var(--text-muted)">
                                ${items.filter(i => !i.done).map(i => `<span style="color:var(--danger)">• ${i.label}</span>`).join('<br>')}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        }

        // Single company: show full checklist detail
        const items = Financial.getCASComplianceItems(companies[0]);
        const done = items.filter(i => i.done).length;
        const pct = Math.round((done / items.length) * 100);

        return `
        <div class="card">
            <div class="card-header">
                <div>
                    <h3>CAS/CBA Compliance Detail</h3>
                    <p style="font-size:12px;color:var(--text-muted)">Real-time compliance status for ${DataStore.companies[companies[0]]?.name || 'Company'}</p>
                </div>
                <span class="badge-tag ${pct >= 80 ? 'badge-success' : pct >= 50 ? 'badge-warning' : 'badge-danger'}" style="font-size:14px;padding:6px 12px">${pct}% — ${done}/${items.length}</span>
            </div>
            <div class="card-body">
                ${items.map(item => `
                    <div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border-light)">
                        <div style="display:flex;align-items:flex-start;gap:12px">
                            <i class="fas ${item.done ? 'fa-check-circle' : 'fa-times-circle'}" style="color:${item.done ? 'var(--success)' : 'var(--danger)'};margin-top:2px;flex-shrink:0"></i>
                            <div>
                                <div style="font-size:13px;font-weight:500">${item.label}</div>
                                <div style="font-size:11px;color:var(--text-muted)">Ref: ${item.ref}</div>
                                <div style="font-size:10px;color:${item.done ? 'var(--success)' : 'var(--warning)'};font-style:italic;margin-top:2px">${item.detail || ''}</div>
                            </div>
                        </div>
                        <span class="badge-tag ${item.done ? 'badge-success' : 'badge-danger'}" style="flex-shrink:0">${item.done ? 'Compliant' : 'Required'}</span>
                    </div>
                `).join('')}
            </div>
        </div>`;
    },

    // ---- EXPORT ----
    exportAnalysis() {
        const table = document.querySelector('#faTabContent .data-table');
        if (!table) { App.showToast('No tabular data to export on this tab', 'info'); return; }

        const rows = [];
        const headers = [];
        table.querySelectorAll('thead th').forEach(th => headers.push(th.textContent.trim()));
        rows.push(headers);
        table.querySelectorAll('tbody tr').forEach(tr => {
            const cells = [];
            tr.querySelectorAll('td').forEach(td => cells.push(td.textContent.trim().replace(/\s+/g, ' ')));
            if (cells.some(c => c)) rows.push(cells);
        });

        const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `UBMS_Financial_Analysis_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        App.showToast('Financial analysis exported as CSV', 'success');
    }
};
