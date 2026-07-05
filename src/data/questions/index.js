import boomer from './boomer.js'
import genx from './genx.js'
import millennial from './millennial.js'
import genz from './genz.js'
import alpha from './alpha.js'

// The "Brutal" tier (difficulty 4) — genuinely hard deep cuts.
import boomerBrutal from './boomer-brutal.js'
import genxBrutal from './genx-brutal.js'
import millennialBrutal from './millennial-brutal.js'
import genzBrutal from './genz-brutal.js'
import alphaBrutal from './alpha-brutal.js'

// The full embedded question bank.
export const QUESTION_BANK = [
  ...boomer,
  ...genx,
  ...millennial,
  ...genz,
  ...alpha,
  ...boomerBrutal,
  ...genxBrutal,
  ...millennialBrutal,
  ...genzBrutal,
  ...alphaBrutal,
]

export default QUESTION_BANK
