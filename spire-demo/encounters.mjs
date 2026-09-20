// No bestiary or prescribed tactics: only currently visible game information.
export function visibleState(state) {
 const s=structuredClone(state);
 // The draw pile is inspectable, but its future order is not player knowledge.
 if(Array.isArray(s.player?.draw_pile))s.player.draw_pile=s.player.draw_pile.map(c=>({name:c.name,cost:c.cost,description:c.description})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 if(s.crystal_sphere){
  s.crystal_sphere.cells=(s.crystal_sphere.cells??[]).map(c=>c.is_hidden?{x:c.x,y:c.y,is_hidden:true,is_clickable:c.is_clickable,is_highlighted:c.is_highlighted,is_hovered:c.is_hovered}:c);
 }
 return s;
}
export function deckSnapshot(s) {
 const cards=s.player?.deck;
 if(!Array.isArray(cards))return {available:false,cards:[]};
 const grouped=new Map();
 for(const c of cards){const key=JSON.stringify({name:c.name,cost:c.cost,description:c.description});const old=grouped.get(key);if(old)old.copies++;else grouped.set(key,{name:c.name,cost:c.cost,description:c.description,copies:1});}
 return {available:true,size:cards.length,cards:[...grouped.values()],energy:s.player.max_energy??null,relics:s.player.relics??[]};
}
export function encounterBrief(s) {
 const enemies=(s.battle?.enemies??[]).filter(e=>e.hp>0);
 return {name:[...new Set(enemies.map(e=>e.name))].join(' + ')||'Between encounters',
  source:'Current visible state only; no walkthrough, bestiary, prescribed target order or future attack pattern.',
  targets:enemies.map(e=>({id:e.entity_id,name:e.name,hp:e.hp,block:e.block??0,currentRules:e.status??[],intents:e.intents??[]}))};
}
export function encounterMemory(state,events) {
 const selected=events.filter(e=>e.kind==='decision'&&e.outcome==='executed');
 const fight=selected.filter(e=>e.state?.run?.floor===state.run?.floor&&e.state?.run?.act===state.run?.act&&e.state?.battle);
 const same=selected.filter(e=>e.state?.run?.floor===state.run?.floor&&e.state?.run?.act===state.run?.act&&e.state?.battle).slice(0,10).reverse();
 const build=selected.filter(e=>['card_reward','card_select','shop','rest_site','event'].includes(e.state?.state_type)).slice(0,8).reverse();
 const summarize=e=>({act:e.state.run?.act,floor:e.state.run?.floor,round:e.state.battle?.round,hpBefore:e.state.player?.hp,
  enemies:e.state.battle?.enemies.map(x=>({id:x.entity_id,name:x.name,hp:x.hp,intents:x.intents})),
  action:e.chosen.plan?.[0]??{label:e.chosen.label,command:e.chosen.command},
  jevAssessments:e.deliberation?Object.fromEntries(Object.entries(e.deliberation.assessments).map(([role,a])=>[role,{recommendation:e.candidates?.find(c=>c.id===a.choice)?.label??'unavailable',confidence:a.confidence}])):null});
 const rounds=new Map();
 for(const e of [...fight].reverse())if(!rounds.has(e.state.battle.round))rounds.set(e.state.battle.round,e.state);
 if(state.battle && !rounds.has(state.battle.round))rounds.set(state.battle.round,state);
 const observation=s=>({round:s.battle.round,hp:s.player.hp,enemies:s.battle.enemies.map(e=>({id:e.entity_id,name:e.name,hp:e.hp,strength:(e.status??[]).filter(p=>p.name==='Strength').reduce((n,p)=>n+p.amount,0),intents:e.intents}))});
 const turnHistory=[...rounds.values()].slice(-12).map(observation);
 const first=turnHistory[0];
 const progress=first&&state.battle?{sinceRound:first.round,playerHpChange:state.player.hp-first.hp,
  enemies:state.battle.enemies.map(e=>{const old=first.enemies.find(x=>x.id===e.entity_id);return {id:e.entity_id,name:e.name,hp:e.hp,hpChange:old?e.hp-old.hp:null,strengthChange:old?(e.status??[]).filter(p=>p.name==='Strength').reduce((n,p)=>n+p.amount,0)-old.strength:null};}),
  meaning:'Observed changes only, not a projection of future damage or attack patterns.'}:null;
 const previous=fight[0];
 const unfinishedPlan=previous?.state.battle.round===state.battle?.round && previous?.chosen.plan?.length>1?{executed:previous.chosen.plan[0].label,proposedRemaining:previous.chosen.plan.slice(1).map(p=>p.label),note:'Prior Jev intention only. Re-check legality and observations; do not replay old card indices.'}:null;
 return {turnHistory,progress,unfinishedPlan,sameFight:same.map(summarize),recentDeckDecisions:build.map(summarize),scope:'Bounded observations from this session only. Previous Jev assessments are fallible, not facts.'};
}
