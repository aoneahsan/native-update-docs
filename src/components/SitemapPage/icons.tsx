import React, { type ReactNode } from 'react';

/** Which picture sits beside a group's heading: the guides, the API and SDK reference, or the posts. */
export type GroupIconName = 'docs' | 'code' | 'posts';

/** Each icon's shapes, drawn on a 24-unit grid with a round 1.75 stroke in the text's own colour. */
const SHAPES: Record<GroupIconName, ReactNode> = {
  docs: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <path d="M9 8h6M9 12h6M9 16h3.5" />
    </>
  ),
  code: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9.5 9.5 7 12l2.5 2.5M14.5 9.5 17 12l-2.5 2.5" />
    </>
  ),
  posts: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h10A1.5 1.5 0 0 1 17 5.5V18a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z" />
      <path d="M17 9h2.5A1.5 1.5 0 0 1 21 10.5V18a2 2 0 0 1-2 2" />
      <path d="M7.5 8.5h6M7.5 12h6M7.5 15.5h4" />
    </>
  ),
};

/**
 * A group's icon. It is decoration: the heading beside it says the same thing, so assistive tech skips it.
 *
 * @param props.name - which icon
 * @param props.className - sizing and colour from the page's styles
 * @returns the inline SVG
 */
export function GroupIcon({ name, className }: { readonly name: GroupIconName; readonly className?: string }): ReactNode {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {SHAPES[name]}
    </svg>
  );
}
