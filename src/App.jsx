import React, { useReducer, useRef } from 'react'
import { reducer, initialState, PHASE, currentTeam, drawModeForKind } from './engine/reducer.js'
import { drawQuestion, pickTargetGen } from './engine/draw.js'
import { prepareQuestion } from './engine/prepare.js'
import { mulberry32, randomSeed, pickOne } from './engine/rng.js'
import QUESTION_BANK from './data/questions/index.js'

import { TitleScreen, TeamSetup, OptionsSetup } from './screens/Setup.jsx'
import {
  Handoff,
  Spinner,
  WagerScreen,
  QuestionScreen,
  JudgeScreen,
  RevealScreen,
  StealPick,
  StealJudge,
  StealReveal,
} from './screens/Play.jsx'
import {
  RoundIntro,
  RoundSummary,
  FinalResults,
  TiebreakIntro,
  TiebreakHandoff,
  TiebreakQuestion,
  TiebreakReveal,
} from './screens/Results.jsx'

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  // RNG lives in a ref so the reducer stays pure (safe under StrictMode).
  const rngRef = useRef(null)
  if (!rngRef.current) rngRef.current = mulberry32(randomSeed())
  const rng = rngRef.current

  // Draw a prepared question honouring the current turn's round rules.
  function drawForTurn(kind) {
    const team = currentTeam(state)
    const mode = drawModeForKind(kind)
    const gen = pickTargetGen({ homeGens: team.homeGens, mode, rng })
    const wantsCategory = kind === 'lucky' || kind === 'wager' || mode === 'lucky' || mode === 'wager'
    const category = wantsCategory ? pickOne(state.enabledCategories, rng) : null
    const raw = drawQuestion({
      bank: QUESTION_BANK,
      usedIds: state.usedIds,
      gen,
      category,
      enabledCategories: state.enabledCategories,
      rng,
    })
    return raw ? prepareQuestion(raw) : null
  }

  function handleReady() {
    const kind = state.current.roundKind
    const prepared = drawForTurn(kind)
    if (!prepared) return
    if (kind === 'lucky') dispatch({ type: 'SHOW_SPINNER', prepared })
    else if (kind === 'wager') dispatch({ type: 'SHOW_WAGER', prepared })
    else dispatch({ type: 'PRESENT_QUESTION', prepared })
  }

  function handleSkip() {
    const prepared = drawForTurn(state.current.roundKind)
    if (prepared) dispatch({ type: 'SKIP_QUESTION', prepared })
  }

  function handleTiebreakReady() {
    const tb = state.tiebreak
    if (tb.question) {
      dispatch({ type: 'GOTO', phase: PHASE.TIEBREAK_QUESTION })
      return
    }
    const raw = drawQuestion({
      bank: QUESTION_BANK,
      usedIds: state.usedIds,
      gen: tb.gen,
      category: null,
      enabledCategories: state.enabledCategories,
      rng,
    })
    if (raw) dispatch({ type: 'TIEBREAK_PRESENT', prepared: prepareQuestion(raw) })
  }

  return <div className="h-full w-full bg-ink-900 text-white">{renderPhase()}</div>

  function renderPhase() {
    switch (state.phase) {
      case PHASE.TITLE:
        return <TitleScreen onNew={() => dispatch({ type: 'GOTO', phase: PHASE.SETUP_TEAMS })} />
      case PHASE.SETUP_TEAMS:
        return (
          <TeamSetup
            state={state}
            dispatch={dispatch}
            onNext={() => dispatch({ type: 'GOTO', phase: PHASE.SETUP_OPTIONS })}
          />
        )
      case PHASE.SETUP_OPTIONS:
        return (
          <OptionsSetup
            state={state}
            dispatch={dispatch}
            onBack={() => dispatch({ type: 'GOTO', phase: PHASE.SETUP_TEAMS })}
            onStart={() => dispatch({ type: 'START_GAME' })}
          />
        )
      case PHASE.ROUND_INTRO:
        return <RoundIntro state={state} dispatch={dispatch} />
      case PHASE.HANDOFF:
        return <Handoff state={state} onReady={handleReady} />
      case PHASE.SPINNER:
        return <Spinner state={state} onDone={() => dispatch({ type: 'REVEAL_SPINNER' })} />
      case PHASE.WAGER:
        return <WagerScreen state={state} dispatch={dispatch} />
      case PHASE.QUESTION:
        return <QuestionScreen state={state} dispatch={dispatch} onSkip={handleSkip} />
      case PHASE.JUDGE:
        return <JudgeScreen state={state} dispatch={dispatch} />
      case PHASE.REVEAL:
        return <RevealScreen state={state} dispatch={dispatch} />
      case PHASE.STEAL_PICK:
        return <StealPick state={state} dispatch={dispatch} />
      case PHASE.STEAL_JUDGE:
        return <StealJudge state={state} dispatch={dispatch} />
      case PHASE.STEAL_REVEAL:
        return <StealReveal state={state} dispatch={dispatch} />
      case PHASE.ROUND_SUMMARY:
        return <RoundSummary state={state} dispatch={dispatch} />
      case PHASE.FINAL:
        return <FinalResults state={state} dispatch={dispatch} />
      case PHASE.TIEBREAK_INTRO:
        return <TiebreakIntro state={state} dispatch={dispatch} />
      case PHASE.TIEBREAK_HANDOFF:
        return <TiebreakHandoff state={state} onReady={handleTiebreakReady} />
      case PHASE.TIEBREAK_QUESTION:
        return <TiebreakQuestion state={state} dispatch={dispatch} />
      case PHASE.TIEBREAK_REVEAL:
        return <TiebreakReveal state={state} dispatch={dispatch} />
      default:
        return <TitleScreen onNew={() => dispatch({ type: 'GOTO', phase: PHASE.SETUP_TEAMS })} />
    }
  }
}
