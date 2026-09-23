import {projectSequence} from './planner.mjs';
import {deliberate} from './deliberation.mjs';

// Persist Jev's executed intentions, never stale executable commands or indices.
export function persistentPlan(state,events=[]) {
 if(!state.battle)return null;
 for(const e of events){
  if(e.kind!=='decision'||e.outcome!=='executed')continue;
  if(e.state?.run?.act!==state.run?.act||e.state?.run?.floor!==state.run?.floor||!e.state?.battle)break;
  if(e.state.battle.round>state.battle.round)break;
  const chosen=e.chosen,steps=chosen?.plan??[{label:chosen?.label,command:chosen?.command}];
  if(!steps.some(p=>p.command?.action!=='end_turn'))continue;
  const targets=[...new Set(steps.map(p=>p.command?.target).filter(Boolean))];
  const firstCard=e.state.player?.hand?.find(c=>c.index===steps[0]?.command?.card_index);
  // Defensive interludes must not erase a still-relevant focus/setup intention.
  if(!targets.length&&firstCard?.type!=='Power')continue;
  const alive=targets.filter(id=>state.battle.enemies.some(x=>x.entity_id===id&&x.hp>0));
  const gone=targets.filter(id=>!alive.includes(id));
  return {sinceRound:e.state.battle.round,selectedPlan:steps.map(p=>p.label),executedFirst:steps[0]?.label,
   remainingTargets:alive,departedTargets:gone,playerHpChange:state.player.hp-e.state.player.hp,
   targetChanges:alive.map(id=>({id,hpBefore:e.state.battle.enemies.find(x=>x.entity_id===id)?.hp??null,hpNow:state.battle.enemies.find(x=>x.entity_id===id).hp})),
   note:'Prior selected plan, not a command or a permanent target order. Re-evaluate payoff and current legality. Departed targets invalidate their parts. A targeted action may have been for facing, not a kill commitment. Never replay old card indices.'};
 }
 return null;
}

export function benefitEvidence(state,candidates){
 if(!state.battle)return null;
 const end=candidates.find(c=>c.command.action==='end_turn')?.forecast;
 const seen=new Map();
 for(const c of candidates){
  const key=JSON.stringify(c.command);if(seen.has(key))continue;
  let f=null;
  try{f=projectSequence(state,[c.plan?.[0]?.label??c.label]);}catch{}
  const comparable=f&&end&&f.quality==='calculated'&&end.quality==='calculated';
  seen.set(key,{firstAction:c.command,label:c.plan?.[0]?.label??c.label,forecast:f,
   hpSavedIfEnding:comparable?end.hpLoss-f.hpLoss:null,
   note:'First-action projection only, followed by ending. A zero immediate gain does not rule out useful setup, draw, retained block, exhaust, relic triggers or a longer continuation. Null is unknown, not no benefit.'});
 }
 return {ending:end??null,actions:[...seen.values()],scope:'Existing known-effects simulator only. Forecasts retain warnings and unknowns. No new effects or hidden future draws are simulated. All candidates remain legal.'};
}

export async function planBenefitDeliberate(options){
 const evidence=benefitEvidence(options.state,options.candidates);
 const plan=options.recent?.persistentPlan??null;
 const result=await deliberate({...options,ask:async payload=>{
  const p=structuredClone(payload);
  p.state.action_benefits=evidence;p.state.persistent_plan=plan;
  for(const q of Object.values(p.questions))q.instructions+=' Before spending a resource, identify its concrete benefit and WHEN it arrives. Compare the first-action evidence with a useful continuation; a zero immediate gain is not proof a setup action is useless. Block or a block-multiplying potion with no incoming damage needs a visible retained-block, damage conversion, trigger or other payoff; do not assume ordinary block survives the turn. HP-for-energy needs affordable useful follow-up in this hand. Future powers need time and triggers before the visible deadline. Reconcile the persistent plan with changes in HP, targets, hand and intents. Maintain useful focus and setup intentions when still justified; change them for a concrete better outcome, death, phase change, survival or facing requirement. Old sequences are intentions, never commands to replay. Do not invent absent benefits; keep unsupported effects uncertain.';
  return options.ask(p);
 }});
 return {...result,deliberation:{...result.deliberation,planBenefitVersion:'v1',persistentPlan:plan,benefitCheck:true}};
}
