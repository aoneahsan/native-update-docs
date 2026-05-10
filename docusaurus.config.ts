import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// ---------------------------------------------------------------------------
// Native Update — Documentation site config
// Author: Ahsan Mahmood (https://aoneahsan.com)
// Source plugin: https://www.npmjs.com/package/native-update
// ---------------------------------------------------------------------------

const config: Config = {
  title: 'Native Update Docs',
  tagline: 'OTA bundle updates, in-app store updates, and review prompts for Capacitor apps.',
  favicon: 'img/favicon.svg',

  // Production URL — replace once Firebase Hosting site is live (Batch 10)
  url: 'https://docs.nativeupdate.aoneahsan.com',
  baseUrl: '/',

  // GitHub Pages metadata (also used by docusaurus deploy and og tags)
  organizationName: 'aoneahsan',
  projectName: 'native-update-docs',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'warn',

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
  themes: ['@docusaurus/theme-mermaid'],

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
      { name: 'keywords', content: 'capacitor, native-update, OTA, live updates, hot reload, app updates, in-app updates, app review, code-push alternative, mobile updates' },
      { name: 'author', content: 'Ahsan Mahmood' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:creator', content: '@aoneahsan' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Native Update Docs' },
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
      id: 'v3-released',
      content:
        'native-update v3.0.0 is here — HTTP-only backend contract, Laravel + Nova reference implementation, Firebase removed from the SDK.',
      backgroundColor: '#0ea5e9',
      textColor: '#ffffff',
      isCloseable: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
