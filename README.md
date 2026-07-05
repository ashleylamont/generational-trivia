# Era Clash 📻📼💾📱🎮

> note from ashley: this is a quick app that I smashed together almost entirely with claude - quality and accuracy may vary.

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
   come from) — multi-select, because families team up (Grandma + grandkid) — and a **default
   difficulty** (*Gentle* / *Tricky* / *Brutal*).
2. Pick a **length** (Quick / Classic / Marathon), a **timer**, whether the **spin-up reel** is on,
   and which **categories** are in.
3. **Before each question**, the team in the hot seat picks how hard they want it — *Gentle*,
   *Tricky*, or *Brutal* (starting from their default) — because harder questions are worth more
   points. A quick **horizontal reel** then spins and lands on the question's era × category (just
   for fun; it can be switched off). Then it's **read aloud and answered aloud**: someone reads the question and starts the
   timer, the team says their answer out loud, and the phone reveals the canonical answer (plus
   accepted variants) for the room to judge **Got it** / **Missed it** on the honour system. No
   multiple choice — you have to actually know it. A live scoreboard and progress bar stay on screen
   the whole time.
4. Play the rounds:
   - **Round 1 — Home Turf:** questions from your own eras. Base 10 points.
   - **Round 2 — Gen Swap:** questions from eras that aren't yours, weighted toward the furthest.
     Scoring is `10 + 5 × distance`.
   - **Round 3 — Lucky Dip** *(Classic & Marathon)*: a spinner lands on a random era × category.
   - **Round 4 — Time Warp Wager** *(Marathon; also the finale of Classic)*: see the era up front,
     wager 0–50% of your score, then answer.

   On top of all of that, **every question adds a difficulty bonus** — `+5` for a medium (*Tricky*)
   question, `+10` for a hard (*Brutal*) one (difficulty is judged relative to the question's own
   generation). So picking *Brutal* before a question is a live risk/reward call: tougher, but worth
   more.
5. **Steals:** a missed answer (not a timeout) can be offered to another team, who call out an
   answer for the reader to judge — a correct steal is worth half points.
6. **Skips:** one per team per round. **Ties** at the end trigger sudden death.
7. **Finish** on a podium plus playful **awards** (Time Traveller, High Roller, Steal Merchant…).

## Deployment

Pushes to `main` build and publish to **GitHub Pages** via
`.github/workflows/deploy.yml` (the workflow also runs the tests and bank
validation first). One-time setup: in the repo's **Settings → Pages**, set
**Source** to **GitHub Actions**. After that the app is served at
`https://ashleylamont.github.io/generational-trivia/`.

The Vite `base` is `'./'`, so assets load correctly from the project subpath
without any host-specific configuration.

## The question bank

280 **open-ended** questions across **5 generations × 7 categories** (music, slang, gaming, film &
TV, general, sport, toys), 8 per cell. Each has a short spoken `answer` plus `accept` variants to
help whoever's judging. The guiding rule: every question is about something an **Australian audience
of that generation would have been exposed to** — a healthy chunk of iconic AU content (Countdown,
Neighbours, Cathy Freeman, Bluey, AFL/NRL) mixed with the global music, film, games and slang that
were big in Australia. Difficulty is judged *relative to people of that generation*, so a "gimme"
Boomer question is genuinely testing for a Gen Alpha kid — that asymmetry is the game.

Each question looks like:

```js
{ id: "ml-music-001", gen: "millennial", category: "music", type: "open", difficulty: 2,
  q: "Which Brisbane band released the 2000 album 'Odyssey Number Five'?",
  answer: "Powderfinger", accept: [], funFact: "…", au: true }
```

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
    prepare.js     normalises a bank question for rendering (answer + accept)
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
