import { useV2 } from './actions'
import { hostingLoad } from './engine/infra'
import { marketCeiling } from './engine/market'
import { railStats } from './stats'
import './v2.css'

function Tile({ icon, value, label, alert = false }: { icon: string; value: number | string; label: string; alert?: boolean }) {
  return (
    <div className={`v2-tile${alert ? ' v2-tile--alert' : ''}`} title={label}>
      <span className="v2-tile-icon" aria-hidden="true">{icon}</span>
      <span className="v2-tile-value">{value}</span>
      <span className="v2-tile-label">{label}</span>
    </div>
  )
}

function Gauge({ icon, label, value, tone, hint }: { icon: string; label: string; value: number; tone: 'good' | 'warn' | 'bad'; hint: string }) {
  return (
    <div className="v2-gauge" title={hint}>
      <div className="v2-gauge-head"><span>{icon} {label}</span><strong>{Math.round(value * 100)}%</strong></div>
      <div className={`v2-mbar-track v2-mbar-track--${tone}`}><div style={{ width: `${Math.min(100, value * 100)}%` }} /></div>
    </div>
  )
}

const tone = (v: number, warn: number, bad: number) => (v >= bad ? 'bad' : v >= warn ? 'warn' : 'good') as 'good' | 'warn' | 'bad'

/** At-a-glance company status next to the room: funnel, who's doing what, pressure gauges, all-time counts. */
export function StatsRail() {
  // Stored refs / primitives only; derive below.
  const v2 = useV2(s => s.v2)
  const features = useV2(s => s.features)
  const customers = useV2(s => s.customers)
  const difficultyModifier = useV2(s => s.difficultyModifier)
  const brand = useV2(s => s.brand)

  const r = railStats({ v2, features })
  const st = v2.stats
  const team = Object.values(v2.team)
  const stressed = team.filter(m => (m.stress ?? 0) > 75).length
  const leaving = team.filter(m => m.leavingOn !== undefined).length
  const market = customers / Math.max(1, marketCeiling({ difficultyModifier, features, brand }))
  const load = hostingLoad({ v2, customers })
  const backlog = Math.min(1, v2.tickets / Math.max(20, customers))
  const shipped = features.filter(f => f.status === 'completed').length

  return (
    <aside className="v2-rail" aria-label="Company status">
      <section className="v2-funnel-card">
        <div><span className="v2-funnel-big">{v2.leads}</span><span className="v2-funnel-small">leads</span></div>
        <span className="v2-funnel-arrow" aria-hidden="true">→</span>
        <div><span className="v2-funnel-big">{customers}</span><span className="v2-funnel-small">customers</span></div>
      </section>

      <section>
        <div className="v2-rail-title">Right now</div>
        <div className="v2-tiles">
          <Tile icon="⚙️" value={r.working} label="working" />
          <Tile icon="⏳" value={r.waiting} label="waiting" />
          <Tile icon="💤" value={r.idle} label="idle" />
          <Tile icon="😫" value={stressed} label="stressed" alert={stressed > 0} />
          <Tile icon="💡" value={r.ideas} label="ideas" />
          <Tile icon="🛠️" value={r.building} label="building" />
        </div>
        {leaving > 0 && <div className="v2-rail-alert">⚠️ {leaving} handed in notice. Open their card.</div>}
      </section>

      <section className="v2-gauges">
        <div className="v2-rail-title">Pressure</div>
        <Gauge icon="🌍" label="Market" value={market} tone={tone(market, 0.4, 0.7)} hint="Share of the customers your idea can reach. Past 40%, competitors start poaching customers and sales get harder. Grows with features and brand" />
        <Gauge icon="🖥️" label="Hosting" value={load} tone={tone(load, 0.9, 1)} hint="Above 90% the app feels slow; above 100% it goes down. Upgrade in 💻 Desktop → Hosting" />
        <Gauge icon="🎧" label="Support" value={backlog} tone={tone(backlog, 0.1, 0.3)} hint={`${v2.tickets} open tickets. A backlog raises churn and scares buyers`} />
      </section>

      <section>
        <div className="v2-rail-title">All time</div>
        <div className="v2-tiles v2-tiles--small">
          <Tile icon="✉️" value={st.emailRounds} label="emails" />
          <Tile icon="🎯" value={st.leadsFound} label="leads" />
          <Tile icon="📞" value={st.salesCalls} label="calls" />
          <Tile icon="🤝" value={st.customersWon} label="won" />
          <Tile icon="🚀" value={shipped} label="shipped" />
          <Tile icon="😬" value={st.mistakes} label="mistakes" />
        </div>
      </section>
    </aside>
  )
}
