const CACHE_NAME = 'infecto-consult-v0.9';

const ASSETS = [
  './',
  './index.html',
  './pneumonia.html',
  './pielonefrite.html',
  './clostridioides_difficile.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  // Para páginas HTML: busca primeiro a versão atual no servidor.
  // Se estiver sem internet, usa a versão armazenada.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });

          return response;
        })
        .catch(() => caches.match(request))
    );

    return;
  }

  // Para outros arquivos: usa cache primeiro e busca na rede se necessário.
  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request))
  );
});
