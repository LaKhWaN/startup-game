import { useEffect, useRef, useState } from 'react'
import './LandingPage.css'
import { SEOHead } from './components/SEOHead'
import { SiteNav } from './components/SiteNav'
import { SiteFooter } from './components/SiteFooter'
import { SITE_URL, SITE_NAME } from './config/site'

/* ── Hooks ────────────────────────────────────────────────────────────────── */

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true) },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function useCountUp(target: number, duration = 2200, active = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) return
    let raf: number
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(eased * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, active])
  return value
}

/* ── Metric counter ───────────────────────────────────────────────────────── */

function Metric({
  target, prefix = '', suffix = '', label, delay = 0, active, danger = false,
}: {
  target: number; prefix?: string; suffix?: string; label: string; delay?: number; active: boolean; danger?: boolean
}) {
  const [go, setGo] = useState(false)
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!active) return
    const id = setTimeout(() => setGo(true), delay)
    return () => clearTimeout(id)
  }, [active, delay])
  useEffect(() => {
    if (!go) return
    const id = setTimeout(() => setDone(true), 2300)
    return () => clearTimeout(id)
  }, [go])

  const count = useCountUp(target, 2200, go)

  function fmt(n: number): string {
    if (target >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (target >= 10_000)    return (n / 1_000).toFixed(1) + 'K'
    if (n >= 1_000)          return n.toLocaleString()
    return n.toString()
  }

  return (
    <div className={`lp-metric${done ? ' lp-metric--done' : ''}${danger ? ' lp-metric--danger' : ''}`}>
      <div className="lp-metric-val">
        {prefix && <span className="lp-metric-affix">{prefix}</span>}
        <span className="lp-metric-num">{fmt(count)}</span>
        {suffix && <span className="lp-metric-affix lp-metric-suffix">{suffix}</span>}
      </div>
      <div className="lp-metric-label">{label}</div>
    </div>
  )
}

/* ── Landing page ─────────────────────────────────────────────────────────── */

interface LandingPageProps {
  onPlay: () => void
}

const STEPS = [
  { icon: '💡', num: '01', title: 'Pitch your idea', desc: 'Type your startup concept. AI scores its market potential and locks in your difficulty tier.' },
  { icon: '🔨', num: '02', title: 'Build your team', desc: 'Hire developers, PMs, and marketers. Each hire changes your velocity, culture, and burn.' },
  { icon: '🚀', num: '03', title: 'Ship & acquire', desc: 'Build features, run campaigns, close customers. Watch MRR climb — or churn eat you alive.' },
  { icon: '📈', num: '04', title: 'Survive or sell', desc: 'Navigate crises, attract investors, manage runway. Exit before the money runs out.' },
]

const FEATURES = [
  { icon: '🧠', title: 'AI Judges Your Idea',       desc: 'Gemini scores your concept ruthlessly. A great idea? Better odds. A weak one? Brutal mode from day one — lower growth, higher churn, no mercy.' },
  { icon: '👥', title: 'Hire People. Regret It.',   desc: 'Morale crashes, stress climbs, your best dev just quit. Every hire is a bet on culture, velocity, and burn. Most bets lose.' },
  { icon: '📊', title: 'Watch Money Disappear',     desc: 'Live MRR, burn rate, runway, churn, tech debt. No fuzzy metrics. Cold numbers telling you exactly how many days until you\'re dead.' },
  { icon: '⚡', title: 'The Market Hates You',      desc: 'Viral spikes, investor no-shows, PR disasters, hiring freezes. A random event fires every 5 days. Most of them hurt.' },
  { icon: '🎯', title: 'Spend Money to Grow',      desc: 'Run campaigns, close deals, chase reach. Results depend on team quality, market saturation, timing, and luck — roughly in that order.' },
  { icon: '🏆', title: '17 Ways to Feel Good',     desc: 'Real startup milestones from first user to $10K MRR. Brief moments of hope before the next crisis reminds you where this is headed.' },
]

export function LandingPage({ onPlay }: LandingPageProps) {
  const loopRef    = useInView(0.2)
  const featRef    = useInView(0.1)
  const metricsRef = useInView(0.3)
  const previewRef = useInView(0.15)
  const ctaRef     = useInView(0.3)

  // Scroll progress bar + parallax CSS var
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const h = () => {
      const sy = window.scrollY
      const total = document.documentElement.scrollHeight - window.innerHeight
      setProgress(total > 0 ? sy / total : 0)
      // Drive parallax via CSS custom property — zero React re-renders
      document.documentElement.style.setProperty('--lp-sy', `${sy}px`)
    }
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  // 3-D tilt on hero mockup (mouse follow)
  const tiltRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  function onTiltMove(e: React.MouseEvent) {
    const el = tiltRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = (e.clientX - r.left  - r.width  / 2) / (r.width  / 2)
    const dy = (e.clientY - r.top   - r.height / 2) / (r.height / 2)
    setTilt({ x: dy * -7, y: dx * 9 })
  }
  function onTiltLeave() { setTilt({ x: 0, y: 0 }) }

  const videoGameSchema = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'failunicorn',
    description: 'A free browser startup simulator. Hire your team, ship features, manage burn rate, and survive crises. No signup needed.',
    genre: ['Strategy', 'Simulation', 'Business'],
    gamePlatform: 'Browser',
    operatingSystem: 'Any',
    applicationCategory: 'Game',
    url: SITE_URL,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  }

  return (
    <div className="lp-root">
      <SEOHead
        title="failunicorn — Build a Startup. Survive. (Probably Don't.)"
        description="A free browser startup simulator. Hire your team, ship features, manage burn rate, and survive crises. How long can you last?"
        canonical={SITE_URL}
        schema={videoGameSchema}
      />

      {/* Grain texture overlay */}
      <div className="lp-grain" aria-hidden="true" />

      {/* Scroll progress bar */}
      <div
        className="lp-progress"
        aria-hidden="true"
        style={{ transform: `scaleX(${progress})` }}
      />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <SiteNav onPlay={onPlay} ghostUntilScroll />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="lp-hero">
        {/* Dot-grid parallaxes at 0.28× scroll speed */}
        <div className="lp-hero-dotgrid" aria-hidden="true" />

        <div className="lp-container lp-hero-layout">

          {/* Left: copy — lines stagger in individually */}
          <div className="lp-hero-copy">
            <div className="lp-tag lp-hl lp-hl-0">A startup sim where you probably die</div>
            <h1 className="lp-hero-h1">
              <span className="lp-hl lp-hl-1">Build the startup</span><br />
              <em className="lp-hl lp-hl-2">you always dreamed of.</em>
            </h1>
            <p className="lp-hero-sub lp-hl lp-hl-3">
              Hire your team. Ship features. Manage burn rate. Navigate crises.
              Every decision compounds — just like the real thing.
            </p>
            <div className="lp-hero-ctas lp-hl lp-hl-4">
              <button className="lp-btn lp-btn--primary" onClick={onPlay}>▶ Start Playing</button>
              <span className="lp-hero-footnote">Free to play · Runs in your browser</span>
            </div>

            {/* Floating metric pills */}
            <div className="lp-hero-pills lp-hl lp-hl-5" aria-hidden="true">
              <div className="lp-pill lp-pill--green">
                <span className="lp-pill-l">MRR</span>
                <span className="lp-pill-v">$12,400</span>
              </div>
              <div className="lp-pill">
                <span className="lp-pill-l">Runway</span>
                <span className="lp-pill-v">8.3 mo</span>
              </div>
              <div className="lp-pill lp-pill--warn">
                <span className="lp-pill-l">Burn</span>
                <span className="lp-pill-v">$3,200/mo</span>
              </div>
              <div className="lp-pill">
                <span className="lp-pill-l">Users</span>
                <span className="lp-pill-v">47</span>
              </div>
            </div>
          </div>

          {/* Right: game UI mockup with 3-D tilt */}
          <div className="lp-hero-mockup">
            <div
              className="lp-mock-tilt"
              ref={tiltRef}
              onMouseMove={onTiltMove}
              onMouseLeave={onTiltLeave}
              style={{
                transform: `perspective(1100px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              }}
            >
              <div className="lp-mock">
                {/* TopBar */}
                <div className="lp-mock-bar">
                  <div className="lp-mock-brand">⚡ Acme Corp <span className="lp-mock-stage">Early Growth</span></div>
                  <div className="lp-mock-pills">
                    {[
                      { l: 'MRR',  v: '$12,400',  c: 'green' },
                      { l: 'Burn', v: '$3,200/mo', c: 'warn' },
                      { l: 'Cash', v: '$48,200' },
                      { l: 'Day',  v: '47' },
                    ].map(p => (
                      <div key={p.l} className={`lp-mock-pill${p.c ? ` lp-mock-pill--${p.c}` : ''}`}>
                        <span className="lp-mock-pl">{p.l}</span>
                        <span className="lp-mock-pv">{p.v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Main area */}
                <div className="lp-mock-main">
                  <div className="lp-mock-office">
                    <img src="/assets/office/office_bg_level1.png" alt="" className="lp-mock-office-img" />
                    <div className="lp-mock-toast">🎉 First $5K MRR!</div>
                  </div>

                  <div className="lp-mock-rpanel">
                    <div className="lp-mock-tabs">
                      <div className="lp-mock-tab lp-mock-tab--on">Team</div>
                      <div className="lp-mock-tab">Product</div>
                      <div className="lp-mock-tab">GTM</div>
                    </div>
                    {[
                      { name: 'Alex R.', role: 'Developer', m: 82 },
                      { name: 'Maya K.', role: 'PM',        m: 75 },
                      { name: 'Jordan',  role: 'Marketing', m: 68 },
                    ].map(e => (
                      <div key={e.name} className="lp-mock-emp">
                        <div className="lp-mock-av">{e.name[0]}</div>
                        <div className="lp-mock-einfo">
                          <div className="lp-mock-ename">{e.name}</div>
                          <div className="lp-mock-erole">{e.role}</div>
                        </div>
                        <div className="lp-mock-ebar">
                          <div className="lp-mock-efill" style={{ width: `${e.m}%` }} />
                        </div>
                      </div>
                    ))}
                    <div className="lp-mock-event">
                      <div className="lp-mock-etag">⚡ OPPORTUNITY</div>
                      <div className="lp-mock-etitle">Angel investor interested</div>
                      <div className="lp-mock-esub">+$25K if you pitch by Friday</div>
                      <div className="lp-mock-ebtns">
                        <button className="lp-mock-ebtn lp-mock-ebtn--yes">Accept</button>
                        <button className="lp-mock-ebtn">Decline</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="lp-scroll-cue" aria-hidden="true">
          <div className="lp-scroll-line" />
        </div>
      </section>

      {/* ── Social Proof ────────────────────────────────────────────────── */}
      <div className="lp-social-proof">
        <div className="lp-container lp-sp-inner">
          <span className="lp-sp-stat">2,847 startups founded</span>
          <span className="lp-sp-dot" aria-hidden="true">·</span>
          <span className="lp-sp-stat">Average runway: 63 days</span>
          <span className="lp-sp-dot" aria-hidden="true">·</span>
          <span className="lp-sp-stat lp-sp-stat--red">94% failure rate</span>
        </div>
      </div>

      {/* ── Core Loop ───────────────────────────────────────────────────── */}
      <section className="lp-section lp-loop-section" ref={loopRef.ref}>
        <div className="lp-container">
          <div className={`lp-section-hd lp-reveal${loopRef.inView ? ' lp-in' : ''}`}>
            <div className="lp-tag">How It Works</div>
            <h2 className="lp-section-h2">Build. Ship. Burn. Repeat.</h2>
            <p className="lp-section-sub">Four phases. Infinite decisions. One goal: survive long enough to sell.</p>
          </div>
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <div
                key={s.num}
                className={`lp-step lp-reveal lp-reveal--d${i}${loopRef.inView ? ' lp-in' : ''}`}
              >
                {i < STEPS.length - 1 && <div className="lp-step-arrow" aria-hidden="true">→</div>}
                <div className="lp-step-num">{s.num}</div>
                <div className="lp-step-icon">{s.icon}</div>
                <div className="lp-step-title">{s.title}</div>
                <div className="lp-step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="lp-section lp-feat-section" ref={featRef.ref}>
        <div className="lp-container">
          <div className={`lp-section-hd lp-reveal${featRef.inView ? ' lp-in' : ''}`}>
            <div className="lp-tag">What You'll Build</div>
            <h2 className="lp-section-h2">The full chaos stack</h2>
            <p className="lp-section-sub">Six systems running in parallel. Any one of them can kill you.</p>
          </div>
          <div className="lp-feat-grid">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`lp-feat-card lp-reveal lp-reveal--d${i % 3}${featRef.inView ? ' lp-in' : ''}`}
              >
                <div className="lp-feat-icon">{f.icon}</div>
                <div className="lp-feat-title">{f.title}</div>
                <div className="lp-feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Metrics ─────────────────────────────────────────────────────── */}
      <section className="lp-section lp-metrics-section" ref={metricsRef.ref}>
        <div className="lp-container">
          <div className={`lp-section-hd lp-reveal${metricsRef.inView ? ' lp-in' : ''}`}>
            <div className="lp-tag lp-tag--light">Real Numbers</div>
            <h2 className="lp-section-h2 lp-section-h2--light">Track everything that matters</h2>
            <p className="lp-section-sub lp-section-sub--light">
              No abstract health bars. Live financial metrics, just like a real company dashboard.
            </p>
          </div>
          <div className="lp-metrics-grid">
            <Metric target={12400}   prefix="$"   label="Monthly MRR"   delay={0}   active={metricsRef.inView} />
            <Metric target={47}                   label="Active Users"  delay={150} active={metricsRef.inView} />
            <Metric target={8}       suffix=" mo"  label="Runway Left"   delay={300} active={metricsRef.inView} />
            <Metric target={1200000} prefix="$"   label="Valuation"     delay={450} active={metricsRef.inView} />
            <Metric target={7}       suffix=".4%" label="Monthly Churn" delay={600} active={metricsRef.inView} danger />
          </div>
        </div>
      </section>

      {/* ── Mid-page CTA ────────────────────────────────────────────────── */}
      <div className="lp-midcta">
        <div className="lp-container lp-midcta-inner">
          <p className="lp-midcta-text">The average founder lasts 63 days before running out of money.</p>
          <button className="lp-btn lp-btn--primary" onClick={onPlay}>See if you can beat it →</button>
        </div>
      </div>

      {/* ── Preview ─────────────────────────────────────────────────────── */}
      <section className="lp-section lp-preview-section" ref={previewRef.ref}>
        <div className="lp-container">
          <div className={`lp-section-hd lp-reveal${previewRef.inView ? ' lp-in' : ''}`}>
            <div className="lp-tag">Game Preview</div>
            <h2 className="lp-section-h2">Your company, live</h2>
            <p className="lp-section-sub">A full startup in your browser — hiring, shipping, and surviving in real time.</p>
          </div>

          <div className={`lp-preview-wrap lp-reveal${previewRef.inView ? ' lp-in' : ''}`}>
            <div className="lp-gm">
              <div className="lp-gm-topbar">
                <div className="lp-gm-brand">
                  <span className="lp-gm-logo">🚀</span>
                  <span className="lp-gm-name">NovaByte Inc.</span>
                  <span className="lp-gm-stage">Early Growth</span>
                </div>
                <div className="lp-gm-pills">
                  {[
                    { l: 'MRR',    v: '$8,200',    c: 'green' },
                    { l: 'Burn',   v: '$4,100/mo', c: 'warn' },
                    { l: 'Cash',   v: '$34,800' },
                    { l: 'Runway', v: '8.5 mo' },
                    { l: 'Users',  v: '34' },
                    { l: 'Day',    v: '62' },
                  ].map(p => (
                    <div key={p.l} className={`lp-gm-pill${p.c ? ` lp-gm-pill--${p.c}` : ''}`}>
                      <span className="lp-gm-pl">{p.l}</span>
                      <span className="lp-gm-pv">{p.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lp-gm-body">
                <div className="lp-gm-canvas">
                  <img src="/assets/office/office_bg_level1.png" alt="" className="lp-gm-office-img" />
                  <div className="lp-gm-milestone">🎉 Milestone: First $5K MRR!</div>
                </div>

                <div className="lp-gm-panel">
                  <div className="lp-gm-tabs">
                    <div className="lp-gm-tab lp-gm-tab--on">Team</div>
                    <div className="lp-gm-tab">Product</div>
                    <div className="lp-gm-tab">GTM</div>
                  </div>
                  {[
                    { name: 'Alex R.',   role: 'Developer',  m: 82 },
                    { name: 'Maya K.',   role: 'PM',         m: 75 },
                    { name: 'Jordan L.', role: 'Marketing',  m: 68 },
                  ].map(e => (
                    <div key={e.name} className="lp-gm-emp">
                      <div className="lp-gm-av">{e.name[0]}</div>
                      <div className="lp-gm-einfo">
                        <div className="lp-gm-ename">{e.name}</div>
                        <div className="lp-gm-erole">{e.role}</div>
                      </div>
                      <div className="lp-gm-ebar"><div className="lp-gm-efill" style={{ width: `${e.m}%` }} /></div>
                    </div>
                  ))}
                  <div className="lp-gm-eventcard">
                    <div className="lp-gm-etag">⚡ OPPORTUNITY</div>
                    <div className="lp-gm-etitle">Angel investor interested</div>
                    <div className="lp-gm-esub">+$25K seed check if you pitch by Friday</div>
                    <div className="lp-gm-ebtns">
                      <button className="lp-gm-ebtn lp-gm-ebtn--yes">Accept</button>
                      <button className="lp-gm-ebtn">Decline</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="lp-section lp-cta-section" ref={ctaRef.ref}>
        <div className="lp-container">
          <div className={`lp-cta-inner lp-reveal${ctaRef.inView ? ' lp-in' : ''}`}>
            <div className="lp-tag">Ready?</div>
            <h2 className="lp-cta-h2">Your runway is ticking.</h2>
            <p className="lp-cta-sub">
              Most founders don't make it to $10K MRR.<br />
              Every day you wait costs you runway. Will you survive?
            </p>
            <button className="lp-btn lp-btn--primary lp-btn--lg lp-btn--pulse" onClick={onPlay}>
              Start Building →
            </button>
            <p className="lp-cta-note">Free to play · No account · Runs in your browser</p>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <SiteFooter onPlay={onPlay} />
    </div>
  )
}
