import { json } from '../_lib/http';

// Public and unauthenticated by design: reports only that the Functions runtime is serving.
export const onRequestGet = async () => json({ ok: true, app: 'interactive-fire-calculator', runtime: 'cloudflare-pages' });
