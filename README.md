# Term Anchor

A local-first daily command center for students: anchor countdown, term progress, renameable task lanes, weekly planner with drag-and-drop, habits, and streaks. **No server.** All data stays in your browser (`localStorage`). Use **Settings → Export JSON** for backups.

Hosting (e.g. GitHub Pages or another static host) will be wired up once the app is closer to a public release. For now, run it locally (see below).

## Develop locally

```bash
npm install
npm run dev
```

## Run the production build on your computer

After `npm run build`, the static site is in `dist/`.

- **Windows:** right-click `Start-GradSprint.ps1` → **Run with PowerShell**, or from PowerShell: `.\Start-GradSprint.ps1`  
  (starts `vite preview` and opens the browser).
- **macOS:** `chmod +x start-grad-sprint.command`, then double-click `start-grad-sprint.command`.

You need [Node.js](https://nodejs.org/) installed so `npx` can run `vite preview`.

## Backup and restore

Open **Settings** in the app → **Export JSON** / **Import JSON**. Import **replaces** all data in that browser profile.

## Tech stack

Vite, React, TypeScript, Tailwind CSS v4, React Router, date-fns, @dnd-kit.

## Roadmap (v1.1)

Commute / day-type planner and life / exploration list (bucket-style places and events).
