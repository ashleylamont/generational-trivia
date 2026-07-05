// Small deterministic RNG so games are reproducible in tests and the shuffle is
// controllable. mulberry32 is tiny, fast and good enough for shuffling a quiz.

export function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A real-play seed. Kept out of the reducer so the reducer stays pure.
export function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0
}

// Fisher–Yates using the supplied rng; returns a new array.
export function shuffle(arr, rng) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Weighted pick: items is [{ weight, value }]; returns a value. Falls back to
// the last item if weights are degenerate.
export function weightedPick(items, rng) {
  const total = items.reduce((s, it) => s + Math.max(0, it.weight), 0)
  if (total <= 0) return items.length ? items[items.length - 1].value : undefined
  let r = rng() * total
  for (const it of items) {
    r -= Math.max(0, it.weight)
    if (r < 0) return it.value
  }
  return items[items.length - 1].value
}

// Pick one element uniformly.
export function pickOne(arr, rng) {
  return arr[Math.floor(rng() * arr.length)]
}
