import { claimFamilyMoney, useV2 } from './actions'
import { usePauseWhile } from './pause'
import './v2.css'

export function FamilyMoneyModal() {
  const money = useV2(s => s.v2.chapter.familyMoney)

  usePauseWhile(true, 'family-money')

  if (!money || money.claimed) return null

  return (
    <div className="v2-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="v2-family-title">
      <div className="v2-modal">
        <div className="v2-modal-icon" aria-hidden="true">💌</div>
        <h2 id="v2-family-title" className="v2-modal-title">Someone believes in you</h2>
        <p className="v2-modal-body">
          {money.giver} saw your first paying customer and wants to help. It isn&apos;t a funding round, just belief,
          and it&apos;s enough to take the next step.
        </p>
        <div className="v2-modal-amount">+${money.amount.toLocaleString()}</div>
        <button className="v2-btn v2-btn-primary" onClick={claimFamilyMoney} autoFocus>
          Accept, and thank them
        </button>
      </div>
    </div>
  )
}
