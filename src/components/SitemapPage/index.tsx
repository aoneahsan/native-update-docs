import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from '@docusaurus/Link';
import { interpolate } from '@docusaurus/Interpolate';
import { usePluralForm, useQueryString } from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import type { SitePage, SitePagesData } from '@site/plugins/site-pages';
import { feedWords } from '@site/src/components/FeedPage/words';
import { GroupIcon, type GroupIconName } from './icons';
import { matches, queryTerms } from './match';
import { sitemapWords } from './words';
import styles from './styles.module.css';

/** The search's place in the address: `?q=`, the fleet's name for a search query. */
const QUERY_PARAM = 'q';

/** A page's card, with the words its search reads. */
interface Card extends SitePage {
  readonly haystack: string;
}

/** A group as the page draws it. */
interface Group {
  readonly key: string;
  readonly label: string;
  readonly icon: GroupIconName;
  readonly cards: readonly Card[];
}

/** A file machines read, with its one-line hint. */
interface MachineFile {
  readonly path: string;
  readonly label: string;
  readonly hint: string;
}

/** Props Docusaurus passes: the JSON the site-pages plugin wrote. */
interface SitemapPageProps {
  readonly site: SitePagesData;
}

/**
 * A page as a card. Its title, description and tag labels are also the words the search reads.
 *
 * @param page - the page
 * @returns the card
 */
function cardOf(page: SitePage): Card {
  return { ...page, haystack: [page.title, page.description, ...page.tags].join(' ') };
}

/**
 * The icon for a category's group: brackets for the SDK, backend and API reference, the page for any other category.
 *
 * @param key - the group's key, its first page's permalink
 * @returns the icon's name
 */
function categoryIcon(key: string): GroupIconName {
  return /^\/(reference|public-api|backend)\//.test(key) ? 'code' : 'docs';
}

/**
 * A heading id from a group's key.
 *
 * @param key - the group's key
 * @returns an id unique on the page
 */
function groupId(key: string): string {
  return `sitemap-${key.replace(/[^a-z\d]+/gi, '-').replace(/^-+|-+$/g, '') || 'home'}`;
}

/**
 * One page's card: a real link on its title, its description and its tag chips. The link stretches over the whole
 * card, so the card is one large target, and the link's name stays the page's title.
 */
function SitemapCard({ card }: { readonly card: Card }): ReactNode {
  return (
    <li className={styles.card}>
      <h3 className={styles.cardTitle}>
        <Link to={card.permalink} className={styles.cardLink}>
          {card.title}
        </Link>
      </h3>
      {card.description !== '' && <p className={styles.cardText}>{card.description}</p>}
      {card.tags.length > 0 && (
        <ul className={styles.tags}>
          {card.tags.map((tag) => (
            <li key={tag} className={styles.tag}>
              {tag}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * `/sitemap`: every page of the docs as a card, grouped in sidebar order and searchable by its words, with the files
 * machines read at the top. The search lives in the address (`?q=`, replaced, never pushed), so a search can be
 * shared. Docusaurus prerenders the page, so the whole list is in the HTML before any script runs.
 */
export default function SitemapPage({ site }: SitemapPageProps): ReactNode {
  const words = sitemapWords();
  const feed = feedWords();
  const { selectMessage } = usePluralForm();
  const [query, setQuery] = useQueryString(QUERY_PARAM);
  const [text, setText] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);

  // The address's query arrives after hydration (the prerendered page has none) and on Back or Forward. The address
  // holds the trimmed query, so while it matches what is typed, the field keeps its own spaces.
  useEffect(() => {
    setText((current) => (current.trim() === query ? current : query));
  }, [query]);

  const files: readonly MachineFile[] = [
    { path: '/sitemap.xml', ...words.sitemapXml },
    { path: '/feed.xml', ...words.feedXml },
    { path: `${site.blog.permalink}/rss.xml`, ...words.rss },
    { path: `${site.blog.permalink}/atom.xml`, ...words.atom },
    { path: '/llms.txt', ...words.llms },
  ];
  const feedPage: SitePage = { permalink: '/feed', title: feed.title, description: feed.metaDescription, tags: [] };
  const groups: readonly Group[] = [
    ...site.groups.map(
      (group): Group => ({
        key: group.key,
        label: group.kind === 'docs' ? words.groupDocs : group.label,
        icon: group.kind === 'docs' ? 'docs' : categoryIcon(group.key),
        cards: group.pages.map(cardOf),
      })
    ),
    { key: 'posts', label: words.groupPosts, icon: 'posts', cards: [site.blog, feedPage, ...site.posts].map(cardOf) },
  ];

  const asked = text.trim();
  const terms = queryTerms(asked);
  const shown = groups
    .map((group) => ({ ...group, cards: group.cards.filter((card) => matches(card.haystack, terms)) }))
    .filter((group) => group.cards.length > 0);
  const count = shown.reduce((sum, group) => sum + group.cards.length, 0);
  // The plural form is picked before the query goes in, so a "|" typed in the query cannot split the message.
  const countLine = interpolate(selectMessage(count, asked === '' ? words.count : words.countQuery), {
    count,
    query: asked,
  });

  const search = (value: string): void => {
    setText(value);
    if (value.trim() !== query) setQuery(value.trim());
  };
  const clear = (): void => {
    search('');
    inputRef.current?.focus();
  };

  return (
    <Layout title={words.title} description={words.metaDescription}>
      <main className={`container ${styles.page}`}>
        <header className={styles.header}>
          <h1 className={styles.title}>{words.title}</h1>
          <p className={styles.intro}>{words.intro}</p>
        </header>

        <section className={styles.files} aria-label={words.filesLabel}>
          <ul className={styles.fileList}>
            {files.map((file) => (
              <li key={file.path}>
                <Link to={`pathname://${file.path}`} target="_self" className={styles.fileLink}>
                  {file.label}
                </Link>
                <span className={styles.fileHint}>{file.hint}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className={styles.search} role="search">
          <label htmlFor="sitemap-search" className={styles.searchLabel}>
            {words.searchLabel}
          </label>
          <input
            ref={inputRef}
            id="sitemap-search"
            className={styles.searchInput}
            type="search"
            value={text}
            placeholder={words.searchPlaceholder}
            onChange={(event) => search(event.target.value)}
            aria-describedby="sitemap-count"
            autoComplete="off"
            enterKeyHint="search"
          />
          <p id="sitemap-count" className={styles.count} role="status">
            {countLine}
          </p>
        </div>

        {shown.map((group) => (
          <section key={group.key} className={styles.group} aria-labelledby={groupId(group.key)}>
            <h2 id={groupId(group.key)} className={styles.groupTitle}>
              <GroupIcon name={group.icon} className={styles.groupIcon} />
              {group.label}
            </h2>
            <ul className={styles.grid}>
              {group.cards.map((card) => (
                <SitemapCard key={card.permalink} card={card} />
              ))}
            </ul>
          </section>
        ))}

        {count === 0 && (
          <div className={styles.empty}>
            <h2 className={styles.emptyTitle}>{interpolate(words.emptyTitle, { query: asked })}</h2>
            <p className={styles.emptyText}>{words.emptyBody}</p>
            <button type="button" className={styles.button} onClick={clear}>
              {words.emptyAction}
            </button>
          </div>
        )}
      </main>
    </Layout>
  );
}
