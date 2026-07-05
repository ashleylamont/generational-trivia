import { describe, it, expect } from 'vitest'
import { pickTargetGen, drawQuestion } from '../src/engine/draw.js'
import { mulberry32 } from '../src/engine/rng.js'
import { GENERATIONS } from '../src/engine/constants.js'

// A tiny synthetic bank: 3 questions per gen×category, all categories.
function stubBank() {
  const cats = ['music', 'slang', 'gaming', 'filmtv', 'general', 'sport', 'toys']
  const out = []
  for (const g of GENERATIONS.map((x) => x.key)) {
    for (const c of cats) {
      for (let i = 1; i <= 3; i++) {
        out.push({
          id: `${g}-${c}-${i}`,
          gen: g,
          category: c,
          type: 'mcq',
          difficulty: ((i - 1) % 3) + 1,
          q: `${g} ${c} ${i}?`,
          options: ['a', 'b', 'c', 'd'],
          answer: 0,
          funFact: 'x',
          au: false,
        })
      }
    }
  }
  return out
}

describe('pickTargetGen', () => {
  it('home mode stays within home gens', () => {
    const rng = mulberry32(1)
    for (let i = 0; i < 50; i++) {
      const g = pickTargetGen({ homeGens: ['boomer', 'genx'], mode: 'home', rng })
      expect(['boomer', 'genx']).toContain(g)
    }
  })
  it('swap mode never returns a home gen', () => {
    const rng = mulberry32(2)
    for (let i = 0; i < 50; i++) {
      const g = pickTargetGen({ homeGens: ['millennial'], mode: 'swap', rng })
      expect(g).not.toBe('millennial')
    }
  })
})

describe('drawQuestion', () => {
  it('respects gen and category when available', () => {
    const bank = stubBank()
    const rng = mulberry32(3)
    const q = drawQuestion({
      bank,
      usedIds: new Set(),
      gen: 'genz',
      category: 'music',
      enabledCategories: ['music', 'slang'],
      rng,
    })
    expect(q.gen).toBe('genz')
    expect(q.category).toBe('music')
  })

  it('forceDifficulty draws exactly that tier when available', () => {
    const bank = stubBank() // 3 questions per gen×cat, difficulties 1/2/3
    const rng = mulberry32(42)
    for (let i = 0; i < 20; i++) {
      const q = drawQuestion({
        bank,
        usedIds: new Set(), // fresh pool so difficulty (not exhaustion) decides
        gen: 'genz',
        category: 'music',
        enabledCategories: ['music'],
        rng,
        forceDifficulty: 3,
      })
      expect(q.difficulty).toBe(3)
    }
  })

  it('forceDifficulty falls back to the nearest tier when the exact one is gone', () => {
    const bank = stubBank()
    const rng = mulberry32(5)
    // Use up every d3 genz/music question, then force Brutal — should get d2 (nearest).
    const used = new Set(
      bank.filter((q) => q.gen === 'genz' && q.category === 'music' && q.difficulty === 3).map((q) => q.id),
    )
    const q = drawQuestion({
      bank,
      usedIds: used,
      gen: 'genz',
      category: 'music',
      enabledCategories: ['music'],
      rng,
      forceDifficulty: 3,
    })
    expect(q.gen).toBe('genz')
    expect(q.category).toBe('music')
    expect(q.difficulty).toBe(2)
  })

  it('never repeats when drawing the whole bank', () => {
    const bank = stubBank()
    const rng = mulberry32(7)
    const used = new Set()
    let count = 0
    while (count < bank.length) {
      const q = drawQuestion({
        bank,
        usedIds: used,
        gen: 'boomer',
        category: null,
        enabledCategories: null,
        rng,
      })
      if (!q) break
      expect(used.has(q.id)).toBe(false)
      used.add(q.id)
      count++
    }
    expect(count).toBe(bank.length) // drew every question exactly once
  })

  it('falls back across gens when a cell is exhausted but stays in enabled categories', () => {
    const bank = stubBank()
    const rng = mulberry32(9)
    const used = new Set(bank.filter((q) => q.gen === 'alpha').map((q) => q.id))
    const q = drawQuestion({
      bank,
      usedIds: used,
      gen: 'alpha',
      category: null,
      enabledCategories: ['music'],
      rng,
    })
    expect(q).not.toBeNull()
    expect(q.category).toBe('music')
    expect(q.gen).not.toBe('alpha')
    // nearest gen to alpha is genz
    expect(q.gen).toBe('genz')
  })
})
