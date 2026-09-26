/* Flow Breakdown — the extraction, on the web.
 *
 * The board is rendered in its END state in HTML, so the page is true with no JS.
 * This script measures that layout, rewinds it onto the selected thumbnail, and
 * plays it forward. Every number below comes from ExtractionScene.swift.
 *
 *   morph  timingCurve(0.32, 0.72, 0, 1)  0.36s
 *   lift   timingCurve(0.2, 0.75, 0.25, 1) 0.76s
 *   cards leave 120ms apart, first at 360ms
 *   squash 0.985 over 0.13s, easeOut, each way
 */
(function () {
  'use strict';

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Identical faces roll downward like an odometer. Run only for visible links.
  if (!reduced && 'IntersectionObserver' in window) {
    var arrowObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('arrow-visible', entry.isIntersecting && entry.intersectionRatio >= 0.25);
      });
    }, { threshold: 0.25 });
    document.querySelectorAll('.narrative-link').forEach(function (link) {
      arrowObserver.observe(link);
    });
  }
  if (reduced) {
    // The end state is already correct and nothing animates — but the button must
    // not be dead: it takes you to the board, with no motion.
    var btn = document.getElementById('breakdown');
    var brd = document.getElementById('board');
    if (btn && brd) btn.addEventListener('click', function () {
      brd.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    });
    return;
  }

  // ── easing ────────────────────────────────
  function bezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    function sx(t) { return ((ax * t + bx) * t + cx) * t; }
    function sdx(t) { return (3 * ax * t + 2 * bx) * t + cx; }
    function sy(t) { return ((ay * t + by) * t + cy) * t; }
    return function (p) {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      var t = p;
      for (var i = 0; i < 8; i++) {
        var x = sx(t) - p;
        if (Math.abs(x) < 1e-5) break;
        var d = sdx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= x / d;
      }
      return sy(t);
    };
  }
  var LIFT  = bezier(0.2, 0.75, 0.25, 1);
  var MORPH = bezier(0.32, 0.72, 0, 1);
  var EASE  = bezier(0, 0, 0.58, 1);

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var span  = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };
  var mix   = function (a, b, t) { return a + (b - a) * t; };

  // ── timeline, in progress space (2120ms total) ──
  var ARM_END    = 0.14;
  var CARD_START = [0.170, 0.226, 0.283];   // 360ms + i×120ms
  var CARD_SPAN  = 0.358;                   // 760ms lift
  var UNFURL     = 0.143;                   // the thumbnail opens into a screen
  var SETTLE     = [0.66, 0.83];
  var SQUASH     = 0.061;                   // 130ms each way

  var extract = document.getElementById('extract');
  var phone   = document.getElementById('phone');
  var picks   = [].slice.call(document.querySelectorAll('.cell.pick'));
  var board   = document.getElementById('board');
  var lane    = document.getElementById('lane');
  var lanePath= document.getElementById('lanePath');
  var waiting = document.getElementById('waiting');
  var zone    = document.getElementById('zone');
  var pin     = document.getElementById('pin');
  var button  = document.getElementById('breakdown');
  var storyzone = document.getElementById('storyzone');
  var stage   = document.getElementById('stage');
  var glass   = document.getElementById('glass');
  var focus   = document.getElementById('focus');
  var focusTime  = document.getElementById('focusTime');
  var focusQuote = document.getElementById('focusQuote');
  var ring    = document.getElementById('ring');
  var arrow   = document.getElementById('arrow');
  var arrowPath = arrow && arrow.querySelector('path');
  var scribble = document.getElementById('scribble');
  var marquee = document.getElementById('marquee');
  var scaps   = [].slice.call(document.querySelectorAll('.scap'));
  var ctafig  = document.getElementById('ctafig');
  var storyNext = document.getElementById('story-next');
  var storyNextLabel = document.getElementById('story-next-label');
  var postCopy = document.getElementById('post-copy');
  var copyConfirmation = document.getElementById('copy-confirmation');
  var copyFeedback = document.getElementById('copy-feedback');
  var yourTurn = document.getElementById('your-turn');
  var copiedRecording = null;
  var copyPending = false;
  var copyAttempt = 0;
  var copyFailure = '';
  var storyStops = [0.26, 0.58, 0.86, 0.98];
  var storyInvitations = ['Talked while recording?', 'And how did it feel?', 'Then mark it up', 'Take it to Figma'];
  var nextBeat = 0;
  if (!extract || !board || !picks.length) return;

  // the cards fly out of whichever cell is picked
  function originCell() { return picks[current] || picks[0]; }

  var slots = [].slice.call(board.querySelectorAll('.slot'));
  var cards = slots.map(function (s) { return s.querySelector('.card'); });
  // Stacking order never varies with p — set it once. Rewriting z-index per
  // frame reshuffles paint order and invalidates the stacking context for free.
  cards.forEach(function (c, i) { c.style.zIndex = 10 + i; });
  var chips = slots.map(function (s) { return s.querySelector('.chip'); });
  var notes = slots.map(function (s) { return s.querySelector('.note'); });
  var labels= slots.map(function (s) { return s.querySelector('.label'); });
  var ghosts= slots.map(function (s) { return s.querySelector('.ghost'); });
  // The rest of the flow — real screens flanking the chosen three. Flow order
  // is preserved left to right; `split` says how many sit before the trio.
  var XTRAS = {
    card: { files: ['x_card1.jpg','x_card2.jpg','x_card3.jpg','x_card4.jpg','x_card5.jpg','x_card6.jpg','x_card7.jpg','x_card8.jpg','x_card9.jpg','x_card10.jpg','x_card11.jpg'], split: 5 },
    out:  { files: ['x_out1.jpg','x_out2.jpg','x_out3.jpg','x_out4.jpg','x_out5.jpg','x_out6.jpg','x_out7.jpg','x_out8.jpg','x_out9.jpg','x_out10.jpg'], split: 5 },
    our:  { files: ['x_our1.jpg','x_our2.jpg','x_our3.jpg','x_our4.jpg','x_our5.jpg','x_our6.jpg','x_our7.jpg','x_our8.jpg','x_our9.jpg','x_our10.jpg'], split: 5 }
  };
  var xtraEls = [];
  function buildXtras() {
    xtraEls.forEach(function (el) { el.remove(); });
    xtraEls = [];
    var cfg = XTRAS[RECORDINGS[current].slug];
    if (!cfg) return;
    cfg.files.forEach(function (f, i) {
      var leftSide = i < cfg.split;
      var k = leftSide ? cfg.split - i : i - cfg.split + 1;   // distance from the trio
      var el = document.createElement('div');
      el.className = 'xtra';
      el.setAttribute('aria-hidden', 'true');
      el.dataset.k = k;
      // the near neighbours fly like the trio; give them their own pile poses
      var pose = leftSide ? [[-6, -12, 6], [5, -8, -8]] : [[6, 12, 8], [-5, 9, -6]];
      if (k <= 2) {
        el.dataset.rot = pose[k - 1][0];
        el.dataset.dx = pose[k - 1][1];
        el.dataset.dy = pose[k - 1][2];
      }
      el.style.left = leftSide
        ? 'calc(50% - ' + (580 + (k - 1) * 240) + 'px)'
        : 'calc(50% + ' + (380 + (k - 1) * 240) + 'px)';
      var im = document.createElement('img');
      im.src = 'assets/' + f;
      im.srcset = 'assets/' + f + ' 1x, assets/' + f.replace('.jpg', '@2x.jpg') + ' 2x';
      im.alt = '';
      el.appendChild(im);
      // Only the near pair ever overrode the stylesheet's z-index:1 — keep it
      // that way, just hoisted out of the frame loop (the value never varies).
      if (k <= 2) el.style.zIndex = 8 - k;
      board.insertBefore(el, board.firstChild);
      xtraEls.push(el);
    });
  }

  // Each recording is hard-wired to its own three screens. Voice notes and feelings are
  // illustrative observations, not transcripts of anyone's actual recording.
  // The feeling stickers, straight from Feelings.swift: a disc of the HUE at
  // discTint 0.16, a line face in the INK (deeper than the hue where the hue is
  // too light to read at 20pt — yellow above all). `ink` is a CSS var so dark
  // mode follows the app's tokens; `inkHex` is for the clipboard SVG.
  var FEELINGS = {
    Delighted: { hue: '#34C759', ink: 'var(--delighted)', inkHex: '#34C759',
      strokes: 'M5.2 8.8Q6.7 6.6 8.2 8.8M11.8 8.8Q13.3 6.6 14.8 8.8',
      fills: 'M6 11.2L14 11.2Q14 15.6 10 15.6Q6 15.6 6 11.2Z', dots: [] },
    Good: { hue: '#007AFF', ink: 'var(--accent)', inkHex: '#007AFF',
      strokes: 'M6.6 12.2Q10 15.4 13.4 12.2', fills: '', dots: [[7.6, 8.6], [12.4, 8.6]] },
    Meh: { hue: '#AEAEB2', ink: 'var(--meh)', inkHex: '#7C7C80',
      strokes: 'M6.8 13.4L13.2 13.4', fills: '', dots: [[7.6, 8.8], [12.4, 8.8]] },
    Confused: { hue: '#FFCC00', ink: 'var(--confused)', inkHex: '#A8820A',
      strokes: 'M11.2 6.1L14.6 5.1M6.6 14Q8.4 12.4 10 13.4Q11.6 14.4 13.4 12.8',
      fills: '', dots: [[7.6, 9.2], [12.4, 9.2]] }
  };

  function faceParts(f, ink) {
    var s = '<circle cx="10" cy="10" r="10" fill="' + f.hue + '" fill-opacity="0.16"/>';
    if (f.fills) s += '<path d="' + f.fills + '" fill="' + ink + '"/>';
    f.dots.forEach(function (d) {
      s += '<ellipse cx="' + d[0] + '" cy="' + d[1] + '" rx="1.1" ry="1.35" fill="' + ink + '"/>';
    });
    s += '<path d="' + f.strokes + '" fill="none" stroke="' + ink + '" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>';
    return s;
  }
  function faceSVG(name) {
    return '<svg class="face" viewBox="0 0 20 20" aria-hidden="true">' + faceParts(FEELINGS[name], FEELINGS[name].ink) + '</svg>';
  }

  // One-based positions in each full landing-page stack, including XTRAS before
  // the highlighted trio. Keep these app-specific values when changing a stack.
  var RECORDINGS = [
    { slug:'card', alt:'RunBuds',
      screenNumbers:[6,7,8],
      feelings:[['Delighted',false],['Confused',true],['Meh',false]],
      notes:[['Voice · 0:12','“Oh, nice. That’s pretty cool.”'],
             ['Voice · 0:15','“I’m not sure what this is about.”'],
             ['Voice · 0:17','“Okay, last step.”']] },
    { slug:'out', alt:'The Outsiders',
      screenNumbers:[6,7,8],
      feelings:[['Good',false],['Delighted',false],['Meh',true]],
      notes:[['Voice · 0:09','“That chart is doing a lot of work.”'],
             ['Voice · 0:31','“The year view is the good bit.”'],
             ['Voice · 0:58','“Not sure I need this tab.”']] },
    { slug:'our', alt:'Oura',
      screenNumbers:[6,7,8],
      feelings:[['Confused',true],['Good',false],['Delighted',false]],
      notes:[['Voice · 0:06','“Where is the summary?”'],
             ['Voice · 0:22','“Okay, that one is clear.”'],
             ['Voice · 0:34','“This breakdown is lovely.”']] }
  ];
  var current = 0;

  function applyRecording(i) {
    // A different recording needs its own successful copy. Ignore any old result.
    copiedRecording = null;
    copyPending = false;
    copyFailure = '';
    copyAttempt++;
    current = i;                       // FIRST — buildXtras and originCell read it
    var r = RECORDINGS[i];
    cards.forEach(function (c, n) {
      var img = c.querySelector('img');
      img.src = 'assets/' + r.slug + (n + 1) + '.jpg';
      img.srcset = 'assets/' + r.slug + (n + 1) + '.jpg 1x, assets/' + r.slug + (n + 1) + '@2x.jpg 2x';
      img.alt = r.alt + ' — Screen ' + r.screenNumbers[n];
      labels[n].textContent = 'Screen ' + r.screenNumbers[n];
    });
    chips.forEach(function (ch, n) {
      var f = r.feelings[n];
      ch.lastChild.textContent = f[0];
      var face = ch.querySelector('.face');
      if (face) face.outerHTML = faceSVG(f[0]);
      ch.classList.toggle('sug', f[1]);
    });
    notes.forEach(function (nt, n) {
      nt.querySelector('b').textContent = r.notes[n][0];
      nt.querySelector('span').textContent = r.notes[n][1];
    });
    picks.forEach(function (b, n) { b.setAttribute('aria-pressed', String(n === i)); });
    buildXtras();
    if (focusTime)  focusTime.textContent  = r.notes[1][0];
    if (focusQuote) focusQuote.textContent = r.notes[1][1].replace(/^\u201C|\u201D$/g, '');
    drags.forEach(function (d) { d.x = 0; d.y = 0; });
  }

  var geo = null;

  function measure() {
    // Clear transforms so we measure the true laid-out (end) positions.
    cards.forEach(function (c) { c.style.transform = ''; setPaint(c, 'clipPath', ''); });
    xtraEls.forEach(function (el) { el.style.transform = ''; setPaint(el, 'clipPath', ''); });
    chips.forEach(function (ch) { ch.style.transform = ''; ch.style.marginLeft = ''; });
    var srect = originCell().getBoundingClientRect();
    var g = { src: srect, cards: [], pile: null };
    g.narrow = matchMedia('(max-width: 720px)').matches;
    // The screenshot strip can bleed beyond a narrow viewport; its labels must
    // remain readable. Leave room for their small canvas-scatter offsets too.
    if (g.narrow) chips.forEach(function (ch) {
      var r = ch.getBoundingClientRect(), center = r.left + r.width / 2;
      var fitted = clamp(center, 24 + r.width / 2, window.innerWidth - 24 - r.width / 2);
      ch.style.marginLeft = (fitted - center).toFixed(2) + 'px';
    });
    cards.forEach(function (c) { g.cards.push(c.getBoundingClientRect()); });

    var first = g.cards[0];
    if (!first || !first.width || !srect.width) { geo = null; return; }

    g.scale0 = srect.width / first.width;              // thumbnail width → card width
    // clip the card to the thumbnail's square at t=0, in the card's own pixels
    g.inset0 = Math.max(0, (first.height - srect.height / g.scale0) / 2);

    // The pile forms where the middle card will land. Putting it midway between
    // the phone and the row looks right in isolation but parks it on top of the
    // caption and the button for the whole of the settle.
    var mid = g.cards[1] || first;
    g.pile = { x: mid.left, y: mid.top };
    g.xtras = xtraEls.map(function (el) { return el.getBoundingClientRect(); });

    // story landmarks, in scrollY terms. The stage's natural top is the zone's
    // top (first child); it pins STAGETOP below the viewport top. The flight
    // window Wf is the share of the full range spent travelling to the pin.
    // The pin offset lives in CSS (max(64px, centered)); read the resolved
    // value so the flight window Wf stays exact on every viewport.
    STAGETOP = parseFloat(getComputedStyle(stage).top) || 64;

    var zr = storyzone.getBoundingClientRect();
    var zTop = window.scrollY + zr.top;
    g.startY = zTop - window.innerHeight * 0.85;
    g.endY   = zTop + zr.height - window.innerHeight;
    var pinY = zTop - STAGETOP;
    g.Wf = clamp((pinY - g.startY) / (g.endY - g.startY), 0.05, 0.6);

    geo = g;
    var br = board.getBoundingClientRect();
    lane.setAttribute('width', br.width);
    lane.setAttribute('height', br.height);
    g.chipPoints = chips.map(function (ch) {
      var r = ch.getBoundingClientRect();
      return { x: r.left - br.left + r.width / 2, y: r.top - br.top + r.height / 2 };
    });
    drawLane(g.chipPoints);
  }

  var STAGETOP = 64;
  // the focus card's waveform, built once
  (function buildWave() {
    var svg = focus && focus.querySelector('.wave');
    if (!svg || svg.childNodes.length) return;
    var hs = [6,10,16,22,14,26,18,30,12,22,26,16,10,20,28,14,8,18,24,12,6,16,10,8];
    for (var i = 0; i < hs.length; i++) {
      var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', i * 9); r.setAttribute('width', 5);
      r.setAttribute('y', 16 - hs[i] / 2); r.setAttribute('height', hs[i]);
      r.setAttribute('rx', 2.5);
      r.setAttribute('fill', i < 15 ? 'var(--warn)' : 'currentColor');
      r.setAttribute('opacity', i < 15 ? '1' : '0.18');
      svg.appendChild(r);
    }
  })();
  var arrowLen = 0;

  function drawLane(pts) {
    lanePath.setAttribute('d',
      'M ' + pts[0].x + ' ' + pts[0].y +
      ' L ' + pts[1].x + ' ' + pts[1].y +
      ' L ' + pts[2].x + ' ' + pts[2].y);
  }

  // scatter poses for the canvas beat — [rot, dx, dy]
  var SCAT = {
    cards: [[-5, -30, 14], [3, 12, -16], [7, 28, 24]],
    notes: [[-3, -40, 8], [2, 48, -4], [-2, 20, 14]],
    chips: [[-4, -18, 4], [0, 24, -8], [3, 10, 2]]
  };
  var drags = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];

  function bump(t, a, b, c, d) { return EASE(span(t, a, b)) * (1 - EASE(span(t, c, d))); }

  // PAINT properties (box-shadow, clip-path, stroke dashes) cannot be composited:
  // assigning one throws away the element's cached raster tiles. Writing them on
  // every scrolled frame across ~25 image-bearing elements puts the raster thread
  // behind the compositor, which then draws tiles that aren't ready yet — the
  // white flash. p is continuous, but each of these values is CONSTANT outside
  // its own beat, so only touch the DOM when the value actually changes.
  // Anything that clears one of these must go through here too, or the cache
  // desyncs and render() skips the write that would restore it.
  function setPaint(el, prop, value) {
    var key = '_p_' + prop;
    if (el[key] === value) return;
    el[key] = value;
    el.style[prop] = value;
  }

  function render(p) {
    if (!geo) return;
    var Wf = geo.Wf || 0.3;
    var pf = span(p, 0, Wf);          // the flight — delivers the FRAMES ONLY
    var q  = span(p, Wf, 1);          // the story: audio, emotions, canvas

    // beat drivers. bumps are lenses (come and go); one-way spans are arrivals.
    var V = bump(q, 0.08, 0.16, 0.30, 0.36);   // the focus card
    var P = bump(q, 0.42, 0.50, 0.58, 0.64);   // chip emphasis pop
    var C = EASE(span(q, 0.66, 0.76));          // canvas arrives, stays
    var A = EASE(span(q, 0.76, 0.86));          // annotations draw
    var G = EASE(span(q, 0.88, 0.95));          // everything selected

    var spent = EASE(span(pf, CARD_START[0], CARD_START[0] + CARD_SPAN * 0.6));
    var used = originCell().querySelector('img');
    if (used) used.style.opacity = String(mix(1, 0.32, spent));
    picks.forEach(function (b) {
      var im = b.querySelector('img');
      if (im && im !== used) im.style.opacity = '1';
    });

    var settle = MORPH(span(pf, SETTLE[0], SETTLE[1]));
    var squash = 1;

    cards.forEach(function (c, i) {
      var a = CARD_START[i], b = a + CARD_SPAN;
      var lift = LIFT(span(pf, a, b));
      var end  = geo.cards[i];
      var rot  = parseFloat(c.dataset.rot) || 0;
      var dx   = parseFloat(c.dataset.dx) || 0;
      var dy   = parseFloat(c.dataset.dy) || 0;

      var startX = geo.src.left + geo.src.width / 2  - (end.left + end.width / 2);
      var startY = geo.src.top  + geo.src.height / 2 - (end.top + end.height / 2);
      var pileX  = geo.pile.x + dx - end.left;
      var pileY  = geo.pile.y + dy - end.top;

      var tx = mix(mix(startX, pileX, lift), 0, settle);
      var ty = mix(mix(startY, pileY, lift), 0, settle);
      var sc = mix(mix(geo.scale0, 1, lift), 1, settle);
      var rt = mix(mix(0, rot, lift), 0, settle);

      tx += SCAT.cards[i][1] * C + drags[i].x;
      ty += SCAT.cards[i][2] * C + drags[i].y;
      rt += SCAT.cards[i][0] * C;

      c.style.opacity = pf <= a ? '0' : String(1 - 0.3 * V - 0.25 * P);
      c.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) ' +
                          'scale(' + sc.toFixed(4) + ') rotate(' + rt.toFixed(2) + 'deg)';
      setPaint(c, 'boxShadow', G > 0
        ? 'var(--card-shadow), 0 0 0 1.5px rgba(13,153,255,' + (0.8 * G).toFixed(3) + ')'
        : '');

      var ins = mix(geo.inset0, 0, EASE(span(pf, a, a + UNFURL)));
      setPaint(c, 'clipPath', 'inset(' + ins.toFixed(1) + 'px 0 ' + ins.toFixed(1) + 'px 0 round 19px)');

      var land = span(pf, b, b + SQUASH), back = span(pf, b + SQUASH, b + SQUASH * 2);
      if (land > 0 && back < 1) {
        squash = Math.min(squash, mix(1, 0.985, EASE(land)) + (back > 0 ? 0.015 * EASE(back) : 0));
      }

      if (ghosts[i]) ghosts[i].style.opacity = String(1 - EASE(span(pf, a, b)));
      labels[i].style.opacity = String(
        (0.45 + 0.55 * EASE(span(pf, 0.80, 0.90))) * (1 - 0.4 * V) * (1 - 0.4 * P) * (1 - 0.7 * C));
    });

    if (board.style.getPropertyValue('--squash') !== String(squash)) {
      board.style.setProperty('--squash', squash);
    }

    // Headroom: as the chips arrive (and from then on), the whole board eases
    // down so the chips aren't jammed under the container's top edge. The
    // stage-anchored annotations are positioned for the shifted board.
    var D = 30 * EASE(span(q, 0.40, 0.50));
    board.style.transform = D > 0.1 ? 'translateY(' + D.toFixed(1) + 'px)' : '';

    // ── beat 2: the voice notes ARRIVE (and stay) ──
    notes.forEach(function (n, i) {
      var e = EASE(span(q, 0.08 + i * 0.03, 0.18 + i * 0.03));
      n.style.opacity = String(e);
      var ny = mix(-22, 0, e) + SCAT.notes[i][2] * C;
      var nx = SCAT.notes[i][1] * C;
      var nr = SCAT.notes[i][0] * C;
      n.style.transform = 'translate(' + nx.toFixed(1) + 'px,' + ny.toFixed(1) + 'px) ' +
                          'scale(' + mix(0.92, 1, e).toFixed(3) + ') rotate(' + nr.toFixed(2) + 'deg)';
      setPaint(n, 'boxShadow', G > 0 ? '0 1px 3px rgba(0,0,0,.09), 0 0 0 1px rgba(13,153,255,' + (0.7 * G).toFixed(3) + ')' : '');
    });

    // ── beat 3: the feelings ARRIVE (and stay); the pop is just emphasis ──
    var lanePoints = [];
    chips.forEach(function (ch, i) {
      var e = EASE(span(q, 0.40 + i * 0.03, 0.50 + i * 0.03));
      ch.style.opacity = String(e);
      var s = mix(0.92, 1, e) * (1 + (geo.narrow ? 0 : 0.45) * P);
      var cy2 = mix(8, 0, e) - 6 * P + SCAT.chips[i][2] * C;
      var cx2 = SCAT.chips[i][1] * C;
      var cr2 = SCAT.chips[i][0] * C;
      // CSS already centers the chip with translate:-50%; only add motion here.
      ch.style.transform = 'translate(' + cx2.toFixed(1) + 'px,' + cy2.toFixed(1) + 'px) ' +
                           'scale(' + s.toFixed(3) + ') rotate(' + cr2.toFixed(2) + 'deg)';
      lanePoints.push({ x: geo.chipPoints[i].x + cx2, y: geo.chipPoints[i].y + cy2 });
    });
    drawLane(lanePoints);
    lanePath.style.opacity = String(EASE(span(q, 0.46, 0.58)) * (1 - C));

    if (waiting) waiting.style.opacity = String(1 - EASE(span(pf, 0, 0.08)));

    // The rest of the flow. The near neighbours (k<=2) FLY out of the roll in
    // pairs behind the trio — same FLIP, own pile poses — then settle into the
    // strip at their dimmed strength. The far ones ripple in by distance. All
    // of them recede under the lenses and leave when the canvas gathers three.
    var XBASE = [0.55, 0.42, 0.32, 0.22, 0.15, 0.10];
    var XSTART = { 1: 0.310, 2: 0.365 };
    var lensC = (1 - 0.5 * Math.max(V, P)) * (1 - C);
    xtraEls.forEach(function (el, idx) {
      var k = +el.dataset.k;
      var base = XBASE[k - 1] || 0.1;
      if (k <= 2 && geo.xtras && geo.xtras[idx]) {
        var a2 = XSTART[k], b2 = a2 + 0.28;
        var lift2 = LIFT(span(pf, a2, b2));
        var end2 = geo.xtras[idx];
        var rot2 = parseFloat(el.dataset.rot) || 0;
        var startX2 = geo.src.left + geo.src.width / 2 - (end2.left + end2.width / 2);
        var startY2 = geo.src.top + geo.src.height / 2 - (end2.top + end2.height / 2);
        var pileX2 = geo.pile.x + (parseFloat(el.dataset.dx) || 0) - end2.left;
        var pileY2 = geo.pile.y + (parseFloat(el.dataset.dy) || 0) - end2.top;
        var tx2 = mix(mix(startX2, pileX2, lift2), 0, settle);
        var ty2 = mix(mix(startY2, pileY2, lift2), 0, settle);
        var sc2 = mix(mix(geo.scale0, 1, lift2), 1, settle);
        var rt2 = mix(mix(0, rot2, lift2), 0, settle);
        el.style.transform = 'translate(' + tx2.toFixed(2) + 'px,' + ty2.toFixed(2) + 'px) ' +
                             'scale(' + sc2.toFixed(4) + ') rotate(' + rt2.toFixed(2) + 'deg)';
        var ins2 = mix(geo.inset0, 0, EASE(span(pf, a2, a2 + 0.11)));
        setPaint(el, 'clipPath', 'inset(' + ins2.toFixed(1) + 'px 0 ' + ins2.toFixed(1) + 'px 0 round 19px)');
        el.style.opacity = pf <= a2 ? '0'
          : String(mix(1, base, EASE(span(pf, b2, b2 + 0.08))) * lensC);
      } else {
        el.style.opacity = String(base * EASE(span(q, 0.01 + k * 0.012, 0.05 + k * 0.012)) * lensC);
      }
    });

    if (focus) {
      focus.style.opacity = String(V);
      focus.style.translate = '-50% ' + mix(14, 0, V).toFixed(1) + 'px';
      focus.style.scale = String(mix(0.94, 1, V).toFixed(3));
    }
    if (glass) { glass.style.opacity = String(C); glass.style.scale = String(mix(0.97, 1, C).toFixed(3)); }
    if (ring) { ring.style.opacity = String(A); ring.style.scale = String(mix(1.25, 1, A).toFixed(3)); }
    if (arrowPath) {
      if (!arrowLen) { try { arrowLen = arrowPath.getTotalLength(); } catch (e2) { arrowLen = 260; } }
      arrow.style.opacity = String(Math.min(1, A * 3));
      setPaint(arrowPath, 'strokeDasharray', String(arrowLen));
      setPaint(arrowPath, 'strokeDashoffset', String((1 - A) * arrowLen));
    }
    if (scribble) { scribble.style.opacity = String(A); scribble.style.translate = '0 ' + mix(-8, 0, A).toFixed(1) + 'px'; }
    if (marquee) { marquee.style.opacity = String(G); marquee.style.scale = String(mix(1.02, 1, G).toFixed(3)); }
    var showPostCopy = copiedRecording === current && G > 0.5;
    var focusInPostCopy = postCopy && postCopy.contains(document.activeElement);
    if (postCopy) postCopy.hidden = !showPostCopy;
    if (copyFeedback) {
      copyFeedback.hidden = !copyFailure || G <= 0.5;
      if (copyFeedback.textContent !== copyFailure) copyFeedback.textContent = copyFailure;
    }
    if (ctafig) {
      ctafig.style.opacity = showPostCopy ? '0' : String(G);
      ctafig.style.translate = '-50% ' + mix(10, 0, G).toFixed(1) + 'px';
      ctafig.style.pointerEvents = G > 0.5 && !showPostCopy ? 'auto' : 'none';
      ctafig.style.visibility = G > 0.5 && !showPostCopy ? 'visible' : 'hidden';
      ctafig.setAttribute('aria-busy', String(copyPending));
      ctafig.setAttribute('aria-disabled', String(copyPending));
      var nextCtaLabel = copyPending ? 'Copying…' : coarse ? 'Send it to me' : 'Copy this example to Figma';
      if (ctaLabel && ctaLabel.textContent !== nextCtaLabel) ctaLabel.textContent = nextCtaLabel;
    }
    if (stage) stage.classList.toggle('canvasmode', C > 0.5);

    var capOps = [
      EASE(span(pf, 0.9, 1)) * (1 - EASE(span(q, 0.04, 0.10))),
      bump(q, 0.10, 0.16, 0.32, 0.38),
      bump(q, 0.44, 0.50, 0.60, 0.66),
      C * (1 - EASE(span(q, 0.87, 0.93))),
      showPostCopy || copyFailure ? 0 : G
    ];
    scaps.forEach(function (s2, i) {
      s2.style.opacity = String(capOps[i] || 0);
      s2.setAttribute('aria-hidden', capOps[i] > 0.5 ? 'false' : 'true');
    });
    if (storyNext) {
      // Derive the invitation from this same scroll position, including the gaps
      // between caption fades. Clicking never maintains a separate step counter.
      nextBeat = q < 0.10 ? 0 : q < 0.40 ? 1 : q < 0.66 ? 2 : 3;
      if (storyNextLabel.textContent !== storyInvitations[nextBeat]) storyNextLabel.textContent = storyInvitations[nextBeat];
      var nextHidden = pf < 0.98 || G > 0.5;
      if (nextHidden && G > 0.5 && document.activeElement === storyNext) {
        var nextFocus = showPostCopy ? yourTurn : ctafig;
        if (nextFocus) nextFocus.focus({ preventScroll: true });
      }
      storyNext.hidden = nextHidden;
    }
    if (focusInPostCopy && !showPostCopy && storyNext && !storyNext.hidden) storyNext.focus({ preventScroll: true });
  }

  // ── the driver: progress is ATTACHED to the scroll position ──
  //
  // Not fired by it — attached to it. p is a pure function of where the page is,
  // so the animation can never be missed: scroll fast and it fast-forwards, scroll
  // slowly and it plays at your pace, scroll back up and it rewinds. There is no
  // play-once event to blow past, and autoplay is impossible by construction —
  // nothing moves unless the page moves. Resting mid-run is now a legitimate
  // state: it reads as paused-where-you-are, because it is.
  //
  // The mapping:
  //   p = 0  board top reaches 85% down the viewport   (offset 'start 0.85')
  //   p = 1  board bottom reaches the viewport bottom  (offset 'end 1')

  var progress = 0;

  function setProgress(p) {
    progress = clamp(p, 0, 1);
    render(progress);
  }

  function scrubRange() {           // the story's range in scrollY terms
    if (geo && geo.endY) {
      return { start: geo.startY, end: geo.endY,
               flightEnd: geo.startY + ((geo.Wf || 0.3) + 0.02) * (geo.endY - geo.startY) };
    }
    var r = storyzone.getBoundingClientRect();
    var top = window.scrollY + r.top;
    var s = top - window.innerHeight * 0.85, e = top + r.height - window.innerHeight;
    return { start: s, end: e, flightEnd: s + 0.32 * (e - s) };
  }

  function sync(force) {            // recompute p from the page, by hand
    var g = scrubRange(), len = g.end - g.start;
    var next = clamp(len > 0 ? (window.scrollY - g.start) / len : 1, 0, 1);
    // Outside the story, scrolling leaves the scene unchanged. Measurement
    // clears its transforms, so callers that measure must force restoration.
    if (force || next !== progress) setProgress(next);
  }

  // ONE driver, rAF-coalesced. Motion's scroll() used to ride along here and
  // caused visible flicker: it updates on the compositor's timeline while this
  // updates on the scroll event, and their p values disagree by a hair and a
  // frame — every scrolled frame rendered twice with two slightly different
  // states. (Its subscription had also been seen dying after a resize.) A p
  // attached to scroll must have exactly one writer.
  var rafId = 0;
  addEventListener('scroll', function () {
    if (!rafId) rafId = requestAnimationFrame(function () { rafId = 0; sync(); });
  }, { passive: true });

  // ── the opening invitation DRIVES the scroll down ──
  // One decisive ease-out glide from wherever the page is to the end of the zone:
  // fast off the line — the tap wants the payoff — then decelerating, so the
  // chips and notes land gently in the slow tail. Any real gesture (wheel, touch,
  // key, pointer) cancels the glide instantly: the page belongs to the visitor,
  // and their scroll takes over the same attached state.
  var GLIDE_MS = 1100;       // full-range drive; partial runs scale down from this
  var glideId = 0;

  function glide(toY, ms, done) {
    var fromY = window.scrollY, t0 = performance.now(), id = ++glideId;
    (function step(now) {
      if (id !== glideId) return;                    // a real gesture took over
      var t = clamp((now - t0) / ms, 0, 1);
      var e = 1 - Math.pow(1 - t, 3);                // ease out
      window.scrollTo({ top: fromY + (toY - fromY) * e, behavior: 'instant' });
      if (t < 1) requestAnimationFrame(step);
      else if (done) done();
    })(t0);
  }

  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (evt) {
    addEventListener(evt, function () { glideId++; }, { passive: true });
  });

  function focusContinuation() {
    sync();
    if (storyNext && !storyNext.hidden) storyNext.focus({ preventScroll: true });
  }

  storyNext && storyNext.addEventListener('click', function () {
    if (!geo) return;
    var storyRange = scrubRange();
    var storyShare = geo.Wf || 0.3;
    var destination = storyShare + (1 - storyShare) * storyStops[nextBeat];
    // Exactly the same path as scrolling by hand: only scrollY changes.
    glide(storyRange.start + destination * (storyRange.end - storyRange.start), 850, function () { sync(); });
  });

  // "let’s break one down" delivers the breakdown: it drives to the end of the flight.
  // Each subsequent invitation advances that same scroll. Already broken? Rewind to
  // the start of the zone and run the flight again.
  button && button.addEventListener('click', function () {
    if (!geo) return;
    var g = scrubRange();
    var flightDone = progress >= (geo.Wf || 0.3) + 0.05;
    if (flightDone) {
      glide(Math.max(0, g.start), 400, function () {
        glide(scrubRange().flightEnd, GLIDE_MS, focusContinuation);
      });
    } else {
      var len2 = g.flightEnd - g.start;
      var frac = len2 > 0 ? clamp((g.flightEnd - window.scrollY) / len2, 0, 1) : 0;
      glide(g.flightEnd, Math.max(450, GLIDE_MS * frac), focusContinuation);
    }
  });

  // ── "copy to figma" really copies ──
  // An SVG of the current teardown goes to the pasteboard; ⌘V in Figma lands it
  // as editable layers. Success then invites the visitor to try their own recording.
  // On touch there is no pasteboard story: the button emails the page to your mac.
  var CHIP_OFF = [0, 12, 8];
  var touchMedia = matchMedia('(hover: none) and (pointer: coarse)');
  var coarse = touchMedia.matches;
  var ctaLabel = document.getElementById('ctalabel');
  function updateExampleAction() {
    coarse = touchMedia.matches;
    if (ctafig) {
      var icon = ctafig.querySelector('.store-icon');
      if (icon) icon.src = coarse ? 'assets/mail-icon.png' : 'assets/figma-icon.png';
    }
    if (ctaLabel) ctaLabel.textContent = coarse ? 'Send it to me' : 'Copy this example to Figma';
    render(progress);
  }
  touchMedia.addEventListener('change', updateExampleAction);
  updateExampleAction();

  function imgData(im) {
    return new Promise(function (res, reject) {
      var timeout = setTimeout(function () { fail(); }, 10000);
      var cleanup = function () {
        clearTimeout(timeout);
        im.removeEventListener('load', go);
        im.removeEventListener('error', fail);
      };
      var fail = function () { cleanup(); reject(new Error('Screen image unavailable')); };
      var go = function () {
        cleanup();
        try {
          var cv = document.createElement('canvas');
          cv.width = im.naturalWidth; cv.height = im.naturalHeight;
          cv.getContext('2d').drawImage(im, 0, 0);
          res(cv.toDataURL('image/jpeg', 0.85));
        } catch (err) { reject(err); }
      };
      if (im.complete) { if (im.naturalWidth) go(); else fail(); }
      else { im.addEventListener('load', go, { once: true }); im.addEventListener('error', fail, { once: true }); }
    });
  }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function teardownSVG() {
    var r = RECORDINGS[current];
    return Promise.all(cards.map(function (c) { return imgData(c.querySelector('img')); })).then(function (uris) {
      var s = ['<svg xmlns="http://www.w3.org/2000/svg" width="680" height="580" viewBox="0 0 680 580" fill="none">', '<defs>'];
      for (var i = 0; i < 3; i++) s.push('<clipPath id="scr' + i + '"><rect x="' + (i * 240) + '" y="66" width="200" height="433" rx="19"/></clipPath>');
      s.push('</defs>');
      for (var i = 0; i < 3; i++) {
        var x = i * 240, f = r.feelings[i], off = CHIP_OFF[i], fd = FEELINGS[f[0]];
        s.push('<rect x="' + (x + 54) + '" y="' + (6 + off) + '" width="92" height="24" rx="12" fill="#FFFFFF" stroke="#D9D9DE"' + (f[1] ? ' stroke-dasharray="4 3"' : '') + '/>');
        s.push('<g transform="translate(' + (x + 58) + ' ' + (8 + off) + ')">' + faceParts(fd, fd.inkHex) + '</g>');
        s.push('<text x="' + (x + 82) + '" y="' + (22 + off) + '" font-family="SF Pro Text, Inter, sans-serif" font-size="13" fill="#1C1C1E">' + esc(f[0]) + '</text>');
        s.push('<text x="' + x + '" y="58" font-family="SF Pro Text, Inter, sans-serif" font-size="12" fill="#8E8E93">Screen ' + r.screenNumbers[i] + '</text>');
        if (uris[i]) s.push('<image x="' + x + '" y="66" width="200" height="433" clip-path="url(#scr' + i + ')" href="' + uris[i] + '"/>');
        s.push('<rect x="' + x + '" y="66" width="200" height="433" rx="19" stroke="#00000022"/>');
        s.push('<rect x="' + (x - 9) + '" y="511" width="236" height="42" rx="9" fill="#FFFFFF" stroke="#E3E3E8"/>');
        s.push('<text x="' + x + '" y="526" font-family="SF Pro Text, Inter, sans-serif" font-size="9" font-weight="600" fill="#FF9500">' + esc(r.notes[i][0]) + '</text>');
        s.push('<text x="' + x + '" y="542" font-family="SF Pro Text, Inter, sans-serif" font-size="11" fill="#1C1C1E">' + esc(r.notes[i][1]) + '</text>');
      }
      s.push('</svg>');
      return s.join('');
    });
  }

  ctafig && ctafig.addEventListener('click', function (e) {
    if (coarse) {
      e.preventDefault();
      // download.js opens the email dialog and remembers this exact trigger.
      return;
    }
    e.preventDefault();
    if (copyPending) return;
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      copyFailure = 'Clipboard access isn’t available in this browser.';
      render(progress);
      return;
    }
    var attempt = ++copyAttempt, recording = current;
    copyPending = true;
    copyFailure = '';
    render(progress);
    teardownSVG().then(function (svg) {
      if (attempt !== copyAttempt || recording !== current) return;
      // Promise chaining handles both a synchronous throw and a rejected write.
      return navigator.clipboard.writeText(svg).then(function () {
        if (attempt !== copyAttempt || recording !== current) return;
        var hadFocus = document.activeElement === ctafig;
        copiedRecording = recording;
        copyPending = false;
        var shortcut = /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘V' : 'Ctrl+V';
        copyConfirmation.textContent = 'Copied. Open Figma and paste with ' + shortcut + '.';
        render(progress);
        if (hadFocus && !postCopy.hidden) yourTurn.focus({ preventScroll: true });
      });
    }).catch(function () {
      if (attempt !== copyAttempt) return;
      copyPending = false;
      copyFailure = 'Couldn’t copy. Try again with this page in focus.';
      render(progress);
    });
  });

  // ── free grabbing: on the open canvas, the cards are really draggable ──
  cards.forEach(function (c, i) {
    c.addEventListener('pointerdown', function (e) {
      if (!stage || !stage.classList.contains('canvasmode')) return;
      e.preventDefault();
      var sx = e.clientX, sy = e.clientY, ox = drags[i].x, oy = drags[i].y;
      try { c.setPointerCapture(e.pointerId); } catch (e2) {}
      function move(ev) {
        drags[i].x = ox + ev.clientX - sx;
        drags[i].y = oy + ev.clientY - sy;
        render(progress);
      }
      function up() {
        c.removeEventListener('pointermove', move);
        c.removeEventListener('pointerup', up);
        c.removeEventListener('pointercancel', up);
      }
      c.addEventListener('pointermove', move);
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
    });
  });

  function armOnce() {
    document.body.classList.add('armed');
    buildXtras();
    measure();
    if (!geo) { document.body.classList.remove('armed'); return; }
    sync(true);                      // restore the scene after measuring
  }

  picks.forEach(function (b, i) {
    b.addEventListener('click', function () {
      if (i === current) return;
      // Selecting swaps the recording in place. Progress belongs to the scroll
      // position alone, so the new screens appear at exactly the state the page
      // is scrolled to — nothing plays, nothing rewinds, nothing moves the page.
      picks.forEach(function (b) { b.querySelector('img').style.opacity = '1'; });
      applyRecording(i);
      requestAnimationFrame(function () { measure(); render(progress); });
    });
  });

  addEventListener('resize', function () { measure(); sync(true); });

  // Only rewind once the real layout is settled, so the end state is never
  // replaced by a half-measured one.
  picks.forEach(function (b) {
    var im = b.querySelector('img');
    if (im && !im.complete) im.addEventListener('load', function () { measure(); sync(true); });
  });

  if (document.readyState !== 'loading') armOnce();
  else addEventListener('DOMContentLoaded', armOnce);

  // Warm the other recordings' screens after load, so the first selection swap
  // never shows an empty card while its image arrives.
  addEventListener('load', function () {
    RECORDINGS.forEach(function (r, i) {
      if (i === current) return;
      for (var n = 1; n <= 3; n++) {
        new Image().src = 'assets/' + r.slug + n + '.jpg';
        new Image().src = 'assets/' + r.slug + n + '@2x.jpg';
      }
    });
  });
})();
