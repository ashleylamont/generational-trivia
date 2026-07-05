// Core game constants. The generation array order is load-bearing: index drives
// the generational-distance scoring model.

export const GENERATIONS = [
  {
    key: 'boomer',
    label: 'Boomers',
    short: 'Boomer',
    years: '1946–1964',
    emoji: '📻',
    // warm amber / wood-grain warmth
    accent: '#f59e0b',
    accentSoft: '#b45309',
    badge: 'radio',
  },
  {
    key: 'genx',
    label: 'Gen X',
    short: 'Gen X',
    years: '1965–1980',
    emoji: '📼',
    // burnt orange, cassette-label
    accent: '#fb7137',
    accentSoft: '#9a3412',
    badge: 'cassette',
  },
  {
    key: 'millennial',
    label: 'Millennials',
    short: 'Millennial',
    years: '1981–1996',
    emoji: '💾',
    // hot pink/purple, MSN-window chrome
    accent: '#e440c9',
    accentSoft: '#86198f',
    badge: 'msn',
  },
  {
    key: 'genz',
    label: 'Gen Z',
    short: 'Gen Z',
    years: '1997–2012',
    emoji: '📱',
    // acid green
    accent: '#a3e635',
    accentSoft: '#4d7c0f',
    badge: 'app',
  },
  {
    key: 'alpha',
    label: 'Gen Alpha',
    short: 'Gen Alpha',
    years: '2013+',
    emoji: '🎮',
    // saturated cyan / glossy
    accent: '#22d3ee',
    accentSoft: '#0e7490',
    badge: 'glossy',
  },
]

export const GEN_INDEX = Object.fromEntries(GENERATIONS.map((g, i) => [g.key, i]))
export const GEN_BY_KEY = Object.fromEntries(GENERATIONS.map((g) => [g.key, g]))

export const CATEGORIES = [
  { key: 'music', label: 'Music', emoji: '🎵' },
  { key: 'slang', label: 'Slang', emoji: '💬' },
  { key: 'gaming', label: 'Gaming', emoji: '🕹️' },
  { key: 'filmtv', label: 'Film & TV', emoji: '📺' },
  { key: 'general', label: 'General', emoji: '🌏' },
  { key: 'sport', label: 'Sport', emoji: '🏆' },
  { key: 'toys', label: 'Toys & Fads', emoji: '🧸' },
]

export const CAT_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]))

// Tappable team colour palette (distinct, high-contrast on charcoal).
export const TEAM_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // yellow
  '#a855f7', // purple
  '#f97316', // orange
]

export const DEFAULT_TEAM_NAMES = [
  'The Grey Nomads',
  'Team Bin Chicken',
  'The Skibidi Seniors',
  'Servo Snags',
  'The Boomer Remoovers',
  'Fully Sick Crew',
  'The Drop Bears',
  "Nan's Angels",
]

// Game length presets. `questionsPerTeam` = Q per team per round.
export const GAME_LENGTHS = {
  quick: { key: 'quick', label: 'Quick', rounds: 2, questionsPerTeam: 4, blurb: '2 rounds · ~15 min' },
  classic: { key: 'classic', label: 'Classic', rounds: 3, questionsPerTeam: 5, blurb: '3 rounds · ~30 min' },
  marathon: { key: 'marathon', label: 'Marathon', rounds: 4, questionsPerTeam: 5, blurb: '4 rounds · ~45 min' },
}

export const TIMER_OPTIONS = {
  off: { key: 'off', label: 'Off', seconds: 0 },
  relaxed: { key: 'relaxed', label: 'Relaxed', seconds: 45 },
  standard: { key: 'standard', label: 'Standard', seconds: 30 },
  sweaty: { key: 'sweaty', label: 'Sweaty', seconds: 15 },
}

// Round kinds. Points model keyed here; the reducer decides which applies.
export const ROUND_KIND = {
  HOME: 'home', // Round 1 — Home Turf, flat 10
  SWAP: 'swap', // Round 2 — Gen Swap, distance scoring
  LUCKY: 'lucky', // Round 3 — Lucky Dip, distance scoring
  WAGER: 'wager', // Round 4 / Classic finale — Time Warp wager
}

export const WAGER_PRESETS = [0, 0.1, 0.25, 0.5]

// Per-team difficulty opt-in. A team can choose to face harder questions, which
// are worth more (via the difficulty bonus in scoring). `weights` bias which
// difficulty tier gets drawn from each generation's pool. Standard already skews
// harder than a typical quiz; Hard/Brutal chase the high-value d3 questions.
export const STAKES = {
  standard: {
    key: 'standard',
    label: 'Standard',
    emoji: '🙂',
    hint: 'A fair, testing mix',
    weights: { 1: 0.2, 2: 0.45, 3: 0.35 },
  },
  hard: {
    key: 'hard',
    label: 'Hard',
    emoji: '😤',
    hint: 'Tougher questions · more points',
    weights: { 1: 0.05, 2: 0.4, 3: 0.55 },
  },
  brutal: {
    key: 'brutal',
    label: 'Brutal',
    emoji: '💀',
    hint: 'Brutal questions · max points',
    weights: { 1: 0, 2: 0.2, 3: 0.8 },
  },
}

export const DEFAULT_STAKE = 'standard'
