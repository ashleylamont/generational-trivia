import { GEN_INDEX, ROUND_KIND } from './constants.js'

// Generational distance between a question's generation and a team's set of
// home generations = minimum absolute index difference.
export function generationDistance(questionGen, homeGens) {
  const qi = GEN_INDEX[questionGen]
  if (qi === undefined || !homeGens || homeGens.length === 0) return 0
  let best = Infinity
  for (const h of homeGens) {
    const hi = GEN_INDEX[h]
    if (hi === undefined) continue
    best = Math.min(best, Math.abs(qi - hi))
  }
  return best === Infinity ? 0 : best
}

// Harder questions are worth more, so opting into tougher questions pays off:
// d1 +0, d2 +5, d3 +10, d4 +15. Difficulty is relative to the question's own gen.
export function difficultyBonus(difficulty) {
  return (Math.max(1, Math.min(4, difficulty || 1)) - 1) * 5
}

// Base points on offer for a question, before steals/wagers.
// Home Turf: flat 10. Everything else: 10 + 5 × distance (distance 0 = 10).
// Every question then adds a difficulty bonus on top.
export function basePoints(roundKind, distance, difficulty = 1) {
  const core = roundKind === ROUND_KIND.HOME ? 10 : 10 + 5 * distance
  return core + difficultyBonus(difficulty)
}

// A successful steal earns half the base points, rounded up.
export function stealPoints(base) {
  return Math.ceil(base / 2)
}

// Wager resolution. amount is an absolute point value (already derived from the
// team's current score and the chosen percentage). Correct wins base + wager;
// wrong loses the wager (never below zero — enforced by clampWager on input).
export function resolveWager({ correct, base, wager }) {
  if (correct) return base + wager
  return wager === 0 ? 0 : -wager
}

// Turn a percentage (0/0.1/0.25/0.5) into an absolute, non-negative wager that
// can never push a team below zero.
export function clampWager(score, pct) {
  const raw = Math.floor(Math.max(0, score) * pct)
  return Math.max(0, Math.min(raw, Math.max(0, score)))
}
