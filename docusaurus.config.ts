import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { themes as prismThemes } from 'prism-react-renderer';
import type { Config, PluginConfig } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type { Options as BlogPluginOptions } from '@docusaurus/plugin-content-blog';
// Plugin version single source of truth: the ROOT native-update package.json,
// mirrored into this committed file by `yarn sync:from-plugin` (CI cannot read
// the private plugin repo). Never hardcode the version anywhere in this repo.
import pluginVersion from './plugin-version.json';
import sitePages, { withLastmod } from './plugins/site-pages';
import { OTHER_PLATFORMS } from './src/data/platforms';
import { POSTS_DESCRIPTION, POSTS_PATH, POSTS_TITLE } from './src/data/posts';

/** The blog's route: the blog plugin's `routeBasePath` below, with its leading slash. */
const BLOG_PATH = '/blog';

// The posts blog (posts/, served at /posts) loads only once posts/ holds a post, so the site never ships an empty
// posts page, feed or Posts link. The release notes stay the default blog instance, in blog/ at /blog.
const POSTS_DIR = path.join(__dirname, 'posts');
const HAS_POSTS = existsSync(POSTS_DIR) && readdirSync(POSTS_DIR).some((name) => name.endsWith('.md') || name.endsWith('.mdx'));

const POSTS_BLOG: PluginConfig = [
  '@docusaurus/plugin-content-blog',
  {
    id: 'posts',
    path: 'posts',
    routeBasePath: POSTS_PATH.slice(1),
    blogTitle: POSTS_TITLE,
    blogDescription: POSTS_DESCRIPTION,
    blogSidebarTitle: 'Recent posts',
    blogSidebarCount: 10,
    postsPerPage: 10,
    showReadingTime: false,
    // A post's last update comes from git: shown under the post, and its sitemap lastmod.
    showLastUpdateTime: true,
    showLastUpdateAuthor: false,
    // Every author is defined once, in posts/authors.yml; a tag needs a posts/tags.yml first.
    onInlineAuthors: 'throw',
    onInlineTags: 'throw',
    onUntruncatedBlogPosts: 'throw',
    feedOptions: {
      type: ['rss', 'atom'],
      xslt: true,
      title: POSTS_TITLE,
      description: POSTS_DESCRIPTION,
      copyright: `Copyright © ${new Date().getFullYear()} Native Update.`,
      language: 'en-US',
    },
  } satisfies BlogPluginOptions,
];

// ---------------------------------------------------------------------------
// Native Update — Documentation site config
// Maintained by the Native Update team (https://nativeupdate.aoneahsan.com)
// Source plugin: https://www.npmjs.com/package/native-update
// ---------------------------------------------------------------------------

const config: Config = {
  title: 'Native Update Docs',
  tagline: 'OTA updates, in-app store updates and review prompts for Capacitor, React Native, Flutter and Android apps.',
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
    { tagName: 'meta', attributes: { name: 'yandex-verification', content: 'bfb02722189028cf' } },
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
          'Documentation for Native Update: the Capacitor plugin, the React Native, Flutter and native Android SDKs, and the hosted service for over-the-air updates, in-app store update checks and review prompts.',
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
      {
        hashed: true,
        indexBlog: true,
        docsRouteBasePath: '/',
        // The posts blog joins the index once it is loaded (HAS_POSTS).
        blogDir: HAS_POSTS ? ['blog', 'posts'] : 'blog',
        blogRouteBasePath: HAS_POSTS ? [BLOG_PATH, POSTS_PATH] : BLOG_PATH,
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // `docs/` is BOTH the published content dir and the home of the
          // fixed-path internal files docs/MANUAL-TASKS.md and docs/PACKAGES.md. Keep the paths (the
          // global rule fixes it) but never publish it — this repo is public.
          // NOTE: `exclude` REPLACES the plugin defaults, so they are restated.
          exclude: [
            '**/_*.{js,jsx,ts,tsx,md,mdx}',
            '**/_*/**',
            '**/*.test.{js,jsx,ts,tsx}',
            '**/__tests__/**',
            'MANUAL-TASKS.md',
            'PACKAGES.md',
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
          ignorePatterns: [
            '/tags/**',
            `${BLOG_PATH}/tags/**`,
            `${BLOG_PATH}/archive`,
            `${BLOG_PATH}/authors/**`,
            `${POSTS_PATH}/tags`,
            `${POSTS_PATH}/tags/**`,
            `${POSTS_PATH}/archive`,
            `${POSTS_PATH}/authors`,
            `${POSTS_PATH}/authors/**`,
            `${POSTS_PATH}/page/**`,
            '/search',
          ],
          // A page git cannot date (a blog list, a category index, /sitemap, /feed) takes the newest date it lists.
          createSitemapItems: async ({ defaultCreateSitemapItems, ...params }) =>
            withLastmod(await defaultCreateSitemapItems(params), BLOG_PATH, HAS_POSTS ? POSTS_PATH : undefined),
        },
      } satisfies Preset.Options,
    ],
  ],

  // `/sitemap` and `/feed` for people, and `/feed.xml` beside `/sitemap.xml` for machines.
  plugins: [
    sitePages({ blogPath: BLOG_PATH, postsPath: HAS_POSTS ? POSTS_PATH : undefined }),
    ...(HAS_POSTS ? [POSTS_BLOG] : []),
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
    image: 'img/social-card.png',
    metadata: [
      { name: 'description', content: 'Documentation for Native Update — the Capacitor plugin and the React Native, Flutter and native Android SDKs for over-the-air updates, in-app store update checks, and review prompts. Maintained by the Native Update team.' },
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
        ...(HAS_POSTS ? [{ to: POSTS_PATH, label: 'Posts', position: 'left' as const }] : []),
        {
          to: '/about',
          label: 'About',
          position: 'right',
        },
        {
          type: 'dropdown',
          label: 'Get Native Update',
          position: 'right',
          items: [
            ...OTHER_PLATFORMS.map((platform) => ({ label: platform.name, href: platform.href })),
            { label: 'All apps', to: '/apps' },
          ],
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Get Native Update',
          items: [
            ...OTHER_PLATFORMS.map((platform) => ({ label: platform.name, href: platform.href })),
            { label: 'All apps', to: '/apps' },
          ],
        },
        {
          title: 'Documentation',
          items: [
            { label: 'Introduction', to: '/intro' },
            { label: 'Installation', to: '/getting-started/installation' },
            { label: 'Quick Start', to: '/getting-started/quick-start' },
            { label: 'Developers', to: '/developers' },
            { label: 'Two-step sign-in', to: '/developers/two-step-sign-in' },
          ],
        },
        {
          title: 'Site',
          // Files written after the pages are built (feeds, sitemap, llms.txt) are invisible to the link checker,
          // so they use `pathname://`, which links to the file as it is without routing.
          items: [
            { label: 'Releases', to: BLOG_PATH },
            ...(HAS_POSTS ? [{ label: 'Posts', to: POSTS_PATH }] : []),
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
      id: 'v4-4-1-ota-version-tags',
      content:
        'native-update 4.4.1 numbers each over-the-air build (1.16.1-nu1, -nu2…), so a phone shows which update it runs and what still needs a store release. <a href="/reference/cli/deploy#ota-version-tags">How tags work</a>',
      backgroundColor: '#0ea5e9',
      textColor: '#ffffff',
      isCloseable: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
