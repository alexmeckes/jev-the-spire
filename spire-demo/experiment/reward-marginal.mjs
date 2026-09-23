import {deliberate} from '../deliberation.mjs';
export function rewardComparison(state,candidates){
 const deck=state.player?.deck;
 const skip=candidates.find(c=>c.command.action==='skip_card_reward');
 if(state.state_type!=='card_reward'||!Array.isArray(deck)||!skip)return null;
 const norm=s=>(s??'').replace(/\+$/,'').toLowerCase();
 return {skipId:skip.id,deckSize:deck.length,offers:candidates.filter(c=>c.command.action==='select_card_reward').map(c=>({id:c.id,name:c.label,rule:c.details?.description,cost:c.details?.cost,existingCopies:deck.filter(x=>norm(x.name)===norm(c.label)).length})),note:'Skip preserves the current deck, not a lost turn. Adding changes N cards to N+1. This can improve capabilities but changes access to existing cards. No fixed deck-size limit or mandatory skip quota. Draw, exhaust, Innate, relic acquisition triggers and immediate weaknesses can outweigh dilution.'};
}
export async function marginalDeliberate(options){
 const comparison=rewardComparison(options.state,options.candidates);
 if(!comparison)return deliberate(options);
 let stage=0;
 return deliberate({...options,ask:async payload=>{
  const p=structuredClone(payload);p.state.reward_marginal_comparison=comparison;
  const instruction='Evaluate the resulting deck, not which offered card is strongest in isolation. For each card compare ADD versus keeping the current deck: identify an unmet need it solves, actual supported synergy, what useful draws it can displace, and whether existing copies already fill its role. Skip wins when no offer has a concrete expected net benefit; adding wins when the improvement outweighs that cost. Do not invent future support, impose a deck-size cap, target a skip percentage, or treat uncertain benefit as automatically negative. Strong standalone improvements and urgent defense still justify additions. Include visible relic effects triggered by taking a card. Pairwise assessments are fallible same-model opinions, not votes or binding gates. Final choice remains among ALL legal options.';
  for(const q of Object.values(p.questions))q.instructions=(q.instructions??'')+' '+instruction;
  if(stage++===0)for(const offer of comparison.offers)p.questions['marginal_'+offer.id]={type:'choice',criteria:{[offer.id]:`Add ${offer.name}: ${offer.rule}. Existing copies: ${offer.existingCopies}.`,[comparison.skipId]:'Keep the current deck unchanged; take none of these cards.'},instructions:instruction+' Compare only this offered card against keeping the deck. Select the better resulting deck, using current cards, relics and observed needs.'};
  return options.ask(p);
 }});
}
