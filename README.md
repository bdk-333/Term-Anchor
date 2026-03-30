# Term Anchor

A local-first daily command center for students: anchor countdown, term progress, renameable task lanes, weekly planner with drag-and-drop, habits, and streaks.

## Where your data lives

- **Local server (recommended):** Run the app with **`Start-TermAnchor.cmd`** (Windows) or **`npm start`** after a build. Your progress is saved in **`data/term-anchor-state.json`** next to the project. The app is served at **http://127.0.0.1:8787/** so **Edge, Brave, Chrome, or any browser** can use the **same file**—switch browsers without starting over. You do not need PowerShell as Administrator.
- **Static hosting / no server:** Data stays in the browser (`localStorage`). Use **Settings → Export JSON** for backups.

## Easiest way to run (Windows)

1. One-time: install [Node.js](https://nodejs.org/) (LTS).
2. One-time in this folder: `npm install` then `npm run build`.
3. Double-click **`Start-TermAnchor.cmd`**. Your default browser opens the app. Leave the window open while you use Term Anchor; closing it stops the server.
4. **Pick a specific browser:** start with the `.cmd` as above, then right‑click **`Open-Term-Anchor.url`** → **Open with** → choose Brave, Firefox, etc. (The server must already be running.)

Change the port with the environment variable **`TERM_ANCHOR_PORT`** (default `8787`). If you change it, edit the URL inside `Open-Term-Anchor.url` to match.

## Develop locally

```bash
npm install
npm run dev
```

`npm run dev` uses the same **`data/term-anchor-state.json`** API as the production local server, so dev and “double-click” runs share one data file when you use the same project folder.

## Other launchers

- **PowerShell:** `.\Start-GradSprint.ps1` (starts server + opens the app).
- **macOS:** `chmod +x start-grad-sprint.command`, then double-click it (opens default browser after a short delay).

## Production build

```bash
npm run build
npm start
```

Static output is in **`dist/`**. The Node script **`scripts/term-anchor-server.mjs`** serves `dist/` and reads/writes **`data/term-anchor-state.json`**.

## Backup and restore

Open **Settings** in the app → **Export JSON** / **Import JSON**. Import replaces the current saved state (the disk file when using the local server, otherwise the browser copy).

## Tech stack

Vite, React, TypeScript, Tailwind CSS v4, React Router, date-fns, @dnd-kit.

## Roadmap (v1.1)

Commute / day-type planner and life / exploration list (bucket-style places and events).
