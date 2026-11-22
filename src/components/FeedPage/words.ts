import { translate } from '@docusaurus/Translate';

/**
 * The feed page's words: section D of the approved search-discovery words, keyed as there. Each goes through
 * Docusaurus's `translate`, so a second locale needs a translation file and no edit here. "Published
 * {published_date}" lives in the page itself, because its date is a `<time>` element. The sitemap page reads the title
 * and meta description for the feed's own card.
 *
 * @returns the page's words
 */
export function feedWords() {
  return {
    title: translate({ id: 'docs.feed.title', message: 'Feed' }),
    metaDescription: translate({
      id: 'docs.feed.meta.description',
      message: 'Native Update release notes, newest first, with RSS and Atom links for your feed-reader app.',
    }),
    intro: translate({ id: 'docs.feed.intro', message: 'Every Native Update release post, newest first.' }),
    introWithPosts: translate({
      id: 'docs.feed.intro_with_posts',
      message: 'Every Native Update release post, newest first, then the team’s posts.',
    }),
    metaDescriptionWithPosts: translate({
      id: 'docs.feed.meta.description_with_posts',
      message:
        'Native Update release notes and the team’s posts, newest first, with RSS and Atom links for your feed-reader app.',
    }),
    rssHeading: translate({ id: 'docs.feed.rss.heading', message: 'Follow by RSS' }),
    rssBody: translate({
      id: 'docs.feed.rss.body',
      message:
        'RSS is a plain list of new posts that feed-reader apps check for you. Copy the link below into yours, and each new release shows up there on its own.',
    }),
    rssLinkLabel: translate({ id: 'docs.feed.rss.link_label', message: 'RSS link' }),
    copy: translate({ id: 'docs.feed.copy', message: 'Copy link' }),
    copied: translate({ id: 'docs.feed.copied', message: 'Copied' }),
    copyFailed: translate({
      id: 'docs.feed.copy_failed',
      message: 'Couldn’t copy. Select the link and copy it yourself.',
    }),
    atomLabel: translate({ id: 'docs.feed.atom.label', message: 'Atom feed' }),
    atomHint: translate({ id: 'docs.feed.atom.hint', message: 'The same posts in Atom.' }),
    read: translate({ id: 'docs.feed.item.read', message: 'Read the post' }),
    postsHeading: translate({ id: 'docs.feed.posts.heading', message: 'Posts from the team' }),
    postsBody: translate({
      id: 'docs.feed.posts.body',
      message: 'One part of the release path per post, newest first. They have their own RSS and Atom links.',
    }),
    postsRssLabel: translate({ id: 'docs.feed.posts.rss_label', message: 'Posts RSS feed' }),
    postsAtomLabel: translate({ id: 'docs.feed.posts.atom_label', message: 'Posts Atom feed' }),
    emptyTitle: translate({ id: 'docs.feed.empty.title', message: 'No posts yet' }),
    emptyBody: translate({
      id: 'docs.feed.empty.body',
      message: 'The first one shows up here, and in your feed reader, when it’s published.',
    }),
  };
}
