# Landing page — v2

A standalone static landing page. No build step, no dependencies: three files and a folder
of images. Built to drop into the Pages repo at a **`/v2` path** so it sits alongside the existing
support and privacy pages rather than replacing the index, which the App Store listing points at.

```
python3 -m http.server 8777    # then open http://localhost:8777/
```

Deploy by copying this folder into `BenCoDev/flow-breakdown-site` as `v2/`, giving
`https://bencodev.github.io/flow-breakdown-site/v2/`.

## The design

**Current casing rule.** Short narrative headings and captions stay lowercase, while proper
names keep their spelling: **Figma**, **Mac**, **Flow Breakdown**, and **App Breakdown**.
Controls use sentence case: **How it works**, **Let’s take a closer look**, **Copy this example
to Figma**, **Get it on the Mac App Store**, **A few practical details**, and **Send a link to
my Mac**. Practical body paragraphs and reminder helper sentences also stay in sentence case.
The inspiration credit remains the narrative aside **inspired by App Breakdown ↗**.

### Download CTA and mobile email handoff

`download.js` owns the download CTAs independently of animation/reduced motion.
Following HeyClicky's pattern, touch devices below 1024px see **Send it to me** on the
text CTAs and open a native email dialog; desktop sees **Get it on the Mac App Store**.
The header uses the Mac App Store badge on both sizes, with an accessible label describing
the appropriate action. Narrow desktop windows keep the desktop behavior. The close section
also offers an email link on desktop.

**The live download URL is not connected:** `DOWNLOAD_URL` is currently empty. The earlier
`example.com` DMG URL remains only in Figma as a prototype placeholder, not a live download.

**Connections still required:** set `DOWNLOAD_URL` to the real public Mac App Store URL
and optionally `EMAIL_ENDPOINT` to a transactional email service endpoint. No release
was published in the app repository when this was implemented. Until configured, the
desktop CTA explains that the link is unavailable and offers a reminder. Email currently
opens a prefilled draft addressed to the visitor; it does not claim an email was sent.
Drafts link to the public v2 page, never localhost.

An email endpoint must accept `{ email }`, validate and rate-limit server-side, send the
configured download link, and return `{ delivered: true }` only on accepted delivery.
Keep credentials on the server. GitHub Pages cannot run this endpoint itself.

Checked: dialog at 390px, Escape/focus return, syntax, and mocked mobile/desktop routing,
email validation/encoding, public URL, and missing-release behavior. Actual email delivery
and a real app download remain pending those connections.

The page *is* a Flow Breakdown canvas — dotted background, the app's own Glass tokens, and the site
nav rendered as a macOS menu bar (honest here, because it is a Mac app). Prompted by
[heyclicky.com](https://www.heyclicky.com/); see `docs/landing-design.md` for what was and wasn't
borrowed.

**Copy B refinement · 21 September 2026.** The hero restores the direct promise
**screen recording in. Figma teardown out.**, supported by “that onboarding you just tried.
that interaction you want to show your team.” The bevel and quiet **Let’s take a closer look**
action lead into the demo. Download remains in the menu bar; there is no app icon or download
button in the hero. The aside now says **a flow worth keeping.**, with a quieter App Breakdown
inspiration credit and no portrait or claim that the library belongs to Jose.

The redundant **three steps, then it’s a board** band is removed. The menu's **How it works**
link now points to `#zone`; the demo leads directly to practical questions about local processing,
macOS 26 or later, Figma layers, optional voice, and price. Silent recordings still become a board;
voice analysis maps the visitor's own reactions rather than claiming to judge the interface.

**CTA shapes · 21 September 2026.** The header uses Apple's unmodified
[Mac App Store SVG badge](https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-mac-app-store.svg)
at its 156.1 × 40 proportion, inside a 44px hit area. See Apple's
[marketing guidelines](https://developer.apple.com/app-store/marketing/guidelines/).
The header has a 64px minimum height (65px with its current content, padding, and border).
Other filled buttons use a 10px radius; download actions are dark, while the example-copy action
stays blue. Scoping the picker checkmark to `.cell .mark` prevents its positioning styles from
displacing the app icon in the navigation.

The closing headline is **next time, don’t leave it in your camera roll.** with no supporting lede.

The credit under the roll is an **aside**: SF Pro Rounded (`ui-rounded`), seated in the tail of the
bevel's dissolve where nothing shows through. Higher up it lands on photographs and is unreadable.

The bevel's wash is the app's recipe with one change: `white.opacity(.4 → .18)` reads on a frosted
window but vanishes on this light canvas, so it mixes `--surface` 92% → 62% instead.

## The animation

### Narrative continuations

The walkthrough reads **asset → narrative → next step**. Narrative captions use 16px regular
primary text; continuation links use 14px regular secondary text, with a small arrow and an
invisible 44px target. Hover adds contrast and an underline. Filled buttons are reserved for
copying the example and downloading the app. The hero promise stays above the first asset.

The hero's **Let’s take a closer look ↓** and the continuation beneath each caption use
quiet text styling. The same continuation button changes with scroll position:
**Talked while recording? → And how did it feel? → Add your own take → Show your team**.
Each click moves scrollY through the existing driver, stopping at story progress
`q = .26, .58, .86, .98`; manual scrolling and scrolling back produce the same states.
The final stop exposes **Copy this example to Figma**. No step counter or second
animation driver is involved. Real gestures still cancel a glide.

| Scene | Caption |
| --- | --- |
| Extracted screens | the key screens, pulled out for you. |
| Voice notes | what you said, next to the screen you said it about. |
| Feelings | your reactions, mapped across the flow. |
| Open canvas | move things around. circle something. leave a thought. |
| Finished teardown | now you’ve got something to talk through together. |

Hidden actions are excluded from keyboard focus. The initial glide moves focus to
the continuation without scrolling again; the last step hands focus to Copy this example to Figma.
Reduced motion keeps the static board and does not show these animated-story controls.
Captions wrap on narrow screens; continuations retain a 44px tap target. Short desktop
windows allow the top of the tall stage to scroll away so the footer remains reachable.

Ported from `macos/Sources/FlowBreakdown/Views/ExtractionScene.swift`, which is itself a port of a
web original — the source says *"a uniform scale around its top-left, like the web version's FLIP."*
Every property animated is `transform` or `opacity`.

| | |
| --- | --- |
| lift | `cubic-bezier(0.2, 0.75, 0.25, 1)`, 760 ms |
| morph / settle | `cubic-bezier(0.32, 0.72, 0, 1)`, 360 ms |
| stagger | 120 ms, first card at 360 ms |
| squash | 0.985 over 130 ms, each way, as each card lands |

**The one name you must not reuse: `SETTLE`.** It is the flight's settle *window*
(`[0.66, 0.83]`, progress units) at the top of `app.js`. A second `var SETTLE = 60` added further
down for the scroll-trigger delay landed in the same function scope and won, so `SETTLE[0]` and
`SETTLE[1]` became `undefined`, the settle term collapsed to 1, and **every card's translate and
scale zeroed out** — the cards stopped flying out of the phone and simply faded into place. It
still parsed, still ran, still reached a correct end state, and every end-state check passed.
When touching this file, grep for duplicate `var` names in the IIFE before trusting a green run —
the local `len` in `sync()` and the button handler are named that (not `span`) for this reason.
| card | radius 19, border `black 0.08`, shadow `0 8px 22px rgba(0,0,0,.12)` |

**Structure.** The board is rendered in its **end state** in HTML. `app.js` measures that layout
once, and the scroll position drives it between 0 (folded into the selected thumbnail) and 1 (the
end state). That means the page is true with no JS,
before hydration, and to a crawler — the animation is an enhancement, never a prerequisite.

**The roll is a real picker.** The three cells of the first row are `<button>`s with
`aria-pressed`. Each is hard-wired to its own three screens, feelings and voice notes
(`RECORDINGS` in `app.js`); picking one swaps all of it and re-renders at the current scroll
state. The FLIP origin follows the selection, so the
cards fly out of whichever cell is picked — there is no fixed `id` for it. **If you restructure the roll markup, keep `.cell.pick` and the `img` inside it**: the
script guards on `picks.length` and returns silently if they are missing, which looks exactly like
"the animation is broken" with a clean console.

**The cards start as the thumbnail.** The selected cell is measured with `getBoundingClientRect()`;
each card's start transform is derived from it, and a `clip-path` inset opens the square thumbnail
into a tall screen over the first 140 ms of its flight.

**Only the used thumbnail dims — never the bevel.** Once the cards have flown, the cell they came
from drops to 32 % and the rest of the roll stays at full strength, which is what Figma does. An
earlier build dimmed the whole phone to 0.3; at full size that reads as a rendering fault, not as
"this one is spent". The dim follows the selection, so picking another recording restores the
previous one. **The selection mark itself never fades** — the script does not touch `.mark` at
all; the check stays at full strength on top of the dimmed thumbnail, so the picker always reads
as a picker.

**Progress is ATTACHED to the scroll position — not fired by it.** `p` is a pure function of
where the page is. Scroll fast and the breakdown fast-forwards; scroll slowly and it plays at your
pace; scroll back up and it rewinds. Nothing can be missed by scrolling too fast, because the
state *is* your position — and autoplay is impossible by construction, because nothing moves
unless the page moves. Resting mid-run is a legitimate state under this model: it reads as
paused-where-you-are, because it is.

The mapping, computed by `sync()` — the page's ONE scroll driver, rAF-coalesced. Motion's
`scroll()` used to drive this too and caused visible flicker: it updates on the compositor's
timeline while `sync` runs off the scroll event, and their `p` values disagree by a hair and a
frame, so every scrolled frame rendered twice with two slightly different states. Motion is gone
from the page entirely (147 KB lighter). **A scroll-attached `p` must have exactly one writer.**

| p | when |
| --- | --- |
| 0 | the board's top reaches 85 % down the viewport (`'start 0.85'`) |
| 1 | the board's bottom reaches the viewport bottom (`'end 1'`) |

**Two words, two materials — do not mix them.** *Liquid glass* is the frost-blur material;
*canvas* is the app's cream-with-dots surface. The page rests on liquid glass: `body::before` is
a fixed colour field, `body::after` is a fixed frost sheet — real `backdrop-filter: blur(70px)`
over it, bodied by `--milk` (white .5 light, smoke .55 dark). The dot grid is deliberately NOT
on the page: dots are the canvas's identity, and the canvas is the container that arrives in
beat 4 — `#glass` (historical name) is cream `--canvas` + the dot grid, lifted by an ambient
shadow. The teardown literally lands on the app's own surface, sitting on the glass page.
(iOS ignores `position: fixed` backdrop tricks less than `background-attachment`, but mobile
remains untested.)

That is ~440 px of scroll on a desktop window — short enough that an ordinary scroll-through sees
the whole flight, long enough to have real texture.

## The story (beats 2–5)

After the flight, the page keeps going — and it **accretes**: the flight delivers the FRAMES
ONLY, then each beat adds its own layer. Voice notes arrive in beat 2 (and stay), feeling chips
and the lane arrive in beat 3 (and stay), and beat 4 gathers everything onto the canvas. Bumps
(`bump()`) are reserved for lenses that come and go — the audio focus card, the chip emphasis
pop — while arrivals are one-way spans. Do not key chips/notes/lane back to `pf`: a flight that
ends with a fully-dressed board makes the beats read as re-showing things already seen. The
board (plus all its overlays) lives in `.stage`, which is `position: sticky` inside `.storyzone`.
During the flight the stage is still in normal flow — the FLIP deltas to the phone hold exactly as
before — then it pins at `--stagetop` (64 px) and ~2 400 px of slack drives the beats. One `p`
over the whole zone (`Motion.scroll` targeting `#storyzone`, `['start 0.85','end 1']`); `measure()`
computes `Wf`, the share of the range spent flying, and `render()` splits: `pf = span(p,0,Wf)` is
the old flight untouched, `q = span(p,Wf,1)` feeds the beats.

| beat | window of `q` | driver |
| --- | --- | --- |
| voice | 0.06–0.33 (bump) | `V` — focus card w/ waveform + big quote; board recedes |
| feelings | 0.36–0.61 (bump) | `F` — chips scale 1.45, lane forward, notes recede |
| canvas | 0.66→ (stays) | `C` — the app's cream-dotted canvas container arrives, layers scatter |
| annotations | 0.74→ (stays) | `A` — ring, arrow (dash-draw), scribble |
| end game | 0.87→ (stays) | `G` — marquee + per-layer blue outlines + copy-to-figma CTA |

Captions are five stacked `.scap` pills, each opacity-keyed to its beat — reversible like
everything else. `bump()` (in-and-out) vs one-way spans is the difference between a lens (voice,
feelings) and an arrival (canvas onward). The scatter composes additively onto the flight
transforms, so the two never fight: during flight `C` is 0; during beats `pf` contributes 0.

**The sticky slack must be in-flow content.** A sticky element travels within its parent's
CONTENT box — `padding-bottom` on the zone gives it no room and the stage silently never pins
(the beats all play above the viewport, which reads as "the story is broken"). The slack is
`.armed .storyzone::after { height: 2400px }` — armed-only, so the no-JS page has no dead scroll.

**On the open canvas the cards are really draggable** (`pointerdown` + capture, offsets ride on
top of the scatter in `render()`), active only in `.canvasmode` (C > 0.5). `setPointerCapture` is
wrapped in try/catch — an inactive pointerId throws and would silently kill the handler.

**The focus card follows the picker**: `applyRecording` writes `notes[1]` into it, and a selection
resets drag offsets.

The **voice band is gone** from the page — beat 2 demonstrates it. Its reassurance line lives on
as the **voice is optional** row in the practical bits: “No voiceover needed. Silent recordings
still become a board.” The close section owns `id="download"`; download routing remains in
`download.js`, including its missing-link reminder while the store URL is unconnected.

**"Copy this example to Figma" really copies.** On fine-pointer devices the click builds an SVG of the current
teardown — the three screens embedded as JPEG data-URIs, chips, labels, voice notes — and puts it
on the pasteboard (`teardownSVG()` in `app.js`); ⌘V in Figma lands it as editable layers. The
successful copy reveals **"copied. open Figma and paste with ⌘V."**, **"now your turn."**,
and **"try it with your own recording."** The shortcut changes to Ctrl+V on other desktop
platforms. A dark **Get it on the Mac App Store** button and a quiet **A few practical details ↓**
link to `#get` continue the story. The footer reserves that space
beforehand: copying does not move the canvas or scroll the page. The confirmation returns when
the visitor scrolls back to this scene; selecting another recording clears it. Keyboard focus
moves to the new heading without scrolling.

Pending copies ignore duplicate clicks. Missing images, unavailable clipboard access, and both
synchronous throws and rejected writes show an inline error and leave the copy action available
to retry. A recording switch invalidates any pending attempt. Caveats: Figma substitutes the
font unless the paster has SF Pro; the SVG mirrors the board's geometry (680×580), not the app's
exact export. On **coarse pointers** the button reads "Send it to your Mac" and opens the existing
email reminder dialog. Its submit action opens a prefilled draft; it does not send mail.

**Hovering the CTA summons the team.** Three Figma-multiplayer-style cursors (mia, sam, leo —
purple/green/coral) fade in around the button and idle with slow drifts, waiting for the paste.
Hover-gated (`hover:hover and pointer:fine`), stilled under reduced motion, `aria-hidden`. The
names and colours are invented; change them in `index.html` if anyone real objects.

**“Let’s take a closer look” DRIVES the scroll.** One decisive **ease-out** glide (cubic, `GLIDE_MS` =
1100 ms full-range; partial runs scale down) from wherever the page is to the end of the zone:
fast off the line — the tap wants the payoff — then decelerating, so the chips and notes land in
the slow tail. (A linear drive at the timeline's own 2120 ms tempo was tried first and read as too
slow.) If the board is already broken down, the button rewinds to the zone start first and runs it
again. Two implementation facts that will bite anyone who touches this:

- Every per-frame position is set with `scrollTo({ behavior: 'instant' })`. The stylesheet has
  `html{scroll-behavior:smooth}` for the menu anchors, and without the override the browser
  re-animates *each* frame's position — the drive crawls, then the browser finishes the ride at
  its own pace. Measured before the fix: the last 340 px happened in 800 ms on their own.
- **Any real gesture cancels the glide instantly** (`wheel`, `touchstart`, `keydown`,
  `pointerdown` bump `glideId`). The page belongs to the visitor; their scroll takes over the
  same attached state with no jump, since both were only ever writing scroll position.

**Selecting a recording swaps it in place.** Progress belongs to the scroll position alone, so the
new screens appear at exactly the state the page is scrolled to — at p 0 an empty canvas, at p 1 a
finished board. Nothing plays, nothing rewinds, nothing moves the page. The selection mark is
never hidden and the used-thumbnail dim follows `p` like everything else, so it undoes itself when
you scroll back up.

**Anchor jumps are coherent now, not dangerous.** `#get` scrolls past the zone, so the board
completes en route — and scrolling back up rewinds it. Under the fired model those same jumps
either burned the play or autoplayed it; under the attached model there is nothing to burn.
The navigation's **How it works** link points to `#zone`, the start of the demonstration.

**The trade to know about:** a visitor who never scrolls and never taps sees the *before* state —
the roll and the labelled empty canvas — and that is fine: the page is honest at every scroll
position, and the button is the invitation.

**The empty board names itself.** At rest the three slots are faint dashed outlines, and on a short
window that is all fine — the fold cuts them off a few pixels in and they read as content
continuing below. On a tall window (roughly 960 px and up) the whole empty row sits above the fold
with nothing in it, which reads as three images that failed to load. So `#waiting` — *"your screens
land here."* — sits at the board's centre and leaves as the first card lifts (`p` 0 → 0.08). It is
on a **plate** (surface fill, hairline border, pill radius) deliberately: centred without one, it
reads as a caption belonging to the middle slot rather than a note about the whole canvas.

It is `opacity:0` in CSS and only `.armed .waiting` turns it on, so the **no-JS page — which is
already the finished board — never shows a plate promising screens that are right there.** Do not
give it a non-zero base opacity.

The plate is driven by `p` like everything else, so it also returns when the board is rewound.

Other guards: the tab must be visible (`visibilitychange` retries); the hero is re-checked at fire
time in case it moved away during the settle; and `settle()` jumps to the end state if it is ever
scrolled past unplayed, so it is never left half-flown.

**It plays once and never rests mid-run.** Scrubbing on scroll could not promise that: on a tall
desktop the whole extract fits on screen, so the scroll range never completes and the board freezes
half-flown — and stopping mid-scroll does the same. So it fires once and runs start to finish. The
only states it rests in are 0 and 1. The observer uses `threshold: 0` and the real decision is made
in `inView()` against the viewport — a ratio threshold silently never fires when the element is
taller than the screen.

**Every card asset is cut to one ratio.** 400 × 866 (and 520 × 1126 @2x) = **2.165**, which is
433/200 — Figma's card, and the real iPhone ratio. `--card-ratio` derives the box from the same
number, so `object-fit: cover` has nothing left to crop. The RunBuds screens are cropped 6 px in
from the Figma export first, because the node bounds include its stroke and shadow bleed
(232 × 488, not the 220 × 476 of the screen itself).

**Sizes come from Figma, not from the viewport.** The board is 200 × 433 cards with a 40 px gap,
236 × 35 voice notes and 24 px feeling chips — the app's own metrics. An earlier build pinned the
extract to one viewport, which forced all of that to roughly half size; the pin is gone for exactly
that reason. Nothing derives progress from scroll position any more, so there is no height ceiling
and desktop and small screens share one code path.

**One timeline, one driver, one code path.** Scroll writes the position; the button writes the
position; `render(p)` is the only thing either of them touches. No pinning, no separate mobile
branch, no play-once state machine.

`prefers-reduced-motion: reduce` short-circuits the whole script and leaves the end state.

## Before this can be published

- [ ] **Download links land on the close section** (`#download` exists now) but there is still no
      release or App Store URL behind the "download for mac" button.
- [ ] **Third-party app screens.** The roll shows Monzo, Oura, The Outsiders, FotMob, Liven, Tolan,
      Alan and Rodeo, sourced from Mobbin with its footer cropped. Fine as placeholders; publishing
      is a rights decision. `decisions.md` already bars naming Mobbin.
- [ ] **Jose's name and photo.** Cleared by Ben (2026-09-19). The hero credits the roll to him with
      his channel avatar and a link to [App Breakdown](https://www.youtube.com/@appbreakdownshow).
      Two things to check before this is public:
      **the spelling** — "Jose" comes only from Ben; the channel shows no personal name anywhere,
      so it could not be verified; and **the photo** — it is his YouTube avatar, captured from the
      channel page. If he has a preferred headshot, swap `assets/jose.jpg`.
      The credit deliberately reads *"a roll like Jose's"* and carries **no quote or endorsement** —
      the screens shown are not his actual recordings, and he has not said anything about the app.
- [ ] **Mobile is untested on a device.** The breakpoint could not be exercised in this environment —
      `resize_window` reported success but the viewport never changed. The desktop path was verified
      in a real browser; the mobile branch has only been reasoned about. Test it on a phone first.
- [ ] Replace the maker's note in the closing section if Ben wants his own wording.
- [ ] **Voice notes for The Outsiders and Oura are invented.** Plausible designer reactions, not
      anything anyone said — the same status as the RunBuds ones, which come from the app's sample.
      Fine as illustration; do not let them read as testimony.
- [ ] **Six more third-party screens** were added for those two recordings (Mobbin, footer cropped),
      so the rights question above now covers fourteen screens across three apps.
