/**
 * Deal aggregates, listed Sharia-compliant vehicles, and the halal
 * certification / accreditation directory.
 */

export const deals = [
  {ed:'2025/26',scope:'Global',item:'All Islamic-economy sectors',n:346,v:13.11,verified:true,note:'Disclosed value; "accelerated" vs prior year'},
  {ed:'2024/25',scope:'Global',item:'All Islamic-economy sectors',n:225,v:5.8,note:'2023/24 activity'},
  {ed:'2024/25',scope:'Country',item:'Indonesia',n:40,v:1.60,note:'Top destination by value; food, cosmetics, pharma, halal tech'},
  {ed:'2024/25',scope:'Country',item:'United Arab Emirates',n:50,v:1.53,note:'Top destination by count; fintech and media'},
  {ed:'2024/25',scope:'Country',item:'Saudi Arabia',n:null,v:null,note:'Significant activity; values not broken out'},
  {ed:'2024/25',scope:'Country',item:'Türkiye',n:null,v:null,note:'Significant activity; values not broken out'},
  {ed:'2024/25',scope:'Sector',item:'Islamic finance',n:null,v:null,note:'Highest capital attracted'},
  {ed:'2024/25',scope:'Sector',item:'Media & recreation',n:null,v:null,note:'Most transactions'},
  {ed:'2024/25',scope:'Sector',item:'Halal food',n:29,v:1.3,note:'Focus on capacity expansion'},
  {ed:'2024/25',scope:'Halal food by country',item:'Morocco',n:null,v:0.61,note:'Single sugar acquisition'},
  {ed:'2024/25',scope:'Halal food by country',item:'United Arab Emirates',n:null,v:0.398,note:'Incl. vertical-farming investment'},
  {ed:'2024/25',scope:'Halal food by country',item:'Saudi Arabia',n:null,v:0.144,note:'Incl. JBS $50M processing plant'},
  {ed:'2024/25',scope:'Halal food by country',item:'Indonesia',n:null,v:0.115,note:''},
  {ed:'2024/25',scope:'Halal food by country',item:'Nigeria',n:null,v:0.016,note:''},
];
export const listed = [
  ['iShares MSCI World Islamic UCITS ETF (ISWD)','ETF','Global Sharia-screened equities'],
  ['Wahed FTSE USA Shariah ETF (HLAL)','ETF','US Sharia-screened equities'],
  ['SP Funds S&P 500 Sharia Industry Exclusions ETF (SPUS)','ETF','US Sharia-screened equities'],
  ['Al Rajhi Bank (Tadawul: 1120)','Bank','World\'s largest Islamic bank by assets'],
  ['Dubai Islamic Bank (DFM: DIB)','Bank','UAE Islamic banking'],
  ['Kuwait Finance House (Boursa Kuwait: KFH)','Bank','Gulf and Türkiye Islamic banking'],
  ['Bank Syariah Indonesia (IDX: BRIS)','Bank','Indonesia\'s largest Islamic bank'],
  ['Maybank (Bursa: MAYBANK)','Bank','Malaysia; Maybank Islamic is the largest Islamic bank in ASEAN'],
  ['BRF S.A. (B3: BRFS3)','Food','Brazilian poultry; largest halal exporter to the Gulf'],
  ['Almarai (Tadawul: 2280)','Food','Gulf dairy and food'],
  ['Nestlé Malaysia (Bursa: NESTLE)','Food','Halal-certified manufacturing hub for Nestlé globally'],
  ['Savola Group (Tadawul: 2050)','Food','Saudi food and retail'],
];
export const certBodies = [
  {c:'Malaysia',b:'JAKIM',n:'Government certifier; the most widely recognised halal mark internationally.'},
  {c:'Indonesia',b:'BPJPH (with MUI fatwa)',n:'Mandatory certification phasing in since 2019; further categories through 2026.'},
  {c:'United Arab Emirates',b:'MoIAT / EIAC-accredited bodies',n:'National halal mark; EIAC accredits foreign certifiers.'},
  {c:'Saudi Arabia',b:'SFDA / Saudi Halal Center',n:'Required for imported food; recognises accredited foreign certifiers.'},
  {c:'GCC (regional)',b:'GAC (GCC Accreditation Center)',n:'Accredits halal certifiers for all Gulf states.'},
  {c:'Türkiye',b:'HAK (Halal Accreditation Agency)',n:'Accreditation body; aligned with SMIIC standards.'},
  {c:'Singapore',b:'MUIS',n:'Widely recognised across Southeast Asia and the Gulf.'},
  {c:'Pakistan',b:'Pakistan Halal Authority',n:'Federal regulator under the Ministry of Science & Technology.'},
  {c:'Egypt',b:'IS EG Halal',n:'Sole authorised certifier for imports since 2020.'},
  {c:'United Kingdom',b:'HMC · HFA',n:'Two main private certifiers with differing slaughter standards.'},
  {c:'United States',b:'IFANCA · ISNA Halal · ISWA',n:'IFANCA is the SGIE report\'s strategic partner and is recognised by JAKIM, MUIS and GAC.'},
  {c:'Brazil',b:'CDIAL Halal · FAMBRAS Halal',n:'Certify the bulk of Brazil\'s poultry and beef exports to the OIC.'},
  {c:'Australia',b:'AFIC · HCAA · SICHMA',n:'Approved Islamic organisations under the government AGSMHP scheme.'},
  {c:'India',b:'Halal India · Jamiat Ulama-i-Hind Halal Trust',n:'Private certifiers; export focus.'},
  {c:'Multilateral',b:'SMIIC (OIC)',n:'Publishes OIC/SMIIC 1 halal food standard; 40+ member states.'},
];
