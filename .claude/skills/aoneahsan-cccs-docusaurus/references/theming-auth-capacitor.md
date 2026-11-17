# Theming, auth-gating, and the Capacitor Android wrapper

> **Scope:** the theming section applies to **every** docs site. The auth-gate and Capacitor-wrapper sections
> below are **`ahsan-notebook`-only** — that project is a private personal notebook, not a product docs site.
> A public product docs site is open, has no auth gate, and ships no Android wrapper. Do not carry either
> pattern into one. See `SKILL.md` §7 and `~/.claude/rules/docs-sites.md` §6.

## Infima theming (custom colours, light + dark) — every site

All brand theming lives in `src/css/custom.css` as Infima variable overrides — no swizzling needed for
colours/typography:

```css
:root {
  --ifm-color-primary: #0078d4;            /* + -dark/-darker/-darkest/-light/-lighter/-lightest */
  --ifm-font-family-base: 'Inter', system-ui, …;
  --ifm-font-family-monospace: 'Fira Code', …;
  --ifm-global-border-radius: 6px;
  --ifm-navbar-height: 60px;
  --doc-sidebar-width: 300px;
}
[data-theme='dark'] {
  --ifm-color-primary: #3ea8ff;            /* brighter family for dark */
  --ifm-background-color: #1a1a1a;
  --ifm-background-surface-color: #242424;
  --ifm-font-color-base: #e0e0e0;
}
```

Pair with `colorMode: { defaultMode, disableSwitch: false, respectPrefersColorScheme: true }`. Polish worth
reusing from the notebook: active sidebar item with a 3px accent border + padding compensation, TOC
active-link accent, responsive tables (`display: block; overflow-x: auto`), mobile sidebar z-index fixes,
search-modal z-index overrides. Per-project palettes follow `aoneahsan-cccs-frontend-design` (unique colour
per project).

## Auth-gating a private site — 🔴 `ahsan-notebook` ONLY, never a product docs site

The one sanctioned app-wide wrapper is a swizzled **`src/theme/Root.tsx`**:

```tsx
export default function Root({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
```

Inside `AuthProvider`:

1. **SSR bypass first:** `if (typeof window === 'undefined') return <>{children}</>;` — the static build
   renders full content, which is what lets pagefind index a gated site.
   ⚠️ **Honest limit:** this makes the gate client-side UX, not server security — the prerendered HTML is
   fetchable from hosting. Keep genuinely sensitive assets out of the deploy via `firebase.json`
   `hosting.ignore` globs; never present the gate as hard security.
2. **Web sign-in = Google One-Tap** (Identity Services) with a rendered Google-button fallback → id token →
   `signInWithCredential` into Firebase. **Native = `@codetrix-studio/capacitor-google-auth`** feeding the
   same credential path. One auth service branches on `Capacitor.isNativePlatform()`.
3. **Email allowlist** from env (`ALLOWED_EMAILS`, JSON array or CSV — parse both, lowercase); a signed-in
   but unlisted user gets a denial screen, not content.
4. **App Check** (ReCaptchaV3) initialized only when the site key exists **and** host ≠ localhost (avoids dev
   ReCAPTCHA noise); a debug-mode env sets `FIREBASE_APPCHECK_DEBUG_TOKEN`.
5. Provider config: `GoogleAuthProvider` with `prompt: 'select_account'`.

## Capacitor Android wrapper — 🔴 `ahsan-notebook` ONLY

A docs site becomes an Android app as a **thin webview over the hosted site** — every web deploy updates the
app with no store release:

```ts
const useLocalBuild = process.env.USE_LOCAL_BUILD === 'true';
const config: CapacitorConfig = {
  appId: 'com.aoneahsan.<name>',
  webDir: 'build',
  server: useLocalBuild
    ? { androidScheme: 'https' }                       // local mode — native plugins (Google Auth) work
    : { url: 'https://<site>.web.app', cleartext: true }, // remote mode — the default
};
```

The dual mode exists because **native Google Auth cannot run against a remote-URL origin** — flip
`USE_LOCAL_BUILD=true` and rebuild when the native sign-in path is needed; remote mode uses the web One-Tap
flow inside the webview.

- Native config (appId, versionName/versionCode, product name, both platforms) is declared in
  **`trapeze.config.yaml`** and applied with `npx trapeze run trapeze.config.yaml` (`--dry-run` first) —
  never hand-edited in gradle/plist.
- One-shot scripts only: `android:sync` (`cap sync`), `android:build` (`gradlew assembleRelease`),
  `android:build:bundle` (`bundleRelease`) — signed builds and store uploads stay user-only.
- The wrapper is still a Capacitor app: safe-area, edge-to-edge and permission rules from
  `aoneahsan-cccs-capacitor` / `-android-finalization` apply before any store submission.

## PWA

`plugin-pwa` + `static/manifest.json` + a swizzled `PwaReloadPopup` for the update prompt. Offline modes
activate on `appInstalled` / `standalone` / `queryString`; the service worker only exists on real builds —
test with `yarn build && yarn serve`, toggling the network in devtools.
