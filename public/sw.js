// rtuhub.in service worker: sirf notifications ke liye (koi caching nahi, site hamesha taaza).
// Push khaali aata hai; yahan se sabse naya faculty notice padh kar notification dikhate hain.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

const TYPE = { notice: 'Notice', timetable: 'Time table' };

self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let x = null;
    try {
      const r = await fetch('/api/faculty?a=public&fresh=1', { cache: 'no-store', credentials: 'same-origin' });
      const j = await r.json();
      x = j && j.items && j.items[0];
    } catch (err) { /* net nahi to bhi notification dikhe */ }
    const kind = x ? TYPE[x.type] || 'Notice' : 'Notice';
    const title = x ? 'New ' + kind.toLowerCase() + ' on rtuhub.in' : 'New notice on rtuhub.in';
    const body = x ? x.title + (x.by ? '\nUploaded by ' + x.by : '') : 'A new notice has been published. Tap to open.';
    await self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/favicon-48.png',
      tag: x ? 'rtuhub-notice-' + x.id : 'rtuhub-notice',
      data: { url: x ? '/notices/' + x.id : '/notices' }
    });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/notices';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).origin === self.location.origin && 'focus' in c) {
        try { await c.focus(); if ('navigate' in c) { await c.navigate(url); return; } } catch (err) { break; }
      }
    }
    return self.clients.openWindow(url);
  })());
});
