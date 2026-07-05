import React from 'react'
import { genMeta } from './era.js'
import { CAT_BY_KEY } from '../engine/constants.js'

// ---- Buttons ----------------------------------------------------------------
export function Btn({ children, onClick, variant = 'primary', className = '', disabled, ...rest }) {
  const base =
    'answer-btn w-full rounded-2xl px-5 py-3 font-display font-bold text-lg tracking-wide transition select-none disabled:opacity-40'
  const variants = {
    primary: 'era-accent-bg text-black shadow-lg shadow-black/40 active:brightness-95',
    ghost: 'bg-ink-700 text-white border border-ink-500 hover:border-ink-400',
    outline: 'bg-transparent text-white border-2 era-accent-border',
    danger: 'bg-red-500/90 text-white',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

// ---- Generation badge — the signature element -------------------------------
export function GenBadge({ genKey, category, size = 'md' }) {
  const g = genMeta(genKey)
  const cat = category ? CAT_BY_KEY[category] : null
  if (!g) return null
  const pad = size === 'lg' ? 'px-4 py-2 text-base' : 'px-3 py-1.5 text-sm'
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl font-display font-bold ${pad}`}
      style={{
        background: `linear-gradient(135deg, ${g.accent}, ${g.accentSoft})`,
        color: '#111',
        boxShadow: `0 2px 0 ${g.accentSoft}, 0 6px 16px rgba(0,0,0,0.45)`,
      }}
    >
      <span className="text-lg leading-none">{g.emoji}</span>
      <span className="leading-none">
        {g.short} era{cat ? <span className="opacity-70"> · {cat.emoji} {cat.label}</span> : null}
      </span>
    </div>
  )
}

// ---- Team pill --------------------------------------------------------------
export function TeamPill({ team, score, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${className}`}
      style={{ background: `${team.color}22`, border: `1px solid ${team.color}` }}
    >
      <span className="h-3 w-3 rounded-full" style={{ background: team.color }} />
      <span className="text-white">{team.name}</span>
      {score !== undefined && <span className="tabular-nums opacity-80">{score}</span>}
    </span>
  )
}

// ---- Leaderboard ------------------------------------------------------------
export function Leaderboard({ teams, deltas, highlightId }) {
  const sorted = [...teams].sort((a, b) => b.score - a.score)
  return (
    <div className="flex flex-col gap-2">
      {sorted.map((t, i) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
            t.id === highlightId ? 'ring-2 ring-white/60' : ''
          }`}
          style={{ background: `${t.color}1f`, border: `1px solid ${t.color}66` }}
        >
          <span className="w-6 text-center font-display text-lg font-extrabold text-white/70">
            {i + 1}
          </span>
          <span className="h-4 w-4 rounded-full" style={{ background: t.color }} />
          <span className="flex-1 truncate font-bold text-white">{t.name}</span>
          {deltas && deltas[t.id] !== undefined && deltas[t.id] !== 0 && (
            <span className="text-sm font-bold text-emerald-300">+{deltas[t.id]}</span>
          )}
          <span className="w-14 text-right font-display text-2xl font-extrabold tabular-nums text-white">
            {t.score}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---- Timer ring -------------------------------------------------------------
export function TimerRing({ seconds, total }) {
  if (!total) return null
  const r = 26
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, seconds / total))
  const danger = seconds <= 5
  return (
    <div className="relative h-16 w-16" aria-label={`${seconds} seconds left`}>
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#ffffff20" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={danger ? '#ef4444' : 'var(--era-accent)'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <span
        className={`absolute inset-0 grid place-items-center font-display text-xl font-extrabold ${
          danger ? 'text-red-400' : 'text-white'
        }`}
      >
        {seconds}
      </span>
    </div>
  )
}

// ---- Screen shell — sets the era wash + safe-area padding -------------------
export function Screen({ children, style, className = '', center = false }) {
  return (
    <div
      className={`era-wash min-h-full w-full ${className}`}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', ...style }}
    >
      <div
        className={`mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-5 ${
          center ? 'justify-center' : ''
        }`}
      >
        {children}
      </div>
    </div>
  )
}
