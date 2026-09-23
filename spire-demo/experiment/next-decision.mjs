import {deliberate} from '../deliberation.mjs';
// Offline-only: preserve the existing enemy-turn estimate and expose its horizon.
export function nextDecisionForecast(state, forecast) {
 if(!forecast)return forecast;
 const rules=(state.player.status??[]).flatMap(p=>{
  const m=(p.description??'').match(/^At the start of your turn, lose (\d+) HP\b/i);
  return m?[{name:p.name,hpLoss:Number(m[1]),rule:p.description}]:[];
 });
 const defeated=new Set([...(forecast.defeatedEnemies??[]).map(e=>e.id),...(forecast.departedMinions??[]).map(e=>e.id)]);
 const combatContinues=(state.battle?.enemies??[]).some(e=>e.hp>0&&!defeated.has(e.entity_id));
 const loss=combatContinues?rules.reduce((n,r)=>n+r.hpLoss,0):0;
 const hp=forecast.hpAfter;
 const unknown=hp==null||forecast.quality==='unknown'||(forecast.delayedDeathEffects??[]).length>0;
 return {...forecast,nextDecision:{knownStartTurnHpLoss:loss,rules:combatContinues?rules:[],hpAfterKnownUpkeep:unknown?null:Math.max(0,hp-loss),survivesKnownUpkeep:unknown?null:hp>loss,note:'Existing survives/hpAfter cover only the previous forecast horizon. This adds visible active start-turn HP loss only; healing, ordering, revival and other unmodeled effects may alter the result. Newly played unsupported powers remain unknown. Not a full-turn simulator.'}};
}
export function setupEvidence(state){
 const enemies=(state.battle?.enemies??[]).filter(e=>e.hp>0);
 if(!enemies.length||enemies.some(e=>(e.intents??[]).some(i=>/attack|deathblow/i.test(i.type??'')||/attack.*damage/i.test(i.description??''))))return null;
 return {visibleIntents:enemies.map(e=>({name:e.name,intents:e.intents})),setupOptions:(state.player.hand??[]).filter(c=>c.can_play&&c.type==='Power').map(c=>({name:c.name,cost:c.cost,rule:c.description})),note:'No ordinary attack is advertised. This does not prove zero damage: inspect all visible rules and possible block payoffs. Compare recurring benefits and HP costs with immediate block; do not assume an unsupported power has zero value.'};
}
export async function horizonDeliberate(options,{setup=false}={}){
 const candidates=options.candidates.map(c=>({...c,forecast:nextDecisionForecast(options.state,c.forecast)}));
 return deliberate({...options,candidates,ask:async payload=>{
  const p=structuredClone(payload);
  p.state.next_decision_safety=candidates.filter(c=>c.forecast?.nextDecision).map(c=>({choice:c.id,...c.forecast.nextDecision}));
  if(setup)p.state.setup_opportunity=setupEvidence(options.state);
  for(const q of Object.values(p.questions))q.instructions=(q.instructions??'')+' Check survival through the next controllable decision, including visible start-turn HP costs. Surviving enemy attacks at 1 HP is not enough if mandatory upkeep then costs 1 HP. Compare legal draw options while resources remain if the proposed line dies under known effects; unknown draws are opportunities, never guaranteed saves.'+(setup?' When no attack is advertised, compare useful recurring setup against immediate block with no visible payoff. Include setup HP costs, current lethal options and special mechanics. All candidates remain available; Jev chooses.':'');
  return options.ask(p);
 }});
}
