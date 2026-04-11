# Project history (handoff log)

Short-lived Cursor threads are not stored in the repo. This file records **merged work and decisions** so future sessions stay aligned.

## 2026-03-29 — Merge `feature/notes-layout-attachments` → `main`

- **Branch:** `feature/notes-layout-attachments` fast-forward merged into **`main`** (includes notes/log UI and time-tracking integration).
- **Daily log (Today):** Sectioned intention and daily log; log note modes (**Cornell**, **outline**, **boxed**); drag reorder; attachments support; wider layout; header clock. Planner schema updates live in app migration (`storage` / `types`).
- **Time tracking (SQLite):** `data/time-tracking.db` via `/api/time/*`. Timer, projects, tasks, today totals. **Lane model:** planner lanes are the root; each **project** belongs to one lane (or **Others** `__others__`). **Tasks** may have no project (tracked under Others) or link to a project. On the home **Time database** section, **Tasks** appears before **Projects**; new tasks default to no project; project dropdown lists **all** projects with **lane · name** labels; API responses normalize `laneId` / `lane_id`.
- **Compatibility:** Requires **Node 22.5+** (`node:sqlite`). Backup **JSON** covers planner state; copy **`data/time-tracking.db`** separately for full time-DB backup.

## 2026-04-11 — Week month planner + Today streak heatmap

- **Week (`WeekPage`):** Replaced the old single-week horizontal strip with a **month calendar** (Monday-start grid). Days show **lane-colored horizontal bars** (task density); **today** and the **ISO week containing today** are visually highlighted. **Day click** opens a **modal** (portal) with sortable tasks, planned times, add-task form, and **Start timer** when the time API is available. Drag-and-drop between days uses prefixed droppable ids (`calendar:` / `list:`) so the grid, modal list, and **Beyond** strip do not collide. **Beyond** still shows ~90 days **after** the visible month grid; **Before** unchanged. Shared pieces live under `src/components/week/`; helpers in `src/lib/weekCalendar.ts`.
- **Today streak:** `StreakContributionHeatmap` — **five** calendar-month blocks in a row (**two before**, **current centered**, **two after**). Each block is its own padded week-column grid (Sunday-first **within** the block, padded to full weeks; out-of-month days are neutral). **Orange** heat levels **0–5** from **count of tasks marked done** that day (not time-tracked minutes). Copy explains the window; month labels use `MMM yy`.
- **Layout:** `gs-container` **max-width** increased to **1080px** in `index.css` for calendar/heatmap room.

---

*Append new dated sections below when you merge significant work or change data/layout contracts.*
