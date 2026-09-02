/**
 * The metric rows used by the compare grid and its CSV export.
 *
 *   k     row label
 *   f     read the value off a country record
 *   fmt   render the value
 *   best  which end wins, so the grid can highlight it ('max' | 'min' | null)
 *   bar   denominator for the inline pill bar, when one makes sense
 */
import { sectorRanks } from './sectors.js';

export const cmpRows=[
  {k:'Muslim population',f:c=>c.pop,fmt:v=>v>=1?`~${Math.round(v)}M`:`~${Math.round(v*1000)}k`,best:'max'},
  {k:'GIEI rank',f:c=>c.rank,fmt:v=>'#'+v,best:'min'},
  {k:'GIEI score (2024/25)',f:c=>c.giei,fmt:v=>v.toFixed(1),best:'max',bar:186},
  {k:'Share of Islamic finance assets',f:c=>c.fin,fmt:v=>'~'+v+'%',best:'max',bar:30},
  {k:'Islamic banking share of domestic banking',f:c=>c.bank,fmt:v=>v+'%',best:'max',bar:100},
  {k:'Halal imports 2024',f:c=>c.imports,fmt:v=>'$'+v+'B',best:null},
  {k:'Halal food rank',f:c=>(sectorRanks[c.label]||{}).food?.[0],fmt:v=>'#'+v,best:'min'},
  {k:'Islamic finance rank',f:c=>(sectorRanks[c.label]||{}).fin?.[0],fmt:v=>'#'+v,best:'min'},
  {k:'Travel rank',f:c=>(sectorRanks[c.label]||{}).travel?.[0],fmt:v=>'#'+v,best:'min'},
  {k:'Modest fashion rank',f:c=>(sectorRanks[c.label]||{}).fashion?.[0],fmt:v=>'#'+v,best:'min'},
  {k:'Pharma & cosmetics rank',f:c=>(sectorRanks[c.label]||{}).pharma?.[0],fmt:v=>'#'+v,best:'min'},
  {k:'Media & recreation rank',f:c=>(sectorRanks[c.label]||{}).media?.[0],fmt:v=>'#'+v,best:'min'},
  {k:'OIC member',f:c=>c.oic?'Yes':'No',fmt:v=>v,best:null},
];
