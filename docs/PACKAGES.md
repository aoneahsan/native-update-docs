# Packages — native-update-docs

**Last Updated:** 2026-11-16 (Node 26.13.1 fleet pass: `.nvmrc` 26.13.1, `engines.node >=26.13.1`; every package already at
latest stable). Internal record: excluded from the site by `exclude` in `docusaurus.config.ts`. Vulnerable transitive pins that
Docusaurus still carries are tracked in `../native-update/docs/PACKAGES.md`.

| Package | Range | Kind |
|---|---|---|
| `@docusaurus/core` | ^3.10.2 | dependencies |
| `@docusaurus/plugin-client-redirects` | ^3.10.2 | dependencies |
| `@docusaurus/plugin-content-docs` | ^3.10.2 | dependencies |
| `@docusaurus/preset-classic` | ^3.10.2 | dependencies |
| `@docusaurus/theme-common` | ^3.10.2 | dependencies |
| `@docusaurus/theme-mermaid` | ^3.10.2 | dependencies |
| `@easyops-cn/docusaurus-search-local` | ^0.55.3 | dependencies |
| `@mdx-js/react` | ^3.1.1 | dependencies |
| `clsx` | ^2.1.1 | dependencies |
| `prism-react-renderer` | ^2.4.1 | dependencies |
| `react` | ^19.3.1 | dependencies |
| `react-dom` | ^19.3.1 | dependencies |
| `@docusaurus/module-type-aliases` | ^3.10.2 | devDependencies |
| `@docusaurus/plugin-content-blog` | ^3.10.2 | devDependencies |
| `@docusaurus/types` | ^3.10.2 | devDependencies |
| `@types/node` | ^26.6.6 | devDependencies |
| `@types/react` | ^19.3.0 | devDependencies |
| `typescript` | ~7.0.2 | devDependencies |

TypeScript is on `~7.0.2`: this site uses no typescript-eslint or Capacitor CLI, the two tools the fleet TypeScript 7 pin
protects. `yarn typecheck` passes on it.

## Workaround — `NODE_OPTIONS=--no-experimental-webstorage` in `build`

- **Why:** on Node 26, Docusaurus 3.10's SSG renderer loads through the `eval` package, which copies every global; reading
  Node's experimental `localStorage` getter prints an `ExperimentalWarning`. The build must print zero warnings. The flag
  removes that global; the docs never use it at build time.
- **Re-check when:** Docusaurus is upgraded, or Node's web storage leaves experimental status.
- **Remove:** drop the prefix from `build`, run `yarn build`, and confirm no `ExperimentalWarning` line.
