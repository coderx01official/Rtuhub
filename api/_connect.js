// =====================================================================
//  CONNECTORS — AI ko bahar ki cheezein padhne do (Claude ke connectors jaisa):
//    GitHub  : repo / file / folder / issue ka link -> README, files ki list, code. Token ho to apne (private) repos bhi.
//    Vercel  : apna token -> projects, latest deployments, fail hua build ka error log.
//    YouTube : video ka link -> title + transcript (captions). Captcha kabhi solve nahi karte: YouTube roke to sirf title.
//  Token student ke browser mein rehta hai, har sawaal ke saath aata hai; server par kabhi save / log nahi hota.
//  Server ka apna GITHUB_TOKEN (Vercel env) ho to public repos ki limit badh jaati hai (60 -> 5000 / ghanta).
// =====================================================================
const UA = 'rtuhub.in-ai';
const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n) + '\n…(cut)' : s; };
async function get(url, init = {}, ms = 9000) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctl.signal }); } finally { clearTimeout(t); }
}
const ago = ts => { const m = Math.round((Date.now() - ts) / 60000); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };

// ---------------- GitHub ----------------
const GH = 'https://api.github.com';
function ghHeaders(token, raw) {
  const h = { 'user-agent': UA, accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' };
  if (token) h.authorization = 'Bearer ' + token;
  return h;
}
function ghLinks(q) {
  const out = [], seen = new Set();
  const re = /https?:\/\/(?:www\.)?(github\.com|raw\.githubusercontent\.com)\/([\w.-]+)\/([\w.-]+)(?:\/(blob|tree|issues|pull|commit)\/([^\s?#)]+))?/gi;
  let m;
  while ((m = re.exec(q)) && out.length < 3) {
    const [, host, owner, repo0, kind0, rest] = m;
    const repo = repo0.replace(/\.git$/, '');
    let kind = kind0 || 'repo', ref = '', path = '', num = '';
    if (host.startsWith('raw')) { kind = 'blob'; const p = (repo0 + '/' + (kind0 || '') + '/' + (rest || '')).split('/'); ref = p[1] || ''; path = p.slice(2).join('/').replace(/\/+/g, '/'); }
    else if (kind === 'blob' || kind === 'tree') { const p = rest.split('/'); ref = p[0]; path = p.slice(1).join('/'); }
    else if (kind === 'issues' || kind === 'pull') num = (rest || '').split('/')[0];
    else if (kind === 'commit') ref = (rest || '').split('/')[0];
    const key = [owner, repo, kind, ref, path, num].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ owner, repo, kind, ref, path: decodeURIComponent(path || ''), num, url: m[0] });
  }
  return out;
}
async function ghJson(path, token) {
  const r = await get(GH + path, { headers: ghHeaders(token) });
  if (r.status === 401) throw new Error('GitHub token galat / expire');
  if (r.status === 403 || r.status === 429) throw new Error('GitHub limit lag gayi (token jodne se badh jaati hai)');
  if (r.status === 404) throw new Error('Nahi mila (private ho to GitHub token jodo)');
  if (!r.ok) throw new Error('GitHub ' + r.status);
  return r.json();
}
async function ghRaw(path, token) {
  const r = await get(GH + path, { headers: ghHeaders(token, true) });
  return r.ok ? r.text() : '';
}
async function github(q, token, serverToken) {
  const links = ghLinks(q), tok = token || serverToken || '';
  const parts = [], cards = [];
  for (const L of links) {
    const base = `/repos/${L.owner}/${L.repo}`, name = `${L.owner}/${L.repo}`;
    try {
      if (L.kind === 'repo') {
        const [info, readme, tree] = await Promise.all([
          ghJson(base, tok),
          ghRaw(base + '/readme', tok).catch(() => ''),
          ghJson(`${base}/git/trees/HEAD?recursive=1`, tok).catch(() => null)
        ]);
        const files = tree && Array.isArray(tree.tree) ? tree.tree.filter(x => x.type === 'blob').map(x => x.path) : [];
        parts.push(`[GitHub repo ${name}] ${info.private ? '(private)' : '(public)'} · ${info.description || 'no description'} · language ${info.language || '?'} · ★${info.stargazers_count} · forks ${info.forks_count} · default branch ${info.default_branch} · updated ${String(info.pushed_at || '').slice(0, 10)}\n`
          + (files.length ? `Files (${files.length}${tree.truncated ? '+' : ''}):\n${files.slice(0, 250).join('\n')}\n` : '')
          + (readme ? `README:\n${cut(readme, 14000)}` : '(no README)'));
        cards.push({ k: 'github', t: name, u: info.html_url });
      } else if (L.kind === 'blob') {
        const text = await ghRaw(`${base}/contents/${encodeURI(L.path)}${L.ref ? '?ref=' + encodeURIComponent(L.ref) : ''}`, tok);
        if (!text) throw new Error('File nahi khuli');
        parts.push(`[GitHub file ${name}/${L.path}${L.ref ? ' @ ' + L.ref : ''}]\n${cut(text, 40000)}`);
        cards.push({ k: 'github', t: `${L.repo}/${L.path}`, u: L.url });
      } else if (L.kind === 'tree') {
        const list = await ghJson(`${base}/contents/${encodeURI(L.path)}${L.ref ? '?ref=' + encodeURIComponent(L.ref) : ''}`, tok);
        parts.push(`[GitHub folder ${name}/${L.path}]\n${(Array.isArray(list) ? list : []).map(x => `${x.type === 'dir' ? '[dir] ' : ''}${x.path}${x.size ? ` (${x.size} B)` : ''}`).join('\n')}`);
        cards.push({ k: 'github', t: `${L.repo}/${L.path || ''}`, u: L.url });
      } else if (L.kind === 'issues' || L.kind === 'pull') {
        const [it, cm] = await Promise.all([ghJson(`${base}/issues/${L.num}`, tok), ghJson(`${base}/issues/${L.num}/comments?per_page=20`, tok).catch(() => [])]);
        parts.push(`[GitHub ${it.pull_request ? 'pull request' : 'issue'} ${name}#${L.num}] ${it.title} · ${it.state} · by ${it.user && it.user.login}\n${cut(it.body, 8000)}\n`
          + (cm || []).map(c => `-- ${c.user && c.user.login}: ${cut(c.body, 1500)}`).join('\n'));
        cards.push({ k: 'github', t: `${name}#${L.num}`, u: it.html_url });
      } else if (L.kind === 'commit') {
        const c = await ghJson(`${base}/commits/${L.ref}`, tok);
        parts.push(`[GitHub commit ${name}@${L.ref.slice(0, 7)}] ${c.commit && c.commit.message}\nFiles:\n${(c.files || []).slice(0, 40).map(f => `${f.status} ${f.filename} (+${f.additions} -${f.deletions})\n${cut(f.patch, 2500)}`).join('\n')}`);
        cards.push({ k: 'github', t: `${L.repo}@${L.ref.slice(0, 7)}`, u: c.html_url });
      }
    } catch (e) { parts.push(`[GitHub ${name}] could not be read: ${e.message}`); }
  }
  // link nahi, par apne repos ki baat (token zaroori)
  if (!links.length && token && /\b(github|repo|repos|repository|repositories|commit|branch)\b/i.test(q)) {
    try {
      const [me, repos] = await Promise.all([ghJson('/user', token), ghJson('/user/repos?sort=updated&per_page=40', token)]);
      parts.push(`[GitHub account @${me.login}] ${me.public_repos} public repos${me.total_private_repos ? `, ${me.total_private_repos} private` : ''}. Recently updated repos:\n`
        + repos.map(r => `- ${r.full_name}${r.private ? ' (private)' : ''} · ${r.language || '?'} · ★${r.stargazers_count} · updated ${String(r.pushed_at || '').slice(0, 10)} · ${r.description || ''} · ${r.html_url}`).join('\n'));
      cards.push({ k: 'github', t: '@' + me.login, u: me.html_url });
    } catch (e) { parts.push(`[GitHub account] could not be read: ${e.message}`); }
  }
  return { text: parts.join('\n\n'), cards };
}

// ---------------- Vercel ----------------
const VC = 'https://api.vercel.com';
async function vcJson(path, token) {
  const r = await get(VC + path, { headers: { authorization: 'Bearer ' + token, 'user-agent': UA } });
  if (r.status === 401 || r.status === 403) throw new Error('Vercel token galat / expire ya is team ka access nahi');
  if (!r.ok) throw new Error('Vercel ' + r.status);
  return r.json();
}
async function vercel(q, token) {
  if (!token) return { text: '', cards: [] };
  const parts = [], cards = [];
  try {
    const [user, teams] = await Promise.all([vcJson('/v2/user', token), vcJson('/v2/teams?limit=10', token).catch(() => ({ teams: [] }))]);
    const scopes = [{ id: '', name: (user.user && user.user.username) || 'personal' }, ...((teams.teams || []).slice(0, 4).map(t => ({ id: t.id, name: t.slug })))];
    for (const s of scopes) {
      const tq = s.id ? 'teamId=' + s.id + '&' : '';
      const [pr, dp] = await Promise.all([vcJson(`/v9/projects?${tq}limit=30`, token).catch(() => ({ projects: [] })), vcJson(`/v6/deployments?${tq}limit=12`, token).catch(() => ({ deployments: [] }))]);
      const projects = pr.projects || [], deps = dp.deployments || [];
      if (!projects.length && !deps.length) continue;
      const lq = q.toLowerCase(), named = projects.filter(p => lq.includes(String(p.name).toLowerCase()));
      parts.push(`[Vercel scope ${s.name}] ${projects.length} projects: ${projects.map(p => p.name + (p.framework ? ` (${p.framework})` : '')).join(', ')}\n`
        + `Latest deployments:\n` + deps.filter(d => !named.length || named.some(p => p.name === d.name)).slice(0, 10).map(d =>
          `- ${d.name} · ${d.state || d.readyState} · ${d.target || 'preview'} · ${ago(d.created)} · https://${d.url}${d.meta && d.meta.githubCommitMessage ? ' · "' + cut(d.meta.githubCommitMessage, 90) + '"' : ''}`).join('\n'));
      // fail hua build: uska log
      const bad = deps.find(d => (d.state || d.readyState) === 'ERROR' && (!named.length || named.some(p => p.name === d.name)));
      if (bad && /error|fail|log|build|kyu|why|problem|issue|galat|nahi/i.test(q)) {
        const ev = await vcJson(`/v3/deployments/${bad.uid}/events?limit=200${s.id ? '&teamId=' + s.id : ''}`, token).catch(() => []);
        const lines = (Array.isArray(ev) ? ev : []).map(e => (e.payload && e.payload.text) || e.text || '').filter(Boolean);
        parts.push(`[Vercel build log of failed deployment ${bad.name} (${ago(bad.created)})] last lines:\n${lines.slice(-70).join('\n')}`);
      }
      cards.push({ k: 'vercel', t: s.name + ' · ' + projects.length + ' projects', u: 'https://vercel.com/' + (s.id ? s.name : 'dashboard') });
    }
    if (!parts.length) parts.push('[Vercel] token works but no projects found.');
  } catch (e) { parts.push(`[Vercel] could not be read: ${e.message}`); }
  return { text: parts.join('\n\n'), cards };
}

// ---------------- YouTube ----------------
function ytIds(q) {
  const out = [], re = /(?:youtube\.com\/(?:watch\?(?:[^\s]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/gi;
  let m;
  while ((m = re.exec(q)) && out.length < 2) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}
const unesc = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]*>/g, '');
async function ytTranscript(id) {
  const H = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', 'accept-language': 'en-US,en;q=0.9', cookie: 'CONSENT=YES+cb' };
  const page = await (await get(`https://www.youtube.com/watch?v=${id}&hl=en`, { headers: H }, 9000)).text();
  const key = (page.match(/"INNERTUBE_API_KEY":\s*"([\w-]+)"/) || [])[1];
  if (!key) return { err: /g-recaptcha/.test(page) ? 'YouTube ne server ko roka (captcha) — transcript nahi mila' : 'video page nahi padh paya' };
  const pr = await get(`https://www.youtube.com/youtubei/v1/player?key=${key}&prettyPrint=false`, { method: 'POST', headers: { ...H, 'content-type': 'application/json' },
    body: JSON.stringify({ context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38' } }, videoId: id }) }, 9000);
  const pj = pr.ok ? await pr.json() : null;
  const tracks = pj && pj.captions && pj.captions.playerCaptionsTracklistRenderer && pj.captions.playerCaptionsTracklistRenderer.captionTracks;
  const meta = pj && pj.videoDetails ? { title: pj.videoDetails.title, author: pj.videoDetails.author, secs: +pj.videoDetails.lengthSeconds || 0, desc: pj.videoDetails.shortDescription || '' } : null;
  if (!tracks || !tracks.length) return { meta, err: 'is video mein captions / transcript nahi hai' };
  const pickT = tracks.find(t => /^en/.test(t.languageCode) && t.kind !== 'asr') || tracks.find(t => /^hi/.test(t.languageCode) && t.kind !== 'asr') || tracks.find(t => t.kind !== 'asr') || tracks.find(t => /^en/.test(t.languageCode)) || tracks[0];
  const url = String(pickT.baseUrl).replace('&fmt=srv3', '');
  if (url.includes('&exp=xpe')) return { meta, err: 'YouTube ne transcript lock kiya (PO token)' };
  const xml = await (await get(url, { headers: H }, 9000)).text();
  const lines = [...xml.matchAll(/<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g)].map(m => [Math.floor(+m[1]), unesc(unesc(m[2])).replace(/\s+/g, ' ').trim()]).filter(x => x[1]);
  if (!lines.length) return { meta, err: 'transcript khaali aaya' };
  // har ~30 second par time mark
  let last = -60, out = '';
  for (const [t, s] of lines) { if (t - last >= 30) { out += `\n[${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}] `; last = t; } out += s + ' '; }
  return { meta, lang: pickT.languageCode + (pickT.kind === 'asr' ? ' (auto)' : ''), text: out.trim() };
}
async function youtube(q) {
  const parts = [], cards = [];
  for (const id of ytIds(q)) {
    const link = 'https://www.youtube.com/watch?v=' + id;
    let o = null;
    try { const r = await get(`https://www.youtube.com/oembed?url=${encodeURIComponent(link)}&format=json`, {}, 6000); if (r.ok) o = await r.json(); } catch (e) {}
    let tr = {};
    try { tr = await ytTranscript(id); } catch (e) { tr = { err: 'transcript nahi mila' }; }
    const title = (tr.meta && tr.meta.title) || (o && o.title) || 'YouTube video', by = (tr.meta && tr.meta.author) || (o && o.author_name) || '';
    const len = tr.meta && tr.meta.secs ? ` · ${Math.floor(tr.meta.secs / 60)} min` : '';
    parts.push(`[YouTube video "${title}" by ${by}${len} · ${link}]\n`
      + (tr.text ? `Transcript (${tr.lang}):\n${cut(tr.text, 45000)}` : `Transcript not available: ${tr.err}.${tr.meta && tr.meta.desc ? `\nVideo description:\n${cut(tr.meta.desc, 3000)}` : ''}`));
    cards.push({ k: 'youtube', t: title, u: link });
  }
  return { text: parts.join('\n\n'), cards };
}

// ---------------- sab ek saath ----------------
// on: ['github','vercel','youtube'] (student ne jo chalu kiye), tokens: { github, vercel }
export async function gatherConnectors(q, conn, env) {
  const on = new Set(Array.isArray(conn && conn.on) ? conn.on : []);
  const tok = k => typeof (conn && conn[k]) === 'string' && conn[k].length < 300 ? conn[k].trim() : '';
  const jobs = [];
  if (on.has('github') && (ghLinks(q).length || (tok('github') && /\b(github|repo|repos|repository|repositories|commit|branch)\b/i.test(q)))) jobs.push(github(q, tok('github'), env.GITHUB_TOKEN || ''));
  if (on.has('vercel') && tok('vercel') && /\b(vercel|deploy|deployment|deployments|project|projects|build|domain|site|website|hosting)\b/i.test(q)) jobs.push(vercel(q, tok('vercel')));
  if (on.has('youtube') && ytIds(q).length) jobs.push(youtube(q));
  if (!jobs.length) return null;
  const got = await Promise.all(jobs.map(j => j.catch(e => ({ text: '', cards: [] }))));
  const text = got.map(g => g.text).filter(Boolean).join('\n\n');
  return text ? { text: cut(text, 70000), cards: got.flatMap(g => g.cards).slice(0, 8) } : null;
}

// token jodte waqt jaanch: kis account ka hai (token wapas kabhi nahi bhejte)
export async function verifyConnector(kind, token) {
  token = String(token || '').trim();
  if (!token || token.length > 300) return { ok: false, error: 'Token khaali / galat' };
  try {
    if (kind === 'github') { const me = await ghJson('/user', token); return { ok: true, name: '@' + me.login }; }
    if (kind === 'vercel') { const me = await vcJson('/v2/user', token); return { ok: true, name: (me.user && (me.user.username || me.user.email)) || 'Vercel' }; }
  } catch (e) { return { ok: false, error: e.message }; }
  return { ok: false, error: 'unknown' };
}
