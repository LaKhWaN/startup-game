import type { Candidate, EmployeeRole } from '../types'

const MALE_NAMES = [
  'Alex', 'Jordan', 'Drew', 'Cameron', 'Kai', 'Parker', 'Arjun', 'Luca',
  'Remy', 'Jules', 'Marcus', 'Ethan', 'Nolan', 'Devin', 'Omar',
]

const FEMALE_NAMES = [
  'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery', 'Quinn', 'Skyler',
  'Priya', 'Mei', 'Sofia', 'Nour', 'Zara', 'Maya', 'Elena',
]

const LAST_NAMES = [
  'Chen', 'Patel', 'Kim', 'Rodriguez', 'Johnson', 'Williams', 'Brown',
  'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas',
  'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez',
  'Lee', 'Nguyen', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Scott', 'Green',
]

export const ROLE_STATS: Record<EmployeeRole, string[]> = {
  developer:       ['coding', 'speed', 'accuracy', 'creativity'],
  product_manager: ['research', 'strategy', 'speed', 'communication'],
  sales:           ['persuasion', 'network', 'speed', 'persistence'],
  marketing:       ['creativity', 'analytics', 'reach', 'consistency'],
}

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  developer:       'Developer',
  product_manager: 'Product Manager',
  sales:           'Sales',
  marketing:       'Marketing',
}

const BASE_SALARY: Record<EmployeeRole, number> = {
  developer:       7000,
  product_manager: 6000,
  sales:           4500,
  marketing:       5000,
}

const BIOS_DEV = [
  'Loves open source and spends weekends at hackathons. Has shipped 5 npm packages that nobody uses yet.',
  'Former freelancer from Berlin who misses the döner but not the deadlines. Writes clean TypeScript.',
  'Completely self-taught — learned to code from YouTube at 16. Runs on coffee and curiosity.',
  'Built their first app at 14 and sold it to a classmate for $20. Been chasing that high ever since.',
  'Obsessed with clean architecture and will refactor your code while you sleep. Hates spaghetti code.',
  'Linux enthusiast and vim devotee. Has strong opinions about tabs vs spaces and will share them.',
  'Plays guitar in a garage band and writes Go on weekends. Dreams of building a music streaming app.',
  'Ex-game developer who got tired of crunch culture. Now builds SaaS tools with a healthy work-life balance.',
  'Has 3 side projects on GitHub, none of them finished. But the code quality is immaculate.',
  'Was a competitive programmer in college. Can solve LeetCode hards but struggles with CSS centering.',
]

const BIOS_PM = [
  'Reads product blogs like morning news and quotes Marty Cagan at dinner parties. Lives for user insights.',
  'Former founder who pivoted to PM after their startup ran out of runway. Learned a lot the hard way.',
  'Spreadsheet wizard and user research nerd. Can turn a vague idea into a crisp PRD in under an hour.',
  'Thinks in user stories and flow diagrams. Has a whiteboard in their apartment covered in sticky notes.',
  'Obsessed with NPS scores and activation funnels. Will A/B test the color of a button for two weeks.',
  'Loves interviewing customers and finds patterns others miss. Great at saying no to feature requests.',
  'Ran a tiny startup before joining the corporate world. Brings founder energy to every sprint planning.',
  'Writes PRDs on Sunday mornings with a flat white. Believes the best product wins, not the loudest.',
]

const BIOS_SALES = [
  'Closed their first deal at a hackathon demo day. Believes every conversation is a sales opportunity.',
  'Knows everyone in the local tech scene and has a Rolodex that could fill a phone book. Great networker.',
  'Used to sell SaaS at a Fortune 500 but got bored of the bureaucracy. Wants the startup hustle.',
  'Can sell ice to a polar bear and make them feel good about the purchase. Naturally charismatic.',
  'Lives for the thrill of closing deals and rings the office bell every time. Pure competitive energy.',
  'Runs a sales podcast on the side with 2k listeners. Thinks outbound is an art form, not spam.',
  'Former real estate agent who switched to tech sales. Brings incredible persistence and thick skin.',
  'Believes in consultative selling — never pushes, always listens first. Clients love the approach.',
]

const BIOS_MKT = [
  'Built a 10k Twitter following just for fun and figured they might as well get paid for it.',
  'Thinks in funnels and conversion rates. Can explain CAC vs LTV to your grandma and make it interesting.',
  'Previously grew a D2C brand from zero to 50k followers. Knows what makes people click and share.',
  'Content creator turned growth marketer. Has an eye for copy that converts and visuals that pop.',
  'SEO nerd with a designer\'s eye. Can rank a blog post and make it look beautiful at the same time.',
  'Ran viral TikTok campaigns before this and still doesn\'t fully understand why they went viral.',
  'Loves A/B testing everything — even tested two different bios before picking this one.',
  'Data-driven storyteller from NYC who turned a boring newsletter into a must-read with 8k subscribers.',
]

const ROLE_BIOS: Record<EmployeeRole, string[]> = {
  developer: BIOS_DEV,
  product_manager: BIOS_PM,
  sales: BIOS_SALES,
  marketing: BIOS_MKT,
}

let _idCounter = 0

function uid() {
  return `c-${Date.now()}-${_idCounter++}`
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateCandidate(role: EmployeeRole): Candidate {
  const gender: 'male' | 'female' = Math.random() < 0.5 ? 'male' : 'female'
  const firstNames = gender === 'male' ? MALE_NAMES : FEMALE_NAMES
  const name = `${pick(firstNames)} ${pick(LAST_NAMES)}`

  const statKeys = ROLE_STATS[role]
  const stats: Record<string, number> = {}
  let total = 0

  for (const key of statKeys) {
    const val = Math.floor(Math.random() * 8) + 2  // 2–9
    stats[key] = val
    total += val
  }

  const avg = total / statKeys.length
  const salary = Math.round(BASE_SALARY[role] * (0.7 + (avg / 10) * 0.6) / 100) * 100
  const bio = pick(ROLE_BIOS[role])

  return { id: uid(), name, role, stats, salary, gender, bio }
}

export function generateCandidatePool(count = 6): Candidate[] {
  const roles: EmployeeRole[] = ['developer', 'product_manager', 'sales', 'marketing']
  const pool: Candidate[] = []

  // Guarantee at least one of each role
  for (const role of roles) {
    pool.push(generateCandidate(role))
  }

  // Fill remainder with random roles
  while (pool.length < count) {
    const role = roles[Math.floor(Math.random() * roles.length)]
    pool.push(generateCandidate(role))
  }

  return pool.sort(() => Math.random() - 0.5)
}
