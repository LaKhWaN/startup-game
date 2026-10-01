import { useV2 } from './actions'
import { railStats } from './stats'
import { marketCeiling } from './engine/market'
import './v2.css'

function Row({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="v2-rail-row" title={hint}>
      <span className="v2-rail-label">{label}</span>
      <span className="v2-rail-value">{value}</span>
    </div>
  )
}

/** Read-only, at-a-glance numbers next to the room (spec §11 addendum). */
export function StatsRail() {
  // Stored refs / primitives only; derive below.
  const v2 = useV2(s => s.v2)
  const features = useV2(s => s.features)
  const customers = useV2(s => s.customers)
  const difficultyModifier = useV2(s => s.difficultyModifier)
  const brand = useV2(s => s.brand)

  const r = railStats({ v2, features })
  const st = v2.stats
  const shipped = features.filter(f => f.status === 'completed').length // includes pre-counter saves
  const conversion = st.salesCalls > 0 && st.leadsFound > 0 ? Math.min(100, Math.round((st.customersWon / st.leadsFound) * 100)) : null

  return (
    <aside className="v2-rail" aria-label="Stats">
      <section className="v2-rail-section">
        <div className="v2-rail-title">Funnel</div>
        <div className="v2-rail-funnel">
          <div><span className="v2-rail-big">{v2.leads}</span><span className="v2-rail-small">leads</span></div>
          <span className="v2-rail-arrow" aria-hidden="true">→</span>
          <div><span className="v2-rail-big">{customers}</span><span className="v2-rail-small">customers</span></div>
        </div>
        {conversion !== null && <Row label="Lead → customer" value={`${conversion}%`} hint="Customers won from sales ÷ leads found" />}
        <Row label="🌍 Market" value={`${customers}/${marketCeiling({ difficultyModifier, features, brand })}`} hint="Customers you can win; grows with shipped features and brand" />
        <Row label="🎧 Open tickets" value={v2.tickets} hint="Unanswered tickets raise churn and scare off buyers" />
      </section>

      <section className="v2-rail-section">
        <div className="v2-rail-title">Right now</div>
        <Row label="⚙️ Working" value={r.working} hint="Founder and hires with a task in progress" />
        <Row label="⏳ Waiting" value={r.waiting} hint="Hires with nothing to do yet (e.g. no leads to call)" />
        <Row label="💤 Idle" value={r.idle} />
        <Row label="😫 Stressed" value={Object.values(v2.team).filter(m => (m.stress ?? 0) > 75).length} hint="Stress above 75. Give them idle time, a weekend, or perks" />
        {Object.values(v2.team).some(m => m.leavingOn !== undefined) && (
          <Row label="⚠️ Handed in notice" value={Object.values(v2.team).filter(m => m.leavingOn !== undefined).length} hint="Open their card to convince them to stay" />
        )}
        <Row label="💡 Ideas to build" value={r.ideas} />
        <Row label="🛠️ Being built" value={r.building} />
      </section>

      <section className="v2-rail-section">
        <div className="v2-rail-title">All time</div>
        <Row label="✉️ Email rounds" value={st.emailRounds} />
        <Row label="🎯 Leads found" value={st.leadsFound} />
        <Row label="📞 Sales calls" value={st.salesCalls} />
        <Row label="🤝 Customers won" value={st.customersWon} />
        <Row label="🚀 Features shipped" value={shipped} />
        <Row label="🔍 Research rounds" value={st.researchRounds} />
        {st.mistakes > 0 && <Row label="😬 Mistakes" value={st.mistakes} />}
      </section>
    </aside>
  )
}
