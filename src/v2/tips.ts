import type { CoachCard } from './chapter'
import { hostingLoad } from './engine/infra'
import { marketCeiling } from './engine/market'
import { staleChurn } from './engine/churn'
import { pickResearchTemplates } from './founder'
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
    body: 'The free hosting tier holds 20 customers. Past 90% the app feels slow; past 100% it goes down. Upgrade in 💻 Desktop → Hosting (migrations take a few days).',
    when: s => s.v2.chapter.complete && hostingLoad(s) >= 0.75,
  },
  {
    id: 'tip-stress', title: 'Your team is getting tired',
    body: 'Non-stop work drains energy and builds stress. Give people idle time (set them to Idle for a while), or buy perks in the 🛒 Shop. Burnt-out or unhappy people quit. 💻 Desktop → Employees shows everyone’s mood and sets yearly raises.',
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
    id: 'tip-market', title: 'The market is filling up',
    body: 'You hold a big share of the market. Competitors now poach customers (more churn), emails find fewer leads and sales close less. Shipping features and building brand grow the market.',
    when: s => s.customers >= marketCeiling(s) * 0.4,
  },
  {
    id: 'tip-roadmap', title: 'Out of ideas',
    body: 'Research has nothing new left. Plan your next roadmap in 💻 Desktop → Roadmap: big projects your developers build together.',
    when: s => s.v2.chapter3.complete && pickResearchTemplates(s, () => 0, 1).templates.length === 0,
  },
  {
    id: 'tip-ads', title: 'Cold emails are drying up',
    body: 'You are big enough that cold emails reach far fewer people. Buy leads in 💻 Desktop → Ads, and add salespeople to close them.',
    when: s => s.customers >= 1000,
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
