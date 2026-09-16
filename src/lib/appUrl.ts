import { headers } from 'next/headers';

/**
 * Origin of the running app, for anything a customer has to reach from outside:
 * QR codes, share links, canonical URLs.
 *
 * NEXT_PUBLIC_APP_URL wins when it is set (a custom domain). Otherwise the origin
 * is read off the incoming request, so a Vercel preview, the production
 * deployment and localhost each produce a URL that actually resolves. The old
 * code hardcoded `http://localhost:3000` and `https://cafeos.com.np` as
 * fallbacks, which printed unreachable QR codes on the deployed site.
 */
export async function getAppUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    if (host) {
      const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
      return `${proto}://${host}`;
    }
  } catch {
    // headers() is unavailable outside a request scope — fall through.
  }

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
