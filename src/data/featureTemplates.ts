import type { FeatureImpact, FeatureEffects } from '../types'

export interface FeatureTemplate {
  title: string
  description: string
  baseDays: number
  value: 'low' | 'medium' | 'high'
  impacts: FeatureImpact[]
  effects?: FeatureEffects
  tradeoffHint?: string
  phase?: 'foundation' | 'launch' | 'growth' | 'scale'
}

export const FEATURE_TEMPLATES: FeatureTemplate[] = [
  // ── USER GROWTH (6) ─────────────────────────────────────────────────────────
  {
    title: 'User Authentication',
    description: 'Secure login, signup, and password reset.',
    baseDays: 10, value: 'high',
    impacts: ['activation', 'churn'],
    effects: { customers: 12, churnRate: -1.5 },
    tradeoffHint: 'Foundation feature — unlocks signups',
  },
  {
    title: 'Onboarding Flow',
    description: 'Step-by-step wizard for new user activation.',
    baseDays: 8, value: 'high',
    impacts: ['activation', 'churn', 'users'],
    effects: { customers: 15, churnRate: -1.5 },
    tradeoffHint: 'Converts visitors to users',
  },
  {
    title: 'Mobile Responsive',
    description: 'Fully responsive design for phones and tablets.',
    baseDays: 6, value: 'medium',
    impacts: ['users', 'reach'],
    effects: { customers: 12, brand: 2 },
    tradeoffHint: 'Unlocks mobile audience',
  },
  {
    title: 'Multi-language Support',
    description: 'i18n for English, Spanish, French, German, Chinese.',
    baseDays: 10, value: 'medium',
    impacts: ['users', 'reach'],
    effects: { customers: 18, brand: 3 },
    tradeoffHint: 'Global reach, high build cost',
  },
  {
    title: 'SSO Integration',
    description: 'Sign in with Google, GitHub, and Microsoft.',
    baseDays: 10, value: 'high',
    impacts: ['users', 'enterprise'],
    effects: { customers: 10, arpu: 3 },
    tradeoffHint: 'Enterprise-friendly signup',
  },
  {
    title: 'In-app Messaging',
    description: 'Real-time chat between users within the product.',
    baseDays: 12, value: 'high',
    impacts: ['activation', 'churn', 'users'],
    effects: { customers: 14, churnRate: -1, techDebt: 5 },
    tradeoffHint: 'Sticky feature, adds tech debt',
  },

  // ── MONETIZATION (5) ────────────────────────────────────────────────────────
  {
    title: 'Payment Integration',
    description: 'Stripe billing with monthly/annual plans.',
    baseDays: 12, value: 'high',
    impacts: ['mrr', 'upsell'],
    effects: { arpu: 8, customers: -5 },
    tradeoffHint: 'Some freeloaders leave',
  },
  {
    title: 'Custom Branding',
    description: 'White-label with custom logo, colors, and domain.',
    baseDays: 4, value: 'low',
    impacts: ['upsell', 'enterprise'],
    effects: { arpu: 12, brand: 5 },
    tradeoffHint: 'Premium positioning',
  },
  {
    title: 'Team Collaboration',
    description: 'Invite teammates and manage role-based permissions.',
    baseDays: 15, value: 'high',
    impacts: ['mrr', 'upsell', 'users'],
    effects: { arpu: 15, customers: -8, brand: 4 },
    tradeoffHint: 'Enterprise tier — pushes out small users',
  },
  {
    title: 'Premium Paywall',
    description: 'Gate advanced features behind a higher-priced tier.',
    baseDays: 6, value: 'medium',
    impacts: ['mrr', 'upsell'],
    effects: { arpu: 18, customers: -15, churnRate: -1 },
    tradeoffHint: 'Power users stay and pay more',
  },
  {
    title: 'Free Tier Expansion',
    description: 'Generous free plan to attract a wider audience.',
    baseDays: 4, value: 'medium',
    impacts: ['users', 'reach'],
    effects: { customers: 30, arpu: -8 },
    tradeoffHint: 'Dilutes revenue per user',
  },

  // ── RETENTION (5) ───────────────────────────────────────────────────────────
  {
    title: 'Dashboard Analytics',
    description: 'Usage charts and KPI metrics for users.',
    baseDays: 14, value: 'high',
    impacts: ['churn', 'upsell'],
    effects: { churnRate: -2.5, customers: 2 },
    tradeoffHint: 'Users see their value',
  },
  {
    title: 'Email Notifications',
    description: 'Automated trigger emails for key events.',
    baseDays: 5, value: 'medium',
    impacts: ['activation', 'churn'],
    effects: { churnRate: -1.5 },
    tradeoffHint: 'Keeps users engaged',
  },
  {
    title: 'Search Functionality',
    description: 'Full-text search across all content.',
    baseDays: 7, value: 'medium',
    impacts: ['churn'],
    effects: { churnRate: -1 },
    tradeoffHint: 'Reduces friction',
  },
  {
    title: 'Advanced Filters',
    description: 'Multi-condition filtering and saved filter presets.',
    baseDays: 6, value: 'medium',
    impacts: ['churn'],
    effects: { churnRate: -1.2, customers: 3 },
    tradeoffHint: 'Power user retention',
  },
  {
    title: 'Activity Feed',
    description: 'Live feed of team and system activity.',
    baseDays: 5, value: 'medium',
    impacts: ['activation', 'churn'],
    effects: { churnRate: -0.8, customers: 4 },
    tradeoffHint: 'Engagement loop',
  },

  // ── INFRASTRUCTURE (4) ──────────────────────────────────────────────────────
  {
    title: 'Public REST API',
    description: 'API with authentication and rate limiting.',
    baseDays: 8, value: 'medium',
    impacts: ['reach', 'integration'],
    effects: { customers: 8, techDebt: -5, brand: 2 },
    tradeoffHint: 'Enables integrations',
  },
  {
    title: 'Audit Logs',
    description: 'Track all user and admin actions for compliance.',
    baseDays: 4, value: 'low',
    impacts: ['enterprise', 'churn'],
    effects: { arpu: 4, techDebt: -3 },
    tradeoffHint: 'Enterprise compliance',
  },
  {
    title: 'Two-Factor Auth',
    description: 'TOTP-based 2FA for account security.',
    baseDays: 4, value: 'medium',
    impacts: ['churn', 'enterprise'],
    effects: { churnRate: -0.5, arpu: 2, techDebt: -2 },
    tradeoffHint: 'Security builds trust',
  },
  {
    title: 'Webhooks',
    description: 'Real-time event push to external URLs.',
    baseDays: 5, value: 'medium',
    impacts: ['integration', 'reach'],
    effects: { customers: 6, techDebt: -3, brand: 1 },
    tradeoffHint: 'Developer ecosystem play',
  },

  // ── HIGH-RISK / MIXED (5) ──────────────────────────────────────────────────
  {
    title: 'AI Summaries',
    description: 'GPT-powered summaries of reports and activity.',
    baseDays: 14, value: 'high',
    impacts: ['upsell', 'churn', 'reach'],
    effects: { customers: 10, arpu: 7, brand: 6, techDebt: 8 },
    tradeoffHint: 'Flashy but adds heavy tech debt',
  },
  {
    title: 'Custom Integrations',
    description: 'Native connectors for Slack, Jira, and Zapier.',
    baseDays: 12, value: 'high',
    impacts: ['integration', 'upsell', 'reach'],
    effects: { customers: 8, arpu: 5, techDebt: 6 },
    tradeoffHint: 'High value, complex maintenance',
  },
  {
    title: 'Automated Reports',
    description: 'Scheduled PDF reports sent to user email.',
    baseDays: 8, value: 'medium',
    impacts: ['churn', 'upsell'],
    effects: { churnRate: -1.5, arpu: 3, cashBonus: 500 },
    tradeoffHint: 'Upsell hook with retention',
  },
  {
    title: 'CSV Export',
    description: 'Export any data table to CSV or Excel.',
    baseDays: 3, value: 'low',
    impacts: ['churn', 'enterprise'],
    effects: { churnRate: -0.3, arpu: 1 },
    tradeoffHint: 'Quick win, small impact',
  },
  {
    title: 'Dark Mode',
    description: 'Toggle between light and dark UI themes.',
    baseDays: 2, value: 'low',
    impacts: ['churn'],
    effects: { customers: 2, churnRate: -0.3 },
    tradeoffHint: 'Cheap retention play',
  },
  {
    title: 'Keyboard Shortcuts',
    description: 'Power-user shortcuts for all major actions.',
    baseDays: 2, value: 'low',
    impacts: ['churn'],
    effects: { churnRate: -0.2, customers: 1 },
    tradeoffHint: 'Tiny but free',
  },
  {
    title: 'Bulk Actions',
    description: 'Select multiple items and act on them at once.',
    baseDays: 3, value: 'low',
    impacts: ['churn'],
    effects: { churnRate: -0.4, arpu: 1 },
    tradeoffHint: 'Power user convenience',
  },
]
