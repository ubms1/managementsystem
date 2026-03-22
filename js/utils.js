/* ========================================
   UBMS - Utilities
   Format, helpers, and common functions
   ======================================== */

const Utils = {
    // ---- Currency Formatting ----
    formatCurrency(amount, compact = false) {
        if (amount === null || amount === undefined) return '₱0.00';
        if (compact && Math.abs(amount) >= 1e6) {
            return '₱' + (amount / 1e6).toFixed(1) + 'M';
        }
        if (compact && Math.abs(amount) >= 1e3) {
            return '₱' + (amount / 1e3).toFixed(1) + 'K';
        }
        return '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    // ---- Number Formatting ----
    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return num.toLocaleString('en-PH');
    },

    formatPercent(num) {
        return (num || 0).toFixed(1) + '%';
    },

    // ---- Date Formatting ----
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    formatDateTime(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    },

    formatTime(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    },

    formatRelative(dateStr) {
        if (!dateStr) return '-';
        const now = new Date();
        const d = new Date(dateStr);
        const diff = now - d;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        return Utils.formatDate(dateStr);
    },

    // ---- ID Generation ----
    generateId(prefix = 'ID') {
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
    },

    // ---- HTML Escaping ----
    escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // ---- Password Toggle Helper ----
    // Wraps a password <input> HTML string with an eye-toggle button
    pwWrap(inputHtml) {
        return `<div class="pw-toggle-wrap">${inputHtml}<button type="button" class="pw-eye-btn" onclick="Utils.togglePw(this)" title="Show password"><i class="fas fa-eye"></i></button></div>`;
    },

    togglePw(btn) {
        const input = btn.parentElement.querySelector('input');
        if (!input) return;
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
            btn.title = 'Hide password';
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
            btn.title = 'Show password';
        }
    },

    // ---- Color Helpers ----
    getCompanyColor(company) {
        const colors = {
            dheekay: '#16a085',
            kdchavit: '#2c3e50',
            nuatthai: '#FFD700',
            autocasa: '#e74c3c',
            all: '#00897b'
        };
        return colors[company] || '#00897b';
    },

    getCompanyName(company) {
        const names = {
            dheekay: 'Dheekay Builders OPC',
            kdchavit: 'KDChavit Construction',
            nuatthai: 'Nuat Thai Massage',
            autocasa: 'AutoCasa Auto Expert',
            all: 'All Companies'
        };
        return names[company] || company;
    },

    getCompanyIcon(company) {
        const icons = {
            dheekay: 'fa-hard-hat',
            kdchavit: 'fa-building',
            nuatthai: 'fa-spa',
            autocasa: 'fa-car',
            all: 'fa-cubes'
        };
        return icons[company] || 'fa-cubes';
    },

    getCompanyBadgeClass(company) {
        return `badge-${company}`;
    },

    getStatusClass(status) {
        const map = {
            active: 'badge-success', completed: 'badge-info', pending: 'badge-warning',
            overdue: 'badge-danger', cancelled: 'badge-neutral',
            'in-progress': 'badge-teal', 'on-hold': 'badge-warning',
            open: 'badge-info', closed: 'badge-neutral',
            paid: 'badge-success', unpaid: 'badge-danger', partial: 'badge-warning',
            approved: 'badge-success', rejected: 'badge-danger', draft: 'badge-neutral',
            scheduled: 'badge-info', confirmed: 'badge-success',
            'no-show': 'badge-danger', 'checked-in': 'badge-teal'
        };
        return map[status?.toLowerCase()] || 'badge-neutral';
    },

    // ---- Chart Helpers ----
    chartColors: {
        primary: ['#00897b', '#26a69a', '#4db6ac', '#80cbc4', '#b2dfdb'],
        companies: ['#16a085', '#2c3e50', '#FFD700', '#e74c3c'],
        rainbow: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'],
        gradients: {
            teal: (ctx) => {
                const g = ctx.createLinearGradient(0, 0, 0, 300);
                g.addColorStop(0, 'rgba(0,137,123,0.3)');
                g.addColorStop(1, 'rgba(0,137,123,0.01)');
                return g;
            }
        }
    },

    destroyChart(chartId) {
        const existing = Chart.getChart(chartId);
        if (existing) existing.destroy();
    },

    // ---- DOM Helpers ----
    $(selector) {
        return document.querySelector(selector);
    },

    $$(selector) {
        return document.querySelectorAll(selector);
    },

    createElement(tag, attrs = {}, children = '') {
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) => {
            if (k === 'className') el.className = v;
            else if (k === 'innerHTML') el.innerHTML = v;
            else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
            else el.setAttribute(k, v);
        });
        if (typeof children === 'string') el.innerHTML = children;
        return el;
    },

    // ---- Storage Helpers ----
    storage: {
        get(key, defaultValue = null) {
            try {
                const val = localStorage.getItem(`ubms_${key}`);
                return val ? JSON.parse(val) : defaultValue;
            } catch { return defaultValue; }
        },
        set(key, value) {
            localStorage.setItem(`ubms_${key}`, JSON.stringify(value));
        },
        remove(key) {
            localStorage.removeItem(`ubms_${key}`);
        }
    },

    // ---- Table Builder ----
    buildTable(columns, data, options = {}) {
        let html = '<div class="table-wrapper"><table class="data-table"><thead><tr>';
        columns.forEach(col => {
            html += `<th>${col.label}</th>`;
        });
        if (options.actions) html += '<th>Actions</th>';
        html += '</tr></thead><tbody>';

        if (!data || data.length === 0) {
            html += `<tr><td colspan="${columns.length + (options.actions ? 1 : 0)}" class="text-center text-muted" style="padding:40px">No records found</td></tr>`;
        } else {
            data.forEach((row, idx) => {
                html += '<tr>';
                columns.forEach(col => {
                    const val = col.render ? col.render(row, idx) : (row[col.key] || '-');
                    html += `<td>${val}</td>`;
                });
                if (options.actions) {
                    html += `<td>${options.actions(row, idx)}</td>`;
                }
                html += '</tr>';
            });
        }
        html += '</tbody></table></div>';
        return html;
    },

    // ---- Debounce ----
    debounce(fn, delay = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    // ---- Random data for demo ----
    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    randomFromArray(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
};
