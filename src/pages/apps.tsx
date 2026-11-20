import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import {APPS_PAGE, CURRENT_SURFACE, PLATFORMS} from '@site/src/data/platforms';
import styles from './apps.module.css';

/** `/apps` — "Get {Product}": every released surface, from `src/data/platforms.ts`. */
export default function Apps(): ReactNode {
  return (
    <Layout title={APPS_PAGE.title} description={APPS_PAGE.description}>
      <main className="container margin-vert--xl">
        <Heading as="h1">{APPS_PAGE.title}</Heading>
        <p className={styles.lead}>{APPS_PAGE.lead}</p>
        <div className={styles.grid}>
          {PLATFORMS.map((platform) => {
            const current = platform.id === CURRENT_SURFACE;
            return (
              <article key={platform.id} className={styles.card}>
                <span className={styles.kicker}>{platform.name}</span>
                <Heading as="h2" className={styles.title}>{platform.title}</Heading>
                <p>{platform.text}</p>
                {current
                  ? <span className={styles.here}>You're reading it</span>
                  : <Link className={platform.primary ? 'button button--primary' : 'button button--secondary'} href={platform.href}>{platform.cta}</Link>}
              </article>
            );
          })}
        </div>
      </main>
    </Layout>
  );
}
