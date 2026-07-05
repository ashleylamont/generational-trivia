import React, { useEffect, useRef, useState } from 'react'
import { Btn, Screen, GenBadge, TimerRing, TeamPill } from '../ui/components.jsx'
import { genMeta, eraVars } from '../ui/era.js'
import { GENERATIONS, CATEGORIES, CAT_BY_KEY, WAGER_PRESETS, ROUND_KIND } from '../engine/constants.js'
import { currentTeam } from '../engine/reducer.js'
import {
  CORRECT_LINES,
  WRONG_LINES,
  TIMEOUT_LINES,
  STEAL_WIN_LINES,
  STEAL_MISS_LINES,
  HANDOFF_SUBTITLES,
  wrongWithGen,
  pick,
} from '../engine/copy.js'

const ROUND_NAMES = {
  [ROUND_KIND.HOME]: 'Home Turf',
  [ROUND_KIND.SWAP]: 'Gen Swap',
  [ROUND_KIND.LUCKY]: 'Lucky Dip',
  [ROUND_KIND.WAGER]: 'Time Warp',
}

function roundLabel(state) {
  return `Round ${state.roundIndex + 1} · ${ROUND_NAMES[state.current?.roundKind] ?? ''}`
}

function questionCounter(state) {
  const cycle = Math.floor(state.turnPos / state.teams.length) + 1
  return `Q ${cycle}/${state.questionsPerTeam}`
}

// The canonical answer + any accepted variants, styled for the judge.
function AnswerCard({ question }) {
  return (
    <div
      className="rounded-2xl border-2 p-5 text-center era-accent-border"
      style={{ background: '#ffffff0d' }}
    >
      <div className="mb-1 text-xs font-bold uppercase tracking-widest text-white/40">Answer</div>
      <div className="font-display text-3xl font-extrabold leading-tight text-white">
        {question.answer}
      </div>
      {question.accept && question.accept.length > 0 && (
        <div className="mt-2 text-sm text-white/60">
          also accept: {question.accept.join(', ')}
        </div>
      )}
    </div>
  )
}

// ---- Handoff ----------------------------------------------------------------
export function Handoff({ state, onReady }) {
  const team = currentTeam(state)
  const subtitle = pick(HANDOFF_SUBTITLES, state.turnPos + state.roundIndex)
  return (
    <div
      className="grid min-h-full w-full place-items-center px-6 text-center"
      style={{ background: `linear-gradient(160deg, ${team.color}cc, ${team.color}55), #0d0f14` }}
    >
      <div>
        <div className="text-6xl">🎙️</div>
        <p className="mt-4 text-lg font-bold text-white/80">In the hot seat:</p>
        <h1 className="mt-1 font-display text-5xl font-extrabold text-white drop-shadow">
          {team.name}
        </h1>
        <p className="mx-auto mt-5 max-w-xs text-sm font-semibold text-white/75">
          Someone else grab the phone and read them the question aloud. {subtitle}
        </p>
        <div className="mt-9 w-64">
          <Btn onClick={onReady} style={eraVars(team.homeGens[0])}>
            Read the question
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ---- Lucky Dip spinner ------------------------------------------------------
export function Spinner({ state, onDone }) {
  const target = { gen: state.current.gen, category: state.current.category }
  const [display, setDisplay] = useState({ gen: 'boomer', category: 'music' })
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    let i = 0
    const gens = GENERATIONS.map((g) => g.key)
    const cats = CATEGORIES.map((c) => c.key)
    const iv = setInterval(() => {
      i++
      setDisplay({
        gen: gens[Math.floor(Math.random() * gens.length)],
        category: cats[Math.floor(Math.random() * cats.length)],
      })
    }, 90)
    const stop = setTimeout(() => {
      clearInterval(iv)
      setDisplay(target)
      setSettled(true)
      setTimeout(onDone, 900)
    }, 1700)
    return () => {
      clearInterval(iv)
      clearTimeout(stop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const g = genMeta(display.gen)
  return (
    <Screen center style={eraVars(display.gen)}>
      <div className="text-center">
        <p className="mb-6 font-display text-2xl font-bold text-white/70">Lucky Dip…</p>
        <div
          className={`mx-auto flex h-44 w-44 flex-col items-center justify-center rounded-3xl ${
            settled ? 'animate-popIn' : ''
          }`}
          style={{ background: `linear-gradient(135deg, ${g.accent}, ${g.accentSoft})` }}
        >
          <span className="text-5xl">{g.emoji}</span>
          <span className="mt-2 font-display text-xl font-extrabold text-black">{g.short}</span>
          <span className="text-sm font-bold text-black/70">
            {CAT_BY_KEY[display.category].emoji} {CAT_BY_KEY[display.category].label}
          </span>
        </div>
        {settled && <p className="mt-6 animate-flyUp font-bold text-white">Here we go!</p>}
      </div>
    </Screen>
  )
}

// ---- Time Warp wager --------------------------------------------------------
export function WagerScreen({ state, dispatch }) {
  const team = currentTeam(state)
  const [pct, setPct] = useState(0)
  const wager = Math.floor(Math.max(0, team.score) * pct)
  return (
    <Screen center style={eraVars(state.current.gen)}>
      <div className="text-center">
        <p className="font-display text-2xl font-extrabold text-white">⏳ Time Warp wager</p>
        <p className="mt-1 text-sm text-white/60">{team.name}, here’s your final question…</p>
      </div>

      <div className="mt-6 flex justify-center">
        <GenBadge genKey={state.current.gen} category={state.current.category} size="lg" />
      </div>

      <div className="mt-6 rounded-2xl bg-ink-800 p-4 text-center">
        <div className="text-xs uppercase tracking-wider text-white/40">Your score</div>
        <div className="font-display text-4xl font-extrabold text-white">{team.score}</div>
        <div className="mt-2 text-sm text-white/60">
          Base for this one: <span className="font-bold era-accent-text">{state.current.base} pts</span>
        </div>
      </div>

      <p className="mt-6 text-center text-sm font-bold text-white/70">How much do you wager?</p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {WAGER_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPct(p)}
            className={`rounded-2xl px-2 py-4 font-display text-lg font-extrabold transition ${
              pct === p ? 'era-accent-bg text-black' : 'bg-ink-700 text-white/70'
            }`}
          >
            {Math.round(p * 100)}%
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-white/80">
        Wagering <span className="font-display text-2xl font-extrabold era-accent-text">{wager}</span> pts
      </p>

      <div className="mt-6">
        <Btn onClick={() => dispatch({ type: 'COMMIT_WAGER', pct })}>Lock it in →</Btn>
      </div>
    </Screen>
  )
}

// ---- Question (read aloud) --------------------------------------------------
function useCountdown(seconds, active, onExpire) {
  const [left, setLeft] = useState(seconds)
  const cb = useRef(onExpire)
  cb.current = onExpire
  useEffect(() => {
    if (!seconds || !active) return
    setLeft(seconds)
    const iv = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(iv)
          cb.current()
          return 0
        }
        return v - 1
      })
    }, 1000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, active])
  return left
}

export function QuestionScreen({ state, dispatch, onSkip }) {
  const team = currentTeam(state)
  const cur = state.current
  const q = cur.question
  const isWager = cur.roundKind === ROUND_KIND.WAGER
  const points = isWager ? `${cur.base} +${cur.wagerAmount} wager` : `${cur.base} pts`
  const [timerOn, setTimerOn] = useState(false)
  const left = useCountdown(
    state.timerSeconds,
    timerOn && state.phase === 'question',
    () => dispatch({ type: 'TIMEOUT' }),
  )

  return (
    <Screen style={eraVars(cur.gen)}>
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-white/40">
            {roundLabel(state)} · {questionCounter(state)}
          </div>
          <TeamPill team={team} score={team.score} className="mt-1" />
        </div>
        {state.timerSeconds > 0 && timerOn && <TimerRing seconds={left} total={state.timerSeconds} />}
      </div>

      {/* badge + points */}
      <div className="mt-5 flex items-center justify-between">
        <GenBadge genKey={cur.gen} category={cur.category} />
        <span className="rounded-lg bg-ink-800 px-3 py-1.5 font-display text-sm font-extrabold era-accent-text">
          {points}
        </span>
      </div>

      {/* question */}
      <p className="mt-6 text-xs font-bold uppercase tracking-widest text-white/40">
        Read this aloud
      </p>
      <h2 className="mt-2 font-display text-3xl font-bold leading-snug text-white">{q.q}</h2>

      <div className="flex-1" />

      {/* controls */}
      <div className="flex flex-col gap-3">
        {state.timerSeconds > 0 && !timerOn && (
          <Btn variant="outline" onClick={() => setTimerOn(true)}>
            ▶ Start {state.timerSeconds}s timer
          </Btn>
        )}
        <Btn onClick={() => dispatch({ type: 'REVEAL_ANSWER' })}>They’ve answered — reveal</Btn>
        {team.skipsLeft > 0 && (
          <button
            type="button"
            onClick={onSkip}
            className="mx-auto rounded-lg px-3 py-1 text-xs font-bold text-white/50 underline"
          >
            Skip question ({team.skipsLeft} left)
          </button>
        )}
      </div>
    </Screen>
  )
}

// ---- Judge (the room decides) ----------------------------------------------
export function JudgeScreen({ state, dispatch }) {
  const team = currentTeam(state)
  const cur = state.current
  return (
    <Screen style={eraVars(cur.gen)}>
      <div className="mt-2 flex items-center justify-between">
        <GenBadge genKey={cur.gen} category={cur.category} />
        <TeamPill team={team} score={team.score} />
      </div>

      <p className="mt-6 font-display text-lg font-bold leading-snug text-white/80">{cur.question.q}</p>

      <div className="mt-5">
        <AnswerCard question={cur.question} />
      </div>

      <div className="flex-1" />

      <p className="text-center text-sm font-bold text-white/70">
        Did <span className="text-white">{team.name}</span> get it? (Honour system!)
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => dispatch({ type: 'JUDGE', correct: false })}
          className="answer-btn rounded-2xl bg-red-500/90 px-4 py-5 font-display text-lg font-extrabold text-white"
        >
          ❌ Missed it
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'JUDGE', correct: true })}
          className="answer-btn rounded-2xl bg-emerald-500 px-4 py-5 font-display text-lg font-extrabold text-black"
        >
          ✅ Got it
        </button>
      </div>
    </Screen>
  )
}

// ---- Reveal -----------------------------------------------------------------
export function RevealScreen({ state, dispatch }) {
  const cur = state.current
  const team = currentTeam(state)
  const g = genMeta(cur.gen)
  const line = cur.correct
    ? pick(CORRECT_LINES, state.copyIndex)
    : cur.timedOut
      ? pick(TIMEOUT_LINES, state.copyIndex)
      : state.copyIndex % 2 === 0
        ? pick(WRONG_LINES, state.copyIndex)
        : wrongWithGen(g.label)

  return (
    <Screen style={eraVars(cur.gen)}>
      <div className="mt-2 flex items-center justify-between">
        <GenBadge genKey={cur.gen} category={cur.category} />
        <span
          className={`animate-popIn font-display text-2xl font-extrabold ${
            cur.gained > 0 ? 'text-emerald-400' : cur.gained < 0 ? 'text-red-400' : 'text-white/50'
          }`}
        >
          {cur.gained > 0 ? `+${cur.gained}` : cur.gained}
        </span>
      </div>

      <p className="mt-5 font-display text-lg font-bold leading-snug text-white/80">{cur.question.q}</p>
      <div className="mt-4">
        <AnswerCard question={cur.question} />
      </div>

      <p className="mt-5 text-center font-display text-2xl font-extrabold text-white">{line}</p>

      <div className="mt-4 rounded-2xl border p-4 era-accent-border" style={{ background: '#ffffff0a' }}>
        <div className="mb-1 text-xs font-bold uppercase tracking-wider era-accent-text">
          💡 Did you know
        </div>
        <p className="text-[15px] leading-relaxed text-white/90">{cur.question.funFact}</p>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-6">
        {cur.stealAvailable ? (
          <>
            <p className="text-center text-sm font-semibold text-white/70">
              {team.name} missed it — another team can steal for{' '}
              <span className="font-bold era-accent-text">{Math.ceil(cur.base / 2)} pts</span>.
            </p>
            <Btn onClick={() => dispatch({ type: 'OPEN_STEAL' })}>Offer the steal 🖐️</Btn>
            <Btn variant="ghost" onClick={() => dispatch({ type: 'SKIP_STEAL' })}>
              No steal — next
            </Btn>
          </>
        ) : (
          <Btn onClick={() => dispatch({ type: 'ADVANCE' })}>Next →</Btn>
        )}
      </div>
    </Screen>
  )
}

// ---- Steal: pick who's having a go -----------------------------------------
export function StealPick({ state, dispatch }) {
  const others = state.teams.filter((t) => t.id !== state.current.teamId)
  return (
    <Screen center style={eraVars(state.current.gen)}>
      <div className="text-center">
        <div className="text-5xl">🖐️</div>
        <h2 className="mt-3 font-display text-3xl font-extrabold text-white">Steal!</h2>
        <p className="mt-2 text-white/70">Who’s having a go? Pass the phone to whoever called it first.</p>
      </div>
      <div className="mt-8 flex flex-col gap-3">
        {others.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dispatch({ type: 'STEAL_PICK', teamId: t.id })}
            className="answer-btn rounded-2xl px-5 py-4 text-left font-display text-lg font-bold text-white"
            style={{ background: `${t.color}33`, border: `2px solid ${t.color}` }}
          >
            {t.name}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => dispatch({ type: 'SKIP_STEAL' })}
        className="mx-auto mt-6 text-sm font-bold text-white/50 underline"
      >
        Nobody buzzed — skip
      </button>
    </Screen>
  )
}

// ---- Steal: judge the stealing team ----------------------------------------
export function StealJudge({ state, dispatch }) {
  const cur = state.current
  const stealTeam = state.teams.find((t) => t.id === cur.steal.teamId)
  const [revealed, setRevealed] = useState(false)
  return (
    <Screen style={eraVars(cur.gen)}>
      <div className="flex items-center justify-between">
        <TeamPill team={stealTeam} />
        <span className="rounded-lg bg-ink-800 px-3 py-1.5 font-display text-sm font-extrabold era-accent-text">
          Steal · {Math.ceil(cur.base / 2)} pts
        </span>
      </div>
      <div className="mt-5">
        <GenBadge genKey={cur.gen} category={cur.category} />
      </div>
      <h2 className="mt-6 font-display text-2xl font-bold leading-snug text-white">{cur.question.q}</h2>

      <div className="flex-1" />

      {!revealed ? (
        <Btn onClick={() => setRevealed(true)}>{stealTeam.name} answered — reveal</Btn>
      ) : (
        <>
          <AnswerCard question={cur.question} />
          <p className="mt-4 text-center text-sm font-bold text-white/70">
            Did {stealTeam.name} nail it?
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => dispatch({ type: 'STEAL_JUDGE', correct: false })}
              className="answer-btn rounded-2xl bg-red-500/90 px-4 py-5 font-display text-lg font-extrabold text-white"
            >
              ❌ Nope
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'STEAL_JUDGE', correct: true })}
              className="answer-btn rounded-2xl bg-emerald-500 px-4 py-5 font-display text-lg font-extrabold text-black"
            >
              ✅ Nailed it
            </button>
          </div>
        </>
      )}
    </Screen>
  )
}

export function StealReveal({ state, dispatch }) {
  const cur = state.current
  const stealTeam = state.teams.find((t) => t.id === cur.steal.teamId)
  const line = cur.steal.correct
    ? pick(STEAL_WIN_LINES, state.copyIndex)
    : pick(STEAL_MISS_LINES, state.copyIndex)
  return (
    <Screen style={eraVars(cur.gen)}>
      <div className="mt-2 flex items-center justify-between">
        <GenBadge genKey={cur.gen} category={cur.category} />
        <span
          className={`animate-popIn font-display text-2xl font-extrabold ${
            cur.steal.correct ? 'text-emerald-400' : 'text-white/50'
          }`}
        >
          {cur.steal.correct ? `+${cur.steal.gained}` : '+0'}
        </span>
      </div>
      <p className="mt-5 font-display text-lg font-bold leading-snug text-white/80">{cur.question.q}</p>
      <div className="mt-4">
        <AnswerCard question={cur.question} />
      </div>
      <p className="mt-5 text-center font-display text-2xl font-extrabold text-white">
        {stealTeam.name}: {line}
      </p>
      <div className="mt-4 rounded-2xl border p-4 era-accent-border" style={{ background: '#ffffff0a' }}>
        <div className="mb-1 text-xs font-bold uppercase tracking-wider era-accent-text">💡 Did you know</div>
        <p className="text-[15px] leading-relaxed text-white/90">{cur.question.funFact}</p>
      </div>
      <div className="mt-auto pt-6">
        <Btn onClick={() => dispatch({ type: 'ADVANCE' })}>Next →</Btn>
      </div>
    </Screen>
  )
}
