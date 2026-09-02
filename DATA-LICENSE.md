# Data licence

The source code is MIT (see [LICENSE](LICENSE)). The data is different, because
most of it is not ours to give away.

## What is licensed, and what is not

**Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/):**

- the **compilation** — the selection, structuring and normalisation of the
  figures in `src/data/`
- the **verification metadata** — which figures were checked, against which
  retrieved source, on which date (`tests/confirmed-figures.json`,
  `assets/data/halal-economy-verification.csv`, and the `verified` flags
  throughout `src/data/`)
- the derived figures the page computes — sector growth rates, population sums
  and ratios, and the scoring in the market entry helper
- the written analysis, story text and section commentary

Use any of it, including commercially, with attribution.

**Not licensed here — the underlying figures.** The market sizes, GIEI scores
and ranks, deal aggregates, trade volumes, population estimates, banking shares
and pilgrim counts are reproduced from the publishers listed in
[`src/data/sources.js`](src/data/sources.js) and in the Sources section of the
page. They remain the property of those publishers:

- DinarStandard, *State of the Global Islamic Economy Report* (2019/20–2025/26)
- Islamic Financial Services Board, *IFSI Stability Report 2025*
- Global Finance Magazine / LSEG-ICD
- Pew Research Center
- International Monetary Fund, *World Economic Outlook*
- Saudi General Authority for Statistics (GASTAT)
- SMIIC and the certification bodies listed in the directory

They are reproduced here for reference and comment, with attribution, in the
quantities a reference work requires. **If you intend to redistribute those
figures at scale, or use them commercially, check the originating publisher's
terms.** Nothing in this file grants rights over them, and it cannot.

## Attribution

> jahit (2026). *The Halal Economy*. Compiled from DinarStandard SGIE 2025/26,
> IFSB 2025, Global Finance and GASTAT. CC BY 4.0.
> https://halal-economy.com/

## A caveat worth reading

Individual facts are generally not copyrightable — in the United States that is
the *Feist* principle — but the selection and arrangement of a compilation can
be, and the UK and EU recognise a separate database right protecting substantial
investment in assembling data even where the facts themselves are free. The
split above reflects that: the compilation and the verification work are ours to
license, the facts are not.

This is a statement of intent, not legal advice. If this data is going to be
relied on commercially or redistributed at scale, it is worth ten minutes with
someone who does this professionally.
