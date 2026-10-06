import type { TeamRole, Tier } from './state'
import './v2.css'

export const ROLE_INFO: Record<TeamRole, { icon: string; label: string }> = {
  developer: { icon: '🛠️', label: 'Developer' },
  product_manager: { icon: '🔍', label: 'Product' },
  marketing: { icon: '✉️', label: 'Marketing' },
  sales: { icon: '🤝', label: 'Sales' },
  support: { icon: '🎧', label: 'Support' },
}

const TIER_LABEL: Record<Tier, string> = { intern: 'Intern', fulltime: 'Full-time' }

export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`v2-tier v2-tier--${tier}`}>{TIER_LABEL[tier]}</span>
}

export function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}
