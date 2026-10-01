import type { EventDef } from './eventData'

/** Daily chance of a production incident: 0 up to 40 tech debt, 10% at 100 (spec §4). */
export function incidentChance(techDebt: number): number {
  return Math.max(0, techDebt - 40) / 600
}

/** Share of customers an incident loses on the spot, and tickets it raises per customer. */
export const INCIDENT_CUSTOMER_LOSS = 0.03
export const INCIDENT_TICKETS_PER_CUSTOMER = 0.1

/** The decision after an incident. The damage (customers, tickets) lands when it happens. */
export const INCIDENT: EventDef = {
  id: 'incident',
  category: 'crisis',
  title: 'Production Incident',
  description: 'The app went down. Some customers already left and support is on fire. Tech debt finally sent the bill.',
  choices: [
    {
      label: 'All hands on deck: fix the root cause',
      consequence: 'Everyone dropped what they were doing and fixed it properly. The codebase is a little healthier.',
      effect: s => ({ techDebt: Math.max(0, s.techDebt - 8) }),
    },
    {
      label: 'Patch it and move on',
      consequence: 'A quick patch got things running. Customers noticed it was rushed.',
      effect: s => ({ churnRate: s.churnRate + 3 }),
    },
  ],
}
