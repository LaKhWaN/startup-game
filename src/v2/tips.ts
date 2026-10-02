import type { CoachCard } from './chapter'
import { hostingLoad, officeOpen } from './engine/infra'
import { marketCeiling } from './engine/market'
import { staleChurn } from './engine/churn'
import type { V2GameState } from './state'

interface Tip extends CoachCard {
  when: (s: V2GameState) => boolean
}

/** One card per new system, shown the first time it matters (after chapter cards). Spec §2 F. */
export const TIPS: Tip[] = [
  {
    id: 'tip-support', title: 'Customers need help',
    body: 'Support tickets are piling up. Unanswered tickets raise churn and scare off new buyers. Use 🎧 Support, or set a hire to Support.',
    when: s => s.v2.chapter.complete && (s.v2.tickets ?? 0) >= 3,
  },
  {
    id: 'tip-debt', title: 'Tech debt is growing',
    body: 'Rushed builds leave a mess: every build gets slower and incidents get likelier. 🧹 Refactor pays it down.',
    when: s => s.v2.chapter.complete && s.techDebt >= 30,
  },
  {
    id: 'tip-hosting', title: 'Your server is filling up',
    body: 'The free hosting tier holds 20 customers. Past 90% the app feels slow; past 100% it goes down. Upgrade in 💻 Infra (migrations take a few days).',
    when: s => s.v2.chapter.complete && hostingLoad(s) >= 0.75,
  },
  {
    id: 'tip-stress', title: 'Your team is getting tired',
    body: 'Non-stop work drains energy and builds stress. Give people idle time, let weekends happen, or buy perks in the 🛒 Shop. Burnt-out people quit.',
    when: s => Object.values(s.v2.team).some(m => (m.stress ?? 0) >= 60),
  },
  {
    id: 'tip-notice', title: 'Someone handed in notice',
    body: 'A burnt-out hire is leaving. Open their card to convince them to stay. Their company experience leaves with them.',
    when: s => Object.values(s.v2.team).some(m => m.leavingOn !== undefined),
  },
  {
    id: 'tip-shop', title: 'Make the office nicer',
    body: 'The 🛒 Shop has perks (coffee, plants, a game corner…) that keep people fresh, and better computers than that old XP laptop.',
    when: s => s.v2.chapter.complete && (s.v2.perks ?? []).length === 0 && s.cash >= 400,
  },
  {
    id: 'tip-night', title: 'Office hours',
    body: 'Your team works 9 to 5 on weekdays. You can keep going at night (🌙 Work late costs energy) or ⏭ skip to the morning.',
    when: s => Object.keys(s.v2.team).length > 0 && !officeOpen(s, s.gameTime.totalHours),
  },
  {
    id: 'tip-market', title: 'The market is filling up',
    body: 'You hold a big share of the market. Competitors now poach customers (more churn), emails find fewer leads and sales close less. Shipping features and building brand grow the market.',
    when: s => s.customers >= marketCeiling(s) * 0.4,
  },
  {
    id: 'tip-stale', title: 'Customers want something new',
    body: 'Nothing has shipped for a month, so customers start drifting away. Keep someone on 🛠️ Develop.',
    when: s => staleChurn(s) > 0,
  },
]

export function currentTip(s: V2GameState): CoachCard | null {
  const tip = TIPS.find(t => !s.v2.chapter.seenCards.includes(t.id) && t.when(s))
  return tip ? { id: tip.id, title: tip.title, body: tip.body } : null
}
