/* Service Worker: app shell precaching + notification relay */
const CACHE_NAME = 'ht-static-v1';
const ASSETS = [
  '/', 'index.html', 'dashboard.html', 'medicines.html', 'vitals.html', 'history.html', 'settings.html', 'styles.css', 'app.js', 'manifest.json', 'offline.html', 'icons/health-192.svg', 'icons/health-512.svg'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(e=>console.warn('Cache addAll failed',e)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k=>{ if(k!==CACHE_NAME) return caches.delete(k); })) ).then(()=>self.clients.claim()));
});

self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // navigation requests -> network-first with fallback to offline page
  if(e.request.mode === 'navigate' || (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html'))){
    e.respondWith(fetch(e.request).then(res => { return res; }).catch(()=> caches.match('offline.html')));
    return;
  }

  // for other resources, try cache first, then network and cache the response
  e.respondWith(caches.match(e.request).then(cached => {
    if(cached) return cached;
    return fetch(e.request).then(networkRes => {
      return caches.open(CACHE_NAME).then(cache => { cache.put(e.request, networkRes.clone()); return networkRes; });
    }).catch(()=>{ return caches.match('offline.html'); });
  }));
});

// Notifications: relay actions to client windows
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action;
  event.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(windowClients => {
      for (const wc of windowClients) {
        wc.postMessage({type:'notification-action', action, data});
      }
    })
  );
});

// optional: handle push events if you integrate push server later
self.addEventListener('push', function(e){
  let data = {};
  try { data = e.data.json(); } catch (err) {}
  const title = data.title || 'Health Tracker';
  const opts = Object.assign({body:'', data}, data.options || {});
  e.waitUntil(self.registration.showNotification(title, opts));
});

// listen for skipWaiting message to allow immediate activation
self.addEventListener('message', (event)=>{ if(event.data && event.data.type === 'SKIP_WAITING'){ self.skipWaiting(); } });