# Grad Sprint

A local-first daily command center for students: anchor countdown, term progress, renameable task lanes, weekly planner with drag-and-drop, habits, and streaks. **No server.** All data stays in your browser (`localStorage`). Use **Settings → Export JSON** for backups.

## Use on GitHub Pages (easiest for sharing)

1. Push this repo to GitHub (default branch `main`).
2. **Settings → Pages → Build and deployment**: set **Source** to **GitHub Actions**.
3. The workflow [.github/workflows/pages.yml](.github/workflows/pages.yml) builds with `VITE_BASE: /<repository-name>/` so assets load correctly.

If you rename the repository, the next deploy picks up the new name automatically. If you build Pages manually without Actions, set the same base:

```bash
set VITE_BASE=/your-repo-name/
npm run build
```

(On PowerShell: `$env:VITE_BASE='/your-repo-name/'; npm run build`.)

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

Commute / day-type planner and life / exploration list (see [info/prompt.txt](info/prompt.txt)).
