import React from 'react'
import { Btn, Screen, Leaderboard, GenBadge, TeamPill } from '../ui/components.jsx'
import { eraVars, genMeta } from '../ui/era.js'
import { ROUND_KIND } from '../engine/constants.js'
import { leaderboard, roundKindForIndex } from '../engine/reducer.js'
import { banterForStandings } from '../engine/copy.js'
import { computeAwards } from '../engine/awards.js'

const ROUND_INTRO = {
  [ROUND_KIND.HOME]: {
    name: 'Home Turf',
    emoji: '🏠',
    blurb: 'Questions from your own eras. Warm up — and see what you’ve forgotten about your own decade.',
    scoring: 'Flat 10 points each.',
  },
  [ROUND_KIND.SWAP]: {
    name: 'Gen Swap',
    emoji: '🔀',
    blurb: 'Questions from eras that aren’t yours. The further from home, the more it’s worth.',
    scoring: '10 + 5 × distance (up to 30).',
  },
  [ROUND_KIND.LUCKY]: {
    name: 'Lucky Dip',
    emoji: '🎰',
    blurb: 'Spin the wheel — a random era and category each time. Anything goes.',
    scoring: 'Points scale with how far the era is from home.',
  },
  [ROUND_KIND.WAGER]: {
    name: 'Time Warp Wager',
    emoji: '⏳',
    blurb: 'See the era and category up front, place your wager, then answer. Nerve required.',
    scoring: 'Win or lose your wager on top of the base.',
  },
}

export function RoundIntro({ state, dispatch }) {
  const kind = roundKindForIndex(state.roundIndex)
  const info = ROUND_INTRO[kind]
  const classicFinale = state.lengthKey === 'classic' && state.roundIndex === 2
  return (
    <Screen center style={{ '--era-accent': '#f59e0b', '--era-accent-soft': '#b45309' }}>
      <div className="text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-white/40">
          Round {state.roundIndex + 1} of {state.numRounds}
        </div>
        <div className="mt-4 text-6xl">{info.emoji}</div>
        <h1 className="mt-3 font-display text-5xl font-extrabold text-white">{info.name}</h1>
        <p className="mx-auto mt-4 max-w-xs text-white/70">{info.blurb}</p>
        <div className="mx-auto mt-4 inline-block rounded-xl bg-ink-800 px-4 py-2 text-sm font-bold era-accent-text">
          {info.scoring}
        </div>
        {classicFinale && (
          <p className="mt-4 text-sm font-semibold text-amber-300/80">
            ⏳ Final question of the round is a Time Warp wager!
          </p>
        )}
      </div>
      <div className="mt-10">
        <Btn onClick={() => dispatch({ type: 'BEGIN_TURN' })}>Let’s go</Btn>
      </div>
    </Screen>
  )
}

export function RoundSummary({ state, dispatch }) {
  const sorted = leaderboard(state)
  const deltas = Object.fromEntries(
    state.teams.map((t) => [t.id, t.score - (state.roundStartScores[t.id] ?? 0)]),
  )
  const isLast = state.roundIndex + 1 >= state.numRounds
  return (
    <Screen style={{ '--era-accent': '#f59e0b', '--era-accent-soft': '#b45309' }}>
      <div className="mb-1 text-center text-xs font-bold uppercase tracking-widest text-white/40">
        End of Round {state.roundIndex + 1}
      </div>
      <h1 className="mb-5 text-center font-display text-4xl font-extrabold text-white">Standings</h1>
      <Leaderboard teams={state.teams} deltas={deltas} />
      <div className="mt-5 rounded-2xl bg-ink-800 p-4 text-center">
        <p className="font-display text-lg font-bold text-white/90">{banterForStandings(sorted)}</p>
      </div>
      <div className="mt-auto pt-6">
        <Btn onClick={() => dispatch({ type: 'END_ROUND_CONTINUE' })}>
          {isLast ? 'To the finish 🏁' : 'Next round →'}
        </Btn>
      </div>
    </Screen>
  )
}

// ---- Final results ----------------------------------------------------------
function Podium({ teams, winners }) {
  const sorted = [...teams].sort((a, b) => b.score - a.score).slice(0, 3)
  // order for display: 2nd, 1st, 3rd
  const order = [sorted[1], sorted[0], sorted[2]].filter(Boolean)
  // Keyed by finishing rank (0 = winner): tallest bar + gold for 1st.
  const heights = { 0: 'h-28', 1: 'h-20', 2: 'h-16' }
  const medals = { 0: '🥇', 1: '🥈', 2: '🥉' }
  const rankOf = (t) => sorted.indexOf(t)
  return (
    <div className="flex items-end justify-center gap-2">
      {order.map((t, i) => {
        const rank = rankOf(t)
        return (
          <div key={t.id} className="flex w-24 flex-col items-center">
            <div className="mb-1 text-3xl">{medals[rank]}</div>
            <div className="mb-1 max-w-full truncate text-center text-xs font-bold text-white">
              {t.name}
            </div>
            <div
              className={`flex w-full ${heights[rank]} items-start justify-center rounded-t-xl pt-2 font-display text-2xl font-extrabold text-black animate-riseUp`}
              style={{ background: t.color }}
            >
              {t.score}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function FinalResults({ state, dispatch }) {
  const winners = state.winners.length
    ? state.winners
    : [leaderboard(state)[0]?.id].filter(Boolean)
  const awards = computeAwards(state)
  const winnerTeams = state.teams.filter((t) => winners.includes(t.id))
  const joint = winnerTeams.length > 1
  return (
    <Screen style={{ '--era-accent': '#f59e0b', '--era-accent-soft': '#b45309' }}>
      <div className="text-center">
        <div className="text-5xl">🏆</div>
        <h1 className="mt-2 font-display text-4xl font-extrabold text-white">
          {joint ? 'Joint winners!' : 'Winner!'}
        </h1>
        <p className="mt-1 font-display text-2xl font-extrabold era-accent-text">
          {winnerTeams.map((t) => t.name).join(' & ')}
        </p>
      </div>

      <div className="mt-6">
        <Podium teams={state.teams} winners={winners} />
      </div>

      {awards.length > 0 && (
        <div className="mt-7">
          <div className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-white/40">
            Awards
          </div>
          <div className="flex flex-col gap-2">
            {awards.map((a) => (
              <div key={a.key} className="flex items-center gap-3 rounded-2xl bg-ink-800 px-4 py-3">
                <span className="text-2xl">{a.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base font-bold text-white">{a.title}</div>
                  <div className="truncate text-xs text-white/60">{a.detail}</div>
                </div>
                <span className="shrink-0 text-sm font-bold text-white/80">{a.teamName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex gap-3 pt-6">
        <Btn variant="ghost" className="flex-1" onClick={() => dispatch({ type: 'NEW_GAME' })}>
          New game
        </Btn>
        <Btn className="flex-1" onClick={() => dispatch({ type: 'REMATCH' })}>
          Rematch
        </Btn>
      </div>
    </Screen>
  )
}

// ---- Tiebreak ---------------------------------------------------------------
export function TiebreakIntro({ state, dispatch }) {
  const tied = state.teams.filter((t) => state.tiebreak.teamIds.includes(t.id))
  const g = genMeta(state.tiebreak.gen)
  return (
    <Screen center style={eraVars(state.tiebreak.gen)}>
      <div className="text-center">
        <div className="text-6xl">⚔️</div>
        <h1 className="mt-3 font-display text-4xl font-extrabold text-white">Sudden death!</h1>
        <p className="mt-2 text-white/70">It’s a dead heat between:</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {tied.map((t) => (
            <TeamPill key={t.id} team={t} score={t.score} />
          ))}
        </div>
        <p className="mt-5 text-sm text-white/60">
          One question each from the era furthest from everyone — {g.emoji} {g.short}. First team to
          be the <em>only</em> one correct wins.
        </p>
      </div>
      <div className="mt-8">
        <Btn onClick={() => dispatch({ type: 'TIEBREAK_BEGIN' })}>Bring it on</Btn>
      </div>
    </Screen>
  )
}

export function TiebreakHandoff({ state, onReady }) {
  const tb = state.tiebreak
  const team = state.teams.find((t) => t.id === tb.teamIds[tb.pos])
  return (
    <div
      className="grid min-h-full w-full place-items-center px-6 text-center"
      style={{ background: `linear-gradient(160deg, ${team.color}cc, ${team.color}55), #0d0f14` }}
    >
      <div>
        <div className="text-5xl">⚔️</div>
        <p className="mt-3 text-lg font-bold text-white/80">Sudden death · pass to</p>
        <h1 className="mt-1 font-display text-5xl font-extrabold text-white">{team.name}</h1>
        <div className="mt-8 w-64">
          <Btn onClick={onReady} style={eraVars(tb.gen)}>
            We’re ready
          </Btn>
        </div>
      </div>
    </div>
  )
}

export function TiebreakQuestion({ state, dispatch }) {
  const tb = state.tiebreak
  const q = tb.question
  const team = state.teams.find((t) => t.id === tb.teamIds[tb.pos])
  return (
    <Screen style={eraVars(tb.gen)}>
      <div className="flex items-center justify-between">
        <TeamPill team={team} />
        <span className="font-display text-sm font-extrabold era-accent-text">Sudden death</span>
      </div>
      <div className="mt-5">
        <GenBadge genKey={tb.gen} category={q.category} />
      </div>
      <h2 className="mt-6 font-display text-2xl font-bold leading-snug text-white">{q.q}</h2>
      <div className="mt-6 flex flex-col gap-3">
        {q.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => dispatch({ type: 'TIEBREAK_ANSWER', index: i })}
            className="answer-btn rounded-2xl border border-ink-500 bg-ink-700 px-4 py-4 text-left text-lg font-bold text-white"
          >
            <span className="mr-2 opacity-50">{String.fromCharCode(65 + i)}</span>
            {opt}
          </button>
        ))}
      </div>
    </Screen>
  )
}

export function TiebreakReveal({ state, dispatch }) {
  const tb = state.tiebreak
  const resolved = state.winners.length > 0
  return (
    <Screen center style={eraVars(tb.gen)}>
      <div className="text-center">
        {resolved ? (
          <>
            <div className="text-5xl">🎉</div>
            <h1 className="mt-3 font-display text-3xl font-extrabold text-white">We have a result!</h1>
          </>
        ) : (
          <>
            <div className="text-5xl">😮‍💨</div>
            <h1 className="mt-3 font-display text-3xl font-extrabold text-white">Still tied!</h1>
            <p className="mt-2 text-white/70">
              No sole winner that round{tb.round >= 5 ? ' — and we’ve hit the cap.' : '. Go again.'}
            </p>
          </>
        )}
      </div>
      <div className="mt-8">
        <Btn onClick={() => dispatch({ type: 'TIEBREAK_CONTINUE' })}>
          {resolved ? 'See the podium 🏆' : 'Next sudden-death question'}
        </Btn>
      </div>
    </Screen>
  )
}
