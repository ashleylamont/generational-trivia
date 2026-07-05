import { GEN_BY_KEY } from '../engine/constants.js'

// Inline CSS variables that repaint the accent layer for the active generation —
// the "five eras, one telly" idea. Everything else stays charcoal.
export function eraVars(genKey) {
  const g = GEN_BY_KEY[genKey]
  if (!g) return {}
  return {
    '--era-accent': g.accent,
    '--era-accent-soft': g.accentSoft,
  }
}

export function genMeta(genKey) {
  return GEN_BY_KEY[genKey]
}
