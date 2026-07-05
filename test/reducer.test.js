import { describe, it, expect } from 'vitest'
import { reducer, initialState, PHASE, kindForTurn, currentTeam } from '../src/engine/reducer.js'
import { ROUND_KIND } from '../src/engine/constants.js'

// A render-ready open-ended question (as prepareQuestion would produce).
function q(overrides = {}) {
  return {
    id: overrides.id || 'x-music-1',
    gen: overrides.gen || 'alpha',
    category: overrides.category || 'music',
    type: 'open',
    difficulty: 1,
    q: 'Name the thing?',
    answer: overrides.answer || 'The Thing',
    accept: overrides.accept || [],
    funFact: 'fun',
    au: false,
  }
}

function startedGame() {
  let s = initialState()
  s = reducer(s, { type: 'START_GAME' })
  expect(s.phase).toBe(PHASE.ROUND_INTRO)
  s = reducer(s, { type: 'BEGIN_TURN' })
  expect(s.phase).toBe(PHASE.HANDOFF)
  return s
}

describe('game start & turn structure', () => {
  it('builds a full round of turns (teams * questionsPerTeam)', () => {
    const s = startedGame()
    expect(s.turnOrder.length).toBe(10) // classic: 5/team, 2 teams
    expect(s.roundIndex).toBe(0)
    expect(kindForTurn(s)).toBe(ROUND_KIND.HOME)
  })
})

describe('read-aloud answering & scoring', () => {
  it('awards flat 10 on a correct home-turf answer, via reveal + judge', () => {
    let s = startedGame()
    const team = currentTeam(s)
    s = reducer(s, { type: 'PRESENT_QUESTION', prepared: q({ gen: team.homeGens[0] }) })
    expect(s.phase).toBe(PHASE.QUESTION)
    expect(s.current.base).toBe(10)
    s = reducer(s, { type: 'REVEAL_ANSWER' })
    expect(s.phase).toBe(PHASE.JUDGE)
    s = reducer(s, { type: 'JUDGE', correct: true })
    expect(s.phase).toBe(PHASE.REVEAL)
    expect(s.current.correct).toBe(true)
    expect(currentTeam(s).score).toBe(10)
  })

  it('marks presented questions used (no repeats)', () => {
    let s = startedGame()
    s = reducer(s, { type: 'PRESENT_QUESTION', prepared: q({ id: 'used-1' }) })
    expect(s.usedIds.has('used-1')).toBe(true)
  })

  it('offers a steal on a missed answer with >1 team', () => {
    let s = startedGame()
    s = reducer(s, { type: 'PRESENT_QUESTION', prepared: q() })
    s = reducer(s, { type: 'REVEAL_ANSWER' })
    s = reducer(s, { type: 'JUDGE', correct: false })
    expect(s.current.correct).toBe(false)
    expect(s.current.stealAvailable).toBe(true)
  })

  it('does not offer a steal on timeout', () => {
    let s = startedGame()
    s = reducer(s, { type: 'PRESENT_QUESTION', prepared: q() })
    s = reducer(s, { type: 'TIMEOUT' })
    expect(s.current.correct).toBe(false)
    expect(s.current.stealAvailable).toBe(false)
    expect(s.current.revealFull).toBe(true)
  })
})

describe('steal flow', () => {
  it('awards ceil(base/2) to the stealing team on a correct steal', () => {
    let s = startedGame()
    s = reducer(s, { type: 'PRESENT_QUESTION', prepared: q() })
    s = reducer(s, { type: 'REVEAL_ANSWER' })
    s = reducer(s, { type: 'JUDGE', correct: false })
    s = reducer(s, { type: 'OPEN_STEAL' })
    expect(s.phase).toBe(PHASE.STEAL_PICK)
    const other = s.teams.find((t) => t.id !== s.current.teamId)
    s = reducer(s, { type: 'STEAL_PICK', teamId: other.id })
    expect(s.phase).toBe(PHASE.STEAL_JUDGE)
    s = reducer(s, { type: 'STEAL_JUDGE', correct: true })
    expect(s.phase).toBe(PHASE.STEAL_REVEAL)
    expect(s.teams.find((t) => t.id === other.id).score).toBe(5) // ceil(10/2)
  })
})

describe('wager math', () => {
  it('wins base + wager on correct, cannot go negative on wrong', () => {
    let s = startedGame()
    const teamId = s.current.teamId
    s = { ...s, teams: s.teams.map((t) => (t.id === teamId ? { ...t, score: 100 } : t)) }
    s.current.roundKind = ROUND_KIND.WAGER
    s = reducer(s, { type: 'SHOW_WAGER', prepared: q({ gen: 'alpha' }) })
    expect(s.phase).toBe(PHASE.WAGER)
    s = reducer(s, { type: 'COMMIT_WAGER', pct: 0.5 })
    expect(s.current.wagerAmount).toBe(50)
    s = reducer(s, { type: 'REVEAL_ANSWER' })
    s = reducer(s, { type: 'JUDGE', correct: true })
    // alpha vs boomer/genx home => dist 3 => base 25; +50 wager => 75; 100+75=175
    expect(currentTeam(s).score).toBe(175)
  })

  it('a zero-score team wagers zero and stays at zero on a wrong wager', () => {
    let s = startedGame()
    const teamId = s.current.teamId
    s = { ...s, teams: s.teams.map((t) => (t.id === teamId ? { ...t, score: 0 } : t)) }
    s.current.roundKind = ROUND_KIND.WAGER
    s = reducer(s, { type: 'SHOW_WAGER', prepared: q({ gen: 'alpha' }) })
    s = reducer(s, { type: 'COMMIT_WAGER', pct: 0.5 })
    expect(s.current.wagerAmount).toBe(0)
    s = reducer(s, { type: 'REVEAL_ANSWER' })
    s = reducer(s, { type: 'JUDGE', correct: false })
    expect(currentTeam(s).score).toBe(0)
  })
})

describe('spinner routing', () => {
  it('SPINNER_DONE goes to the question on a normal round', () => {
    let s = startedGame()
    s = reducer(s, { type: 'SHOW_SPINNER', prepared: q() })
    expect(s.phase).toBe(PHASE.SPINNER)
    expect(s.current.question).not.toBeNull()
    s = reducer(s, { type: 'SPINNER_DONE' })
    expect(s.phase).toBe(PHASE.QUESTION)
  })

  it('SPINNER_DONE routes a wager round to the wager screen, keeping the question', () => {
    let s = startedGame()
    const teamId = s.current.teamId
    s = { ...s, teams: s.teams.map((t) => (t.id === teamId ? { ...t, score: 100 } : t)) }
    s.current.roundKind = ROUND_KIND.WAGER
    s = reducer(s, { type: 'SHOW_SPINNER', prepared: q({ gen: 'alpha' }) })
    s = reducer(s, { type: 'SPINNER_DONE' })
    expect(s.phase).toBe(PHASE.WAGER)
    s = reducer(s, { type: 'COMMIT_WAGER', pct: 0.5 })
    expect(s.phase).toBe(PHASE.QUESTION)
    expect(s.current.question).not.toBeNull() // preserved through the wager
    expect(s.current.wagerAmount).toBe(50)
  })
})

describe('classic finale override', () => {
  it("turns Round 3's final question into a wager", () => {
    let s = initialState()
    s = reducer(s, { type: 'SET_LENGTH', key: 'classic' })
    s = reducer(s, { type: 'START_GAME' })
    s = { ...s, roundIndex: 2, turnPos: (s.questionsPerTeam - 1) * s.teams.length }
    expect(kindForTurn(s)).toBe(ROUND_KIND.WAGER)
    expect(kindForTurn({ ...s, turnPos: 0 })).toBe(ROUND_KIND.LUCKY)
  })
})
