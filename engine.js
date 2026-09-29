/* BowlMath engine - ten-pin bowling scoring and league math, no DOM. */
(function (root) {
  'use strict';

  // Parse one frame token like "X", "7/", "9-", "-8", or 10th-frame "X9/", "XXX", "9/5".
  // Returns a pinfall list, or null if unreadable.
  function tokenToBalls(tok, isTenth) {
    var balls = [];
    var prev = -1;
    for (var i = 0; i < tok.length; i++) {
      var c = tok[i].toUpperCase();
      var v;
      if (c === 'X') v = 10;
      else if (c === '/') {
        if (prev < 0) return null;
        v = 10 - prev;
      } else if (c === '-') v = 0;
      else if (c >= '0' && c <= '9') v = parseInt(c, 10);
      else return null;
      balls.push(v);
      prev = v;
    }
    if (!isTenth && balls.length > 2) return null;
    return balls;
  }

  // Parse a full (or partial) game string: frames separated by spaces.
  // "X 7/ 9- X -8 8/ 9- X X X9/" -> flat pinfall list.
  function parseGame(str) {
    var toks = String(str).trim().split(/\s+/).filter(function (t) { return t.length; });
    if (toks.length === 0) return null;
    // Ball-by-ball entry spills past 10 tokens: fold everything from the 10th token on into the 10th frame.
    if (toks.length > 10) {
      toks = toks.slice(0, 9).concat([toks.slice(9).join('')]);
    }
    var balls = [];
    for (var i = 0; i < toks.length; i++) {
      var b = tokenToBalls(toks[i], i === 9);
      if (!b) return null;
      // frames 1-9: a strike is one ball; others must be two and cannot topple more than 10 pins
      if (i < 9 && b.length !== (b[0] === 10 ? 1 : 2)) return null;
      if (i < 9 && b.length === 2 && b[0] + b[1] > 10) return null;
      if (i < 9 && b.length === 2 && b[1] === 10) return null;
      balls = balls.concat(b);
    }
    return balls;
  }

  // Walk frames over a pinfall list. Returns per-frame info and totals.
  // Incomplete frames/bonuses are reported but not counted in total.
  function scoreBalls(balls) {
    var frames = [];
    var total = 0;
    var i = 0;
    for (var f = 0; f < 10; f++) {
      if (i >= balls.length) break;
      if (f < 9) {
        if (balls[i] === 10) {
          var bonus = (i + 1 < balls.length ? balls[i + 1] : null);
          var bonus2 = (i + 2 < balls.length ? balls[i + 2] : null);
          frames.push({ frame: f + 1, balls: [10], mark: 'strike', value: bonus !== null && bonus2 !== null ? 10 + bonus + bonus2 : null });
          if (frames[f].value !== null) total += frames[f].value;
          i += 1;
        } else {
          if (i + 1 >= balls.length) { frames.push({ frame: f + 1, balls: [balls[i]], mark: 'open-pending', value: null }); i += 1; continue; }
          var two = balls[i] + balls[i + 1];
          if (two === 10) {
            var b3 = (i + 2 < balls.length ? balls[i + 2] : null);
            frames.push({ frame: f + 1, balls: [balls[i], balls[i + 1]], mark: 'spare', value: b3 !== null ? 10 + b3 : null });
            if (frames[f].value !== null) total += frames[f].value;
          } else {
            frames.push({ frame: f + 1, balls: [balls[i], balls[i + 1]], mark: 'open', value: two });
            total += two;
          }
          i += 2;
        }
      } else {
        var rest = balls.slice(i, i + 3);
        var done = false;
        if (rest.length === 3) done = true;
        else if (rest.length === 2 && rest[0] !== 10 && rest[0] + rest[1] < 10) done = true;
        frames.push({ frame: 10, balls: rest, mark: done ? 'tenth' : 'tenth-pending', value: done ? rest.reduce(function (s, v) { return s + v; }, 0) : null });
        if (frames[f].value !== null) total += frames[f].value;
        i = balls.length;
      }
    }
    var strikes = 0, spares = 0, opens = 0;
    frames.forEach(function (fr) {
      if (fr.mark === 'strike') strikes++;
      else if (fr.mark === 'spare') spares++;
      else if (fr.mark === 'open') opens++;
      if (fr.frame === 10) {
        fr.balls.forEach(function (v, idx) {
          if (v === 10) strikes++;
          else if (idx > 0 && fr.balls[idx - 1] !== 10 && fr.balls[idx - 1] + v === 10) spares++;
        });
      }
    });
    return { frames: frames, total: total, complete: frames.length === 10 && frames[frames.length - 1].value !== null, strikes: strikes, spares: spares, opens: opens };
  }

  function scoreGame(str) {
    var balls = parseGame(str);
    if (!balls) return null;
    return scoreBalls(balls);
  }

  // Maximum possible final score from the current (possibly partial) game: every future ball a strike.
  function maxPossible(str) {
    var balls = parseGame(str);
    if (!balls) return null;
    var padded = balls.concat([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
    return scoreBalls(padded).total;
  }

  // League handicap per game: pct of the gap to the basis, floored, never negative.
  function handicap(average, basis, pct) {
    basis = basis === undefined ? 220 : basis;
    pct = pct === undefined ? 0.9 : pct;
    return Math.max(0, Math.floor((basis - average) * pct));
  }

  function seriesWithHandicap(games, hcpPerGame) {
    var scratch = games.reduce(function (s, g) { return s + g; }, 0);
    return { scratch: scratch, withHandicap: scratch + hcpPerGame * games.length };
  }

  function avgBand(avg) {
    if (avg < 90) return 'casual - the gutter is a feature, not a bug';
    if (avg < 120) return 'bowling-curious regular';
    if (avg < 150) return 'league standard';
    if (avg < 180) return 'strong league player';
    if (avg < 200) return 'tournament threat';
    if (avg < 215) return 'scratch serious';
    return 'pro pace - the house shot knows you';
  }

  var api = {
    parseGame: parseGame,
    scoreBalls: scoreBalls,
    scoreGame: scoreGame,
    maxPossible: maxPossible,
    handicap: handicap,
    seriesWithHandicap: seriesWithHandicap,
    avgBand: avgBand
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BowlMath = api;
})(typeof window !== 'undefined' ? window : globalThis);
