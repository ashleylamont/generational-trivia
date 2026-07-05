import {
  GENERATIONS,
  CATEGORIES,
  TEAM_COLORS,
  DEFAULT_TEAM_NAMES,
  GAME_LENGTHS,
  TIMER_OPTIONS,
  ROUND_KIND,
  GEN_INDEX,
} from './constants.js'
import { generationDistance, basePoints, stealPoints, clampWager, resolveWager } from './scoring.js'

// ---- Phases -----------------------------------------------------------------
export const PHASE = {
  TITLE: 'title',
  SETUP_TEAMS: 'setup_teams',
  SETUP_OPTIONS: 'setup_options',
  ROUND_INTRO: 'round_intro',
  HANDOFF: 'handoff',
  SPINNER: 'spinner',
  WAGER: 'wager',
  QUESTION: 'question',
  REVEAL: 'reveal',
  STEAL_PICK: 'steal_pick',
  STEAL_QUESTION: 'steal_question',
  STEAL_REVEAL: 'steal_reveal',
  ROUND_SUMMARY: 'round_summary',
  FINAL: 'final_results',
  TIEBREAK_INTRO: 'tiebreak_intro',
  TIEBREAK_HANDOFF: 'tiebreak_handoff',
  TIEBREAK_QUESTION: 'tiebreak_question',
  TIEBREAK_REVEAL: 'tiebreak_reveal',
}

// ---- Setup helpers ----------------------------------------------------------
const DEFAULT_HOMEGENS = [
  ['boomer', 'genx'],
  ['genz', 'alpha'],
  ['millennial', 'genz'],
  ['genx', 'millennial'],
]

function makeTeam(i) {
  return {
    id: `t${i}`,
    name: DEFAULT_TEAM_NAMES[i % DEFAULT_TEAM_NAMES.length],
    homeGens: [...(DEFAULT_HOMEGENS[i] || ['millennial'])],
    color: TEAM_COLORS[i % TEAM_COLORS.length],
    score: 0,
    skipsLeft: 1,
  }
}

export function initialState() {
  return {
    phase: PHASE.TITLE,
    teams: [makeTeam(0), makeTeam(1)],
    lengthKey: 'classic',
    timerKey: 'relaxed',
    enabledCategories: CATEGORIES.map((c) => c.key),
    // Derived from length at START_GAME.
    numRounds: GAME_LENGTHS.classic.rounds,
    questionsPerTeam: GAME_LENGTHS.classic.questionsPerTeam,
    timerSeconds: TIMER_OPTIONS.relaxed.seconds,
    roundIndex: 0,
    turnOrder: [],
    turnPos: 0,
    roundStartScores: {},
    current: null,
    usedIds: new Set(),
    log: [],
    copyIndex: 0,
    tiebreak: null,
    winners: [],
    error: null,
  }
}

// ---- Round / turn helpers ---------------------------------------------------
export function roundKindForIndex(roundIndex) {
  if (roundIndex === 0) return ROUND_KIND.HOME
  if (roundIndex === 1) return ROUND_KIND.SWAP
  if (roundIndex === 2) return ROUND_KIND.LUCKY
  return ROUND_KIND.WAGER
}

// The kind for the current turn, applying the Classic finale override where the
// final question of Round 3 becomes a Time Warp wager.
export function kindForTurn(state) {
  const base = roundKindForIndex(state.roundIndex)
  const cycle = Math.floor(state.turnPos / state.teams.length)
  const lastCycle = state.questionsPerTeam - 1
  if (state.lengthKey === 'classic' && state.roundIndex === 2 && cycle === lastCycle) {
    return ROUND_KIND.WAGER
  }
  return base
}

export function drawModeForKind(kind) {
  switch (kind) {
    case ROUND_KIND.HOME:
      return 'home'
    case ROUND_KIND.SWAP:
      return 'swap'
    case ROUND_KIND.LUCKY:
      return 'lucky'
    case ROUND_KIND.WAGER:
      return 'wager'
    default:
      return 'lucky'
  }
}

function buildTurnOrder(teams, roundIndex, questionsPerTeam) {
  // Rotate who goes first each round, then round-robin so teams alternate.
  const n = teams.length
  const rotated = teams.map((_, i) => teams[(i + roundIndex) % n].id)
  const order = []
  for (let q = 0; q < questionsPerTeam; q++) {
    for (const id of rotated) order.push(id)
  }
  return order
}

function startRound(state, roundIndex) {
  const turnOrder = buildTurnOrder(state.teams, roundIndex, state.questionsPerTeam)
  const roundStartScores = Object.fromEntries(state.teams.map((t) => [t.id, t.score]))
  return {
    ...state,
    phase: PHASE.ROUND_INTRO,
    roundIndex,
    turnOrder,
    turnPos: 0,
    roundStartScores,
    current: null,
    teams: state.teams.map((t) => ({ ...t, skipsLeft: 1 })),
  }
}

function beginTurn(state) {
  const teamId = state.turnOrder[state.turnPos]
  return {
    ...state,
    phase: PHASE.HANDOFF,
    current: {
      teamId,
      roundKind: kindForTurn(state),
      question: null,
      pendingQuestion: null,
      gen: null,
      category: null,
      distance: 0,
      base: 0,
      chosenIndex: null,
      correct: null,
      gained: 0,
      timedOut: false,
      wagerPct: 0,
      wagerAmount: 0,
      stealAvailable: false,
      revealFull: false,
      steal: null,
    },
  }
}

// Move to the next turn or the round summary.
function advanceTurn(state) {
  const nextPos = state.turnPos + 1
  if (nextPos < state.turnOrder.length) {
    return beginTurn({ ...state, turnPos: nextPos })
  }
  // Round over.
  return { ...state, phase: PHASE.ROUND_SUMMARY }
}

// ---- Scoring a presented question ------------------------------------------
function contextForQuestion(state, prepared) {
  const team = state.teams.find((t) => t.id === state.current.teamId)
  const kind = state.current.roundKind
  const distance = generationDistance(prepared.gen, team.homeGens)
  const base = basePoints(kind, distance)
  return { distance, base }
}

function applyAnswer(state, chosenIndex, timedOut) {
  const cur = state.current
  const correct = !timedOut && chosenIndex === cur.question.correctIndex
  let gained
  if (cur.roundKind === ROUND_KIND.WAGER) {
    gained = resolveWager({ correct, base: cur.base, wager: cur.wagerAmount })
  } else {
    gained = correct ? cur.base : 0
  }
  const teams = state.teams.map((t) =>
    t.id === cur.teamId ? { ...t, score: Math.max(0, t.score + gained) } : t,
  )
  const log = [
    ...state.log,
    {
      team: cur.teamId,
      questionGen: cur.gen,
      category: cur.category,
      distance: cur.distance,
      correct,
      points: gained,
      roundKind: cur.roundKind,
      wager: cur.roundKind === ROUND_KIND.WAGER ? cur.wagerAmount : 0,
      timedOut,
    },
  ]

  // Steal eligibility: wrong (not timeout), not a wager, and another team exists.
  const stealAvailable =
    !correct && !timedOut && cur.roundKind !== ROUND_KIND.WAGER && state.teams.length > 1

  return {
    ...state,
    teams,
    log,
    copyIndex: state.copyIndex + 1,
    phase: PHASE.REVEAL,
    current: {
      ...cur,
      chosenIndex,
      correct,
      gained,
      timedOut,
      stealAvailable,
      revealFull: !stealAvailable,
    },
  }
}

// ---- Winner / tiebreak helpers ---------------------------------------------
export function leaderboard(state) {
  return [...state.teams].sort((a, b) => b.score - a.score)
}

function topTeams(teams) {
  const max = Math.max(...teams.map((t) => t.score))
  return teams.filter((t) => t.score === max)
}

// Generation most distant from ALL tied teams (maximise the min distance).
function mostDistantGenFrom(teams) {
  const homeUnion = teams.flatMap((t) => t.homeGens)
  let best = GENERATIONS[0].key
  let bestScore = -1
  for (const g of GENERATIONS) {
    const d = generationDistance(g.key, homeUnion)
    if (d > bestScore) {
      bestScore = d
      best = g.key
    }
  }
  return best
}

function finalizeOrTiebreak(state) {
  const tied = topTeams(state.teams)
  if (tied.length <= 1) {
    return { ...state, phase: PHASE.FINAL, winners: tied.map((t) => t.id) }
  }
  return {
    ...state,
    phase: PHASE.TIEBREAK_INTRO,
    tiebreak: {
      teamIds: tied.map((t) => t.id),
      gen: mostDistantGenFrom(tied),
      round: 0,
      answers: {},
      pos: 0,
      question: null,
    },
    winners: [],
  }
}

// ---- Reducer ----------------------------------------------------------------
export function reducer(state, action) {
  switch (action.type) {
    // -- Global ---------------------------------------------------------------
    case 'NEW_GAME':
      return initialState()
    case 'GOTO':
      return { ...state, phase: action.phase, error: null }

    // -- Team setup -----------------------------------------------------------
    case 'ADD_TEAM': {
      if (state.teams.length >= 4) return state
      return { ...state, teams: [...state.teams, makeTeam(state.teams.length)] }
    }
    case 'REMOVE_TEAM': {
      if (state.teams.length <= 2) return state
      return { ...state, teams: state.teams.filter((t) => t.id !== action.teamId) }
    }
    case 'RENAME_TEAM':
      return {
        ...state,
        teams: state.teams.map((t) =>
          t.id === action.teamId ? { ...t, name: action.name } : t,
        ),
      }
    case 'TOGGLE_GEN':
      return {
        ...state,
        teams: state.teams.map((t) => {
          if (t.id !== action.teamId) return t
          const has = t.homeGens.includes(action.gen)
          // Keep at least one home generation.
          if (has && t.homeGens.length === 1) return t
          return {
            ...t,
            homeGens: has
              ? t.homeGens.filter((g) => g !== action.gen)
              : [...t.homeGens, action.gen].sort((a, b) => GEN_INDEX[a] - GEN_INDEX[b]),
          }
        }),
      }
    case 'CYCLE_COLOR':
      return {
        ...state,
        teams: state.teams.map((t) => {
          if (t.id !== action.teamId) return t
          const i = TEAM_COLORS.indexOf(t.color)
          return { ...t, color: TEAM_COLORS[(i + 1) % TEAM_COLORS.length] }
        }),
      }

    // -- Options --------------------------------------------------------------
    case 'SET_LENGTH':
      return { ...state, lengthKey: action.key }
    case 'SET_TIMER':
      return { ...state, timerKey: action.key }
    case 'TOGGLE_CATEGORY': {
      const has = state.enabledCategories.includes(action.key)
      if (has && state.enabledCategories.length <= 3) return state // min 3
      return {
        ...state,
        enabledCategories: has
          ? state.enabledCategories.filter((c) => c !== action.key)
          : [...state.enabledCategories, action.key],
      }
    }

    // -- Start / rounds -------------------------------------------------------
    case 'START_GAME': {
      const len = GAME_LENGTHS[state.lengthKey]
      const timer = TIMER_OPTIONS[state.timerKey]
      const primed = {
        ...state,
        numRounds: len.rounds,
        questionsPerTeam: len.questionsPerTeam,
        timerSeconds: timer.seconds,
        teams: state.teams.map((t) => ({ ...t, score: 0, skipsLeft: 1 })),
        usedIds: new Set(),
        log: [],
        winners: [],
        tiebreak: null,
      }
      return startRound(primed, 0)
    }
    case 'REMATCH': {
      // Same teams, fresh questions from the remaining bank.
      const primed = {
        ...state,
        teams: state.teams.map((t) => ({ ...t, score: 0, skipsLeft: 1 })),
        log: [],
        winners: [],
        tiebreak: null,
      }
      return startRound(primed, 0)
    }
    case 'BEGIN_TURN':
      return beginTurn(state)
    case 'NEXT_ROUND':
      return startRound(state, state.roundIndex + 1)

    // -- Presenting a question ------------------------------------------------
    case 'PRESENT_QUESTION': {
      const p = action.prepared
      const { distance, base } = contextForQuestion(state, p)
      return {
        ...state,
        phase: PHASE.QUESTION,
        usedIds: new Set(state.usedIds).add(p.id),
        current: {
          ...state.current,
          question: p,
          gen: p.gen,
          category: p.category,
          distance,
          base,
        },
      }
    }
    case 'SHOW_SPINNER': {
      const p = action.prepared
      const { distance, base } = contextForQuestion(state, p)
      return {
        ...state,
        phase: PHASE.SPINNER,
        usedIds: new Set(state.usedIds).add(p.id),
        current: {
          ...state.current,
          question: p, // hidden until spinner resolves
          gen: p.gen,
          category: p.category,
          distance,
          base,
        },
      }
    }
    case 'REVEAL_SPINNER':
      return { ...state, phase: PHASE.QUESTION }

    case 'SHOW_WAGER': {
      const p = action.prepared
      const { distance, base } = contextForQuestion(state, p)
      return {
        ...state,
        phase: PHASE.WAGER,
        usedIds: new Set(state.usedIds).add(p.id),
        current: {
          ...state.current,
          pendingQuestion: p,
          gen: p.gen,
          category: p.category,
          distance,
          base,
        },
      }
    }
    case 'COMMIT_WAGER': {
      const team = state.teams.find((t) => t.id === state.current.teamId)
      const wagerAmount = clampWager(team.score, action.pct)
      return {
        ...state,
        phase: PHASE.QUESTION,
        current: {
          ...state.current,
          question: state.current.pendingQuestion,
          wagerPct: action.pct,
          wagerAmount,
        },
      }
    }

    // -- Skip -----------------------------------------------------------------
    case 'SKIP_QUESTION': {
      // Controller supplies a fresh prepared question; decrement skipsLeft.
      const p = action.prepared
      const { distance, base } = contextForQuestion(state, p)
      return {
        ...state,
        teams: state.teams.map((t) =>
          t.id === state.current.teamId ? { ...t, skipsLeft: Math.max(0, t.skipsLeft - 1) } : t,
        ),
        usedIds: new Set(state.usedIds).add(p.id),
        current: {
          ...state.current,
          question: p,
          gen: p.gen,
          category: p.category,
          distance,
          base,
        },
      }
    }

    // -- Answering ------------------------------------------------------------
    case 'ANSWER':
      return applyAnswer(state, action.index, false)
    case 'TIMEOUT':
      return applyAnswer(state, null, true)

    // -- Steal ----------------------------------------------------------------
    case 'OPEN_STEAL':
      return { ...state, phase: PHASE.STEAL_PICK }
    case 'SKIP_STEAL':
      return {
        ...state,
        current: { ...state.current, stealAvailable: false, revealFull: true },
        phase: PHASE.REVEAL,
      }
    case 'STEAL_PICK':
      return {
        ...state,
        phase: PHASE.STEAL_QUESTION,
        current: { ...state.current, steal: { teamId: action.teamId, chosenIndex: null } },
      }
    case 'STEAL_ANSWER': {
      const cur = state.current
      const correct = action.index === cur.question.correctIndex
      const gained = correct ? stealPoints(cur.base) : 0
      const teams = state.teams.map((t) =>
        t.id === cur.steal.teamId ? { ...t, score: Math.max(0, t.score + gained) } : t,
      )
      const log = [
        ...state.log,
        {
          team: cur.steal.teamId,
          questionGen: cur.gen,
          category: cur.category,
          distance: generationDistance(
            cur.gen,
            state.teams.find((t) => t.id === cur.steal.teamId).homeGens,
          ),
          correct,
          points: gained,
          roundKind: cur.roundKind,
          steal: true,
          wager: 0,
          timedOut: false,
        },
      ]
      return {
        ...state,
        teams,
        log,
        phase: PHASE.STEAL_REVEAL,
        current: {
          ...cur,
          revealFull: true,
          steal: { ...cur.steal, chosenIndex: action.index, correct, gained },
        },
      }
    }

    // -- Advance --------------------------------------------------------------
    case 'ADVANCE':
      return advanceTurn(state)

    case 'END_ROUND_CONTINUE': {
      if (state.roundIndex + 1 < state.numRounds) {
        return startRound(state, state.roundIndex + 1)
      }
      return finalizeOrTiebreak(state)
    }

    // -- Tiebreak -------------------------------------------------------------
    case 'TIEBREAK_BEGIN': {
      const tb = state.tiebreak
      return {
        ...state,
        phase: PHASE.TIEBREAK_HANDOFF,
        tiebreak: { ...tb, pos: 0, answers: {}, question: null },
      }
    }
    case 'TIEBREAK_PRESENT': {
      return {
        ...state,
        phase: PHASE.TIEBREAK_QUESTION,
        usedIds: new Set(state.usedIds).add(action.prepared.id),
        tiebreak: { ...state.tiebreak, question: action.prepared },
      }
    }
    case 'TIEBREAK_ANSWER': {
      const tb = state.tiebreak
      const teamId = tb.teamIds[tb.pos]
      const correct = action.index === tb.question.correctIndex
      const answers = { ...tb.answers, [teamId]: correct }
      const nextPos = tb.pos + 1
      if (nextPos < tb.teamIds.length) {
        // Next tied team answers the SAME question (kept, not redrawn).
        return {
          ...state,
          phase: PHASE.TIEBREAK_HANDOFF,
          tiebreak: { ...tb, answers, pos: nextPos },
        }
      }
      // All tied teams have answered — evaluate.
      const winners = tb.teamIds.filter((id) => answers[id])
      if (winners.length === 1) {
        return {
          ...state,
          phase: PHASE.TIEBREAK_REVEAL,
          tiebreak: { ...tb, answers, resolved: true },
          winners,
        }
      }
      const nextRound = tb.round + 1
      if (nextRound >= 5) {
        // Cap reached — joint winners.
        return {
          ...state,
          phase: PHASE.TIEBREAK_REVEAL,
          tiebreak: { ...tb, answers, resolved: true },
          winners: [...tb.teamIds],
        }
      }
      return {
        ...state,
        phase: PHASE.TIEBREAK_REVEAL,
        tiebreak: { ...tb, answers, resolved: false, round: nextRound },
      }
    }
    case 'TIEBREAK_CONTINUE': {
      // From reveal: either finished (go to final) or another sudden-death round.
      if (state.winners.length > 0) {
        return { ...state, phase: PHASE.FINAL }
      }
      const gen = mostDistantGenFrom(state.teams.filter((t) => state.tiebreak.teamIds.includes(t.id)))
      return {
        ...state,
        phase: PHASE.TIEBREAK_HANDOFF,
        tiebreak: { ...state.tiebreak, gen, pos: 0, answers: {}, question: null },
      }
    }

    default:
      return state
  }
}

// ---- Selectors --------------------------------------------------------------
export function currentTeam(state) {
  return state.current ? state.teams.find((t) => t.id === state.current.teamId) : null
}
