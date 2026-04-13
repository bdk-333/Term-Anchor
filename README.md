# Term Anchor

A local-first daily command center for students: anchor countdown, term progress, renameable task lanes, **month planner** on Week (lane-colored day tiles, day-detail modal), habits, streaks, a **contribution-style streak heatmap** on Today, **sectioned daily log** (Cornell / outline / boxed notes, attachments), and **integrated time tracking** (lanes → projects → tasks, timer, today’s totals).

## Where your data lives

- **Local server (recommended):** Run the app with **`Start-TermAnchor.cmd`** (Windows), **`Start-TermAnchor.ps1`**, or **`npm start`** after a build. Your progress is saved in **`data/term-anchor-state.json`** next to the project. The app is served at **http://127.0.0.1:8787/** so **Edge, Brave, Chrome, or any browser** can use the **same file**—switch browsers without starting over. You do not need PowerShell as Administrator.
- **Time tracking (local server only):** When you use **`npm run dev`** or **`npm start`**, the **Today** page talks to **`/api/time/*`** (timer, projects, tasks, totals). Data is stored in **`data/time-tracking.db`** (SQLite via **`sql.js`**, WASM — no native compiler required). There is no separate time app to run; static hosting or opening `dist/index.html` without the Node server **cannot** persist timer data. **Backup:** copy **`data/time-tracking.db`** if you want to archive time entries; **Settings → Export JSON** does not include the SQLite file.
- **Static hosting / no server:** Planner data stays in the browser (`localStorage`). The time section on **Today** explains that the timer API needs the Node server. Use **Settings → Export JSON** for planner backups.

## Requirements

- **Node.js 18+** (LTS recommended). Time tracking uses **`sql.js`** (SQLite in WebAssembly), so **`npm install`** does not require Python, Visual Studio, or other native build chains for the timer database.

## Easiest way to run (Windows)

1. Install [Node.js](https://nodejs.org/) (LTS 18+).
2. Double-click **`Start-TermAnchor.cmd`**. On first use it runs **`npm install`** and **`npm run build`** automatically, then starts the server.
3. Your default browser opens the app. Leave the window open while you use Term Anchor; closing it stops the server.
4. **Pick a specific browser:** start with the `.cmd` as above, then right‑click **`Open-Term-Anchor.url`** → **Open with** → choose Brave, Firefox, etc. (The server must already be running.)

Change the port with the environment variable **`TERM_ANCHOR_PORT`** (default `8787`). If you change it, edit the URL inside `Open-Term-Anchor.url` to match.

## Develop locally

```bash
npm install
npm run dev
```

`npm run dev` uses the same **`data/term-anchor-state.json`** API as the production local server, and the same **`/api/time/*`** endpoints as **`npm start`**, so dev and “double-click” runs share planner state and the time database when you use the same project folder.

## Tests

```bash
npm test
```

Vitest runs a small suite over **`migrate`**, streak helpers, and related **`src/lib`** logic.

## Other launchers

- **PowerShell:** `.\Start-TermAnchor.ps1` (first-run install + build if needed, then server + browser).
- **macOS:** `chmod +x start-term-anchor.command`, then double-click it (opens default browser after a short delay).

## Production build

```bash
npm install
npm run build
npm start
```

Static output is in **`dist/`**. The Node script **`scripts/term-anchor-server.mjs`** serves `dist/` and reads/writes **`data/term-anchor-state.json`**, and handles **`/api/time/*`** for the Today page timer (SQLite under **`scripts/time-tracker/`**).

## Screenshots

There are no image assets in the repo by default. For docs or a store listing, capture locally:

| Suggested capture | What to show |
| ----------------- | ------------ |
| **Today** | Lanes, streak + heatmap, time section when API is up |
| **Week** | Month grid with lane bars + day modal |
| **Settings** | Export / import, anchor & term fields |

Save PNGs under e.g. **`docs/screenshots/`** (create the folder if you use it); it is optional and not required to run the app.

## Time tracking on Today

On **Today** (home), use **Start timer** on a lane task or open the **Time tracking** section. Model: **lane** (same names as your planner lanes, plus **Others**) → optional **projects** (each project lives in one lane) → **tasks** (most tasks have **no project** and roll up to the Others lane; you can attach a project when needed). The UI lists **tasks** before **projects**; create a project with a lane, then pick it from the task **Project** dropdown (all projects are listed). **Start** an ad-hoc or linked task, then **Pause**, **Resume**, and **Stop**. Starting another task stops the previous one at the current minute. **Tracked time today** shows minute-level totals for the local calendar day. Old links to **`/time`** redirect to **`/`**.

## Week — month planner

The **Week** tab shows a **Monday-start month calendar** for the month you’re viewing (prev / next / Today). Each day shows small **lane-colored bars** for tasks that day; **today** and the **week that contains today** are highlighted. **Tap a day** to open a **modal**: full task list, optional planned times, drag tasks between days, and add tasks with lane + time. **Week intention** applies to the week that contains the **1st** of the visible calendar month. **Before** lists saved days; **Beyond** adds a horizontal strip of days **after** that month’s grid (same task controls).

## Today — streak heatmap

Under the fire **streak** count and 7-day “saved” pips, a **five-month contribution-style grid** shows **tasks marked done** per day on an **orange** intensity scale (**0–5**, where **5** means five or more). Blocks are **separate cards** per calendar month: **two months before**, **current month (center)**, **two months after** (Sunday-first columns within each block, like a compact GitHub / LeetCode graph). Padding days outside each labeled month appear as neutral tiles.

## Onboarding

First launch asks for **anchor** and **term** dates. You can use **Skip — planner only** to go straight to tasks and logs; add dates later under **Settings** (countdown and term bar stay off until both anchor and term fields are set).

## Daily log and notes (Today)

The **daily log** supports multiple sections, drag reorder, and per-section **note mode**: **Cornell**, **outline**, or **boxed**. You can attach files where the UI allows. Layout is tuned for wider reading and editing on large screens.

## Backup and restore

Open **Settings** in the app → **Export JSON** / **Import JSON**. Import replaces the current saved state (the disk file when using the local server, otherwise the browser copy). For a **full** local backup including time tracking, also copy **`data/time-tracking.db`**.

## Change log (high level)

See **`CHAT_HISTORY.md`** in this repo for merge notes and decisions (not a substitute for `git log`).

## Tech stack

Vite, React, TypeScript, Tailwind CSS v4, React Router, date-fns, @dnd-kit. Local APIs: file-backed state + **SQLite** (`sql.js` / WASM) for time tracking. The main content column uses **`gs-container`** (wider on large screens) so the month planner and heatmap have enough horizontal room. A React **error boundary** catches render failures and offers a reload path.

## Roadmap (v1.1)

Commute / day-type planner and life / exploration list (bucket-style places and events).
