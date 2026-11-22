/**
 * The posts blog's own words, in one place: its plugin instance (`id: 'posts'` in docusaurus.config.ts) reads them
 * from here. Posts live in posts/; until the first one is published that instance is not loaded, so there is no Posts
 * link and no posts page. The release notes are the other blog instance, in blog/ at /blog.
 */

/** The posts blog's route, with its leading slash: its plugin instance's `routeBasePath`. */
export const POSTS_PATH = '/posts';

export const POSTS_TITLE = 'Native Update posts';

export const POSTS_DESCRIPTION =
  'One part of the release path per post, from a fix on your laptop to a signed update on every phone.';
