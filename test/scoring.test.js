import { describe, it, expect } from 'vitest'
import {
  generationDistance,
  basePoints,
  stealPoints,
  clampWager,
  resolveWager,
} from '../src/engine/scoring.js'
import { ROUND_KIND } from '../src/engine/constants.js'

describe('generationDistance', () => {
  it('is 0 when the question gen is a home gen', () => {
    expect(generationDistance('boomer', ['boomer', 'genx'])).toBe(0)
  })
  it('is the minimum index gap across home gens', () => {
    // boomer(0) vs home {millennial(2), genz(3)} => min(2,3) = 2
    expect(generationDistance('boomer', ['millennial', 'genz'])).toBe(2)
    // alpha(4) vs home {boomer(0)} => 4
    expect(generationDistance('alpha', ['boomer'])).toBe(4)
  })
  it('handles single home gen', () => {
    expect(generationDistance('genz', ['boomer'])).toBe(3)
  })
})

describe('basePoints', () => {
  it('is flat 10 on home turf', () => {
    expect(basePoints(ROUND_KIND.HOME, 0)).toBe(10)
    expect(basePoints(ROUND_KIND.HOME, 3)).toBe(10)
  })
  it('is 10 + 5*distance for gen swap', () => {
    expect(basePoints(ROUND_KIND.SWAP, 1)).toBe(15)
    expect(basePoints(ROUND_KIND.SWAP, 2)).toBe(20)
    expect(basePoints(ROUND_KIND.SWAP, 3)).toBe(25)
    expect(basePoints(ROUND_KIND.SWAP, 4)).toBe(30)
  })
  it('lucky dip distance 0 scores 10', () => {
    expect(basePoints(ROUND_KIND.LUCKY, 0)).toBe(10)
  })
})

describe('stealPoints', () => {
  it('is half rounded up', () => {
    expect(stealPoints(20)).toBe(10)
    expect(stealPoints(15)).toBe(8) // ceil(7.5)
    expect(stealPoints(25)).toBe(13) // ceil(12.5)
    expect(stealPoints(10)).toBe(5)
  })
})

describe('wager', () => {
  it('clamps to non-negative floored percentage of score', () => {
    expect(clampWager(200, 0.25)).toBe(50)
    expect(clampWager(0, 0.5)).toBe(0)
    expect(clampWager(30, 0.1)).toBe(3)
    expect(clampWager(-40, 0.5)).toBe(0)
  })
  it('never exceeds the score', () => {
    expect(clampWager(40, 0.5)).toBe(20)
  })
  it('resolves win as base + wager, loss as -wager', () => {
    expect(resolveWager({ correct: true, base: 20, wager: 15 })).toBe(35)
    expect(resolveWager({ correct: false, base: 20, wager: 15 })).toBe(-15)
  })
  it('a 0-score team can wager 0 and cannot go negative', () => {
    const w = clampWager(0, 0.5)
    expect(w).toBe(0)
    expect(resolveWager({ correct: false, base: 20, wager: w })).toBe(0)
  })
})
