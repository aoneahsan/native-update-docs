import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
// Plugin version single source of truth: the ROOT native-update package.json,
// mirrored into this committed file by `yarn sync:from-plugin` (CI cannot read
// the private plugin repo). Never hardcode the version anywhere in this repo.
import pluginVersion from './plugin-version.json';
import sitePages, { withLastmod } from './plugins/site-pages';

/** The blog's route: the blog plugin's `routeBasePath` below, with its leading slash. */
const BLOG_PATH = '/blog';

// ---------------------------------------------------------------------------
// Native Update — Documentation site config
// Maintained by the Native Update team (https://nativeupdate.aoneahsan.com)
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
    // The RSS and Atom <link rel="alternate"> tags come from the blog plugin's feedOptions below.
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
          'Documentation for Native Update: the native-update Capacitor plugin and the hosted service for over-the-air bundle updates, in-app store update checks, and review prompts.',
        inLanguage: 'en-US',
        publisher: {
          '@type': 'Organization',
          name: 'Native Update',
          url: 'https://nativeupdate.aoneahsan.com',
        },
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
          '@type': 'Organization',
          name: 'Native Update',
          url: 'https://nativeupdate.aoneahsan.com',
        },
        description:
          'Capacitor plugin for over-the-air bundle updates, in-app store update checks, and platform-native review prompts.',
        softwareVersion: pluginVersion.version,
        license: 'https://nativeupdate.aoneahsan.com/terms',
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
        name: 'Native Update',
        url: 'https://nativeupdate.aoneahsan.com',
        sameAs: ['https://www.npmjs.com/package/native-update'],
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
      { hashed: true, indexBlog: true, docsRouteBasePath: '/', blogRouteBasePath: BLOG_PATH },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // `docs/` is BOTH the published content dir and the home of the
          // fixed-path internal file docs/MANUAL-TASKS.md. Keep the path (the
          // global rule fixes it) but never publish it — this repo is public.
          // NOTE: `exclude` REPLACES the plugin defaults, so they are restated.
          exclude: [
            '**/_*.{js,jsx,ts,tsx,md,mdx}',
            '**/_*/**',
            '**/*.test.{js,jsx,ts,tsx}',
            '**/__tests__/**',
            'MANUAL-TASKS.md',
          ],
          routeBasePath: '/',
          editUrl: 'https://github.com/aoneahsan/native-update-docs/edit/main/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: false,
          breadcrumbs: true,
        },
        // Release notes: one post per published release, its body the changelog entry for that version.
        blog: {
          path: 'blog',
          routeBasePath: 'blog',
          blogTitle: 'Native Update releases',
          blogDescription: 'Release notes for each published version of native-update, newest first.',
          blogSidebarTitle: 'Recent releases',
          showReadingTime: false,
          // A post's last update comes from git: shown under the post, and its sitemap lastmod.
          showLastUpdateTime: true,
          showLastUpdateAuthor: false,
          onInlineAuthors: 'throw',
          onInlineTags: 'throw',
          onUntruncatedBlogPosts: 'throw',
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
            title: 'Native Update releases',
            description: 'Release notes for each published version of native-update, newest first.',
            copyright: `Copyright © ${new Date().getFullYear()} Native Update.`,
            language: 'en-US',
          },
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          // Every URL carries a truthful lastmod and nothing else: search engines ignore changefreq and priority.
          lastmod: 'date',
          changefreq: null,
          priority: null,
          ignorePatterns: ['/tags/**', `${BLOG_PATH}/tags/**`, `${BLOG_PATH}/archive`, `${BLOG_PATH}/authors/**`, '/search'],
          // A page git cannot date (the blog list, a category index, /sitemap, /feed) takes the newest date it lists.
          createSitemapItems: async ({ defaultCreateSitemapItems, ...params }) =>
            withLastmod(await defaultCreateSitemapItems(params), BLOG_PATH),
        },
      } satisfies Preset.Options,
    ],
  ],

  // `/sitemap` and `/feed` for people, and `/feed.xml` beside `/sitemap.xml` for machines.
  plugins: [
    sitePages({ blogPath: BLOG_PATH }),
    [
      '@docusaurus/plugin-client-redirects',
      {
        // Pages removed or moved on 2026-10-26: the backend is a hosted service, not self-hostable.
        redirects: [
          { from: '/backend/laravel-nova-self-host', to: '/backend/overview' },
          { from: '/backend/nova-admin-overview', to: '/backend/overview' },
          { from: '/tutorials/backend-first-walkthrough', to: '/tutorials/first-ota-update' },
          { from: '/about-the-author', to: '/about' },
        ],
      },
    ],
  ],

  themeConfig: {
    image: 'img/social-card.svg',
    metadata: [
      { name: 'description', content: 'Documentation for native-update — Capacitor plugin for over-the-air bundle updates, in-app store update checks, and review prompts. Maintained by the Native Update team.' },
      { name: 'keywords', content: 'capacitor, native-update, OTA, live updates, hot reload, app updates, in-app updates, app review, code-push alternative, mobile updates, capacitor ota, capacitor live update, capacitor hot reload, capacitor over-the-air, capacitor update plugin' },
      { name: 'author', content: 'Native Update team' },
      { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:creator', content: '@aoneahsan' },
      { name: 'twitter:site', content: '@aoneahsan' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Native Update Docs' },
      { property: 'og:locale', content: 'en_US' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
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
          to: '/about',
          label: 'About',
          position: 'right',
        },
        {
          href: 'https://www.npmjs.com/package/native-update',
          label: 'npm',
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
          ],
        },
        {
          title: 'Site',
          // Files written after the pages are built (feeds, sitemap, llms.txt) are invisible to the link checker,
          // so they use `pathname://`, which links to the file as it is without routing.
          items: [
            { label: 'Releases', to: BLOG_PATH },
            { label: 'Feed', to: '/feed' },
            { label: 'Sitemap', to: '/sitemap' },
            { label: 'feed.xml', href: 'pathname:///feed.xml' },
            { label: 'sitemap.xml', href: 'pathname:///sitemap.xml' },
            { label: 'llms.txt', href: 'pathname:///llms.txt' },
          ],
        },
        {
          title: 'Native Update team',
          items: [
            { label: 'About Native Update', to: '/about' },
            { label: 'Contact', href: 'https://nativeupdate.aoneahsan.com/contact' },
            { label: 'Terms of Service', href: 'https://nativeupdate.aoneahsan.com/terms' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Native Update. Built with Docusaurus.`,
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
