import React from 'react'
import { Btn, Screen, GenBadge } from '../ui/components.jsx'
import {
  GENERATIONS,
  CATEGORIES,
  GAME_LENGTHS,
  TIMER_OPTIONS,
  DEFAULT_TEAM_NAMES,
  DIFFICULTIES,
} from '../engine/constants.js'

export function TitleScreen({ onNew }) {
  return (
    <Screen center style={{ '--era-accent': '#f59e0b', '--era-accent-soft': '#b45309' }}>
      <div className="text-center">
        <div className="mb-2 flex justify-center gap-1 text-4xl">
          <span>📻</span>
          <span>📼</span>
          <span>💾</span>
          <span>📱</span>
          <span>🎮</span>
        </div>
        <h1 className="font-display t-hero font-extrabold text-white">
          Era<span className="era-accent-text">Clash</span>
        </h1>
        <p className="mt-3 text-lg text-white/70">
          The multigenerational Aussie family quiz.
        </p>
        <p className="mx-auto mt-2 max-w-xs text-sm text-white/50">
          Score more for knowing eras that aren’t yours. Grandad defining “rizz” is worth big points.
        </p>
      </div>
      <div className="mt-10 flex flex-col gap-3">
        <Btn onClick={onNew}>New game</Btn>
      </div>
      <p className="mt-8 text-center text-xs text-white/40">
        One phone · pass &amp; play · no internet needed
      </p>
    </Screen>
  )
}

export function TeamSetup({ state, dispatch, onNext }) {
  const canAdd = state.teams.length < 4
  const canRemove = state.teams.length > 2
  return (
    <Screen style={{ '--era-accent': '#f59e0b', '--era-accent-soft': '#b45309' }}>
      <Header title="Who’s playing?" step="1 / 2" />
      <p className="mb-3 shrink-0 text-sm text-white/60">
        Pick each team’s home eras — the generations your players actually come from. You score more
        for questions <em>outside</em> your eras.
      </p>

      {/* Team list scrolls on its own; the buttons below stay pinned. */}
      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 pb-1">
        {state.teams.map((team, idx) => (
          <div
            key={team.id}
            className="shrink-0 rounded-2xl bg-ink-800 p-3.5"
            style={{ borderLeft: `6px solid ${team.color}` }}
          >
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                aria-label="Change colour"
                onClick={() => dispatch({ type: 'CYCLE_COLOR', teamId: team.id })}
                className="h-8 w-8 shrink-0 rounded-full border-2 border-white/30"
                style={{ background: team.color }}
              />
              <input
                value={team.name}
                onChange={(e) => dispatch({ type: 'RENAME_TEAM', teamId: team.id, name: e.target.value })}
                className="min-w-0 flex-1 rounded-xl bg-ink-700 px-3 py-2 text-lg font-bold text-white outline-none focus:ring-2 focus:ring-white/30"
                maxLength={22}
                aria-label={`Team ${idx + 1} name`}
              />
              <button
                type="button"
                aria-label="Surprise name"
                title="Surprise me"
                onClick={() =>
                  dispatch({
                    type: 'RENAME_TEAM',
                    teamId: team.id,
                    name: DEFAULT_TEAM_NAMES[Math.floor(Math.random() * DEFAULT_TEAM_NAMES.length)],
                  })
                }
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-700 text-lg"
              >
                🎲
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {GENERATIONS.map((g) => {
                const on = team.homeGens.includes(g.key)
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => dispatch({ type: 'TOGGLE_GEN', teamId: team.id, gen: g.key })}
                    className={`flex items-center gap-1 rounded-xl px-2.5 py-2 text-sm font-bold transition ${
                      on ? 'text-black' : 'bg-ink-700 text-white/60'
                    }`}
                    style={on ? { background: g.accent } : undefined}
                  >
                    <span>{g.emoji}</span>
                    <span>{g.short}</span>
                  </button>
                )
              })}
            </div>

            {/* Default difficulty — teams can still change it before each question. */}
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                  Default difficulty
                </span>
                <span className="text-[11px] text-white/45">harder = more points</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {DIFFICULTIES.map((d) => {
                  const on = team.defaultDifficulty === d.level
                  return (
                    <button
                      key={d.level}
                      type="button"
                      onClick={() =>
                        dispatch({ type: 'SET_DEFAULT_DIFFICULTY', teamId: team.id, level: d.level })
                      }
                      className={`flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-sm font-bold transition ${
                        on ? 'era-accent-bg text-black' : 'bg-ink-700 text-white/60'
                      }`}
                    >
                      <span>{d.emoji}</span>
                      <span>{d.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {canRemove && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'REMOVE_TEAM', teamId: team.id })}
                className="mt-3 text-xs font-bold text-red-300/80"
              >
                Remove team
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex shrink-0 flex-col gap-2">
        {canAdd && (
          <Btn variant="ghost" onClick={() => dispatch({ type: 'ADD_TEAM' })}>
            + Add team
          </Btn>
        )}
        <Btn onClick={onNext}>Next →</Btn>
      </div>
    </Screen>
  )
}

export function OptionsSetup({ state, dispatch, onBack, onStart }) {
  return (
    <Screen style={{ '--era-accent': '#f59e0b', '--era-accent-soft': '#b45309' }}>
      <Header title="Game options" step="2 / 2" />

      <div className="-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1">
      <Section label="Length">
        <div className="grid grid-cols-3 gap-2">
          {Object.values(GAME_LENGTHS).map((l) => (
            <Toggle
              key={l.key}
              active={state.lengthKey === l.key}
              onClick={() => dispatch({ type: 'SET_LENGTH', key: l.key })}
            >
              <div className="font-display text-base">{l.label}</div>
              <div className="text-[11px] opacity-70">{l.blurb}</div>
            </Toggle>
          ))}
        </div>
      </Section>

      <Section label="Timer">
        <div className="grid grid-cols-4 gap-2">
          {Object.values(TIMER_OPTIONS).map((t) => (
            <Toggle
              key={t.key}
              active={state.timerKey === t.key}
              onClick={() => dispatch({ type: 'SET_TIMER', key: t.key })}
            >
              <div className="font-display text-sm">{t.label}</div>
              <div className="text-[11px] opacity-70">{t.seconds ? `${t.seconds}s` : '∞'}</div>
            </Toggle>
          ))}
        </div>
      </Section>

      <Section label="Spin-up animation">
        <div className="grid grid-cols-2 gap-2">
          <Toggle active={state.spinnerOn} onClick={() => !state.spinnerOn && dispatch({ type: 'TOGGLE_SPINNER' })}>
            <div className="font-display text-sm">🎰 On</div>
            <div className="text-[11px] opacity-70">reel before each Q</div>
          </Toggle>
          <Toggle active={!state.spinnerOn} onClick={() => state.spinnerOn && dispatch({ type: 'TOGGLE_SPINNER' })}>
            <div className="font-display text-sm">Off</div>
            <div className="text-[11px] opacity-70">straight to the question</div>
          </Toggle>
        </div>
      </Section>

      <Section label={`Categories (${state.enabledCategories.length} on · min 3)`}>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const on = state.enabledCategories.includes(c.key)
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => dispatch({ type: 'TOGGLE_CATEGORY', key: c.key })}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition ${
                  on ? 'era-accent-bg text-black' : 'bg-ink-700 text-white/50'
                }`}
              >
                <span>{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            )
          })}
        </div>
      </Section>
      </div>

      <div className="mt-3 flex shrink-0 gap-3">
        <Btn variant="ghost" className="flex-1" onClick={onBack}>
          ← Back
        </Btn>
        <Btn className="flex-[2]" onClick={onStart}>
          Start game
        </Btn>
      </div>
    </Screen>
  )
}

// ---- little helpers ---------------------------------------------------------
function Header({ title, step }) {
  return (
    <div className="mb-3 flex shrink-0 items-baseline justify-between">
      <h2 className="font-display t-h2 font-extrabold text-white">{title}</h2>
      <span className="text-sm font-bold text-white/40">{step}</span>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/40">{label}</div>
      {children}
    </div>
  )
}

function Toggle({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-2 py-3 text-center transition ${
        active ? 'era-accent-bg text-black' : 'bg-ink-700 text-white/70'
      }`}
    >
      {children}
    </button>
  )
}
