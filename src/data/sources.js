/**
 * Provenance registry. Every figure on the page carries a `.src` marker
 * whose `data-s` keys into `sources` and `data-k` into `kinds`.
 */

/*
 * `url` is where a reader goes to check the figure themselves — the whole point
 * of a reference. Each was requested before being added here.
 *
 * `reached` records what that request returned: 'ok' for a 200, 'blocked' where
 * the publisher refuses automated requests (Pew and the IMF both return 403 to
 * anything that isn't a browser), which is not the same as a dead link but is
 * not a confirmation either. Deep links rot; where a specific page could not be
 * confirmed the entry points at the publisher's stable topic index instead.
 */
export const sources = {
  sgie2526:{
    name:'DinarStandard, State of the Global Islamic Economy Report 2025/26', date:'June 2026',
    url:'https://www.dinarstandard.com/insights/state-of-the-global-islamic-economy-report-2025-26', reached:'ok',
  },
  sgie2425:{
    name:'DinarStandard, State of the Global Islamic Economy Report 2024/25', date:'July 2025',
    url:'https://www.dinarstandard.com/insights/sgier-2024-25', reached:'ok',
  },
  'sgie-multi':{
    name:'DinarStandard SGIE reports, 2019/20 – 2025/26 editions', date:'2019–2026',
    url:'https://salaamgateway.com/specialcoverage/SGIE25-26', reached:'ok',
  },
  ifsb:{
    name:'IFSB Islamic Financial Services Industry Stability Report 2025', date:'May 2025',
    url:'https://www.ifsb.org/wp-content/uploads/2025/05/IFSI-Stability-Report-2025.pdf', reached:'ok',
  },
  gf:{
    name:'Global Finance Magazine / LSEG-ICD IFDI, rounded shares', date:'2024',
    url:'https://gfmag.com/banking/islamic-finance-just-muslim-majority-nations/', reached:'ok',
  },
  pew:{
    name:'Pew Research Center global religious demographics, rounded', date:'2020 base',
    url:'https://www.pewresearch.org/religion/', reached:'blocked',
  },
  imf:{
    name:'IMF World Economic Outlook, nominal GDP 2024, rounded', date:'2024',
    url:'https://www.imf.org/en/Publications/WEO', reached:'blocked',
  },
  gastat:{
    name:'Saudi General Authority for Statistics (GASTAT)', date:'2012–2026',
    url:'https://www.stats.gov.sa/en/statistics-tabs/-/categories/1051', reached:'ok',
  },
  cert:{
    name:'Certifier and accreditation-body websites; SMIIC', date:'Reference list',
    url:'https://smiic.org/en/standards', reached:'ok',
  },
};
export const kinds={reported:'Reported figure',derived:'Derived from reported figures',approx:'Approximate / rounded estimate',reference:'Reference list, verify before use'};
export const glossary = {
  sukuk:'Sukuk: Sharia-compliant certificates that give the holder a share in an asset or project\'s returns, used in place of interest-bearing bonds.',
  takaful:'Takaful: co-operative insurance in which members pool contributions and share risk, structured to comply with Islamic law.',
  sharia:'Sharia-compliant: structured to avoid interest, excessive uncertainty and prohibited industries such as alcohol, gambling and conventional finance.',
  oic:'OIC: the Organisation of Islamic Cooperation, 57 member states across four continents.',
  giei:'GIEI: the Global Islamic Economy Indicator, DinarStandard\'s composite ranking of national Islamic-economy ecosystems (81 countries, 52 metrics).',
  halal:'Halal: permissible under Islamic law. In trade it usually refers to certified compliance across ingredients, processing and supply chain.'
};
