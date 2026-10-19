const PRODUCTION_SITE_URL = 'https://eksplorinaja.com';
const LOCAL_SITE_URL = 'http://localhost:3000';

/**
 * Returns the public URL used for canonical metadata and crawlers.
 * Production defaults to the selected custom domain. Set NEXT_PUBLIC_APP_URL
 * for previews/local environments or whenever the public hostname changes.
 */
export function getSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    try {
      const url = new URL(configured);
      if (
        (url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:')) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash
      ) {
        return new URL(url.origin);
      }
    } catch {
      // Use the environment-appropriate fallback below for an invalid value.
    }
  }

  return new URL(process.env.NODE_ENV === 'production' ? PRODUCTION_SITE_URL : LOCAL_SITE_URL);
}

export const siteBrand = 'EksplorinAja';
