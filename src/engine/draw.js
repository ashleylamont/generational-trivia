import { GENERATIONS, GEN_INDEX } from './constants.js'
import { generationDistance } from './scoring.js'
import { weightedPick, pickOne } from './rng.js'

// Default difficulty mix for unforced draws (e.g. sudden death) — skews hard.
// Normal play forces the team's chosen tier instead.
const DEFAULT_DIFFICULTY_WEIGHTS = { 1: 0.1, 2: 0.3, 3: 0.35, 4: 0.25 }

// Pick which generation a question should come from, given the answering team's
// home generations and the round's draw mode.
export function pickTargetGen({ homeGens, mode, rng }) {
  const allKeys = GENERATIONS.map((g) => g.key)
  if (mode === 'home') {
    return pickOne(homeGens.length ? homeGens : allKeys, rng)
  }
  if (mode === 'lucky') {
    // Uniform over all generations.
    return pickOne(allKeys, rng)
  }
  if (mode === 'swap' || mode === 'wager') {
    // Distance ≥ 1, weighted toward larger distances (d1×1 … d4×4).
    const candidates = allKeys
      .map((key) => ({ key, dist: generationDistance(key, homeGens) }))
      .filter((c) => c.dist >= 1)
    if (candidates.length === 0) {
      // Team spans every generation — fall back to the most distant available.
      return pickOne(allKeys, rng)
    }
    return weightedPick(
      candidates.map((c) => ({ weight: c.dist, value: c.key })),
      rng,
    )
  }
  return pickOne(allKeys, rng)
}

// Choose a difficulty present in the pool, biased toward harder tiers.
function pickWeightedDifficulty(pool, rng, weights = DEFAULT_DIFFICULTY_WEIGHTS) {
  const present = [...new Set(pool.map((q) => q.difficulty))]
  const items = present.map((d) => ({ weight: (weights[d] ?? 0) + 0.001, value: d }))
  return weightedPick(items, rng)
}

// The difficulty in the pool closest to the requested tier (so a forced Brutal
// still returns something when a gen×category cell has no d3 left).
function nearestDifficulty(pool, target) {
  const present = [...new Set(pool.map((q) => q.difficulty))]
  return present.reduce((best, d) =>
    Math.abs(d - target) < Math.abs(best - target) ? d : best,
  )
}

// Draw a single unused question honouring gen/category with the spec's fallback
// chain. Returns null only if the whole bank is exhausted.
export function drawQuestion({
  bank,
  usedIds,
  gen,
  category,
  enabledCategories,
  rng,
  forceDifficulty,
}) {
  const isFree = (q) => !usedIds.has(q.id)
  const inEnabled = (q) => !enabledCategories || enabledCategories.includes(q.category)

  const tiers = []
  // Tier 1: exact gen + exact category (if a category was requested).
  if (category) {
    tiers.push((q) => isFree(q) && q.gen === gen && q.category === category)
  }
  // Tier 2: exact gen, any enabled category.
  tiers.push((q) => isFree(q) && q.gen === gen && inEnabled(q))
  // Tier 3: any gen, same category (if requested), else nearest gen any enabled.
  if (category) {
    tiers.push((q) => isFree(q) && q.category === category)
  }
  // Tier 4: nearest generation, any enabled category.
  tiers.push((q) => isFree(q) && inEnabled(q))
  // Tier 5: anything unused at all.
  tiers.push((q) => isFree(q))

  for (const match of tiers) {
    let pool = bank.filter(match)
    if (pool.length === 0) continue
    // When falling back across generations, prefer the nearest generation to the
    // intended one so the "era" still feels right.
    if (pool.some((q) => q.gen !== gen)) {
      const target = GEN_INDEX[gen]
      const minDist = Math.min(...pool.map((q) => Math.abs(GEN_INDEX[q.gen] - target)))
      pool = pool.filter((q) => Math.abs(GEN_INDEX[q.gen] - target) === minDist)
    }
    const diff = forceDifficulty
      ? nearestDifficulty(pool, forceDifficulty)
      : pickWeightedDifficulty(pool, rng)
    const byDiff = pool.filter((q) => q.difficulty === diff)
    return pickOne(byDiff.length ? byDiff : pool, rng)
  }
  return null
}
