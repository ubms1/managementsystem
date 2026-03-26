/* ========================================
   UBMS - Automotive Hub Module
   Workshop, Vehicles, Parts, Inspections
   ======================================== */

const Automotive = {
    // ============================================================
    //  WORKSHOP MANAGEMENT
    // ============================================================
    renderWorkshop(container) {
        const jobs = DataStore.jobCards;
        const inQueue = jobs.filter(j => j.status === 'in-queue');
        const inProgress = jobs.filter(j => j.status === 'in-progress');
        const waitingParts = jobs.filter(j => j.status === 'waiting-parts');
        const ready = jobs.filter(j => j.status === 'completed');
        const totalRevenue = jobs.filter(j => j.status === 'completed').reduce((s, j) => s + j.total, 0);

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon teal"><i class="fas fa-car-wrench"></i></div></div><div class="stat-value">${jobs.length}</div><div class="stat-label">Total Job Cards</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-spinner"></i></div></div><div class="stat-value">${inProgress.length}</div><div class="stat-label">Under Repair</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-box-open"></i></div></div><div class="stat-value">${waitingParts.length}</div><div class="stat-label">Waiting Parts</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-peso-sign"></i></div></div><div class="stat-value">${Utils.formatCurrency(totalRevenue, true)}</div><div class="stat-label">Revenue</div></div>
        </div>

        <div class="section-header mb-2">
            <h2>Workshop Status Board</h2>
            <button class="btn btn-primary" onclick="Automotive.openNewJobCard()"><i class="fas fa-plus"></i> New Job Card</button>
        </div>

        <div class="status-board">
            <div class="status-column">
                <div class="status-column-header" style="border-top:3px solid #3b82f6"><div class="flex-between"><span>In Queue</span><span class="badge-tag badge-info">${inQueue.length}</span></div></div>
                ${inQueue.map(j => this.renderJobCardWidget(j)).join('') || '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:12px">Empty</div>'}
            </div>
            <div class="status-column">
                <div class="status-column-header" style="border-top:3px solid #f59e0b"><div class="flex-between"><span>Under Repair</span><span class="badge-tag badge-warning">${inProgress.length}</span></div></div>
                ${inProgress.map(j => this.renderJobCardWidget(j)).join('') || '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:12px">Empty</div>'}
            </div>
            <div class="status-column">
                <div class="status-column-header" style="border-top:3px solid #8b5cf6"><div class="flex-between"><span>Waiting Parts</span><span class="badge-tag badge-neutral">${waitingParts.length}</span></div></div>
                ${waitingParts.map(j => this.renderJobCardWidget(j)).join('') || '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:12px">Empty</div>'}
            </div>
            <div class="status-column">
                <div class="status-column-header" style="border-top:3px solid #10b981"><div class="flex-between"><span>Ready / Completed</span><span class="badge-tag badge-success">${ready.length}</span></div></div>
                ${ready.map(j => this.renderJobCardWidget(j)).join('') || '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:12px">Empty</div>'}
            </div>
        </div>`;
    },

    renderJobCardWidget(job) {
        const vehicle = DataStore.vehicles.find(v => v.id === job.vehicle);
        const customer = DataStore.customers.find(c => c.id === job.customer);
        return `
        <div class="status-card" onclick="Automotive.viewJobCard('${job.id}')" style="cursor:pointer">
            <div class="flex-between mb-1">
                <strong style="font-size:13px">${job.id}</strong>
                <span style="font-size:11px;color:var(--text-muted)">${Utils.formatDate(job.dateIn)}</span>
            </div>
            <div style="font-size:14px;font-weight:600;margin-bottom:4px">${vehicle?.make || ''} ${vehicle?.model || ''}</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px">
                <i class="fas fa-car" style="width:14px"></i> ${vehicle?.plate || 'N/A'} &nbsp;
                <i class="fas fa-user" style="width:14px"></i> ${customer?.name || 'Walk-in'}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">
                ${(job.services || []).slice(0, 2).map(s => {
                    const srv = DataStore.autoServices.find(as => as.id === s);
                    return `<span class="badge-tag badge-neutral" style="font-size:10px">${srv?.name || s}</span>`;
                }).join('')}
                ${(job.services || []).length > 2 ? `<span class="badge-tag badge-neutral" style="font-size:10px">+${(job.services || []).length - 2}</span>` : ''}
            </div>
            <div class="flex-between">
                <span style="font-size:13px;font-weight:700;color:var(--secondary)">${Utils.formatCurrency(job.total)}</span>
                ${job.priority === 'urgent' ? '<span class="badge-tag badge-danger" style="font-size:10px">URGENT</span>' : ''}
            </div>
        </div>`;
    },

    viewJobCard(id) {
        const job = DataStore.jobCards.find(j => j.id === id);
        if (!job) return;
        const vehicle = DataStore.vehicles.find(v => v.id === job.vehicle);
        const customer = DataStore.customers.find(c => c.id === job.customer);

        const serviceDetails = (job.services || []).map(s => {
            const srv = DataStore.autoServices.find(as => as.id === s);
            return srv ? `<tr><td>${srv.name}</td><td>${srv.category}</td><td>${Utils.formatCurrency(srv.price)}</td></tr>` : '';
        }).join('');

        App.openModal('Job Card — ' + job.id, `
            <div class="grid-2" style="gap:16px;margin-bottom:20px">
                <div style="padding:16px;background:var(--bg);border-radius:var(--radius)">
                    <h4 style="margin-bottom:8px"><i class="fas fa-car" style="color:var(--secondary)"></i> Vehicle</h4>
                    <div style="font-size:13px;line-height:1.8">
                        <div><strong>${vehicle?.year || ''} ${vehicle?.make || ''} ${vehicle?.model || ''}</strong></div>
                        <div>Plate: <strong>${vehicle?.plate || 'N/A'}</strong></div>
                        <div>Mileage: ${vehicle ? Utils.formatNumber(vehicle.mileage) + ' km' : 'N/A'}</div>
                        <div>Color: ${vehicle?.color || 'N/A'}</div>
                    </div>
                </div>
                <div style="padding:16px;background:var(--bg);border-radius:var(--radius)">
                    <h4 style="margin-bottom:8px"><i class="fas fa-user" style="color:var(--secondary)"></i> Customer</h4>
                    <div style="font-size:13px;line-height:1.8">
                        <div><strong>${customer?.name || 'Walk-in'}</strong></div>
                        <div>${customer?.phone || ''}</div>
                        <div>${customer?.email || ''}</div>
                    </div>
                </div>
            </div>

            <div class="grid-3" style="gap:8px;margin-bottom:16px;font-size:13px">
                <div><strong>Date In:</strong> ${Utils.formatDate(job.dateIn)}</div>
                <div><strong>Date Out:</strong> ${job.dateOut ? Utils.formatDate(job.dateOut) : 'Pending'}</div>
                <div><strong>Priority:</strong> <span class="badge-tag ${job.priority === 'urgent' ? 'badge-danger' : job.priority === 'high' ? 'badge-warning' : 'badge-neutral'}">${job.priority}</span></div>
            </div>

            <h4 style="margin-bottom:8px">Services</h4>
            <table class="data-table"><thead><tr><th>Service</th><th>Category</th><th>Price</th></tr></thead><tbody>${serviceDetails}</tbody></table>

            <div class="flex-between" style="margin-top:16px;padding:12px 16px;background:var(--bg);border-radius:var(--radius);font-size:16px">
                <strong>Total</strong>
                <strong style="color:var(--secondary)">${Utils.formatCurrency(job.total)}</strong>
            </div>

            ${job.notes ? `<div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:var(--radius);font-size:13px"><strong>Technician Notes:</strong> ${job.notes}</div>` : ''}

            <div style="margin-top:16px;display:flex;gap:8px">
                <button class="btn btn-info" onclick="Automotive.printJobOrder('${job.id}')"><i class="fas fa-print"></i> Print Job Order</button>
                ${job.status !== 'completed' ? `
                    <button class="btn btn-success" onclick="Automotive.updateJobStatus('${job.id}','completed');App.closeModal()"><i class="fas fa-check"></i> Mark Ready</button>
                    <button class="btn btn-warning" onclick="Automotive.updateJobStatus('${job.id}','waiting-parts');App.closeModal()"><i class="fas fa-box-open"></i> Waiting Parts</button>
                    <button class="btn btn-primary" onclick="Automotive.updateJobStatus('${job.id}','in-progress');App.closeModal()"><i class="fas fa-wrench"></i> Start Repair</button>
                ` : ''}
            </div>
        `, '', true);
    },

    updateJobStatus(id, status) {
        const job = DataStore.jobCards.find(j => j.id === id);
        if (job) {
            job.status = status;
            if (status === 'completed') job.dateOut = new Date().toISOString().split('T')[0];
            App.showToast(`Job ${id} updated to ${status}`, 'success');
            this.renderWorkshop(document.getElementById('contentArea'));
        }
    },

    openNewJobCard() {
        App.openModal('New Job Card', `
        <form>
            <div class="form-row">
                <div class="form-group"><label>Customer</label>
                    <select class="form-control" id="newJCCustomer">
                        <option value="">Walk-in</option>
                        ${DataStore.customers.filter(c => c.companies?.includes('autocasa')).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Vehicle</label>
                    <select class="form-control" id="newJCVehicle">
                        ${DataStore.vehicles.map(v => `<option value="${v.id}">${v.year} ${v.make} ${v.model} (${v.plate})</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Services</label>
                <div id="newJCServices" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:200px;overflow-y:auto">
                    ${DataStore.autoServices.map(s => `<label style="display:flex;align-items:center;gap:6px;font-size:13px;padding:4px"><input type="checkbox" value="${s.id}" data-price="${s.price}" onchange="Automotive.updateJCTotal()"> ${s.name} (${Utils.formatCurrency(s.price)})</label>`).join('')}
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Priority</label>
                    <select class="form-control" id="newJCPriority">
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>
                </div>
                <div class="form-group"><label>Estimated Total</label>
                    <div id="newJCTotal" style="font-size:24px;font-weight:700;color:var(--secondary);padding:8px 0">₱0.00</div>
                </div>
            </div>
            <div class="form-group"><label>Notes</label><textarea class="form-control" id="newJCNotes" rows="2"></textarea></div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Automotive.saveJobCard()"><i class="fas fa-save"></i> Create</button>
        `);
    },

    updateJCTotal() {
        const checkboxes = document.querySelectorAll('#newJCServices input:checked');
        let total = 0;
        checkboxes.forEach(cb => { total += parseFloat(cb.dataset.price || 0); });
        const el = document.getElementById('newJCTotal');
        if (el) el.textContent = Utils.formatCurrency(total);
    },

    saveJobCard() {
        const checkboxes = document.querySelectorAll('#newJCServices input:checked');
        const services = Array.from(checkboxes).map(cb => cb.value);
        const total = Array.from(checkboxes).reduce((s, cb) => s + parseFloat(cb.dataset.price || 0), 0);

        if (services.length === 0) { App.showToast('Select at least one service', 'error'); return; }

        DataStore.jobCards.push({
            id: Utils.generateId('JC'),
            customer: document.getElementById('newJCCustomer').value,
            vehicle: document.getElementById('newJCVehicle').value,
            services,
            total,
            priority: document.getElementById('newJCPriority').value,
            notes: document.getElementById('newJCNotes')?.value || '',
            dateIn: new Date().toISOString().split('T')[0],
            dateOut: null,
            status: 'in-queue'
        });

        App.closeModal();
        App.showToast('Job Card created', 'success');
        this.renderWorkshop(document.getElementById('contentArea'));
    },

    // ============================================================
    //  VEHICLES
    // ============================================================
    renderVehicles(container) {
        const vehicles = DataStore.vehicles;

        container.innerHTML = `
        <div class="section-header mb-3">
            <h2>Vehicle Database</h2>
            <div class="section-actions">
                <input type="text" class="form-control" placeholder="Search plates..." style="width:200px" id="vehicleSearch" oninput="Automotive.searchVehicles()">
                <button class="btn btn-primary" onclick="Automotive.openAddVehicle()"><i class="fas fa-plus"></i> Add Vehicle</button>
            </div>
        </div>

        <div class="card">
            <div class="card-body no-padding" id="vehiclesTableContainer">
                ${this.buildVehiclesTable(vehicles)}
            </div>
        </div>`;
    },

    buildVehiclesTable(vehicles) {
        return Utils.buildTable(
            [
                { label: 'Vehicle', render: r => `<div><strong>${r.year} ${r.make} ${r.model}</strong><div style="font-size:11px;color:var(--text-muted)">${r.color}</div></div>` },
                { label: 'Plate', render: r => `<span style="font-family:monospace;font-weight:700;background:var(--bg);padding:3px 8px;border-radius:4px">${r.plate}</span>` },
                { label: 'Owner', render: r => { const c = DataStore.customers.find(cu => cu.id === r.owner); return c?.name || 'N/A'; } },
                { label: 'Mileage', render: r => `${Utils.formatNumber(r.mileage)} km` },
                { label: 'Last Service', render: r => Utils.formatDate(r.lastService) },
                { label: 'Jobs', render: r => { const count = DataStore.jobCards.filter(j => j.vehicle === r.id).length; return `<span class="badge-tag badge-info">${count}</span>`; } }
            ],
            vehicles,
            {
                actions: (r) => `
                    <button class="btn btn-sm btn-secondary" onclick="Automotive.viewVehicleHistory('${r.id}')"><i class="fas fa-history"></i></button>
                `
            }
        );
    },

    searchVehicles() {
        const q = (document.getElementById('vehicleSearch')?.value || '').toLowerCase();
        const filtered = DataStore.vehicles.filter(v =>
            v.plate.toLowerCase().includes(q) ||
            v.make.toLowerCase().includes(q) ||
            v.model.toLowerCase().includes(q)
        );
        document.getElementById('vehiclesTableContainer').innerHTML = this.buildVehiclesTable(filtered);
    },

    viewVehicleHistory(id) {
        const v = DataStore.vehicles.find(vh => vh.id === id);
        if (!v) return;
        const jobs = DataStore.jobCards.filter(j => j.vehicle === id);
        const customer = DataStore.customers.find(c => c.id === v.owner);

        const jobRows = jobs.map(j => `
            <div style="padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px">
                <div class="flex-between">
                    <div><strong>${j.id}</strong> — <span class="badge-tag ${Utils.getStatusClass(j.status)}">${j.status}</span></div>
                    <span style="font-weight:700;color:var(--secondary)">${Utils.formatCurrency(j.total)}</span>
                </div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
                    ${(j.services || []).map(s => { const srv = DataStore.autoServices.find(a => a.id === s); return srv?.name || s; }).join(', ')}
                </div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:4px">In: ${Utils.formatDate(j.dateIn)} ${j.dateOut ? '| Out: ' + Utils.formatDate(j.dateOut) : ''}</div>
            </div>
        `).join('') || '<div style="text-align:center;padding:24px;color:var(--text-muted)">No service records</div>';

        App.openModal(`Vehicle History — ${v.plate}`, `
            <div style="padding:16px;background:var(--bg);border-radius:var(--radius);margin-bottom:20px">
                <h3 style="margin-bottom:4px">${v.year} ${v.make} ${v.model}</h3>
                <div style="font-size:13px;color:var(--text-secondary)">
                    Plate: <strong>${v.plate}</strong> &nbsp;|&nbsp;
                    Color: ${v.color} &nbsp;|&nbsp;
                    Mileage: ${Utils.formatNumber(v.mileage)} km &nbsp;|&nbsp;
                    Owner: ${customer?.name || 'N/A'}
                </div>
            </div>
            <h4 style="margin-bottom:8px">Service History (${jobs.length} records)</h4>
            ${jobRows}
        `, '', true);
    },

    openAddVehicle() {
        App.openModal('Add Vehicle', `
        <form>
            <div class="form-row">
                <div class="form-group"><label>Make</label><input type="text" class="form-control" id="newVehMake" placeholder="e.g., Toyota"></div>
                <div class="form-group"><label>Model</label><input type="text" class="form-control" id="newVehModel" placeholder="e.g., Vios"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Year</label><input type="number" class="form-control" id="newVehYear" value="2024"></div>
                <div class="form-group"><label>Color</label><input type="text" class="form-control" id="newVehColor"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Plate Number</label><input type="text" class="form-control" id="newVehPlate" placeholder="e.g., ABC 1234"></div>
                <div class="form-group"><label>Mileage (km)</label><input type="number" class="form-control" id="newVehMileage" min="0"></div>
            </div>
            <div class="form-group"><label>Owner</label>
                <select class="form-control" id="newVehOwner">
                    ${DataStore.customers.filter(c => c.companies?.includes('autocasa')).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
            </div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Automotive.saveVehicle()"><i class="fas fa-save"></i> Save</button>
        `);
    },

    saveVehicle() {
        const make = document.getElementById('newVehMake')?.value;
        const model = document.getElementById('newVehModel')?.value;
        if (!make || !model) { App.showToast('Make and model required', 'error'); return; }

        DataStore.vehicles.push({
            id: Utils.generateId('VEH'),
            make, model,
            year: parseInt(document.getElementById('newVehYear')?.value || 2024),
            color: document.getElementById('newVehColor')?.value || '',
            plate: document.getElementById('newVehPlate')?.value || '',
            mileage: parseInt(document.getElementById('newVehMileage')?.value || 0),
            owner: document.getElementById('newVehOwner').value,
            lastService: new Date().toISOString().split('T')[0]
        });

        App.closeModal();
        App.showToast('Vehicle added', 'success');
        this.renderVehicles(document.getElementById('contentArea'));
    },

    // ============================================================
    //  PARTS INVENTORY
    // ============================================================
    renderParts(container) {
        const parts = DataStore.autoParts;
        const lowStock = parts.filter(p => p.quantity <= p.reorderLevel);
        const totalValue = parts.reduce((s, p) => s + (p.quantity * p.unitCost), 0);

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon teal"><i class="fas fa-boxes-stacked"></i></div></div><div class="stat-value">${parts.length}</div><div class="stat-label">Total SKUs</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-cubes"></i></div></div><div class="stat-value">${parts.reduce((s, p) => s + p.quantity, 0)}</div><div class="stat-label">Total Units</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-triangle-exclamation"></i></div></div><div class="stat-value">${lowStock.length}</div><div class="stat-label">Low Stock Items</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-peso-sign"></i></div></div><div class="stat-value">${Utils.formatCurrency(totalValue, true)}</div><div class="stat-label">Inventory Value</div></div>
        </div>

        ${lowStock.length > 0 ? `
        <div class="card mb-3" style="border-left:4px solid var(--danger)">
            <div class="card-header"><h3 style="color:var(--danger)"><i class="fas fa-exclamation-triangle"></i> Low Stock Alerts</h3></div>
            <div class="card-body no-padding">
                ${Utils.buildTable(
                    [
                        { label: 'Part', render: r => `<strong>${r.name}</strong>` },
                        { label: 'SKU', key: 'sku' },
                        { label: 'In Stock', render: r => `<span style="color:var(--danger);font-weight:700">${r.quantity}</span>` },
                        { label: 'Reorder Level', key: 'reorderLevel' },
                        { label: 'Supplier', key: 'supplier' }
                    ],
                    lowStock,
                    { actions: r => `<button class="btn btn-sm btn-primary" onclick="Automotive.reorderPart('${r.id}')"><i class="fas fa-cart-plus"></i> Reorder</button>` }
                )}
            </div>
        </div>` : ''}

        <div class="section-header mb-2">
            <h2>Parts Inventory</h2>
            <div class="section-actions">
                <select class="form-control" style="width:140px" id="partCategoryFilter" onchange="Automotive.filterParts()">
                    <option value="all">All Categories</option>
                    ${[...new Set(parts.map(p => p.category))].map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
                <button class="btn btn-primary" onclick="Automotive.openAddPart()"><i class="fas fa-plus"></i> Add Part</button>
            </div>
        </div>

        <div class="card">
            <div class="card-body no-padding" id="partsTableContainer">
                ${this.buildPartsTable(parts)}
            </div>
        </div>`;
    },

    buildPartsTable(parts) {
        return Utils.buildTable(
            [
                { label: 'Part Name', render: r => `<div><strong>${r.name}</strong><div style="font-size:11px;color:var(--text-muted)">${r.sku}</div></div>` },
                { label: 'Category', render: r => `<span class="badge-tag badge-neutral">${r.category}</span>` },
                { label: 'In Stock', render: r => {
                    const low = r.quantity <= r.reorderLevel;
                    return `<span style="font-weight:700;color:${low ? 'var(--danger)' : 'inherit'}">${r.quantity}</span>${low ? ' <i class="fas fa-exclamation-triangle" style="color:var(--danger);font-size:11px"></i>' : ''}`;
                }},
                { label: 'Unit Cost', render: r => Utils.formatCurrency(r.unitCost) },
                { label: 'Total Value', render: r => Utils.formatCurrency(r.quantity * r.unitCost) },
                { label: 'Supplier', key: 'supplier' }
            ],
            parts
        );
    },

    reorderPart(id) {
        const part = DataStore.autoParts.find(p => p.id === id);
        if (!part) return;
        App.openModal('Reorder Part', `
        <form>
            <div style="background:var(--bg);padding:16px;border-radius:var(--radius);margin-bottom:16px">
                <div style="font-weight:600;font-size:15px">${part.name}</div>
                <div style="font-size:13px;color:var(--text-muted)">SKU: ${part.sku} &nbsp;|&nbsp; Current Stock: <span style="color:var(--danger);font-weight:700">${part.quantity}</span> &nbsp;|&nbsp; Reorder Level: ${part.reorderLevel}</div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Quantity to Order <span class="required">*</span></label>
                    <input type="number" class="form-control" id="reorderQty" min="1" value="${Math.max(part.reorderLevel - part.quantity + 10, 10)}">
                </div>
                <div class="form-group">
                    <label>Expected Delivery</label>
                    <input type="date" class="form-control" id="reorderDelivery">
                </div>
            </div>
            <div class="form-group">
                <label>Supplier</label>
                <input type="text" class="form-control" id="reorderSupplier" value="${Utils.escapeHtml(part.supplier || '')}">
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea class="form-control" id="reorderNotes" rows="2" placeholder="Special instructions..."></textarea>
            </div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Automotive.confirmReorder('${id}')"><i class="fas fa-cart-plus"></i> Place Order</button>
        `);
    },

    confirmReorder(id) {
        const qty = parseInt(document.getElementById('reorderQty')?.value || 0);
        if (!qty || qty < 1) { App.showToast('Please enter a valid quantity', 'error'); return; }
        const part = DataStore.autoParts.find(p => p.id === id);
        if (!part) return;
        const supplier = document.getElementById('reorderSupplier')?.value || part.supplier || 'Unknown';
        Database.addAuditEntry('Parts Reorder', `Reorder request: ${qty}x ${part.name} from ${supplier}`, 'info');
        App.closeModal();
        App.showToast(`Reorder request placed for ${qty}x ${part.name}`, 'success');
    },

    filterParts() {
        const cat = document.getElementById('partCategoryFilter')?.value || 'all';
        let parts = DataStore.autoParts;
        if (cat !== 'all') parts = parts.filter(p => p.category === cat);
        document.getElementById('partsTableContainer').innerHTML = this.buildPartsTable(parts);
    },

    openAddPart() {
        App.openModal('Add Part', `
        <form>
            <div class="form-group"><label>Part Name</label><input type="text" class="form-control" id="newPartName"></div>
            <div class="form-row">
                <div class="form-group"><label>SKU</label><input type="text" class="form-control" id="newPartSKU"></div>
                <div class="form-group"><label>Category</label><input type="text" class="form-control" id="newPartCat" placeholder="e.g., Filters"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Quantity</label><input type="number" class="form-control" id="newPartQty" min="0"></div>
                <div class="form-group"><label>Reorder Level</label><input type="number" class="form-control" id="newPartReorder" min="0"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Unit Cost (₱)</label><input type="number" class="form-control" id="newPartCost" min="0" step="0.01"></div>
                <div class="form-group"><label>Supplier</label><input type="text" class="form-control" id="newPartSupplier"></div>
            </div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Automotive.savePart()"><i class="fas fa-save"></i> Save</button>
        `);
    },

    savePart() {
        const name = document.getElementById('newPartName')?.value;
        if (!name) { App.showToast('Part name required', 'error'); return; }
        DataStore.autoParts.push({
            id: Utils.generateId('PART'),
            name,
            sku: document.getElementById('newPartSKU')?.value || '',
            category: document.getElementById('newPartCat')?.value || '',
            quantity: parseInt(document.getElementById('newPartQty')?.value || 0),
            reorderLevel: parseInt(document.getElementById('newPartReorder')?.value || 5),
            unitCost: parseFloat(document.getElementById('newPartCost')?.value || 0),
            supplier: document.getElementById('newPartSupplier')?.value || ''
        });
        App.closeModal();
        App.showToast('Part added to inventory', 'success');
        this.renderParts(document.getElementById('contentArea'));
    },

    // ============================================================
    //  INSPECTIONS
    // ============================================================
    renderInspections(container) {
        container.innerHTML = `
        <div class="section-header mb-3">
            <h2>Digital Vehicle Inspections</h2>
            <button class="btn btn-primary" onclick="Automotive.openNewInspection()"><i class="fas fa-plus"></i> New Inspection</button>
        </div>

        <div class="grid-2 mb-3">
            <div class="card">
                <div class="card-header"><h3>Inspection Checklist Template</h3></div>
                <div class="card-body">
                    ${this.getInspectionCategories().map(cat => `
                    <div style="margin-bottom:16px">
                        <h4 style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">${cat.name}</h4>
                        ${cat.items.map(item => `
                        <div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;display:flex;justify-content:space-between;align-items:center">
                            <span>${item}</span>
                            <div style="display:flex;gap:4px">
                                <span class="badge-tag badge-success" style="font-size:10px;cursor:pointer">Good</span>
                                <span class="badge-tag badge-warning" style="font-size:10px;cursor:pointer">Fair</span>
                                <span class="badge-tag badge-danger" style="font-size:10px;cursor:pointer">Poor</span>
                            </div>
                        </div>`).join('')}
                    </div>`).join('')}
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3>Recent Inspections</h3></div>
                <div class="card-body">
                    ${(DataStore.inspections || []).length > 0 ? (DataStore.inspections || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8).map(ins => `
                    <div style="padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;cursor:pointer" onclick="Automotive.viewInspection('${ins.id}')">
                        <div class="flex-between">
                            <strong>${ins.vehicleInfo}</strong>
                            <span class="badge-tag ${ins.overallScore >= 80 ? 'badge-success' : ins.overallScore >= 50 ? 'badge-warning' : 'badge-danger'}">${ins.overallScore}%</span>
                        </div>
                        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
                            ${ins.customerName} &nbsp;|&nbsp; ${ins.date} &nbsp;|&nbsp; By: ${ins.inspector || 'N/A'}
                        </div>
                        <div class="progress-bar" style="margin-top:8px">
                            <div class="progress-fill ${ins.overallScore >= 80 ? 'green' : ins.overallScore >= 50 ? 'orange' : 'red'}" style="width:${ins.overallScore}%"></div>
                        </div>
                    </div>`).join('') : DataStore.vehicles.slice(0, 4).map(v => `
                    <div style="padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px">
                        <div class="flex-between">
                            <strong>${v.year} ${v.make} ${v.model}</strong>
                            <span class="badge-tag badge-neutral">No inspection</span>
                        </div>
                        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Plate: ${v.plate}</div>
                    </div>`).join('')}
                    ${(DataStore.inspections || []).length === 0 && DataStore.vehicles.length === 0 ? '<div style="text-align:center;padding:24px;color:var(--text-muted)">No inspections yet</div>' : ''}
                </div>
            </div>
        </div>`;
    },

    getInspectionCategories() {
        return [
            { name: 'Exterior', items: ['Body Condition', 'Paint/Finish', 'Lights (Front)', 'Lights (Rear)', 'Windshield', 'Wipers', 'Tires — Tread Depth', 'Tire Pressure'] },
            { name: 'Under the Hood', items: ['Engine Oil Level', 'Coolant Level', 'Brake Fluid', 'Power Steering Fluid', 'Battery Condition', 'Belts & Hoses', 'Air Filter'] },
            { name: 'Interior', items: ['Dashboard Lights', 'Horn', 'A/C System', 'Seat Belts', 'Mirrors', 'Gauges & Instruments'] },
            { name: 'Underneath', items: ['Brake Pads (Front)', 'Brake Pads (Rear)', 'Exhaust System', 'Suspension', 'CV Joints', 'Oil/Fluid Leaks'] }
        ];
    },

    openNewInspection() {
        const categories = this.getInspectionCategories();
        const checklistHtml = categories.map(cat => `
            <h4 style="margin:12px 0 6px;font-size:13px;color:var(--primary)">${cat.name}</h4>
            ${cat.items.map((item, idx) => `
                <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)">
                    <span style="flex:1;font-size:13px">${item}</span>
                    <label style="font-size:12px;display:flex;align-items:center;gap:3px"><input type="radio" name="insp_${cat.name}_${idx}" value="good" checked> Good</label>
                    <label style="font-size:12px;display:flex;align-items:center;gap:3px"><input type="radio" name="insp_${cat.name}_${idx}" value="fair"> Fair</label>
                    <label style="font-size:12px;display:flex;align-items:center;gap:3px"><input type="radio" name="insp_${cat.name}_${idx}" value="poor"> Poor</label>
                    <label style="font-size:12px;display:flex;align-items:center;gap:3px"><input type="radio" name="insp_${cat.name}_${idx}" value="na"> N/A</label>
                </div>
            `).join('')}
        `).join('');

        App.openModal('New Vehicle Inspection', `
        <form id="inspectionForm">
            <div class="form-row">
                <div class="form-group"><label>Vehicle</label>
                    <select class="form-control" id="inspVehicle">
                        ${DataStore.vehicles.map(v => `<option value="${v.id}">${v.year} ${v.make} ${v.model} — ${v.plate}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Customer</label>
                    <select class="form-control" id="inspCustomer">
                        <option value="">Walk-in</option>
                        ${DataStore.customers.filter(c => c.companies?.includes('autocasa')).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Inspector / Technician</label><input type="text" class="form-control" id="inspInspector" placeholder="Technician name"></div>
                <div class="form-group"><label>Mileage (km)</label><input type="number" class="form-control" id="inspMileage" placeholder="Current mileage"></div>
            </div>
            <div class="form-group"><label>Date</label><input type="date" class="form-control" id="inspDate" value="${new Date().toISOString().split('T')[0]}"></div>

            <h4 style="margin:16px 0 8px;font-size:14px;color:var(--text-muted)">INSPECTION CHECKLIST</h4>
            <div style="max-height:350px;overflow-y:auto;padding:8px;border:1px solid var(--border);border-radius:var(--radius)">
                ${checklistHtml}
            </div>

            <div class="form-group" style="margin-top:12px"><label>Overall Recommendations</label><textarea class="form-control" id="inspNotes" rows="3" placeholder="Findings, recommended actions..."></textarea></div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Automotive.saveInspection()"><i class="fas fa-clipboard-check"></i> Save Inspection</button>
        `, true);
    },

    saveInspection() {
        const vehicleId = document.getElementById('inspVehicle')?.value;
        const vehicle = DataStore.vehicles.find(v => v.id === vehicleId);
        if (!vehicle) { App.showToast('Select a vehicle', 'error'); return; }

        const categories = this.getInspectionCategories();
        const results = {};
        let totalChecks = 0, goodCount = 0, fairCount = 0, poorCount = 0;

        categories.forEach(cat => {
            results[cat.name] = cat.items.map((item, idx) => {
                const radios = document.querySelectorAll(`input[name="insp_${cat.name}_${idx}"]`);
                let val = 'good';
                radios.forEach(r => { if (r.checked) val = r.value; });
                totalChecks++;
                if (val === 'good') goodCount++;
                else if (val === 'fair') fairCount++;
                else if (val === 'poor') poorCount++;
                return { item, status: val };
            });
        });

        const overallScore = totalChecks > 0 ? Math.round(((goodCount + fairCount * 0.5) / totalChecks) * 100) : 0;
        const customerId = document.getElementById('inspCustomer')?.value || '';
        const customer = DataStore.customers.find(c => c.id === customerId);

        const inspection = {
            id: Utils.generateId('INS'),
            vehicleId,
            vehicleInfo: `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.plate})`,
            customerId,
            customerName: customer?.name || 'Walk-in',
            inspector: document.getElementById('inspInspector')?.value || '',
            mileage: parseInt(document.getElementById('inspMileage')?.value || 0),
            date: document.getElementById('inspDate')?.value || new Date().toISOString().split('T')[0],
            results,
            overallScore,
            goodCount, fairCount, poorCount,
            totalChecks,
            notes: document.getElementById('inspNotes')?.value || '',
            company: 'autocasa',
            createdAt: new Date().toISOString()
        };

        // Store in DataStore (persisted via inspections array)
        if (!DataStore.inspections) DataStore.inspections = [];
        DataStore.inspections.push(inspection);
        Database.save();

        App.closeModal();
        App.showToast('Inspection saved', 'success');
        this.renderInspections(document.getElementById('contentArea'));
    },

    // ============================================================
    //  PRINTABLE INSPECTION RESULTS
    // ============================================================
    printInspectionResults(id) {
        const insp = (DataStore.inspections || []).find(i => i.id === id);
        if (!insp) { App.showToast('Inspection not found', 'error'); return; }
        const company = DataStore.companies.autocasa;

        let checklistRows = '';
        Object.keys(insp.results).forEach(catName => {
            checklistRows += `<tr style="background:#f5f5f5"><td colspan="2" style="padding:8px;font-weight:700">${catName}</td></tr>`;
            insp.results[catName].forEach(r => {
                const color = r.status === 'good' ? '#27ae60' : r.status === 'fair' ? '#f39c12' : r.status === 'poor' ? '#e74c3c' : '#95a5a6';
                checklistRows += `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${r.item}</td><td style="padding:6px 8px;text-align:center;border-bottom:1px solid #eee"><span style="color:${color};font-weight:600;text-transform:uppercase">${r.status}</span></td></tr>`;
            });
        });

        const html = `<!DOCTYPE html><html><head><title>Inspection Results - ${insp.vehicleInfo}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family:'Inter',sans-serif; padding:24px; font-size:13px; color:#1a1a2e; }
            @media print { body { padding:0; } }
        </style></head><body>
            <div style="text-align:center;border-bottom:3px double #ccc;padding-bottom:12px;margin-bottom:16px">
                <h2 style="margin:0">${company.name}</h2>
                <div style="font-size:12px;color:#666">${company.address} | Tel: ${company.phone}</div>
                <div style="font-size:12px;color:#666">TIN: ${company.tin}</div>
                <div style="margin-top:8px;font-weight:700;font-size:16px;letter-spacing:2px">VEHICLE INSPECTION REPORT</div>
            </div>

            <div style="display:flex;justify-content:space-between;margin-bottom:16px">
                <div>
                    <div><strong>Vehicle:</strong> ${insp.vehicleInfo}</div>
                    <div><strong>Customer:</strong> ${insp.customerName}</div>
                    <div><strong>Inspector:</strong> ${insp.inspector || 'N/A'}</div>
                </div>
                <div style="text-align:right">
                    <div><strong>Date:</strong> ${insp.date}</div>
                    <div><strong>Mileage:</strong> ${insp.mileage ? Utils.formatNumber(insp.mileage) + ' km' : 'N/A'}</div>
                    <div><strong>Score:</strong> <span style="font-size:18px;font-weight:700;color:${insp.overallScore >= 80 ? '#27ae60' : insp.overallScore >= 50 ? '#f39c12' : '#e74c3c'}">${insp.overallScore}%</span></div>
                </div>
            </div>

            <div style="display:flex;gap:12px;margin-bottom:16px">
                <div style="flex:1;padding:12px;background:#d4edda;border-radius:8px;text-align:center"><strong style="font-size:20px;color:#155724">${insp.goodCount}</strong><div style="font-size:11px;color:#155724">Good</div></div>
                <div style="flex:1;padding:12px;background:#fff3cd;border-radius:8px;text-align:center"><strong style="font-size:20px;color:#856404">${insp.fairCount}</strong><div style="font-size:11px;color:#856404">Fair</div></div>
                <div style="flex:1;padding:12px;background:#f8d7da;border-radius:8px;text-align:center"><strong style="font-size:20px;color:#721c24">${insp.poorCount}</strong><div style="font-size:11px;color:#721c24">Poor</div></div>
            </div>

            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
                <thead><tr style="background:#2c3e50;color:white"><th style="padding:8px;text-align:left">Inspection Item</th><th style="padding:8px;text-align:center;width:100px">Status</th></tr></thead>
                <tbody>${checklistRows}</tbody>
            </table>

            ${insp.notes ? `<div style="padding:12px;border:1px dashed #ccc;border-radius:8px;margin-bottom:16px"><strong>Recommendations:</strong> ${insp.notes}</div>` : ''}

            <div style="display:flex;justify-content:space-between;margin-top:32px">
                <div style="text-align:center;width:200px"><div style="border-top:1px solid #333;padding-top:4px">Inspector Signature</div></div>
                <div style="text-align:center;width:200px"><div style="border-top:1px solid #333;padding-top:4px">Customer Acknowledgment</div></div>
            </div>

            <div style="margin-top:24px;font-size:11px;color:#666;border-top:1px solid #ccc;padding-top:8px;text-align:center">
                Generated by ${company.name} — UBMS Vehicle Inspection System
            </div>
        <script>setTimeout(function(){window.print();},300);<\/script></body></html>`;

        const pw = window.open('', '_blank', 'width=800,height=1000');
        pw.document.write(html);
        pw.document.close();
    },

    viewInspection(id) {
        const insp = (DataStore.inspections || []).find(i => i.id === id);
        if (!insp) return;

        let checklistHtml = '';
        Object.keys(insp.results).forEach(catName => {
            checklistHtml += `<h4 style="margin:12px 0 6px;font-size:13px;color:var(--primary)">${catName}</h4>`;
            insp.results[catName].forEach(r => {
                const cls = r.status === 'good' ? 'badge-success' : r.status === 'fair' ? 'badge-warning' : r.status === 'poor' ? 'badge-danger' : 'badge-neutral';
                checklistHtml += `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)"><span>${r.item}</span><span class="badge-tag ${cls}">${r.status}</span></div>`;
            });
        });

        App.openModal(`Inspection: ${insp.vehicleInfo}`, `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;font-size:13px">
                <div><strong>Customer:</strong> ${insp.customerName}</div>
                <div><strong>Inspector:</strong> ${insp.inspector}</div>
                <div><strong>Date:</strong> ${insp.date}</div>
                <div><strong>Mileage:</strong> ${insp.mileage ? Utils.formatNumber(insp.mileage) + ' km' : 'N/A'}</div>
                <div><strong>Overall Score:</strong> <span style="font-weight:700;color:${insp.overallScore >= 80 ? 'var(--success)' : insp.overallScore >= 50 ? 'var(--warning)' : 'var(--danger)'}">${insp.overallScore}%</span></div>
            </div>
            <div style="max-height:400px;overflow-y:auto">${checklistHtml}</div>
            ${insp.notes ? `<div style="margin-top:12px;padding:8px;background:var(--bg);border-radius:var(--radius);font-size:13px"><strong>Notes:</strong> ${insp.notes}</div>` : ''}
        `, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            <button class="btn btn-primary" onclick="Automotive.printInspectionResults('${insp.id}')"><i class="fas fa-print"></i> Print</button>
        `, true);
    },

    // ============================================================
    //  PRINTABLE JOB ORDER
    // ============================================================
    printJobOrder(id) {
        const job = DataStore.jobCards.find(j => j.id === id);
        if (!job) { App.showToast('Job card not found', 'error'); return; }
        const vehicle = DataStore.vehicles.find(v => v.id === job.vehicle);
        const customer = DataStore.customers.find(c => c.id === job.customer);
        const company = DataStore.companies.autocasa;

        const serviceRows = (job.services || []).map((s, i) => {
            const srv = DataStore.autoServices.find(as => as.id === s);
            return srv ? `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${i + 1}</td><td style="padding:6px 8px;border-bottom:1px solid #eee">${srv.name}</td><td style="padding:6px 8px;border-bottom:1px solid #eee">${srv.category}</td><td style="padding:6px 8px;text-align:right;border-bottom:1px solid #eee">${Utils.formatCurrency(srv.price)}</td></tr>` : '';
        }).join('');

        const html = `<!DOCTYPE html><html><head><title>Job Order - ${job.id}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family:'Inter',sans-serif; padding:24px; font-size:13px; color:#1a1a2e; }
            @media print { body { padding:0; } }
        </style></head><body>
            <div style="text-align:center;border-bottom:3px double #ccc;padding-bottom:12px;margin-bottom:16px">
                <h2 style="margin:0">${company.name}</h2>
                <div style="font-size:12px;color:#666">${company.address} | Tel: ${company.phone}</div>
                <div style="font-size:12px;color:#666">TIN: ${company.tin}</div>
                <div style="margin-top:8px;font-weight:700;font-size:16px;letter-spacing:2px">JOB ORDER</div>
            </div>

            <div style="display:flex;justify-content:space-between;margin-bottom:16px">
                <div>
                    <div><strong>Job Order No:</strong> <span style="font-family:monospace;font-weight:700">${job.id}</span></div>
                    <div><strong>Date In:</strong> ${job.dateIn}</div>
                    <div><strong>Date Out:</strong> ${job.dateOut || 'Pending'}</div>
                    <div><strong>Priority:</strong> <span style="text-transform:uppercase;font-weight:600;color:${job.priority === 'urgent' ? '#e74c3c' : job.priority === 'high' ? '#f39c12' : '#333'}">${job.priority}</span></div>
                </div>
                <div style="text-align:right">
                    <div><strong>Status:</strong> ${job.status}</div>
                </div>
            </div>

            <div style="display:flex;gap:16px;margin-bottom:16px">
                <div style="flex:1;padding:12px;border:1px solid #ddd;border-radius:8px">
                    <h4 style="margin-bottom:6px;font-size:13px;color:#666">CUSTOMER</h4>
                    <div><strong>${customer?.name || 'Walk-in'}</strong></div>
                    <div>${customer?.phone || ''}</div>
                    <div>${customer?.email || ''}</div>
                    <div>${customer?.address || ''}</div>
                </div>
                <div style="flex:1;padding:12px;border:1px solid #ddd;border-radius:8px">
                    <h4 style="margin-bottom:6px;font-size:13px;color:#666">VEHICLE</h4>
                    <div><strong>${vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'N/A'}</strong></div>
                    <div>Plate: ${vehicle?.plate || 'N/A'}</div>
                    <div>Color: ${vehicle?.color || 'N/A'}</div>
                    <div>Mileage: ${vehicle ? Utils.formatNumber(vehicle.mileage) + ' km' : 'N/A'}</div>
                </div>
            </div>

            <h4 style="margin-bottom:8px">SERVICES</h4>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
                <thead><tr style="background:#2c3e50;color:white">
                    <th style="padding:8px;text-align:left;width:40px">#</th>
                    <th style="padding:8px;text-align:left">Service</th>
                    <th style="padding:8px;text-align:left">Category</th>
                    <th style="padding:8px;text-align:right">Amount</th>
                </tr></thead>
                <tbody>${serviceRows}</tbody>
                <tfoot><tr style="font-weight:700;border-top:2px solid #333">
                    <td colspan="3" style="padding:10px 8px;text-align:right">TOTAL</td>
                    <td style="padding:10px 8px;text-align:right;font-size:16px">${Utils.formatCurrency(job.total || 0)}</td>
                </tr></tfoot>
            </table>

            ${job.notes ? `<div style="padding:12px;border:1px dashed #ccc;border-radius:8px;margin-bottom:16px"><strong>Technician Notes:</strong> ${job.notes}</div>` : ''}

            <div style="margin-top:24px;padding:12px;border:1px solid #ddd;border-radius:8px">
                <h4 style="margin-bottom:8px;font-size:12px;color:#666">CUSTOMER AUTHORIZATION</h4>
                <p style="font-size:11px;margin-bottom:16px">I hereby authorize ${company.name} to perform the above services on my vehicle. I understand and agree to the estimated charges.</p>
                <div style="display:flex;justify-content:space-between">
                    <div style="text-align:center;width:200px"><div style="border-top:1px solid #333;padding-top:4px">Customer Signature</div></div>
                    <div style="text-align:center;width:200px"><div style="border-top:1px solid #333;padding-top:4px">Service Advisor</div></div>
                </div>
            </div>

            <div style="margin-top:24px;font-size:11px;color:#666;border-top:1px solid #ccc;padding-top:8px;display:flex;justify-content:space-between">
                <span>Customer Copy — ${company.name}</span>
                <span>Generated by UBMS</span>
            </div>
        <script>setTimeout(function(){window.print();},300);<\/script></body></html>`;

        const pw = window.open('', '_blank', 'width=800,height=1000');
        pw.document.write(html);
        pw.document.close();
    },

    // ============================================================
    //  ESTIMATES & QUOTES
    // ============================================================
    renderEstimates(container) {
        const estimates = DataStore.estimates;

        const drafts = estimates.filter(e => e.status === 'draft');
        const sent = estimates.filter(e => e.status === 'sent');
        const approved = estimates.filter(e => e.status === 'approved');
        const totalValue = estimates.reduce((s, e) => s + (e.total || 0), 0);

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon teal"><i class="fas fa-file-invoice-dollar"></i></div></div><div class="stat-value">${estimates.length}</div><div class="stat-label">Total Estimates</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-edit"></i></div></div><div class="stat-value">${drafts.length}</div><div class="stat-label">Drafts</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-paper-plane"></i></div></div><div class="stat-value">${sent.length}</div><div class="stat-label">Sent / Pending</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-thumbs-up"></i></div></div><div class="stat-value">${approved.length}</div><div class="stat-label">Approved</div></div>
        </div>

        <div class="section-header mb-2">
            <h2>Estimates & Quotes</h2>
            <div class="section-actions">
                <select class="form-control" style="width:140px" id="estStatusFilter" onchange="Automotive.filterEstimates()">
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="converted">Converted</option>
                </select>
                <button class="btn btn-primary" onclick="Automotive.openCreateEstimate()"><i class="fas fa-plus"></i> New Estimate</button>
            </div>
        </div>

        <div class="card">
            <div class="card-body no-padding" id="estimatesTableContainer">
                ${this.buildEstimatesTable(estimates)}
            </div>
        </div>`;
    },

    buildEstimatesTable(estimates) {
        if (estimates.length === 0) {
            return '<div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><h3>No Estimates</h3><p>Create your first service estimate or quote for a customer.</p></div>';
        }
        return Utils.buildTable(
            [
                { label: 'Estimate #', render: r => `<strong style="font-family:monospace">${r.id}</strong>` },
                { label: 'Date', render: r => Utils.formatDate(r.date) },
                { label: 'Customer', render: r => `<strong>${r.customerName}</strong>` },
                { label: 'Vehicle', render: r => r.vehicleInfo || '-' },
                { label: 'Services', render: r => (r.lineItems || []).length + ' item(s)' },
                { label: 'Total', render: r => `<strong>${Utils.formatCurrency(r.total || 0)}</strong>` },
                { label: 'Status', render: r => {
                    const cls = { draft: 'badge-neutral', sent: 'badge-info', approved: 'badge-success', rejected: 'badge-danger', converted: 'badge-teal' };
                    return `<span class="badge-tag ${cls[r.status] || 'badge-neutral'}">${r.status}</span>`;
                }}
            ],
            estimates,
            {
                actions: (r) => `
                    <button class="btn btn-sm btn-secondary" onclick="Automotive.viewEstimate('${r.id}')"><i class="fas fa-eye"></i></button>
                    ${r.status === 'approved' ? `<button class="btn btn-sm btn-success" onclick="Automotive.convertEstimateToJob('${r.id}')" title="Convert to Job"><i class="fas fa-exchange-alt"></i></button>` : ''}
                `
            }
        );
    },

    filterEstimates() {
        const status = document.getElementById('estStatusFilter')?.value || 'all';
        let estimates = DataStore.estimates;
        if (status !== 'all') estimates = estimates.filter(e => e.status === status);
        document.getElementById('estimatesTableContainer').innerHTML = this.buildEstimatesTable(estimates);
    },

    viewEstimate(id) {
        const est = DataStore.estimates.find(e => e.id === id);
        if (!est) return;

        const lineItemsHtml = (est.lineItems || []).map((li, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${li.description}</td>
                <td style="text-align:right">${Utils.formatCurrency(li.amount || 0)}</td>
            </tr>
        `).join('');

        App.openModal(`Estimate ${est.id}`, `
            <div class="grid-2" style="gap:16px;font-size:14px;margin-bottom:16px">
                <div><strong>Customer:</strong> ${est.customerName}</div>
                <div><strong>Date:</strong> ${Utils.formatDate(est.date)}</div>
                <div><strong>Vehicle:</strong> ${est.vehicleInfo || 'N/A'}</div>
                <div><strong>Status:</strong> <span class="badge-tag ${est.status === 'approved' ? 'badge-success' : est.status === 'sent' ? 'badge-info' : est.status === 'rejected' ? 'badge-danger' : 'badge-neutral'}">${est.status}</span></div>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
                <thead><tr style="border-bottom:2px solid var(--border)"><th style="text-align:left;padding:8px">#</th><th style="text-align:left;padding:8px">Description</th><th style="text-align:right;padding:8px">Amount</th></tr></thead>
                <tbody>${lineItemsHtml || '<tr><td colspan="3" style="padding:8px;color:var(--text-muted)">No line items</td></tr>'}</tbody>
                <tfoot><tr style="border-top:2px solid var(--border);font-weight:700"><td colspan="2" style="padding:8px;text-align:right">Total</td><td style="text-align:right;padding:8px">${Utils.formatCurrency(est.total || 0)}</td></tr></tfoot>
            </table>
            ${est.notes ? `<div style="padding:12px;background:var(--bg);border-radius:var(--radius);font-size:13px"><strong>Notes:</strong> ${est.notes}</div>` : ''}
        `, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            ${est.status === 'draft' ? `<button class="btn btn-info" onclick="Automotive.updateEstimateStatus('${est.id}','sent')"><i class="fas fa-paper-plane"></i> Mark Sent</button>` : ''}
            ${est.status === 'sent' ? `
                <button class="btn btn-danger" onclick="Automotive.updateEstimateStatus('${est.id}','rejected')"><i class="fas fa-times"></i> Reject</button>
                <button class="btn btn-success" onclick="Automotive.updateEstimateStatus('${est.id}','approved')"><i class="fas fa-check"></i> Approve</button>
            ` : ''}
            ${est.status === 'approved' ? `<button class="btn btn-primary" onclick="Automotive.convertEstimateToJob('${est.id}')"><i class="fas fa-exchange-alt"></i> Convert to Job</button>` : ''}
        `);
    },

    updateEstimateStatus(id, status) {
        if (status === 'rejected' && !Auth.canEditDelete()) { App.showToast('Only Owner or Super Admin can reject estimates', 'error'); return; }
        Database.updateEstimate(id, { status });
        App.closeModal();
        App.showToast(`Estimate ${status}`, 'success');
        this.renderEstimates(document.getElementById('contentArea'));
    },

    convertEstimateToJob(id) {
        const result = Database.convertEstimateToJob(id);
        if (result) {
            App.showToast('Estimate converted to Job Card', 'success');
            App.closeModal();
            this.renderEstimates(document.getElementById('contentArea'));
        } else {
            App.showToast('Failed to convert estimate', 'error');
        }
    },

    openCreateEstimate() {
        const services = DataStore.autoServices || [];
        const html = `
        <form>
            <div class="form-group"><label>Customer Name</label><input type="text" class="form-control" id="newEstCustomer" placeholder="Customer name"></div>
            <div class="form-group"><label>Vehicle Info</label><input type="text" class="form-control" id="newEstVehicle" placeholder="e.g., 2022 Toyota Vios — ABC 1234"></div>

            <div style="margin-bottom:12px">
                <label style="font-weight:600">Service Line Items</label>
                <div id="estLineItems"></div>
                <button type="button" class="btn btn-sm btn-secondary" style="margin-top:8px" onclick="Automotive.addEstimateLineItem()"><i class="fas fa-plus"></i> Add Line</button>
            </div>

            <div class="form-row">
                <div class="form-group"><label>Total (₱)</label><input type="number" class="form-control" id="newEstTotal" min="0" step="0.01" value="0" readonly style="font-weight:700;font-size:16px"></div>
            </div>
            <div class="form-group"><label>Notes</label><textarea class="form-control" id="newEstNotes" rows="2"></textarea></div>
        </form>`;

        App.openModal('Create Estimate', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Automotive.saveEstimate()"><i class="fas fa-save"></i> Save as Draft</button>
        `);
        // add first empty line item
        this.addEstimateLineItem();
    },

    estLineCounter: 0,

    addEstimateLineItem() {
        this.estLineCounter++;
        const div = document.createElement('div');
        div.className = 'form-row';
        div.style.marginBottom = '6px';
        div.id = `estLine_${this.estLineCounter}`;
        div.innerHTML = `
            <div class="form-group" style="flex:3"><input type="text" class="form-control" placeholder="Service description" data-est-desc></div>
            <div class="form-group" style="flex:1"><input type="number" class="form-control" placeholder="Amount" min="0" step="0.01" data-est-amount oninput="Automotive.recalcEstimateTotal()"></div>
            <button type="button" class="btn btn-sm btn-danger" style="margin-top:24px;height:36px" onclick="document.getElementById('estLine_${this.estLineCounter}').remove();Automotive.recalcEstimateTotal()"><i class="fas fa-trash"></i></button>
        `;
        document.getElementById('estLineItems').appendChild(div);
    },

    recalcEstimateTotal() {
        const amounts = document.querySelectorAll('[data-est-amount]');
        let total = 0;
        amounts.forEach(a => { total += parseFloat(a.value || 0); });
        const field = document.getElementById('newEstTotal');
        if (field) field.value = total.toFixed(2);
    },

    saveEstimate() {
        const name = document.getElementById('newEstCustomer')?.value;
        if (!name) { App.showToast('Customer name is required', 'error'); return; }

        const lineItems = [];
        const rows = document.querySelectorAll('#estLineItems .form-row');
        rows.forEach(row => {
            const desc = row.querySelector('[data-est-desc]')?.value;
            const amount = parseFloat(row.querySelector('[data-est-amount]')?.value || 0);
            if (desc) lineItems.push({ description: desc, amount });
        });

        const total = lineItems.reduce((s, li) => s + li.amount, 0);

        Database.addEstimate({
            customerName: name,
            vehicleInfo: document.getElementById('newEstVehicle')?.value || '',
            lineItems,
            total,
            notes: document.getElementById('newEstNotes')?.value || '',
            status: 'draft'
        });

        App.closeModal();
        App.showToast('Estimate created', 'success');
        this.renderEstimates(document.getElementById('contentArea'));
    },

    // ============================================================
    //  APPOINTMENTS (Online Booking Management)
    // ============================================================
    renderAppointments(container) {
        const appointments = DataStore.bookings.filter(b => b.company === 'autocasa');
        const today = new Date().toISOString().split('T')[0];
        const todayAppts = appointments.filter(a => a.date === today);
        const pending = appointments.filter(a => a.status === 'pending' || a.status === 'reschedule-pending');
        const upcoming = appointments.filter(a => a.date >= today && ['confirmed', 'scheduled'].includes(a.status));
        const totalRevenue = appointments.filter(a => a.status === 'completed').reduce((s, a) => s + (a.amount || 0), 0);

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon teal"><i class="fas fa-calendar-check"></i></div></div><div class="stat-value">${todayAppts.length}</div><div class="stat-label">Today's Appointments</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-hourglass-half"></i></div></div><div class="stat-value">${pending.length}</div><div class="stat-label">Pending / Reschedule</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-clock"></i></div></div><div class="stat-value">${upcoming.length}</div><div class="stat-label">Upcoming</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-peso-sign"></i></div></div><div class="stat-value">${Utils.formatCurrency(totalRevenue, true)}</div><div class="stat-label">Revenue</div></div>
        </div>

        ${pending.length > 0 ? `
        <div style="padding:14px 16px;background:#fef3c7;border:1px solid #f59e0b;border-radius:var(--radius);margin-bottom:16px;display:flex;align-items:center;gap:10px">
            <i class="fas fa-bell" style="color:#d97706;font-size:18px"></i>
            <span style="font-size:13px;color:#92400e"><strong>${pending.length} appointment(s)</strong> require confirmation or reschedule approval.</span>
            <button class="btn btn-sm" style="margin-left:auto;background:#f59e0b;color:#fff" onclick="document.getElementById('apptStatusFilter').value='pending';Automotive.filterAppointments()">View Pending</button>
        </div>` : ''}

        <div class="section-header mb-2">
            <h2>Appointments</h2>
            <div class="section-actions">
                <select class="form-control" style="width:180px" id="apptStatusFilter" onchange="Automotive.filterAppointments()">
                    <option value="all">All Appointments</option>
                    <option value="pending">Pending Confirmation</option>
                    <option value="reschedule-pending">Reschedule Requests</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <button class="btn btn-secondary" onclick="window.open('autocasa/booking.html','_blank')" style="font-size:12px"><i class="fas fa-external-link-alt"></i> Online Booking Link</button>
                <button class="btn btn-primary" onclick="Automotive.openNewAppointment()"><i class="fas fa-plus"></i> New Appointment</button>
            </div>
        </div>

        <div class="card">
            <div class="card-body no-padding" id="appointmentsTableContainer">
                ${this.buildAppointmentsTable(appointments)}
            </div>
        </div>`;
    },

    buildAppointmentsTable(appointments) {
        return Utils.buildTable(
            [
                { label: 'Date / Time', render: r => `<div><strong>${Utils.formatDate(r.date)}</strong><div style="font-size:11px;color:var(--text-muted)">${r.time}</div></div>` },
                { label: 'Customer', render: r => {
                    const c = r.customer ? DataStore.customers.find(cu => cu.id === r.customer) : null;
                    return `<div><strong>${c?.name || r.customerName || 'Walk-in'}</strong><div style="font-size:11px;color:var(--text-muted)">${r.customerPhone || c?.phone || ''}</div></div>`;
                }},
                { label: 'Vehicle', render: r => r.vehiclePlate ? `<div><strong>${r.vehiclePlate}</strong><div style="font-size:11px;color:var(--text-muted)">${r.vehicleYear ? r.vehicleYear + ' ' : ''}${r.vehicleMake || ''} ${r.vehicleModel || ''}</div></div>` : 'N/A' },
                { label: 'Services', render: r => {
                    const names = (r.serviceNames || []).slice(0, 2);
                    if (names.length === 0 && r.services) {
                        return (r.services || []).slice(0, 2).map(id => { const sv = DataStore.autoServices.find(s => s.id === id); return sv?.name || id; }).join(', ') + ((r.services || []).length > 2 ? ` +${r.services.length - 2}` : '');
                    }
                    return names.join(', ') + ((r.serviceNames || []).length > 2 ? ` +${(r.serviceNames || []).length - 2}` : '');
                }},
                { label: 'Source', render: r => r.source === 'online' ? '<span class="badge-tag badge-info" style="font-size:10px"><i class="fas fa-globe"></i> Online</span>' : '<span class="badge-tag badge-neutral" style="font-size:10px">Walk-in</span>' },
                { label: 'Amount', render: r => `<strong>${Utils.formatCurrency(r.amount || 0)}</strong>` },
                { label: 'Status', render: r => `<span class="badge-tag ${Utils.getStatusClass(r.status)}">${r.status}</span>` }
            ],
            appointments,
            {
                actions: (r) => `
                    <button class="btn btn-sm btn-secondary" onclick="Automotive.viewAppointment('${r.id}')" title="View"><i class="fas fa-eye"></i></button>
                    ${r.status === 'pending' ? `<button class="btn btn-sm btn-success" style="margin-left:4px" onclick="Automotive.confirmAppointment('${r.id}')" title="Confirm"><i class="fas fa-check"></i></button><button class="btn btn-sm btn-danger" style="margin-left:4px" onclick="Automotive.rejectAppointment('${r.id}')" title="Reject"><i class="fas fa-times"></i></button>` : ''}
                    ${r.status === 'reschedule-pending' ? `<button class="btn btn-sm btn-success" style="margin-left:4px" onclick="Automotive.approveApptReschedule('${r.id}')" title="Approve"><i class="fas fa-calendar-check"></i></button><button class="btn btn-sm btn-danger" style="margin-left:4px" onclick="Automotive.denyApptReschedule('${r.id}')" title="Deny"><i class="fas fa-calendar-times"></i></button>` : ''}
                    ${r.status === 'confirmed' ? `<button class="btn btn-sm btn-success" style="margin-left:4px" onclick="Automotive.completeAppointment('${r.id}')" title="Complete"><i class="fas fa-check-double"></i></button><button class="btn btn-sm btn-info" style="margin-left:4px" onclick="Automotive.convertToJobCard('${r.id}')" title="Create Job Card"><i class="fas fa-wrench"></i></button>` : ''}
                `
            }
        );
    },

    filterAppointments() {
        const status = document.getElementById('apptStatusFilter')?.value || 'all';
        let appointments = DataStore.bookings.filter(b => b.company === 'autocasa');
        if (status !== 'all') appointments = appointments.filter(a => a.status === status);
        document.getElementById('appointmentsTableContainer').innerHTML = this.buildAppointmentsTable(appointments);
    },

    viewAppointment(id) {
        const b = DataStore.bookings.find(bk => bk.id === id);
        if (!b) return;
        const customer = b.customer ? DataStore.customers.find(c => c.id === b.customer) : null;
        const serviceNames = (b.services || []).map(sid => { const sv = DataStore.autoServices.find(s => s.id === sid); return sv?.name || sid; });

        const reschedInfo = b.rescheduleRequest
            ? `<div style="margin-top:16px;padding:12px;background:#fef3c7;border:1px solid #f59e0b;border-radius:var(--radius);font-size:13px">
                <strong style="color:#92400e"><i class="fas fa-calendar-alt"></i> Reschedule Request</strong>
                <div style="margin-top:6px;color:#92400e">New Date: <strong>${Utils.formatDate(b.rescheduleRequest.newDate)}</strong> at <strong>${b.rescheduleRequest.newTime}</strong></div>
                <div style="color:#92400e">Reason: ${b.rescheduleRequest.reason || 'No reason provided'}</div>
               </div>` : '';

        const onlineInfo = b.source === 'online'
            ? `<div style="margin-top:16px;padding:10px;background:#e0e7ff;border-radius:var(--radius);font-size:13px"><i class="fas fa-globe" style="color:#4f46e5"></i> Booked online${b.customerPhone ? ' \u00b7 Phone: <strong>' + b.customerPhone + '</strong>' : ''}${b.customerEmail ? ' \u00b7 Email: ' + b.customerEmail : ''}</div>` : '';

        App.openModal('Appointment Details', `
            <div class="grid-2" style="gap:16px;font-size:14px">
                <div><i class="fas fa-hashtag" style="width:20px;color:var(--text-muted)"></i> <strong>${b.id}</strong></div>
                <div><i class="fas fa-calendar" style="width:20px;color:var(--text-muted)"></i> ${Utils.formatDate(b.date)} at ${b.time}</div>
                <div><i class="fas fa-user" style="width:20px;color:var(--text-muted)"></i> ${customer?.name || b.customerName || 'Walk-in'}</div>
                <div><i class="fas fa-car" style="width:20px;color:var(--text-muted)"></i> ${b.vehiclePlate || 'N/A'} ${b.vehicleYear ? '(' + b.vehicleYear + ' ' + (b.vehicleMake || '') + ' ' + (b.vehicleModel || '') + ')' : ''}</div>
                <div><i class="fas fa-wrench" style="width:20px;color:var(--text-muted)"></i> ${serviceNames.join(', ') || (b.serviceNames || []).join(', ') || 'N/A'}</div>
                <div><i class="fas fa-peso-sign" style="width:20px;color:var(--text-muted)"></i> <strong style="font-size:16px">${Utils.formatCurrency(b.amount || 0)}</strong></div>
            </div>
            <div style="margin-top:12px;font-size:14px">Status: <span class="badge-tag ${Utils.getStatusClass(b.status)}">${b.status}</span></div>
            ${b.notes ? `<div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:var(--radius);font-size:13px"><strong>Customer Notes:</strong> ${b.notes}</div>` : ''}
            ${onlineInfo}
            ${reschedInfo}
        `, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            ${b.status === 'pending' ? `<button class="btn btn-success" onclick="App.closeModal();Automotive.confirmAppointment('${b.id}')"><i class="fas fa-check"></i> Confirm</button><button class="btn btn-danger" onclick="App.closeModal();Automotive.rejectAppointment('${b.id}')"><i class="fas fa-times"></i> Reject</button>` : ''}
            ${b.status === 'reschedule-pending' ? `<button class="btn btn-success" onclick="App.closeModal();Automotive.approveApptReschedule('${b.id}')"><i class="fas fa-calendar-check"></i> Approve</button><button class="btn btn-warning" onclick="App.closeModal();Automotive.denyApptReschedule('${b.id}')"><i class="fas fa-calendar-times"></i> Deny</button>` : ''}
            ${b.status === 'confirmed' ? `<button class="btn btn-info" onclick="App.closeModal();Automotive.convertToJobCard('${b.id}')"><i class="fas fa-wrench"></i> Create Job Card</button><button class="btn btn-primary" onclick="App.closeModal();Automotive.sendApptConfirmation('${b.id}')"><i class="fas fa-paper-plane"></i> Send Confirmation</button>` : ''}
        `, true);
    },

    confirmAppointment(id) {
        const b = DataStore.bookings.find(bk => bk.id === id);
        if (!b) return;
        b.status = 'confirmed';
        b.confirmedAt = new Date().toISOString();
        b.confirmedBy = Auth.getName();
        Database.save();
        App.showToast(`Appointment ${id} confirmed`, 'success');
        this.renderAppointments(document.getElementById('contentArea'));
    },

    rejectAppointment(id) {
        if (!Auth.canEditDelete()) { App.showToast('Only Owner or Super Admin can reject appointments', 'error'); return; }
        if (!confirm('Reject this appointment? The customer will need to be notified.')) return;
        const b = DataStore.bookings.find(bk => bk.id === id);
        if (!b) return;
        b.status = 'cancelled';
        b.cancelledAt = new Date().toISOString();
        b.cancelledBy = Auth.getName();
        b.cancelReason = 'Rejected by staff';
        Database.save();
        App.showToast(`Appointment ${id} rejected`, 'info');
        this.renderAppointments(document.getElementById('contentArea'));
    },

    completeAppointment(id) {
        const b = DataStore.bookings.find(bk => bk.id === id);
        if (!b) return;
        b.status = 'completed';
        b.completedAt = new Date().toISOString();
        Database.save();
        App.showToast(`Appointment ${id} completed`, 'success');
        this.renderAppointments(document.getElementById('contentArea'));
    },

    approveApptReschedule(id) {
        const b = DataStore.bookings.find(bk => bk.id === id);
        if (!b || !b.rescheduleRequest) return;
        b.date = b.rescheduleRequest.newDate;
        b.time = b.rescheduleRequest.newTime;
        b.rescheduleRequest.approvedAt = new Date().toISOString();
        b.rescheduleRequest.approvedBy = Auth.getName();
        b.rescheduleHistory = b.rescheduleHistory || [];
        b.rescheduleHistory.push(b.rescheduleRequest);
        b.rescheduleRequest = null;
        b.status = 'confirmed';
        Database.save();
        App.showToast(`Reschedule approved \u2014 updated to ${b.date} at ${b.time}`, 'success');
        this.renderAppointments(document.getElementById('contentArea'));
    },

    denyApptReschedule(id) {
        if (!Auth.canEditDelete()) { App.showToast('Only Owner or Super Admin can deny reschedules', 'error'); return; }
        if (!confirm('Deny this reschedule request? The original schedule will be kept.')) return;
        const b = DataStore.bookings.find(bk => bk.id === id);
        if (!b || !b.rescheduleRequest) return;
        b.date = b.rescheduleRequest.originalDate;
        b.time = b.rescheduleRequest.originalTime;
        b.rescheduleRequest.deniedAt = new Date().toISOString();
        b.rescheduleRequest.deniedBy = Auth.getName();
        b.rescheduleHistory = b.rescheduleHistory || [];
        b.rescheduleHistory.push(b.rescheduleRequest);
        b.rescheduleRequest = null;
        b.status = 'confirmed';
        Database.save();
        App.showToast('Reschedule denied \u2014 keeping original schedule', 'info');
        this.renderAppointments(document.getElementById('contentArea'));
    },

    convertToJobCard(id) {
        const b = DataStore.bookings.find(bk => bk.id === id);
        if (!b) return;

        // Find or match vehicle by plate
        let vehicle = DataStore.vehicles.find(v => v.plate?.toUpperCase() === b.vehiclePlate?.toUpperCase());
        if (!vehicle && b.vehiclePlate) {
            vehicle = {
                id: Utils.generateId('VH'),
                plate: b.vehiclePlate,
                make: b.vehicleMake || '',
                model: b.vehicleModel || '',
                year: parseInt(b.vehicleYear) || new Date().getFullYear(),
                color: '',
                customer: b.customer || '',
                mileage: 0
            };
            DataStore.vehicles.push(vehicle);
        }

        const total = b.amount || 0;
        const jobCard = {
            id: Utils.generateId('JC'),
            company: 'autocasa',
            vehicle: vehicle?.id || '',
            customer: b.customer || '',
            services: b.services || [],
            total,
            priority: 'normal',
            notes: `Online Booking ${b.id}. ${b.notes || ''} Customer: ${b.customerName || 'N/A'}, Phone: ${b.customerPhone || 'N/A'}`,
            dateIn: b.date,
            dateOut: null,
            status: 'in-queue'
        };

        DataStore.jobCards.push(jobCard);
        b.jobCardId = jobCard.id;
        Database.save();
        App.showToast(`Job Card ${jobCard.id} created from appointment ${b.id}`, 'success');
        this.renderAppointments(document.getElementById('contentArea'));
    },

    sendApptConfirmation(id) {
        const b = DataStore.bookings.find(bk => bk.id === id);
        if (!b) return;
        const customer = b.customer ? DataStore.customers.find(c => c.id === b.customer) : null;
        const serviceNames = (b.services || []).map(sid => { const sv = DataStore.autoServices.find(s => s.id === sid); return sv?.name || sid; });

        const msg = `Hi ${customer?.name || b.customerName || 'Valued Customer'},\n\nYour appointment at AutoCasa Auto Expert is confirmed!\n\nRef: ${b.id}\nVehicle: ${b.vehiclePlate || 'N/A'} (${b.vehicleMake || ''} ${b.vehicleModel || ''})\nServices: ${serviceNames.join(', ') || 'N/A'}\nDate: ${Utils.formatDate(b.date)}\nTime: ${b.time}\nTotal: ${Utils.formatCurrency(b.amount || 0)}\n\nPlease arrive 10 minutes before your appointment.\nThank you!\nAutoCasa Auto Expert`;

        const phone = b.customerPhone || customer?.phone || '';
        const smsBody = encodeURIComponent(msg);

        b.confirmationSentAt = new Date().toISOString();
        b.confirmationMethod = 'SMS';
        Database.save();

        if (phone) {
            window.open(`sms:${phone}?body=${smsBody}`, '_blank');
        } else {
            navigator.clipboard?.writeText(msg);
            App.showToast('No phone number \u2014 message copied to clipboard', 'warning');
            return;
        }
        App.showToast('SMS confirmation initiated', 'success');
    },

    openNewAppointment() {
        App.openModal('New Appointment', `
        <form>
            <div class="form-row">
                <div class="form-group"><label>Customer</label>
                    <select class="form-control" id="newApptCustomer">
                        <option value="">Walk-in</option>
                        ${DataStore.customers.filter(c => c.companies?.includes('autocasa')).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Customer Name</label>
                    <input type="text" class="form-control" id="newApptCustName" placeholder="For walk-in customers">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Phone</label><input type="tel" class="form-control" id="newApptPhone" placeholder="0917-123-4567"></div>
                <div class="form-group"><label>Vehicle Plate</label><input type="text" class="form-control" id="newApptPlate" placeholder="ABC-1234" style="text-transform:uppercase"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Make</label><input type="text" class="form-control" id="newApptMake" placeholder="Toyota"></div>
                <div class="form-group"><label>Model</label><input type="text" class="form-control" id="newApptModel" placeholder="Vios"></div>
            </div>
            <div class="form-group"><label>Services</label>
                <div id="newApptServices" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:200px;overflow-y:auto">
                    ${DataStore.autoServices.map(s => `<label style="display:flex;align-items:center;gap:6px;font-size:13px;padding:4px"><input type="checkbox" value="${s.id}" data-price="${s.price}"> ${s.name} (${Utils.formatCurrency(s.price)})</label>`).join('')}
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Date</label><input type="date" class="form-control" id="newApptDate" value="${new Date().toISOString().split('T')[0]}"></div>
                <div class="form-group"><label>Time</label><input type="time" class="form-control" id="newApptTime" value="09:00"></div>
            </div>
            <div class="form-group"><label>Notes</label><textarea class="form-control" id="newApptNotes" rows="2"></textarea></div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Automotive.saveAppointment()"><i class="fas fa-calendar-plus"></i> Create</button>
        `);
    },

    saveAppointment() {
        const checkboxes = document.querySelectorAll('#newApptServices input:checked');
        const services = Array.from(checkboxes).map(cb => cb.value);
        const total = Array.from(checkboxes).reduce((s, cb) => s + parseFloat(cb.dataset.price || 0), 0);

        if (services.length === 0) { App.showToast('Select at least one service', 'error'); return; }

        const plate = document.getElementById('newApptPlate')?.value?.trim()?.toUpperCase() || '';
        const custId = document.getElementById('newApptCustomer')?.value || '';
        const serviceNames = services.map(id => { const sv = DataStore.autoServices.find(s => s.id === id); return sv?.name || id; });

        DataStore.bookings.push({
            id: Utils.generateId('AC'),
            company: 'autocasa',
            customer: custId || null,
            customerName: document.getElementById('newApptCustName')?.value?.trim() || '',
            customerPhone: document.getElementById('newApptPhone')?.value?.trim() || '',
            services,
            serviceNames,
            vehiclePlate: plate,
            vehicleMake: document.getElementById('newApptMake')?.value?.trim() || '',
            vehicleModel: document.getElementById('newApptModel')?.value?.trim() || '',
            date: document.getElementById('newApptDate')?.value,
            time: document.getElementById('newApptTime')?.value,
            amount: total,
            status: 'confirmed',
            source: 'walk-in',
            notes: document.getElementById('newApptNotes')?.value || '',
            createdAt: new Date().toISOString()
        });

        Database.save();
        App.closeModal();
        App.showToast('Appointment created', 'success');
        this.renderAppointments(document.getElementById('contentArea'));
    }
};
