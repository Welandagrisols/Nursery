
const CACHE_NAME = 'littleforest-v2'
const RUNTIME_CACHE = 'littleforest-runtime'

// Static assets to cache
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/images/nursery-background-new.jpg',
  '/images/littleforest-logo.png',
  '/offline.html'
]

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache')
        return cache.addAll(urlsToCache)
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Handle API calls to Supabase
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return cached data if available, or offline message
        return new Response(
          JSON.stringify({ error: 'Offline - data not available' }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      })
    )
    return
  }

  // Handle same-origin requests
  if (url.origin === location.origin) {
    // For navigation requests
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request).catch(() => {
          return caches.match('/') || caches.match('/offline.html')
        })
      )
      return
    }

    // For other requests, try cache first, then network
    event.respondWith(
      caches.match(request).then(response => {
        if (response) {
          return response
        }

        return fetch(request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }

          // Clone the response
          const responseToCache = response.clone()

          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseToCache)
          })

          return response
        })
      })
    )
  }
})

// Background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Here you would implement offline data sync
      console.log('Background sync triggered')
    )
  }
})

// Push notifications (if needed later)
self.addEventListener('push', event => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    }

    event.waitUntil(
      self.registration.showNotification('LittleForest', options)
    )
  }
})
