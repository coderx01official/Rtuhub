// =====================================================================
//  PROXY — kisi bhi HTTPS request ko residential proxy (HTTP CONNECT) se bhejna.
//  Sirf Node runtime par chalta hai (edge runtime mein node:http / node:tls nahi hote).
//
//  !! Proxy ki user / password / host yahan MAT likhna (repo public hai). Ye sirf Vercel env se aate hain:
//     PROXY_HOST, PROXY_USER, PROXY_PASS, PROXY_PORTS (jaise 10000,10001,10002,10003,10004)
// =====================================================================
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { Readable } from 'node:stream';

export const proxyConfig = () => ({
  host: String(process.env.PROXY_HOST || '').trim(),
  user: String(process.env.PROXY_USER || '').trim(),
  pass: String(process.env.PROXY_PASS || '').trim(),
  ports: String(process.env.PROXY_PORTS || '10000,10001,10002,10003,10004').split(',').map(p => parseInt(p.trim())).filter(p => p > 0)
});

// proxy ne CONNECT mana kiya ya tunnel hi nahi bana (bandwidth khatam / password galat / proxy band)
export class ProxyError extends Error {
  constructor(message, status) { super(message); this.name = 'ProxyError'; this.proxyStatus = status || 0; }
}

function tunnelAgent(cfg, port) {
  const auth = 'Basic ' + Buffer.from(cfg.user + ':' + cfg.pass).toString('base64');
  const agent = new https.Agent({ keepAlive: false });
  agent.createConnection = (opts, cb) => {
    const target = `${opts.host}:${opts.port || 443}`;
    const req = http.request({ host: cfg.host, port, method: 'CONNECT', path: target, headers: { host: target, 'proxy-authorization': auth } });
    req.setTimeout(8000, () => req.destroy(new ProxyError("proxy connect timeout")));
    req.on('connect', (res, socket) => {
      if (res.statusCode !== 200) { socket.destroy(); return cb(new ProxyError('proxy CONNECT ' + res.statusCode, res.statusCode)); }
      cb(null, tls.connect({ socket, servername: opts.servername || opts.host }));
    });
    req.on('error', e => cb(e instanceof ProxyError ? e : new ProxyError('proxy ' + (e.code || e.message))));
    req.end();
  };
  return agent;
}

// fetch jaisa: Response lautata hai. port = proxy ka port (10000..10004). Body stream hota hai (chat ke liye zaroori).
export function proxyFetch(url, init = {}, port) {
  const cfg = proxyConfig();
  if (!cfg.host || !cfg.user || !cfg.pass || !port) return Promise.reject(new ProxyError('proxy not configured'));
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const headers = { ...(init.headers || {}) };
    const body = init.body == null ? null : typeof init.body === 'string' || Buffer.isBuffer(init.body) ? init.body : String(init.body);
    if (body != null && !Object.keys(headers).some(h => h.toLowerCase() === 'content-length')) headers['content-length'] = Buffer.byteLength(body);
    const req = https.request({ agent: tunnelAgent(cfg, port), hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, method: init.method || 'GET', headers }, res => {
      const h = new Headers();
      for (const [k, v] of Object.entries(res.headers)) for (const x of [].concat(v)) h.append(k, x);
      const noBody = res.statusCode === 204 || res.statusCode === 205 || res.statusCode === 304;
      resolve(new Response(noBody ? null : Readable.toWeb(res), { status: res.statusCode, statusText: res.statusMessage, headers: h }));
    });
    req.on('error', reject);
    const sig = init.signal;
    if (sig) {
      if (sig.aborted) return req.destroy(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      sig.addEventListener('abort', () => req.destroy(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
    }
    if (body != null) req.write(body);
    req.end();
  });
}
