import type { ReactNode } from 'react';
import Head from '@docusaurus/Head';
import SearchPage from '@theme-original/SearchPage';
import type SearchPageType from '@theme/SearchPage';
import type { WrapperProps } from '@docusaurus/types';

type Props = WrapperProps<typeof SearchPageType>;

/**
 * The search results page is a utility, not content: keep it out of search results. The search plugin writes its
 * robots tag as `<meta property="robots">`, which search engines do not read as a robots rule, so this wrapper adds
 * the `name="robots"` one (search audit SA-P06, the baseline docs `/search` record). It stays crawlable: no Disallow.
 */
export default function SearchPageWrapper(props: Props): ReactNode {
  return (
    <>
      <Head>
        <meta name="robots" content="noindex, follow" />
      </Head>
      <SearchPage {...props} />
    </>
  );
}
