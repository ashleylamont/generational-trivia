// Compute end-of-game awards from the per-question log. Returns up to 4 awards
// that genuinely apply, each { key, emoji, title, teamId, detail }.

function byTeam(log) {
  const map = new Map()
  for (const e of log) {
    if (!map.has(e.team)) map.set(e.team, [])
    map.get(e.team).push(e)
  }
  return map
}

export function computeAwards(state) {
  const { log, teams } = state
  const teamName = (id) => teams.find((t) => t.id === id)?.name ?? '—'
  const perTeam = byTeam(log)
  const candidates = []

  // 🧠 Time Traveller — best correct-rate on distance ≥2 (min 3 attempts).
  {
    let best = null
    for (const [team, entries] of perTeam) {
      const far = entries.filter((e) => e.distance >= 2 && !e.steal)
      if (far.length < 3) continue
      const rate = far.filter((e) => e.correct).length / far.length
      if (!best || rate > best.rate) best = { team, rate, n: far.length }
    }
    if (best && best.rate > 0) {
      candidates.push({
        key: 'time_traveller',
        emoji: '🧠',
        title: 'Time Traveller',
        teamId: best.team,
        detail: `${Math.round(best.rate * 100)}% right on far-flung eras`,
        weight: 5,
      })
    }
  }

  // 🏠 Stuck in Their Era — great at home, poor away, with a large gap.
  {
    let best = null
    for (const [team, entries] of perTeam) {
      const home = entries.filter((e) => e.distance === 0 && !e.steal)
      const away = entries.filter((e) => e.distance >= 1 && !e.steal)
      if (home.length < 2 || away.length < 2) continue
      const homeRate = home.filter((e) => e.correct).length / home.length
      const awayRate = away.filter((e) => e.correct).length / away.length
      const gap = homeRate - awayRate
      if (gap >= 0.4 && (!best || gap > best.gap)) best = { team, gap, homeRate, awayRate }
    }
    if (best) {
      candidates.push({
        key: 'stuck',
        emoji: '🏠',
        title: 'Stuck in Their Era',
        teamId: best.team,
        detail: `Aces at home, lost in other decades`,
        weight: 3,
      })
    }
  }

  // 🦘 Have a Go, Ya Mug — most steal attempts.
  {
    const counts = new Map()
    for (const e of log) if (e.steal) counts.set(e.team, (counts.get(e.team) || 0) + 1)
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    if (top && top[1] >= 2) {
      candidates.push({
        key: 'have_a_go',
        emoji: '🦘',
        title: 'Have a Go, Ya Mug',
        teamId: top[0],
        detail: `${top[1]} steal attempts`,
        weight: 2,
      })
    }
  }

  // 🥷 Steal Merchant — most successful steals.
  {
    const counts = new Map()
    for (const e of log) if (e.steal && e.correct) counts.set(e.team, (counts.get(e.team) || 0) + 1)
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    if (top && top[1] >= 1) {
      candidates.push({
        key: 'steal_merchant',
        emoji: '🥷',
        title: 'Steal Merchant',
        teamId: top[0],
        detail: `${top[1]} successful ${top[1] === 1 ? 'steal' : 'steals'}`,
        weight: 4,
      })
    }
  }

  // 📉 Confidently Incorrect — biggest single wager lost.
  {
    let worst = null
    for (const e of log) {
      if (e.roundKind === 'wager' && !e.correct && e.wager > 0) {
        if (!worst || e.wager > worst.wager) worst = e
      }
    }
    if (worst) {
      candidates.push({
        key: 'confidently_incorrect',
        emoji: '📉',
        title: 'Confidently Incorrect',
        teamId: worst.team,
        detail: `Dropped ${worst.wager} pts on one wager`,
        weight: 4,
      })
    }
  }

  // 🎰 High Roller — biggest single wager won.
  {
    let best = null
    for (const e of log) {
      if (e.roundKind === 'wager' && e.correct && e.wager > 0) {
        if (!best || e.wager > best.wager) best = e
      }
    }
    if (best) {
      candidates.push({
        key: 'high_roller',
        emoji: '🎰',
        title: 'High Roller',
        teamId: best.team,
        detail: `Banked a ${best.wager}-pt wager`,
        weight: 4,
      })
    }
  }

  // Show the 2–4 most interesting that apply.
  candidates.sort((a, b) => b.weight - a.weight)
  return candidates.slice(0, 4).map((a) => ({ ...a, teamName: teamName(a.teamId) }))
}
