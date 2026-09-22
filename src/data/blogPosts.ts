export interface BlogPost {
  slug: string
  title: string
  description: string
  publishedAt: string
  updatedAt?: string
  author: string
  tags: string[]
  blocks: ContentBlock[]
}

export type ContentBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'callout'; text: string; variant?: 'tip' | 'warning' | 'info' }
  | { type: 'divider' }

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-to-survive-as-a-startup-founder',
    title: 'How to Survive as a Startup Founder (What the Simulator Taught Us)',
    description: 'The 7 most common reasons founders run out of runway — and what thousands of simulation runs revealed about the patterns behind each failure.',
    publishedAt: '2026-03-01',
    author: 'failunicorn team',
    tags: ['strategy', 'gameplay', 'founders'],
    blocks: [
      { type: 'p', text: 'After watching thousands of simulated startups live and die in failunicorn, some patterns are unmistakable. The same mistakes keep appearing on Day 30, Day 60, and at the very end. This post breaks down the seven most common causes of death — and more importantly, what you can do about them.' },
      { type: 'h2', text: '1. Hiring too fast, too early' },
      { type: 'p', text: 'The first hire feels exciting. The second hire feels like you\'re building something real. By the fourth hire, you\'re burning $28k/month in salaries before you have 50 customers. This is the most common way founders hit zero cash.' },
      { type: 'p', text: 'In the simulation, the optimal hire order is almost always: one developer → one marketer → one sales rep. Each hire should be justified by the current revenue, not by the future revenue you hope to have.' },
      { type: 'callout', text: 'Rule of thumb: your salary burn should never exceed 40% of your current monthly revenue until you hit $5k MRR. Before that, every salary dollar is a bet against the clock.', variant: 'tip' },
      { type: 'h2', text: '2. Ignoring churn until it\'s too late' },
      { type: 'p', text: 'Customer acquisition feels like progress. Churn feels like a silent tax you can deal with later. In reality, at 10% monthly churn you need to replace your entire customer base every 10 months just to stay flat. Combined with growth ambitions, you\'re running on a treadmill.' },
      { type: 'p', text: 'In failunicorn, the difficulty tier your idea is assigned determines your churn floor — the minimum churn rate you can achieve no matter what features you ship. A "Brutal" idea has a 12% churn floor. That means acquiring 200 customers requires onboarding 24 new ones every single month before you grow at all.' },
      { type: 'h2', text: '3. Over-investing in features before finding customers' },
      { type: 'p', text: 'Features take time to build and often disappoint. A feature that takes 14 days to ship and adds 8% conversion might sound good, but if you\'re spending 14 days with no marketing spend, you\'re burning cash for a marginal gain.' },
      { type: 'p', text: 'The most successful simulation runs pair feature development with active acquisition campaigns. Build a feature that reduces churn, launch a campaign the same week it ships. The compound effect is dramatically larger than either in isolation.' },
      { type: 'h2', text: '4. Picking the wrong workspace' },
      { type: 'p', text: 'This one seems cosmetic but it isn\'t. Starting in a home office gives you $120k cash — $20k more than a coworking space and $40k more than a rented office. That $40k difference is roughly 5 months of a junior developer\'s salary. Don\'t start with an office unless you genuinely need the max desk capacity on day one.' },
      { type: 'h2', text: '5. Running campaigns without product-market fit' },
      { type: 'p', text: 'Pouring money into acquisition before your churn is under control is a leaky bucket problem. You\'re filling the bucket while water pours out the bottom. Every dollar you spend on growth when churn is above 8% is partially wasted.' },
      { type: 'p', text: 'Ship at least one retention-focused feature (reduced churn) before running any paid acquisition campaign. The simulation rewards this ordering significantly.' },
      { type: 'h2', text: '6. Neglecting the random events' },
      { type: 'p', text: 'Events in failunicorn aren\'t just flavor. They\'re binary decisions that can swing your runway by weeks. A "viral feature write-up" can double your conversion for 30 days. A "security incident" can crater your customer count by 20% overnight.' },
      { type: 'p', text: 'The right mental model: treat positive events as acceleration, not as reasons to relax burn. Treat negative events as tests of your cash reserves. Founders who reach $10k MRR typically have 2–3 months of runway buffer at all times.' },
      { type: 'h2', text: '7. Waiting too long to check your metrics' },
      { type: 'p', text: 'The metrics tab exists for a reason. If your MRR growth rate is negative for three consecutive weeks, something is structurally wrong — and no campaign will fix a structural problem. Open the metrics tab every time you start a new game week. The graphs tell the story before the numbers do.' },
      { type: 'divider' },
      { type: 'p', text: 'The simulation won\'t teach you everything about founding a real company. But the core constraint — finite cash, compounding churn, and the need to find growth before the clock runs out — is more realistic than it looks. If you can reach $10k MRR in the game without running out of money, you\'ve internalized something real about capital efficiency.' },
    ],
  },
  {
    slug: 'startup-burn-rate-explained',
    title: 'Startup Burn Rate Explained: What It Is, Why It Kills, and How to Control It',
    description: 'Burn rate is the single most important number in a startup\'s financial life. Here\'s what it actually means, how to calculate it, and what good looks like.',
    publishedAt: '2026-03-10',
    author: 'failunicorn team',
    tags: ['finance', 'founders', 'education'],
    blocks: [
      { type: 'p', text: 'Burn rate is the speed at which a company spends its cash. It\'s usually measured monthly. If you have $300k in the bank and spend $30k per month more than you earn, your burn rate is $30k/month and your runway is 10 months.' },
      { type: 'h2', text: 'Gross burn vs. net burn' },
      { type: 'p', text: 'Gross burn is your total monthly spend — salaries, infrastructure, marketing, rent, everything. Net burn is your spend minus your revenue. A company with $50k in monthly expenses and $20k MRR has a gross burn of $50k and a net burn of $30k.' },
      { type: 'callout', text: 'Most founders track gross burn but plan around net burn. That\'s the right instinct — but only if your MRR is stable. If you have high churn, your net burn can get worse month-over-month even if you don\'t hire anyone.', variant: 'info' },
      { type: 'h2', text: 'What is a good burn rate?' },
      { type: 'p', text: 'There\'s no universal answer, but for an early-stage startup there are useful benchmarks:' },
      { type: 'ul', items: [
        'Pre-revenue: burn as little as possible. Every dollar saved is extended runway.',
        '$0–$5k MRR: net burn of 3–5× MRR is typical. You\'re spending to grow, but not recklessly.',
        '$5k–$20k MRR: net burn should be converging toward zero. If you\'re at $10k MRR and $50k net burn, you\'re on a dangerous path.',
        '$20k+ MRR: you should be approaching breakeven or already there.',
      ]},
      { type: 'h2', text: 'How runway is calculated' },
      { type: 'p', text: 'Runway = Cash / Net Monthly Burn Rate. Simple — but the denominator is a moving target. If you\'re growing, your revenue is increasing, which decreases net burn each month. If you\'re shrinking due to churn, net burn increases each month. Always model the pessimistic case.' },
      { type: 'h2', text: 'The primary drivers of burn rate' },
      { type: 'ul', items: [
        'Salaries: typically 60–80% of total burn for early-stage software companies.',
        'Infrastructure: cloud hosting, databases, services. Scales with usage.',
        'Marketing spend: paid ads, campaigns. The most controllable variable.',
        'Rent / office: fixed cost that provides no revenue leverage.',
      ]},
      { type: 'h2', text: 'In the failunicorn simulation' },
      { type: 'p', text: 'In failunicorn, burn rate updates in real time and runway is displayed in the top bar. The simulation models salaries as monthly deductions (processed on each 30-day cycle), infrastructure as a fixed monthly cost based on your workspace tier, and campaigns as one-time spends.' },
      { type: 'p', text: 'The most useful mental model in the game is the same as in reality: your runway determines how many experiments you can run. Each hire, each campaign, each feature is an experiment. Manage your runway to maximize the number of experiments before you\'re forced to stop.' },
      { type: 'callout', text: 'If you see a RunwayBanner in the game (it appears at 3 months remaining), treat it as a fire alarm — not a reminder. At 3 months, you need either a revenue spike or an immediate reduction in burn.', variant: 'warning' },
      { type: 'divider' },
      { type: 'p', text: 'Burn rate is mechanical: just arithmetic applied to a spreadsheet. What\'s hard is the emotional discipline to cut spend when growth is sluggish and optimism is high. The simulation makes this visceral in a way that reading about it usually doesn\'t.' },
    ],
  },
  {
    slug: 'best-startup-simulation-games',
    title: 'The Best Startup Simulation Games in 2026 (Browser & Desktop)',
    description: 'A ranked list of startup simulation games — from idle clickers to deep management sims — for anyone who wants to experience the chaos of building a company.',
    publishedAt: '2026-03-20',
    author: 'failunicorn team',
    tags: ['games', 'simulation', 'list'],
    blocks: [
      { type: 'p', text: 'Startup simulation games have had a quiet renaissance. The combination of management depth, financial stakes, and the emotional rollercoaster of building something from nothing has proved irresistible — both for real founders looking for a low-stakes sandbox, and for anyone curious about how startups actually work.' },
      { type: 'p', text: 'Here\'s our list of the best options available today, across browsers and desktop.' },
      { type: 'h2', text: '1. failunicorn (Browser, Free)' },
      { type: 'p', text: 'We\'re biased, but hear us out. failunicorn is the most mechanically realistic startup simulator available in a browser. It models churn, burn rate, AI-scored idea difficulty, random crisis events, and hiring decisions with real financial consequences. The goal is to reach $10k MRR (200 customers at $50 ARPU) before your cash hits zero.' },
      { type: 'p', text: 'What sets it apart: the difficulty of your run is determined by an AI (Gemini) evaluating your startup idea. A more realistic idea gets easier modifiers; a bad idea means brutal churn and skeptical investors. No signup needed.' },
      { type: 'h2', text: '2. Startup Company (Steam)' },
      { type: 'p', text: 'A desktop game (Steam, ~$5) with deeper management mechanics including office layout, employee morale, and product development cycles. Less focused on financial realism and more on the operational side of running a software company. Good for players who want a longer, more complex campaign.' },
      { type: 'h2', text: '3. Game Dev Tycoon (Steam/Mobile)' },
      { type: 'p', text: 'Technically about a game studio, not a startup, but the underlying mechanics — hiring, product decisions, market timing, and managing cash — translate directly. Extremely polished and accessible. A good entry point for the genre.' },
      { type: 'h2', text: '4. Capitalism Lab (Desktop)' },
      { type: 'p', text: 'The deep end. Capitalism Lab is a business simulation that models entire supply chains, retail operations, and financial markets. Not specifically a startup game, but the closest thing to a business school in game form. Steep learning curve.' },
      { type: 'h2', text: '5. Idle Startup Tycoon (Mobile)' },
      { type: 'p', text: 'If you want something low-commitment, Idle Startup Tycoon is a casual idle game where you tap to generate revenue and unlock upgrades. It doesn\'t pretend to be realistic, but it\'s a good distraction and surprisingly addictive.' },
      { type: 'h2', text: 'What makes a good startup simulation?' },
      { type: 'p', text: 'The best startup games share a few traits:' },
      { type: 'ul', items: [
        'Real financial stakes — decisions should have consequences that compound over time',
        'Meaningful tradeoffs — every hire and every feature should have an opportunity cost',
        'Uncertainty — not every outcome should be predictable, since real startups aren\'t',
        'Legible feedback — you should be able to understand why you failed and what to do differently',
      ]},
      { type: 'p', text: 'failunicorn tries to hit all four. Whether it succeeds is for you to judge — try it and let us know what you think.' },
    ],
  },
]
