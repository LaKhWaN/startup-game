export interface FaqItem {
  q: string
  a: string
}

export const IDEA_RATER_FAQ: FaqItem[] = [
  {
    q: 'How is the score calculated?',
    a: 'An AI model (run through Groq) rates your idea on six things: market size, how painful the problem is, competition, feasibility, how specific the idea is, and the business model. The 1–10 score is calculated from those, and it uses the whole range: a specific B2B idea can score 8 or more, while a vague one like "an app" scores 1. If the AI is unavailable, you get a quick local estimate instead.',
  },
  {
    q: 'What does the score mean for the game?',
    a: 'In failunicorn, your score sets your difficulty tier: Promising (8–10), Competitive (5–7), Risky (3–4) or Brutal (0–2). Better tiers get a bigger market, easier sales and lower churn; weaker ones have to fight for every customer.',
  },
  {
    q: 'Is my idea stored or shared?',
    a: 'The idea rater doesn\'t save your idea: it\'s sent to the AI model for scoring, and the result is cached in your browser for 7 days. If you then play a game with it, the idea is saved along with anonymous game stats, which we use to balance the game.',
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
