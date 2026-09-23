import {actionsFor} from './actions.mjs';
import {projectSequence} from './planner.mjs';
export function orderingEvidence(state,chosen){
 if(!state.battle||chosen?.command.action!=='play_card')return null;
 const card=state.player?.hand?.find(c=>c.index===chosen.command.card_index);
 if(!card)return null;
 const actions=actionsFor(state),first=actions.find(a=>JSON.stringify(a.command)===JSON.stringify(chosen.command));
 if(!first)return null;
 const setups=actions.filter(a=>a.command.action==='play_card'&&a.command.card_index!==card.index&&(
  (card.type==='Attack'&&(/Whenever you play an Attack.*gain \d+ Block/i.test(a.details.description??'')||/Gain \d+ Strength|Apply \d+ Vulnerable/i.test(a.details.description??'')))||
  (Number(card.cost)>0&&/\bDraw \d+ cards?/i.test(a.details.description??''))
 ));
 if(!setups.length)return null;
 const pairs=setups.slice(0,8).map(a=>{
  const project=labels=>{try{return {forecast:projectSequence(state,labels)};}catch(e){return {unknown:e.message};}};
  return {alternativeFirst:a.label,proposedFirst:first.label,alternativeThenProposed:project([a.label,first.label]),proposedThenAlternative:project([first.label,a.label])};
 });
 return {proposedChoice:chosen.id,proposedPlan:chosen.plan??[{label:chosen.label,command:chosen.command}],pairs,note:'Ordering evidence is limited to two-action prefixes. Do not add independent forecasts together. Unknown draws, lethal targets and other boundaries prevent projection; they do not prove the alternative is bad. Only one action executes before re-observation.'};
}
export const orderingInstruction='Audit CARD ORDER, not just card quality. Compare the proposed first action with available setup before its triggers (Rage before attacks, Strength before affected hits, Vulnerable before follow-up attacks) and drawing while resources remain to use the results. Prefer a reorder when its concrete benefit improves the outcome without sacrificing something more important. Account for immediate lethal, setup cost, retaliation, exhaust/trigger interactions, play limits and required final facing. Excess block without a payoff is not automatically better. Do not trust partial forecasts over visible rules, assume unknown draws, or force a setup card. Keep the original choice when appropriate. Choose only an existing candidate ID; never issue or replay a complete sequence.';
