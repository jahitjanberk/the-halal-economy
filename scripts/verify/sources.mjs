/**
 * Where the fact-check agent looks, per dataset.
 *
 * Each source becomes an entry in `checks` (src/data/verification.js) the first
 * time a figure is confirmed against it, so `key`, `label` and `url` are what a
 * reader will see in the provenance tooltip. Only list a page you would be
 * happy to cite: the agent quotes it word for word as evidence.
 *
 * A source's value matches when, rounded to the decimals the dashboard
 * writes its figure with, it gives the dashboard's figure (see roundsTo in
 * lib.mjs): 1,673,230 matches 1.67, but 239.1 million does not match 236.
 *
 * `hint` is passed to the model to say how the source lays figures out. It
 * never contains the dashboard's own value: the agent extracts blind, and the
 * comparison happens afterwards, in code.
 */
export const SOURCES = {
  hajj: {
    unit: 'million pilgrims',
    /* The year is the record; look for it, and the words around a total. */
    terms: rec => [String(rec.y)],
    hint: 'Total Hajj pilgrims (internal plus external) for one Hajj season, by Gregorian year. Ignore partial counts such as external-only, male-only or by port.',
    sources: [
      {
        key: 'gastat2025',
        label: 'GASTAT Hajj Statistics Publication 2025',
        url: 'https://www.stats.gov.sa/documents/d/guest/hajj-statistics-publication-2025en-1-pdf',
      },
      {
        key: 'gastat2026press',
        label: 'GASTAT Hajj 2026 figures, as reported by Asharq Al-Awsat',
        url: 'https://english.aawsat.com/node/5277497',
      },
      {
        key: 'argaamHajj',
        label: 'Argaam, GASTAT pilgrim series 2007–2025',
        url: 'https://www.argaam.com/en/article/articledetail/id/1819580',
      },
    ],
  },

  countryPop: {
    unit: 'million Muslims',
    terms: rec => [rec.label, rec.atlas],
    hint: 'Number of Muslims living in the country in 2020. Pew\'s Appendix B has one row per country per year, with columns in this order: Place, Year, Population, % Christian, % Muslim, % religiously unaffiliated, % Buddhist, % Hindu, % Jewish, % other religions. Use the 2020 row, not 2010. The Muslim count is Population × % Muslim, the SECOND percentage after the population, so use method "percent_of" with the population and then % Muslim, and quote the whole row.',
    sources: [
      {
        key: 'pew2025appB',
        label: 'Pew Research Center, Religious Composition by Country 2010–2020 (Appendix B)',
        url: 'https://www.pewresearch.org/wp-content/uploads/sites/20/2025/06/PR_2025.06.09_global-religious-change_appendix-b.pdf',
      },
    ],
  },
};
