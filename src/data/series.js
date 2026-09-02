/**
 * Time series and share breakdowns used by the trajectory, finance,
 * trade and pilgrimage charts. Trillions unless noted.
 */

export const consumerSpend = [{y:2018,v:2.20},{y:2022,v:2.29},{y:2023,v:2.43},{y:2024,v:2.60,verified:true},{y:2029,v:3.56,proj:true,verified:true}];
export const islamicFinance = [{y:2021,v:3.96},{y:2023,v:4.93},{y:2024,v:5.99,verified:true},{y:2029,v:9.72,proj:true,verified:true}];

/* Islamic finance breakdowns, % of assets and % year-on-year. */
export const finComposition = [{name:'Islamic banking',v:71.6},{name:'Sukuk outstanding',v:23.3},{name:'Funds & takaful',v:5.1}];
export const finGrowth = [{name:'Sukuk issuance',v:25.6,verified:true},{name:'Islamic banking',v:17.1,verified:true},{name:'Takaful (insurance)',v:16.9,verified:true}];
export const finShareCountries = [{name:'Saudi Arabia',v:27},{name:'Iran',v:27},{name:'Malaysia',v:12,verified:true},{name:'UAE',v:10,verified:true},{name:'Kuwait',v:5.5,verified:true},{name:'Qatar',v:5.5,verified:true},{name:'Türkiye',v:3.5,verified:true},{name:'Bahrain',v:3.5,verified:true},{name:'Indonesia',v:2,verified:true},{name:'Pakistan',v:2,verified:true}];

/* Trade and pilgrimage. Imports in USD billions, pilgrims in millions. */
export const oicImports = [{y:2022,v:359},{y:2023,v:407.8},{y:2024,v:421.5,verified:true},{y:2028,v:608.4,proj:true,verified:true}];
export const hajj = [{y:2012,v:3.16},{y:2019,v:2.49},{y:2020,v:0.01},{y:2021,v:0.06},{y:2022,v:0.93},{y:2023,v:1.85},{y:2024,v:1.83},{y:2025,v:1.67},{y:2026,v:1.71}];
