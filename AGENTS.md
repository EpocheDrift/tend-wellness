# Repository Guidelines

## Project Structure & Module Organization
This repository is primarily design documentation plus UI prototypes. Authoritative system docs live in `docs/Design/`, with interface prompts under `docs/Design/Interfaces/` and system-level references under `docs/Design/System Design/`. Treat `docs/Design/System Design/Design_SSOT.md` as the single source of truth for architecture, API contracts, and schema decisions.

Prototype apps live in `docs/drafts/Interfaces/`:
- `Owner_Dashboard_v2/`
- `EndUser_Interface-Entry_Form_v2/`
- `EndUser_Interface-Slot_Selection_Page_v2/`

Each app follows a Vite + React + TypeScript layout with `src/app/`, shared UI primitives in `src/app/components/ui/`, and styles in `src/styles/`.

## Build, Test, and Development Commands
Run commands from the specific app directory:

```bash
cd docs/drafts/Interfaces/Owner_Dashboard_v2
npm install
npm run dev
npm run build
```

- `npm install`: installs local app dependencies
- `npm run dev`: starts the Vite development server
- `npm run build`: creates a production build for that app

There is no repo-level build, test, or lint command yet.

## Coding Style & Naming Conventions
Use TypeScript and React function components. Follow the existing file patterns:
- Components: `PascalCase.tsx`
- Utility modules: lower-case names like `utils.ts`
- Documentation: descriptive `Title_Case` or prompt-oriented names

Prefer 2-space indentation in Markdown and keep code formatting consistent with surrounding files. Preserve the generated UI structure unless there is a clear reason to refactor. Do not introduce new tooling unless the repo adopts it explicitly.

## Testing Guidelines
No automated test suite is configured today. Before opening a PR, run `npm run build` in each app you changed and verify the affected UI manually. If you add tests later, place them next to the relevant source files and use clear component-based names.

## Commit & Pull Request Guidelines
Recent commits use short, imperative subjects such as `Reorganize design docs structure` and `Add harness SSOT blueprint`. Follow that style: start with a verb, keep it specific, and scope each commit to one logical change.

PRs should include:
- A brief summary of what changed
- The directories or docs affected
- Screenshots for UI changes
- Notes on any unverified areas, especially where builds were not run

## Repository-Specific Notes
Avoid committing local assistant files or export artifacts unless they are intentionally part of the deliverable. Prefer source directories over `.zip` snapshots when both exist.
