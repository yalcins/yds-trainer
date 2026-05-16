const CACHE = 'yds-v1'

const STATIC = [
  '/',
  '/quiz',
  '/practice',
  '/wordlab',
  '/progress',
  '/lab',
  '/guided',
  '/patterns',
  '/solve',
  '/train',
  '/review',
  '/stats',
  '/mistakes',
  '/manifest.json',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // API istekleri: her zaman network, offline ise hata ver
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(request).catch(() =>
      new Response(JSON.stringify({ error: 'Offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    ))
    return
  }

  // Diğer her şey: önce cache, yoksa network, onu da cache'e al
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(request, clone))
        return res
      }).catch(() => caches.match('/'))
    })
  )
})
