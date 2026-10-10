// Site khulte hi yahan se cookie milti hai. Sirf isi site ke page se maangne par.
import { COOKIE, HOURS, makeToken, fromThisSite, deny } from './_auth.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (!fromThisSite(request)) return deny(403, 'Open rtuhub.in to use this.');
  return new Response(null, {
    status: 204,
    headers: {
      'set-cookie': `${COOKIE}=${await makeToken()}; Path=/; Max-Age=${HOURS * 3600}; HttpOnly; Secure; SameSite=Strict`,
      'cache-control': 'no-store'
    }
  });
}
