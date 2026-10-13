import { setAdBudget, useV2 } from './actions'
import { AD_BUDGETS, adLeadsPerDay, adsBudget, costPerLead } from './engine/ads'
import { emailReach, salesCallCap } from './founder'
import type { V2GameState } from './state'

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`

/** Desktop → Ads: a monthly budget that buys leads. Leads still need salespeople to close them. */
export function AdsApp() {
  const state = useV2(s => s) as V2GameState
  const budget = adsBudget(state)
  const cpl = costPerLead(state)
  const leads = adLeadsPerDay(state)
  return (
    <>
      <div className="v2-desk-gauge">
        <span><strong>Monthly ad budget</strong> · billed by the hour, like hosting</span>
        <div className="v2-emp-chips">
          {AD_BUDGETS.map(b => (
            <button key={b} className={`v2-emp-chip${b === budget ? ' v2-emp-chip--on' : ''}`} onClick={() => setAdBudget(b)}>{b === 0 ? 'Off' : fmt(b)}</button>
          ))}
        </div>
        <span>Cost per lead now: <strong>{fmt(cpl)}</strong>{budget > 0 && <> · about <strong>{leads.toFixed(1)} leads a day</strong></>}</span>
        <span className="v2-muted">Leads get pricier as you take more of the market. Cold emails now reach {Math.round(emailReach(state.customers) * 100)}% of what they did when you were small.</span>
        <span className="v2-muted">Each sales call works through at most {salesCallCap(5)} leads (a skill-5 seller), so more leads need more salespeople.</span>
      </div>
    </>
  )
}
