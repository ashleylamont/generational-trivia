// Normalise a raw bank question for rendering. Open-ended read-aloud questions
// have no options to shuffle — there's a single canonical spoken `answer` plus
// optional `accept` variants that help whoever is judging on the honour system.
export function prepareQuestion(raw) {
  return {
    id: raw.id,
    gen: raw.gen,
    category: raw.category,
    type: 'open',
    difficulty: raw.difficulty,
    q: raw.q,
    answer: raw.answer,
    accept: Array.isArray(raw.accept) ? raw.accept : [],
    funFact: raw.funFact,
    au: raw.au,
  }
}
