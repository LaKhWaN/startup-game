export interface FaqItem {
  q: string
  a: string
}

export const IDEA_RATER_FAQ: FaqItem[] = [
  {
    q: 'How is the score calculated?',
    a: 'We use Google Gemini AI to evaluate your idea on market viability, competition, and execution difficulty. Scores range from 1 (very hard to execute) to 10 (strong market fit). Most realistic ideas land between 4 and 7.',
  },
  {
    q: 'What does the score mean for the game?',
    a: 'In failunicorn, your score determines your difficulty tier: Promising (8-10) gets a customer bonus and lower churn; Brutal (0-3) starts with higher churn and skeptical investors. The simulation mirrors real market dynamics.',
  },
  {
    q: 'Is my idea stored or shared?',
    a: 'No. Your idea is sent to the Gemini API for analysis and the result is cached locally in your browser for 7 days. We don\'t store your idea on our servers.',
  },
  {
    q: 'What makes a high-scoring startup idea?',
    a: 'Ideas that score highly tend to have a clear target customer, an obvious pain point, low dependency on behavioral change, and a defensible distribution channel. B2B SaaS ideas often score higher than consumer apps because the revenue model is clearer.',
  },
  {
    q: 'Can I use this for my real startup?',
    a: 'It\'s a fun directional signal, not a market research report. Use it to stress-test your assumptions or gut-check an idea, then validate with real customers.',
  },
]
