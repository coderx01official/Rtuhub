// =====================================================================
//  FILE -> TEXT (phone / laptop par hi, server par file nahi jaati — sirf uska text)
//  PDF (pdf.js), Word .docx, PowerPoint .pptx, aur text / code files (.txt .md .csv .json .c .py ...)
//  Scan wali PDF (jisme text nahi) ke pehle 3 page photo bana kar bhejte hain, AI khud padh leta hai.
// =====================================================================
import { loadPdfLib } from './viewer.jsx';

export const FILE_ACCEPT = 'image/*,.pdf,.docx,.pptx,.txt,.md,.csv,.tsv,.json,.xml,.yaml,.yml,.log,.ini,.c,.h,.cpp,.hpp,.cc,.cs,.java,.kt,.py,.js,.jsx,.ts,.tsx,.html,.htm,.css,.scss,.sql,.sh,.bat,.go,.rs,.php,.rb,.swift,.m,.r,.tex,.ipynb';
const TEXT_EXT = /\.(txt|md|csv|tsv|json|xml|ya?ml|log|ini|c|h|cpp|hpp|cc|cs|java|kt|py|jsx?|tsx?|html?|s?css|sql|sh|bat|go|rs|php|rb|swift|m|r|tex|ipynb)$/i;
export const MAX_FILE_MB = 15;
export const MAX_CHARS = 60000;   // ek file se zyada se zyada itna text

export const isImage = f => /^image\//.test(f.type) || /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(f.name);
export const kindOf = name => /\.pdf$/i.test(name) ? 'pdf' : /\.docx$/i.test(name) ? 'word' : /\.pptx$/i.test(name) ? 'powerpoint' : /\.(csv|tsv)$/i.test(name) ? 'csv' : TEXT_EXT.test(name) ? 'code' : 'alt';
export const sizeOf = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

// ---------- zip (docx/pptx) bina kisi library ke: browser ka DecompressionStream ----------
async function unzip(buf, want) {
  const v = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder();
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 70000); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('zip');
  let p = v.getUint32(eocd + 16, true);
  const n = v.getUint16(eocd + 10, true), out = {};
  for (let k = 0; k < n; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true);
    const nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + xl + cl;
    if (!want.test(name)) continue;
    const start = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true);
    const raw = u8.subarray(start, start + csize);
    if (method === 0) out[name] = dec.decode(raw);
    else if (method === 8) out[name] = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  }
  return out;
}
const xmlText = (xml, para) => xml.replace(new RegExp(`</${para}>`, 'g'), '\n').replace(/<w:tab\/>|<a:tab\/>/g, '\t').replace(/<w:br\/>|<a:br\/>/g, '\n').replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();

async function pdfText(file, onProgress) {
  const pdfjs = await loadPdfLib();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), verbosity: 0 }).promise;
  const pages = doc.numPages, parts = [];
  let len = 0;
  for (let i = 1; i <= pages && len < MAX_CHARS; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    const t = tc.items.map(x => x.str + (x.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+/g, ' ').trim();
    parts.push(`--- Page ${i} ---\n${t}`); len += t.length;
    onProgress && onProgress(i / pages);
  }
  const text = parts.join('\n\n');
  // scan PDF: text nahi mila -> pehle 3 page ki photo
  let shots = [];
  if (text.replace(/--- Page \d+ ---/g, '').trim().length < 40 * Math.min(pages, 3)) {
    for (let i = 1; i <= Math.min(pages, 3); i++) {
      const page = await doc.getPage(i), vp = page.getViewport({ scale: 1 }), scale = Math.min(1.6, 1240 / vp.width);
      const c = document.createElement('canvas'), v2 = page.getViewport({ scale });
      c.width = v2.width; c.height = v2.height;
      await page.render({ canvasContext: c.getContext('2d'), viewport: v2 }).promise;
      shots.push(c.toDataURL('image/jpeg', 0.72));
    }
  }
  doc.destroy && doc.destroy();
  return { text: shots.length ? '' : text, pages, shots };
}

// file -> { text, pages?, shots? }  (shots = scan PDF ki photos)
export async function fileToText(file, onProgress) {
  if (file.size > MAX_FILE_MB * 1048576) throw new Error(`${MAX_FILE_MB} MB se badi file nahi`);
  const name = file.name || 'file';
  if (/\.pdf$/i.test(name) || file.type === 'application/pdf') return pdfText(file, onProgress);
  if (/\.docx$/i.test(name)) {
    const x = await unzip(await file.arrayBuffer(), /^word\/(document|footnotes)\.xml$/);
    return { text: xmlText(x['word/document.xml'] || '', 'w:p') + (x['word/footnotes.xml'] ? '\n\n' + xmlText(x['word/footnotes.xml'], 'w:p') : '') };
  }
  if (/\.pptx$/i.test(name)) {
    const x = await unzip(await file.arrayBuffer(), /^ppt\/slides\/slide\d+\.xml$/);
    const keys = Object.keys(x).sort((a, b) => +a.match(/\d+/g).pop() - +b.match(/\d+/g).pop());
    return { text: keys.map((k, i) => `--- Slide ${i + 1} ---\n${xmlText(x[k], 'a:p')}`).join('\n\n'), pages: keys.length };
  }
  if (/\.ipynb$/i.test(name)) {
    try { const nb = JSON.parse(await file.text()); return { text: (nb.cells || []).map(c => `# [${c.cell_type}]\n${[].concat(c.source || []).join('')}`).join('\n\n') }; } catch (e) {}
  }
  if (TEXT_EXT.test(name) || /^text\//.test(file.type) || /json|xml|javascript/.test(file.type)) return { text: await file.text() };
  throw new Error('Ye file type abhi support nahi (PDF, Word, PPT, text, code chalte hain)');
}
