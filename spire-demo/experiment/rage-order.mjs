import {actionsFor} from '../actions.mjs';
import {projectSequence} from '../planner.mjs';
import {deliberate} from '../deliberation.mjs';
export function rageOrderEvidence(state){
 const actions=actionsFor(state),rage=actions.find(a=>a.command.action==='play_card'&&a.details?.name?.replace(/\+$/,'')==='Rage');
 if(!rage)return null;
 const comparisons=[];
 for(const attack of actions.filter(a=>a.command.action==='play_card'&&a.details?.type==='Attack')){
  let before,after,error;
  try{before=projectSequence(state,[rage.label,attack.label]);after=projectSequence(state,[attack.label,rage.label]);}catch(e){error=e.message;}
  comparisons.push({attack:attack.label,rageFirst:before??null,rageAfter:after??null,error:error??null,note:'Two-action prefixes followed by ending, not complete turns. A boundary (draw, kill, play limit) prevents comparing continuations. Partial forecasts retain limitations.'});
 }
 return {rage:rage.label,rule:rage.details.description,comparisons};
}
export async function rageDeliberate(options){
 const evidence=rageOrderEvidence(options.state);if(!evidence?.comparisons.length)return deliberate(options);
 return deliberate({...options,ask:async payload=>{
  const p=structuredClone(payload);p.state.rage_order_comparison=evidence;
  for(const q of Object.values(p.questions))q.instructions=(q.instructions??'')+' Before playing an attack, compare affordable setup whose benefit requires later attacks. Rage grants block for subsequent attacks, not retrospectively. Inspect the supplied Rage-first versus Rage-after comparisons, and compare longer legal sequences. Prefer useful setup before its triggers when it improves survival without sacrificing a better outcome. Do not blindly play Rage: immediate lethal, play limits, retaliation, setup cost, no incoming damage, competing effects, or another beneficial ordering may change the choice. Draw/kill boundaries and unknowns are not proven failure. All legal actions remain available; use the exact visible rule and re-observe after the first action.';
  return options.ask(p);
 }});
}
