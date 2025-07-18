// ZAIVA Service Worker - PWA Offline Support
const CACHE_NAME = 'zaiva-v1'
const STATIC_CACHE = 'zaiva-static-v1'
const DYNAMIC_CACHE = 'zaiva-dynamic-v1'

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
]

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static files')
        return cache.addAll(STATIC_FILES)
      })
      .then(() => {
        console.log('[SW] Static files cached successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static files:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Service worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip external API calls (let them fail gracefully)
  if (url.origin !== self.location.origin) {
    return
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', request.url)
          return cachedResponse
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Don't cache if not successful
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse
            }
            
            // Clone the response
            const responseToCache = networkResponse.clone()
            
            // Cache dynamic content
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                console.log('[SW] Caching dynamic content:', request.url)
                cache.put(request, responseToCache)
              })
            
            return networkResponse
          })
          .catch((error) => {
            console.log('[SW] Network fetch failed:', error)
            
            // Return offline page for navigation requests
            if (request.destination === 'document') {
              return caches.match('/index.html')
            }
            
            // For other requests, just fail
            throw error
          })
      })
  )
})

// Background sync for offline message queue (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-messages') {
    console.log('[SW] Background sync triggered for messages')
    // Implementation for syncing offline messages when back online
  }
})

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')
  // Implementation for push notifications
})

// Message handling from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})