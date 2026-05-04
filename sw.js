// =============================================
// SERVICE WORKER - AUTO-UPDATE
// =============================================

const CACHE_NAME = 'tienda-barrio-v5';
const VERSION = '5';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './offline.html',
    './manifest.json',
    './css/login.css',
    './css/ventas.css',
    './css/menu.css',
    './css/inventario.css',
    './css/gastos.css',
    './css/fiao.css',
    './css/reportes.css',
    './css/dashboard.css',
    './js/config.js',
    './js/login.js',
    './js/ventas.js',
    './js/inventario.js',
    './js/gastos.js',
    './js/fiao.js',
    './js/reportes.js',
    './js/dashboard.js',
    './js/sync.js',
    './pages/ventas.html',
    './pages/inventario.html',
    './pages/gastos.html',
    './pages/fiao.html',
    './pages/reportes.html',
    './pages/dashboard.html'
];

// Instalar
self.addEventListener('install', (event) => {
    console.log('🟢 SW v' + VERSION + ' instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => {
            return self.skipWaiting(); // Activar inmediatamente
        })
    );
});

// Activar - limpiar caches viejos y notificar actualización
self.addEventListener('activate', (event) => {
    console.log('🟢 SW v' + VERSION + ' activado');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Eliminando cache viejo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Notificar a todos los clientes que hay actualización
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'UPDATE_AVAILABLE', version: VERSION });
                });
            });
            return self.clients.claim();
        })
    );
});

// Estrategia: Network first, luego cache
self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('/api/')) return;
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    if (event.request.headers.get('accept')?.includes('text/html')) {
                        return caches.match('./offline.html');
                    }
                    return new Response('Sin conexión', { status: 503 });
                });
            })
    );
});

// Escuchar mensajes del cliente
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});