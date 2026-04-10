# Project history (handoff log)

Short-lived Cursor threads are not stored in the repo. This file records **merged work and decisions** so future sessions stay aligned.

## 2026-03-29 — Merge `feature/notes-layout-attachments` → `main`

- **Branch:** `feature/notes-layout-attachments` fast-forward merged into **`main`** (includes notes/log UI and time-tracking integration).
- **Daily log (Today):** Sectioned intention and daily log; log note modes (**Cornell**, **outline**, **boxed**); drag reorder; attachments support; wider layout; header clock. Planner schema updates live in app migration (`storage` / `types`).
- **Time tracking (SQLite):** `data/time-tracking.db` via `/api/time/*`. Timer, projects, tasks, today totals. **Lane model:** planner lanes are the root; each **project** belongs to one lane (or **Others** `__others__`). **Tasks** may have no project (tracked under Others) or link to a project. On the home **Time database** section, **Tasks** appears before **Projects**; new tasks default to no project; project dropdown lists **all** projects with **lane · name** labels; API responses normalize `laneId` / `lane_id`.
- **Compatibility:** Requires **Node 22.5+** (`node:sqlite`). Backup **JSON** covers planner state; copy **`data/time-tracking.db`** separately for full time-DB backup.

---

*Append new dated sections below when you merge significant work or change data/layout contracts.*
