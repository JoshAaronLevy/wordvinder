# Word Vinder Performance Audit

## Build Snapshot
- `dist/assets/index-Dk2y92Xl.js` weighs **3.85 MB** uncompressed (stat output: 3,847,188 bytes), so every navigation or refresh has to download, parse, and execute one very large script chunk.
- `dist/assets/index-C9nT9BUy.css` adds **0.56 MB** more CSS, and the build emits nine separate font files (Inter variable faces plus multiple PrimeIcons formats) that the browser still needs to negotiate, even if only a subset is eventually used.
- The hero/branding PNGs that ship with the bundle (`Word-Vinder-Logo.png` 1.3 MB, `Wordscapes.png` 1.0 MB, `Quartiles.png` 456 KB, `Wordle.png` 244 KB) dominate the `assets` directory and are requested as-is.

## Findings & Recommendations

### 1. Entire app (all routes + heavy data) is bundled into a single 3.8 MB JS file
- **Evidence:** `src/App.tsx:1-24` statically imports every page (Wordle, Quartiles, Wordscapes, Home, NotFound). Vite therefore emits one `index-*.js` file in production (`dist/assets/index-Dk2y92Xl.js`, 3.85 MB).
- **Impact:** Users pay the cost of downloading and parsing logic for every helper—even if they only open a single route. This directly hurts First Contentful Paint and TTI on refreshes.
- **Recommendations:** 
  - Wrap each page in `React.lazy`/`Suspense` or route-level dynamic imports so that `/wordle`, `/quartiles`, `/wordscapes`, etc. are split into separate chunks and only loaded when navigated to.
  - Move rarely used utilities (e.g., the Quartiles saver dialog) behind `import()` boundaries so they do not block initial render.
  - Configure `vite.config.ts` with `build.rollupOptions.output.manualChunks` to keep vendor libraries and large word dictionaries in their own cacheable files.

### 2. Dictionary module still clones the entire 3.2 MB word list in the browser
- **Evidence:** `src/shared/dictionary/englishWords.ts:1-81` fetches the remote dictionary API and, once it resolves, clones the payload into lower-case, upper-case, per-length maps, and `Set` forms inside the client.
- **Impact:** The first feature that touches the dictionary still burns several milliseconds parsing and duplicating the multi-megabyte payload, allocating multiple copies in memory before any helpers can respond.
- **Recommendations:** 
  - Precompute slimmer, game-specific lists (e.g., only 5-letter Wordle answers, 3–8 letter Wordscapes candidates) offline and store them as separate JSON files that can be lazy-loaded per page.
  - Move the normalization work to a background worker so the main thread remains responsive while data is prepared.
  - Avoid generating both upper- and lower-case arrays at runtime; instead, transform on demand or ship pre-normalized data.
### 3. Wordscapes still builds and re-sorts huge candidate lists at runtime
- **Evidence:** `src/shared/dictionary/englishWords.ts:65-80` builds the complete 3–8 letter map in memory, and `src/features/wordscapes/logic/wordSearch.ts:19-44` filters plus sorts every candidate list on each submission.
- **Impact:** The first Wordscapes visit still walks millions of strings to build the grouped map, and every search re-sorts potentially thousands of matches, which can stall the UI for long inputs.
- **Recommendations:** 
  - Pre-sort each bucket once when the dictionary map is generated so searches only filter.
  - Ship precomputed maps per word length (or request them from the API) so the browser is not responsible for iterating the full corpus.
  - Move the filtering step into a worker to avoid blocking the UI thread for larger letter selections.

### 4. Wordle suggestions scan a huge candidate pool and can render thousands of DOM nodes
- **Evidence:** `src/features/wordle/logic/solver.ts:7-44` filters *all* five-letter words in the dictionary every time attempts change, and `src/features/wordle/components/SuggestionsPanel.tsx:21-57` renders every match with no limit or virtualization once the dictionary finishes loading.
- **Impact:** The candidate pool comes from the generic dictionary (tens of thousands of 5-letter strings), so each new attempt triggers heavy string comparisons. Rendering hundreds or thousands of `<span>`s at once further slows interaction and reflows.
- **Recommendations:** 
  - Replace the dictionary with the official Wordle solution + allowed-guess lists (≈4k entries total) to reduce CPU work.
  - Cap the number of displayed suggestions (e.g., top 100) and provide pagination or virtual scrolling for the rest.
  - Cache filtered results per attempt signature or use memoized scoring to avoid recomputing from scratch.

### 5. Quartiles combination generator runs expensive combinatorics synchronously
- **Evidence:** `src/features/quartiles/logic/generator.ts:22-76` recursively builds every combination/permutation (up to C(20,4) × 24 = 116k strings) on the main thread, and `src/features/quartiles/pages/QuartilesPage.tsx:41-46` toggles `isAnalyzing` immediately back to `false` even though the heavy work has not yielded to the browser.
- **Impact:** Selecting many tiles can freeze the UI during `generateCombinations`, and the user never sees the "Analyzing" state because state updates batch synchronously.
- **Recommendations:** 
  - Run `generateCombinations` inside a Web Worker or `requestIdleCallback` and only flip `isAnalyzing` off after awaiting the result.
  - Short-circuit when the selected tile count exceeds a threshold, or stream partial results to avoid generating tens of thousands of permutations in one go.
  - Cache recent selections so repeated analyses do not repeat the same work.

### 6. PrimeReact + PrimeFlex CSS and fonts add ~1.2 MB before your own styles load
- **Evidence:** `src/main.tsx:4-9` imports `primereact/resources/themes/lara-light-blue/theme.css`, `primereact/resources/primereact.min.css`, `primeicons/primeicons.css`, and `primeflex/primeflex.css`. The build output shows 555 KB of CSS plus multiple Inter/PrimeIcons font files (e.g., `InterVariable-*.woff2` at 337 KB/372 KB each, `primeicons-*.ttf/woff/woff2`).
- **Impact:** CSS blocking time increases substantially, and the browser must download fonts that mostly duplicate system fonts. This slows the first render even if the UI is simple.
- **Recommendations:** 
  - Switch to the CSS-only Prime modules you actually use or extract just the needed component styles instead of whole theme bundles.
  - Drop `primeflex` if most layout is handled via custom CSS, or import only the specific utility classes needed.
  - Override the theme to use system fonts so the bundled Inter font files can be excluded, and use a single modern font format (WOFF2) for PrimeIcons to cut redundant downloads.

### 7. Large PNGs block header and home content painting
- **Evidence:** `src/app/layout/Layout.tsx:60-63` renders `Word-Vinder-Logo.png` (1.3 MB) in the sticky header, and `src/app/home/HomePage.tsx:4-31` renders three additional PNGs (456 KB–1.0 MB). Although the home cards use `loading="lazy"`, the header logo cannot be deferred.
- **Impact:** These assets dominate LCP on cold loads, especially on mobile or slower networks, and they also inflate the service worker cache footprint.
- **Recommendations:** 
  - Export the logo and hero art as responsive WebP/SVG assets or at least provide 1x/2x image sets sized for actual display dimensions.
  - Use CSS for simple gradients/emblems to avoid fetching large rasters.
  - Consider inlining a tiny placeholder and swapping in the full image after first paint (`<img decoding="async" fetchpriority="low">` for non-critical art).

### 8. Result lists are unbounded and lack virtualization
- **Evidence:** `src/features/wordscapes/components/ResultsPanel.tsx:68-80` renders `<li>` elements for every matched word, and `src/features/quartiles/components/WordList.tsx:34-53` renders all possible words for the selected sizes. There is no pagination or virtualization layer.
- **Impact:** When the dictionary produces hundreds/thousands of matches (common for longer letter sets), the DOM tree explodes and scrolling becomes sluggish. Memory usage grows with every render because arrays are recreated each submission.
- **Recommendations:** 
  - Introduce windowing via `react-window` or infinite scroll to keep the DOM size bounded.
  - Lazily render group sections (e.g., collapse long lists) and allow exporting full results instead of keeping them mounted.

### 9. Repeated localStorage parsing creates avoidable work in Quartiles
- **Evidence:** `src/features/quartiles/components/SavedBoards.tsx:28-35` reparses the entire saved board list from `localStorage` after each deletion/clear.
- **Impact:** JSON parsing grows with board history size and blocks the UI while the dialog is open.
- **Recommendations:** Keep saved boards in component state by filtering the existing array instead of rereading from storage each time.

## Additional Opportunities
- Add route-level skeletons/placeholders so `React.lazy` chunks can stream in without showing blank content.
- Consider precomputing or server-hosting the dictionary/tiered data that currently lives under `/data/dictionary` (≈53 MB) so it does not need to reside in the client repo at all.
- Run `npm run build -- --report` or Vite’s `visualizer` plugin to monitor bundle composition after implementing the above changes.
