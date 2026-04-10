# Term Anchor

A local-first daily command center for students: anchor countdown, term progress, renameable task lanes, weekly planner with drag-and-drop, habits, streaks, and **integrated time tracking** (projects, tasks, timer, today’s totals).

## Where your data lives

- **Local server (recommended):** Run the app with **`Start-TermAnchor.cmd`** (Windows) or **`npm start`** after a build. Your progress is saved in **`data/term-anchor-state.json`** next to the project. The app is served at **http://127.0.0.1:8787/** so **Edge, Brave, Chrome, or any browser** can use the **same file**—switch browsers without starting over. You do not need PowerShell as Administrator.
- **Time tracking (local server only):** When you use **`npm run dev`** or **`npm start`**, the **Today** page talks to **`/api/time/*`** (timer, projects, tasks, totals). Data is stored in **`data/time-tracking.db`** (SQLite via Node’s built-in **`node:sqlite`**). There is no separate time app to run; static hosting or opening `dist/index.html` without the Node server **cannot** persist timer data.
- **Static hosting / no server:** Planner data stays in the browser (`localStorage`). The time section on **Today** shows a short message that the API is unavailable. Use **Settings → Export JSON** for planner backups.

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

`npm run dev` uses the same **`data/term-anchor-state.json`** API as the production local server, and the same **`/api/time/*`** endpoints as **`npm start`**, so dev and “double-click” runs share planner state and the time database when you use the same project folder.

## Other launchers

- **PowerShell:** `.\Start-GradSprint.ps1` (starts server + opens the app).
- **macOS:** `chmod +x start-grad-sprint.command`, then double-click it (opens default browser after a short delay).

## Production build

```bash
npm run build
npm start
```

Static output is in **`dist/`**. The Node script **`scripts/term-anchor-server.mjs`** serves `dist/` and reads/writes **`data/term-anchor-state.json`**, and handles **`/api/time/*`** for the Today page timer (SQLite under **`scripts/time-tracker/`**).

## Time tracking on Today

On **Today** (home), use **Start timer** on a lane task or the **Time tracking** section: create **projects** and **tasks** in the database, **Start** an entry, then **Pause**, **Resume**, and **Stop**. Starting another task stops the previous one at the current minute. **Tracked time today** shows minute-level totals for the local calendar day. Old links to **`/time`** redirect to **`/`**.

Requires **Node 22.5+** (for `node:sqlite`). No extra npm native modules.

## Backup and restore

Open **Settings** in the app → **Export JSON** / **Import JSON**. Import replaces the current saved state (the disk file when using the local server, otherwise the browser copy).

## Tech stack

Vite, React, TypeScript, Tailwind CSS v4, React Router, date-fns, @dnd-kit. Local APIs: file-backed state + **`node:sqlite`** for time tracking.

## Roadmap (v1.1)

Commute / day-type planner and life / exploration list (bucket-style places and events).
