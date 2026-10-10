// =====================================================================
//  KEYS — AI ki saari keys yahin se padhi jaati hain.
//
//  !! Is file mein ya repo mein kahin bhi key MAT likhna (repo public hai, turant chori ho jayegi) !!
//
//  Keys rakhne ki private jagah:  Vercel > Project > Settings > Environment Variables
//     Name:   RTUHUB_KEYS
//     Value:  apni saari keys ek saath paste kar do (kisi bhi format mein, numbering ke saath bhi chalega)
//  Phir Deployments > Redeploy.  Vercel ke bahar ye kisi ko nahi dikhti; site ke code mein bhi nahi jaati.
//
//  Key apne aap pehchani jaati hai:
//     nvapi-...  NVIDIA    -> photo / scan padhna (image reader)
//     gsk_...    Groq      -> tez jawab
//     csk-...    Cerebras  -> sabse tez jawab
//     AQ. / AIza Gemini    -> photo padhna + jawab
// =====================================================================
export function loadKeys(env = process.env) {
  const blob = ['RTUHUB_KEYS', 'NVIDIA_KEYS', 'GROQ_KEYS', 'CEREBRAS_KEYS', 'CEREBRAS_KEY', 'GEMINI_KEYS'].map(n => env[n] || '').join('\n');
  const find = re => [...new Set(blob.match(re) || [])];
  return {
    nvidia: find(/nvapi-[A-Za-z0-9_-]{20,}/g),
    groq: find(/gsk_[A-Za-z0-9]{20,}/g),
    cerebras: find(/csk-[A-Za-z0-9]{20,}/g),
    gemini: find(/AQ\.[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{30,}/g)
  };
}
