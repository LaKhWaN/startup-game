import type { GameEvent, GameState } from '../types'

// ─── Helper ────────────────────────────────────────────────────────────────
const roll = () => Math.random()

export const EVENTS: GameEvent[] = [
  // ─── CRISIS ───────────────────────────────────────────────────────────────

  {
    id: 'aws-spike',
    category: 'crisis',
    title: 'AWS Bill Spiked',
    description:
      'Your cloud bill came in 4× higher than expected. Could be a one-time traffic surge — or a leak. $1,200 due now.',
    choices: [
      {
        label: 'Pay it and escalate to support',
        consequence:
          'You paid and opened a support ticket. Whether they found the root cause is another story.',
        effect: (s: GameState) => {
          const r = roll()
          // 60% → resolved, nothing more; 40% → spike was ongoing, infra cost rises
          return r < 0.6
            ? { cash: s.cash - 1200 }
            : { cash: s.cash - 1200, infraCostMonthly: s.infraCostMonthly + 350 }
        },
      },
      {
        label: 'Delay payment — investigate first',
        consequence:
          'You held off on paying while the team dug in. The window to act was short.',
        effect: (s: GameState) => {
          const r = roll()
          // 45% → team patches it in time, no cost; 55% → partial outage, churn spike
          return r < 0.45
            ? {}
            : {
                churnRate: Math.min(s.churnRate + 9, 60),
                customers: Math.max(0, Math.floor(s.customers * 0.88)),
              }
        },
      },
    ],
  },

  {
    id: 'critical-bug',
    category: 'crisis',
    title: 'Critical Bug in Production',
    description:
      'A bug is breaking core functionality for roughly 20% of sessions. Users are already complaining on social.',
    choices: [
      {
        label: 'Drop everything — fix it now',
        consequence:
          'Your dev team dropped the roadmap to patch it. Rushed fixes carry their own risks.',
        effect: (s: GameState) => {
          const r = roll()
          // 65% → clean fix, churn improves; 35% → rushed patch introduces regression
          return r < 0.65
            ? { churnRate: Math.max(3, s.churnRate - 3) }
            : { churnRate: Math.min(s.churnRate + 5, 60), techDebt: Math.min(100, s.techDebt + 10) }
        },
      },
      {
        label: 'Workaround notice + stay on roadmap',
        consequence:
          'You posted a workaround and kept shipping. Not everyone reads the docs.',
        effect: (s: GameState) => {
          const r = roll()
          // 30% → most users use the workaround fine; 70% → angry users churn
          return r < 0.30
            ? { churnRate: Math.min(s.churnRate + 2, 60) }
            : { churnRate: Math.min(s.churnRate + 11, 60), brand: Math.max(0, s.brand - 8) }
        },
      },
    ],
  },

  {
    id: 'founder-burnout',
    category: 'crisis',
    title: 'Team Is Running on Fumes',
    description:
      "Morale has been sinking for weeks. Two people look close to quitting. You can feel it in the standups.",
    choices: [
      {
        label: 'Call a recovery sprint — slow the week',
        consequence:
          'You gave the team breathing room. The market didn\'t slow down to wait.',
        effect: (s: GameState) => {
          const r = roll()
          // 55% → team resets, morale spike; 45% → competitor shipped something in the meantime
          if (r < 0.55) {
            return {
              employees: s.employees.map(e => ({
                ...e,
                morale: Math.min(100, e.morale + 18),
                stress: Math.max(0, e.stress - 20),
              })),
            }
          } else {
            return {
              customers: Math.max(0, s.customers - Math.floor(s.customers * 0.06)),
              employees: s.employees.map(e => ({
                ...e,
                morale: Math.min(100, e.morale + 10),
                stress: Math.max(0, e.stress - 12),
              })),
            }
          }
        },
      },
      {
        label: 'Push through — ship more this week',
        consequence:
          "You rallied the team and pushed harder. High pressure either forges or breaks people.",
        effect: (s: GameState) => {
          const r = roll()
          // 40% → team rallies, productivity spike; 60% → someone burns out hard
          if (r < 0.40) {
            return {
              productProgress: Math.min(100, s.productProgress + 6),
              employees: s.employees.map(e => ({
                ...e,
                stress: Math.min(100, e.stress + 10),
              })),
            }
          } else {
            return {
              employees: s.employees.map(e => ({
                ...e,
                morale: Math.max(0, e.morale - 22),
                stress: Math.min(100, e.stress + 30),
              })),
              churnRate: Math.min(s.churnRate + 4, 60),
            }
          }
        },
      },
    ],
  },

  {
    id: 'payment-failures',
    category: 'crisis',
    title: 'Subscription Payments Failing',
    description:
      '6 customers had their cards decline this billing cycle. Silence from them suggests they may just leave.',
    choices: [
      {
        label: 'Reach out personally to each one',
        consequence:
          'You spent half a day sending personal emails. People respond differently to that kind of effort.',
        effect: (s: GameState) => {
          const r = roll()
          // 55% → save 4-5 of them; 45% → they'd already decided to leave, 2 saved max
          return r < 0.55
            ? { customers: s.customers + 4 }
            : { customers: Math.max(0, s.customers - 4) }
        },
      },
      {
        label: 'Auto-retry + dunning emails',
        consequence:
          'You triggered auto-retry and let the system send dunning sequences. Automation hits different people differently.',
        effect: (s: GameState) => {
          const r = roll()
          // 50% → 3 recover; 50% → only 1 recovers + others leave annoyed
          return r < 0.50
            ? { customers: s.customers + 2 }
            : {
                customers: Math.max(0, s.customers - 5),
                churnRate: Math.min(s.churnRate + 3, 60),
              }
        },
      },
    ],
  },

  {
    id: 'hosting-costs-doubled',
    category: 'crisis',
    title: 'Hosting Tier Jumped Overnight',
    description:
      'You hit a new usage tier. Your provider raised your monthly bill by $450. Permanently.',
    choices: [
      {
        label: 'Accept the new plan (+$450/mo)',
        consequence:
          'You upgraded. The infrastructure held — this time.',
        effect: (s: GameState) => {
          const r = roll()
          // 75% → stable; 25% → next tier triggers even sooner due to growth
          return r < 0.75
            ? { infraCostMonthly: s.infraCostMonthly + 450 }
            : { infraCostMonthly: s.infraCostMonthly + 750 }
        },
      },
      {
        label: 'Optimize to stay under the limit',
        consequence:
          'You assigned the team to optimize. Performance work is unpredictable.',
        effect: (s: GameState) => {
          const r = roll()
          // 50% → stays flat; 50% → optimization broke something, churn spike
          return r < 0.50
            ? { productProgress: Math.max(0, s.productProgress - 4) }
            : {
                productProgress: Math.max(0, s.productProgress - 4),
                churnRate: Math.min(s.churnRate + 6, 60),
                techDebt: Math.min(100, s.techDebt + 8),
              }
        },
      },
    ],
  },

  {
    id: 'naming-dispute',
    category: 'crisis',
    title: 'Cease & Desist on Your Name',
    description:
      "A larger company claims your product name infringes their trademark. Their legal team sent a formal notice.",
    choices: [
      {
        label: 'Settle and rebrand quickly ($600)',
        consequence:
          'You paid and rebranded. Sometimes that closes the door — sometimes it opens negotiations.',
        effect: (s: GameState) => {
          const r = roll()
          // 70% → done; 30% → they come back for more
          return r < 0.70
            ? { cash: s.cash - 600 }
            : { cash: s.cash - 600, brand: Math.max(0, s.brand - 12) }
        },
      },
      {
        label: 'Fight it — hire a lawyer ($1,200)',
        consequence:
          'You engaged legal counsel and pushed back. IP disputes rarely go the way you expect.',
        effect: (s: GameState) => {
          const r = roll()
          // 35% → win, only legal fees; 65% → lose, rebrand PLUS fees, brand hit
          return r < 0.35
            ? { cash: s.cash - 1200 }
            : { cash: s.cash - 1200, brand: Math.max(0, s.brand - 18) }
        },
      },
    ],
  },

  {
    id: 'key-customer-refund',
    category: 'crisis',
    title: 'Biggest Customer Wants Out',
    description:
      "Your largest customer (~30% of MRR) says the product doesn't meet their needs. They want a refund.",
    choices: [
      {
        label: 'Refund them and let them go cleanly',
        consequence:
          'You processed the refund professionally. How they talk about you afterward is up to them.',
        effect: (s: GameState) => {
          const lost = Math.max(1, Math.floor(s.customers * 0.28))
          const r = roll()
          // 50% → they leave a positive review (brand up); 50% → they write a negative one
          return r < 0.50
            ? { customers: Math.max(0, s.customers - lost), brand: Math.min(100, s.brand + 6) }
            : { customers: Math.max(0, s.customers - lost), brand: Math.max(0, s.brand - 10) }
        },
      },
      {
        label: 'Negotiate — offer 2 free months',
        consequence:
          'You tried to retain them with a deal. Not everyone stays because of discounts.',
        effect: (s: GameState) => {
          const r = roll()
          const freebieHit = s.mrr * 0.3 * 2
          const lost = Math.max(1, Math.floor(s.customers * 0.28))
          // 50% → they stay (but cost you 2mo of their MRR); 50% → take the free months then churn
          return r < 0.50
            ? { cash: s.cash - freebieHit }
            : {
                cash: s.cash - freebieHit,
                customers: Math.max(0, s.customers - lost),
              }
        },
      },
    ],
  },

  {
    id: 'key-employee-quit',
    category: 'crisis',
    title: 'Your Best Developer Is Quitting',
    description:
      "They got a competing offer. They said they'd consider staying — for the right signal.",
    choices: [
      {
        label: 'Counter-offer (+$1,200/mo salary)',
        consequence:
          'You made the counter-offer. Money keeps some people; others have already made up their mind.',
        effect: (s: GameState) => {
          const r = roll()
          const devs = s.employees.filter(e => e.role === 'developer')
          if (devs.length === 0) return {}
          const topDev = devs.reduce((a, b) => (a.level > b.level ? a : b))
          // 55% → they stay at higher salary; 45% → they leave anyway
          if (r < 0.55) {
            return {
              employees: s.employees.map(e =>
                e.id === topDev.id ? { ...e, salary: e.salary + 1200, morale: Math.min(100, e.morale + 10) } : e
              ),
            }
          } else {
            return {
              employees: s.employees.filter(e => e.id !== topDev.id),
              culture: Math.max(0, s.culture - 12),
              techDebt: Math.min(100, s.techDebt + 18),
            }
          }
        },
      },
      {
        label: "Respect their decision — let them go",
        consequence:
          "You parted ways professionally. The team noticed, and the codebase doesn't maintain itself.",
        effect: (s: GameState) => {
          const devs = s.employees.filter(e => e.role === 'developer')
          if (devs.length === 0) return {}
          const topDev = devs.reduce((a, b) => (a.level > b.level ? a : b))
          return {
            employees: s.employees.filter(e => e.id !== topDev.id),
            culture: Math.max(0, s.culture - 6),
            techDebt: Math.min(100, s.techDebt + 20),
            features: s.features.map(f =>
              f.status === 'in_development' && f.assignedToDevId === topDev.id
                ? { ...f, buildProgress: f.buildProgress * 0.5 }
                : f
            ),
          }
        },
      },
    ],
  },

  {
    id: 'security-breach',
    category: 'crisis',
    title: 'Security Vulnerability Discovered',
    description:
      "A researcher found a vulnerability that could expose customer data. It hasn't been exploited yet — as far as you know.",
    choices: [
      {
        label: 'Disclose publicly and patch immediately',
        consequence:
          'You notified users and published a postmortem. Transparency is a gamble in both directions.',
        effect: (s: GameState) => {
          const r = roll()
          // 65% → customers respect transparency, small churn; 35% → press picks it up, bigger damage
          return r < 0.65
            ? { churnRate: Math.min(s.churnRate + 3, 60), brand: Math.max(0, s.brand - 5) }
            : { churnRate: Math.min(s.churnRate + 8, 60), brand: Math.max(0, s.brand - 18) }
        },
      },
      {
        label: 'Patch quietly — no announcement',
        consequence:
          'You patched silently and moved on. Whether anyone finds out is a matter of time and luck.',
        effect: (s: GameState) => {
          const r = roll()
          // 55% → nobody finds out; 45% → journalist or researcher leaks it, severe brand damage
          return r < 0.55
            ? {}
            : {
                churnRate: Math.min(s.churnRate + 15, 60),
                brand: Math.max(0, s.brand - 28),
                customers: Math.max(0, Math.floor(s.customers * 0.82)),
              }
        },
      },
    ],
  },

  {
    id: 'bad-press',
    category: 'crisis',
    title: 'Negative Review Going Viral',
    description:
      "A customer posted a scathing review on a popular forum. It's picking up upvotes fast.",
    choices: [
      {
        label: 'Respond publicly — own the narrative',
        consequence:
          'You replied thoughtfully and addressed each point. Public forums are unpredictable audiences.',
        effect: (s: GameState) => {
          const r = roll()
          // 50% → comeback story, brand recovers; 50% → more pile on
          return r < 0.50
            ? { brand: Math.min(100, s.brand + 6), churnRate: Math.max(3, s.churnRate - 2) }
            : { brand: Math.max(0, s.brand - 12), churnRate: Math.min(s.churnRate + 7, 60) }
        },
      },
      {
        label: "Don't feed the fire — ignore it",
        consequence:
          'You chose silence and focused on the product. These things either blow over or they don\'t.',
        effect: (s: GameState) => {
          const r = roll()
          // 45% → fades; 55% → others dogpile
          return r < 0.45
            ? {}
            : {
                brand: Math.max(0, s.brand - 16),
                churnRate: Math.min(s.churnRate + 9, 60),
              }
        },
      },
    ],
  },

  {
    id: 'tech-debt-crisis',
    category: 'crisis',
    title: 'Tech Debt Is Killing Velocity',
    description:
      "Every feature takes twice as long. Developers are complaining. The codebase is becoming a trap.",
    choices: [
      {
        label: 'Emergency refactor sprint — freeze features for 2 weeks',
        consequence:
          'Devs stop building and start cleaning. Progress halts temporarily.',
        effect: (s: GameState) => {
          const r = roll()
          // 70% → significant debt reduction, velocity returns; 30% → refactor reveals deeper problems
          return r < 0.70
            ? {
                techDebt: Math.max(0, s.techDebt - 32),
                productProgress: Math.max(0, s.productProgress - 8),
              }
            : {
                techDebt: Math.max(0, s.techDebt - 15),
                productProgress: Math.max(0, s.productProgress - 8),
                churnRate: Math.min(s.churnRate + 4, 60),
              }
        },
      },
      {
        label: 'Ship around it — add structure as you go',
        consequence:
          'The team keeps moving. Patching over bad foundations sometimes works. Sometimes it doesn\'t.',
        effect: (s: GameState) => {
          const r = roll()
          // 40% → get a few features out; 60% → hits critical failure, major bug mid-sprint
          return r < 0.40
            ? {
                techDebt: Math.min(100, s.techDebt + 12),
                productProgress: Math.min(100, s.productProgress + 5),
              }
            : {
                techDebt: Math.min(100, s.techDebt + 25),
                churnRate: Math.min(s.churnRate + 10, 60),
                customers: Math.max(0, Math.floor(s.customers * 0.91)),
              }
        },
      },
    ],
  },

  {
    id: 'competitor-freemium',
    category: 'crisis',
    title: 'Top Competitor Just Went Free',
    description:
      "Your main competitor announced a generous free tier. Your inbox already has cancellation requests.",
    choices: [
      {
        label: 'Launch a limited free tier to compete',
        consequence:
          'You announced a free plan to hold ground. New signups may not convert the way you hope.',
        effect: (s: GameState) => {
          const r = roll()
          // 55% → retains customers, some new ones but ARPU drops effect shown via churn; 45% → free users clog support, churn still rises
          return r < 0.55
            ? {
                customers: s.customers + 8,
                churnRate: Math.max(3, s.churnRate - 2),
              }
            : {
                customers: s.customers + 4,
                churnRate: Math.min(s.churnRate + 5, 60),
                infraCostMonthly: s.infraCostMonthly + 200,
              }
        },
      },
      {
        label: 'Stay paid — differentiate on quality',
        consequence:
          'You held your pricing and doubled down on what makes you different.',
        effect: (s: GameState) => {
          const r = roll()
          // 40% → premium users stay loyal; 60% → price-sensitive users churn
          return r < 0.40
            ? { brand: Math.min(100, s.brand + 5) }
            : {
                customers: Math.max(0, Math.floor(s.customers * 0.85)),
                churnRate: Math.min(s.churnRate + 8, 60),
              }
        },
      },
    ],
  },

  // ─── OPPORTUNITY ──────────────────────────────────────────────────────────

  {
    id: 'blogger-feature',
    category: 'opportunity',
    title: 'Blogger Wants to Feature You',
    description:
      'A niche blogger with 18k readers wants to write about your product. They need a few hours of your time.',
    choices: [
      {
        label: 'Do the interview',
        consequence:
          "You gave the time. Niche audiences are unpredictable — some articles convert, some just generate opinion.",
        effect: (s: GameState) => {
          const r = roll()
          // 50% → 10-14 customers; 30% → 3-5 customers; 20% → negative framing, brand hit
          if (r < 0.50) return { customers: s.customers + 11 }
          if (r < 0.80) return { customers: s.customers + 3 }
          return { customers: s.customers + 1, brand: Math.max(0, s.brand - 8) }
        },
      },
      {
        label: 'Decline — protect the schedule',
        consequence:
          'You passed to stay focused. That window closed.',
        effect: () => ({}),
      },
    ],
  },

  {
    id: 'custom-feature-request',
    category: 'opportunity',
    title: 'Enterprise Client Wants a Custom Build',
    description:
      'A company will sign a 12-month deal if you build one custom feature. High upfront value, high scope risk.',
    choices: [
      {
        label: 'Take the deal',
        consequence:
          'You committed to the build. Enterprise clients are great until scope starts shifting.',
        effect: (s: GameState) => {
          const r = roll()
          // 55% → great deal, cash + customers; 45% → scope creep, team stress + debt
          return r < 0.55
            ? { customers: s.customers + 18, cash: s.cash + 4000 }
            : {
                customers: s.customers + 8,
                techDebt: Math.min(100, s.techDebt + 18),
                employees: s.employees.map(e => ({
                  ...e,
                  stress: Math.min(100, e.stress + 22),
                })),
              }
        },
      },
      {
        label: 'Decline — stay on core roadmap',
        consequence:
          'You passed on the deal to protect focus.',
        effect: () => ({}),
      },
    ],
  },

  {
    id: 'angel-meeting',
    category: 'opportunity',
    title: 'Angel Investor Wants to Meet',
    description:
      'A well-connected angel reached out. Could be $100k at 15% — or a week of prep for nothing.',
    choices: [
      {
        label: 'Prep and pitch (takes a week)',
        consequence:
          'You prepped hard and made the pitch. Angels invest on gut as much as metrics.',
        effect: (s: GameState) => {
          const r = roll()
          // 30% → get the money; 70% → "too early", lost a week
          return r < 0.30
            ? { cash: s.cash + 100_000, equity: s.equity - 15, brand: Math.min(100, s.brand + 6) }
            : { productProgress: Math.max(0, s.productProgress - 6) }
        },
      },
      {
        label: "Pass — not ready yet",
        consequence:
          'You declined and stayed focused on product.',
        effect: () => ({}),
      },
    ],
  },

  {
    id: 'newsletter-feature',
    category: 'opportunity',
    title: 'Paid Newsletter Slot Available',
    description:
      'A SaaS-focused newsletter with 35k readers offers a sponsored slot for $600. Conversion data is murky.',
    choices: [
      {
        label: 'Run the ad ($600)',
        consequence:
          'You paid for the slot. Newsletter audiences vary wildly depending on alignment with your product.',
        effect: (s: GameState) => {
          const r = roll()
          // 45% → strong response; 35% → weak response; 20% → near zero
          if (r < 0.45) return { cash: s.cash - 600, customers: s.customers + 11 }
          if (r < 0.80) return { cash: s.cash - 600, customers: s.customers + 3 }
          return { cash: s.cash - 600, customers: s.customers + 0 }
        },
      },
      {
        label: 'Pass — preserve cash',
        consequence:
          'You held the cash and moved on.',
        effect: () => ({}),
      },
    ],
  },

  {
    id: 'competitor-shutdown',
    category: 'opportunity',
    title: 'Competitor Is Shutting Down',
    description:
      "A rival product just announced shutdown. Their users are active on forums asking for alternatives.",
    choices: [
      {
        label: 'Target their users ($400 outreach)',
        consequence:
          "You ran targeted outreach. Orphaned users don't always land well — some carry baggage from bad experiences.",
        effect: (s: GameState) => {
          const r = roll()
          // 55% → strong conversion; 45% → high-churn users who hate the category
          return r < 0.55
            ? { cash: s.cash - 400, customers: s.customers + 14 }
            : {
                cash: s.cash - 400,
                customers: s.customers + 6,
                churnRate: Math.min(s.churnRate + 4, 60),
              }
        },
      },
      {
        label: "Don't rush — product isn't ready",
        consequence:
          'You let the moment pass.',
        effect: () => ({}),
      },
    ],
  },

  {
    id: 'startup-event-speaker',
    category: 'opportunity',
    title: 'Startup Event Wants You to Speak',
    description:
      'A local startup meetup (250 attendees) invited you to give a 10-minute demo. Live demos always carry risk.',
    choices: [
      {
        label: 'Go speak',
        consequence:
          "You got on stage. Live demos are unpredictable — so is the audience.",
        effect: (s: GameState) => {
          const r = roll()
          // 40% → strong demo, 8 customers + brand; 40% → ok demo, 2 customers; 20% → demo bug, brand hit
          if (r < 0.40) return { customers: s.customers + 8, brand: Math.min(100, s.brand + 5) }
          if (r < 0.80) return { customers: s.customers + 2 }
          return { brand: Math.max(0, s.brand - 8) }
        },
      },
      {
        label: 'Skip it',
        consequence:
          'You stayed heads-down.',
        effect: () => ({}),
      },
    ],
  },

  {
    id: 'partnership-offer',
    category: 'opportunity',
    title: 'Integration Partnership Proposed',
    description:
      "A complementary SaaS tool wants to build a native integration. Shared users, shared marketing. Shared complexity.",
    choices: [
      {
        label: 'Agree to co-market the integration',
        consequence:
          "You shook hands on it. Partnerships look great in announcements; execution is messier.",
        effect: (s: GameState) => {
          const r = roll()
          // 55% → shared audience growth + brand; 45% → integration bugs, support burden
          return r < 0.55
            ? { customers: s.customers + 10, brand: Math.min(100, s.brand + 8) }
            : {
                customers: s.customers + 4,
                techDebt: Math.min(100, s.techDebt + 10),
                churnRate: Math.min(s.churnRate + 3, 60),
              }
        },
      },
      {
        label: 'Decline — too much distraction',
        consequence:
          'You stayed focused on your own roadmap.',
        effect: () => ({}),
      },
    ],
  },

  // ─── MARKET ───────────────────────────────────────────────────────────────

  {
    id: 'competitor-launched',
    category: 'market',
    title: 'Well-Funded Competitor Just Launched',
    description:
      'A VC-backed team launched a near-identical product with a massive PR push. Your users are already asking questions.',
    choices: [
      {
        label: 'Shift focus to retention — win on relationship',
        consequence:
          "You prioritized keeping existing users happy. That's a bet on loyalty over acquisition.",
        effect: (s: GameState) => {
          const r = roll()
          // 60% → churn holds; 40% → competitor's momentum reaches your base anyway
          return r < 0.60
            ? { churnRate: Math.max(3, s.churnRate - 3), productProgress: Math.max(0, s.productProgress - 4) }
            : { churnRate: Math.min(s.churnRate + 4, 60) }
        },
      },
      {
        label: "Ignore them — stay on roadmap",
        consequence:
          'You ignored the noise and kept shipping. The market does what it wants.',
        effect: (s: GameState) => {
          const r = roll()
          // 35% → users don't care; 65% → competitor's marketing poaches some
          return r < 0.35
            ? {}
            : {
                churnRate: Math.min(s.churnRate + 7, 60),
                customers: Math.max(0, Math.floor(s.customers * 0.93)),
              }
        },
      },
    ],
  },

  {
    id: 'viral-tweet',
    category: 'market',
    title: 'Your Space Is Suddenly Trending',
    description:
      "A viral thread put your problem space in front of thousands. Traffic is spiking. So is server load.",
    choices: [
      {
        label: 'Spend $700 on ads to capture the wave',
        consequence:
          'You poured fuel on the fire. Viral moments are high variance.',
        effect: (s: GameState) => {
          const r = roll()
          // 50% → strong gains; 25% → moderate; 25% → server struggles, churn spike
          if (r < 0.50) return { cash: s.cash - 700, customers: s.customers + 18 }
          if (r < 0.75) return { cash: s.cash - 700, customers: s.customers + 7 }
          return {
            cash: s.cash - 700,
            customers: s.customers + 3,
            churnRate: Math.min(s.churnRate + 6, 60),
          }
        },
      },
      {
        label: 'Ride the organic wave — no spend',
        consequence:
          'You let it play out naturally. Organic growth is free, but it moves at its own pace.',
        effect: (s: GameState) => {
          const r = roll()
          // 50% → decent organic gains; 50% → trend fades before you capitalize
          return r < 0.50
            ? { customers: s.customers + 7 }
            : { customers: s.customers + 1 }
        },
      },
    ],
  },

  {
    id: 'algorithm-change',
    category: 'market',
    title: 'Discovery Channel Changed Its Algorithm',
    description:
      'A major platform you rely on for organic discovery updated their algorithm. Your traffic dropped 45% overnight.',
    choices: [
      {
        label: 'Pivot to a new channel (takes a week)',
        consequence:
          'You dropped the old channel and started building somewhere new. Speed of recovery varies.',
        effect: (s: GameState) => {
          const r = roll()
          // 55% → finds a working channel; 45% → new channel also underperforms
          return r < 0.55
            ? {}
            : {
                customers: Math.max(0, s.customers - 5),
                churnRate: Math.min(s.churnRate + 3, 60),
              }
        },
      },
      {
        label: "Wait it out — these things revert",
        consequence:
          "You held on and hoped. Algorithm reversion is a real thing. So is being wrong about it.",
        effect: (s: GameState) => {
          const r = roll()
          // 30% → actually does revert; 70% → stays down
          return r < 0.30
            ? {}
            : {
                customers: Math.max(0, s.customers - 8),
                churnRate: Math.min(s.churnRate + 5, 60),
              }
        },
      },
    ],
  },

  {
    id: 'market-downturn',
    category: 'market',
    title: 'SMBs Are Auditing SaaS Spend',
    description:
      "Economic anxiety is spreading. Customers are cutting tools they don't use daily. Are you essential to them?",
    choices: [
      {
        label: 'Proactive outreach + offer 20% discount',
        consequence:
          "You got ahead of it with a retention discount. Not every customer wants to be saved.",
        effect: (s: GameState) => {
          const r = roll()
          // 55% → retains most, but revenue takes a hit; 45% → discount backfires, looks desperate
          return r < 0.55
            ? {
                customers: Math.max(0, s.customers - Math.floor(s.customers * 0.04)),
                churnRate: Math.max(3, s.churnRate - 2),
              }
            : {
                customers: Math.max(0, s.customers - Math.floor(s.customers * 0.10)),
                churnRate: Math.min(s.churnRate + 6, 60),
              }
        },
      },
      {
        label: "Hold prices — let the market shake out",
        consequence:
          'You stood firm. Premium positioning either protects you or exposes you.',
        effect: (s: GameState) => {
          const r = roll()
          // 35% → price-insensitive users stay, churn holds; 65% → significant drop
          return r < 0.35
            ? { brand: Math.min(100, s.brand + 3) }
            : {
                churnRate: Math.min(s.churnRate + 11, 60),
                customers: Math.max(0, Math.floor(s.customers * 0.82)),
              }
        },
      },
    ],
  },

  {
    id: 'vc-report-buzz',
    category: 'market',
    title: 'Top VC Firm: Your Category Is "The Next Big Thing"',
    description:
      "A well-read VC firm published a market report calling your category extremely hot. Inbound is ticking up.",
    choices: [
      {
        label: 'Capitalize — push outbound sales hard this week',
        consequence:
          'You activated outbound while the hype was live. Hype converts unevenly.',
        effect: (s: GameState) => {
          const r = roll()
          // 55% → strong inbound conversion; 45% → tire-kickers, future churn rises
          return r < 0.55
            ? { customers: s.customers + 9 }
            : {
                customers: s.customers + 5,
                churnRate: Math.min(s.churnRate + 3, 60),
              }
        },
      },
      {
        label: "Stay heads-down — build while they're distracted",
        consequence:
          'You shipped while competitors chased press. A quiet edge sometimes pays off.',
        effect: (s: GameState) => ({ productProgress: Math.min(100, s.productProgress + 7) }),
      },
    ],
  },

  {
    id: 'acquisition-lowball',
    category: 'market',
    title: 'Acquisition Offer — Lowball',
    description:
      "A larger company offered to acquire your startup. The offer feels low, but it's real money on the table.",
    choices: [
      {
        label: 'Decline — keep building',
        consequence:
          'You turned down the exit. Back to work.',
        effect: () => ({}),
      },
      {
        label: 'Accept the offer',
        consequence:
          "You took the exit. Sometimes that's the right call.",
        effect: (s: GameState) => {
          const arr = s.mrr * 12
          const offer = Math.round(arr * 2 + s.cash * 0.4)
          return { phase: 'sold' as const, cash: s.cash + offer, soldAt: { day: -1, valuation: offer } }
        },
      },
    ],
  },

  {
    id: 'acquisition-premium',
    category: 'market',
    title: 'Acquisition Offer — Premium Bid',
    description:
      "A well-funded competitor wants to acquire your startup at a premium. They see strategic value in your product and team.",
    choices: [
      {
        label: 'Decline — the vision is bigger',
        consequence:
          'You chose ambition over certainty.',
        effect: () => ({ brand: Math.min(100, 5) }),
      },
      {
        label: 'Accept the premium offer',
        consequence:
          "You sold at a premium. A strong exit.",
        effect: (s: GameState) => {
          const arr = s.mrr * 12
          const offer = Math.round(arr * 4.5 + s.cash * 0.8 + s.brand * 200)
          return { phase: 'sold' as const, cash: s.cash + offer, soldAt: { day: -1, valuation: offer } }
        },
      },
    ],
  },

  // ─── INVESTOR EVENTS ──────────────────────────────────────────────────────

  {
    id: 'investor-seed',
    category: 'opportunity',
    title: 'Seed Investor Wants to Meet',
    description:
      "An angel investor has noticed your traction. They're offering $200k for 20% equity. Runway extends — expectations rise.",
    choices: [
      {
        label: 'Take the deal — $200k for 20% equity',
        consequence:
          "You closed the seed round. Capital solves some problems and creates others.",
        effect: (s: GameState) => {
          const r = roll()
          // 65% → clean deal, good terms; 35% → investor adds board pressure, culture takes hit
          if (r < 0.65) {
            return { cash: s.cash + 200_000, equity: s.equity - 20, brand: Math.min(100, s.brand + 8), investorInterest: 10 }
          } else {
            return {
              cash: s.cash + 200_000,
              equity: s.equity - 20,
              brand: Math.min(100, s.brand + 8),
              investorInterest: 10,
              employees: s.employees.map(e => ({
                ...e,
                stress: Math.min(100, e.stress + 15),
              })),
            }
          }
        },
      },
      {
        label: 'Decline — stay fully independent',
        consequence:
          'You kept 100% control. Burn continues at its current pace.',
        effect: () => ({ investorInterest: 20 }),
      },
    ],
  },

  {
    id: 'investor-series-a',
    category: 'opportunity',
    title: 'Series A Term Sheet',
    description:
      "A top-tier VC firm is impressed. $500k for 25% equity. This changes everything — including expectations.",
    choices: [
      {
        label: 'Accept — $500k for 25% equity',
        consequence:
          "Series A closed. Significant capital but the board now has expectations to match.",
        effect: (s: GameState) => {
          const r = roll()
          // 60% → clean scale; 40% → board demands aggressive hiring, costs spike
          if (r < 0.60) {
            return { cash: s.cash + 500_000, equity: s.equity - 25, brand: Math.min(100, s.brand + 15), investorInterest: 10 }
          } else {
            return {
              cash: s.cash + 500_000,
              equity: s.equity - 25,
              brand: Math.min(100, s.brand + 15),
              investorInterest: 10,
              infraCostMonthly: s.infraCostMonthly + 600,
              employees: s.employees.map(e => ({
                ...e,
                stress: Math.min(100, e.stress + 18),
              })),
            }
          }
        },
      },
      {
        label: 'Pass — not the right terms',
        consequence:
          'You walked away. Staying lean and independent.',
        effect: () => ({ investorInterest: 25 }),
      },
    ],
  },
]
