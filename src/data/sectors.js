/**
 * The six halal consumer sectors, and the per-country sector rankings.
 * Values in USD billions. Source: DinarStandard SGIE 2025/26 & 2024/25.
 */

export const sectors = [
  {key:'food',   name:'Halal food & beverages', v2024:1530, v2029:2058, cagr:6.1,  verified:true},
  {key:'fashion',name:'Modest fashion',         v2024:347,  v2029:444,  cagr:5.1,  verified:true},
  {key:'media',  name:'Media & recreation',     v2024:276,  v2029:364,  cagr:5.7,  verified:true},
  {key:'travel', name:'Muslim-friendly travel', v2024:249,  v2029:424,  cagr:11.2, verified:true},
  {key:'pharma', name:'Pharmaceuticals',        v2024:112,  v2029:146,  cagr:5.5,  verified:true},
  {key:'cosm',   name:'Cosmetics',              v2024:92,   v2029:124,  cagr:6.2,  verified:true},
];

/** Sector names trimmed to fit a chart label; the full name is in `sectors`. */
export const shortName = n => n
  .replace('Muslim-friendly travel', 'Travel')
  .replace(' & beverages', '')
  .replace('Media & recreation', 'Media')
  .replace('Pharmaceuticals', 'Pharma');

// sector ranks: {sector: [rank, edition]}
export const sectorRanks = {
  'Malaysia':{food:[1,'25/26'],fin:[1,'25/26'],pharma:[1,'25/26'],media:[2,'25/26'],travel:[4,'25/26'],fashion:[4,'25/26'],verified:['food','fin','pharma','media','travel','fashion']},
  'United Arab Emirates':{media:[1,'25/26'],food:[2,'25/26'],travel:[2,'25/26'],fashion:[2,'25/26'],pharma:[2,'25/26'],fin:[3,'25/26']},
  'Indonesia':{fashion:[1,'24/25'],travel:[2,'24/25'],pharma:[2,'24/25']},
  'Saudi Arabia':{fin:[2,'24/25']},
  'Türkiye':{fashion:[2,'24/25']},
  'Bahrain':{fin:[4,'24/25']},
};
export const sectorCols=[['food','Halal food'],['fin','Islamic finance'],['travel','Travel'],['fashion','Modest fashion'],['pharma','Pharma & cosmetics'],['media','Media & recreation']];
