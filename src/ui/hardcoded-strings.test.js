import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir){const out=[];for(const e of readdirSync(dir)){const p=join(dir,e);const s=statSync(p);if(s.isDirectory())out.push(...walk(p));else out.push(p);}return out;}

const JS_ROOTS=['src/ui/app','src/ui/layouts'];

function isAllowed(value){
  const v=value.trim();
  if(!v) return true;
  if(v.startsWith('ui.')) return true;
  if(/^cognis_|^application\/|^content-type$/.test(v)) return true;
  if(/^\/?[a-z0-9_./:-]+$/i.test(v)) return true;
  if(/^Inter, Arial, sans-serif$/.test(v)) return true;
  if(v.includes('${')) return true;
  if(v.startsWith('.')) return true;
  if(/^(none|fade|float|dark|admin|user|enabled|disabled|available|ok|core|page|active)$/.test(v)) return true;
  return false;
}

test('no hardcoded user-facing string literals in ui js',()=>{
  const hits=[];
  for(const root of JS_ROOTS){
    for(const file of walk(root)){
      if(!file.endsWith('.js')) continue;
      const src=readFileSync(file,'utf8');
      for(const m of src.matchAll(/(['"])((?:\\.|(?!\1).)*)\1/g)){
        const val=m[2];
        if(!/[A-Za-z]/.test(val) || !/\s/.test(val)) continue;
        if(isAllowed(val)) continue;
        hits.push(`${file}: ${val.trim()}`);
      }
    }
  }
  assert.equal(hits.length,0,`Hardcoded UI strings found:\n${[...new Set(hits)].join('\n')}`);
});
