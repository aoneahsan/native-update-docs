import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import type { SitePagesData, SitePost } from '@site/plugins/site-pages';
import { feedWords } from './words';
import styles from './styles.module.css';

/** How long Copy link reads "Copied" before it is ready again. */
const COPIED_FOR_MS = 1500;

/** The RSS file this page prints, from the site root: the site-pages plugin's copy of the blog's RSS feed. */
const FEED_FILE = '/feed.xml';

type Words = ReturnType<typeof feedWords>;

/** Props Docusaurus passes: the JSON the site-pages plugin wrote. */
interface FeedPageProps {
  readonly site: SitePagesData;
}

/**
 * The post dates' format: the blog's own (the day, the month in words, the year, in UTC), in the site's locale.
 *
 * @returns the formatter
 */
function useDateFormat(): Intl.DateTimeFormat {
  const { i18n } = useDocusaurusContext();
  const locale = i18n.localeConfigs[i18n.currentLocale];
  return new Intl.DateTimeFormat(locale?.htmlLang ?? i18n.currentLocale, {
    calendar: locale?.calendar,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * The feed's link, printed in full with Copy link beside it. When the clipboard refuses (an insecure page, a denied
 * permission), the link is selected so it can be copied by hand, and the page says so.
 */
function CopyFeedLink({ url, words }: { readonly url: string; readonly words: Words }): ReactNode {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (state !== 'copied') return undefined;
    const timer = window.setTimeout(() => setState('idle'), COPIED_FOR_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  const refuse = (): void => {
    setState('failed');
    const link = linkRef.current;
    if (link === null) return;
    link.focus();
    window.getSelection()?.selectAllChildren(link);
  };
  const copy = (): void => {
    if (typeof navigator.clipboard?.writeText !== 'function') {
      refuse();
      return;
    }
    void navigator.clipboard.writeText(url).then(() => setState('copied'), refuse);
  };

  return (
    <div className={styles.copy} role="group" aria-labelledby="feed-rss-link">
      <span id="feed-rss-link" className={styles.copyLabel}>
        {words.rssLinkLabel}
      </span>
      <div className={styles.copyLine}>
        <Link ref={linkRef} to={`pathname://${FEED_FILE}`} target="_self" className={styles.url}>
          {url}
        </Link>
        <button type="button" className={styles.button} onClick={copy}>
          {state === 'copied' ? words.copied : words.copy}
        </button>
      </div>
      <span className={styles.visuallyHidden} aria-live="polite">
        {state === 'copied' ? words.copied : ''}
      </span>
      {state === 'failed' && (
        <p className={styles.alert} role="alert">
          {words.copyFailed}
        </p>
      )}
    </div>
  );
}

/** One post: its title as a link, the day it was published in a `<time>`, its description and Read the post. */
function FeedPost({
  post,
  words,
  format,
}: {
  readonly post: SitePost;
  readonly words: Words;
  readonly format: Intl.DateTimeFormat;
}): ReactNode {
  const titleId = `feed-post-${post.permalink.replace(/[^a-z\d]+/gi, '-').replace(/^-+|-+$/g, '')}`;
  return (
    <li className={styles.post}>
      <h2 id={titleId} className={styles.postTitle}>
        <Link to={post.permalink}>{post.title}</Link>
      </h2>
      <p className={styles.postDate}>
        <Translate
          id="docs.feed.item.published"
          values={{
            published_date: <time dateTime={post.date}>{format.format(new Date(`${post.date}T00:00:00Z`))}</time>,
          }}
        >
          {'Published {published_date}'}
        </Translate>
      </p>
      {post.description !== '' && <p className={styles.postText}>{post.description}</p>}
      <p className={styles.postAction}>
        <Link to={post.permalink} className={styles.buttonOutline} aria-describedby={titleId}>
          {words.read}
        </Link>
      </p>
    </li>
  );
}

/**
 * `/feed`: what RSS is and the feed's link to copy, the Atom feed beside it, then every release post newest first, and,
 * once the posts blog has a post, the team's posts with their own feeds. Docusaurus prerenders the page, so every post
 * is in the HTML before any script runs.
 */
export default function FeedPage({ site }: FeedPageProps): ReactNode {
  const words = feedWords();
  const format = useDateFormat();
  const feedUrl = useBaseUrl(FEED_FILE, { absolute: true });
  const hasTeamPosts = site.postsBlog !== null && site.postsBlog.posts.length > 0;

  return (
    <Layout title={words.title} description={hasTeamPosts ? words.metaDescriptionWithPosts : words.metaDescription}>
      <main className={`container ${styles.page}`}>
        <header className={styles.header}>
          <h1 id="feed-title" className={styles.title}>
            {words.title}
          </h1>
          <p className={styles.intro}>{hasTeamPosts ? words.introWithPosts : words.intro}</p>
        </header>

        <section className={styles.follow} aria-labelledby="feed-rss">
          <h2 id="feed-rss" className={styles.followTitle}>
            {words.rssHeading}
          </h2>
          <p>{words.rssBody}</p>
          <CopyFeedLink url={feedUrl} words={words} />
          <p className={styles.atom}>
            <Link to={`pathname://${site.blog.permalink}/atom.xml`} target="_self" className={styles.atomLink}>
              {words.atomLabel}
            </Link>{' '}
            <span className={styles.hint}>{words.atomHint}</span>
          </p>
        </section>

        {site.posts.length > 0 ? (
          <ol className={styles.posts} aria-labelledby="feed-title">
            {site.posts.map((post) => (
              <FeedPost key={post.permalink} post={post} words={words} format={format} />
            ))}
          </ol>
        ) : (
          <div className={styles.empty}>
            <h2 className={styles.emptyTitle}>{words.emptyTitle}</h2>
            <p className={styles.emptyText}>{words.emptyBody}</p>
          </div>
        )}

        {hasTeamPosts && site.postsBlog !== null && (
          <section className={styles.postsBlog} aria-labelledby="feed-posts">
            <div className={styles.follow}>
              <h2 id="feed-posts" className={styles.followTitle}>
                {words.postsHeading}
              </h2>
              <p>{words.postsBody}</p>
              <p className={styles.atom}>
                <Link to={`pathname://${site.postsBlog.page.permalink}/rss.xml`} target="_self" className={styles.atomLink}>
                  {words.postsRssLabel}
                </Link>
                {' · '}
                <Link to={`pathname://${site.postsBlog.page.permalink}/atom.xml`} target="_self" className={styles.atomLink}>
                  {words.postsAtomLabel}
                </Link>
              </p>
            </div>
            <ol className={styles.posts} aria-labelledby="feed-posts">
              {site.postsBlog.posts.map((post) => (
                <FeedPost key={post.permalink} post={post} words={words} format={format} />
              ))}
            </ol>
          </section>
        )}
      </main>
    </Layout>
  );
}
