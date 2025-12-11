Section 1: High-level summary of existing repos
- Wordle helper (`wordle-helper`, Angular)
  - Inputs: form collects 5 letters (one per position) and per-letter state toggle (`absent`/`present`/`correct`), submit “Add Attempt”; max 6 attempts; dark-mode toggle.
  - Outputs: list of prior attempts (colored by state) and “Possible Words” list showing matching 5-letter candidates.
  - Logic location: `src/app/services/wordle.service.ts` filters `an-array-of-english-words` to 5-letter words and narrows suggestions by checking each attempt’s letter/state rules; absorbs “absent” letters unless that letter is marked present/correct elsewhere in same attempt; BehaviorSubjects expose attempts/suggestions.
  - Data files: `an-array-of-english-words` package only (no custom word list).
  - Constraints: exactly 5 letters per attempt, up to 6 attempts; state-specific matching; input uppercased and validated A–Z.

- Quartiles helper (`quartiles-helper`, CRA + MUI)
  - Inputs: add tile text (up to 4 chars) into a 5×4 board, select any subset of filled tiles, click “Analyze Selected Tiles”; buttons to clear selection and save/load boards.
  - Outputs: paginated word list with tabs for All / 2 / 3 / 4-tile words, counts per tab, and total combinations calculated pre-filter; highlight selected tiles on the board.
  - Logic location: `src/helpers/utils.js` builds a Set dictionary from `an-array-of-english-words`; `generateCombinations` creates combinations/permutations for 2–4 selected tiles and keeps dictionary hits; `calculateTotalPossibilities` estimates permutations before filtering. State lives in `App.js`.
  - Data files: `an-array-of-english-words`; saved boards persisted to `localStorage` via `src/context/BoardContext.jsx`.
  - Constraints: analyzes only selected, non-empty tiles; word lengths 2–4; tile strings lowercased; factorial/permutation-heavy (can be costly with many selections); saved boards stored under `quartilesBoards`.

- Wordscapes / Word Trip helper (`word-trip-helper`, Vite + PrimeReact + Zustand)
  - Inputs: dropdown for letter count (4–8) reveals individual letter inputs (A–Z, one char each); optional target word length (3–8); buttons for Find Words and Reset; theme toggle with persistence.
  - Outputs: sidebar groups words by length with counts, alphabetized; summary rows for target length, total matches, and entered letters; warning when no matches.
  - Logic location: `src/utils/wordSearch.ts` normalizes the `an-array-of-english-words` list to uppercase A–Z, pre-groups by length 3–8, and filters via multiset matching (`findMatchingWords`); `src/store/useGameStore.ts` wraps submit/reset with Zustand.
  - Data files: `an-array-of-english-words` processed in-memory; theme preference stored in `localStorage` (`word-trip-theme`).
  - Constraints: supports lengths 3–8 only; respects duplicate letters; sorting alphabetical; UI uses PrimeReact components.

Section 2: Target folder & routing structure for `word-vinder`
- Routing: `/` (Home tiles), `/wordle-helper`, `/quartiles-helper`, `/wordscapes-helper` (Word Trip).
- Proposed tree (feature-first):
  - `src/main.tsx` (PrimeReact provider, theme import, Router)
  - `src/app/`
    - `routes.tsx` (route map)
    - `layout/` (Layout shell, nav, theme hooks if needed)
    - `home/` (Home page with three feature cards)
    - `components/` (shared UI: PageSection, CardGrid, NavLink wrappers)
  - `src/features/wordle/`
    - `components/AttemptForm.tsx`, `AttemptsPanel.tsx`, `SuggestionsPanel.tsx`
    - `logic/solver.ts` (pure filters) + `types.ts`
  - `src/features/quartiles/`
    - `components/Board.tsx`, `WordList.tsx`, `BoardControls.tsx`, `SavedBoards.tsx`
    - `logic/generator.ts` (combinations/permutations + dictionary) + `types.ts`
    - `storage/localBoards.ts` (wrap localStorage)
  - `src/features/wordscapes/`
    - `components/WordFinderForm.tsx`, `ResultsPanel.tsx`, `Header.tsx` (theme toggle)
    - `logic/wordSearch.ts` + `types.ts`
  - `src/shared/`
    - `dictionary/englishWords.ts` (lazy loader or shared normalization utils)
    - `utils/string.ts`, `hooks/useLocalStorage.ts`
    - `styles/` (global tokens/overrides)

Section 3: Stage-by-stage migration plan
- Stage 0: Baseline wiring
  - Goals: ensure Vite + React + TS + PrimeReact + Router are wired (already mostly done).
  - Files: `src/main.tsx`, `src/App.tsx`, global styles.
  - References: existing `word-vinder` setup.
  - Risks: theme import path correctness; keep CSS scope aligned with PrimeReact tokens.

- Stage 1: Routing + layout + stubs
  - Goals: add Layout shell, Home with three navigation tiles, stub pages for each helper route.
  - Files: `src/app/routes.tsx`, `src/app/layout/Layout.tsx`, `src/app/home/HomePage.tsx`, stub `features/*/pages/*.tsx`.
  - References: n/a (UI stubs only).
  - Risks: none major; ensure React Router 7 element signatures correct.

- Stage 2: Migrate Wordle solver
  - Goals: port solver to TS, build Wordle UI using PrimeReact, and connect pure logic.
  - Files (create/modify): `src/features/wordle/logic/solver.ts`, `types.ts`, `components/AttemptForm.tsx`, `AttemptsPanel.tsx`, `SuggestionsPanel.tsx`, `pages/WordlePage.tsx`; update `routes.tsx`.
  - References: `wordle-helper/src/app/services/wordle.service.ts` (filter logic), `.../components/attempt-input/*`, `.../components/attempts-display/*`, `.../components/word-suggestions/*`.
  - Risks: translating Angular form/state patterns to React; preserving “absent but present elsewhere” rule; performance of repeated filtering over dictionary.

- Stage 3: Migrate Quartiles solver
  - Goals: port tile selection UI and combination/permutation logic; add save/load for boards.
  - Files: `src/features/quartiles/logic/generator.ts`, `types.ts`, `components/Board.tsx`, `WordList.tsx`, `BoardControls.tsx`, `SavedBoards.tsx`, `storage/localBoards.ts`, `pages/QuartilesPage.tsx`; route registration.
  - References: `quartiles-helper/src/helpers/utils.js` (combinations/permutations and totals), `.../App.js` (state flow), `.../context/BoardContext.jsx` (localStorage schema), `.../components/*`.
  - Risks: factorial/permutation blow-up on many tiles—may need guards/debouncing; localStorage schema migration; aligning MUI layout to PrimeReact equivalents.

- Stage 4: Migrate Wordscapes/Word Trip solver
  - Goals: port wordSearch logic and form/results UI.
  - Files: `src/features/wordscapes/logic/wordSearch.ts`, `types.ts`, `components/WordFinderForm.tsx`, `ResultsPanel.tsx`, `Header.tsx`, `pages/WordscapesPage.tsx`; route registration.
  - References: `word-trip-helper/src/utils/wordSearch.ts`, `.../store/useGameStore.ts`, `.../components/*`, `.../types/*`.
  - Risks: keeping multiset matching intact; managing large dictionary in browser (consider lazy load/shared cache); theme toggle implementation shared vs feature-local.

- Stage 5: Shared utilities and dictionary handling
  - Goals: centralize dictionary normalization/loading and common helpers/hooks; dedupe logic between features.
  - Files: `src/shared/dictionary/englishWords.ts`, `src/shared/utils/string.ts`, `src/shared/hooks/useLocalStorage.ts`, adjust imports across features.
  - References: dictionary usage patterns in all three original repos.
  - Risks: bundle size—consider lazy import or cached singleton; ensure identical filtering (length ranges differ per feature).

- Stage 6: UI polish and cleanup
  - Goals: align styling, spacing, and empty states; refine accessibility (aria labels, focus); minor refactors.
  - Files: shared layout/styles, feature component touch-ups.
  - References: PrimeReact patterns from `word-trip-helper` and original Material/MUI UX cues.
  - Risks: avoid regressions in solver behavior while polishing UI; keep logic pure and decoupled from view.
