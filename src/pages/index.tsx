import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import styles from './index.module.css';

type Feature = {
  title: string;
  body: string;
};

const FEATURES: Feature[] = [
  {
    title: 'Live OTA bundle updates',
    body: 'Push JavaScript and asset changes to installed Capacitor apps without re-submitting to the App Store or Play Store. Channels, signing, rollback, and integrity checks built in.',
  },
  {
    title: 'In-app store updates',
    body: 'Wraps Google Play In-App Updates and the iOS App Store version check. Trigger immediate or flexible update flows from inside your app — same API on both platforms.',
  },
  {
    title: 'In-app review prompts',
    body: 'Shows the native review sheet (Play In-App Review / SKStoreReviewController) at the right moment, with sensible default throttling so you never burn the user’s once-per-quarter limit.',
  },
  {
    title: 'Background updates',
    body: 'Battery-aware, network-aware silent update checks via WorkManager (Android) and BGTaskScheduler (iOS). Configurable notification preferences and constraints.',
  },
  {
    title: 'Bundle integrity & signing',
    body: 'SHA-256 / SHA-512 checksums and RSA / ECDSA signatures. Public-key verification on device. Optional certificate pinning. Signing CLI included.',
  },
  {
    title: 'Reference Laravel + Nova backend',
    body: 'Self-host the update server in minutes. The CLI scaffolds a Laravel + Nova admin you can deploy anywhere — or use the hosted Native Update SaaS if you prefer.',
  },
];

function HomepageHeader(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
        <p className={styles.heroTagline}>{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/getting-started/quick-start"
          >
            Quick Start — 5 min
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/getting-started/installation"
          >
            Installation
          </Link>
          <Link
            className="button button--outline button--lg"
            href="https://www.npmjs.com/package/native-update"
          >
            View on npm
          </Link>
        </div>
      </div>
    </header>
  );
}

function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.featuresWrap}>
      <div className="container">
        <div className="row">
          {FEATURES.map((f) => (
            <div key={f.title} className="col col--4" style={{ marginBottom: '1.5rem' }}>
              <div className={styles.featureCard}>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureBody}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AuthorStrip(): ReactNode {
  return (
    <section className={styles.authorStrip}>
      <div className="container">
        <p>
          Built and maintained by{' '}
          <Link href="https://aoneahsan.com">Ahsan Mahmood</Link> —{' '}
          <Link href="https://linkedin.com/in/aoneahsan">LinkedIn</Link> ·{' '}
          <Link href="https://github.com/aoneahsan">GitHub</Link> ·{' '}
          <Link href="https://www.npmjs.com/~aoneahsan">npm</Link>
        </p>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} — Capacitor OTA + In-App Updates`}
      description="Documentation for native-update: OTA bundle updates, in-app store update prompts, app review prompts, and background updates for Capacitor apps."
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <AuthorStrip />
      </main>
    </Layout>
  );
}
