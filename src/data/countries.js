/**
 * Country reference table plus the GIEI ranking history.
 *
 * `atlas` must match the country name in world-atlas TopoJSON; `label` is
 * what we display. Population in millions, `fin` and `bank` in percent.
 */

export const countries = [
  {atlas:'Malaysia',label:'Malaysia',pop:21,giei:165.1,giei2526:186.1,rank:1,verified:['rank','giei2526'],fin:12,bank:20.1,imports:30.6,lon:102,lat:4,region:'asia',oic:true,note:'Top-ranked in halal food, Islamic finance and pharma/cosmetics for the twelfth year. Halal imports grew 12.4% to $30.6B in 2024.'},
  {atlas:'Saudi Arabia',label:'Saudi Arabia',pop:34,giei:100.9,rank:2,fin:27,bank:74.9,lon:45,lat:24,region:'mena',oic:true,note:'Largest holder of Islamic finance assets alongside Iran; Islamic banks are roughly three-quarters of domestic banking. Largest OIC halal importer.'},
  {atlas:'Indonesia',label:'Indonesia',pop:236,giei:99.9,rank:3,fin:2,bank:5.5,lon:118,lat:-2,region:'asia',oic:true,note:'World\'s largest Muslim population and largest halal food market. #1 in modest fashion. Top destination for Islamic-economy investment (~$1.6B across 40 deals).'},
  {atlas:'United Arab Emirates',label:'United Arab Emirates',pop:7,giei:95.8,rank:4,fin:10,bank:22.7,lon:54,lat:24,small:true,region:'mena',oic:true,note:'Moved to #2 in the 2025/26 ranking; top three in every sector and #1 in media & recreation. ~$1.5B in deals across 50 transactions.'},
  {atlas:'Bahrain',label:'Bahrain',pop:1.2,giei:81.9,rank:5,fin:3.5,bank:16.1,lon:50.5,lat:26,small:true,region:'mena',oic:true,note:'Long-standing Islamic finance hub and a leading sukuk issuer.'},
  {atlas:'Jordan',label:'Jordan',pop:10,giei:71.4,rank:6,fin:null,bank:17.8,lon:36.5,lat:31,region:'mena',oic:true,note:'Islamic banks hold about 18% of domestic banking assets.'},
  {atlas:'Kuwait',label:'Kuwait',pop:3.5,giei:67.0,rank:7,fin:5.5,bank:51,lon:47.5,lat:29.4,small:true,region:'mena',oic:true,note:'Islamic banks hold about half of the domestic banking market.'},
  {atlas:'Pakistan',label:'Pakistan',pop:231,giei:64.1,rank:8,fin:2,bank:null,lon:69,lat:30,region:'asia',oic:true,note:'Entered the GIEI top ten for the first time in 2024/25.'},
  {atlas:'Turkey',label:'Türkiye',pop:81,giei:64.0,rank:9,fin:3.5,bank:null,lon:35,lat:39,region:'mena',oic:true,note:'Among the five largest OIC halal importers and a major exporter into OIC markets; #2 in modest fashion (2024/25).'},
  {atlas:'Qatar',label:'Qatar',pop:2,giei:60.4,rank:10,fin:5.5,bank:28.6,lon:51.2,lat:25.3,small:true,region:'mena',oic:true,note:'Islamic banks hold about 29% of domestic banking assets.'},
  {atlas:'United Kingdom',label:'United Kingdom',pop:4,giei:null,rank:14,fin:null,bank:null,lon:-2,lat:54,region:'west',oic:false,note:'Ranked 14th, up one place. The leading Western hub for Islamic finance and sukuk listings.'},
  {atlas:'Singapore',label:'Singapore',pop:0.9,giei:null,rank:15,fin:null,bank:null,lon:103.8,lat:1.35,small:true,region:'asia',oic:false,note:'Inside the GIEI top 15; MUIS certification is widely recognised across Southeast Asia.'},
  {atlas:'Iran',label:'Iran',pop:83,giei:null,rank:null,fin:27,bank:100,lon:53,lat:32,region:'mena',oic:true,note:'Fully Sharia-compliant banking system; roughly a quarter of global Islamic finance assets. Largest modest-fashion market by spend.'},
  {atlas:'India',label:'India',pop:200,giei:null,rank:null,fin:null,bank:null,lon:78,lat:22,region:'asia',oic:false,note:'Third-largest Muslim population; a leading supplier of halal meat into OIC markets.'},
  {atlas:'Bangladesh',label:'Bangladesh',pop:151,giei:null,rank:null,fin:null,bank:8.2,lon:90,lat:24,region:'asia',oic:true,note:'Second-largest national halal food market by spend after Indonesia.'},
  {atlas:'Nigeria',label:'Nigeria',pop:99,giei:null,rank:null,fin:null,bank:null,lon:8,lat:9,region:'mena',oic:true,note:'Eighth-largest domestic halal market. Africa is the fastest-growing halal region at ~9.6% a year.'},
  {atlas:'Egypt',label:'Egypt',pop:90,giei:null,rank:null,fin:null,bank:13.7,lon:30,lat:27,region:'mena',oic:true,note:'Third-largest national halal food market by spend.'},
  {atlas:'Algeria',label:'Algeria',pop:43,lon:3,lat:28,region:'mena',oic:true},
  {atlas:'Sudan',label:'Sudan',pop:42,bank:100,lon:30,lat:15,region:'mena',oic:true,note:'Banking system is entirely Islamic.'},
  {atlas:'Iraq',label:'Iraq',pop:40,lon:44,lat:33,region:'mena',oic:true},
  {atlas:'Afghanistan',label:'Afghanistan',pop:38,lon:66,lat:34,region:'asia',oic:true},
  {atlas:'Ethiopia',label:'Ethiopia',pop:38,lon:39,lat:9,region:'mena',oic:false},
  {atlas:'Morocco',label:'Morocco',pop:37,lon:-6,lat:32,region:'mena',oic:true,note:'Topped halal-food deal value in 2023/24 with a $610M sugar acquisition.'},
  {atlas:'Uzbekistan',label:'Uzbekistan',pop:30,lon:64,lat:41,region:'asia',oic:true},
  {atlas:'Yemen',label:'Yemen',pop:30,lon:48,lat:15,region:'mena',oic:true},
  {atlas:'China',label:'China',pop:25,lon:104,lat:35,region:'asia',oic:false},
  {atlas:'Niger',label:'Niger',pop:24,lon:9,lat:17,region:'mena',oic:true},
  {atlas:'Tanzania',label:'Tanzania',pop:22,lon:35,lat:-6,region:'mena',oic:false},
  {atlas:'Russia',label:'Russia',pop:20,lon:60,lat:58,region:'west',oic:false,note:'A top-five supplier of halal-related goods into OIC markets.'},
  {atlas:'Mali',label:'Mali',pop:20,lon:-3,lat:17,region:'mena',oic:true},
  {atlas:'Syria',label:'Syria',pop:19,lon:38,lat:35,region:'mena',oic:true},
  {atlas:'Senegal',label:'Senegal',pop:17,rank:25,lon:-14,lat:14,region:'mena',oic:true,note:'Rose 18 places to 25th in the 2024/25 ranking.'},
  {atlas:'Oman',label:'Oman',pop:4,bank:17.8,lon:57,lat:21,region:'mena',oic:true},
  {atlas:'Brunei',label:'Brunei',pop:0.4,bank:29.6,lon:114.7,lat:4.5,small:true,region:'asia',oic:true,note:'Islamic banking is ~30% of the domestic banking system.'},
  {atlas:'France',label:'France',pop:6,lon:2,lat:46,region:'west',oic:false},
  {atlas:'Germany',label:'Germany',pop:5,lon:10,lat:51,region:'west',oic:false},
  {atlas:'United States of America',label:'United States',pop:4,lon:-98,lat:39,region:'west',oic:false,note:'A top-five supplier of halal-related goods into OIC markets.'},
  {atlas:'Brazil',label:'Brazil',pop:0.2,lon:-52,lat:-10,region:'west',oic:false,note:'The largest exporter of halal meat to OIC countries, despite a tiny Muslim population.'},
  {atlas:'Australia',label:'Australia',pop:0.8,lon:134,lat:-25,region:'asia',oic:false,note:'Major halal meat exporter to the Gulf and Southeast Asia.'},
];

/* Normalise the sparse rows so every country carries every key. */
countries.forEach(c=>{ ['giei','giei2526','rank','fin','bank','imports'].forEach(k=>{ if(!(k in c)) c[k]=null; }); });
export const byAtlas = Object.fromEntries(countries.map(c=>[c.atlas,c]));
export const byLabel = Object.fromEntries(countries.map(c=>[c.label,c]));

/* Top-five GIEI position by report edition (1 = first, null = outside top five). */
export const rankHistory = { // top-5 by edition (1 = first). null = not in top 5
  editions:['2019/20','2023/24','2024/25','2025/26'],
  rows:[
    {c:'Malaysia',r:[1,1,1,1],verified:['2025/26']},{c:'Saudi Arabia',r:[4,2,2,3],verified:['2025/26']},{c:'Indonesia',r:[5,3,3,4],verified:['2025/26']},{c:'United Arab Emirates',r:[2,4,4,2],verified:['2025/26']},{c:'Bahrain',r:[3,5,5,5],verified:['2025/26']}
  ]
};
