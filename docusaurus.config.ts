import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
// Plugin version single source of truth: the ROOT native-update package.json,
// mirrored into this committed file by `yarn sync:from-plugin` (CI cannot read
// the private plugin repo). Never hardcode the version anywhere in this repo.
import pluginVersion from './plugin-version.json';

// ---------------------------------------------------------------------------
// Native Update — Documentation site config
// Author: Ahsan Mahmood (https://aoneahsan.com)
// Source plugin: https://www.npmjs.com/package/native-update
// ---------------------------------------------------------------------------

const config: Config = {
  title: 'Native Update Docs',
  tagline: 'OTA bundle updates, in-app store updates, and review prompts for Capacitor apps.',
  favicon: 'img/favicon.svg',

  // Production URL — served from GitHub Pages (custom domain).
  // Update if you fork this repo to a different domain.
  url: 'https://nativeupdate-docs.aoneahsan.com',
  baseUrl: '/',

  // GitHub metadata (drives docusaurus deploy + OG tags + edit-this-page links)
  organizationName: 'aoneahsan',
  projectName: 'native-update-docs',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'warn',

  // SEO + AI-citability head tags. Injected into <head> of every page on
  // top of the per-page metadata Docusaurus already emits. The JSON-LD
  // payloads (WebSite, Organization, TechArticle template) help Google
  // Rich Results, Perplexity, ChatGPT, and Claude extract structured
  // entity data when citing this documentation.
  headTags: [
    // NOTE: no global rel=canonical here — Docusaurus already emits a correct
    // per-page canonical from `url`; a global one would override it on every
    // page (pre-existing SEO bug removed 2026-07-14).
    {
      tagName: 'link',
      attributes: {
        rel: 'alternate',
        type: 'application/rss+xml',
        title: 'Native Update Docs',
        href: 'https://nativeupdate-docs.aoneahsan.com/sitemap.xml',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'application-name',
        content: 'Native Update Docs',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'apple-mobile-web-app-title',
        content: 'Native Update Docs',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'theme-color',
        content: '#0ea5e9',
      },
    },
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Native Update Documentation',
        url: 'https://nativeupdate-docs.aoneahsan.com',
        description:
          'Documentation for native-update, a Capacitor plugin for over-the-air bundle updates, in-app store update checks, and review prompts. Author: Ahsan Mahmood.',
        inLanguage: 'en',
        publisher: {
          '@type': 'Person',
          name: 'Ahsan Mahmood',
          url: 'https://aoneahsan.com',
          email: 'aoneahsan@gmail.com',
          sameAs: [
            'https://linkedin.com/in/aoneahsan',
            'https://github.com/aoneahsan',
            'https://www.npmjs.com/~aoneahsan',
          ],
        },
        license: 'https://opensource.org/licenses/MIT',
      }),
    },
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'native-update',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Android, iOS, Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        url: 'https://www.npmjs.com/package/native-update',
        sameAs: 'https://nativeupdate.aoneahsan.com',
        author: {
          '@type': 'Person',
          name: 'Ahsan Mahmood',
          url: 'https://aoneahsan.com',
        },
        description:
          'Capacitor plugin for over-the-air bundle updates, in-app store update checks, and platform-native review prompts. MIT-licensed.',
        softwareVersion: pluginVersion.version,
        license: 'https://opensource.org/licenses/MIT',
      }),
    },
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Ahsan Mahmood',
        alternateName: 'aoneahsan',
        url: 'https://aoneahsan.com',
        email: 'aoneahsan@gmail.com',
        sameAs: [
          'https://linkedin.com/in/aoneahsan',
          'https://github.com/aoneahsan',
          'https://www.npmjs.com/~aoneahsan',
          'https://aoneahsan.com',
        ],
        founder: {
          '@type': 'Person',
          name: 'Ahsan Mahmood',
        },
      }),
    },
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  trailingSlash: false,

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  themes: [
    '@docusaurus/theme-mermaid',
    [
      '@easyops-cn/docusaurus-search-local',
      { hashed: true, indexBlog: false, docsRouteBasePath: '/' },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/aoneahsan/native-update-docs/edit/main/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
          breadcrumbs: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.7,
          lastmod: 'date',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.svg',
    metadata: [
      { name: 'description', content: 'Documentation for native-update — Capacitor plugin for over-the-air bundle updates, in-app store update checks, and review prompts. Maintained by Ahsan Mahmood.' },
      { name: 'keywords', content: 'capacitor, native-update, OTA, live updates, hot reload, app updates, in-app updates, app review, code-push alternative, mobile updates, capacitor ota, capacitor live update, capacitor hot reload, capacitor over-the-air, capacitor update plugin' },
      { name: 'author', content: 'Ahsan Mahmood' },
      { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:creator', content: '@aoneahsan' },
      { name: 'twitter:site', content: '@aoneahsan' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Native Update Docs' },
      { property: 'og:locale', content: 'en_US' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'article:author', content: 'Ahsan Mahmood' },
    ],
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
    navbar: {
      title: 'Native Update',
      logo: {
        alt: 'Native Update logo',
        src: 'img/logo.svg',
        srcDark: 'img/logo.svg',
        width: 32,
        height: 32,
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'mainSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/getting-started/quick-start',
          label: 'Quick Start',
          position: 'left',
        },
        {
          to: '/about-the-author',
          label: 'Author',
          position: 'right',
        },
        {
          href: 'https://www.npmjs.com/package/native-update',
          label: 'npm',
          position: 'right',
        },
        {
          href: 'https://github.com/aoneahsan/native-update-docs',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Introduction', to: '/intro' },
            { label: 'Installation', to: '/getting-started/installation' },
            { label: 'Quick Start', to: '/getting-started/quick-start' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'npm package', href: 'https://www.npmjs.com/package/native-update' },
            { label: 'Marketing site', href: 'https://nativeupdate.aoneahsan.com' },
            { label: 'Docs source', href: 'https://github.com/aoneahsan/native-update-docs' },
          ],
        },
        {
          title: 'Built by Ahsan Mahmood',
          items: [
            { label: 'aoneahsan.com', href: 'https://aoneahsan.com' },
            { label: 'LinkedIn', href: 'https://linkedin.com/in/aoneahsan' },
            { label: 'GitHub', href: 'https://github.com/aoneahsan' },
            { label: 'npm packages', href: 'https://www.npmjs.com/~aoneahsan' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Ahsan Mahmood. Built with Docusaurus. native-update is MIT-licensed.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript', 'kotlin', 'swift', 'php', 'yaml', 'diff'],
    },
    announcementBar: {
      id: 'v3-1-latest',
      content:
        `native-update v${pluginVersion.version} — one shared wire-contract for update checks, refreshed docs, new home at nativeupdate-docs.aoneahsan.com.`,
      backgroundColor: '#0ea5e9',
      textColor: '#ffffff',
      isCloseable: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
