import { shuffle } from './rng.js'

// Turn a raw bank question into a render-ready question with shuffled options and
// a correctIndex that survives the shuffle. Works for mcq and tf.
export function prepareQuestion(raw, rng) {
  if (raw.type === 'tf') {
    // True on the left, False on the right — stable, no shuffle needed.
    return {
      id: raw.id,
      gen: raw.gen,
      category: raw.category,
      type: 'tf',
      difficulty: raw.difficulty,
      q: raw.q,
      options: ['True', 'False'],
      correctIndex: raw.answer === true ? 0 : 1,
      funFact: raw.funFact,
      au: raw.au,
    }
  }
  const correctValue = raw.options[raw.answer]
  const options = shuffle(raw.options, rng)
  return {
    id: raw.id,
    gen: raw.gen,
    category: raw.category,
    type: 'mcq',
    difficulty: raw.difficulty,
    q: raw.q,
    options,
    correctIndex: options.indexOf(correctValue),
    funFact: raw.funFact,
    au: raw.au,
  }
}
