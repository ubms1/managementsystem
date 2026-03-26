/* ========================================
   UBMS - Wellness Hub Module
   Bookings, Therapists, POS, Membership
   ======================================== */

const Wellness = {
    // ============================================================
    //  BOOKINGS
    // ============================================================
    renderBookings(container) {
        const bookings = DataStore.bookings.filter(b => !b.company || b.company === 'nuatthai');
        const today = new Date().toISOString().split('T')[0];
        const todayBookings = bookings.filter(b => b.date === today);
        const upcoming = bookings.filter(b => b.date >= today);
        const pending = bookings.filter(b => b.status === 'pending' || b.status === 'reschedule-pending');
        const totalRevenue = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.amount || b.total || 0), 0);

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon teal"><i class="fas fa-calendar-check"></i></div></div><div class="stat-value">${todayBookings.length}</div><div class="stat-label">Today's Bookings</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-hourglass-half"></i></div></div><div class="stat-value">${pending.length}</div><div class="stat-label">Pending / Reschedule</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-clock"></i></div></div><div class="stat-value">${upcoming.length}</div><div class="stat-label">Upcoming</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-peso-sign"></i></div></div><div class="stat-value">${Utils.formatCurrency(totalRevenue, true)}</div><div class="stat-label">Revenue</div></div>
        </div>

        ${pending.length > 0 ? `
        <div style="padding:14px 16px;background:#fef3c7;border:1px solid #f59e0b;border-radius:var(--radius);margin-bottom:16px;display:flex;align-items:center;gap:10px">
            <i class="fas fa-bell" style="color:#d97706;font-size:18px"></i>
            <span style="font-size:13px;color:#92400e"><strong>${pending.length} booking(s)</strong> require confirmation or reschedule approval.</span>
            <button class="btn btn-sm" style="margin-left:auto;background:#f59e0b;color:#fff" onclick="document.getElementById('bookStatusFilter').value='pending';Wellness.filterBookings()">View Pending</button>
        </div>` : ''}

        <div class="section-header mb-2">
            <h2>Booking Schedule</h2>
            <div class="section-actions">
                <select class="form-control" style="width:180px" id="bookStatusFilter" onchange="Wellness.filterBookings()">
                    <option value="all">All Bookings</option>
                    <option value="pending">Pending Confirmation</option>
                    <option value="reschedule-pending">Reschedule Requests</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no-show">No Show</option>
                </select>
                <button class="btn btn-secondary" onclick="window.open('nuatthai/booking.html','_blank')" style="font-size:12px"><i class="fas fa-external-link-alt"></i> Online Booking Link</button>
                <button class="btn btn-primary" onclick="Wellness.openNewBooking()"><i class="fas fa-plus"></i> New Booking</button>
            </div>
        </div>

        <div class="card">
            <div class="card-body no-padding" id="bookingsTableContainer">
                ${this.buildBookingsTable(bookings)}
            </div>
        </div>`;
    },

    buildBookingsTable(bookings) {
        return Utils.buildTable(
            [
                { label: 'Date / Time', render: r => `<div><strong>${Utils.formatDate(r.date)}</strong><div style="font-size:11px;color:var(--text-muted)">${r.time}</div></div>` },
                { label: 'Client', render: r => { const c = DataStore.customers.find(cu => cu.id === (r.customer || r.client)); return c ? c.name : (r.customerName || r.customer || r.client || 'Walk-in'); } },
                { label: 'Service', render: r => { const s = DataStore.spaServices.find(sv => sv.id === r.service); return s ? `<div><strong>${s.name}</strong><div style="font-size:11px;color:var(--text-muted)">${s.duration} min</div></div>` : r.service; } },
                { label: 'Therapist', render: r => { const t = DataStore.therapists.find(th => th.id === r.therapist); return t ? t.name : (r.therapist || 'Any'); } },
                { label: 'Branch', render: r => `<span class="badge-tag badge-neutral">${r.branch || 'N/A'}</span>` },
                { label: 'Source', render: r => r.source === 'online' ? `<span class="badge-tag badge-info" style="font-size:10px"><i class="fas fa-globe"></i> Online</span>` : `<span class="badge-tag badge-neutral" style="font-size:10px">Walk-in</span>` },
                { label: 'Amount', render: r => `<strong>${Utils.formatCurrency(r.amount || r.total)}</strong>` },
                { label: 'Status', render: r => `<span class="badge-tag ${Utils.getStatusClass(r.status)}">${r.status}</span>` }
            ],
            bookings,
            {
                actions: (r) => `
                    <button class="btn btn-sm btn-secondary" onclick="Wellness.viewBooking('${r.id}')" title="View"><i class="fas fa-eye"></i></button>
                    ${r.status === 'pending' ? `<button class="btn btn-sm btn-success" style="margin-left:4px" onclick="Wellness.confirmPendingBooking('${r.id}')" title="Confirm"><i class="fas fa-check"></i></button><button class="btn btn-sm btn-danger" style="margin-left:4px" onclick="Wellness.rejectBooking('${r.id}')" title="Reject"><i class="fas fa-times"></i></button>` : ''}
                    ${r.status === 'reschedule-pending' ? `<button class="btn btn-sm btn-success" style="margin-left:4px" onclick="Wellness.approveReschedule('${r.id}')" title="Approve Reschedule"><i class="fas fa-calendar-check"></i></button><button class="btn btn-sm btn-danger" style="margin-left:4px" onclick="Wellness.denyReschedule('${r.id}')" title="Deny Reschedule"><i class="fas fa-calendar-times"></i></button>` : ''}
                    ${r.status === 'confirmed' ? `<button class="btn btn-sm btn-success" style="margin-left:4px" onclick="Wellness.completeBooking('${r.id}')" title="Complete"><i class="fas fa-check-double"></i></button>` : ''}
                `
            }
        );
    },

    filterBookings() {
        const status = document.getElementById('bookStatusFilter')?.value || 'all';
        let bookings = DataStore.bookings.filter(b => !b.company || b.company === 'nuatthai');
        if (status !== 'all') bookings = bookings.filter(b => b.status === status);
        document.getElementById('bookingsTableContainer').innerHTML = this.buildBookingsTable(bookings);
    },

    // ---- Pending / Reschedule Management ----
    confirmPendingBooking(id) {
        const b = DataStore.bookings.find(bk => bk.id === id);
        if (!b) return;
        b.status = 'confirmed';
        b.confirmedAt = new Date().toISOString();
        b.confirmedBy = Auth.getName();
        Database.save();
        App.showToast(`Booking ${id} confirmed`, 'success');
        this.renderBookings(document.getElementById('contentArea'));
        setTimeout(() => this.openConfirmationDialog(id), 400);
    },

    rejectBooking(id) {
        if (!Auth.canEdit()) { App.showToast('You do not have permission to reject bookings', 'error'); return; }
        if (!confirm('Reject this booking? The customer will need to be notified.')) return;
        const b = DataStore.bookings.find(bk => bk.id === id);
        if (!b) return;
        b.status = 'cancelled';
        b.cancelledAt = new Date().toISOString();
        b.cancelledBy = Auth.getName();
        b.cancelReason = 'Rejected by staff';
        Database.save();
        App.showToast(`Booking ${id} rejected`, 'info');
        this.renderBookings(document.getElementById('contentArea'));
    },

    approveReschedule(id) {
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
        App.showToast(`Reschedule approved — updated to ${b.date} at ${b.time}`, 'success');
        this.renderBookings(document.getElementById('contentArea'));
    },

    denyReschedule(id) {
        if (!Auth.canEdit()) { App.showToast('You do not have permission to deny reschedules', 'error'); return; }
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
        App.showToast(`Reschedule denied — keeping original schedule`, 'info');
        this.renderBookings(document.getElementById('contentArea'));
    },

    viewBooking(id) {
        const b = DataStore.bookings.find(bk => bk.id === id);
        if (!b) return;
        const client = DataStore.customers.find(c => c.id === (b.customer || b.client));
        const service = DataStore.spaServices.find(s => s.id === b.service);
        const therapist = DataStore.therapists.find(t => t.id === b.therapist);

        const sentInfo = b.confirmationSentAt
            ? `<div style="margin-top:16px;padding:10px;background:#d4edda;border-radius:var(--radius);font-size:13px"><i class="fas fa-check-circle" style="color:#28a745"></i> Confirmation sent via <strong>${b.confirmationMethod}</strong> on ${new Date(b.confirmationSentAt).toLocaleString()}</div>`
            : '';

        const reschedInfo = b.rescheduleRequest
            ? `<div style="margin-top:16px;padding:12px;background:#fef3c7;border:1px solid #f59e0b;border-radius:var(--radius);font-size:13px">
                <strong style="color:#92400e"><i class="fas fa-calendar-alt"></i> Reschedule Request</strong>
                <div style="margin-top:6px;color:#92400e">New Date: <strong>${Utils.formatDate(b.rescheduleRequest.newDate)}</strong> at <strong>${b.rescheduleRequest.newTime}</strong></div>
                <div style="color:#92400e">Reason: ${b.rescheduleRequest.reason || 'No reason provided'}</div>
               </div>`
            : '';

        const onlineInfo = b.source === 'online'
            ? `<div style="margin-top:16px;padding:10px;background:#e0e7ff;border-radius:var(--radius);font-size:13px"><i class="fas fa-globe" style="color:#4f46e5"></i> Booked online${b.customerPhone ? ' · Phone: <strong>' + b.customerPhone + '</strong>' : ''}${b.customerEmail ? ' · Email: ' + b.customerEmail : ''}</div>`
            : '';

        App.openModal('Booking Details', `
            <div class="grid-2" style="gap:16px;font-size:14px">
                <div><i class="fas fa-hashtag" style="width:20px;color:var(--text-muted)"></i> <strong>${b.id}</strong></div>
                <div><i class="fas fa-calendar" style="width:20px;color:var(--text-muted)"></i> ${Utils.formatDate(b.date)} at ${b.time}</div>
                <div><i class="fas fa-user" style="width:20px;color:var(--text-muted)"></i> ${client?.name || b.customerName || b.customer || b.client || 'Walk-in'}</div>
                <div><i class="fas fa-spa" style="width:20px;color:var(--text-muted)"></i> ${service?.name || b.service}</div>
                <div><i class="fas fa-user-md" style="width:20px;color:var(--text-muted)"></i> ${therapist?.name || b.therapist || 'Any Available'}</div>
                <div><i class="fas fa-store" style="width:20px;color:var(--text-muted)"></i> ${b.branch || 'N/A'}</div>
                <div><i class="fas fa-peso-sign" style="width:20px;color:var(--text-muted)"></i> <strong style="font-size:16px">${Utils.formatCurrency(b.amount || b.total)}</strong></div>
                <div>Status: <span class="badge-tag ${Utils.getStatusClass(b.status)}">${b.status}</span></div>
            </div>
            ${b.notes ? `<div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:var(--radius);font-size:13px"><strong>Notes:</strong> ${b.notes}</div>` : ''}
            ${onlineInfo}
            ${reschedInfo}
            ${sentInfo}
        `, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
            ${b.status === 'pending' ? `<button class="btn btn-success" onclick="App.closeModal();Wellness.confirmPendingBooking('${b.id}')"><i class="fas fa-check"></i> Confirm</button><button class="btn btn-danger" onclick="App.closeModal();Wellness.rejectBooking('${b.id}')"><i class="fas fa-times"></i> Reject</button>` : ''}
            ${b.status === 'reschedule-pending' ? `<button class="btn btn-success" onclick="App.closeModal();Wellness.approveReschedule('${b.id}')"><i class="fas fa-calendar-check"></i> Approve Reschedule</button><button class="btn btn-warning" onclick="App.closeModal();Wellness.denyReschedule('${b.id}')"><i class="fas fa-calendar-times"></i> Deny</button>` : ''}
            ${b.status === 'confirmed' ? `<button class="btn btn-primary" onclick="App.closeModal();Wellness.openConfirmationDialog('${b.id}')"><i class="fas fa-paper-plane"></i> Send Confirmation</button>` : ''}
        `);
    },

    completeBooking(id) {
        const b = DataStore.bookings.find(bk => bk.id === id);
        if (b) { b.status = 'completed'; App.showToast('Booking marked as completed', 'success'); this.renderBookings(document.getElementById('contentArea')); }
    },

    openNewBooking() {
        const branch = (DataStore.companies.nuatthai?.branches || [{ id: 'tuguegarao', name: 'Nuat Thai Tuguegarao' }])[0];

        const html = `
        <form>
            <input type="hidden" id="newBookBranch" value="${branch.id}">
            <div class="form-row">
                <div class="form-group"><label>Client</label>
                    <select class="form-control" id="newBookClient">
                        ${DataStore.customers.filter(c => c.companies?.includes('nuatthai')).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Branch</label>
                    <input type="text" class="form-control" value="${branch.name}" readonly>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Service</label>
                    <select class="form-control" id="newBookService" onchange="Wellness.updateBookingPrice()">
                        ${DataStore.spaServices.map(s => `<option value="${s.id}" data-price="${s.price}" data-duration="${s.duration}">${s.name} (${s.duration}min — ${Utils.formatCurrency(s.price)})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Therapist</label>
                    <select class="form-control" id="newBookTherapist">
                        ${DataStore.therapists.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Date</label><input type="date" class="form-control" id="newBookDate" value="${new Date().toISOString().split('T')[0]}"></div>
                <div class="form-group"><label>Time</label><input type="time" class="form-control" id="newBookTime" value="10:00"></div>
            </div>
            <div class="form-group"><label>Notes</label><textarea class="form-control" id="newBookNotes" rows="2"></textarea></div>
            <div style="padding:12px;background:var(--bg);border-radius:var(--radius);text-align:center">
                <span style="color:var(--text-muted)">Total:</span>
                <span id="newBookTotal" style="font-size:20px;font-weight:700;margin-left:8px;color:var(--secondary)">${Utils.formatCurrency(DataStore.spaServices[0]?.price || 0)}</span>
            </div>
        </form>`;

        App.openModal('New Booking', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Wellness.saveBooking()"><i class="fas fa-calendar-plus"></i> Book</button>
        `);
    },

    updateBookingPrice() {
        const sel = document.getElementById('newBookService');
        const opt = sel.options[sel.selectedIndex];
        const price = parseFloat(opt.dataset.price || 0);
        const el = document.getElementById('newBookTotal');
        if (el) el.textContent = Utils.formatCurrency(price);
    },

    updateTherapistDropdown() {
        const branch = document.getElementById('newBookBranch')?.value;
        const tSelect = document.getElementById('newBookTherapist');
        if (!tSelect) return;
        const therapists = branch ? DataStore.therapists.filter(t => t.branch === branch) : DataStore.therapists;
        tSelect.innerHTML = therapists.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    },

    saveBooking() {
        const sel = document.getElementById('newBookService');
        const opt = sel.options[sel.selectedIndex];
        const price = parseFloat(opt.dataset.price || 0);

        const booking = {
            id: Utils.generateId('BK'),
            customer: document.getElementById('newBookClient').value,
            service: sel.value,
            therapist: document.getElementById('newBookTherapist').value,
            branch: document.getElementById('newBookBranch').value,
            date: document.getElementById('newBookDate').value,
            time: document.getElementById('newBookTime').value,
            amount: price,
            status: 'confirmed',
            notes: document.getElementById('newBookNotes')?.value || '',
            confirmationSentAt: null,
            confirmationMethod: null
        };
        DataStore.bookings.push(booking);

        App.closeModal();
        App.showToast('Booking created', 'success');
        this.renderBookings(document.getElementById('contentArea'));

        // Show confirmation dialog
        setTimeout(() => this.openConfirmationDialog(booking.id), 400);
    },

    // ============================================================
    //  BOOKING CONFIRMATION (SMS / Email)
    // ============================================================
    getBookingConfirmationData(id) {
        const b = DataStore.bookings.find(bk => bk.id === id);
        if (!b) return null;
        const client = DataStore.customers.find(c => c.id === (b.customer || b.client));
        const service = DataStore.spaServices.find(s => s.id === b.service);
        const therapist = DataStore.therapists.find(t => t.id === b.therapist);
        const company = DataStore.companies['nuatthai'];
        return { booking: b, client, service, therapist, company };
    },

    buildConfirmationMessage(id) {
        const d = this.getBookingConfirmationData(id);
        if (!d) return '';
        const { booking, client, service, therapist, company } = d;
        const dateStr = Utils.formatDate(booking.date);
        return `Hi ${client?.name || 'Valued Customer'},\n\nYour booking at ${company?.name || 'Nuat Thai'} is confirmed!\n\nBooking ID: ${booking.id}\nService: ${service?.name || booking.service}\nTherapist: ${therapist?.name || 'TBA'}\nDate: ${dateStr}\nTime: ${booking.time}\nBranch: ${booking.branch}\nTotal: ${Utils.formatCurrency(booking.amount || booking.total)}\n\nPlease arrive 10 minutes before your appointment. For changes or cancellation, contact us at ${company?.phone || '(078) 844-1234'}.\n\nThank you!\n${company?.name || 'Nuat Thai'}`;
    },

    openConfirmationDialog(id) {
        const d = this.getBookingConfirmationData(id);
        if (!d) return;
        const { booking, client, service, therapist, company } = d;
        const dateStr = Utils.formatDate(booking.date);
        const sentBadge = booking.confirmationSentAt
            ? `<div style="padding:10px;background:#d4edda;border-radius:var(--radius);margin-bottom:12px;font-size:13px"><i class="fas fa-check-circle" style="color:#28a745"></i> Confirmation sent via <strong>${booking.confirmationMethod}</strong> on ${new Date(booking.confirmationSentAt).toLocaleString()}</div>`
            : '';

        const html = `
        ${sentBadge}
        <div style="background:var(--bg);border-radius:var(--radius);padding:16px;margin-bottom:16px">
            <div style="font-weight:600;margin-bottom:8px"><i class="fas fa-calendar-check" style="color:var(--secondary)"></i> Booking ${booking.id}</div>
            <div class="grid-2" style="gap:8px;font-size:13px">
                <div><i class="fas fa-user" style="width:16px;color:var(--text-muted)"></i> ${client?.name || booking.customer || booking.client}</div>
                <div><i class="fas fa-spa" style="width:16px;color:var(--text-muted)"></i> ${service?.name || booking.service}</div>
                <div><i class="fas fa-user-md" style="width:16px;color:var(--text-muted)"></i> ${therapist?.name || 'TBA'}</div>
                <div><i class="fas fa-clock" style="width:16px;color:var(--text-muted)"></i> ${dateStr} at ${booking.time}</div>
            </div>
        </div>

        <div style="font-weight:600;margin-bottom:10px"><i class="fas fa-paper-plane"></i> Send Confirmation To Customer</div>
        <div class="grid-2" style="gap:12px">
            <button class="btn btn-primary" onclick="Wellness.sendSMSConfirmation('${booking.id}')" style="width:100%;padding:14px">
                <i class="fas fa-sms" style="font-size:20px"></i><br>
                <span style="font-size:13px;margin-top:4px;display:inline-block">SMS Confirmation</span>
            </button>
            <button class="btn btn-secondary" onclick="Wellness.sendEmailConfirmation('${booking.id}')" style="width:100%;padding:14px;background:var(--info);color:#fff;border-color:var(--info)">
                <i class="fas fa-envelope" style="font-size:20px"></i><br>
                <span style="font-size:13px;margin-top:4px;display:inline-block">Email Confirmation</span>
            </button>
        </div>

        <div style="margin-top:16px">
            <label style="font-weight:600;font-size:13px;margin-bottom:6px;display:block">Message Preview</label>
            <textarea class="form-control" id="confirmMsgPreview" rows="8" style="font-size:12px;font-family:monospace">${this.buildConfirmationMessage(booking.id)}</textarea>
        </div>`;

        App.openModal('Booking Confirmation', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
        `);
    },

    sendSMSConfirmation(id) {
        const d = this.getBookingConfirmationData(id);
        if (!d) return;
        const client = d.client;
        const msg = document.getElementById('confirmMsgPreview')?.value || this.buildConfirmationMessage(id);
        const phone = client?.phone || client?.mobile || '';
        const smsBody = encodeURIComponent(msg);

        // Mark as sent
        const booking = d.booking;
        booking.confirmationSentAt = new Date().toISOString();
        booking.confirmationMethod = 'SMS';

        if (phone) {
            window.open(`sms:${phone}?body=${smsBody}`, '_blank');
        } else {
            // Copy to clipboard fallback
            navigator.clipboard?.writeText(msg);
            App.showToast('No phone number found — message copied to clipboard', 'warning');
        }

        App.showToast('SMS confirmation initiated', 'success');
        App.closeModal();
    },

    sendEmailConfirmation(id) {
        const d = this.getBookingConfirmationData(id);
        if (!d) return;
        const client = d.client;
        const company = d.company;
        const msg = document.getElementById('confirmMsgPreview')?.value || this.buildConfirmationMessage(id);
        const email = client?.email || '';
        const subject = encodeURIComponent(`Booking Confirmation - ${d.booking.id} | ${company?.name || 'Nuat Thai'}`);
        const body = encodeURIComponent(msg);

        // Mark as sent
        const booking = d.booking;
        booking.confirmationSentAt = new Date().toISOString();
        booking.confirmationMethod = 'Email';

        if (email) {
            window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
        } else {
            navigator.clipboard?.writeText(msg);
            App.showToast('No email found — message copied to clipboard', 'warning');
        }

        App.showToast('Email confirmation initiated', 'success');
        App.closeModal();
    },

    // ============================================================
    //  THERAPISTS
    // ============================================================
    renderTherapists(container) {
        const therapists = DataStore.therapists;
        const available = therapists.filter(t => t.status === 'available');

        container.innerHTML = `
        <div class="section-header mb-3">
            <h2>Therapists</h2>
            <button class="btn btn-primary" onclick="Wellness.openAddTherapist()"><i class="fas fa-plus"></i> Add Therapist</button>
        </div>

        <div class="grid-3 mb-3">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon teal"><i class="fas fa-users"></i></div></div><div class="stat-value">${therapists.length}</div><div class="stat-label">Total Therapists</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div></div><div class="stat-value">${available.length}</div><div class="stat-label">Available Now</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-star"></i></div></div><div class="stat-value">${(therapists.reduce((s, t) => s + t.rating, 0) / (therapists.length || 1)).toFixed(1)}</div><div class="stat-label">Avg Rating</div></div>
        </div>

        <div class="grid-3">
            ${therapists.map(t => `
            <div class="card">
                <div class="card-body" style="text-align:center">
                    <div class="avatar avatar-lg" style="margin:0 auto 12px;background:${t.status === 'available' ? 'var(--secondary)' : t.status === 'on-break' ? '#f59e0b' : '#94a3b8'};color:#fff;font-size:20px">
                        ${t.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <h3 style="font-size:16px;margin-bottom:4px">${t.name}</h3>
                    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">${t.branch}</div>
                    <span class="badge-tag ${t.status === 'available' ? 'badge-success' : t.status === 'on-break' ? 'badge-warning' : 'badge-neutral'}" style="margin-bottom:12px">${t.status}</span>
                    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;justify-content:center">
                        ${t.specialties.map(s => `<span class="badge-tag badge-teal" style="font-size:10px">${s}</span>`).join('')}
                    </div>
                    <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
                        <div style="padding:8px;background:var(--bg);border-radius:6px"><div style="color:var(--text-muted)">Rating</div><div style="font-weight:700;color:#f59e0b">★ ${t.rating}</div></div>
                        <div style="padding:8px;background:var(--bg);border-radius:6px"><div style="color:var(--text-muted)">Commission</div><div style="font-weight:700">${t.commissionRate}%</div></div>
                    </div>
                </div>
            </div>
            `).join('')}
        </div>`;
    },

    openAddTherapist() {
        const branch = (DataStore.companies.nuatthai?.branches || [{ id: 'tuguegarao', name: 'Nuat Thai Tuguegarao' }])[0];
        App.openModal('Add Therapist', `
        <form>
            <div class="form-group"><label>Full Name</label><input type="text" class="form-control" id="newThName"></div>
            <div class="form-row">
                <div class="form-group"><label>Branch</label>
                    <input type="hidden" id="newThBranch" value="${branch.id}">
                    <input type="text" class="form-control" value="${branch.name}" readonly>
                </div>
                <div class="form-group"><label>Commission Rate (%)</label><input type="number" class="form-control" id="newThComm" value="40" min="0" max="100"></div>
            </div>
            <div class="form-group"><label>Specialties (comma separated)</label><input type="text" class="form-control" id="newThSpec" placeholder="e.g., Thai, Shiatsu, Swedish"></div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Wellness.saveTherapist()"><i class="fas fa-save"></i> Save</button>
        `);
    },

    saveTherapist() {
        const name = document.getElementById('newThName')?.value;
        if (!name) { App.showToast('Name is required', 'error'); return; }
        DataStore.therapists.push({
            id: Utils.generateId('TH'),
            name,
            branch: document.getElementById('newThBranch').value,
            commissionRate: parseInt(document.getElementById('newThComm')?.value || 40),
            specialties: (document.getElementById('newThSpec')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
            status: 'available',
            rating: 0
        });
        App.closeModal();
        App.showToast('Therapist added', 'success');
        this.renderTherapists(document.getElementById('contentArea'));
    },

    // ============================================================
    //  POS (Point of Sale)
    // ============================================================
    renderPOS(container) {
        container.innerHTML = `
        <div class="grid-2" style="gap:24px;grid-template-columns:1fr 360px">
            <!-- Service Selection -->
            <div>
                <h3 style="margin-bottom:16px"><i class="fas fa-spa" style="color:var(--secondary);margin-right:8px"></i>Select Services</h3>
                <div class="grid-2" style="gap:12px" id="posServicesGrid">
                    ${DataStore.spaServices.map(s => `
                    <div class="card" style="cursor:pointer;transition:all 0.2s" onclick="Wellness.addToCart('${s.id}')" id="posItem-${s.id}">
                        <div class="card-body" style="padding:16px">
                            <div class="flex-between mb-1">
                                <strong style="font-size:14px">${s.name}</strong>
                                <span class="badge-tag badge-${s.category === 'massage' ? 'teal' : s.category === 'body-treatment' ? 'info' : 'neutral'}">${s.category}</span>
                            </div>
                            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">${s.description}</div>
                            <div class="flex-between">
                                <span style="font-size:12px;color:var(--text-muted)">${s.duration} min</span>
                                <span style="font-size:18px;font-weight:700;color:var(--secondary)">${Utils.formatCurrency(s.price)}</span>
                            </div>
                        </div>
                    </div>
                    `).join('')}
                </div>
            </div>

            <!-- Cart -->
            <div>
                <div class="card" style="position:sticky;top:80px">
                    <div class="card-header" style="background:var(--primary);color:#fff"><h3><i class="fas fa-receipt" style="margin-right:8px"></i>Current Transaction</h3></div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>Client</label>
                            <select class="form-control" id="posClient">
                                <option value="">Walk-in</option>
                                ${DataStore.customers.filter(c => c.companies?.includes('nuatthai')).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Therapist</label>
                            <select class="form-control" id="posTherapist">
                                ${DataStore.therapists.filter(t => t.status === 'available').map(t => `<option value="${t.id}">${t.name} (${t.branch})</option>`).join('')}
                            </select>
                        </div>
                        <hr style="margin:16px 0;border-color:var(--border)">
                        <div id="posCartItems" style="min-height:80px"></div>
                        <hr style="margin:16px 0;border-color:var(--border)">
                        <div class="flex-between" style="font-size:18px;font-weight:700;margin-bottom:16px">
                            <span>Total</span>
                            <span id="posTotal" style="color:var(--secondary)">₱0.00</span>
                        </div>
                        <div class="form-group">
                            <label>Payment Method</label>
                            <select class="form-control" id="posPayment">
                                <option value="cash">Cash</option>
                                <option value="gcash">GCash</option>
                                <option value="card">Credit/Debit Card</option>
                                <option value="maya">Maya</option>
                            </select>
                        </div>
                        <button class="btn btn-primary btn-lg" style="width:100%" onclick="Wellness.processPayment()" id="posProceedBtn" disabled>
                            <i class="fas fa-cash-register" style="margin-right:8px"></i>Process Payment
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

        this.posCart = [];
    },

    posCart: [],

    addToCart(serviceId) {
        const service = DataStore.spaServices.find(s => s.id === serviceId);
        if (!service) return;

        const existing = this.posCart.find(i => i.id === serviceId);
        if (existing) {
            existing.qty++;
        } else {
            this.posCart.push({ id: serviceId, name: service.name, price: service.price, qty: 1 });
        }
        this.updateCart();
    },

    removeFromCart(serviceId) {
        this.posCart = this.posCart.filter(i => i.id !== serviceId);
        this.updateCart();
    },

    updateCart() {
        const cartEl = document.getElementById('posCartItems');
        const totalEl = document.getElementById('posTotal');
        const btn = document.getElementById('posProceedBtn');

        if (this.posCart.length === 0) {
            cartEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px"><i class="fas fa-shopping-basket" style="font-size:24px;margin-bottom:8px;display:block"></i>No items</div>';
            totalEl.textContent = '₱0.00';
            btn.disabled = true;
            return;
        }

        const total = this.posCart.reduce((s, i) => s + (i.price * i.qty), 0);
        cartEl.innerHTML = this.posCart.map(i => `
            <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
                <div>
                    <div style="font-weight:500">${i.name}</div>
                    <div style="font-size:12px;color:var(--text-muted)">${Utils.formatCurrency(i.price)} × ${i.qty}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    <strong>${Utils.formatCurrency(i.price * i.qty)}</strong>
                    <button class="btn btn-sm btn-danger" onclick="Wellness.removeFromCart('${i.id}')"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `).join('');

        totalEl.textContent = Utils.formatCurrency(total);
        btn.disabled = false;
    },

    processPayment() {
        if (this.posCart.length === 0) return;
        const total = this.posCart.reduce((s, i) => s + (i.price * i.qty), 0);
        const method = document.getElementById('posPayment')?.value || 'cash';

        App.showToast(`Payment of ${Utils.formatCurrency(total)} via ${method.toUpperCase()} processed successfully!`, 'success');
        this.posCart = [];
        this.updateCart();
    },

    // ============================================================
    //  MEMBERSHIP
    // ============================================================
    renderMembership(container) {
        const memberships = DataStore.memberships;
        const active = memberships.filter(m => m.status === 'active');
        const totalValue = memberships.reduce((s, m) => s + m.price, 0);

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon teal"><i class="fas fa-id-card"></i></div></div><div class="stat-value">${memberships.length}</div><div class="stat-label">Total Members</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div></div><div class="stat-value">${active.length}</div><div class="stat-label">Active</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-peso-sign"></i></div></div><div class="stat-value">${Utils.formatCurrency(totalValue, true)}</div><div class="stat-label">Membership Value</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-percentage"></i></div></div><div class="stat-value">${memberships.length > 0 ? ((active.length / memberships.length) * 100).toFixed(0) : 0}%</div><div class="stat-label">Retention Rate</div></div>
        </div>

        <div class="section-header mb-2">
            <h2>Memberships</h2>
            <button class="btn btn-primary" onclick="Wellness.openNewMembership()"><i class="fas fa-plus"></i> New Membership</button>
        </div>

        <div class="card">
            <div class="card-body no-padding">
                ${Utils.buildTable(
                    [
                        { label: 'Member', render: r => { const c = DataStore.customers.find(cu => cu.id === r.customer); return `<strong>${c?.name || r.customer}</strong>`; } },
                        { label: 'Package', render: r => `<span class="badge-tag badge-teal">${r.package}</span>` },
                        { label: 'Price', render: r => Utils.formatCurrency(r.price) },
                        { label: 'Sessions', render: r => `<div style="display:flex;align-items:center;gap:8px"><div class="progress-bar" style="width:80px"><div class="progress-fill ${r.sessionsUsed >= r.sessionsTotal ? 'red' : 'green'}" style="width:${r.sessionsTotal > 0 ? (r.sessionsUsed / r.sessionsTotal) * 100 : 0}%"></div></div><span style="font-size:12px">${r.sessionsUsed}/${r.sessionsTotal}</span></div>` },
                        { label: 'Valid Until', render: r => Utils.formatDate(r.validUntil) },
                        { label: 'Status', render: r => `<span class="badge-tag ${r.status === 'active' ? 'badge-success' : 'badge-neutral'}">${r.status}</span>` }
                    ],
                    memberships
                )}
            </div>
        </div>

        <div class="section-header mb-2 mt-3">
            <h2>Membership Packages</h2>
            <button class="btn btn-primary" onclick="Wellness.openAddPackage()"><i class="fas fa-plus"></i> Add Package</button>
        </div>

        <div class="grid-3">
            ${(DataStore.membershipPackages || []).filter(p => p.status === 'active').map(p => `
            <div class="card">
                <div class="card-header"><h3>${p.name} Package</h3></div>
                <div class="card-body" style="text-align:center">
                    <div style="font-size:36px;font-weight:800;color:var(--secondary);margin-bottom:4px">₱${p.price.toLocaleString()}</div>
                    <div style="color:var(--text-muted);margin-bottom:16px">per ${p.period}</div>
                    <ul style="text-align:left;font-size:13px;list-style:none;padding:0">
                        ${p.benefits.map((b, i) => `<li style="padding:6px 0;${i < p.benefits.length - 1 ? 'border-bottom:1px solid var(--border)' : ''}"><i class="fas fa-check text-success" style="margin-right:8px"></i>${b}</li>`).join('')}
                    </ul>
                    <div style="margin-top:14px;display:flex;gap:8px;justify-content:center">
                        <button class="btn btn-sm btn-secondary" onclick="Wellness.editPackage('${p.id}')"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="Wellness.deletePackage('${p.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
            `).join('')}
        </div>`;
    },

    // ---- Package CRUD ----
    openAddPackage() {
        App.openModal('Add Membership Package', `
        <form>
            <div class="form-group"><label>Package Name</label><input type="text" class="form-control" id="pkgName" placeholder="e.g., Diamond"></div>
            <div class="form-row">
                <div class="form-group"><label>Price (₱)</label><input type="number" class="form-control" id="pkgPrice" min="0" step="1" value="0"></div>
                <div class="form-group"><label>Sessions per Period</label><input type="number" class="form-control" id="pkgSessions" min="1" value="6"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Sessions Label</label><input type="text" class="form-control" id="pkgSessionsLabel" placeholder="e.g., 6 sessions or Unlimited"></div>
                <div class="form-group"><label>Period</label>
                    <select class="form-control" id="pkgPeriod">
                        <option value="month">Monthly</option>
                        <option value="year">Yearly</option>
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Benefits (one per line)</label><textarea class="form-control" id="pkgBenefits" rows="4" placeholder="Unlimited massage sessions\n20% discount on add-ons"></textarea></div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Wellness.saveNewPackage()"><i class="fas fa-save"></i> Save</button>
        `);
    },

    saveNewPackage() {
        const name = document.getElementById('pkgName')?.value?.trim();
        if (!name) { App.showToast('Package name is required', 'error'); return; }
        const price = parseFloat(document.getElementById('pkgPrice')?.value || 0);
        const sessions = parseInt(document.getElementById('pkgSessions')?.value || 6);
        const sessionsLabel = document.getElementById('pkgSessionsLabel')?.value?.trim() || (sessions + ' sessions');
        const period = document.getElementById('pkgPeriod')?.value || 'month';
        const benefits = (document.getElementById('pkgBenefits')?.value || '').split('\n').map(b => b.trim()).filter(Boolean);

        if (!DataStore.membershipPackages) DataStore.membershipPackages = [];
        DataStore.membershipPackages.push({
            id: Utils.generateId('PKG'),
            name, price, sessions, sessionsLabel, period, benefits, status: 'active'
        });
        Database.save();
        App.closeModal();
        App.showToast('Package added', 'success');
        this.renderMembership(document.getElementById('contentArea'));
    },

    editPackage(id) {
        const pkg = (DataStore.membershipPackages || []).find(p => p.id === id);
        if (!pkg) return;
        App.openModal('Edit Package — ' + pkg.name, `
        <form>
            <div class="form-group"><label>Package Name</label><input type="text" class="form-control" id="pkgName" value="${pkg.name}"></div>
            <div class="form-row">
                <div class="form-group"><label>Price (₱)</label><input type="number" class="form-control" id="pkgPrice" min="0" step="1" value="${pkg.price}"></div>
                <div class="form-group"><label>Sessions per Period</label><input type="number" class="form-control" id="pkgSessions" min="1" value="${pkg.sessions}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Sessions Label</label><input type="text" class="form-control" id="pkgSessionsLabel" value="${pkg.sessionsLabel || ''}"></div>
                <div class="form-group"><label>Period</label>
                    <select class="form-control" id="pkgPeriod">
                        <option value="month" ${pkg.period === 'month' ? 'selected' : ''}>Monthly</option>
                        <option value="year" ${pkg.period === 'year' ? 'selected' : ''}>Yearly</option>
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Benefits (one per line)</label><textarea class="form-control" id="pkgBenefits" rows="4">${(pkg.benefits || []).join('\n')}</textarea></div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Wellness.saveEditPackage('${id}')"><i class="fas fa-save"></i> Update</button>
        `);
    },

    saveEditPackage(id) {
        const pkg = (DataStore.membershipPackages || []).find(p => p.id === id);
        if (!pkg) return;
        const name = document.getElementById('pkgName')?.value?.trim();
        if (!name) { App.showToast('Package name is required', 'error'); return; }
        pkg.name = name;
        pkg.price = parseFloat(document.getElementById('pkgPrice')?.value || 0);
        pkg.sessions = parseInt(document.getElementById('pkgSessions')?.value || 6);
        pkg.sessionsLabel = document.getElementById('pkgSessionsLabel')?.value?.trim() || (pkg.sessions + ' sessions');
        pkg.period = document.getElementById('pkgPeriod')?.value || 'month';
        pkg.benefits = (document.getElementById('pkgBenefits')?.value || '').split('\n').map(b => b.trim()).filter(Boolean);
        Database.save();
        App.closeModal();
        App.showToast('Package updated', 'success');
        this.renderMembership(document.getElementById('contentArea'));
    },

    deletePackage(id) {
        if (!confirm('Delete this membership package?')) return;
        DataStore.membershipPackages = (DataStore.membershipPackages || []).filter(p => p.id !== id);
        Database.save();
        App.showToast('Package deleted', 'success');
        this.renderMembership(document.getElementById('contentArea'));
    },

    openNewMembership() {
        const packages = (DataStore.membershipPackages || []).filter(p => p.status === 'active');
        if (packages.length === 0) { App.showToast('No membership packages available. Add a package first.', 'warning'); return; }
        App.openModal('New Membership', `
        <form>
            <div class="form-group"><label>Client</label>
                <select class="form-control" id="newMemClient">
                    ${DataStore.customers.filter(c => c.companies?.includes('nuatthai')).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Package</label>
                <select class="form-control" id="newMemPackage" onchange="Wellness.updateMemPrice()">
                    ${packages.map(p => `<option value="${p.name}" data-price="${p.price}" data-sessions="${p.sessions}">${p.name} — ₱${p.price.toLocaleString()}/mo (${p.sessionsLabel})</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Valid Until</label><input type="date" class="form-control" id="newMemExpiry"></div>
        </form>`, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Wellness.saveMembership()"><i class="fas fa-save"></i> Create</button>
        `);
    },

    saveMembership() {
        const sel = document.getElementById('newMemPackage');
        const opt = sel.options[sel.selectedIndex];
        DataStore.memberships.push({
            id: Utils.generateId('MEM'),
            customer: document.getElementById('newMemClient').value,
            package: sel.value,
            price: parseFloat(opt.dataset.price),
            sessionsTotal: parseInt(opt.dataset.sessions),
            sessionsUsed: 0,
            validUntil: document.getElementById('newMemExpiry')?.value || '',
            status: 'active'
        });
        App.closeModal();
        App.showToast('Membership created', 'success');
        this.renderMembership(document.getElementById('contentArea'));
    },

    updateMemPrice() {
        // Updates display when package selection changes in membership form
        // Prices are already shown in the dropdown text, so this is a no-op hook
        // for future price field integration
    },

    // ============================================================
    //  SPA INVENTORY MANAGEMENT
    // ============================================================
    renderSpaInventory(container) {
        const items = DataStore.spaInventory;

        const totalItems = items.length;
        const lowStock = items.filter(i => i.quantity <= i.reorderLevel);
        const totalValue = items.reduce((s, i) => s + (i.quantity * (i.unitCost || 0)), 0);

        container.innerHTML = `
        <div class="grid-4 mb-3">
            <div class="stat-card"><div class="stat-header"><div class="stat-icon teal"><i class="fas fa-boxes-stacked"></i></div></div><div class="stat-value">${totalItems}</div><div class="stat-label">Total Items</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon orange"><i class="fas fa-exclamation-circle"></i></div></div><div class="stat-value">${lowStock.length}</div><div class="stat-label">Low Stock Alerts</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon green"><i class="fas fa-peso-sign"></i></div></div><div class="stat-value">${Utils.formatCurrency(totalValue)}</div><div class="stat-label">Inventory Value</div></div>
            <div class="stat-card"><div class="stat-header"><div class="stat-icon blue"><i class="fas fa-tags"></i></div></div><div class="stat-value">${[...new Set(items.map(i => i.category))].length}</div><div class="stat-label">Categories</div></div>
        </div>

        <div class="section-header mb-2">
            <h2>Spa Inventory</h2>
            <div class="section-actions">
                <select class="form-control" style="width:160px" id="spaInvCategoryFilter" onchange="Wellness.filterSpaInventory()">
                    <option value="all">All Categories</option>
                    <option value="Massage Oil">Massage Oil</option>
                    <option value="Essential Oil">Essential Oil</option>
                    <option value="Towel/Linen">Towel / Linen</option>
                    <option value="Skincare Product">Skincare Product</option>
                    <option value="Consumable">Consumable</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Other">Other</option>
                </select>
                <button class="btn btn-primary" onclick="Wellness.openAddSpaItem()"><i class="fas fa-plus"></i> Add Item</button>
            </div>
        </div>

        ${lowStock.length > 0 ? `
        <div class="alert alert-warning mb-2" style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:#fff3cd;border:1px solid #ffc107;border-radius:var(--radius)">
            <i class="fas fa-exclamation-triangle" style="color:#e67e22;font-size:18px"></i>
            <div><strong>Low Stock Alert:</strong> ${lowStock.map(i => i.name).join(', ')} — below reorder level.</div>
        </div>` : ''}

        <div class="card">
            <div class="card-body no-padding" id="spaInventoryTableContainer">
                ${this.buildSpaInventoryTable(items)}
            </div>
        </div>`;
    },

    buildSpaInventoryTable(items) {
        if (items.length === 0) {
            return '<div class="empty-state"><i class="fas fa-boxes-stacked"></i><h3>No Inventory Items</h3><p>Add your first spa supply or product to track stock levels.</p></div>';
        }
        return Utils.buildTable(
            [
                { label: 'Item', render: r => `<div><strong>${r.name}</strong><div style="font-size:11px;color:var(--text-muted)">${r.sku || r.id}</div></div>` },
                { label: 'Category', render: r => `<span class="badge-tag badge-neutral">${r.category}</span>` },
                { label: 'Qty', render: r => {
                    const isLow = r.quantity <= r.reorderLevel;
                    return `<span style="font-weight:700;color:${isLow ? 'var(--danger)' : 'var(--text)'}">${r.quantity}</span> <span style="font-size:11px;color:var(--text-muted)">${r.unit || 'pcs'}</span>`;
                }},
                { label: 'Reorder Lvl', render: r => r.reorderLevel },
                { label: 'Unit Cost', render: r => Utils.formatCurrency(r.unitCost || 0) },
                { label: 'Total Value', render: r => Utils.formatCurrency(r.quantity * (r.unitCost || 0)) },
                { label: 'Supplier', key: 'supplier' },
                { label: 'Status', render: r => {
                    if (r.quantity <= 0) return '<span class="badge-tag badge-danger">Out of Stock</span>';
                    if (r.quantity <= r.reorderLevel) return '<span class="badge-tag badge-warning">Low Stock</span>';
                    return '<span class="badge-tag badge-success">In Stock</span>';
                }}
            ],
            items,
            {
                actions: (r) => `
                    <button class="btn btn-sm btn-secondary" onclick="Wellness.adjustSpaStock('${r.id}')"><i class="fas fa-sliders-h"></i></button>
                `
            }
        );
    },

    filterSpaInventory() {
        const cat = document.getElementById('spaInvCategoryFilter')?.value || 'all';
        let items = DataStore.spaInventory;
        if (cat !== 'all') items = items.filter(i => i.category === cat);
        document.getElementById('spaInventoryTableContainer').innerHTML = this.buildSpaInventoryTable(items);
    },

    adjustSpaStock(id) {
        const item = DataStore.spaInventory.find(i => i.id === id);
        if (!item) return;
        App.openModal(`Adjust Stock — ${item.name}`, `
            <div style="margin-bottom:16px;padding:12px;background:var(--bg);border-radius:var(--radius)">
                <div style="font-size:13px;color:var(--text-muted)">Current Quantity</div>
                <div style="font-size:28px;font-weight:700">${item.quantity} <span style="font-size:14px;font-weight:400;color:var(--text-muted)">${item.unit || 'pcs'}</span></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Action</label>
                    <select class="form-control" id="spaStockAction">
                        <option value="add">Add Stock (received)</option>
                        <option value="remove">Remove Stock (used)</option>
                        <option value="set">Set Exact Quantity</option>
                    </select>
                </div>
                <div class="form-group"><label>Quantity</label>
                    <input type="number" class="form-control" id="spaStockQty" min="0" value="0">
                </div>
            </div>
            <div class="form-group"><label>Notes</label><input type="text" class="form-control" id="spaStockNotes" placeholder="Reason for adjustment..."></div>
        `, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Wellness.saveSpaStockAdjust('${id}')"><i class="fas fa-check"></i> Update</button>
        `);
    },

    saveSpaStockAdjust(id) {
        const action = document.getElementById('spaStockAction')?.value;
        const qty = parseInt(document.getElementById('spaStockQty')?.value || 0);
        const item = DataStore.spaInventory.find(i => i.id === id);
        if (!item) return;

        let newQty = item.quantity;
        if (action === 'add') newQty += qty;
        else if (action === 'remove') newQty = Math.max(0, newQty - qty);
        else if (action === 'set') newQty = qty;

        Database.updateSpaInventory(id, { quantity: newQty });
        App.closeModal();
        App.showToast('Stock updated', 'success');
        this.renderSpaInventory(document.getElementById('contentArea'));
    },

    openAddSpaItem() {
        const html = `
        <form>
            <div class="form-row">
                <div class="form-group"><label>Item Name</label><input type="text" class="form-control" id="newSpaItemName" placeholder="e.g., Lavender Massage Oil"></div>
                <div class="form-group"><label>SKU</label><input type="text" class="form-control" id="newSpaItemSku" placeholder="Optional"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Category</label>
                    <select class="form-control" id="newSpaItemCategory">
                        <option value="Massage Oil">Massage Oil</option>
                        <option value="Essential Oil">Essential Oil</option>
                        <option value="Towel/Linen">Towel / Linen</option>
                        <option value="Skincare Product">Skincare Product</option>
                        <option value="Consumable">Consumable</option>
                        <option value="Equipment">Equipment</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group"><label>Unit</label>
                    <select class="form-control" id="newSpaItemUnit">
                        <option value="pcs">Pieces</option>
                        <option value="bottles">Bottles</option>
                        <option value="liters">Liters</option>
                        <option value="kg">Kilograms</option>
                        <option value="sets">Sets</option>
                        <option value="packs">Packs</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Initial Quantity</label><input type="number" class="form-control" id="newSpaItemQty" min="0" value="0"></div>
                <div class="form-group"><label>Reorder Level</label><input type="number" class="form-control" id="newSpaItemReorder" min="0" value="5"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Unit Cost (₱)</label><input type="number" class="form-control" id="newSpaItemCost" min="0" step="0.01" value="0"></div>
                <div class="form-group"><label>Supplier</label><input type="text" class="form-control" id="newSpaItemSupplier" placeholder="Supplier name"></div>
            </div>
        </form>`;

        App.openModal('Add Spa Inventory Item', html, `
            <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Wellness.saveSpaItem()"><i class="fas fa-save"></i> Save</button>
        `);
    },

    saveSpaItem() {
        const name = document.getElementById('newSpaItemName')?.value;
        if (!name) { App.showToast('Item name is required', 'error'); return; }

        Database.addSpaInventoryItem({
            name,
            sku: document.getElementById('newSpaItemSku')?.value || '',
            category: document.getElementById('newSpaItemCategory').value,
            unit: document.getElementById('newSpaItemUnit').value,
            quantity: parseInt(document.getElementById('newSpaItemQty')?.value || 0),
            reorderLevel: parseInt(document.getElementById('newSpaItemReorder')?.value || 5),
            unitCost: parseFloat(document.getElementById('newSpaItemCost')?.value || 0),
            supplier: document.getElementById('newSpaItemSupplier')?.value || ''
        });

        App.closeModal();
        App.showToast('Inventory item added', 'success');
        this.renderSpaInventory(document.getElementById('contentArea'));
    }
};
