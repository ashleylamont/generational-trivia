import { describe, it, expect } from 'vitest'
import { reducer, initialState, PHASE, kindForTurn, currentTeam } from '../src/engine/reducer.js'
import { ROUND_KIND } from '../src/engine/constants.js'

function q(overrides = {}) {
  return {
    id: overrides.id || 'x-music-1',
    gen: overrides.gen || 'alpha',
    category: overrides.category || 'music',
    type: 'mcq',
    difficulty: 1,
    q: 'Test?',
    options: ['a', 'b', 'c', 'd'],
    correctIndex: overrides.correctIndex ?? 0,
    funFact: 'fun',
    au: false,
  }
}

function startedGame() {
  let s = initialState()
  // Team 0 home = boomer,genx ; Team 1 home = genz,alpha (defaults)
  s = reducer(s, { type: 'START_GAME' })
  expect(s.phase).toBe(PHASE.ROUND_INTRO)
  s = reducer(s, { type: 'BEGIN_TURN' })
  expect(s.phase).toBe(PHASE.HANDOFF)
  return s
}

describe('game start & turn structure', () => {
  it('builds a full round of turns (teams * questionsPerTeam)', () => {
    const s = startedGame()
    // classic: 5 questions/team, 2 teams => 10 turns
    expect(s.turnOrder.length).toBe(10)
    expect(s.roundIndex).toBe(0)
    expect(kindForTurn(s)).toBe(ROUND_KIND.HOME)
  })
})

describe('answering & scoring', () => {
  it('awards flat 10 on a correct home-turf answer', () => {
    let s = startedGame()
    const team = currentTeam(s)
    s = reducer(s, { type: 'PRESENT_QUESTION', prepared: q({ gen: team.homeGens[0], correctIndex: 2 }) })
    expect(s.phase).toBe(PHASE.QUESTION)
    expect(s.current.base).toBe(10)
    s = reducer(s, { type: 'ANSWER', index: 2 })
    expect(s.phase).toBe(PHASE.REVEAL)
    expect(s.current.correct).toBe(true)
    expect(currentTeam(s).score).toBe(10)
  })

  it('marks presented questions used (no repeats)', () => {
    let s = startedGame()
    s = reducer(s, { type: 'PRESENT_QUESTION', prepared: q({ id: 'used-1' }) })
    expect(s.usedIds.has('used-1')).toBe(true)
  })

  it('offers a steal on a wrong (non-timeout) answer with >1 team', () => {
    let s = startedGame()
    s = reducer(s, { type: 'PRESENT_QUESTION', prepared: q({ correctIndex: 0 }) })
    s = reducer(s, { type: 'ANSWER', index: 3 })
    expect(s.current.correct).toBe(false)
    expect(s.current.stealAvailable).toBe(true)
  })

  it('does not offer a steal on timeout', () => {
    let s = startedGame()
    s = reducer(s, { type: 'PRESENT_QUESTION', prepared: q({ correctIndex: 0 }) })
    s = reducer(s, { type: 'TIMEOUT' })
    expect(s.current.correct).toBe(false)
    expect(s.current.stealAvailable).toBe(false)
    expect(s.current.revealFull).toBe(true)
  })
})

describe('steal flow', () => {
  it('awards ceil(base/2) to the stealing team on a correct steal', () => {
    let s = startedGame()
    // Force a distance-bearing question so base > 10 (team0 home boomer/genx, gen alpha => dist 3 => base 25 in swap). Use home round: base 10 => steal 5.
    s = reducer(s, { type: 'PRESENT_QUESTION', prepared: q({ correctIndex: 0 }) })
    s = reducer(s, { type: 'ANSWER', index: 1 }) // wrong
    s = reducer(s, { type: 'OPEN_STEAL' })
    expect(s.phase).toBe(PHASE.STEAL_PICK)
    const otherTeam = s.teams.find((t) => t.id !== s.current.teamId)
    s = reducer(s, { type: 'STEAL_PICK', teamId: otherTeam.id })
    expect(s.phase).toBe(PHASE.STEAL_QUESTION)
    s = reducer(s, { type: 'STEAL_ANSWER', index: 0 }) // correct
    expect(s.phase).toBe(PHASE.STEAL_REVEAL)
    expect(s.teams.find((t) => t.id === otherTeam.id).score).toBe(5) // ceil(10/2)
  })
})

describe('wager math', () => {
  it('wins base + wager on correct, cannot go negative on wrong', () => {
    let s = startedGame()
    // give current team a score to wager
    const teamId = s.current.teamId
    s = { ...s, teams: s.teams.map((t) => (t.id === teamId ? { ...t, score: 100 } : t)) }
    s.current.roundKind = ROUND_KIND.WAGER
    s = reducer(s, { type: 'SHOW_WAGER', prepared: q({ gen: 'alpha', correctIndex: 0 }) })
    expect(s.phase).toBe(PHASE.WAGER)
    s = reducer(s, { type: 'COMMIT_WAGER', pct: 0.5 })
    expect(s.current.wagerAmount).toBe(50)
    s = reducer(s, { type: 'ANSWER', index: 0 }) // correct
    // base for alpha vs boomer/genx home = dist 3 => 10+15 = 25; +50 wager = 75; 100+75=175
    expect(currentTeam(s).score).toBe(175)
  })

  it('a zero-score team wagers zero and stays at zero on a wrong wager', () => {
    let s = startedGame()
    const teamId = s.current.teamId
    s = { ...s, teams: s.teams.map((t) => (t.id === teamId ? { ...t, score: 0 } : t)) }
    s.current.roundKind = ROUND_KIND.WAGER
    s = reducer(s, { type: 'SHOW_WAGER', prepared: q({ gen: 'alpha', correctIndex: 0 }) })
    s = reducer(s, { type: 'COMMIT_WAGER', pct: 0.5 })
    expect(s.current.wagerAmount).toBe(0)
    s = reducer(s, { type: 'ANSWER', index: 1 }) // wrong
    expect(currentTeam(s).score).toBe(0)
  })
})

describe('classic finale override', () => {
  it("turns Round 3's final question into a wager", () => {
    let s = initialState()
    s = reducer(s, { type: 'SET_LENGTH', key: 'classic' })
    s = reducer(s, { type: 'START_GAME' })
    // jump to round index 2, last cycle
    s = { ...s, roundIndex: 2, turnPos: (s.questionsPerTeam - 1) * s.teams.length }
    expect(kindForTurn(s)).toBe(ROUND_KIND.WAGER)
    // earlier question in round 3 is Lucky Dip
    expect(kindForTurn({ ...s, turnPos: 0 })).toBe(ROUND_KIND.LUCKY)
  })
})
