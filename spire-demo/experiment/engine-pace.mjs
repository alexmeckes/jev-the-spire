// Offline-only ablation. No server import or gameplay controls.
import {deliberate} from '../deliberation.mjs';
export function paceEvidence(state,recent){
 if(!state.battle)return null;
 const first=(recent?.turnHistory??[]).find(x=>x.round<state.battle.round);
 return {targets:state.battle.enemies.filter(e=>e.hp>0).map(e=>{
  const old=first?.enemies.find(x=>x.id===e.entity_id), rounds=first?state.battle.round-first.round:0;
  const pace=old&&rounds>0?Math.max(0,old.hp-e.hp)/rounds:null;
  const deadlines=(e.status??[]).flatMap(p=>{const m=(p.description??'').match(/In (\d+) turns?, you will be eaten and die/i);return m?[{rule:p.description,turns:Number(m[1]),requiredHpPerTurn:e.hp/Number(m[1])}]:[];});
  return {id:e.entity_id,hp:e.hp,observedNetHpRemovedPerRound:pace,observedRounds:rounds,deadlines};
 }),limitations:'Historical net HP reduction, not predicted damage. Healing, phases, setup, extensions, changing hands and partial current turns can distort pace. Deadline text is authoritative; do not infer hidden turns. No future draw or escape availability assumed.'};
}
export async function enginePaceDeliberate(options,variant){
 const deck=variant==='engine'&&options.state.state_type==='card_reward';
 const combat=variant==='pace'&&!!options.state.battle;
 if(!deck&&!combat)return deliberate(options);
 return deliberate({...options,ask:async payload=>{
  const p=structuredClone(payload);
  if(combat)p.state.observed_pace=paceEvidence(options.state,options.recent);
  const instruction=deck?
   'Establish one provisional CURRENT damage engine from actual owned card and relic text. Name its payoff, existing enablers, energy burden and draw bottleneck. If no coherent engine exists, admit it and favor reliable standalone improvement. Compare EVERY reward including Skip by its marginal contribution: engine output, consistent defense, access to strongest cards, or an urgent uncovered need. Require actual existing support, not hoped-for future picks. Extra setup competes with drawing its payoff. Do not force an archetype, skip automatically, or reject a strong standalone card. In the deck-need assessment explicitly distinguish the current damage engine from the largest unmet need.':
   'Use observed_pace to ask whether the CURRENT approach can finish before a visible deadline. A slower historical pace is a warning to compare available deadline extensions/escape, stronger damage and useful setup EARLY, not a proof of inevitable death. Name an actually available legal option before relying on it; ordinary block does not prevent rule-based death. Setup must have a plausible payoff inside the remaining window. With several enemies compare concentrating damage to remove one attacker against switching to prevent lethal damage or achieve safer final facing. Separate the damage focus from the final facing action; do not spread damage without a concrete payoff. Preserve all legal choices and uncertainty.';
  for(const q of Object.values(p.questions))q.instructions=(q.instructions??'')+' '+instruction;
  return options.ask(p);
 }});
}
