// Visitor ginti (admin portal ke liye). Sirf ek random id: koi naam, email ya sawaal nahi jaata.
if (typeof window !== 'undefined' && typeof document !== 'undefined' && !/^\/(admin|api)(\/|$)/.test(location.pathname)) {
  try {
    let vid = '';
    try { vid = localStorage.getItem('rh_vid') || ''; } catch (e) {}
    if (!/^[a-f0-9]{24}$/.test(vid)) {
      vid = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
      try { localStorage.setItem('rh_vid', vid); } catch (e) {}
    }
    document.cookie = `rh_vid=${vid}; Max-Age=63072000; Path=/; SameSite=Lax; Secure`;   // AI calls ko bhi isi id se jodne ke liye
    const send = t => { try { fetch('/api/track', { method: 'POST', keepalive: true, headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ vid, t, path: location.pathname }) }).catch(() => {}); } catch (e) {} };
    let last = '';
    const view = () => { if (location.pathname !== last) { last = location.pathname; send('view'); } };
    for (const m of ['pushState', 'replaceState']) { const o = history[m]; history[m] = function () { const r = o.apply(this, arguments); setTimeout(view, 0); return r; }; }
    addEventListener('popstate', () => setTimeout(view, 0));
    view();
    setInterval(() => { if (document.visibilityState === 'visible') send('ping'); }, 120000);
  } catch (e) {}
}
