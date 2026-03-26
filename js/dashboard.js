/* ========================================
   UBMS - Dashboard Module
   Group overview with per-company KPIs
   ======================================== */

const Dashboard = {
    render(container) {
        const company = App.activeCompany;
        const isAll = company === 'all';

        let html = '';

        if (isAll) {
            html = this.renderGroupDashboard();
        } else {
            const type = DataStore.companies[company]?.type;
            switch (type) {
                case 'construction': html = this.renderConstructionDashboard(company); break;
                case 'wellness': html = this.renderWellnessDashboard(); break;
                case 'automotive': html = this.renderAutomotiveDashboard(); break;
                default: html = this.renderGroupDashboard();
            }
        }

        container.innerHTML = html;
        this.initCharts();
    },

    // ============================================================
    //  GROUP DASHBOARD (Owner View)
    // ============================================================
    renderGroupDashboard() {
        const summary = DataStore.getFinancialSummary('all');
        const companies = Object.keys(DataStore.companies);

        return `
        <!-- Welcome Banner -->
        <div class="card mb-3" style="background:linear-gradient(135deg,#0d1b2a,#1b3a4b);color:white;border:none">
            <div class="card-body" style="display:flex;justify-content:space-between;align-items:center">
                <div>
                    <h2 style="font-size:24px;font-weight:800;margin-bottom:8px">Welcome back, ${Auth.getName()}</h2>
                    <p style="opacity:0.7;font-size:14px">Here's your consolidated business overview for ${new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div style="text-align:right">
                    <div style="font-size:12px;opacity:0.5;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Group Net Income</div>
                    <div style="font-size:32px;font-weight:800">${Utils.formatCurrency(summary.netIncome, true)}</div>
                </div>
            </div>
        </div>

        <!-- Company KPI Cards -->
        <div class="grid-4 mb-3">
            ${companies.map(id => this.renderCompanyCard(id)).join('')}
        </div>

        <!-- Financial Overview + Activity -->
        <div class="grid-2 mb-3">
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-chart-line" style="margin-right:8px;color:var(--secondary)"></i>Revenue Trend (12 Months)</h3>
                </div>
                <div class="card-body">
                    <div class="chart-container"><canvas id="revenueChart"></canvas></div>
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-chart-pie" style="margin-right:8px;color:var(--secondary)"></i>Revenue by Company</h3>
                </div>
                <div class="card-body">
                    <div class="chart-container"><canvas id="companyPieChart"></canvas></div>
                </div>
            </div>
        </div>

        <!-- Financial Summary Cards -->
        <div class="grid-4 mb-3">
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon teal"><i class="fas fa-peso-sign"></i></div>
                    ${(() => {
                        const companies = App.activeCompany === 'all' ? Object.keys(DataStore.companies) : [App.activeCompany];
                        const now = new Date();
                        const curMonth = now.getMonth();
                        const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
                        const curRev = companies.reduce((s, co) => s + (DataStore.monthlyRevenue[co]?.[curMonth] || 0), 0);
                        const prevRev = companies.reduce((s, co) => s + (DataStore.monthlyRevenue[co]?.[prevMonth] || 0), 0);
                        const pct = prevRev > 0 ? ((curRev - prevRev) / prevRev * 100).toFixed(1) : 0;
                        const up = pct >= 0;
                        return `<span class="stat-trend ${up?'up':'down'}"><i class="fas fa-arrow-${up?'up':'down'}"></i> ${Math.abs(pct)}%</span>`;
                    })()}
                </div>
                <div class="stat-value">${Utils.formatCurrency(summary.totalRevenue, true)}</div>
                <div class="stat-label">Total Revenue</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon orange"><i class="fas fa-clock"></i></div>
                </div>
                <div class="stat-value">${Utils.formatCurrency(summary.totalReceivable, true)}</div>
                <div class="stat-label">Accounts Receivable</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon red"><i class="fas fa-file-invoice-dollar"></i></div>
                </div>
                <div class="stat-value">${Utils.formatCurrency(summary.totalExpenses, true)}</div>
                <div class="stat-label">Total Expenses</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon blue"><i class="fas fa-file-alt"></i></div>
                </div>
                <div class="stat-value">${summary.invoiceCount}</div>
                <div class="stat-label">Active Invoices (${summary.paidInvoices} Paid)</div>
            </div>
        </div>

        <!-- Activity Feed + Quick Stats -->
        <div class="grid-2">
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-stream" style="margin-right:8px;color:var(--secondary)"></i>Recent Activity</h3>
                    <button class="btn btn-sm btn-secondary">View All</button>
                </div>
                <div class="card-body">
                    <ul class="activity-feed">
                        ${DataStore.activityLog.slice(0, 8).map(a => `
                            <li class="activity-item">
                                <div class="activity-dot ${a.type === 'success' ? 'green' : a.type === 'warning' ? 'orange' : a.type === 'danger' ? 'red' : 'blue'}"></div>
                                <div class="activity-text">
                                    ${a.message}
                                    <span class="badge-tag badge-${a.company}" style="margin-left:6px">${Utils.getCompanyName(a.company).split(' ')[0]}</span>
                                </div>
                                <span class="activity-time">${Utils.formatRelative(a.time)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-exclamation-circle" style="margin-right:8px;color:var(--warning)"></i>Items Needing Attention</h3>
                </div>
                <div class="card-body">
                    ${this.renderAlerts()}
                </div>
            </div>
        </div>`;
    },

    renderCompanyCard(companyId) {
        const summary = DataStore.getCompanySummary(companyId);
        const co = summary.company;
        let metricLabel = '', metricValue = '';

        if (co.type === 'construction') {
            metricLabel = 'Active Projects';
            metricValue = summary.activeProjects || 0;
        } else if (co.type === 'wellness') {
            metricLabel = "Today's Bookings";
            metricValue = summary.todayBookings || 0;
        } else if (co.type === 'automotive') {
            metricLabel = 'Active Jobs';
            metricValue = summary.activeJobs || 0;
        }

        return `
        <div class="stat-card" data-company="${companyId}" style="cursor:pointer" onclick="App.switchCompany('${companyId}');document.getElementById('activeCompany').value='${companyId}'">
            <div class="stat-header">
                <div class="stat-icon" style="background:#ffffff;border:1.5px solid ${co.color}40;overflow:hidden;padding:3px">
                    <img src="${co.logo}" alt="${co.name}" style="width:100%;height:100%;object-fit:contain;border-radius:8px">
                </div>
                <span class="badge-tag" style="background:${co.color}15;color:${co.color}">${co.type}</span>
            </div>
            <h4 style="font-size:15px;font-weight:700;margin-bottom:12px">${co.name}</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div>
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">Revenue</div>
                    <div style="font-size:16px;font-weight:700">${Utils.formatCurrency(summary.totalRevenue, true)}</div>
                </div>
                <div>
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">${metricLabel}</div>
                    <div style="font-size:16px;font-weight:700">${metricValue}</div>
                </div>
            </div>
        </div>`;
    },

    renderAlerts() {
        const alerts = [];

        // Overdue invoices
        const overdue = DataStore.invoices.filter(i => i.status === 'unpaid' && new Date(i.dueDate) < new Date());
        overdue.forEach(inv => {
            alerts.push({ icon: 'fa-exclamation-triangle', color: 'red', title: 'Overdue Invoice', desc: `${inv.id} — ${Utils.formatCurrency(inv.amount)}`, company: inv.company });
        });

        // Low stock parts
        const lowStock = DataStore.autoParts.filter(p => p.quantity <= p.minStock);
        lowStock.forEach(p => {
            alerts.push({ icon: 'fa-box-open', color: 'orange', title: 'Low Stock', desc: `${p.name} — ${p.quantity} remaining`, company: 'autocasa' });
        });

        // Over-budget projects
        DataStore.projects.forEach(p => {
            if (p.actualCost > p.budget * 0.9 && p.status === 'in-progress') {
                const pct = ((p.actualCost / p.budget) * 100).toFixed(0);
                alerts.push({ icon: 'fa-hard-hat', color: 'orange', title: 'Near/Over Budget', desc: `${p.name} — ${pct}% of budget used`, company: p.company });
            }
        });

        if (alerts.length === 0) {
            return '<div class="empty-state" style="padding:20px"><i class="fas fa-check-circle" style="color:var(--success)"></i><h3>All Clear!</h3><p>No items need immediate attention.</p></div>';
        }

        return alerts.map(a => `
            <div class="activity-item" style="cursor:pointer">
                <div class="activity-dot ${a.color}"></div>
                <div class="activity-text">
                    <strong>${a.title}</strong><br>
                    <span style="font-size:12px;color:var(--text-secondary)">${a.desc}</span>
                </div>
                <span class="badge-tag badge-${a.company}">${a.company}</span>
            </div>
        `).join('');
    },

    // ============================================================
    //  CONSTRUCTION DASHBOARD
    // ============================================================
    renderConstructionDashboard(company) {
        const projects = DataStore.projects.filter(p => p.company === company);
        const active = projects.filter(p => p.status === 'in-progress');
        const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
        const totalSpent = projects.reduce((s, p) => s + p.actualCost, 0);
        const summary = DataStore.getFinancialSummary(company);

        return `
        <div class="grid-4 mb-3">
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon teal"><i class="fas fa-project-diagram"></i></div></div>
                <div class="stat-value">${active.length}</div>
                <div class="stat-label">Active Projects</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon blue"><i class="fas fa-peso-sign"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(totalBudget, true)}</div>
                <div class="stat-label">Total Budget</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon orange"><i class="fas fa-receipt"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(totalSpent, true)}</div>
                <div class="stat-label">Total Spent</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon green"><i class="fas fa-chart-line"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(summary.totalRevenue, true)}</div>
                <div class="stat-label">Revenue</div>
            </div>
        </div>

        <div class="grid-2 mb-3">
            <div class="card">
                <div class="card-header"><h3>Project Progress</h3></div>
                <div class="card-body">
                    ${active.map(p => `
                        <div style="margin-bottom:16px">
                            <div class="flex-between mb-1">
                                <span style="font-weight:600;font-size:13px">${p.name}</span>
                                <span style="font-size:13px;font-weight:700;color:var(--secondary)">${p.progress}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill ${p.progress > 70 ? 'green' : p.progress > 40 ? 'blue' : 'orange'}" style="width:${p.progress}%"></div>
                            </div>
                            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${p.manager} • Due: ${Utils.formatDate(p.endDate)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3>Budget vs Actual</h3></div>
                <div class="card-body">
                    <div class="chart-container"><canvas id="budgetChart"></canvas></div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header"><h3>Revenue Trend</h3></div>
            <div class="card-body">
                <div class="chart-container"><canvas id="revenueChart"></canvas></div>
            </div>
        </div>`;
    },

    // ============================================================
    //  WELLNESS DASHBOARD
    // ============================================================
    renderWellnessDashboard() {
        const today = new Date().toISOString().split('T')[0];
        const todayBookings = DataStore.bookings.filter(b => b.date === today);
        const activeMembers = DataStore.memberships.filter(m => m.status === 'active');
        const availTherapists = DataStore.therapists.filter(t => t.status === 'available');
        const summary = DataStore.getFinancialSummary('nuatthai');

        return `
        <div class="grid-4 mb-3">
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon teal"><i class="fas fa-calendar-check"></i></div></div>
                <div class="stat-value">${todayBookings.length}</div>
                <div class="stat-label">Today's Bookings</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon green"><i class="fas fa-user-nurse"></i></div></div>
                <div class="stat-value">${availTherapists.length}/${DataStore.therapists.length}</div>
                <div class="stat-label">Available Therapists</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon purple"><i class="fas fa-id-card"></i></div></div>
                <div class="stat-value">${activeMembers.length}</div>
                <div class="stat-label">Active Members</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon blue"><i class="fas fa-peso-sign"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(summary.totalRevenue, true)}</div>
                <div class="stat-label">Revenue</div>
            </div>
        </div>

        <div class="grid-2 mb-3">
            <div class="card">
                <div class="card-header"><h3>Today's Schedule</h3></div>
                <div class="card-body no-padding">
                    ${Utils.buildTable(
                        [
                            { label: 'Time', key: 'time' },
                            { label: 'Customer', render: r => DataStore.customers.find(c => c.id === r.customer)?.name || r.customer },
                            { label: 'Service', render: r => DataStore.spaServices.find(s => s.id === r.service)?.name || r.service },
                            { label: 'Therapist', render: r => DataStore.therapists.find(t => t.id === r.therapist)?.name || r.therapist },
                            { label: 'Status', render: r => `<span class="badge-tag ${Utils.getStatusClass(r.status)}">${r.status}</span>` }
                        ],
                        todayBookings
                    )}
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3>Therapist Availability</h3></div>
                <div class="card-body">
                    ${DataStore.therapists.map(t => `
                        <div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border-light)">
                            <div style="display:flex;align-items:center;gap:10px">
                                <div class="avatar" style="background:${t.status === 'available' ? 'var(--success)' : t.status === 'in-session' ? 'var(--warning)' : 'var(--text-muted)'}">${t.name.split(' ').map(n => n[0]).join('')}</div>
                                <div>
                                    <div style="font-weight:600;font-size:13px">${t.name}</div>
                                    <div style="font-size:11px;color:var(--text-muted)">${t.branch} • ★ ${t.rating}</div>
                                </div>
                            </div>
                            <span class="badge-tag ${t.status === 'available' ? 'badge-success' : t.status === 'in-session' ? 'badge-warning' : 'badge-neutral'}">${t.status}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header"><h3>Revenue Trend</h3></div>
            <div class="card-body">
                <div class="chart-container"><canvas id="revenueChart"></canvas></div>
            </div>
        </div>`;
    },

    // ============================================================
    //  AUTOMOTIVE DASHBOARD
    // ============================================================
    renderAutomotiveDashboard() {
        const jobs = DataStore.jobCards;
        const inQueue = jobs.filter(j => j.status === 'in-queue');
        const inRepair = jobs.filter(j => j.status === 'in-repair');
        const waitingParts = jobs.filter(j => j.status === 'waiting-parts');
        const readyPickup = jobs.filter(j => j.status === 'ready-pickup');
        const lowStock = DataStore.autoParts.filter(p => p.quantity <= p.minStock);
        const summary = DataStore.getFinancialSummary('autocasa');

        return `
        <div class="grid-4 mb-3">
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon teal"><i class="fas fa-wrench"></i></div></div>
                <div class="stat-value">${inRepair.length}</div>
                <div class="stat-label">Under Repair</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon orange"><i class="fas fa-clock"></i></div></div>
                <div class="stat-value">${inQueue.length + waitingParts.length}</div>
                <div class="stat-label">In Queue / Waiting Parts</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div></div>
                <div class="stat-value">${readyPickup.length}</div>
                <div class="stat-label">Ready for Pickup</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><div class="stat-icon red"><i class="fas fa-box-open"></i></div></div>
                <div class="stat-value">${lowStock.length}</div>
                <div class="stat-label">Low Stock Alerts</div>
            </div>
        </div>

        <!-- Workshop Status Board -->
        <div class="card mb-3">
            <div class="card-header"><h3><i class="fas fa-columns" style="margin-right:8px"></i>Workshop Status Board</h3></div>
            <div class="card-body">
                <div class="status-board">
                    ${this.renderStatusColumn('In Queue', inQueue, '#3b82f6')}
                    ${this.renderStatusColumn('Under Repair', inRepair, '#f59e0b')}
                    ${this.renderStatusColumn('Waiting Parts', waitingParts, '#ef4444')}
                    ${this.renderStatusColumn('Ready for Pickup', readyPickup, '#10b981')}
                </div>
            </div>
        </div>

        <div class="grid-2">
            <div class="card">
                <div class="card-header"><h3>Revenue Trend</h3></div>
                <div class="card-body">
                    <div class="chart-container"><canvas id="revenueChart"></canvas></div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3>Low Stock Parts</h3></div>
                <div class="card-body no-padding">
                    ${Utils.buildTable(
                        [
                            { label: 'Part', key: 'name' },
                            { label: 'In Stock', render: r => `<span class="${r.quantity <= r.minStock ? 'text-danger' : ''}" style="font-weight:700">${r.quantity}</span>` },
                            { label: 'Min', key: 'minStock' },
                            { label: 'Supplier', key: 'supplier' }
                        ],
                        lowStock
                    )}
                </div>
            </div>
        </div>`;
    },

    renderStatusColumn(title, items, color) {
        return `
        <div class="status-column">
            <div class="status-column-header">
                <h4 style="color:${color}">${title}</h4>
                <span class="count">${items.length}</span>
            </div>
            ${items.map(j => {
                const vehicle = DataStore.vehicles.find(v => v.id === j.vehicle);
                return `
                <div class="status-card-item">
                    <div style="font-weight:600;font-size:13px;margin-bottom:4px">${vehicle ? `${vehicle.make} ${vehicle.model}` : j.vehicle}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${vehicle?.plate || ''}</div>
                    <div style="font-size:12px;margin-top:6px">${(j.services || []).map(s => DataStore.autoServices.find(a => a.id === s)?.name || s).join(', ')}</div>
                    ${j.technician ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:4px"><i class="fas fa-user" style="margin-right:4px"></i>${j.technician}</div>` : ''}
                </div>`;
            }).join('')}
            ${items.length === 0 ? '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">No items</div>' : ''}
        </div>`;
    },

    // ============================================================
    //  CHART INITIALIZATION
    // ============================================================
    initCharts() {
        const company = App.activeCompany;

        // Revenue Line Chart
        const revCanvas = document.getElementById('revenueChart');
        if (revCanvas) {
            Utils.destroyChart('revenueChart');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const datasets = [];

            if (company === 'all') {
                Object.entries(DataStore.monthlyRevenue).forEach(([id, data]) => {
                    datasets.push({
                        label: DataStore.companies[id].name.split(' ')[0],
                        data,
                        borderColor: DataStore.companies[id].color,
                        backgroundColor: DataStore.companies[id].color + '20',
                        tension: 0.4,
                        fill: false,
                        borderWidth: 2,
                        pointRadius: 3
                    });
                });
            } else {
                const data = DataStore.monthlyRevenue[company] || [];
                datasets.push({
                    label: 'Revenue',
                    data,
                    borderColor: Utils.getCompanyColor(company),
                    backgroundColor: Utils.getCompanyColor(company) + '20',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 3
                });
            }

            new Chart(revCanvas, {
                type: 'line',
                data: { labels: months, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: company === 'all' ? 'top' : 'none' },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `${ctx.dataset.label}: ${Utils.formatCurrency(ctx.raw, true)}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { callback: v => Utils.formatCurrency(v, true) }
                        }
                    }
                }
            });
        }

        // Company Pie Chart (group only)
        const pieCanvas = document.getElementById('companyPieChart');
        if (pieCanvas) {
            Utils.destroyChart('companyPieChart');
            const labels = [];
            const data = [];
            const colors = [];
            Object.entries(DataStore.monthlyRevenue).forEach(([id, vals]) => {
                labels.push(DataStore.companies[id].name.split(' ')[0]);
                data.push(vals.reduce((a, b) => a + b, 0));
                colors.push(DataStore.companies[id].color);
            });

            new Chart(pieCanvas, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `${ctx.label}: ${Utils.formatCurrency(ctx.raw, true)}`
                            }
                        }
                    }
                }
            });
        }

        // Budget Chart (construction)
        const budgetCanvas = document.getElementById('budgetChart');
        if (budgetCanvas) {
            Utils.destroyChart('budgetChart');
            const activeProjects = DataStore.projects.filter(p => p.company === company && p.status === 'in-progress');
            new Chart(budgetCanvas, {
                type: 'bar',
                data: {
                    labels: activeProjects.map(p => p.name.substring(0, 20)),
                    datasets: [
                        { label: 'Budget', data: activeProjects.map(p => p.budget), backgroundColor: '#3b82f6' },
                        { label: 'Actual', data: activeProjects.map(p => p.actualCost), backgroundColor: activeProjects.map(p => p.actualCost > p.budget ? '#ef4444' : '#10b981') }
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
    }
};
