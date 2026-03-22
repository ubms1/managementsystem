/* ========================================
   UBMS — Universal Point of Sale (POS)
   Adapts per company type: Wellness · Construction · Automotive
   ======================================== */

const POS = {
    cart: [],

    getCompanyType() {
        const c = App.activeCompany;
        if (c === 'nuatthai') return 'wellness';
        if (c === 'autocasa') return 'automotive';
        if (c === 'dheekay' || c === 'kdchavit') return 'construction';
        return 'all';
    },

    getProducts() {
        const type = this.getCompanyType();
        if (type === 'wellness') return DataStore.spaServices.map(s => ({
            id: s.id, name: s.name, price: s.price, category: s.category,
            desc: s.description || '', duration: s.duration, unit: 'service'
        }));
        if (type === 'automotive') return [
            ...DataStore.autoServices.map(s => ({
                id: s.id, name: s.name, price: s.price, category: s.category,
                desc: `${s.duration} min`, duration: s.duration, unit: 'service'
            })),
            ...DataStore.autoParts.map(p => ({
                id: p.id, name: p.name, price: p.price, category: 'Parts',
                desc: `SKU: ${p.sku} | Stock: ${p.quantity}`, unit: 'item', stock: p.quantity
            }))
        ];
        if (type === 'construction') return [
            ...(DataStore.inventoryItems || []).filter(i =>
                i.company === App.activeCompany || App.activeCompany === 'all'
            ).map(i => ({
                id: i.id, name: i.name, price: i.unitPrice || i.price || 0, category: i.category || 'Material',
                desc: `Stock: ${i.quantity || 0} ${i.unit || 'pcs'}`, unit: i.unit || 'pcs', stock: i.quantity || 0
            })),
            { id: 'CS-001', name: 'Site Consultation', price: 5000, category: 'Service', desc: 'On-site inspection & assessment', unit: 'service' },
            { id: 'CS-002', name: 'Design & Planning Fee', price: 15000, category: 'Service', desc: 'Architectural/engineering plan', unit: 'service' },
            { id: 'CS-003', name: 'Labor — Skilled Worker (day)', price: 800, category: 'Labor', desc: 'Per day rate', unit: 'day' },
            { id: 'CS-004', name: 'Labor — Helper (day)', price: 500, category: 'Labor', desc: 'Per day rate', unit: 'day' },
            { id: 'CS-005', name: 'Equipment Rental (day)', price: 3500, category: 'Equipment', desc: 'Heavy equipment daily rate', unit: 'day' }
        ];
        // All view — show combined
        return [
            ...DataStore.spaServices.map(s => ({ id: s.id, name: s.name, price: s.price, category: `Spa: ${s.category}`, desc: s.description || '', unit: 'service' })),
            ...DataStore.autoServices.map(s => ({ id: s.id, name: s.name, price: s.price, category: `Auto: ${s.category}`, desc: `${s.duration} min`, unit: 'service' }))
        ];
    },

    getCustomers() {
        const c = App.activeCompany;
        if (c === 'all') return DataStore.customers;
        return DataStore.customers.filter(cust => cust.companies?.includes(c));
    },

    getCompanyLabel() {
        const type = this.getCompanyType();
        if (type === 'wellness') return { icon: 'fa-spa', color: 'var(--secondary)', label: 'Nuat Thai POS' };
        if (type === 'automotive') return { icon: 'fa-car', color: '#e74c3c', label: 'AutoCasa POS' };
        if (type === 'construction') return { icon: 'fa-hard-hat', color: '#16a085', label: `${DataStore.companies[App.activeCompany]?.name || 'Construction'} POS` };
        return { icon: 'fa-cash-register', color: 'var(--secondary)', label: 'Universal POS' };
    },

    render(container) {
        const products = this.getProducts();
        const customers = this.getCustomers();
        const label = this.getCompanyLabel();
        const categories = [...new Set(products.map(p => p.category))];
        const txns = this.getTransactions();
        const todayTotal = txns.filter(t => t.date === new Date().toISOString().split('T')[0]).reduce((s, t) => s + (t.total || 0), 0);

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon teal"><i class="fas fa-cash-register"></i></div></div>
                <div class="stat-value">${txns.length}</div><div class="stat-label">Total Transactions</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-peso-sign"></i></div></div>
                <div class="stat-value">${Utils.formatCurrency(todayTotal)}</div><div class="stat-label">Today's Sales</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-shopping-cart"></i></div></div>
                <div class="stat-value">${this.cart.length}</div><div class="stat-label">Cart Items</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas ${label.icon}"></i></div></div>
                <div class="stat-value">${products.length}</div><div class="stat-label">Products/Services</div></div>
        </div>

        <div class="grid-2" style="gap:24px;grid-template-columns:1fr 380px">
            <div>
                <div class="card mb-2">
                    <div class="card-header"><h3><i class="fas ${label.icon}" style="color:${label.color};margin-right:8px"></i>${label.label}</h3>
                        <div style="display:flex;gap:6px">
                            <select class="form-control" id="posCatFilter" onchange="POS.filterProducts()" style="width:auto;min-width:100px">
                                <option value="all">All Categories</option>
                                ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                            </select>
                            <input type="text" class="form-control" id="posSearch" placeholder="Search..." oninput="POS.filterProducts()" style="width:160px">
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="grid-2" style="gap:10px" id="posProductGrid">
                            ${this.buildProductCards(products)}
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header"><h3><i class="fas fa-history"></i> Recent Transactions</h3></div>
                    <div class="card-body no-padding">
                        ${txns.length === 0 ? '<div class="empty-state"><i class="fas fa-receipt"></i><h3>No transactions yet</h3></div>' :
                        [...txns].reverse().slice(0, 10).map(t => `
                            <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
                                <div>
                                    <strong>${t.id}</strong>
                                    <div style="font-size:12px;color:var(--text-muted)">${t.date} — ${t.customer || 'Walk-in'} — ${t.payment?.toUpperCase()}</div>
                                </div>
                                <strong style="color:var(--success)">${Utils.formatCurrency(t.total)}</strong>
                            </div>`).join('')}
                    </div>
                </div>
            </div>

            <!-- Cart Sidebar -->
            <div>
                <div class="card" style="position:sticky;top:80px">
                    <div class="card-header" style="background:var(--primary);color:#fff"><h3><i class="fas fa-receipt" style="margin-right:8px"></i>Current Transaction</h3></div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>Customer</label>
                            <select class="form-control" id="posClient">
                                <option value="">Walk-in</option>
                                ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <hr style="margin:12px 0;border-color:var(--border)">
                        <div id="posCartItems" style="min-height:80px">${this.buildCartHTML()}</div>
                        <hr style="margin:12px 0;border-color:var(--border)">
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px"><span>Subtotal</span><span id="posSubtotal">${Utils.formatCurrency(this.getCartTotal())}</span></div>
                        <div class="form-row" style="margin-bottom:4px">
                            <div class="form-group" style="margin:0"><label style="font-size:12px">Discount (%)</label><input type="number" class="form-control" id="posDiscount" value="0" min="0" max="100" onchange="POS.updateCartTotals()"></div>
                            <div class="form-group" style="margin:0"><label style="font-size:12px">VAT (12%)</label><input type="number" class="form-control" id="posVAT" value="12" min="0" max="100" onchange="POS.updateCartTotals()"></div>
                        </div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px;color:var(--danger)"><span>Discount</span><span id="posDiscountAmt">-₱0.00</span></div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px"><span>VAT</span><span id="posVATAmt">₱0.00</span></div>
                        <div style="display:flex;justify-content:space-between;font-size:20px;font-weight:700;margin-bottom:16px">
                            <span>Total</span>
                            <span id="posTotal" style="color:var(--secondary)">${Utils.formatCurrency(0)}</span>
                        </div>
                        <div class="form-group">
                            <label>Payment Method</label>
                            <select class="form-control" id="posPayment">
                                <option value="cash">Cash</option>
                                <option value="gcash">GCash</option>
                                <option value="card">Credit/Debit Card</option>
                                <option value="maya">Maya</option>
                                <option value="bank-transfer">Bank Transfer</option>
                                <option value="check">Check</option>
                            </select>
                        </div>
                        <button class="btn btn-primary btn-lg" style="width:100%" onclick="POS.processPayment()" id="posProceedBtn" ${this.cart.length === 0 ? 'disabled' : ''}>
                            <i class="fas fa-cash-register" style="margin-right:8px"></i>Process Payment
                        </button>
                        <button class="btn btn-secondary btn-sm" style="width:100%;margin-top:8px" onclick="POS.clearCart()">
                            <i class="fas fa-times" style="margin-right:4px"></i>Clear Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

        this.updateCartTotals();
    },

    buildProductCards(products) {
        if (products.length === 0) return '<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--text-muted)">No products available</div>';
        return products.map(p => `
            <div class="card pos-product-card" style="cursor:pointer;transition:all 0.2s" onclick="POS.addToCart('${p.id}')" data-category="${p.category}" data-name="${p.name.toLowerCase()}">
                <div class="card-body" style="padding:14px">
                    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
                        <strong style="font-size:13px;flex:1">${p.name}</strong>
                        <span class="badge-tag badge-neutral" style="font-size:11px;white-space:nowrap">${p.category}</span>
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${p.desc}</div>
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <span style="font-size:11px;color:var(--text-muted)">${p.unit}</span>
                        <span style="font-size:16px;font-weight:700;color:var(--secondary)">${Utils.formatCurrency(p.price)}</span>
                    </div>
                </div>
            </div>`).join('');
    },

    filterProducts() {
        const cat = document.getElementById('posCatFilter')?.value || 'all';
        const search = (document.getElementById('posSearch')?.value || '').toLowerCase();
        document.querySelectorAll('.pos-product-card').forEach(card => {
            const matchCat = cat === 'all' || card.dataset.category === cat;
            const matchSearch = !search || card.dataset.name.includes(search);
            card.style.display = matchCat && matchSearch ? '' : 'none';
        });
    },

    addToCart(productId) {
        const products = this.getProducts();
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const existing = this.cart.find(i => i.id === productId);
        if (existing) {
            if (product.stock !== undefined && existing.qty >= product.stock) {
                App.showToast('Insufficient stock', 'error');
                return;
            }
            existing.qty++;
        } else {
            this.cart.push({ id: productId, name: product.name, price: product.price, qty: 1, unit: product.unit });
        }
        this.updateCartUI();
    },

    removeFromCart(productId) {
        this.cart = this.cart.filter(i => i.id !== productId);
        this.updateCartUI();
    },

    updateQty(productId, delta) {
        const item = this.cart.find(i => i.id === productId);
        if (!item) return;
        item.qty = Math.max(1, item.qty + delta);
        this.updateCartUI();
    },

    updateCartUI() {
        const el = document.getElementById('posCartItems');
        if (el) el.innerHTML = this.buildCartHTML();
        this.updateCartTotals();
        const btn = document.getElementById('posProceedBtn');
        if (btn) btn.disabled = this.cart.length === 0;
    },

    buildCartHTML() {
        if (this.cart.length === 0) {
            return '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px"><i class="fas fa-shopping-basket" style="font-size:24px;margin-bottom:8px;display:block"></i>No items in cart</div>';
        }
        return this.cart.map(i => `
            <div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
                <div style="flex:1">
                    <div style="font-weight:500;font-size:13px">${i.name}</div>
                    <div style="font-size:12px;color:var(--text-muted)">${Utils.formatCurrency(i.price)} × ${i.qty}</div>
                </div>
                <div style="display:flex;align-items:center;gap:4px">
                    <button class="btn btn-sm btn-secondary" onclick="POS.updateQty('${i.id}',-1)" style="padding:2px 6px">-</button>
                    <span style="min-width:20px;text-align:center;font-weight:600">${i.qty}</span>
                    <button class="btn btn-sm btn-secondary" onclick="POS.updateQty('${i.id}',1)" style="padding:2px 6px">+</button>
                    <strong style="min-width:60px;text-align:right">${Utils.formatCurrency(i.price * i.qty)}</strong>
                    <button class="btn btn-sm btn-danger" onclick="POS.removeFromCart('${i.id}')" style="padding:2px 6px"><i class="fas fa-times"></i></button>
                </div>
            </div>`).join('');
    },

    getCartTotal() {
        return this.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    },

    updateCartTotals() {
        const subtotal = this.getCartTotal();
        const discPct = parseFloat(document.getElementById('posDiscount')?.value || 0);
        const vatPct = parseFloat(document.getElementById('posVAT')?.value || 12);
        const disc = subtotal * (discPct / 100);
        const afterDisc = subtotal - disc;
        const vat = afterDisc * (vatPct / 100);
        const total = afterDisc + vat;

        const s = document.getElementById('posSubtotal');
        const d = document.getElementById('posDiscountAmt');
        const v = document.getElementById('posVATAmt');
        const t = document.getElementById('posTotal');
        if (s) s.textContent = Utils.formatCurrency(subtotal);
        if (d) d.textContent = `-${Utils.formatCurrency(disc)}`;
        if (v) v.textContent = Utils.formatCurrency(vat);
        if (t) t.textContent = Utils.formatCurrency(total);
    },

    clearCart() {
        this.cart = [];
        this.updateCartUI();
    },

    getTransactions() {
        const txns = DataStore.posTransactions || [];
        if (App.activeCompany === 'all') return txns;
        return txns.filter(t => t.company === App.activeCompany);
    },

    processPayment() {
        if (this.cart.length === 0) return;

        const subtotal = this.getCartTotal();
        const discPct = parseFloat(document.getElementById('posDiscount')?.value || 0);
        const vatPct = parseFloat(document.getElementById('posVAT')?.value || 12);
        const disc = subtotal * (discPct / 100);
        const afterDisc = subtotal - disc;
        const vat = afterDisc * (vatPct / 100);
        const total = afterDisc + vat;

        const customerId = document.getElementById('posClient')?.value || '';
        const customer = customerId ? DataStore.customers.find(c => c.id === customerId) : null;
        const method = document.getElementById('posPayment')?.value || 'cash';

        const txn = {
            id: Utils.generateId('POS'),
            company: App.activeCompany === 'all' ? 'dheekay' : App.activeCompany,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
            customer: customer?.name || 'Walk-in',
            customerId: customerId || null,
            items: [...this.cart],
            subtotal, discount: disc, discountPct: discPct, vat, vatPct, total,
            payment: method,
            createdAt: new Date().toISOString()
        };

        if (!DataStore.posTransactions) DataStore.posTransactions = [];
        DataStore.posTransactions.push(txn);

        // Deduct inventory for parts/materials
        this.cart.forEach(item => {
            const part = DataStore.autoParts.find(p => p.id === item.id);
            if (part) part.quantity = Math.max(0, part.quantity - item.qty);
            const invItem = (DataStore.inventoryItems || []).find(p => p.id === item.id);
            if (invItem) invItem.quantity = Math.max(0, invItem.quantity - item.qty);
        });

        // Create matching invoice
        Database.addInvoice({
            customer: customer?.name || 'Walk-in',
            customerId: customerId || null,
            company: txn.company,
            items: this.cart.map(i => ({
                description: i.name, quantity: i.qty, rate: i.price, amount: i.price * i.qty
            })),
            subtotal, tax: vat, discount: disc, total,
            status: 'paid',
            paymentMethod: method,
            type: 'pos-receipt',
            notes: `POS Transaction ${txn.id}`
        });

        Database.save();

        this.cart = [];
        App.showToast(`Payment of ${Utils.formatCurrency(total)} via ${method.toUpperCase()} processed!`, 'success');
        this.render(document.getElementById('contentArea'));
    }
};
