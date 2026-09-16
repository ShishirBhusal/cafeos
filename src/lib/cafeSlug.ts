/**
 * The single definition of a cafe's public URL slug.
 *
 * There used to be two rules in the codebase: `/explore` and the customer menu
 * stripped punctuation, while the three `/[cafeSlug]` route matchers and the
 * settings QR code did not. Any cafe whose name contains a `.` or `&` — e.g.
 * "K. B. Stylish Pvt. Ltd." — therefore got a link on /explore that 404'd on
 * the page it pointed at. Both forms are accepted when matching so older links
 * keep working.
 */
export function cafeSlug(businessName: string): string {
  return businessName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Legacy slug: spaces collapsed, punctuation left in place. */
function legacyCafeSlug(businessName: string): string {
  return businessName.toLowerCase().replace(/\s+/g, '-');
}

/** True when `slug` from the URL identifies this business, in either form. */
export function matchesCafeSlug(businessName: string, slug: string): boolean {
  const s = slug.toLowerCase();
  return cafeSlug(businessName) === cafeSlug(s) || legacyCafeSlug(businessName) === s;
}
