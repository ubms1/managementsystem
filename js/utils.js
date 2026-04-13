/* ========================================
   UBMS - Utilities
   Format, helpers, and common functions
   ======================================== */

const Utils = {
    // ---- Safe number coercion (prevents NaN across the system) ----
    safeNum(val) {
        if (val === null || val === undefined || val === '') return 0;
        const n = typeof val === 'string' ? parseFloat(val) : Number(val);
        return isNaN(n) || !isFinite(n) ? 0 : n;
    },

    // ---- Currency Formatting ----
    formatCurrency(amount, compact = false) {
        const n = this.safeNum(amount);
        if (compact && Math.abs(n) >= 1e6) {
            return '₱' + (n / 1e6).toFixed(1) + 'M';
        }
        if (compact && Math.abs(n) >= 1e3) {
            return '₱' + (n / 1e3).toFixed(1) + 'K';
        }
        return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    // ---- Number Formatting ----
    formatNumber(num) {
        const n = this.safeNum(num);
        return n.toLocaleString('en-PH');
    },

    formatPercent(num) {
        return this.safeNum(num).toFixed(1) + '%';
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
    },

    // ---- Searchable Dropdown ----
    initCoopDropdown(inputId, options = {}) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const coops = DataStore.electricCooperatives || [];
        const wrap = document.createElement('div');
        wrap.className = 'search-dropdown-wrap';
        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);
        const arrow = document.createElement('span');
        arrow.className = 'sd-arrow';
        arrow.innerHTML = '<i class="fas fa-chevron-down"></i>';
        wrap.appendChild(arrow);
        const list = document.createElement('div');
        list.className = 'search-dropdown-list';
        list.id = inputId + '_dropdown';
        wrap.appendChild(list);
        let activeIdx = -1;

        const renderList = (filter = '') => {
            const q = filter.toLowerCase();
            const filtered = q
                ? coops.filter(c => c.abbr.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.region.toLowerCase().includes(q) || c.province.toLowerCase().includes(q))
                : coops;
            if (filtered.length === 0) {
                list.innerHTML = '<div class="sd-empty"><i class="fas fa-search" style="margin-right:6px"></i>No matching cooperative found</div>';
                list.classList.add('open');
                activeIdx = -1;
                return;
            }
            const grouped = {};
            filtered.forEach(c => {
                if (!grouped[c.region]) grouped[c.region] = [];
                grouped[c.region].push(c);
            });
            let html = '';
            let idx = 0;
            Object.keys(grouped).forEach(region => {
                html += '<div class="sd-group-label">' + Utils.escapeHtml(region) + '</div>';
                grouped[region].forEach(c => {
                    html += '<div class="sd-item" data-idx="' + idx + '" data-abbr="' + Utils.escapeHtml(c.abbr) + '" data-region="' + Utils.escapeHtml(c.region) + '" data-province="' + Utils.escapeHtml(c.province) + '">'
                        + '<span class="sd-abbr">' + Utils.escapeHtml(c.abbr) + '</span>'
                        + '<span class="sd-name">' + Utils.escapeHtml(c.name) + '</span>'
                        + '<span class="sd-region">' + Utils.escapeHtml(c.province) + '</span>'
                        + '</div>';
                    idx++;
                });
            });
            list.innerHTML = html;
            list.classList.add('open');
            activeIdx = -1;
        };

        const selectItem = (el) => {
            input.value = el.dataset.abbr;
            list.classList.remove('open');
            if (options.onSelect) {
                options.onSelect({
                    abbr: el.dataset.abbr,
                    region: el.dataset.region,
                    province: el.dataset.province
                });
            }
        };

        input.addEventListener('focus', () => renderList(input.value));
        input.addEventListener('input', () => renderList(input.value));
        input.addEventListener('keydown', (e) => {
            const items = list.querySelectorAll('.sd-item');
            if (!items.length) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIdx = Math.min(activeIdx + 1, items.length - 1);
                items.forEach(i => i.classList.remove('active'));
                items[activeIdx].classList.add('active');
                items[activeIdx].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIdx = Math.max(activeIdx - 1, 0);
                items.forEach(i => i.classList.remove('active'));
                items[activeIdx].classList.add('active');
                items[activeIdx].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter' && activeIdx >= 0) {
                e.preventDefault();
                selectItem(items[activeIdx]);
            } else if (e.key === 'Escape') {
                list.classList.remove('open');
            }
        });

        list.addEventListener('mousedown', (e) => {
            const item = e.target.closest('.sd-item');
            if (item) { e.preventDefault(); selectItem(item); }
        });

        document.addEventListener('click', (e) => {
            if (!wrap.contains(e.target)) list.classList.remove('open');
        });
    }
};
