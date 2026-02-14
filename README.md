# Words Frame

Minimalist offline-first PWA for cycling word pairs on screen (like a digital frame).

## Features

- Upload CSV with word pairs
- Infinite loop with configurable interval
- Start / Pause / Prev / Next
- Shuffle list
- Swap Sides (swap shown words between top/bottom lines)
- Board Mode (hide controls, tap to next, long tap or double tap to exit)
- Manual font size controls for top and bottom lines
- Local persistence via `localStorage`
- Works offline after first load (Service Worker)

## Tech Stack

- Vanilla HTML/CSS/JS
- No frameworks, no build tools, no dependencies
- Designed for old Safari devices (including iOS 12.5 constraints)

## CSV Format

Only one format is supported:

- 2 columns: `KNOWN,LEARNING`

Details:

- Delimiter auto-detect: `,` or `;`
- Quoted CSV values are supported (`"..."`, `""` escape)
- Empty lines are ignored
- Header is **not** skipped automatically

## Controls

- `Upload CSV` - import file
- `Clear CSV` - remove loaded list from app state
- `Start` / `Pause`
- `◀` / `▶`
- `Shuffle`
- `Swap Sides`
- `Interval`
- `Known size` / `Learning size`
- `Board Mode`

## Data Stored Locally

- `wf_words_v1` - parsed words list
- `wf_index_v1` - current index
- `wf_interval_v1` - selected interval
- `wf_board_v1` - board mode flag
- `wf_swap_v1` - swap sides flag
- `wf_size_known_v1` - top line size setting
- `wf_size_learning_v1` - bottom line size setting

## PWA / Offline

Cached assets are defined in `sw.js` (`ASSETS`) and served with cache-first strategy.

When updating app assets:

1. Update files
2. Bump cache version in `sw.js` (`CACHE`)
3. Commit and deploy

Current cache version: `words-frame-v3`.

## Run Locally

You can open `index.html` directly, but for best PWA behavior use a static server, for example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy to GitHub Pages

1. Push project to GitHub repository (`main` branch).
2. Open `Settings -> Pages`.
3. Set:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
4. Save and wait for publish.

Site URL will be:

`https://<username>.github.io/<repo-name>/`
