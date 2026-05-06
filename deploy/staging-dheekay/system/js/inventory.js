/* ========================================
   UBMS - Inventory In/Out with Scanner
   Barcode/QR via keyboard wedge mode
   Transformer types: Silicon & Amorphous
   ======================================== */

const Inventory = {
    scanBuffer: '',
    scanTimeout: null,

    // Permission helper — allows owner, superadmin, manager, admin to manage inventory
    canManageInventory() {
        const role = Auth.getRole ? Auth.getRole() : (Auth.session?.role || '');
        return ['superadmin', 'owner', 'manager', 'admin'].includes(role);
    },

    // ============================================================
    //  RENDER MAIN VIEW
    // ============================================================
    render(container) {
        const items = this.getFilteredItems();
        const transactions = this.getFilteredTransactions();
        const totalItems = items.length;
        const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);
        const lowStock = items.filter(i => i.quantity <= (i.reorderLevel || 5));
        const todayTx = transactions.filter(t => t.date === new Date().toISOString().split('T')[0]);
        const transformers = items.filter(i => i.category === 'Transformers');

        const companyType = App.activeCompany !== 'all' ? DataStore.companies[App.activeCompany]?.type : null;
        const categories = companyType ? (DataStore.inventoryCategories[companyType] || []) : Object.values(DataStore.inventoryCategories).flat();

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon teal"><i class="fas fa-boxes-stacked"></i></div></div><div class="stat-value">${totalItems}</div><div class="stat-label">Inventory Items</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-cubes"></i></div></div><div class="stat-value">${Utils.formatNumber(totalQty)}</div><div class="stat-label">Total Quantity</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-exclamation-triangle"></i></div></div><div class="stat-value">${lowStock.length}</div><div class="stat-label">Low Stock Alerts</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-bolt"></i></div></div><div class="stat-value">${transformers.length}</div><div class="stat-label">Transformers</div></div>
        </div>

        <!-- Scanner Bar -->
        <div class="card mb-3">
            <div class="card-body" style="padding:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:200px">
                    <i class="fas fa-barcode" style="font-size:24px;color:var(--primary)"></i>
                    <input type="text" class="form-control" id="scannerInput" style="flex:1;font-size:16px;font-family:monospace"
                        placeholder="Scan barcode / QR code or type item code here..."
                        onkeydown="Inventory.handleScanInput(event)"
                        autocomplete="off">
                </div>
                <button class="btn btn-success" onclick="Inventory.processStockIn()" title="Stock In"><i class="fas fa-arrow-down"></i> Stock In</button>
                <button class="btn btn-warning" onclick="Inventory.processStockOut()" title="Stock Out"><i class="fas fa-arrow-up"></i> Stock Out</button>
                ${this.canManageInventory() ? '<button class="btn btn-primary" onclick="Inventory.openAddItem()"><i class="fas fa-plus"></i> New Item</button>' : ''}
                ${this.canManageInventory() ? '<button class="btn btn-info" onclick="Inventory.openAddTransformer()"><i class="fas fa-bolt"></i> Add Transformer</button>' : ''}
            </div>
        </div>

        ${lowStock.length > 0 ? `
        <div class="card mb-3" style="border-left:4px solid var(--danger)">
            <div class="card-header"><h3 style="color:var(--danger)"><i class="fas fa-exclamation-triangle"></i> Low Stock Alerts</h3></div>
            <div class="card-body no-padding">
                ${lowStock.map(i => `
                    <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
                        <div><strong>${i.name}</strong> <span style="font-size:12px;color:var(--text-muted)">(${i.code || i.id})</span></div>
                        <div><span class="badge-tag badge-danger">${i.quantity} left</span> <span style="font-size:12px;color:var(--text-muted)">min: ${i.reorderLevel || 5}</span></div>
                    </div>
                `).join('')}
            </div>
        </div>` : ''}

        <!-- Transformer Inventory Section -->
        ${transformers.length > 0 ? `
        <div class="card mb-3" style="border-left:4px solid #3b82f6">
            <div class="card-header">
                <h3><i class="fas fa-bolt" style="color:#3b82f6"></i> Transformer Inventory</h3>
                <div style="display:flex;gap:8px">
                    <select class="form-control" style="width:140px" id="xfmrTypeFilter" onchange="Inventory.filterTransformers()">
                        <option value="all">All Types</option>
                        ${(DataStore.transformerTypes || []).map(t => '<option value="' + t + '">' + t + '</option>').join('')}
                    </select>
                    <select class="form-control" style="width:140px" id="xfmrRatingFilter" onchange="Inventory.filterTransformers()">
                        <option value="all">All Ratings</option>
                        ${(DataStore.transformerRatings || []).map(r => '<option value="' + r + '">' + r + '</option>').join('')}
                    </select>
                </div>
            </div>
            <div class="card-body no-padding" id="transformerList">
                ${this.buildTransformerList(transformers)}
            </div>
        </div>` : ''}

        <div class="grid-2" style="gap:20px">
            <!-- Items List -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-box"></i> Inventory Items</h3>
                    <div style="display:flex;gap:8px">
                        <select class="form-control" style="width:150px" id="invCatFilter" onchange="Inventory.filterItems()">
                            <option value="all">All Categories</option>
                            ${[...new Set(categories)].map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                        <input type="text" class="form-control" style="width:150px" placeholder="Search..." id="invSearchFilter" oninput="Inventory.filterItems()">
                    </div>
                </div>
                <div class="card-body no-padding" id="inventoryItemList">
                    ${this.buildItemList(items)}
                </div>
            </div>

            <!-- Recent Transactions -->
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-history"></i> Recent Transactions</h3></div>
                <div class="card-body no-padding" id="inventoryTxList">
                    ${this.buildTransactionList(transactions)}
                </div>
            </div>
        </div>`;

        // Focus scanner input
        setTimeout(() => document.getElementById('scannerInput')?.focus(), 200);
    },

    getFilteredItems() {
        return App.activeCompany === 'all' ? DataStore.inventoryItems : DataStore.inventoryItems.filter(i => i.company === App.activeCompany);
    },

    getFilteredTransactions() {
        return App.activeCompany === 'all' ? DataStore.inventoryTransactions : DataStore.inventoryTransactions.filter(t => t.company === App.activeCompany);
    },

    buildItemList(items) {
        if (items.length === 0) return '<div class="empty-state"><i class="fas fa-box-open"></i><h3>No Items</h3><p>Add inventory items or scan barcodes.</p></div>';
        return items.map(i => `
            <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
                <div>
                    <strong>${i.name}</strong>
                    <div style="font-size:12px;color:var(--text-muted)">${i.code || i.id} — ${i.category || 'Uncategorized'} — ${i.unit || 'pcs'}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    <span class="badge-tag ${i.quantity <= (i.reorderLevel || 5) ? 'badge-danger' : i.quantity <= (i.reorderLevel || 5) * 2 ? 'badge-warning' : 'badge-success'}">${i.quantity} ${i.unit || 'pcs'}</span>
                    <button class="btn btn-sm btn-secondary" onclick="Inventory.viewItem('${i.id}')" title="Details"><i class="fas fa-eye"></i></button>
                </div>
            </div>
        `).join('');
    },

    buildTransactionList(transactions) {
        if (transactions.length === 0) return '<div class="empty-state"><i class="fas fa-exchange-alt"></i><h3>No Transactions</h3><p>Stock in/out to see history.</p></div>';
        const sorted = [...transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return sorted.slice(0, 30).map(t => `
            <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
                <div>
                    <strong>${t.itemName || t.itemId}</strong>
                    <div style="font-size:12px;color:var(--text-muted)">${t.date} — ${t.reference || ''}</div>
                </div>
                <div style="text-align:right">
                    <span class="badge-tag ${t.type === 'in' ? 'badge-success' : 'badge-danger'}">${t.type === 'in' ? '+' : '-'}${t.quantity} ${t.unit || ''}</span>
                    <div style="font-size:11px;color:var(--text-muted)">${t.reason || ''}</div>
                </div>
            </div>
        `).join('');
    },

    filterItems() {
        const cat = document.getElementById('invCatFilter')?.value || 'all';
        const search = (document.getElementById('invSearchFilter')?.value || '').toLowerCase();
        let items = this.getFilteredItems();
        if (cat !== 'all') items = items.filter(i => i.category === cat);
        if (search) items = items.filter(i => i.name.toLowerCase().includes(search) || (i.code || '').toLowerCase().includes(search));
        document.getElementById('inventoryItemList').innerHTML = this.buildItemList(items);
    },

    // ============================================================
    //  TRANSFORMER HELPERS
    // ============================================================
    buildTransformerList(transformers) {
        if (transformers.length === 0) return '<div class="empty-state"><i class="fas fa-bolt"></i><h3>No Transformers</h3><p>Add transformer inventory items.</p></div>';
        return `<table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#f8fafc">
                <th style="padding:10px 16px;text-align:left;font-size:11px;text-transform:uppercase;color:var(--text-muted)">Name</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:var(--text-muted)">Type</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:var(--text-muted)">Rating</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:var(--text-muted)">Qty</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:var(--text-muted)">Project</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:var(--text-muted)">Actions</th>
            </tr></thead>
            <tbody>${transformers.map(i => {
                const proj = i.projectId ? DataStore.projects.find(p => p.id === i.projectId) : null;
                const typeColor = (i.transformerType || '').toLowerCase() === 'silicon' ? '#8b5cf6' : '#f59e0b';
                return `<tr style="border-bottom:1px solid var(--border)">
                    <td style="padding:10px 16px"><strong>${i.name}</strong><div style="font-size:11px;color:var(--text-muted)">${i.code || i.id}</div></td>
                    <td style="padding:10px 12px"><span class="badge-tag" style="background:${typeColor}20;color:${typeColor}">${i.transformerType || '-'}</span></td>
                    <td style="padding:10px 12px;font-weight:600">${i.transformerRating || '-'}</td>
                    <td style="padding:10px 12px;text-align:center"><span class="badge-tag ${i.quantity <= (i.reorderLevel || 2) ? 'badge-danger' : 'badge-success'}">${i.quantity}</span></td>
                    <td style="padding:10px 12px;font-size:12px">${proj ? '<a href="#" onclick="Construction.viewProject(\'' + proj.id + '\');return false" style="color:var(--secondary)">' + proj.name + '</a>' : '<span style="color:var(--text-muted)">Unassigned</span>'}</td>
                    <td style="padding:10px 12px;text-align:center">
                        <button class="btn btn-sm btn-secondary" onclick="Inventory.viewItem('${i.id}')" title="Details"><i class="fas fa-eye"></i></button>
                        ${this.canManageInventory() ? '<button class="btn btn-sm btn-info" onclick="Inventory.editItem(\'' + i.id + '\')" title="Edit"><i class="fas fa-edit"></i></button>' : ''}
                    </td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;
    },

    filterTransformers() {
        const type = document.getElementById('xfmrTypeFilter')?.value || 'all';
        const rating = document.getElementById('xfmrRatingFilter')?.value || 'all';
        let transformers = this.getFilteredItems().filter(i => i.category === 'Transformers');
        if (type !== 'all') transformers = transformers.filter(i => i.transformerType === type);
        if (rating !== 'all') transformers = transformers.filter(i => i.transformerRating === rating);
        const el = document.getElementById('transformerList');
        if (el) el.innerHTML = this.buildTransformerList(transformers);
    },

    // ============================================================
    //  ADD TRANSFORMER (Dedicated Form)
    // ============================================================
    openAddTransformer() {
        if (!this.canManageInventory()) { App.showToast('Insufficient permissions', 'error'); return; }
        const company = App.activeCompany !== 'all' ? App.activeCompany : 'dheekay';
        const companies = App.activeCompany === 'all'
            ? Object.values(DataStore.companies).filter(c => c.type === 'construction').map(c => `<option value="${c.id}">${c.name}</option>`).join('')
            : `<option value="${company}" selected>${DataStore.companies[company]?.name || company}</option>`;
        const types = (DataStore.transformerTypes || ['Silicon', 'Amorphous']).map(t => `<option value="${t}">${t}</option>`).join('');
        const ratings = (DataStore.transformerRatings || []).map(r => `<option value="${r}">${r}</option>`).join('');
        const projects = DataStore.projects.filter(p => {
            if (App.activeCompany === 'all') return true;
            return p.company === App.activeCompany;
        }).map(p => `<option value="${p.id}">${p.name}</option>`).join('');

        App.openModal('Add Transformer', `
        <form>
            <div class="form-row">
                <div class="form-group"><label>Transformer Type *</label>
                    <select class="form-control" id="xfmrType" onchange="Inventory.autoFillTransformerName()">${types}</select>
                </div>
                <div class="form-group"><label>Rating (KVA) *</label>
                    <select class="form-control" id="xfmrRating" onchange="Inventory.autoFillTransformerName()">${ratings}</select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Item Name</label><input type="text" class="form-control" id="invItemName" value="Silicon Transformer 10 KVA" readonly style="background:#f8fafc"></div>
                <div class="form-group"><label>Item Code</label><input type="text" class="form-control" id="invItemCode" value="" readonly style="background:#f8fafc"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Company *</label>
                    <select class="form-control" id="invItemCompany">${companies}</select>
                </div>
                <div class="form-group"><label>Assign to Project</label>
                    <select class="form-control" id="xfmrProject">
                        <option value="">— No Project —</option>
                        ${projects}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Phase</label>
                    <select class="form-control" id="xfmrPhase">
                        <option value="Single Phase">Single Phase</option>
                        <option value="Three Phase">Three Phase</option>
                    </select>
                </div>
                <div class="form-group"><label>Voltage</label><input type="text" class="form-control" id="xfmrVoltage" value="13.8kV / 240V-120V" placeholder="e.g. 13.8kV / 240V-120V"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Quantity</label><input type="number" class="form-control" id="invItemQty" value="1" min="0"></div>
                <div class="form-group"><label>Unit Cost (₱)</label><input type="number" class="form-control" id="invItemCost" value="0" min="0" step="0.01"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Storage Location</label><input type="text" class="form-control" id="invItemLocation" placeholder="e.g. Warehouse A"></div>
                <div class="form-group"><label>Serial Number</label><input type="text" class="form-control" id="xfmrSerial" placeholder="Optional serial number"></div>
            </div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Inventory.saveTransformer()"><i class="fas fa-bolt"></i> Save Transformer</button>
        `);
        this.autoFillTransformerName();
    },

    autoFillTransformerName() {
        const type = document.getElementById('xfmrType')?.value || 'Silicon';
        const rating = document.getElementById('xfmrRating')?.value || '10 KVA';
        const nameEl = document.getElementById('invItemName');
        const codeEl = document.getElementById('invItemCode');
        if (nameEl) nameEl.value = `${type} Transformer ${rating}`;
        if (codeEl) codeEl.value = `XFMR-${type.substring(0,3).toUpperCase()}-${rating.replace(/\s/g, '')}`;
    },

    saveTransformer() {
        if (!this.canManageInventory()) { App.showToast('Insufficient permissions', 'error'); return; }
        const type = document.getElementById('xfmrType')?.value;
        const rating = document.getElementById('xfmrRating')?.value;
        const company = document.getElementById('invItemCompany')?.value;
        if (!type || !rating || !company) { App.showToast('Type, Rating, and Company are required', 'error'); return; }

        const item = Database.addInventoryItem({
            name: document.getElementById('invItemName')?.value || `${type} Transformer ${rating}`,
            code: document.getElementById('invItemCode')?.value || '',
            barcode: '',
            company: company,
            category: 'Transformers',
            subcategory: type,
            unit: 'pcs',
            quantity: parseInt(document.getElementById('invItemQty')?.value || 0),
            reorderLevel: 2,
            unitCost: parseFloat(document.getElementById('invItemCost')?.value || 0),
            location: document.getElementById('invItemLocation')?.value || '',
            transformerType: type,
            transformerRating: rating,
            serialNumber: document.getElementById('xfmrSerial')?.value || '',
            specifications: {
                type, rating,
                phase: document.getElementById('xfmrPhase')?.value || 'Single Phase',
                voltage: document.getElementById('xfmrVoltage')?.value || '13.8kV / 240V-120V'
            },
            projectId: document.getElementById('xfmrProject')?.value || null
        });

        App.closeModal();
        App.showToast(`Transformer added: ${type} ${rating}`, 'success');
        this.render(document.getElementById('contentArea'));
    },

    // ============================================================
    //  BARCODE/QR SCANNER (Keyboard Wedge Mode)
    // ============================================================
    handleScanInput(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const code = document.getElementById('scannerInput')?.value.trim();
            if (code) this.lookupItem(code);
        }
    },

    lookupItem(code) {
        const item = DataStore.inventoryItems.find(i =>
            i.code === code || i.id === code || i.barcode === code
        );

        if (item) {
            document.getElementById('scannerInput').value = '';
            this.openQuickTransaction(item);
        } else {
            App.showToast(`Item "${code}" not found. Create it?`, 'warning');
            this.openAddItem(code);
        }
    },

    openQuickTransaction(item) {
        App.openModal(`Stock Transaction — ${item.name}`, `
        <div style="padding:16px;background:var(--bg);border-radius:var(--radius);margin-bottom:16px">
            <div class="flex-between"><strong>${item.name}</strong><span class="badge-tag badge-info">${item.quantity} ${item.unit || 'pcs'} in stock</span></div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Code: ${item.code || item.id} | Category: ${item.category || '-'}</div>
        </div>
        <form>
            <div class="form-row">
                <div class="form-group"><label>Transaction Type</label>
                    <select class="form-control" id="txType">
                        <option value="in">Stock In (+)</option>
                        <option value="out">Stock Out (−)</option>
                    </select>
                </div>
                <div class="form-group"><label>Quantity</label><input type="number" class="form-control" id="txQty" min="1" value="1"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Reference / PO#</label><input type="text" class="form-control" id="txRef" placeholder="e.g. PO-2024-001"></div>
                <div class="form-group"><label>Reason</label>
                    <select class="form-control" id="txReason">
                        <option value="purchase">Purchase / Delivery</option>
                        <option value="return">Return</option>
                        <option value="consumed">Consumed / Used</option>
                        <option value="sold">Sold</option>
                        <option value="damaged">Damaged / Expired</option>
                        <option value="adjustment">Adjustment</option>
                        <option value="transfer">Transfer</option>
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Notes</label><textarea class="form-control" id="txNotes" rows="2"></textarea></div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Inventory.saveTransaction('${item.id}')"><i class="fas fa-check"></i> Confirm</button>
        `);
    },

    saveTransaction(itemId) {
        const qty = parseInt(document.getElementById('txQty')?.value || 0);
        if (qty <= 0) { App.showToast('Quantity must be > 0', 'error'); return; }
        const type = document.getElementById('txType')?.value || 'in';
        const item = DataStore.inventoryItems.find(i => i.id === itemId);
        if (!item) return;

        if (type === 'out' && qty > item.quantity) {
            App.showToast('Not enough stock', 'error');
            return;
        }

        Database.addInventoryTransaction({
            itemId,
            itemName: item.name,
            company: item.company,
            type,
            quantity: qty,
            unit: item.unit || 'pcs',
            reference: document.getElementById('txRef')?.value || '',
            reason: document.getElementById('txReason')?.value || '',
            notes: document.getElementById('txNotes')?.value || '',
            date: new Date().toISOString().split('T')[0]
        });

        App.closeModal();
        App.showToast(`Stock ${type === 'in' ? 'in' : 'out'}: ${qty} ${item.unit || 'pcs'} of ${item.name}`, 'success');
        this.render(document.getElementById('contentArea'));
    },

    processStockIn() {
        const code = document.getElementById('scannerInput')?.value.trim();
        if (!code) { App.showToast('Scan or enter item code first', 'error'); return; }
        const item = DataStore.inventoryItems.find(i => i.code === code || i.id === code || i.barcode === code);
        if (item) {
            document.getElementById('scannerInput').value = '';
            this.openQuickTransaction(item);
            setTimeout(() => { document.getElementById('txType').value = 'in'; }, 100);
        } else {
            this.openAddItem(code);
        }
    },

    processStockOut() {
        const code = document.getElementById('scannerInput')?.value.trim();
        if (!code) { App.showToast('Scan or enter item code first', 'error'); return; }
        const item = DataStore.inventoryItems.find(i => i.code === code || i.id === code || i.barcode === code);
        if (item) {
            document.getElementById('scannerInput').value = '';
            this.openQuickTransaction(item);
            setTimeout(() => { document.getElementById('txType').value = 'out'; }, 100);
        } else {
            App.showToast('Item not found', 'error');
        }
    },

    // ============================================================
    //  VIEW ITEM DETAILS
    // ============================================================
    viewItem(id) {
        const item = DataStore.inventoryItems.find(i => i.id === id);
        if (!item) return;
        const txs = DataStore.inventoryTransactions.filter(t => t.itemId === id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const proj = item.projectId ? DataStore.projects.find(p => p.id === item.projectId) : null;
        const isTransformer = item.category === 'Transformers';
        const specs = item.specifications || {};

        App.openModal(`Item: ${item.name}`, `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;font-size:13px">
            <div><strong>Code:</strong> ${item.code || item.id}</div>
            <div><strong>Barcode:</strong> ${item.barcode || 'N/A'}</div>
            <div><strong>Category:</strong> ${item.category || '-'}</div>
            <div><strong>Unit:</strong> ${item.unit || 'pcs'}</div>
            <div><strong>Current Qty:</strong> <span class="badge-tag ${item.quantity <= (item.reorderLevel || 5) ? 'badge-danger' : 'badge-success'}">${item.quantity}</span></div>
            <div><strong>Reorder Level:</strong> ${item.reorderLevel || 5}</div>
            <div><strong>Unit Cost:</strong> ${Utils.formatCurrency(item.unitCost || 0)}</div>
            <div><strong>Location:</strong> ${item.location || '-'}</div>
            ${isTransformer ? `
            <div><strong>Transformer Type:</strong> <span class="badge-tag" style="background:${(item.transformerType || '').toLowerCase() === 'silicon' ? '#8b5cf620' : '#f59e0b20'};color:${(item.transformerType || '').toLowerCase() === 'silicon' ? '#8b5cf6' : '#f59e0b'}">${item.transformerType || '-'}</span></div>
            <div><strong>Rating:</strong> <span style="font-weight:700">${item.transformerRating || '-'}</span></div>
            <div><strong>Phase:</strong> ${specs.phase || '-'}</div>
            <div><strong>Voltage:</strong> ${specs.voltage || '-'}</div>
            ` : ''}
            ${item.serialNumber ? `<div style="grid-column:1/3"><strong>Serial Number:</strong> ${item.serialNumber}</div>` : ''}
            <div style="grid-column:1/3"><strong>Assigned Project:</strong> ${proj ? `<a href="#" onclick="App.closeModal();Construction.viewProject('${proj.id}');return false" style="color:var(--secondary);font-weight:600">${proj.name}</a>` : '<span style="color:var(--text-muted)">None</span>'}</div>
        </div>
        <h4 style="margin-bottom:8px">Transaction History</h4>
        ${txs.length > 0 ? txs.slice(0, 15).map(t => `
            <div style="padding:8px 12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;font-size:13px">
                <div>${t.date} — ${t.reason || t.type}</div>
                <span class="badge-tag ${t.type === 'in' ? 'badge-success' : 'badge-danger'}">${t.type === 'in' ? '+' : '-'}${t.quantity}</span>
            </div>
        `).join('') : '<div style="padding:16px;text-align:center;color:var(--text-muted)">No transactions yet</div>'}`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            ${this.canManageInventory() ? `<button class="btn btn-info" onclick="Inventory.editItem('${id}')"><i class="fas fa-edit"></i> Edit</button>` : ''}
            ${this.canManageInventory() ? `<button class="btn btn-danger" onclick="Inventory.deleteItem('${id}')"><i class="fas fa-trash"></i> Delete</button>` : ''}
        `, true);
    },

    // ============================================================
    //  ADD / EDIT ITEM
    // ============================================================
    openAddItem(prefillCode) {
        if (!this.canManageInventory()) { App.showToast('Insufficient permissions to add items', 'error'); return; }
        const company = App.activeCompany !== 'all' ? App.activeCompany : 'dheekay';
        const companyType = DataStore.companies[company]?.type || 'construction';
        const categories = DataStore.inventoryCategories[companyType] || [];
        const projects = DataStore.projects.filter(p => App.activeCompany === 'all' || p.company === App.activeCompany);

        const companies = App.activeCompany === 'all'
            ? Object.values(DataStore.companies).map(c => `<option value="${c.id}">${c.name}</option>`).join('')
            : `<option value="${App.activeCompany}" selected>${DataStore.companies[App.activeCompany]?.name}</option>`;

        App.openModal('Add Inventory Item', `
        <form>
            <div class="form-row">
                <div class="form-group"><label>Item Name *</label><input type="text" class="form-control" id="invItemName" placeholder="e.g. Motor Oil 10W-40"></div>
                <div class="form-group"><label>Item Code</label><input type="text" class="form-control" id="invItemCode" value="${prefillCode || ''}" placeholder="SKU or code"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Barcode / QR</label><input type="text" class="form-control" id="invBarcode" placeholder="Scan or enter barcode"></div>
                <div class="form-group"><label>Company</label>
                    <select class="form-control" id="invItemCompany" onchange="Inventory.updateCategoryOptions()">
                        ${companies}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Category</label>
                    <select class="form-control" id="invItemCategory" onchange="Inventory.onCategoryChange()">
                        ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                        <option value="_custom">+ Custom Category</option>
                    </select>
                </div>
                <div class="form-group"><label>Unit</label>
                    <select class="form-control" id="invItemUnit">
                        <option value="pcs">Pieces (pcs)</option>
                        <option value="kg">Kilograms (kg)</option>
                        <option value="L">Liters (L)</option>
                        <option value="box">Box</option>
                        <option value="set">Set</option>
                        <option value="roll">Roll</option>
                        <option value="bag">Bag</option>
                        <option value="bottle">Bottle</option>
                    </select>
                </div>
            </div>
            <div id="transformerFields" style="display:none">
                <div class="form-row">
                    <div class="form-group"><label>Transformer Type</label>
                        <select class="form-control" id="invXfmrType">
                            ${(DataStore.transformerTypes || []).map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group"><label>Rating (KVA)</label>
                        <select class="form-control" id="invXfmrRating">
                            ${(DataStore.transformerRatings || []).map(r => `<option value="${r}">${r}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Phase</label>
                        <select class="form-control" id="invXfmrPhase"><option value="Single Phase">Single Phase</option><option value="Three Phase">Three Phase</option></select>
                    </div>
                    <div class="form-group"><label>Voltage</label><input type="text" class="form-control" id="invXfmrVoltage" value="13.8kV / 240V-120V"></div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Initial Quantity</label><input type="number" class="form-control" id="invItemQty" value="0" min="0"></div>
                <div class="form-group"><label>Reorder Level</label><input type="number" class="form-control" id="invItemReorder" value="5" min="0"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Unit Cost (₱)</label><input type="number" class="form-control" id="invItemCost" value="0" min="0" step="0.01"></div>
                <div class="form-group"><label>Storage Location</label><input type="text" class="form-control" id="invItemLocation" placeholder="e.g. Warehouse A, Shelf 3"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Assign to Project</label>
                    <select class="form-control" id="invItemProject">
                        <option value="">— No Project —</option>
                        ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Serial Number</label><input type="text" class="form-control" id="invSerialNumber" placeholder="Optional"></div>
            </div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Inventory.saveItem()"><i class="fas fa-save"></i> Save Item</button>
        `);
    },

    onCategoryChange() {
        const cat = document.getElementById('invItemCategory')?.value;
        const xfmrFields = document.getElementById('transformerFields');
        if (xfmrFields) xfmrFields.style.display = cat === 'Transformers' ? '' : 'none';
    },

    updateCategoryOptions() {
        const company = document.getElementById('invItemCompany')?.value;
        const companyType = DataStore.companies[company]?.type || 'construction';
        const categories = DataStore.inventoryCategories[companyType] || [];
        const sel = document.getElementById('invItemCategory');
        if (sel) {
            sel.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('') + '<option value="_custom">+ Custom Category</option>';
        }
    },

    saveItem() {
        if (!this.canManageInventory()) { App.showToast('Insufficient permissions', 'error'); return; }
        const name = document.getElementById('invItemName')?.value;
        if (!name) { App.showToast('Item name is required', 'error'); return; }
        const category = document.getElementById('invItemCategory')?.value || '';
        const isTransformer = category === 'Transformers';

        const itemData = {
            name,
            code: document.getElementById('invItemCode')?.value || '',
            barcode: document.getElementById('invBarcode')?.value || '',
            company: document.getElementById('invItemCompany')?.value,
            category: category,
            unit: document.getElementById('invItemUnit')?.value || 'pcs',
            quantity: parseInt(document.getElementById('invItemQty')?.value || 0),
            reorderLevel: parseInt(document.getElementById('invItemReorder')?.value || 5),
            unitCost: parseFloat(document.getElementById('invItemCost')?.value || 0),
            location: document.getElementById('invItemLocation')?.value || '',
            projectId: document.getElementById('invItemProject')?.value || null,
            serialNumber: document.getElementById('invSerialNumber')?.value || ''
        };

        if (isTransformer) {
            itemData.transformerType = document.getElementById('invXfmrType')?.value || '';
            itemData.transformerRating = document.getElementById('invXfmrRating')?.value || '';
            itemData.subcategory = itemData.transformerType;
            itemData.specifications = {
                type: itemData.transformerType,
                rating: itemData.transformerRating,
                phase: document.getElementById('invXfmrPhase')?.value || 'Single Phase',
                voltage: document.getElementById('invXfmrVoltage')?.value || ''
            };
        }

        Database.addInventoryItem(itemData);
        App.closeModal();
        const scannerEl = document.getElementById('scannerInput');
        if (scannerEl) scannerEl.value = '';
        App.showToast('Item added to inventory', 'success');
        this.render(document.getElementById('contentArea'));
    },

    editItem(id) {
        if (!this.canManageInventory()) { App.showToast('Insufficient permissions to edit items', 'error'); return; }
        const item = DataStore.inventoryItems.find(i => i.id === id);
        if (!item) return;
        const companyType = DataStore.companies[item.company]?.type || 'construction';
        const categories = DataStore.inventoryCategories[companyType] || [];
        const isTransformer = item.category === 'Transformers';
        const specs = item.specifications || {};
        const projects = DataStore.projects.filter(p => p.company === item.company || App.activeCompany === 'all');

        App.openModal('Edit Item', `
        <form>
            <div class="form-row">
                <div class="form-group"><label>Item Name *</label><input type="text" class="form-control" id="invItemName" value="${item.name}"></div>
                <div class="form-group"><label>Item Code</label><input type="text" class="form-control" id="invItemCode" value="${item.code || ''}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Barcode / QR</label><input type="text" class="form-control" id="invBarcode" value="${item.barcode || ''}"></div>
                <div class="form-group"><label>Category</label>
                    <select class="form-control" id="invItemCategory" onchange="Inventory.onCategoryChange()">
                        ${categories.map(c => `<option value="${c}" ${c === item.category ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div id="transformerFields" style="display:${isTransformer ? '' : 'none'}">
                <div class="form-row">
                    <div class="form-group"><label>Transformer Type</label>
                        <select class="form-control" id="invXfmrType">
                            ${(DataStore.transformerTypes || []).map(t => `<option value="${t}" ${t === item.transformerType ? 'selected' : ''}>${t}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group"><label>Rating (KVA)</label>
                        <select class="form-control" id="invXfmrRating">
                            ${(DataStore.transformerRatings || []).map(r => `<option value="${r}" ${r === item.transformerRating ? 'selected' : ''}>${r}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Phase</label>
                        <select class="form-control" id="invXfmrPhase">
                            <option value="Single Phase" ${specs.phase === 'Single Phase' ? 'selected' : ''}>Single Phase</option>
                            <option value="Three Phase" ${specs.phase === 'Three Phase' ? 'selected' : ''}>Three Phase</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Voltage</label><input type="text" class="form-control" id="invXfmrVoltage" value="${specs.voltage || '13.8kV / 240V-120V'}"></div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Unit</label><input type="text" class="form-control" id="invItemUnit" value="${item.unit || 'pcs'}"></div>
                <div class="form-group"><label>Reorder Level</label><input type="number" class="form-control" id="invItemReorder" value="${item.reorderLevel || 5}" min="0"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Unit Cost (₱)</label><input type="number" class="form-control" id="invItemCost" value="${item.unitCost || 0}" min="0" step="0.01"></div>
                <div class="form-group"><label>Location</label><input type="text" class="form-control" id="invItemLocation" value="${item.location || ''}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Assign to Project</label>
                    <select class="form-control" id="invItemProject">
                        <option value="">— No Project —</option>
                        ${projects.map(p => `<option value="${p.id}" ${p.id === item.projectId ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Serial Number</label><input type="text" class="form-control" id="invSerialNumber" value="${item.serialNumber || ''}"></div>
            </div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Inventory.updateItem('${id}')"><i class="fas fa-save"></i> Update</button>
        `);
    },

    updateItem(id) {
        if (!this.canManageInventory()) { App.showToast('Insufficient permissions', 'error'); return; }
        const name = document.getElementById('invItemName')?.value;
        if (!name) { App.showToast('Name is required', 'error'); return; }
        const category = document.getElementById('invItemCategory')?.value || '';
        const isTransformer = category === 'Transformers';

        const updates = {
            name,
            code: document.getElementById('invItemCode')?.value || '',
            barcode: document.getElementById('invBarcode')?.value || '',
            category: category,
            unit: document.getElementById('invItemUnit')?.value || 'pcs',
            reorderLevel: parseInt(document.getElementById('invItemReorder')?.value || 5),
            unitCost: parseFloat(document.getElementById('invItemCost')?.value || 0),
            location: document.getElementById('invItemLocation')?.value || '',
            projectId: document.getElementById('invItemProject')?.value || null,
            serialNumber: document.getElementById('invSerialNumber')?.value || ''
        };

        if (isTransformer) {
            updates.transformerType = document.getElementById('invXfmrType')?.value || '';
            updates.transformerRating = document.getElementById('invXfmrRating')?.value || '';
            updates.subcategory = updates.transformerType;
            updates.specifications = {
                type: updates.transformerType,
                rating: updates.transformerRating,
                phase: document.getElementById('invXfmrPhase')?.value || 'Single Phase',
                voltage: document.getElementById('invXfmrVoltage')?.value || ''
            };
        }

        Database.updateInventoryItem(id, updates);
        App.closeModal();
        App.showToast('Item updated', 'success');
        this.render(document.getElementById('contentArea'));
    },

    deleteItem(id) {
        if (!this.canManageInventory()) { App.showToast('Insufficient permissions to delete items', 'error'); return; }
        if (!confirm('Delete this inventory item?')) return;
        Database.deleteInventoryItem(id);
        App.closeModal();
        App.showToast('Item deleted', 'success');
        this.render(document.getElementById('contentArea'));
    }
};
