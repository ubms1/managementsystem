/* ========================================
   UBMS - Service Worker
   Caches static assets for offline use
   Network-first for API, cache-first for assets
   ======================================== */

const CACHE_NAME = 'ubms-cache-v1';
const STATIC_ASSETS = [
    '/',
    '/login',
    '/login.html',
    '/index.html',
    '/timeinout',
    '/timeinout.html',
    '/css/main.css',
    '/css/components.css',
    '/js/utils.js',
    '/js/data.js',
    '/js/db.js',
    '/js/sync.js',
    '/js/auth.js',
    '/js/app.js',
    '/js/dashboard.js',
    '/js/crm.js',
    '/js/financial.js',
    '/js/construction.js',
    '/js/wellness.js',
    '/js/automotive.js',
    '/js/reports.js',
    '/js/settings.js',
    '/js/admin.js',
    '/js/invoicing.js',
    '/js/payroll.js',
    '/js/inventory.js',
    '/js/pos.js',
    '/js/iso.js',
    '/js/financialanalysis.js',
    '/js/importexport.js'
];

// Install - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
            .catch(err => {
                console.error('SW install error:', err);
                return self.skipWaiting();
            })
    );
});

// Activate - clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names =>
            Promise.all(
                names
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch - network-first for API, cache-first for static
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip SSE streams
    if (url.pathname.includes('/api/sync/stream')) return;

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // API requests: network-first
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return new Response(
                        JSON.stringify({ success: false, offline: true, error: 'You are offline' }),
                        { status: 503, headers: { 'Content-Type': 'application/json' } }
                    );
                })
        );
        return;
    }

    // Static assets: cache-first, then network
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) {
                // Return cached version, update cache in background
                fetch(event.request).then(response => {
                    if (response && response.ok) {
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, response);
                        });
                    }
                }).catch(() => {});
                return cached;
            }
            // Not in cache - fetch from network and cache it
            return fetch(event.request).then(response => {
                if (response && response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(() => {
                // Return offline fallback for HTML pages
                if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('/');
                }
                return new Response('Offline', { status: 503 });
            });
        })
    );
});
