// Structural validation of the question bank. Run: node scripts/validate-bank.mjs
import { QUESTION_BANK } from '../src/data/questions/index.js'
import { CATEGORIES, GENERATIONS } from '../src/engine/constants.js'

const catKeys = new Set(CATEGORIES.map((c) => c.key))
const genKeys = new Set(GENERATIONS.map((g) => g.key))
const errors = []
const ids = new Set()
const texts = new Map()
const cellCounts = {}

for (const g of genKeys) for (const c of catKeys) cellCounts[`${g}/${c}`] = 0

for (const [i, q] of QUESTION_BANK.entries()) {
  const where = q.id || `index ${i}`
  if (!q.id) errors.push(`${where}: missing id`)
  if (ids.has(q.id)) errors.push(`${where}: duplicate id`)
  ids.add(q.id)

  if (!genKeys.has(q.gen)) errors.push(`${where}: bad gen "${q.gen}"`)
  if (!catKeys.has(q.category)) errors.push(`${where}: bad category "${q.category}"`)
  if (![1, 2, 3].includes(q.difficulty)) errors.push(`${where}: bad difficulty ${q.difficulty}`)
  if (typeof q.q !== 'string' || q.q.length < 8) errors.push(`${where}: bad q text`)
  if (typeof q.funFact !== 'string' || q.funFact.length < 8) errors.push(`${where}: bad funFact`)
  if (typeof q.au !== 'boolean') errors.push(`${where}: au must be boolean`)

  if (q.type === 'mcq') {
    if (!Array.isArray(q.options) || q.options.length !== 4)
      errors.push(`${where}: mcq needs exactly 4 options`)
    if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3)
      errors.push(`${where}: mcq answer index out of range (${q.answer})`)
    if (Array.isArray(q.options) && new Set(q.options).size !== q.options.length)
      errors.push(`${where}: duplicate option text`)
  } else if (q.type === 'tf') {
    if (q.options) errors.push(`${where}: tf must omit options`)
    if (typeof q.answer !== 'boolean') errors.push(`${where}: tf answer must be boolean`)
  } else {
    errors.push(`${where}: bad type "${q.type}"`)
  }

  const norm = (q.q || '').toLowerCase().replace(/\s+/g, ' ').trim()
  if (texts.has(norm)) errors.push(`${where}: duplicate question text (also ${texts.get(norm)})`)
  else texts.set(norm, q.id)

  if (genKeys.has(q.gen) && catKeys.has(q.category)) cellCounts[`${q.gen}/${q.category}`]++
}

// Per-cell coverage report.
let minCell = Infinity
for (const [cell, n] of Object.entries(cellCounts)) {
  if (n < minCell) minCell = n
  if (n < 4) errors.push(`cell ${cell}: only ${n} questions (want ≥6)`)
}

const mcq = QUESTION_BANK.filter((q) => q.type === 'mcq').length
const tf = QUESTION_BANK.length - mcq
const au = QUESTION_BANK.filter((q) => q.au).length

console.log(`Total questions: ${QUESTION_BANK.length}`)
console.log(`MCQ: ${mcq}  TF: ${tf}  (${Math.round((tf / QUESTION_BANK.length) * 100)}% TF)`)
console.log(`AU-specific: ${au} (${Math.round((au / QUESTION_BANK.length) * 100)}%)`)
console.log(`Smallest gen×category cell: ${minCell}`)
console.log(`Cells: ${Object.keys(cellCounts).length}`)

if (errors.length) {
  console.error(`\n❌ ${errors.length} problems:`)
  for (const e of errors.slice(0, 40)) console.error('  - ' + e)
  process.exit(1)
} else {
  console.log('\n✅ Bank is structurally valid.')
}
