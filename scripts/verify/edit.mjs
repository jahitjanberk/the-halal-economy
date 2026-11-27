/**
 * Small, careful text edits to the data modules in src/data/, used when an
 * approved finding is applied. They change only the `verified` and
 * `checkedAgainst` keys of one record, and add a `checks` entry — never a
 * figure. Each returns the new file text and throws if it cannot be sure what
 * it is editing.
 */

/** Index of the brace that closes the one at `open`, skipping strings. */
function closeOf(src, open){
  let depth = 0;
  for(let i = open; i < src.length; i++){
    const c = src[i];
    if(c === "'" || c === '"' || c === '`'){
      for(i++; i < src.length && src[i] !== c; i++) if(src[i] === '\\') i++;
      continue;
    }
    if(c === '{' || c === '[') depth++;
    else if(c === '}' || c === ']'){ depth--; if(depth === 0) return i; }
  }
  throw new Error('Unbalanced braces.');
}

/** The top-level `{...}` records of `export const <name> = [ ... ]`. */
export function records(src, name){
  const head = new RegExp(`export const ${name}\\s*=\\s*\\[`).exec(src);
  if(!head) throw new Error(`No array called ${name}.`);
  const start = head.index + head[0].length - 1;
  const end = closeOf(src, start);
  const out = [];
  for(let i = start + 1; i < end; i++){
    /* Skip comments between records: they may mention braces. */
    if(src[i] === '/' && src[i + 1] === '/'){ i = src.indexOf('\n', i); continue; }
    if(src[i] === '/' && src[i + 1] === '*'){ i = src.indexOf('*/', i) + 1; continue; }
    if(src[i] === '{'){ const j = closeOf(src, i); out.push({ start: i, end: j + 1, text: src.slice(i, j + 1) }); i = j; }
  }
  return out;
}

/**
 * Mark `field` confirmed on the one record `ident` picks out, and say what it
 * was checked against.
 *
 *   ident  a key/value pair as written in the source, e.g. "label:'Indonesia'"
 *          or "y:2012"
 */
export function markVerified(src, { array, ident, field, check }){
  const matches = records(src, array).filter(r => new RegExp(`[{,]\\s*${ident.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[,}]`).test(r.text));
  if(matches.length !== 1) throw new Error(`Expected one record with ${ident} in ${array}, found ${matches.length}.`);
  const r = matches[0];
  let t = r.text;

  /* verified — refusing a figure that is already confirmed, so an existing
     confirmation is never silently relabelled with a different source. */
  const list = /verified:\s*\[([^\]]*)\]/.exec(t);
  const have = list ? list[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean) : [];
  if(/verified:\s*true/.test(t) || have.includes(field)) throw new Error(`${ident} ${field} is already confirmed.`);
  if(list){
    t = t.replace(list[0], `verified:[${[...have, field].map(f => `'${f}'`).join(',')}]`);
  } else {
    t = insertAfterIdent(t, ident, `verified:['${field}']`);
  }

  /* checkedAgainst */
  if(/checkedAgainst:\s*\{/.test(t)){
    t = t.replace(/checkedAgainst:\s*\{([^}]*)\}/, (m, inner) => {
      const pairs = inner.split(',').map(s => s.trim()).filter(Boolean).filter(p => !p.startsWith(field + ':'));
      return `checkedAgainst:{${[...pairs, `${field}:'${check}'`].join(',')}}`;
    });
  } else {
    t = t.replace(/(verified:\s*(?:true|\[[^\]]*\]))/, `$1,checkedAgainst:{${field}:'${check}'}`);
  }

  return src.slice(0, r.start) + t + src.slice(r.end);
}

/** Put a new key straight after the identifying one, matching the file's style. */
function insertAfterIdent(obj, ident, kv){
  const at = obj.indexOf(ident);
  if(at < 0) throw new Error(`Cannot find ${ident}.`);
  const after = at + ident.length;
  return obj.slice(0, after) + ',' + kv + obj.slice(after);
}

/**
 * Add (or refresh the date of) a retrieved source in the `checks` registry of
 * src/data/verification.js. New entries go just before `derived`.
 */
export function addCheck(src, key, { label, url, on }){
  const block = new RegExp(`\\n  ${key}: \\{[\\s\\S]*?\\n  \\},`);
  if(block.test(src)){
    return src.replace(block, m => m.replace(/on: '[^']*'/, `on: '${on}'`));
  }
  const anchor = '\n  derived: {';
  if(!src.includes(anchor)) throw new Error('Cannot find where to add the source in `checks`.');
  const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  const entry = `\n  ${key}: {\n    label: ${q(label)},\n    url: ${q(url)},\n    on: '${on}',\n  },`;
  return src.replace(anchor, entry + anchor);
}

/**
 * Where each dataset's records live, and how a figure id's middle part picks
 * one out. Datasets not listed here are applied by hand.
 */
export const LOCATIONS = {
  countryPop:        { file: 'src/data/countries.js', array: 'countries', ident: rec => `label:'${rec.label}'` },
  countryGiei:       { file: 'src/data/countries.js', array: 'countries', ident: rec => `label:'${rec.label}'` },
  countryFinance:    { file: 'src/data/countries.js', array: 'countries', ident: rec => `label:'${rec.label}'` },
  countryTrade:      { file: 'src/data/countries.js', array: 'countries', ident: rec => `label:'${rec.label}'` },
  hajj:              { file: 'src/data/series.js', array: 'hajj',            ident: rec => `y:${rec.y}` },
  consumerSpend:     { file: 'src/data/series.js', array: 'consumerSpend',   ident: rec => `y:${rec.y}` },
  islamicFinance:    { file: 'src/data/series.js', array: 'islamicFinance',  ident: rec => `y:${rec.y}` },
  oicImports:        { file: 'src/data/series.js', array: 'oicImports',      ident: rec => `y:${rec.y}` },
  finComposition:    { file: 'src/data/series.js', array: 'finComposition',  ident: rec => `name:'${rec.name}'` },
  finGrowth:         { file: 'src/data/series.js', array: 'finGrowth',       ident: rec => `name:'${rec.name}'` },
  finShareCountries: { file: 'src/data/series.js', array: 'finShareCountries', ident: rec => `name:'${rec.name}'` },
};
