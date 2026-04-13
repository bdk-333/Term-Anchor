# Term Anchor

A local-first daily command center for students: anchor countdown, term progress, renameable task lanes, **month planner** on Week (lane-colored day tiles, day-detail modal), habits, streaks, a **contribution-style streak heatmap** on Today, **sectioned daily log** (Cornell / outline / boxed notes, attachments), and **integrated time tracking** (lanes → projects → tasks, timer, today’s totals).

**Distribution:** this repo is meant to be **cloned or downloaded and run on your machine** with Node.js (see **Quick start** below). There is **no** GitHub Pages / static-only build path for the full app: time tracking and disk-backed planner state require the included local server.

## Quick start (new machine)

1. Install **[Node.js](https://nodejs.org/) LTS** — use **v22.5 or newer** (required for built-in SQLite `node:sqlite` used by time tracking).
2. Clone or download this repository and open a terminal **in the project folder**.
3. Run **`npm install`** once.
4. Run **`npm run build`** once (creates **`dist/`**).
5. **Windows:** double-click **`Start-TermAnchor.cmd`** (or run **`npm start`**). Your browser should open **http://127.0.0.1:8787/**.
6. **macOS / Linux:** run **`npm start`**, then open **http://127.0.0.1:8787/** in a browser (or use **`start-grad-sprint.command`** on macOS after `chmod +x`). Optional port: set **`TERM_ANCHOR_PORT`** (see **`.env.example`**).
7. Complete **onboarding** the first time you open the app. After that, use **step 5–6** whenever you want to run Term Anchor.

Your data lives next to the project under **`data/`** (see below). Use **Settings → Export JSON** for backups.

## Where your data lives

- **Local server (recommended):** Run the app with **`Start-TermAnchor.cmd`** (Windows) or **`npm start`** after a build. Your progress is saved in **`data/term-anchor-state.json`** next to the project. The app is served at **http://127.0.0.1:8787/** so **Edge, Brave, Chrome, or any browser** can use the **same file**—switch browsers without starting over. You do not need PowerShell as Administrator.
- **Time tracking (local server only):** When you use **`npm run dev`** or **`npm start`**, the **Today** page talks to **`/api/time/*`** (timer, projects, tasks, totals). Data is stored in **`data/time-tracking.db`** (SQLite via Node’s built-in **`node:sqlite`**). Opening **`dist/index.html` directly** or using plain static hosting **does not** run those APIs. **Backup:** copy **`data/time-tracking.db`** if you want to archive time entries; **Settings → Export JSON** does not include the SQLite file.
- **Browser-only fallback:** If you open a build **without** the Node server, planner data may stay in **`localStorage`** only; the time section on **Today** shows that the API is unavailable. For the intended experience, always use **`npm start`** or **`Start-TermAnchor.cmd`** after **`npm run build`**.

## Easiest way to run (Windows)

After the one-time **Quick start** steps: double-click **`Start-TermAnchor.cmd`**, keep the window open while you use Term Anchor (closing it stops the server). **Pick a specific browser:** right‑click **`Open-Term-Anchor.url`** → **Open with** → Brave, Firefox, etc. (the server must already be running).

Change the port with **`TERM_ANCHOR_PORT`** (default `8787`); if you change it, edit the URL inside **`Open-Term-Anchor.url`** to match (see **`.env.example`**).

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

On **Today** (home), use **Start timer** on a lane task or open the **Time tracking** section. Model: **lane** (same names as your planner lanes, plus **Others**) → optional **projects** (each project lives in one lane) → **tasks** (most tasks have **no project** and roll up to the Others lane; you can attach a project when needed). The UI lists **tasks** before **projects**; create a project with a lane, then pick it from the task **Project** dropdown (all projects are listed). **Start** an ad-hoc or linked task, then **Pause**, **Resume**, and **Stop**. Starting another task stops the previous one at the current minute. **Tracked time today** shows minute-level totals for the local calendar day. Old links to **`/time`** redirect to **`/`**.

Requires **Node 22.5+** (for `node:sqlite`). No extra npm native modules.

## Week — month planner

The **Week** tab shows a **Monday-start month calendar** for the month you’re viewing (prev / next / Today). Each day shows small **lane-colored bars** for tasks that day; **today** and the **week that contains today** are highlighted. **Tap a day** to open a **modal**: full task list, optional planned times, drag tasks between days, and add tasks with lane + time. **Week intention** applies to the week that contains the **1st** of the visible calendar month. **Before** lists saved days; **Beyond** adds a horizontal strip of days **after** that month’s grid (same task controls).

## Today — streak heatmap

Under the fire **streak** count and 7-day “saved” pips, a **five-month contribution-style grid** shows **tasks marked done** per day on an **orange** intensity scale (**0–5**, where **5** means five or more). Blocks are **separate cards** per calendar month: **two months before**, **current month (center)**, **two months after** (Sunday-first columns within each block, like a compact GitHub / LeetCode graph). Padding days outside each labeled month appear as neutral tiles.

## Daily log and notes (Today)

The **daily log** supports multiple sections, drag reorder, and per-section **note mode**: **Cornell**, **outline**, or **boxed**. You can attach files where the UI allows. Layout is tuned for wider reading and editing on large screens.

## Backup and restore

Open **Settings** in the app → **Export JSON** / **Import JSON**. Import replaces the current saved state (the disk file when using the local server, otherwise the browser copy). For a **full** local backup including time tracking, also copy **`data/time-tracking.db`**.

## Change log (high level)

Use **`git log`** for full history. Maintainers may keep a private handoff log as **`CHAT_HISTORY.md`** locally (gitignored in this repo).

## Tech stack

Vite, React, TypeScript, Tailwind CSS v4, React Router, date-fns, @dnd-kit. Local APIs: file-backed state + **`node:sqlite`** for time tracking. The main content column uses **`gs-container`** (wider on large screens) so the month planner and heatmap have enough horizontal room.

## Roadmap (v1.1)

Commute / day-type planner and life / exploration list (bucket-style places and events).
