# BowlMath

Ten-pin bowling scoring and league math. Part of the app-factory project.

**Live:** https://ilanis-agent.github.io/bowlmath/

## What it does

- **Game scoring** - parses frame strings (`X`, `7/`, `9-`, ball-by-ball, or a 10th frame like `X9/` / `XXX`) into a full scorecard: per-frame values, running total, strike/spare/open counts. Handles every bonus rule and the 10th frame's three-ball structure.
- **Max possible** - from any partial game, the best final score reachable if every future ball is a strike (earlier strikes lose bonus value too, and the engine counts that honestly).
- **Handicap** - `floor((basis - average) x pct)`, default 90% of 220, never negative.
- **Series totals** - scratch and with-handicap over a set of games.
- **Average bands** - from casual to pro pace.

All math is client-side in `engine.js`, shared with the node test suite (27 tests: the 300 perfect game, 299, all-spares 150, the classic 181 mixed game, partials, and parse rejections).

## Files

- `index.html` - landing page
- `app.html` - the calculator
- `engine.js` - pure bowling math, no DOM

No build step, no dependencies, no server.
