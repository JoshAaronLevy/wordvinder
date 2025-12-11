Context & Problem
I’m building a new Vite + React + TypeScript project called “word-vinder” that should consolidate three existing small apps into one site. Each existing app helps users solve a different word game:

1) A Wordle-style solver (repo: `wordle-helper`)
2) A Quartiles solver (repo: `quartiles-helper`)
3) A Wordscapes / Word Trip–style solver (repo: `wordscapes-helper`)

The goal is to:
- Create a single Vite React app (`word-vinder`) with a home page listing 3 tiles/cards, one per game.
- Each tile navigates to its own route and UI: Wordle helper, Quartiles helper, Wordscapes helper.
- Reuse/migrate the core solver logic from each existing repo as clean, typed, framework-agnostic functions inside the new project.
- Avoid over-engineering: no monorepo, no complex state libraries. Just React + React Router + simple feature-based structure.

You have access to:
- The new Vite React TS app in the `word-vinder` folder.
- The three existing repos sitting alongside it in the same VSCode workspace:
  - `wordle-helper`
  - `quartiles-helper`
  - `wordscapes-helper`

Your job in this first step is NOT to write code yet, but to deeply understand the existing repos and design a clear migration & implementation plan.

What I want you to do
1. Scan the three existing repos and summarize, for each:
   - What inputs the user provides (UI fields, forms).
   - What outputs/results are shown.
   - Where the main solver logic lives (files, functions).
   - Any important data files (word lists, dictionaries, etc.).
   - Any meaningful constraints or assumptions in the logic.

2. Propose a target architecture for the new `word-vinder` app, including:
   - A feature-based folder structure under `src/` for:
     - shared components (Layout, Home, generic UI components),
     - and feature modules: `features/wordle`, `features/quartiles`, `features/wordscapes`.
   - A routing structure using React Router:
     - `/` → Home page with 3 cards/tiles.
     - `/wordle-helper`
     - `/quartiles-helper`
     - `/wordscapes-helper`
   - Where the solver logic for each game should live (e.g., `features/wordle/logic/solver.ts`) and how it should be exposed (pure functions & types).

3. Design an incremental migration plan broken into stages. I want the stages small and sequential, something like (feel free to refine this):
   - Stage 0: Confirm Vite + React + TS setup, install router, basic project wiring.
   - Stage 1: Implement routing, Layout, and Home page with navigation cards, stub pages for each game (UI only, no real logic).
   - Stage 2: Migrate Wordle solver logic into `word-vinder`, clean it up as TypeScript, define types for inputs/outputs, and wire it to the Wordle page UI.
   - Stage 3: Migrate Quartiles logic similarly.
   - Stage 4: Migrate Wordscapes logic similarly.
   - Stage 5: Consolidate shared utilities (word list handling, string normalization, shared UI components).
   - Stage 6: Light refactors, style cleanup, and small UX polish.

4. For each stage, list:
   - The specific files to create or modify in `word-vinder`.
   - Which existing files from the older repos we are conceptually drawing from (no need to paste them, just reference paths).
   - The main risks or tricky parts (e.g., parts of the old code that are tightly coupled to their original UI, or non-obvious state handling).

Constraints & Preferences
- I want this project to be clean and maintainable, but not over-engineered.
- Use React Router for navigation and a feature-based folder structure.
- Solver logic should be pure, testable functions (even if we don’t write tests right now).
- Prefer TypeScript with explicit types where it clarifies the API between components and solver functions.

Do NOT write tests
- In this step and in follow-up steps, DO NOT create any test files or test code.
- Focus on the implementation plan, file structure, and migration steps.
- If you think tests would be beneficial, you can mention what you would test conceptually, but do not implement them.

Output File
- Create a file in the root of the `word-vinder` repo named `mvp-implementation-plan.md` where you will create the contents of your report.

Output format
- Section 1: High-level summary of each existing repo (inputs, outputs, logic locations, data files).
- Section 2: Proposed target folder & routing structure for `word-vinder` (with a small tree diagram).
- Section 3: Stage-by-stage migration plan (Stage 0, Stage 1, …) with bullet points for:
  - Goals
  - Files to create/modify
  - References to old repo files
  - Risks / gotchas