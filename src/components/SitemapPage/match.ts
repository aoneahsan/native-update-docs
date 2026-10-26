/**
 * The sitemap page's search: the typo-tolerant matcher from the sitemap skill (`references/formats.md`). Every word
 * of the query must match some word of a page (its title, description and tag labels) by substring, by prefix, or
 * within one edit, two from eight letters.
 */

/**
 * The words a query asks for.
 *
 * @param query - what the reader typed
 * @returns the query's words, lowercased
 */
export function queryTerms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Edit distance with swapped neighbours as one edit (optimal string alignment), stopping once past `max`.
 *
 * @param a - the query term
 * @param b - the start of a page's word
 * @param max - the most edits allowed
 * @returns whether `a` is within `max` edits of `b`
 */
function within(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let before: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        row[j] = Math.min(row[j], before[j - 2] + 1);
      }
    }
    if (Math.min(...row) > max) return false;
    before = prev;
    prev = row;
  }
  return prev[b.length] <= max;
}

/**
 * Whether a page's words hold every term of the query.
 *
 * @param haystack - the page's title, description and tag labels
 * @param terms - the query's words, lowercased ({@link queryTerms})
 * @returns true when every term matches some word of the page
 */
export function matches(haystack: string, terms: readonly string[]): boolean {
  const text = haystack.toLowerCase();
  const words = text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return terms.every((term) => {
    if (text.includes(term)) return true;
    if (term.length < 4) return false;
    const max = term.length >= 8 ? 2 : 1;
    return words.some((word) => {
      for (let length = Math.max(1, term.length - max); length <= term.length + max; length++) {
        if (within(term, word.slice(0, length), max)) return true;
      }
      return false;
    });
  });
}
