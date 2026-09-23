// Evidence from executed visible actions only; never infer direction from names.
export function facingState(state,events=[]){
 if(!state.battle || !(state.player?.status??[]).some(p=>/targeting cards or potions.*orientation/i.test(p.description??'')))return state;
 const hit=events.find(e=>e.outcome==='executed'&&e.state?.run?.act===state.run?.act&&e.state?.run?.floor===state.run?.floor&&['play_card','use_potion'].includes(e.chosen?.command?.action)&&state.battle.enemies.some(x=>x.entity_id===e.chosen.command.target));
 return {...state,facingEvidence:hit?{target:hit.chosen.command.target,source:'Most recent executed targeted card/potion in this encounter',time:hit.time}:null};
}
export function facingDamage(state,steps,enemies){
 const targets=state.battle?.enemies??[];
 const sides=targets.map(e=>(e.status??[]).find(p=>/^BACK_ATTACK_(LEFT|RIGHT)_POWER$/.test(p.id??'')&&/50% more damage.*from behind/i.test(p.description??''))?.id);
 if(targets.length!==2||sides.some(x=>!x)||new Set(sides).size!==2)return null;
 const current=state.facingEvidence?.target;
 if(!targets.some(e=>e.entity_id===current))return null;
 // Death/ally-death interactions alter damage and require another observation.
 if(enemies.some(e=>e.hp<=0))return null;
 const final=[...steps].reverse().find(a=>['play_card','use_potion'].includes(a.command.action)&&targets.some(e=>e.entity_id===a.command.target))?.command.target??current;
 let low=0,high=0;
 for(const e of targets){
  for(const intent of e.intents??[]){
   if(!/attack/i.test(intent.type??''))continue;
   const m=String(intent.label).match(/^(\d+)(?:\s*[x×]\s*(\d+))?$/);if(!m)return null;
   const displayed=+m[1],hits=+(m[2]??1);
   if(final===current){low+=displayed*hits;high+=displayed*hits;continue;}
   // Keep both rounding conventions; no double multiplication of rear damage.
   const bases=e.entity_id===current?[displayed]:Array.from({length:displayed+1},(_,n)=>n).filter(n=>Math.floor(n*1.5)===displayed||Math.ceil(n*1.5)===displayed);
   if(!bases.length)return null;
   const values=e.entity_id===final?bases:bases.flatMap(n=>[Math.floor(n*1.5),Math.ceil(n*1.5)]);
   low+=Math.min(...values)*hits;high+=Math.max(...values)*hits;
  }
 }
 return {currentTarget:current,finalTarget:final,incomingMin:low,incomingMax:high,source:'Displayed intents normalized by visible 50% back-attack rule; rounding range. Assumes no other intent-changing effect in this prefix.'};
}
