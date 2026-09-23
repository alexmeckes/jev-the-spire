import {readFile,writeFile} from 'node:fs/promises';
import {projectSequence,decisionCandidates} from '../planner.mjs';
const path=new URL('../../.private/spire-validation/',import.meta.url), corpus=JSON.parse(await readFile(new URL('corpus.json',path)));
const results=[];
for(const x of corpus){
 let row={id:x.id,split:x.split,card:x.card};
 try{
  const f=projectSequence(x.state,[x.chosen.plan?.[0]?.label??x.chosen.label]);
  const before=x.state.battle.enemies,after=x.after.battle.enemies;
  const matched=before.every(e=>after.some(a=>a.entity_id===e.entity_id));
  const actual=matched?before.reduce((n,e)=>{const a=after.find(a=>a.entity_id===e.entity_id);return n+e.hp-a.hp;},0):null;
  // Compare immediate aggregate enemy HP reduction only; not end-turn HP.
  row={...row,predictedDamage:f.damage,observedDamage:actual,match:actual!==null&&f.damage!==null?Math.abs(f.damage-actual)<.001:null,quality:f.quality,warnings:f.warnings};
 }catch(e){row.error=e.message;}
 results.push(row);
}
await writeFile(new URL('transition-results.json',path),JSON.stringify(results,null,2));
for(const split of ['development','holdout']){const r=results.filter(x=>x.split===split);console.log(split,JSON.stringify({n:r.length,match:r.filter(x=>x.match===true).length,mismatch:r.filter(x=>x.match===false).length,unscored:r.filter(x=>x.match==null).length}));}
console.log(JSON.stringify(results.filter(x=>x.match===false).map(x=>({id:x.id,card:x.card,predicted:x.predictedDamage,observed:x.observedDamage,quality:x.quality})).slice(0,12)));
