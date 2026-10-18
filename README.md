# Bonjour Quest — The Lost Lexicon

A browser-based 2D adventure for learning beginner French. Explore three worlds, collect coins, avoid rolling hazards, and answer French quizzes to unlock nine gates.

## Play

https://bonjour-quest-matei11.vercel.app

## Controls

- Move: arrow keys or A / D
- Jump: Space, Up, or W
- Climb ladders: Up or W
- Open a nearby gate: E (gates also open automatically when reached)
- Touch controls are available on small screens.

## Run locally

Serve this directory with any static HTTP server. No build or dependencies are required. The entry point is `index.html`.

## Files

- `index.html`: page and game interface
- `style.css`: responsive layout and theme
- `game.js`: canvas rendering, platform movement, French lessons, and progression

XP and unlocked chapters are saved in the current browser's local storage. Google Fonts are optional; system font fallbacks are provided.

## Deploy on Vercel

Import this repository using the Other framework preset. Leave build and install commands empty and serve the repository root. Set the production branch to `main`.

