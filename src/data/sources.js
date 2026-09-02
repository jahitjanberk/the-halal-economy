/**
 * Provenance registry. Every figure on the page carries a `.src` marker
 * whose `data-s` keys into `sources` and `data-k` into `kinds`.
 */

export const sources = {
  sgie2526:{name:'DinarStandard, State of the Global Islamic Economy Report 2025/26',date:'June 2026'},
  sgie2425:{name:'DinarStandard, State of the Global Islamic Economy Report 2024/25',date:'July 2025'},
  'sgie-multi':{name:'DinarStandard SGIE reports, 2019/20 – 2025/26 editions',date:'2019–2026'},
  ifsb:{name:'IFSB Islamic Financial Services Industry Stability Report 2025',date:'May 2025'},
  gf:{name:'Global Finance Magazine / LSEG-ICD IFDI, rounded shares',date:'2024'},
  pew:{name:'Pew Research Center global religious demographics, rounded',date:'2020 base'},
  imf:{name:'IMF World Economic Outlook, nominal GDP 2024, rounded',date:'2024'},
  gastat:{name:'Saudi General Authority for Statistics (GASTAT)',date:'2012–2026'},
  cert:{name:'Certifier and accreditation-body websites; SMIIC',date:'Reference list'},
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
