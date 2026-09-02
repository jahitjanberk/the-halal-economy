/**
 * The choropleth engine. `createMap` is reused by the dashboard map and the
 * story map, so it owns no page state — callers drive it through the returned
 * handle (setLayer / setHighlight / repaint) and the `opts` callbacks.
 *
 * Small states can't be seen at this projection, so they render as markers
 * instead of filled paths.
 */
import { state } from '../core/state.js';
import { popFmt } from '../core/dom.js';
import { countries, byAtlas } from '../data/countries.js';

export const rampsNormal={pop:['#DDEDE6','#1F7A63'],giei:['#F3EAD0','#B8912F'],fin:['#DDEDE6','#132D28']};
export const rampsCB={pop:['#FDE725','#440154'],giei:['#FDE725','#440154'],fin:['#FDE725','#440154']}; // viridis endpoints

/** What each map layer reads, how it formats, and its colour domain. */
export const layers = {
  pop:{hint:'Estimated Muslim population, millions',get:c=>c.pop,fmt:v=>popFmt(v),min:0,max:240,legMax:'240M'},
  giei:{hint:'Global Islamic Economy Indicator score, 2024/25 (top ten)',get:c=>c.giei,fmt:v=>v.toFixed(1),min:50,max:170,legMax:'165'},
  fin:{hint:'Approximate share of global Islamic finance assets, %',get:c=>c.fin,fmt:v=>v+'%',min:0,max:30,legMax:'30%'}
};

export function ramp(l){ const r=(state.cb?rampsCB:rampsNormal)[l]; return d3.interpolateRgb(r[0],r[1]); }
export const NODATA='#E8EDEA';
/* One shared fetch: both maps await the same TopoJSON. */
export const atlasPromise = fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r=>{ if(!r.ok) throw new Error('fetch'); return r.json(); });
export function colorFor(c, layerKey){ const L=layers[layerKey]; const v=L.get(c); if(v==null) return null; const t=Math.max(0,Math.min(1,(v-L.min)/(L.max-L.min))); return ramp(layerKey)(t); }

/** Build a map into `svgId`. Returns a handle for repainting it. */
export function createMap(svgId, opts){
  const svg=d3.select(svgId); const W=800,H=420;
  const st={layer:'pop',highlight:null,ready:false,paths:null,markers:null};
  const DIM = 0.3;          // opacity for countries outside the current highlight
  const RING = '#8A6A1E';   // dark gold, legible as an outline over a pale fill

  /*
   * Highlighting dims by opacity rather than overpainting.
   *
   * Flattening every other country to a single pale grey threw away the whole
   * choropleth the moment anything was pinned — and a pinned country whose own
   * value sits at the bottom of the ramp (Australia, 0.8M of 240M) came out the
   * same near-white as the countries being dimmed, so the selection was
   * invisible. Keeping real colours and marking the selection with a ring
   * separates "which is selected" from "how big is it".
   */
  function paint(){
    if(!st.ready) return;
    const hl = st.highlight;
    const lit = c => !hl || (c && hl.has(c.atlas));

    st.paths
      .attr('fill', d => { const c = byAtlas[d.properties.name]; return c && colorFor(c, st.layer) || NODATA; })
      .attr('fill-opacity', d => lit(byAtlas[d.properties.name]) ? 1 : DIM)
      .attr('stroke', d => lit(byAtlas[d.properties.name]) && hl ? RING : '#fff')
      .attr('stroke-width', d => lit(byAtlas[d.properties.name]) && hl ? 2.4 : .6)
      .attr('stroke-opacity', d => lit(byAtlas[d.properties.name]) ? 1 : DIM)
      .classed('nodata', d => !byAtlas[d.properties.name]);

    st.markers
      .attr('fill', d => colorFor(d, st.layer) || '#C9D3CE')
      .attr('fill-opacity', d => lit(d) ? 1 : DIM)
      .attr('stroke', d => lit(d) && hl ? RING : '#fff')
      .attr('stroke-width', d => lit(d) && hl ? 2.2 : 1)
      .attr('stroke-opacity', d => lit(d) ? 1 : DIM)
      .attr('r', d => lit(d) && hl ? 7 : 5);

    if(hl) st.paths.filter(d => { const c = byAtlas[d.properties.name]; return c && hl.has(c.atlas); }).raise();
  }
  atlasPromise.then(topo=>{
    const land=topojson.feature(topo,topo.objects.countries);
    const proj=d3.geoNaturalEarth1().fitExtent([[6,6],[W-6,H-6]],{type:'Sphere'});
    const path=d3.geoPath(proj);
    svg.append('path').attr('d',path({type:'Sphere'})).attr('fill','#FFFFFF').attr('stroke','#D9E2DD');
    st.paths=svg.append('g').selectAll('path').data(land.features).join('path').attr('class','country').attr('d',path);
    st.markers=svg.append('g').selectAll('circle').data(countries.filter(c=>c.small)).join('circle').attr('class','marker').attr('r',5)
      .attr('cx',d=>proj([d.lon,d.lat])[0]).attr('cy',d=>proj([d.lon,d.lat])[1]);
    if(opts && opts.interactive){
      const H2=(e,c)=>opts.onHover(c,e), L2=()=>opts.onLeave(), C2=(e,c)=>opts.onClick(c);
      st.paths.filter(d=>!!byAtlas[d.properties.name]).attr('tabindex',0).attr('role','button').attr('aria-label',d=>byAtlas[d.properties.name].label)
        .on('mousemove',(e,d)=>H2(e,byAtlas[d.properties.name])).on('mouseleave',L2).on('click',(e,d)=>C2(e,byAtlas[d.properties.name]))
        .on('focus',(e,d)=>opts.onHover(byAtlas[d.properties.name],null)).on('blur',L2)
        .on('keydown',(e,d)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); C2(e,byAtlas[d.properties.name]); } });
      st.markers.attr('tabindex',0).attr('role','button').attr('aria-label',d=>d.label).on('mousemove',H2).on('mouseleave',L2).on('click',C2).on('focus',(e,d)=>opts.onHover(d,null)).on('blur',L2).on('keydown',(e,d)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); C2(e,d);} });
    } else { st.paths.style('cursor','default'); st.markers.style('cursor','default'); }
    st.ready=true; paint(); opts && opts.onReady && opts.onReady();
  }).catch(()=>{ opts && opts.onFail && opts.onFail(); });
  return { setLayer(l){ st.layer=l; paint(); }, get layer(){ return st.layer; }, setHighlight(names){ st.highlight=names?new Set(names):null; paint(); }, repaint:paint };
}
