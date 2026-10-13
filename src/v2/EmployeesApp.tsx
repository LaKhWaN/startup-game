import { setRaise, useV2 } from './actions'
import { totalDays } from './engine/clock'
import { LOW_MORALE } from './engine/people'
import { ROLE_INFO } from './MemberCard'
import { DEFAULT_RAISE, EXPECTED_RAISE, nextReviewDay, payMoodFor, RAISE_OPTIONS } from './payroll'

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`

function Bar({ value, bad }: { value: number; bad: boolean }) {
  return (
    <div className="v2-progress v2-emp-bar">
      <div className="v2-progress-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: bad ? 'var(--error)' : undefined }} />
    </div>
  )
}

/** Employees app on the founder's desktop: yearly raise policy and everyone's pay and mood. */
export function EmployeesApp() {
  const team = useV2(s => s.v2.team)
  const raise = useV2(s => s.v2.raisePct ?? DEFAULT_RAISE)
  const hours = useV2(s => s.gameTime.totalHours)
  const today = totalDays({ totalHours: hours })
  const members = Object.values(team).sort((a, b) => a.seat - b.seat)
  const payroll = members.reduce((sum, m) => sum + m.salary, 0)
  const mood = payMoodFor(raise)

  return (
    <>
      <div className="v2-desk-gauge">
        <span><strong>Yearly raise</strong> · applied on each person's work anniversary</span>
        <div className="v2-emp-chips">
          {RAISE_OPTIONS.map(p => (
            <button key={p} className={`v2-emp-chip${p === raise ? ' v2-emp-chip--on' : ''}`} onClick={() => setRaise(p)}>{p}%</button>
          ))}
        </div>
        <span className="v2-muted">
          People expect about {EXPECTED_RAISE}%. {mood < 0 ? `At ${raise}%, morale drops ${-mood} after a review.` : mood > 0 ? `At ${raise}%, morale rises ${mood} after a review.` : 'At this level, reviews leave morale unchanged.'}
        </span>
        <span>Payroll {fmt(payroll)}/mo · after a full round of raises {fmt(payroll * (1 + raise / 100))}/mo</span>
      </div>
      {members.length === 0 && <div className="v2-muted">No employees yet. Hire from the Team tab.</div>}
      {members.map(m => {
        const morale = m.morale ?? 70
        const stress = m.stress ?? 10
        const review = nextReviewDay(m, today) - today
        return (
          <div key={m.id} className="v2-desk-row v2-emp-row">
            <div className="v2-emp-who">
              <strong>{ROLE_INFO[m.role].icon} {m.name}</strong>
              <div className="v2-muted">{m.tier === 'fulltime' ? 'Full-time' : 'Intern'} · {fmt(m.salary)}/mo · review in {review} day{review === 1 ? '' : 's'}</div>
              {m.leavingOn !== undefined && <div className="v2-emp-alert">📝 Handed in notice: leaves on day {m.leavingOn + 1}</div>}
              {m.leavingOn === undefined && morale < LOW_MORALE && <div className="v2-emp-alert">😞 Unhappy: may take another offer</div>}
            </div>
            <div className="v2-emp-moods">
              <span className="v2-muted">Morale</span><Bar value={morale} bad={morale < LOW_MORALE} />
              <span className="v2-muted">Stress</span><Bar value={stress} bad={stress >= 70} />
            </div>
          </div>
        )
      })}
    </>
  )
}
