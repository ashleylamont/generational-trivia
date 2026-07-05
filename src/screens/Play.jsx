import React, { useEffect, useRef, useState } from 'react'
import { Btn, Screen, GenBadge, TimerRing, DifficultyPips, PlayStatus } from '../ui/components.jsx'
import { genMeta, eraVars } from '../ui/era.js'
import {
  GENERATIONS,
  CATEGORIES,
  CAT_BY_KEY,
  WAGER_PRESETS,
  ROUND_KIND,
  DIFFICULTIES,
} from '../engine/constants.js'
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

// The canonical answer + any accepted variants, styled for the judge.
function AnswerCard({ question }) {
  return (
    <div
      className="rounded-2xl border-2 p-4 text-center era-accent-border"
      style={{ background: '#ffffff0d' }}
    >
      <div className="mb-1 text-xs font-bold uppercase tracking-widest text-white/40">Answer</div>
      <div className="font-display t-answer font-extrabold text-white">{question.answer}</div>
      {question.accept && question.accept.length > 0 && (
        <div className="mt-2 text-sm text-white/60">
          also accept: {question.accept.join(', ')}
        </div>
      )}
    </div>
  )
}

// ---- Handoff (with per-question difficulty pick) ----------------------------
export function Handoff({ state, dispatch, onReady }) {
  const team = currentTeam(state)
  const chosen = state.current?.chosenDifficulty ?? 2
  const subtitle = pick(HANDOFF_SUBTITLES, state.turnPos + state.roundIndex)
  return (
    <div
      className="grid h-[100dvh] w-full place-items-center overflow-y-auto px-6 py-6 text-center"
      style={{ background: `linear-gradient(160deg, ${team.color}cc, ${team.color}55), #0d0f14` }}
    >
      <div className="w-full max-w-xs">
        <div className="text-5xl sm:text-6xl">🎙️</div>
        <p className="mt-3 text-lg font-bold text-white/80">In the hot seat:</p>
        <h1 className="mt-1 font-display t-h1 font-extrabold text-white drop-shadow">{team.name}</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm font-semibold text-white/75">
          Someone else grab the phone and read them the question aloud. {subtitle}
        </p>

        {/* Choose how hard you want this one — harder pays more. */}
        <p className="mt-6 text-xs font-bold uppercase tracking-widest text-white/70">
          Pick your difficulty
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((d) => {
            const on = chosen === d.level
            return (
              <button
                key={d.level}
                type="button"
                onClick={() => dispatch({ type: 'SET_QUESTION_DIFFICULTY', level: d.level })}
                className={`rounded-2xl px-1 py-3 transition ${
                  on ? 'bg-white text-black shadow-lg' : 'bg-black/25 text-white/80'
                }`}
              >
                <div className="text-2xl leading-none">{d.emoji}</div>
                <div className="mt-1 font-display text-sm font-extrabold">{d.label}</div>
                <div className="text-[10px] font-bold opacity-70">
                  {d.bonus ? `+${d.bonus} pts` : 'base pts'}
                </div>
              </button>
            )
          })}
        </div>

        <div className="mx-auto mt-6 w-full">
          <Btn onClick={onReady} style={eraVars(team.homeGens[0])}>
            Read the question
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ---- Horizontal reel spinner (runs before every question, for fun) ----------
const REEL_CELL = 116 // px
const REEL_GAP = 10
const REEL_STEP = REEL_CELL + REEL_GAP

function buildReel(target) {
  const gens = GENERATIONS
  const cats = CATEGORIES
  const rand = () => ({
    gen: gens[Math.floor(Math.random() * gens.length)].key,
    category: cats[Math.floor(Math.random() * cats.length)].key,
  })
  const cells = []
  for (let i = 0; i < 18; i++) cells.push(rand())
  const targetIndex = cells.length
  cells.push({ gen: target.gen, category: target.category })
  for (let i = 0; i < 3; i++) cells.push(rand())
  return { cells, targetIndex }
}

function ReelCell({ cell, active }) {
  const g = genMeta(cell.gen)
  const cat = CAT_BY_KEY[cell.category]
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl transition-transform ${
        active ? 'scale-105' : 'opacity-80'
      }`}
      style={{
        width: REEL_CELL,
        height: REEL_CELL,
        marginRight: REEL_GAP,
        flex: '0 0 auto',
        background: `linear-gradient(135deg, ${g.accent}, ${g.accentSoft})`,
      }}
    >
      <span className="text-3xl leading-none">{g.emoji}</span>
      <span className="mt-1 font-display text-sm font-extrabold text-black">{g.short}</span>
      <span className="mt-0.5 text-[11px] font-bold text-black/70">
        {cat.emoji} {cat.label}
      </span>
    </div>
  )
}

export function Spinner({ state, onDone }) {
  const target = { gen: state.current.gen, category: state.current.category }
  const isLucky = state.current.roundKind === ROUND_KIND.LUCKY
  const containerRef = useRef(null)
  const reelRef = useRef(null)
  if (!reelRef.current) reelRef.current = buildReel(target)
  const { cells, targetIndex } = reelRef.current

  const [tx, setTx] = useState(0)
  const [animate, setAnimate] = useState(false)
  const [landed, setLanded] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    const cw = containerRef.current?.clientWidth ?? 320
    const finalX = cw / 2 - (targetIndex * REEL_STEP + REEL_CELL / 2)
    const startX = cw / 2 - REEL_CELL / 2

    if (reduced) {
      setTx(finalX)
      setLanded(true)
      const t = setTimeout(onDone, 450)
      return () => clearTimeout(t)
    }

    setTx(startX)
    const r1 = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setAnimate(true)
        setTx(finalX)
      }),
    )
    const landT = setTimeout(() => setLanded(true), 1600)
    const doneT = setTimeout(onDone, 2150)
    return () => {
      cancelAnimationFrame(r1)
      clearTimeout(landT)
      clearTimeout(doneT)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const g = genMeta(target.gen)
  const cat = CAT_BY_KEY[target.category]
  return (
    <Screen center style={eraVars(target.gen)}>
      <div className="text-center">
        <p className="mb-6 font-display text-2xl font-extrabold text-white/80">
          {isLucky ? '🎰 Lucky Dip' : 'Spinning up your question…'}
        </p>

        <div ref={containerRef} className="relative h-32 w-full overflow-hidden">
          {/* the reel track */}
          <div
            className="absolute left-0 top-1/2 flex -translate-y-1/2"
            style={{
              transform: `translate(${tx}px, -50%)`,
              transition: animate ? 'transform 1.55s cubic-bezier(0.12, 0.78, 0.12, 1)' : 'none',
            }}
          >
            {cells.map((c, i) => (
              <ReelCell key={i} cell={c} active={landed && i === targetIndex} />
            ))}
          </div>
          {/* centre marker */}
          <div
            className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 era-accent-border"
            style={{ left: '50%', width: REEL_CELL + 8, height: REEL_CELL + 8 }}
          />
          <div
            className="pointer-events-none absolute -translate-x-1/2 era-accent-text"
            style={{ left: '50%', top: 2 }}
          >
            ▼
          </div>
          {/* edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[var(--era-ink)] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[var(--era-ink)] to-transparent" />
        </div>

        <p
          className={`mt-6 font-display text-xl font-extrabold text-white ${
            landed ? 'animate-flyUp' : 'opacity-0'
          }`}
        >
          {g.emoji} {g.short} · {cat.emoji} {cat.label}
        </p>
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
      <PlayStatus state={state} roundName={ROUND_NAMES[cur.roundKind]} />

      {/* badge + timer + points + difficulty */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <GenBadge genKey={cur.gen} category={cur.category} />
        <div className="flex items-center gap-2">
          {state.timerSeconds > 0 && timerOn && (
            <TimerRing seconds={left} total={state.timerSeconds} />
          )}
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-lg bg-ink-800 px-3 py-1.5 font-display text-sm font-extrabold era-accent-text">
              {points}
            </span>
            <DifficultyPips difficulty={q.difficulty} />
          </div>
        </div>
      </div>

      {/* question */}
      <p className="mt-5 text-xs font-bold uppercase tracking-widest text-white/40">
        Read this aloud
      </p>
      <h2 className="mt-2 font-display t-question font-bold text-white">{q.q}</h2>

      <div className="min-h-4 flex-1" />

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
      <PlayStatus state={state} roundName={ROUND_NAMES[cur.roundKind]} />

      <div className="mt-4">
        <GenBadge genKey={cur.gen} category={cur.category} />
      </div>

      <p className="mt-4 font-display text-lg font-bold leading-snug text-white/80">{cur.question.q}</p>

      <div className="mt-4">
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
          className="answer-btn rounded-2xl bg-red-500/90 px-4 py-4 font-display text-lg font-extrabold text-white"
        >
          ❌ Missed it
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'JUDGE', correct: true })}
          className="answer-btn rounded-2xl bg-emerald-500 px-4 py-4 font-display text-lg font-extrabold text-black"
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
      <PlayStatus state={state} roundName={ROUND_NAMES[cur.roundKind]} />
      <div className="mt-3 flex items-center justify-between">
        <GenBadge genKey={cur.gen} category={cur.category} />
        <span
          className={`animate-popIn font-display text-2xl font-extrabold ${
            cur.gained > 0 ? 'text-emerald-400' : cur.gained < 0 ? 'text-red-400' : 'text-white/50'
          }`}
        >
          {cur.gained > 0 ? `+${cur.gained}` : cur.gained}
        </span>
      </div>

      <p className="mt-3 font-display text-base font-bold leading-snug text-white/80">{cur.question.q}</p>
      <div className="mt-3">
        <AnswerCard question={cur.question} />
      </div>

      <p className="mt-4 text-center font-display text-xl font-extrabold text-white">{line}</p>

      <div className="mt-3 rounded-2xl border p-4 era-accent-border" style={{ background: '#ffffff0a' }}>
        <div className="mb-1 text-xs font-bold uppercase tracking-wider era-accent-text">
          💡 Did you know
        </div>
        <p className="text-[15px] leading-relaxed text-white/90">{cur.question.funFact}</p>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-4">
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
      <PlayStatus state={state} roundName={ROUND_NAMES[cur.roundKind]} currentId={cur.steal.teamId} />
      <div className="mt-3 flex items-center justify-between">
        <span className="font-display text-sm font-bold text-white/80">
          {stealTeam.name} is stealing
        </span>
        <span className="rounded-lg bg-ink-800 px-3 py-1.5 font-display text-sm font-extrabold era-accent-text">
          Steal · {Math.ceil(cur.base / 2)} pts
        </span>
      </div>
      <div className="mt-4">
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
              className="answer-btn rounded-2xl bg-red-500/90 px-4 py-4 font-display text-lg font-extrabold text-white"
            >
              ❌ Nope
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'STEAL_JUDGE', correct: true })}
              className="answer-btn rounded-2xl bg-emerald-500 px-4 py-4 font-display text-lg font-extrabold text-black"
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
      <PlayStatus state={state} roundName={ROUND_NAMES[cur.roundKind]} currentId={cur.steal.teamId} />
      <div className="mt-3 flex items-center justify-between">
        <GenBadge genKey={cur.gen} category={cur.category} />
        <span
          className={`animate-popIn font-display text-2xl font-extrabold ${
            cur.steal.correct ? 'text-emerald-400' : 'text-white/50'
          }`}
        >
          {cur.steal.correct ? `+${cur.steal.gained}` : '+0'}
        </span>
      </div>
      <p className="mt-4 font-display text-base font-bold leading-snug text-white/80">{cur.question.q}</p>
      <div className="mt-3">
        <AnswerCard question={cur.question} />
      </div>
      <p className="mt-4 text-center font-display text-xl font-extrabold text-white">
        {stealTeam.name}: {line}
      </p>
      <div className="mt-3 rounded-2xl border p-4 era-accent-border" style={{ background: '#ffffff0a' }}>
        <div className="mb-1 text-xs font-bold uppercase tracking-wider era-accent-text">💡 Did you know</div>
        <p className="text-[15px] leading-relaxed text-white/90">{cur.question.funFact}</p>
      </div>
      <div className="mt-auto pt-6">
        <Btn onClick={() => dispatch({ type: 'ADVANCE' })}>Next →</Btn>
      </div>
    </Screen>
  )
}
