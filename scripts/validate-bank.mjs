// Structural validation of the open-ended question bank.
// Run: node scripts/validate-bank.mjs
import { QUESTION_BANK } from '../src/data/questions/index.js'
import { CATEGORIES, GENERATIONS } from '../src/engine/constants.js'

const catKeys = new Set(CATEGORIES.map((c) => c.key))
const genKeys = new Set(GENERATIONS.map((g) => g.key))
const errors = []
const warnings = []
const ids = new Set()
const texts = new Map()
const cellCounts = {}
const diffCounts = { 1: 0, 2: 0, 3: 0, 4: 0 }

for (const g of genKeys) for (const c of catKeys) cellCounts[`${g}/${c}`] = 0

for (const [i, q] of QUESTION_BANK.entries()) {
  const where = q.id || `index ${i}`
  if (!q.id) errors.push(`${where}: missing id`)
  if (ids.has(q.id)) errors.push(`${where}: duplicate id`)
  ids.add(q.id)

  if (!genKeys.has(q.gen)) errors.push(`${where}: bad gen "${q.gen}"`)
  if (!catKeys.has(q.category)) errors.push(`${where}: bad category "${q.category}"`)
  if (![1, 2, 3, 4].includes(q.difficulty)) errors.push(`${where}: bad difficulty ${q.difficulty}`)
  else diffCounts[q.difficulty]++
  if (typeof q.q !== 'string' || q.q.length < 8) errors.push(`${where}: bad q text`)
  if (typeof q.funFact !== 'string' || q.funFact.length < 8) errors.push(`${where}: bad funFact`)
  if (typeof q.au !== 'boolean') errors.push(`${where}: au must be boolean`)

  if (q.type !== 'open') errors.push(`${where}: type must be "open" (got "${q.type}")`)
  if (typeof q.answer !== 'string' || q.answer.trim().length === 0)
    errors.push(`${where}: answer must be a non-empty string`)
  if (typeof q.answer === 'string' && q.answer.length > 60)
    warnings.push(`${where}: answer is long (${q.answer.length} chars) — should be speakable`)
  if (q.accept !== undefined && !Array.isArray(q.accept))
    errors.push(`${where}: accept must be an array when present`)
  if (q.options) errors.push(`${where}: open questions must not have options`)

  const norm = (q.q || '').toLowerCase().replace(/\s+/g, ' ').trim()
  if (texts.has(norm)) errors.push(`${where}: duplicate question text (also ${texts.get(norm)})`)
  else texts.set(norm, q.id)

  if (genKeys.has(q.gen) && catKeys.has(q.category)) cellCounts[`${q.gen}/${q.category}`]++
}

let minCell = Infinity
for (const [cell, n] of Object.entries(cellCounts)) {
  if (n < minCell) minCell = n
  if (n < 4) errors.push(`cell ${cell}: only ${n} questions (want ≥6)`)
}

const total = QUESTION_BANK.length
const au = QUESTION_BANK.filter((q) => q.au).length
const pct = (n) => `${Math.round((n / total) * 100)}%`

console.log(`Total questions: ${total}`)
console.log(`AU-specific: ${au} (${pct(au)})`)
console.log(
  `Difficulty: d1 ${diffCounts[1]} · d2 ${diffCounts[2]} · d3 ${diffCounts[3]} · d4 ${diffCounts[4]}`,
)
console.log(`Smallest gen×category cell: ${minCell}  ·  Cells: ${Object.keys(cellCounts).length}`)
if (warnings.length) console.log(`\n⚠️  ${warnings.length} warnings (non-fatal):`)
for (const w of warnings.slice(0, 15)) console.log('  - ' + w)

if (errors.length) {
  console.error(`\n❌ ${errors.length} problems:`)
  for (const e of errors.slice(0, 40)) console.error('  - ' + e)
  process.exit(1)
} else {
  console.log('\n✅ Bank is structurally valid.')
}
