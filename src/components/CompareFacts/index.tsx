import React, { type ReactNode } from 'react';
import { translate } from '@docusaurus/Translate';
import data from '@site/src/data/competitors.json';
import styles from './styles.module.css';

/**
 * The dated facts on a moving page, from `src/data/competitors.json`: the product repo's comparison file, copied by
 * `yarn sync:compare` (CI cannot read the private repo). Every third-party link here carries `nofollow`, so a page
 * links to a rival only through `RivalLink`.
 */
type Status = 'yes' | 'no' | 'partial' | 'not-stated';
interface Feature { readonly status: string; readonly source?: string }
interface Price { readonly plan: string; readonly amount: number | null; readonly currency: string; readonly period: string; readonly note?: string; readonly source: string }
interface Rival { readonly slug: string; readonly name: string; readonly officialUrl: string; readonly lastChecked: string; readonly prices: readonly Price[]; readonly features: Readonly<Record<string, Feature>> }
interface OurPlan { readonly key: string; readonly name: string; readonly currency: string; readonly price_month_cents: number | null; readonly is_per_seat: boolean; readonly seat_min: number | null; readonly limits: { readonly apps: number | null; readonly mau: number | null } }

const rivals = data.competitors as unknown as readonly Rival[];
const ourFeatures = data.ours.features as Readonly<Record<string, { readonly status: string }>>;
const ourPlans = (data.ours.plans as readonly OurPlan[]).filter((plan) => plan.key !== 'enterprise');

function words() {
  return {
    checked: (date: string) => translate({ id: 'docs.compare.checked', message: 'Last checked {date}' }, { date }),
    plan: translate({ id: 'docs.compare.col.plan', message: 'Plan' }),
    price: translate({ id: 'docs.compare.col.price', message: 'Price' }),
    terms: translate({ id: 'docs.compare.col.terms', message: 'Terms' }),
    source: translate({ id: 'docs.compare.source', message: 'Source' }),
    feature: translate({ id: 'docs.compare.col.feature', message: 'Feature' }),
    ours: translate({ id: 'docs.compare.ours', message: 'Native Update' }),
    none: translate({ id: 'docs.compare.price.none', message: 'No price listed' }),
    status: {
      yes: translate({ id: 'docs.compare.status.yes', message: 'Yes' }),
      no: translate({ id: 'docs.compare.status.no', message: 'No' }),
      partial: translate({ id: 'docs.compare.status.partial', message: 'Partly' }),
      'not-stated': translate({ id: 'docs.compare.status.not_stated', message: 'Not stated on the pages we checked' }),
    } satisfies Record<Status, string>,
    costsTitle: (name: string) => translate({ id: 'docs.compare.costs', message: '{name} prices' }, { name }),
    ourCostsTitle: translate({ id: 'docs.compare.costs.ours', message: 'Native Update prices' }),
    featuresTitle: translate({ id: 'docs.compare.features', message: 'Feature by feature' }),
    perMonth: (amount: string) => translate({ id: 'docs.compare.price.month', message: '{amount} a month' }, { amount }),
    perSeat: (amount: string, min: number) => translate({ id: 'docs.compare.price.seat', message: '{amount} per seat a month, {min} seats minimum' }, { amount, min }),
    once: (amount: string) => translate({ id: 'docs.compare.price.once', message: '{amount} once' }, { amount }),
    apps: (count: string) => translate({ id: 'docs.compare.ours.apps', message: '{count} apps' }, { count }),
    appsUnlimited: translate({ id: 'docs.compare.ours.apps.unlimited', message: 'Unlimited apps' }),
    mau: (count: string) => translate({ id: 'docs.compare.ours.mau', message: '{count} monthly active users' }, { count }),
    mauPerMember: (count: string) => translate({ id: 'docs.compare.ours.mau.member', message: '{count} monthly active users per member' }, { count }),
  };
}

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 }).format(amount);

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

/** A link to a third party's page, there so a reader can check us: new tab, `noopener noreferrer nofollow`. */
export function RivalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow">
      {children}
    </a>
  );
}

function find(slug: string): Rival {
  const rival = rivals.find((row) => row.slug === slug);
  if (!rival) throw new Error(`CompareFacts: no rival "${slug}" in src/data/competitors.json`);
  return rival;
}

/** The date and the rival's own link, for the top of a page. */
export function CheckedLine({ slug }: { slug: string }) {
  const rival = find(slug);
  const w = words();
  return (
    <p className={styles.checked}>
      <time dateTime={rival.lastChecked}>{w.checked(shortDate(rival.lastChecked))}</time>
      {' · '}
      <RivalLink href={rival.officialUrl}>{rival.name}</RivalLink>
    </p>
  );
}

/** The dated fact table: their prices, ours from the plan rows, and every feature row with its source. */
export function CompareFacts({ slug }: { slug: string }) {
  const rival = find(slug);
  const w = words();
  const priceText = (price: Price) => {
    if (price.amount === null) return w.none;
    const amount = money(price.amount, price.currency);
    if (price.amount === 0) return amount;
    return price.period === 'once' ? w.once(amount) : w.perMonth(amount);
  };
  return (
    <div className={styles.facts}>
      <p className={styles.label}>{w.costsTitle(rival.name)}</p>
      <table>
        <thead>
          <tr>
            <th scope="col">{w.plan}</th>
            <th scope="col">{w.price}</th>
            <th scope="col">{w.terms}</th>
            <th scope="col">{w.source}</th>
          </tr>
        </thead>
        <tbody>
          {rival.prices.map((price) => (
            <tr key={price.plan}>
              <td>{price.plan}</td>
              <td>{priceText(price)}</td>
              <td>{price.note}</td>
              <td>
                <RivalLink href={price.source}>{w.source}</RivalLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.label}>{w.ourCostsTitle}</p>
      <table>
        <thead>
          <tr>
            <th scope="col">{w.plan}</th>
            <th scope="col">{w.price}</th>
            <th scope="col">{w.terms}</th>
          </tr>
        </thead>
        <tbody>
          {ourPlans.map((plan) => {
            const amount = money((plan.price_month_cents ?? 0) / 100, plan.currency);
            const count = (value: number) => new Intl.NumberFormat('en-US').format(value);
            return (
              <tr key={plan.key}>
                <td>{plan.name}</td>
                <td>{plan.price_month_cents === null ? amount : plan.is_per_seat ? w.perSeat(amount, plan.seat_min ?? 3) : w.perMonth(amount)}</td>
                <td>
                  {plan.limits.apps === null ? w.appsUnlimited : w.apps(count(plan.limits.apps))}, {(plan.is_per_seat ? w.mauPerMember : w.mau)(count(plan.limits.mau ?? 0))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className={styles.label}>{w.featuresTitle}</p>
      <table>
        <thead>
          <tr>
            <th scope="col">{w.feature}</th>
            <th scope="col">{rival.name}</th>
            <th scope="col">{w.ours}</th>
          </tr>
        </thead>
        <tbody>
          {data.features.map((feature) => {
            const theirs = rival.features[feature.key];
            return (
              <tr key={feature.key}>
                <td>{feature.label}</td>
                <td>
                  {w.status[theirs.status as Status]}
                  {theirs.source ? (
                    <>
                      {' · '}
                      <RivalLink href={theirs.source}>{w.source}</RivalLink>
                    </>
                  ) : null}
                </td>
                <td>{w.status[ourFeatures[feature.key].status as Status]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className={styles.checked}>
        <time dateTime={rival.lastChecked}>{w.checked(shortDate(rival.lastChecked))}</time>
      </p>
    </div>
  );
}
