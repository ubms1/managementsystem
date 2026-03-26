/* ========================================
   UBMS - Sync & Offline System
   - IndexedDB offline queue for durability
   - SSE for real-time cross-user sync
   - Auto-sync on reconnection
   - Wraps all Database CRUD methods
   ======================================== */

const SyncManager = {
    DB_NAME: 'ubms_sync',
    DB_VERSION: 1,
    STORE_NAME: 'offline_queue',
    META_STORE: 'sync_meta',

    db: null,
    sseConnection: null,
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTimestamp: null,
    syncInterval: null,
    reconnectTimeout: null,
    _initialized: false,

    // ---- Initialize ----
    async init() {
        if (this._initialized) return;
        this._initialized = true;

        await this.openDB();
        this.lastSyncTimestamp = (await this.getMeta('lastSyncTimestamp')) || new Date(0).toISOString();

        window.addEventListener('online', () => this.onOnline());
        window.addEventListener('offline', () => this.onOffline());

        if (navigator.onLine) {
            this.connectSSE();
            this.pullChanges();
        }

        // Periodic sync every 60s
        this.syncInterval = setInterval(() => {
            if (navigator.onLine && !this.isSyncing) {
                this.syncOfflineQueue();
            }
        }, 60000);

        this.updateConnectionStatus(navigator.onLine);
        console.log('✓ SyncManager initialized');
    },

    // ============================================
    //  IndexedDB
    // ============================================
    openDB() {
        return new Promise((resolve) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp');
                    store.createIndex('synced', 'synced');
                }
                if (!db.objectStoreNames.contains(this.META_STORE)) {
                    db.createObjectStore(this.META_STORE, { keyPath: 'key' });
                }
            };

            request.onsuccess = (e) => { this.db = e.target.result; resolve(); };
            request.onerror = () => resolve();
        });
    },

    async getMeta(key) {
        if (!this.db) return null;
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(this.META_STORE, 'readonly');
                const req = tx.objectStore(this.META_STORE).get(key);
                req.onsuccess = () => resolve(req.result?.value || null);
                req.onerror = () => resolve(null);
            } catch { resolve(null); }
        });
    },

    async setMeta(key, value) {
        if (!this.db) return;
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(this.META_STORE, 'readwrite');
                tx.objectStore(this.META_STORE).put({ key, value });
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            } catch { resolve(); }
        });
    },

    async queueChange(change) {
        if (!this.db) return;
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
                tx.objectStore(this.STORE_NAME).put({ ...change, synced: false });
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            } catch { resolve(); }
        });
    },

    async getUnsyncedChanges() {
        if (!this.db) return [];
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(this.STORE_NAME, 'readonly');
                const idx = tx.objectStore(this.STORE_NAME).index('synced');
                const req = idx.getAll(IDBKeyRange.only(false));
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            } catch { resolve([]); }
        });
    },

    async markSynced(ids) {
        if (!this.db || !ids.length) return;
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
                const store = tx.objectStore(this.STORE_NAME);
                for (const id of ids) {
                    const req = store.get(id);
                    req.onsuccess = () => {
                        if (req.result) {
                            req.result.synced = true;
                            store.put(req.result);
                        }
                    };
                }
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            } catch { resolve(); }
        });
    },

    async cleanupSynced() {
        if (!this.db) return;
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
                const store = tx.objectStore(this.STORE_NAME);
                const req = store.openCursor();
                req.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        if (cursor.value.synced && cursor.value.timestamp < cutoff) {
                            cursor.delete();
                        }
                        cursor.continue();
                    }
                };
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            } catch { resolve(); }
        });
    },

    // ============================================
    //  Change Tracking
    // ============================================
    async trackChange(entityType, operation, entityId, data, business) {
        const session = JSON.parse(localStorage.getItem('ubms_session') || '{}');
        const change = {
            id: 'CHG-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11),
            entityType,
            operation,
            entityId,
            data: data ? JSON.parse(JSON.stringify(data)) : null, // deep clone
            business: business || session.company || 'all',
            userId: session.userId || session.id || 'system',
            timestamp: new Date().toISOString()
        };

        await this.queueChange(change);

        if (navigator.onLine) {
            try {
                const response = await fetch(`${API_BASE_URL}/sync/changes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(change)
                });
                if (response.ok) {
                    await this.markSynced([change.id]);
                }
            } catch {
                // Will sync later
            }
        }

        return change;
    },

    // ============================================
    //  Offline Queue Sync
    // ============================================
    async syncOfflineQueue() {
        if (this.isSyncing || !navigator.onLine) return;
        this.isSyncing = true;

        try {
            const unsynced = await this.getUnsyncedChanges();
            if (unsynced.length === 0) { this.isSyncing = false; return; }

            console.log(`Syncing ${unsynced.length} offline changes...`);

            const batchSize = 50;
            for (let i = 0; i < unsynced.length; i += batchSize) {
                const batch = unsynced.slice(i, i + batchSize);
                try {
                    const response = await fetch(`${API_BASE_URL}/sync/bulk`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ changes: batch })
                    });
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success) {
                            await this.markSynced(batch.map(c => c.id));
                        }
                    }
                } catch {
                    break; // Network down, stop
                }
            }

            await this.cleanupSynced();

            if (typeof Database !== 'undefined' && Database.addNotification) {
                Database.addNotification('success', 'fa-sync', 'Sync Complete', `${unsynced.length} offline change(s) synced to server`);
            }
            window.dispatchEvent(new CustomEvent('ubms-sync-complete', { detail: { count: unsynced.length } }));
        } catch (e) {
            console.error('Sync error:', e);
        } finally {
            this.isSyncing = false;
        }
    },

    // ============================================
    //  Pull Changes from Server
    // ============================================
    async pullChanges() {
        if (!navigator.onLine) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/sync/changes/${encodeURIComponent(this.lastSyncTimestamp)}`,
                { signal: AbortSignal.timeout(10000) }
            );
            if (!response.ok) return;

            const result = await response.json();
            if (result.success && result.changes && result.changes.length > 0) {
                const session = JSON.parse(localStorage.getItem('ubms_session') || '{}');
                const myUserId = session.userId || session.id;

                let applied = 0;
                for (const change of result.changes) {
                    if (change.userId !== myUserId) {
                        this.applyChange(change);
                        applied++;
                    }
                }

                const lastChange = result.changes[result.changes.length - 1];
                this.lastSyncTimestamp = lastChange.timestamp;
                await this.setMeta('lastSyncTimestamp', this.lastSyncTimestamp);

                if (applied > 0) {
                    console.log(`Applied ${applied} remote changes`);
                }
            }
        } catch {
            // Will retry on next interval
        }
    },

    // ============================================
    //  Apply Remote Change to Local DataStore
    // ============================================
    applyChange(change) {
        try {
            const { entityType, operation, entityId, data } = change;
            if (!entityType || typeof DataStore === 'undefined') return;

            if (!DataStore[entityType]) {
                if (operation === 'add') DataStore[entityType] = [];
                else return;
            }

            if (!Array.isArray(DataStore[entityType])) return;

            switch (operation) {
                case 'add':
                    if (!DataStore[entityType].find(item => item.id === entityId)) {
                        DataStore[entityType].push(data);
                    }
                    break;

                case 'update': {
                    const idx = DataStore[entityType].findIndex(item => item.id === entityId);
                    if (idx >= 0) {
                        Object.assign(DataStore[entityType][idx], data);
                    } else if (data) {
                        DataStore[entityType].push(data);
                    }
                    break;
                }

                case 'delete':
                    DataStore[entityType] = DataStore[entityType].filter(item => item.id !== entityId);
                    break;
            }

            // Save to localStorage without triggering sync
            if (typeof Database !== 'undefined' && Database._saveLocal) {
                Database._saveLocal();
            }

            // Notify UI
            window.dispatchEvent(new CustomEvent('ubms-data-changed', {
                detail: { entityType, operation, entityId, source: 'remote', userId: change.userId }
            }));
        } catch (e) {
            console.error('Error applying change:', e);
        }
    },

    // ============================================
    //  SSE Connection
    // ============================================
    connectSSE() {
        if (this.sseConnection) {
            this.sseConnection.close();
            this.sseConnection = null;
        }

        const session = JSON.parse(localStorage.getItem('ubms_session') || '{}');
        const userId = encodeURIComponent(session.userId || session.id || 'anonymous');
        const business = encodeURIComponent(session.company || 'all');

        try {
            this.sseConnection = new EventSource(
                `${API_BASE_URL}/sync/stream?userId=${userId}&business=${business}`
            );

            this.sseConnection.onopen = () => {
                console.log('SSE connected');
                this.updateConnectionStatus(true);
            };

            this.sseConnection.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'change') {
                        this.applyChange(msg.change);
                    }
                } catch { /* heartbeat or parse error */ }
            };

            this.sseConnection.onerror = () => {
                this.sseConnection.close();
                this.sseConnection = null;
                if (navigator.onLine) {
                    this.reconnectTimeout = setTimeout(() => this.connectSSE(), 5000);
                }
            };
        } catch (e) {
            console.error('SSE connection failed:', e);
        }
    },

    // ============================================
    //  Online / Offline Handlers
    // ============================================
    onOnline() {
        console.log('Back online');
        this.isOnline = true;
        this.updateConnectionStatus(true);

        setTimeout(() => this.syncOfflineQueue(), 1000);
        setTimeout(() => this.pullChanges(), 2000);
        setTimeout(() => this.connectSSE(), 3000);
    },

    onOffline() {
        console.log('Gone offline');
        this.isOnline = false;
        this.updateConnectionStatus(false);

        if (this.sseConnection) {
            this.sseConnection.close();
            this.sseConnection = null;
        }
    },

    // ============================================
    //  UI Status
    // ============================================
    updateConnectionStatus(online) {
        const indicator = document.getElementById('sync-status');
        if (indicator) {
            indicator.className = 'sync-indicator ' + (online ? 'sync-online' : 'sync-offline');
            indicator.title = online ? 'Connected - changes sync in real-time' : 'Offline - changes will sync when reconnected';
            indicator.innerHTML = online
                ? '<i class="fas fa-wifi"></i> Online'
                : '<i class="fas fa-wifi-slash"></i> Offline';
        }

        window.dispatchEvent(new CustomEvent('ubms-connection-status', { detail: { online } }));
    },

    destroy() {
        if (this.sseConnection) this.sseConnection.close();
        if (this.syncInterval) clearInterval(this.syncInterval);
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    }
};

// ============================================
//  Add _saveLocal to Database (localStorage only, no sync)
// ============================================
if (typeof Database !== 'undefined') {
    Database._saveLocal = Database.save;
}

// ============================================
//  Wrap Database CRUD Methods for Change Tracking
// ============================================
(function initSyncWrappers() {
    if (typeof Database === 'undefined' || typeof DataStore === 'undefined') return;

    function wrapAdd(method, entityType) {
        const original = Database[method];
        if (!original) return;
        Database[method] = function (...args) {
            const result = original.apply(this, args);
            if (result && result.id) {
                SyncManager.trackChange(entityType, 'add', result.id, result, result.company);
            }
            return result;
        };
    }

    function wrapUpdate(method, entityType) {
        const original = Database[method];
        if (!original) return;
        Database[method] = function (id, updates, ...rest) {
            const result = original.apply(this, [id, updates, ...rest]);
            const entity = DataStore[entityType] && DataStore[entityType].find(item => item.id === id);
            SyncManager.trackChange(entityType, 'update', id, entity || updates, entity && entity.company);
            return result;
        };
    }

    function wrapDelete(method, entityType) {
        const original = Database[method];
        if (!original) return;
        Database[method] = function (id) {
            const result = original.apply(this, [id]);
            SyncManager.trackChange(entityType, 'delete', id, null);
            return result;
        };
    }

    // ---- Add methods ----
    wrapAdd('addCustomer', 'customers');
    wrapAdd('addInvoice', 'invoices');
    wrapAdd('addExpense', 'expenses');
    wrapAdd('addProject', 'projects');
    wrapAdd('addBooking', 'bookings');
    wrapAdd('addJobCard', 'jobCards');
    wrapAdd('addVehicle', 'vehicles');
    wrapAdd('addPart', 'autoParts');
    wrapAdd('addMembership', 'memberships');
    wrapAdd('addSubcontractor', 'subcontractors');
    wrapAdd('saveInspection', 'inspections');
    wrapAdd('addEquipment', 'equipment');
    wrapAdd('addSafetyRecord', 'safetyRecords');
    wrapAdd('addDocument', 'documents');
    wrapAdd('addSpaInventoryItem', 'spaInventory');
    wrapAdd('addEstimate', 'estimates');
    wrapAdd('addBirInvoice', 'birInvoices');
    wrapAdd('addEmployee', 'employees');
    wrapAdd('addPayslip', 'payslips');
    wrapAdd('addInventoryItem', 'inventoryItems');
    wrapAdd('addInventoryTransaction', 'inventoryTransactions');
    wrapAdd('addPerformanceReview', 'performanceReviews');
    wrapAdd('addTimesheet', 'timesheets');
    wrapAdd('addIncidentReport', 'incidentReports');

    // ---- Update methods ----
    wrapUpdate('updateCustomer', 'customers');
    wrapUpdate('updateInvoice', 'invoices');
    wrapUpdate('updateProject', 'projects');
    wrapUpdate('updateBooking', 'bookings');
    wrapUpdate('updateJobCard', 'jobCards');
    wrapUpdate('updateTherapist', 'therapists');
    wrapUpdate('updateEquipment', 'equipment');
    wrapUpdate('updateSafetyRecord', 'safetyRecords');
    wrapUpdate('updateDocument', 'documents');
    wrapUpdate('updateSpaInventory', 'spaInventory');
    wrapUpdate('updateEstimate', 'estimates');
    wrapUpdate('updateBirInvoice', 'birInvoices');
    wrapUpdate('updateEmployee', 'employees');
    wrapUpdate('updatePayslip', 'payslips');
    wrapUpdate('updateInventoryItem', 'inventoryItems');
    wrapUpdate('updatePerformanceReview', 'performanceReviews');
    wrapUpdate('updateTimesheet', 'timesheets');
    wrapUpdate('updateIncidentReport', 'incidentReports');

    // ---- Delete methods ----
    wrapDelete('deleteCustomer', 'customers');
    wrapDelete('deleteEquipment', 'equipment');
    wrapDelete('deleteDocument', 'documents');
    wrapDelete('deleteBirInvoice', 'birInvoices');
    wrapDelete('deleteEmployee', 'employees');
    wrapDelete('deleteInventoryItem', 'inventoryItems');
    wrapDelete('deletePerformanceReview', 'performanceReviews');
    wrapDelete('deleteTimesheet', 'timesheets');
    wrapDelete('deleteIncidentReport', 'incidentReports');

    // ---- Special methods ----
    const origRecordPayment = Database.recordPayment;
    if (origRecordPayment) {
        Database.recordPayment = function (invoiceId, amount) {
            origRecordPayment.apply(this, [invoiceId, amount]);
            const inv = DataStore.invoices.find(i => i.id === invoiceId);
            SyncManager.trackChange('invoices', 'update', invoiceId, inv, inv && inv.company);
        };
    }

    const origUpdatePartStock = Database.updatePartStock;
    if (origUpdatePartStock) {
        Database.updatePartStock = function (partId, quantityChange) {
            origUpdatePartStock.apply(this, [partId, quantityChange]);
            const part = DataStore.autoParts.find(p => p.id === partId);
            SyncManager.trackChange('autoParts', 'update', partId, part);
        };
    }

    const origProcessTransaction = Database.processTransaction;
    if (origProcessTransaction) {
        Database.processTransaction = function (transaction) {
            const result = origProcessTransaction.apply(this, [transaction]);
            if (result) {
                SyncManager.trackChange('invoices', 'add', result.id, result, 'nuatthai');
            }
            return result;
        };
    }

    const origConvertEstimateToJob = Database.convertEstimateToJob;
    if (origConvertEstimateToJob) {
        Database.convertEstimateToJob = function (estimateId) {
            const result = origConvertEstimateToJob.apply(this, [estimateId]);
            const est = DataStore.estimates.find(e => e.id === estimateId);
            SyncManager.trackChange('estimates', 'update', estimateId, est, 'autocasa');
            if (result) {
                SyncManager.trackChange('jobCards', 'add', result.id, result, 'autocasa');
            }
            return result;
        };
    }
})();

// ============================================
//  Auto-initialize SyncManager when DOM is ready
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SyncManager.init());
} else {
    SyncManager.init();
}
