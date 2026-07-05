# Era Clash 📻📼💾📱🎮

A multigenerational Aussie family quiz — pass-and-play on one phone, Boomers → Gen Alpha.

**The hook:** you score more for knowing eras that *aren't* yours. A 12-year-old nailing a Boomer
question about Countdown earns more than a Boomer does; Grandad correctly defining "rizz" is worth
big points.

Built to be played at a family gathering with zero setup friction — one phone, no accounts, no
internet needed after it loads.

## Play it

```bash
npm install
npm run dev      # open the printed localhost URL on a phone-sized viewport
```

Other scripts:

```bash
npm test         # engine unit tests (scoring, distance, draw, reducer)
npm run validate # structural check of the 280-question bank
npm run build    # production build into dist/
```

## How a game works

1. **Set up** 2–4 teams. Each team picks its **home eras** (the generations its players actually
   come from) — multi-select, because families team up (Grandma + grandkid).
2. Pick a **length** (Quick / Classic / Marathon), a **timer**, and which **categories** are in.
3. Play the rounds:
   - **Round 1 — Home Turf:** questions from your own eras. Flat 10 points.
   - **Round 2 — Gen Swap:** questions from eras that aren't yours, weighted toward the furthest.
     Scoring is `10 + 5 × distance` (up to 30).
   - **Round 3 — Lucky Dip** *(Classic & Marathon)*: a spinner lands on a random era × category.
   - **Round 4 — Time Warp Wager** *(Marathon; also the finale of Classic)*: see the era up front,
     wager 0–50% of your score, then answer.
4. **Steals:** a wrong answer (not a timeout) can be stolen by another team for half points.
5. **Skips:** one per team per round. **Ties** at the end trigger sudden death.
6. **Finish** on a podium plus playful **awards** (Time Traveller, High Roller, Steal Merchant…).

## The question bank

280 questions across **5 generations × 7 categories** (music, slang, gaming, film & TV, general,
sport, toys), 8 per cell. The guiding rule: every question is about something an **Australian
audience of that generation would have been exposed to** — a healthy chunk of iconic AU content
(Countdown, Neighbours, Cathy Freeman, Bluey, AFL/NRL) mixed with the global music, film, games and
slang that were big in Australia. Difficulty is judged *relative to people of that generation*, so a
"gimme" Boomer question is genuinely testing for a Gen Alpha kid — that asymmetry is the game.

Add or edit questions in `src/data/questions/*.js` (one file per generation) and run
`npm run validate`.

## Architecture

Single-page, no backend, all state in memory (`useReducer`).

```
src/
  engine/          pure game logic (no React) — fully unit-tested
    constants.js   generations, categories, lengths, timers
    scoring.js     generational distance + points model
    draw.js        question selection with distance weighting + fallbacks
    reducer.js     the whole phase state machine
    prepare.js     option-shuffling that keeps the correct answer tracked
    awards.js      end-of-game awards from the per-question log
    copy.js        rotating Aussie banter
    rng.js         seeded RNG (kept out of the reducer so it stays pure)
  ui/              theming helpers + shared components
  screens/         Setup, Play, Results
  data/questions/  the embedded question bank
  App.jsx          controller: wires the reducer to the screens, owns the RNG
```

The scoring, distance and draw rules live in plain functions so they can be reasoned about and
tested independently of the UI; `App.jsx` is the only place randomness meets state.
