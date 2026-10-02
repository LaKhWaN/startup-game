import { useEffect, useState } from 'react'
import { chooseWifi, migrateHosting, toggleInfraTool, useV2 } from './actions'
import { clockLabel, totalDays } from './engine/clock'
import { HOSTING, TOOLS, WIFI, hostingLoad, type ToolId, type WifiPlan } from './engine/infra'
import { EmployeesApp } from './EmployeesApp'
import './v2.css'

type App = 'hosting' | 'wifi' | 'tools' | 'employees'
const APPS: { id: App; icon: string; name: string }[] = [
  { id: 'hosting', icon: '🖥️', name: 'Hosting' },
  { id: 'wifi', icon: '📶', name: 'Wi-Fi' },
  { id: 'tools', icon: '🧰', name: 'Tools' },
  { id: 'employees', icon: '👥', name: 'Employees' },
]
const fmt = (n: number) => `$${n.toLocaleString()}`

/** The founder's desktop: infrastructure (spec §7) and employee management. */
export function InfraDesktop({ onClose }: { onClose: () => void }) {
  const infra = useV2(s => s.v2.infra)
  const customers = useV2(s => s.customers)
  const hours = useV2(s => s.gameTime.totalHours)
  const [app, setApp] = useState<App>('hosting')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const load = hostingLoad({ v2: { infra } as never, customers })
  const today = totalDays({ totalHours: hours })

  return (
    <div className="v2-sheet-backdrop" onClick={onClose}>
      <div className="v2-desktop" role="dialog" aria-label="Desktop" onClick={e => e.stopPropagation()}>
        <div className="v2-desk-menubar">
          <span>◆ <strong>Desktop</strong></span>
          <span>{APPS.find(a => a.id === app)!.name}</span>
          <span className="v2-desk-menubar-right">{clockLabel(hours)} <button className="v2-desk-close" onClick={onClose} aria-label="Close">✕</button></span>
        </div>
        <div className="v2-desk-wallpaper">
          <div className="v2-window">
            <div className="v2-window-bar">
              <span className="v2-dot v2-dot--r" onClick={onClose} /><span className="v2-dot v2-dot--y" /><span className="v2-dot v2-dot--g" />
              <span className="v2-window-title">{APPS.find(a => a.id === app)!.icon} {APPS.find(a => a.id === app)!.name}</span>
            </div>
            <div className="v2-window-body">
              {app === 'hosting' && (
                <>
                  <div className="v2-desk-gauge">
                    <span>Load: {customers.toLocaleString()} customers on {HOSTING[infra.hosting - 1].name} ({HOSTING[infra.hosting - 1].cap.toLocaleString()} max)</span>
                    <div className="v2-progress"><div className="v2-progress-fill" style={{ width: `${Math.min(100, load * 100)}%`, background: load > 1 ? 'var(--error)' : load > 0.9 ? '#e0a020' : undefined }} /></div>
                    <span className="v2-muted">{load > 1 ? '🔥 Over capacity: outages likely' : load > 0.9 ? '🐢 Above 90%: the app feels slow (+1% churn)' : '✅ Healthy'}</span>
                    {infra.migratingTo !== undefined && <span className="v2-shop-tag">⏳ Migrating to {HOSTING[infra.migratingTo - 1].name} · done in {Math.max(0, (infra.migrationDoneDay ?? today) - today)} day(s)</span>}
                  </div>
                  {HOSTING.map(h => {
                    const current = h.tier === infra.hosting
                    const pending = h.tier === infra.migratingTo
                    return (
                      <div key={h.tier} className={`v2-desk-row${current ? ' v2-desk-row--on' : ''}`}>
                        <div><strong>{h.name}</strong><div className="v2-muted">{h.cap.toLocaleString()} customers · {h.price ? `${fmt(h.price)}/mo` : 'free'}{h.migrationDays ? ` · ${h.migrationDays}-day migration` : ''}</div></div>
                        {current ? <span className="v2-shop-tag">Current</span>
                          : pending ? <span className="v2-shop-tag">Migrating…</span>
                          : h.tier > infra.hosting
                            ? <button className="v2-btn" disabled={infra.migratingTo !== undefined} onClick={() => migrateHosting(h.tier)}>Migrate</button>
                            : <button className="v2-btn v2-btn-ghost" disabled={infra.migratingTo !== undefined || customers > h.cap} onClick={() => migrateHosting(h.tier)} title={customers > h.cap ? 'Your customers no longer fit this plan' : 'Instant'}>Downgrade</button>}
                      </div>
                    )
                  })}
                </>
              )}
              {app === 'employees' && <EmployeesApp />}
              {app === 'wifi' && (Object.keys(WIFI) as WifiPlan[]).map(id => (
                <div key={id} className={`v2-desk-row${infra.wifi === id ? ' v2-desk-row--on' : ''}`}>
                  <div><strong>{WIFI[id].name}</strong><div className="v2-muted">work speed ×{WIFI[id].speed} · {WIFI[id].price ? `${fmt(WIFI[id].price)}/mo` : 'free'}</div></div>
                  {infra.wifi === id ? <span className="v2-shop-tag">Connected</span> : <button className="v2-btn" onClick={() => chooseWifi(id)}>Switch</button>}
                </div>
              ))}
              {app === 'tools' && (Object.keys(TOOLS) as ToolId[]).map(id => {
                const on = infra.tools.includes(id)
                return (
                  <div key={id} className={`v2-desk-row${on ? ' v2-desk-row--on' : ''}`}>
                    <div><strong>{TOOLS[id].icon} {TOOLS[id].name}</strong><div className="v2-muted">{TOOLS[id].blurb}{id === 'nightShift' ? '' : ` · ${fmt(TOOLS[id].price)}/mo`}</div></div>
                    <button className={on ? 'v2-btn v2-btn-ghost' : 'v2-btn'} onClick={() => toggleInfraTool(id)}>{on ? 'Cancel' : 'Subscribe'}</button>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="v2-dock">
            {APPS.map(a => (
              <button key={a.id} className={`v2-dock-app${app === a.id ? ' v2-dock-app--on' : ''}`} onClick={() => setApp(a.id)} title={a.name}>
                <span aria-hidden="true">{a.icon}</span>
                <span className="v2-dock-label">{a.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
