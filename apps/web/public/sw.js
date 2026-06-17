// Phase 0 service worker stub. Offline queueing of sightings (spec §14) is a
// later phase — for now this just satisfies PWA installability and is a place
// to grow caching/sync into.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
