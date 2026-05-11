import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

/**
 * Sidebar layout for native-update docs.
 *
 * Sections marked "(Batch N)" are populated in the indicated batch of the
 * docs-site project plan. Empty categories show only existing pages until
 * later batches add the missing files.
 */
const sidebars: SidebarsConfig = {
  mainSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
        // 'getting-started/configuration',  // Batch 4
      ],
    },
    {
      type: 'category',
      label: 'SDK Reference',
      collapsed: false,
      items: [
        {
          type: 'category',
          label: 'Live Update (OTA)',
          collapsed: true,
          items: [
            'reference/sdk/live-update/overview',
            'reference/sdk/live-update/methods',
            'reference/sdk/live-update/types',
            'reference/sdk/live-update/enums',
            'reference/sdk/live-update/events',
            'reference/sdk/live-update/config',
          ],
        },
        {
          type: 'category',
          label: 'App Update',
          collapsed: true,
          items: [
            'reference/sdk/app-update/overview',
            'reference/sdk/app-update/methods',
            'reference/sdk/app-update/types',
            'reference/sdk/app-update/events',
            'reference/sdk/app-update/config',
          ],
        },
        {
          type: 'category',
          label: 'App Review',
          collapsed: true,
          items: [
            'reference/sdk/app-review/overview',
            'reference/sdk/app-review/methods',
            'reference/sdk/app-review/config',
          ],
        },
        {
          type: 'category',
          label: 'Background Update',
          collapsed: true,
          items: [
            'reference/sdk/background-update/overview',
            'reference/sdk/background-update/methods',
            'reference/sdk/background-update/config',
            'reference/sdk/background-update/events',
          ],
        },
        {
          type: 'category',
          label: 'Security',
          collapsed: true,
          items: [
            'reference/sdk/security/overview',
            'reference/sdk/security/error-codes',
            'reference/sdk/security/certificate-pinning',
          ],
        },
        {
          type: 'category',
          label: 'Core',
          collapsed: true,
          items: [
            'reference/sdk/core/lifecycle',
            'reference/sdk/core/config',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'CLI Reference',
      collapsed: true,
      items: [
        'reference/cli/overview',
        'reference/cli/init',
        'reference/cli/keys-generate',
        'reference/cli/bundle-create',
        'reference/cli/bundle-sign',
        'reference/cli/bundle-verify',
        'reference/cli/server-start',
        'reference/cli/monitor',
        'reference/cli/backend-create',
      ],
    },
    // {
    //   type: 'category',
    //   label: 'SDK Reference (placeholder for later batches)',
    //   collapsed: true,
    //   items: [
    //     {
    //       type: 'category',
    //       label: 'Background Update',  // Batch 4
    //       items: [
    //         'reference/sdk/background-update/overview',
    //         'reference/sdk/background-update/methods',
    //         'reference/sdk/background-update/config',
    //         'reference/sdk/background-update/events',
    //       ],
    //     },
    //     {
    //       type: 'category',
    //       label: 'Security',  // Batch 4
    //       items: [
    //         'reference/sdk/security/overview',
    //         'reference/sdk/security/error-codes',
    //         'reference/sdk/security/certificate-pinning',
    //       ],
    //     },
    //     {
    //       type: 'category',
    //       label: 'Core',  // Batch 4
    //       items: [
    //         'reference/sdk/core/lifecycle',
    //         'reference/sdk/core/config',
    //       ],
    //     },
    //   ],
    // },
    // {
    //   type: 'category',
    //   label: 'Backend',  // Batch 6
    //   collapsed: true,
    //   items: [
    //     'backend/overview',
    //     'backend/laravel-nova-self-host',
    //     'backend/node-express-minimal',
    //     'backend/api-contract',
    //     'backend/nova-admin-overview',
    //   ],
    // },
    // {
    //   type: 'category',
    //   label: 'Platforms',  // Batch 7
    //   collapsed: true,
    //   items: [
    //     'platforms/android',
    //     'platforms/ios',
    //     'platforms/web',
    //   ],
    // },
    // {
    //   type: 'category',
    //   label: 'Tutorials',  // Batch 8
    //   collapsed: true,
    //   items: [
    //     'tutorials/first-ota-update',
    //     'tutorials/backend-first-walkthrough',
    //   ],
    // },
    // {
    //   type: 'category',
    //   label: 'How-to guides',  // Batch 8
    //   collapsed: true,
    //   items: [
    //     'how-to/manage-channels',
    //     'how-to/rotate-signing-keys',
    //     'how-to/roll-back-bundle',
    //     'how-to/migrate-from-codepush',
    //     'how-to/ci-cd-github-actions',
    //     'how-to/test-bundles-locally',
    //   ],
    // },
    // {
    //   type: 'category',
    //   label: 'Concepts',  // Batch 9
    //   collapsed: true,
    //   items: [
    //     'concepts/how-ota-works',
    //     'concepts/bundle-integrity',
    //     'concepts/update-strategies',
    //     'concepts/architecture',
    //     'concepts/security-model',
    //     'concepts/error-handling',
    //   ],
    // },
    {
      type: 'category',
      label: 'About',
      collapsed: true,
      items: ['about-the-author'],
    },
  ],
};

export default sidebars;
