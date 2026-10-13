import { answerPeopleAlert, useV2 } from './actions'
import type { AlertChoice } from './peopleAlerts'
import { currentAlert, TIME_OFF_DAYS } from './peopleAlerts'
import { ROLE_INFO } from './MemberCard'
import { EXPECTED_RAISE } from './payroll'
import { usePauseWhile } from './pause'
import { Avatar } from './ui/Avatar'
import './v2.css'

function Mood({ label, value, bad }: { label: string; value: number; bad: boolean }) {
  return (
    <div className="v2-alert-mood">
      <span>{label}</span>
      <div className="v2-progress"><div className="v2-progress-fill" style={{ width: `${Math.round(value)}%`, background: bad ? 'var(--error)' : undefined }} /></div>
      <strong>{Math.round(value)}</strong>
    </div>
  )
}

/** Someone is about to leave, has handed in notice, or is let down by their raise: pause and ask. */
export function PeopleAlertCard() {
  const v2 = useV2(s => s.v2)
  const alert = currentAlert({ v2 })
  usePauseWhile(!!alert, 'people-alert')
  if (!alert) return null
  const m = v2.team[alert.memberId]
  const stress = m.stress ?? 10
  const morale = m.morale ?? 70

  let title: string
  let body: string
  let choices: { id: AlertChoice; label: string; primary?: boolean }[]
  if (alert.kind === 'notice') {
    title = `${m.name} handed in their notice`
    body = `${alert.reason === 'stress' ? 'They are burnt out.' : 'They are unhappy here and took another offer.'} They leave on day ${(m.leavingOn ?? 0) + 1}, taking their experience with them.`
    choices = [
      ...(m.convinced ? [] : [{ id: 'convince' as const, label: `🤝 Convince them to stay (+20% salary, $${Math.round(m.salary * 1.2).toLocaleString()}/mo)`, primary: true }]),
      { id: 'letGo', label: m.convinced ? 'Let them go (they won’t be talked round twice)' : 'Let them go' },
    ]
  } else if (alert.kind === 'atRisk') {
    title = `${m.name} is close to quitting`
    body = alert.reason === 'stress'
      ? 'Their stress is dangerously high. A few more days like this and they burn out and leave.'
      : 'Their morale has been low for days. If it stays this way they will take another offer.'
    choices = [
      { id: 'timeOff', label: `🏖️ Give them ${TIME_OFF_DAYS} days off (stress −30, no work meanwhile)`, primary: alert.reason === 'stress' },
      { id: 'raise', label: `💸 Give a 10% raise ($${Math.round(m.salary * 1.1).toLocaleString()}/mo, morale +10)`, primary: alert.reason === 'morale' },
      { id: 'ignore', label: 'Not now' },
    ]
  } else {
    title = `${m.name} hoped for a bigger raise`
    body = `Their yearly review gave ${alert.raise}%, but people expect about ${EXPECTED_RAISE}%. Their morale will suffer until next year.`
    choices = [
      { id: 'topUp', label: `💸 Top it up to ${EXPECTED_RAISE}%`, primary: true },
      { id: 'keep', label: `Keep ${alert.raise}%` },
    ]
  }

  return (
    <div className="v2-coach-backdrop">
      <div className="v2-coach v2-coach--popup v2-alert" role="alertdialog" aria-label={title}>
        <div className="v2-alert-head">
          <Avatar name={m.name} size={44} />
          <div>
            <div className="v2-coach-title">{title}</div>
            <div className="v2-muted">{ROLE_INFO[m.role].icon} {ROLE_INFO[m.role].label} · {m.tier === 'fulltime' ? 'Full-time' : 'Intern'} · ${m.salary.toLocaleString()}/mo</div>
          </div>
        </div>
        <p className="v2-coach-body">{body}</p>
        <Mood label="😰 Stress" value={stress} bad={stress >= 70} />
        <Mood label="🙂 Morale" value={morale} bad={morale < 35} />
        <div className="v2-alert-choices">
          {choices.map(c => (
            <button key={c.id} className={c.primary ? 'v2-btn' : 'v2-btn v2-btn-ghost'} onClick={() => answerPeopleAlert(c.id)}>{c.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
