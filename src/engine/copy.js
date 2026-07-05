// Rotating copy. Picked by state.copyIndex so lines stay stable per reveal and
// never repeat consecutively. Warm, dry, Aussie — one idiom per line max.

export const CORRECT_LINES = [
  'Too easy!',
  'Ripper!',
  'You little beauty!',
  'No notes.',
  'Certified era-hopper.',
  'Get around it!',
  'Absolute scenes.',
]

export const WRONG_LINES = [
  'Yeah… nah.',
  'Not even close, champ.',
  'Straight to the group chat.',
  'Swing and a miss.',
  'The tumbleweeds have entered the chat.',
]

// Wrong line that name-drops the generation being quizzed.
export function wrongWithGen(genLabel) {
  return `The ${genLabel} are shaking their heads.`
}

export const TIMEOUT_LINES = [
  'Time! Pencils down.',
  "That's a wrap — the clock won.",
  'Too slow, the buzzer got there first.',
]

export const STEAL_WIN_LINES = ['Nicked it!', 'Daylight robbery.', 'Snatched from the jaws of defeat.']
export const STEAL_MISS_LINES = ['Steal denied.', 'Nope — no five-finger discount today.', 'Fumbled the steal.']

export const HANDOFF_SUBTITLES = [
  'No coaching from the couch!',
  'Eyes off the screen, everyone else.',
  'Phones down, thinking caps on.',
  'No sneaky Googling.',
]

// Round-summary banter keyed to the standings.
export function banterForStandings(sorted) {
  if (sorted.length < 2) return 'One team to beat — themselves.'
  const [first, second] = sorted
  const gap = first.score - second.score
  const total = Math.max(1, first.score)
  if (gap === 0) return "Neck and neck — grab a Milo, it's getting serious."
  if (gap / total > 0.5) return "Someone's been studying the family photo albums."
  if (gap / total < 0.12) return "The comeback is on like Warnie in '93."
  return 'Still anyone’s game — no one’s reaching for the remote yet.'
}

export function pick(lines, index) {
  return lines[index % lines.length]
}
