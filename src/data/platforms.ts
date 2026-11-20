/**
 * Every place Native Update is released — the ONLY place a store or surface URL lives in this docs site
 * (standard aoneahsan-cccs-platform-links). Each surface passed its release proof on `verified`:
 * npm answers `npm view native-update version` (4.4.x), the dashboard and this site answered 200.
 */
export type PlatformId = 'npm' | 'web' | 'docs';

export interface Platform {
  id: PlatformId;
  /** Store or surface name (a proper name, not copy). */
  name: string;
  href: string;
  /** What this surface is for, in Native Update's words. */
  title: string;
  text: string;
  cta: string;
  primary?: boolean;
  verified: string;
}

export const PLATFORMS: readonly Platform[] = [
  {id: 'npm', name: 'npm', href: 'https://www.npmjs.com/package/native-update', title: 'npm install native-update', text: 'The Capacitor plugin: signed over-the-air updates, Play in-app updates and in-app review in your app.', cta: 'View on npm', primary: true, verified: '2026-11-20'},
  {id: 'web', name: 'Native Update dashboard', href: 'https://nativeupdate.aoneahsan.com', title: 'The dashboard', text: 'Your apps, channels, bundles and releases, the plans, and your keys.', cta: 'Open the dashboard', verified: '2026-11-20'},
  {id: 'docs', name: 'Documentation', href: 'https://nativeupdate-docs.aoneahsan.com', title: 'These docs', text: 'A quick start, the SDK reference, and the CLI.', cta: 'Read the docs', verified: '2026-11-20'},
];

export const APPS_PAGE = {
  title: 'Get Native Update',
  description: 'Every place Native Update is released: the npm package, the dashboard and these docs.',
  lead: 'Install the plugin from npm, ship releases from the dashboard, and keep these docs a tab away.',
} as const;

/** This site is the docs surface. */
export const CURRENT_SURFACE: PlatformId = 'docs';
export const OTHER_PLATFORMS: readonly Platform[] = PLATFORMS.filter((platform) => platform.id !== CURRENT_SURFACE);
export const PRIMARY_PLATFORM: Platform = PLATFORMS.find((platform) => platform.primary) ?? PLATFORMS[0];
export function platformHref(id: PlatformId): string {
  const found = PLATFORMS.find((platform) => platform.id === id);
  if (!found) throw new Error(`Unknown platform: ${id}`);
  return found.href;
}
/** `/apps` changes only when this list does: its sitemap date is the newest proof date. */
export const APPS_LASTMOD: string = PLATFORMS.map((platform) => platform.verified).sort().at(-1) ?? '2026-11-20';
