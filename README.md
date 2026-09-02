# Halal Economy Dashboard

An interactive dashboard mapping the ~$9 trillion halal economy — $2.6T of Muslim
consumer spend across six sectors, plus $5.99T of Islamic finance assets — sector
by sector and country by country.

Vanilla JavaScript, ES modules, D3 v7. No build step, no framework.

## Running it

ES modules are blocked over `file://`, so the page must be served over HTTP:

```bash
npm start           # serves on http://localhost:5173
```

Any static server works just as well:

```bash
python -m http.server 5173
npx --yes serve . --listen 5173
```

## Tests

```bash
npm install         # jsdom, d3, topojson-client (dev only)
npm test
```

`tests/smoke.test.mjs` boots the page in jsdom and asserts every chart, table and
panel actually rendered. `tests/interactions.test.mjs` drives the controls — layer
and year switches, compare, the guided tour, story mode, the language switch — and
asserts the resulting state. Neither replaces opening the page in a browser, but
together they catch boot errors and broken wiring.

`tests/verification.test.mjs` guards the verification layer described below —
that no confirmed figure has drifted from the value that was confirmed, and
that every marker reports a status. `tests/navigation.test.mjs` covers the
things that are invisible when they work: the mobile section list, the keyboard
route past the nav, and the dialogs holding and returning focus.

## Verification

Every figure carries a `verified` flag, and the provenance tooltip says whether
the figures behind that chart were actually checked:

> Confirmed against DinarStandard SGIE 2025/26, September 2026.

> 2 of 4 figures confirmed against DinarStandard SGIE 2025/26, September 2026.
> The other 2 are unconfirmed — check before citing.

> Unconfirmed — check before citing.

Nothing here requires hovering. Every marker renders a text badge beside it, in
the chart's own subtitle:

| Badge | Meaning |
|---|---|
| `Confirmed` | every figure behind that chart was checked |
| `2 of 4 confirmed` | some were |
| `Unconfirmed` | none have been checked |

The marker beside each badge is an icon, where shape carries the category and
colour carries the emphasis:

| Icon | State |
|---|---|
| blue scalloped rosette with a white tick | confirmed |
| gold rosette with a dash | partly confirmed |
| rust circle with a `?` | unconfirmed |

A tick is reserved for "every figure behind this was checked" — a partly
confirmed chart gets a dash, because a tick there would overclaim. Unconfirmed
uses a circle rather than a rosette so it does not read as a weaker verification.
Hovering any of them gives the source and the date it was checked.

The rosette is generated in `src/core/icons.js` from alternating radii rather
than a hand-tuned path, so the point count and scallop depth stay adjustable
(currently 12 points, 24 vertices, 17.5% depth).

A marker on a **single** number reports on that number, not on the series behind
it — `data-fig="consumerSpend.2024.v"` on the $2.60T hero KPI reads `Confirmed`
even though only 2 of the 5 points in that series are. Without this a confirmed
headline figure would be mislabelled by its own series.

**`verified` means someone looked, not that the number is true.** It records that
a figure was checked against a named source that was actually retrieved, on a
recorded date. Unchecked is the default — the point of the flag is to surface
what nobody has looked at.

As of September 2026, **66 of 212 figures are confirmed** (19%).

### How it fits together

- `verified` on a record names which of its fields were confirmed:
  `verified: true` for all of them, `verified: ['rank']` for one.
- `src/data/verification.js` holds the retrieved sources — each with the URL
  used and the date — plus a registry of which fields of each dataset count as
  figures.
- Markers in `index.html` carry `data-d="<dataset>"`, and optionally
  `data-fig="<id> <id>"` to scope to individual figures. Figure ids must be
  whitespace-free — they travel in a space-separated attribute.

Null fields are not figures: a country with no published GIEI score has nothing
to verify, so it must not count against the total.

### Re-verifying

`tests/confirmed-figures.json` pins every confirmed figure to the value that was
confirmed. Editing a figure without re-checking it fails the suite:

```
FAIL  every confirmed figure still equals the value that was confirmed
      re-verify or drop the flag — sectors.food.v2024: confirmed as 1530, now reads 1600
```

After genuinely re-checking a figure against its source, regenerate the pins:

```bash
npm run pin-figures
```

Regenerating to silence a failing test defeats the purpose — the pin file is the
only thing stopping an edited figure from carrying an old confirmation forward.

### What is still unconfirmed

| Dataset | Confirmed |
|---|---|
| Sector spend | 18 / 18 |
| Islamic finance segment growth | 3 / 3 |
| Country share of assets | 8 / 10 |
| Islamic finance by country | 16 / 24 |
| Islamic finance assets | 2 / 4 |
| OIC halal imports | 2 / 4 |
| Consumer spend trajectory | 2 / 5 |
| Sector ranks by country | 6 / 18 |
| GIEI position history | 5 / 20 |
| Investment deals | 2 / 15 |
| GIEI scores and ranks | 2 / 24 |
| Islamic finance composition | 0 / 3 |
| Hajj pilgrim counts | 0 / 9 |
| Muslim population by country | 0 / 39 |
| Halal imports by country | 0 / 1 |
| Certifier directory | 0 / 15 |

The GIEI *scores* — as opposed to the rankings, which are confirmed — sit behind
Salaam Gateway's paywall, which is why the rank table shows 1 / 23.

## Layout

```
index.html               markup only — no inline CSS or JS
assets/                  stylesheets, icons, generated share card and data files
src/
  main.js                entry point: wires listeners, then boots from the URL
  core/                  state, DOM helpers, i18n
  data/                  the figures, plus verification.js (what has been checked)
  content/               prose: narrative, story scripts and their derived stats
  charts/                one module per chart, each exporting a draw function
  features/              interactive behaviour, one module per feature
tests/                   seven suites: smoke, interaction, verification, navigation,
                         story, entry-helper and discoverability
scripts/                 pin-figures, build-data, build-images, build-metadata
archive/                 the original single-file build, superseded
```

### How it fits together

**No module wires itself on import.** Every module exports functions and does
nothing at load time; `src/main.js` alone decides what runs and in what order.
That keeps behaviour independent of the import graph, and makes the boot sequence
readable in one place.

`main.js` runs in two phases:

- `wire()` binds event listeners and draws the static charts.
- `boot()` reads the URL, then renders everything that depends on that state.

URL writes stay suppressed until `boot()` finishes, so opening a shared link never
rewrites the link.

### State

`src/core/state.js` holds the single `state` object and mirrors it into the query
string — view, map layer, pinned country, year, audience, language, story,
colour-blind ramp and the compare selection. Any view can be linked to and
restored. `writeURL()` is called by whatever changes state.

### Data

Figures live in `src/data/` as plain ES modules rather than JSON, so they load
synchronously and can carry comments about units and provenance. Every number on
the page is traceable: `src/data/sources.js` maps each `.src` marker in the markup
to a citation and whether the figure is reported, derived or approximate.

To update after a new report edition, edit the relevant module in `src/data/` —
no other file should need to change.

### Cross-module actions

Rendered markup (the map side panel, the rank table, the entry helper) needs to
trigger behaviour owned by another module. Because module scope is not global,
inline `onclick` handlers cannot reach it. Those buttons carry data attributes
instead:

```html
<button data-act="compare" data-c="Malaysia">Add to compare</button>
<button data-act="pin" data-scroll="1" data-c="Malaysia">Show on map</button>
```

One delegated listener in `main.js` (`initActions`) is the only place those
features meet.

Story mode is built lazily on first entry, and `view.js` receives its initialiser
through `registerStoryInit` rather than importing `story.js` — which would create
a cycle, since `story.js` calls `setView`.

## Licence

Two licences, because most of the data is not ours to give away.

| What | Licence |
|---|---|
| Source code | **MIT** — see [LICENSE](LICENSE) |
| The compilation: structuring, derived values, written analysis, and the record of what has been checked | **CC BY 4.0** |
| The underlying figures | **Not licensed here.** They belong to DinarStandard, IFSB, Global Finance, Pew, the IMF, GASTAT and SMIIC |

Individual facts are generally not copyrightable, but the selection and
arrangement of a compilation can be, and the UK and EU recognise a separate
database right over substantial investment in assembling data. The split above
follows that line: the compilation and the verification work are ours to
license, the facts are not. Full terms in [DATA-LICENSE.md](DATA-LICENSE.md).

The licence appears in four places and is asserted in all of them: the two
files, the `license` property of the JSON-LD Dataset, the Sources section, and
the citation the page offers.

## Using the data

The dataset is written to `assets/data/` as static files, so it can be fetched
without running the page's JavaScript — by a crawler, by someone else's script,
or from the `<noscript>` fallback:

| File | Contents |
|---|---|
| `halal-economy-data.csv` | all series, long format |
| `halal-economy-countries.csv` | country reference table |
| `halal-economy-verification.csv` | one row per figure: value, confirmed, checked against what |
| `halal-economy-dataset.json` | everything, with full provenance |

`src/data/bundle.js` is the single builder behind both these files and the
in-page download buttons, so what a crawler fetches and what a reader downloads
cannot diverge. A test rebuilds them and fails if the checked-in files are stale.

```bash
npm run data       # rewrite assets/data/
npm run metadata   # regenerate the JSON-LD Dataset block
npm run images     # og-image.png + apple-touch-icon.png
npm run pin-figures
```

`robots.txt` and `sitemap.xml` sit at the root; the sitemap declares the
dashboard and both story deep links.

## How to cite, and what the method claims

The Sources section carries a ready-made citation with the reader's own access
date and a copy button, alongside a short method note that states plainly:

- Nothing here is original research — every figure is transcribed and attributed.
- "Confirmed" means someone looked, not that the figure is true.
- Derived figures are marked derived.
- **Ranges are not point figures.** Where a source gives a range the page may
  show a midpoint, and that midpoint is *not* marked confirmed — Saudi Arabia
  and Iran at 27% of Islamic finance assets are the live example, because the
  source says 25–30%.
- Blank means unpublished, not zero, and unpublished figures are not counted
  against the verified total either.

## Being citable and findable

Three things turn a dashboard into something people link to and cite.

**Every source is followable.** `src/data/sources.js` carries a URL for all nine
citations, and a `reached` field recording what a request to it actually
returned — `ok` for a 200, `blocked` where the publisher refuses automated
requests (Pew and the IMF both 403 anything that is not a browser), which is not
the same as a dead link but is not a confirmation either. The Sources section
renders the list, states what each source is cited for and how much of it has
been checked, and clicking any provenance marker on the page jumps to its
citation.

The "cited for" line is derived from the markers in the markup plus the story's
own stats, never written by hand, so a source cannot claim to back a chart it
does not — and a source that stops being cited shows up as unused rather than
lingering.

**Shared links render as a card.** Open Graph and Twitter tags, with a 1200×630
image generated by `npm run images`: authored as SVG in the page's palette and
rasterised in the real brand fonts, so it tracks the design instead of being a
screenshot that goes stale. It also shows the live verified-figure count, so the
card cannot overstate what has been checked.

**A data index can read the page.** `npm run metadata` regenerates a
`schema.org/Dataset` block from the data — 39 places, 10 measures, 3
distributions and all 9 citations. This is the route by which Google Dataset
Search and similar indexes find data resources, and it has to be static in the
HTML because those crawlers do not reliably run JavaScript. `npm test` fails if
the block is not what the script would produce, so editing the data without
regenerating cannot ship.

```bash
npm run images     # og-image.png + apple-touch-icon.png
npm run metadata   # regenerate the JSON-LD Dataset block
```

The canonical origin appears in exactly two places — the `<head>` of index.html
and `BASE` in `scripts/build-metadata.mjs`. Moving the site means changing those.

**No licence is declared**, deliberately. `schema.org/Dataset` supports a
`license` property and indexes weight it, but inventing terms for figures
compiled from someone else's reporting would be a claim this project cannot
make. Decide the terms and the structured data should carry them.

## Typography

| Role | Face |
|---|---|
| Headings, KPI figures, story stats | **Fraunces** (variable serif) |
| Body, UI, chart labels, wordmark | **Scoutie Sans** (variable, 400-700 + italics) |
| Arabic / RTL | **IBM Plex Sans Arabic** |

Scoutie Sans replaced IBM Plex Sans as the body face. The two are close to
metrically identical -- x-height 0.5150em against 0.5160em, cap height 0.7000em
against 0.6980em -- so the swap needed no size retuning anywhere.

The wordmark is the one place the sans carries display weight: 700 with tight
tracking, which separates it from the serif headings without introducing a third
face.

`Scoutie Fallback` is Arial wearing Scoutie's metrics (2000 upm, x-height 1030,
ascender/descender 2000/−600), read out of the shipped woff2 rather than guessed,
so the page barely moves when the webfont lands.

**Coverage matters here.** Scoutie Sans ships latin, latin-ext and vietnamese --
no arrows (U+2190-21FF) and no geometric shapes (U+25A0-25FF). Every arrow and
caret in the UI is therefore inline SVG, not a character, and a test fails the
build if one creeps back into the markup. It does have `tnum`, which the tables,
KPI figures and chart axes all rely on.

## External dependencies

Loaded from CDN at runtime, not bundled:

- **D3 v7** and **TopoJSON** — global `d3` and `topojson`, loaded before `main.js`
- **world-atlas** country outlines, fetched at runtime
- **Fraunces** and **IBM Plex Sans** from Google Fonts

Both maps share one atlas fetch. If it fails, the map degrades to a written
fallback and the rest of the page is unaffected.

## Story mode

A scrollytelling view where a sticky graphic follows the step in the middle of
the viewport. Two stories share the machinery: `gap` drives the map (a layer and
a highlight per step), `hajj` drives a line chart revealed year by year. Both are
built lazily on first entry, since most visitors never open the view.

**Figures are derived, never transcribed.** `src/content/story-stats.js` computes
each headline number from `src/data` and declares which figures it rests on:

```js
fiveCountries: {
  html: () => `${FIVE.reduce((a, l) => a + pop(l), 0)}${u('M')}`,
  figs: FIVE.map(l => id('countryPop', l, 'pop')), src: 'pew', kind: 'derived',
},
```

They used to be hardcoded HTML strings duplicating numbers that already lived in
the data, so the story could drift out of agreement with the charts it sits
beside. It already had: the story asserted a GIEI score of 186.1 that existed
nowhere in `src/data`, and claimed "roughly 70%" where the data summed to 66%.

Because each stat names its figures, the story carries the **same provenance
marker and verification badge as every chart** — pointed at the figures of the
step currently on screen.

**Scroll is the primary path, never the only one.** A rail of step markers,
previous/next buttons and arrow keys all move the same state, and the step index
lives in the URL (`?v=story&s=gap&p=4`), so any moment in the story can be linked
to — including the Indonesia-versus-Malaysia comparison the whole narrative turns
on.

**The map is interactive.** Readers can hover, click or Tab through countries
while the story runs; the hover readout uses whichever layer the current step is
showing. Clicking pins the country for the dashboard.

**Steps can act.** Five carry a call to action — compare these two, show this on
the map, jump to that section — so the story hands off at the moment of interest
rather than only at the end.

## Market entry helper

Three questions produce a shortlist of four markets, scored out of 100 on this
page's own data. `src/features/entry-helper.js` keeps one function per question,
each returning a 0..1 fit plus the reasons behind it:

```js
const WEIGHTS = { sector: 35, model: 30, home: 20, market: 15 };
```

**Why the weights exist.** An earlier version added raw points -- population over
40, or `11 - rank` -- which let a single answer-independent term reach ten points
while the sector and region answers were worth six between them. Driving the real
helper through all 54 answer combinations showed what that produced:

| | before | after |
|---|---|---|
| Malaysia or Indonesia ranked #1 | 92% of combinations | 78% |
| Most frequent #1 | Malaysia, 59% | Malaysia, 41% |
| Distinct shortlists | 26 of 54 | 36 of 54 |
| "Where are you based" changed nothing | 6 of 36 pairs | 0 of 36 |

It was ranking the biggest halal markets rather than answering the question it
had just asked. Capping each dimension at 1 and weighting it explicitly fixed
that; `tests/entry-helper.test.mjs` re-runs the sweep and fails if a single
market ever takes the top spot in more than half of combinations.

**It shows its working.** Each result carries a fit bar and every factor that
earned points, and the lines are asserted to sum exactly to the score -- a
shortlist that shows its arithmetic and then doesn't add up is worse than one
that shows nothing. Where the four results land within eight points of each
other the helper says so, rather than letting 1-2-3-4 imply precision it hasn't
got.

**It admits what it doesn't know.** Only six countries have a published sector
rank, so on the heaviest-weighted dimension most candidates score zero. That is
missing evidence, not a poor fit, and a result affected by it says so instead of
looking like a considered judgement. No reweighting can lift that ceiling -- for
any given sector the data can only separate five to ten of the 32 candidates.

## Navigation

Ten sections behind a sticky nav is more than anyone holds in their head, so:

- **The section list survives on mobile.** It used to be `display:none` below
  600px, which left a phone with no way to move around the page but scrolling.
  It is now its own horizontally scrolling row.
- **The current section is marked** as you scroll (`aria-current` plus a visible
  style). `section-nav.js` picks the section nearest the middle of the viewport
  rather than the first one intersecting — several are in view at once and
  "first intersecting" flickers between them.
- **A section link pressed from story mode** returns to the dashboard first,
  since the sections it points at are hidden in that view.
- **The perspective switcher lives in the nav** as well as the hero, so the
  feature that reframes the whole page is reachable from anywhere. Both stay in
  sync through `applyAudience`.
- **Set-once controls** (language, copy link) sit behind one overflow menu, so
  the bar stops wrapping to two rows at tablet widths.

## Accessibility

- A **skip link** and a `<main>` landmark: 29 focusable controls used to sit
  between the top of the document and the first section, with no way past them.
- **Dialog focus is managed** in `core/dialog.js`. The changelog declares
  `aria-modal="true"`, so it holds Tab inside itself, closes on Escape, and
  returns focus to the control that opened it. The tour is a coach mark rather
  than a modal — it takes focus without trapping it, because it is talking about
  the page behind it.
- The element to return focus to is **passed explicitly**, never read from
  `document.activeElement`: Safari and Firefox do not focus a button when it is
  clicked, so relying on the active element would drop the reader at the top of
  the document.
- Typing in a field **cannot drive the tour** — the global arrow/Enter handler
  ignores events from inputs, selects and textareas.
- Countries are focusable and pinnable by keyboard; the map has a
  colour-blind-safe ramp (viridis endpoints) behind a toggle; every animation
  checks `prefers-reduced-motion`; charts carry `aria-label` summaries; and
  Arabic switches the document to RTL.

## Sources

Market sizes, sector figures, GIEI rankings, deal aggregates and trade figures:
DinarStandard, *State of the Global Islamic Economy Report*, 2025/26, 2024/25 and
2023/24 editions. Islamic finance composition and segment growth: IFSB *Islamic
Financial Services Industry Stability Report* 2025. Country shares of Islamic
finance assets: Global Finance / LSEG-ICD, rounded. Muslim population: Pew Research
Center, rounded. Hajj pilgrim counts: Saudi General Authority for Statistics.

Full source and method notes are in the page footer. Compiled 2 September 2026.
