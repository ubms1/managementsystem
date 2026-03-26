/* ========================================
   UBMS - Main Application Controller
   Navigation, routing, and lifecycle
   ======================================== */

const App = {
    currentModule: 'dashboard',
    activeCompany: 'all',
    charts: {},
    sidebarCollapsed: false,

    // ---- Initialize ----
    init() {
        // Initialize database first
        Database.init();

        if (!Auth.init()) return;

        // Standalone mode check
        if (window.UBMS_STANDALONE) {
            const portalCompany = window.UBMS_STANDALONE.company;
            // Verify the current session user is authorised for this portal.
            // Owners (companies: ['all']) always pass; company-specific users are
            // redirected to the portal's own login page if they have no access.
            if (!Auth.canAccessCompany(portalCompany)) {
                window.location.href = Auth.getLoginUrl();
                return;
            }
            this.activeCompany = portalCompany;
            // Align the in-memory session company with the active portal so that
            // Auth.getCompany() returns the correct value within this page load.
            if (Auth.session) Auth.session.company = portalCompany;
        } else {
            this.activeCompany = Auth.getCompany();
        }

        this.setupUI();
        this.setupNavVisibility();
        this.setupSidebarClickOutside();
        this.loadNotifications();
        this.navigate('dashboard');

        // Hide loading screen
        const ls = document.getElementById('loadingScreen');
        if (ls) ls.style.display = 'none';
    },

    // ---- UI Setup ----
    setupUI() {
        // User info
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        if (userName) userName.textContent = Auth.getName();
        if (userRole) {
            const role = Auth.getRole();
            userRole.textContent = role === 'superadmin' ? '🔐 Super Admin' : role.charAt(0).toUpperCase() + role.slice(1);
        }

        // Company selector
        const sel = document.getElementById('activeCompany');
        if (sel) {
            sel.value = this.activeCompany;
            if (!Auth.isOwner() && Auth.getRole() !== 'accountant') {
                sel.value = this.activeCompany;
                if (this.activeCompany !== 'all') {
                    Array.from(sel.options).forEach(opt => {
                        if (opt.value !== this.activeCompany && opt.value !== 'all') {
                            opt.style.display = 'none';
                        }
                    });
                }
            }
        }

        // Hide admin nav if not superadmin/owner
        const adminNav = document.querySelector('[data-module="admin"]');
        if (adminNav && !Auth.isSuperAdmin() && !Auth.isOwner()) {
            adminNav.style.display = 'none';
        }

        this.updateCompanyBadge();
        this.updateSidebarLogo();

        // Theme
        const savedTheme = Utils.storage.get('theme', 'light');
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            const ti = document.getElementById('themeIcon');
            if (ti) ti.className = 'fas fa-sun';
        }
    },

    // ---- Navigation Visibility based on company ----
    setupNavVisibility() {
        const company = this.activeCompany;
        const navConstruction = document.getElementById('navConstruction');
        const navWellness = document.getElementById('navWellness');
        const navAutomotive = document.getElementById('navAutomotive');

        if (company === 'all') {
            navConstruction.style.display = '';
            navWellness.style.display = '';
            navAutomotive.style.display = '';
        } else {
            const type = DataStore.companies[company]?.type;
            navConstruction.style.display = (type === 'construction') ? '' : 'none';
            navWellness.style.display = (type === 'wellness') ? '' : 'none';
            navAutomotive.style.display = (type === 'automotive') ? '' : 'none';
        }
    },

    // ---- Module Navigation ----
    navigate(module) {
        if (!Auth.canAccessModule(module)) {
            this.showToast('Access denied for this module', 'error');
            return;
        }

        this.currentModule = module;

        // Update active nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.module === module);
        });

        // Update breadcrumb
        const names = {
            dashboard: 'Group Dashboard', crm: 'Customer Relationship Management',
            financial: 'Financial Management', reports: 'Reports & Analytics',
            construction: 'Project Management', jobcosting: 'Job Costing',
            subcontractors: 'Subcontractor Management',
            equipment: 'Equipment & Fleet', safety: 'Safety / QHSE',
            documents: 'Document Management',
            projectmonitoring: 'Project Monitoring & Aging',
            credits: 'Credit & Collection',
            booking: 'Booking Management', therapists: 'Therapist Management',
            pos: 'Point of Sale', membership: 'Membership Management',
            spainventory: 'Spa Inventory',
            workshop: 'Workshop Management', vehicles: 'Vehicle History',
            parts: 'Parts Inventory', inspections: 'Digital Inspections',
            estimates: 'Estimates & Quotes',
            appointments: 'Appointments',
            invoicing: 'Invoice Generator', payroll: 'Payroll & Payslips',
            inventory: 'Inventory Management',
            settings: 'Administration & Settings',
            admin: 'Admin Control Panel',
            iso: 'ISO Compliance Management',
            financialanalysis: 'Financial Analysis'
        };
        document.getElementById('breadcrumb').innerHTML = `<span class="breadcrumb-item">${names[module] || module}</span>`;

        // Render module
        const content = document.getElementById('contentArea');
        content.innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>Loading...</p></div>';

        // Slight delay for smooth transition
        setTimeout(() => {
            try {
                this.renderModule(module);
            } catch (e) {
                console.error('Module render error:', e);
                content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle" style="color:#f44336"></i><h3>Error Loading Module</h3><p>${e.message}</p><button class="btn btn-primary mt-2" onclick="App.navigate('${module}')"><i class="fas fa-redo"></i> Retry</button></div>`;
            }
        }, 100);
    },

    renderModule(module) {
        const content = document.getElementById('contentArea');
        switch (module) {
            case 'dashboard': Dashboard.render(content); break;
            case 'crm': CRM.render(content); break;
            case 'financial': Financial.render(content); break;
            case 'reports': Reports.render(content); break;
            case 'construction': Construction.render(content); break;
            case 'jobcosting': Construction.renderJobCosting(content); break;
            case 'subcontractors': Construction.renderSubcontractors(content); break;
            case 'equipment': Construction.renderEquipment(content); break;
            case 'safety': Construction.renderSafety(content); break;
            case 'documents': Construction.renderDocuments(content); break;
            case 'projectmonitoring': Construction.renderProjectMonitoring(content); break;
            case 'credits': Construction.renderCreditCollection(content); break;
            case 'booking': Wellness.renderBookings(content); break;
            case 'therapists': Wellness.renderTherapists(content); break;
            case 'pos': POS.render(content); break;
            case 'membership': Wellness.renderMembership(content); break;
            case 'spainventory': Wellness.renderSpaInventory(content); break;
            case 'workshop': Automotive.renderWorkshop(content); break;
            case 'vehicles': Automotive.renderVehicles(content); break;
            case 'parts': Automotive.renderParts(content); break;
            case 'inspections': Automotive.renderInspections(content); break;
            case 'estimates': Automotive.renderEstimates(content); break;
            case 'appointments': Automotive.renderAppointments(content); break;
            case 'invoicing': Invoicing.render(content); break;
            case 'payroll': Payroll.render(content); break;
            case 'inventory': Inventory.render(content); break;
            case 'settings': Settings.render(content); break;
            case 'admin': Admin.render(content); break;
            case 'iso': ISO.render(content); break;
            case 'financialanalysis': FinancialAnalysis.render(content); break;
            default:
                content.innerHTML = `<div class="empty-state"><i class="fas fa-tools"></i><h3>Module Not Found</h3><p>This module is under development.</p></div>`;
        }
    },

    // ---- Company Switching ----
    switchCompany(company) {
        this.activeCompany = company;
        this.setupNavVisibility();
        this.updateCompanyBadge();
        this.updateSidebarLogo();
        this.navigate(this.currentModule);
    },

    updateSidebarLogo() {
        const logo = document.getElementById('sidebarLogo');
        if (!logo) return;
        const company = this.activeCompany;
        if (company !== 'all' && DataStore.companies[company]?.logo) {
            const prefix = window.UBMS_STANDALONE ? '../' : '';
            const co = DataStore.companies[company];
            logo.style.setProperty('background', '#ffffff', 'important');
            logo.style.setProperty('border', `2px solid ${co.color}60`, 'important');
            logo.innerHTML = `<img src="${prefix}${co.logo}" alt="${co.name}">`;
        } else {
            logo.style.removeProperty('background');
            logo.style.removeProperty('border');
            logo.innerHTML = '<i class="fas fa-cubes"></i>';
        }
    },

    updateCompanyBadge() {
        const badge = document.getElementById('companyBadge');
        const company = this.activeCompany;
        const name = Utils.getCompanyName(company);
        const color = Utils.getCompanyColor(company);
        const logoPath = company !== 'all' && DataStore.companies[company]?.logo;
        if (logoPath) {
            const prefix = window.UBMS_STANDALONE ? '../' : '';
            badge.innerHTML = `<img src="${prefix}${logoPath}" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:contain;background:#fff"><span>${name}</span>`;
        } else {
            badge.innerHTML = `<i class="fas ${Utils.getCompanyIcon(company)}"></i><span>${name}</span>`;
        }
        badge.style.color = color;
        badge.style.borderColor = color + '30';
        badge.style.background = color + '12';
    },

    // ---- Sidebar ----
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth <= 1024) {
            sidebar.classList.toggle('mobile-open');
        } else {
            sidebar.classList.toggle('collapsed');
            this.sidebarCollapsed = !this.sidebarCollapsed;
        }
    },

    setupSidebarClickOutside() {
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            if (!sidebar) return;
            const toggle = document.getElementById('sidebarToggle');
            const menuBtn = document.querySelector('.topbar-menu-btn');
            // If click is inside sidebar or on the toggle buttons, ignore
            if (sidebar.contains(e.target)) return;
            if (toggle && toggle.contains(e.target)) return;
            if (menuBtn && menuBtn.contains(e.target)) return;
            // On mobile: close mobile-open
            if (window.innerWidth <= 1024 && sidebar.classList.contains('mobile-open')) {
                sidebar.classList.remove('mobile-open');
            }
            // On desktop: collapse if expanded
            if (window.innerWidth > 1024 && !sidebar.classList.contains('collapsed')) {
                sidebar.classList.add('collapsed');
                this.sidebarCollapsed = true;
            }
        });
    },

    // ---- Theme ----
    toggleTheme() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            document.getElementById('themeIcon').className = 'fas fa-moon';
            Utils.storage.set('theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.getElementById('themeIcon').className = 'fas fa-sun';
            Utils.storage.set('theme', 'dark');
        }
        // Re-render current module to update chart colors
        this.renderModule(this.currentModule);
    },

    // ---- Notifications ----
    loadNotifications() {
        const list = document.getElementById('notifList');
        const badge = document.getElementById('notifBadge');
        const unread = DataStore.notifications.filter(n => !n.read);
        badge.textContent = unread.length;
        badge.style.display = unread.length > 0 ? 'flex' : 'none';

        list.innerHTML = DataStore.notifications.map(n => `
            <div class="notif-item ${n.read ? '' : 'unread'}">
                <div class="notif-icon ${n.type}"><i class="fas ${n.icon}"></i></div>
                <div class="notif-content">
                    <h4>${n.title}</h4>
                    <p>${n.message}</p>
                    <span class="notif-time">${Utils.formatRelative(n.time)}</span>
                </div>
            </div>
        `).join('');
    },

    toggleNotifications() {
        const panel = document.getElementById('notificationPanel');
        const isOpening = !panel.classList.contains('open');
        panel.classList.toggle('open');

        if (isOpening) {
            // Close when clicking anywhere outside the panel or the bell button
            const onOutsideClick = (e) => {
                if (!panel.contains(e.target) && !e.target.closest('[onclick*="toggleNotifications"]')) {
                    panel.classList.remove('open');
                    document.removeEventListener('click', onOutsideClick, true);
                }
            };
            // Use capture so the listener fires before any other click handlers
            setTimeout(() => document.addEventListener('click', onOutsideClick, true), 0);
        }
    },

    clearNotifications() {
        DataStore.notifications.forEach(n => n.read = true);
        this.loadNotifications();
        this.showToast('All notifications cleared', 'success');
    },

    // ---- Modal ----
    openModal(title, bodyHtml, footerHtml = '', wide = false) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = bodyHtml;
        document.getElementById('modalFooter').innerHTML = footerHtml;
        document.getElementById('modalOverlay').classList.add('open');
        const container = document.getElementById('modalContainer');
        container.classList.add('open');
        if (wide) container.classList.add('wide');
        else container.classList.remove('wide');
    },

    closeModal() {
        document.getElementById('modalOverlay').classList.remove('open');
        document.getElementById('modalContainer').classList.remove('open');
    },

    // ---- Toast ----
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const icons = { success: 'fa-check-circle', warning: 'fa-exclamation-triangle', error: 'fa-times-circle', info: 'fa-info-circle' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type]} toast-icon"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    // ---- Global Search ----
    globalSearch: Utils.debounce(function(query) {
        if (!query || query.length < 2) return;

        // Search across all data
        const results = [];
        const q = query.toLowerCase();

        DataStore.customers.forEach(c => {
            if (c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)) {
                results.push({ type: 'Customer', name: c.name, module: 'crm', id: c.id });
            }
        });
        DataStore.projects.forEach(p => {
            if (p.name.toLowerCase().includes(q)) {
                results.push({ type: 'Project', name: p.name, module: 'construction', id: p.id });
            }
        });
        DataStore.vehicles.forEach(v => {
            if (v.plate.toLowerCase().includes(q) || v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q)) {
                results.push({ type: 'Vehicle', name: `${v.make} ${v.model} (${v.plate})`, module: 'vehicles', id: v.id });
            }
        });

        if (results.length > 0) {
            let html = '<div style="padding:8px"><h4 style="margin-bottom:12px">Search Results</h4>';
            results.forEach(r => {
                html += `<div class="notif-item" onclick="App.closeModal();App.navigate('${r.module}')" style="cursor:pointer">
                    <div class="notif-content"><h4>${r.name}</h4><p>${r.type} — ${r.id}</p></div>
                </div>`;
            });
            html += '</div>';
            App.openModal(`Search: "${query}"`, html);
        }
    }, 500),

    // ---- Logout ----
    logout() {
        Auth.logout();
    },

    // ---- Helper: Get filtered data by active company ----
    getFilteredData(dataArray, companyField = 'company') {
        if (this.activeCompany === 'all') return dataArray;
        return dataArray.filter(item => item[companyField] === this.activeCompany);
    }
};

// ---- Boot ----
document.addEventListener('DOMContentLoaded', () => App.init());
