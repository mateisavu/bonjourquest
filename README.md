# Bonjour Quest — The Lost Lexicon

A browser-based 2D adventure for learning beginner French. Explore three worlds, collect coins, avoid rolling hazards, and answer French quizzes to unlock nine gates.

## Play

https://bonjour-quest-matei11.vercel.app

## Controls

- Move: arrow keys or A / D
- Jump: Space (release early for a shorter jump)
- Climb ladders: Up / W or Down / S
- Pause / resume: Escape or the Pause button (the game also pauses when you switch tabs)
- Open a nearby gate: E (gates also open automatically when reached)
- Touch controls include separate move, jump, climb-up, and climb-down buttons. Hold movement and jump together to cross gaps.

## Run locally

Serve this directory with any static HTTP server. No build or dependencies are required. The entry point is `index.html`.

## Files

- `index.html`: page and game interface
- `style.css`: responsive layout and theme
- `game.js`: canvas rendering, platform movement, French lessons, and progression
- `physics.js`: fixed-step movement, forgiving jump input, and ladder / platform collision
- `check-physics.cjs` and `check-adventure.cjs`: dependency-free gameplay checks; run each with Node.js from the repository root

XP, unlocked chapters, opened checkpoint gates, and collected coins are saved in the current browser's local storage. Losing all hearts returns you safely to the latest checkpoint. Restart level resets that chapter's gates and coins after confirmation, while keeping earned French XP. Older learning progress is preserved when upgrading. Google Fonts are optional; system font fallbacks are provided.

## Deploy on Vercel

Import this repository using the Other framework preset. Leave build and install commands empty and serve the repository root. Set the production branch to `main`.




## Metadata and crawler checks

Run from the repository root with Node.js (no dependencies):

```text
node check-metadata.cjs
```

This checks the canonical URL, Open Graph fields, title/description consistency,
share-image declaration, and crawler files. It also checks representative broken
metadata and crawler cases. The sitemap lists only the deployed homepage;
chapters are game states, not separate URLs.

The share image is pending a real path or public URL from the site owner.
Until it is supplied, the complete check intentionally fails for missing
`og:image`. To verify the rest while explicitly deferring that requirement:

```text
node check-metadata.cjs --allow-missing-image
```

Once supplied, use an absolute HTTPS `og:image` URL and accurate `og:image:alt`.
An image hosted on this deployment must also exist in the repository. For a
remote image, the check validates its URL declaration, not its availability or
contents; verify those separately. Do not add guessed image URLs.

## Accessibility checks

Run `node check-physics.cjs` and `node check-adventure.cjs` from this directory.
The adventure checks include state-derived text, focus-scoped keyboard input,
quiz retry focus and Tab cycling, pause/resume focus, and reload synchronization.
They use a simulated DOM; actual browser checks are still needed.

At a 320px viewport, use Tab and Enter to start, arrows/Space on the focused
canvas to play, Escape to pause, and Tab to reach Text view of the game.
Verify arrows do not move the explorer when a page control has focus. At a gate,
verify Tab/Shift+Tab remain within the quiz, wrong answers focus an enabled
choice, and Continue returns focus to the canvas. Hearts, coins, XP, gates and
checkpoints are live text; changing spatial details are available in the text
view without per-frame live announcements. This is not a claim of full
screen-reader or nonvisual playability.

## Touch-control responsive checks

Serve this repository over HTTP using your existing local static server, then
open `/check-responsive.html` (for example,
`http://127.0.0.1:4173/check-responsive.html`). No packages or build are required.
The page loads the real game and styles at 280, 320, 360, 390, 600, 601, 800,
801, and 1024 CSS pixels. It checks all six controls, 48px minimum targets,
containment, overlap, label clipping, touch-action, and desktop visibility.
Deliberately broken geometry also verifies that the checker detects regressions.
The pointer media query reflects the browser running the checks; repeat on an
actual touch device to verify the coarse-pointer branch and physical multitouch.
The check reads layout without starting gameplay or resetting saved progress.

## Instruction checks

Run `node check-instructions.cjs` for supported-control coverage and accessible
heading associations. Open `/check-responsive.html` on a local HTTP server for
rendered instruction visibility, labels and overflow checks at all nine widths.
These checks use built-in Node/browser APIs; no dependencies are required.

## Grouped instruction checks

Run `node check-instructions.cjs` from the repository root. It checks labelled
keyboard/touch instruction groups, every supported key, touch gestures, quiz
and checkpoint guidance, and preservation of all six touch controls.
The browser-based `/check-responsive.html` check additionally verifies that
the instruction groups are visible, labelled, and unclipped at all nine widths.
