import {deliberate} from '../deliberation.mjs';
export function strengthSupport(state){
 const deck=state.player?.deck??[],relics=state.player?.relics??[];
 const strength=/\bgain\s+\d+\s+Strength\b/i;
 const sources=[...deck.map(c=>({...c,source:'card'})),...relics.map(c=>({...c,source:'relic'}))].filter(c=>strength.test(c.description??'')).map(c=>({name:c.name,cost:c.cost??null,rule:c.description,source:c.source}));
 const attacks=deck.filter(c=>/\bDeal \d+ damage\b/i.test(c.description??''));
 const cheap=attacks.filter(c=>/^\d+$/.test(String(c.cost))&&Number(c.cost)<=1);
 const repeated=attacks.filter(c=>/\btwice\b|\b\d+ times\b|\bReplay \d+/i.test(c.description??''));
 const draw=deck.filter(c=>/\bDraw \d+ cards?\b/i.test(c.description??''));
 return {eligible:sources.length>0&&(cheap.length>0||repeated.length>0),sources,cheapAttacks:cheap.map(c=>({name:c.name,cost:c.cost,rule:c.description})),repeatedAttacks:repeated.map(c=>({name:c.name,rule:c.description})),draw:draw.map(c=>({name:c.name,cost:c.cost,rule:c.description})),deckSize:deck.length,note:'Conservative text evidence, not a tier list or proven engine. Conditional Strength sources require their stated triggers. Printed costs do not guarantee free or affordable attacks. Unrecognized text is missing evidence, not proof of no synergy. Offers are not counted as already owned support.'};
}
export async function strengthDeliberate(options){
 const support=strengthSupport(options.state);
 if(options.state.state_type!=='card_reward'||!support.eligible)return deliberate(options);
 return deliberate({...options,ask:async payload=>{
  const p=structuredClone(payload);p.state.strength_support=support;
  for(const q of Object.values(p.questions))q.instructions=(q.instructions??'')+' Conditional preference only: the owned deck has visible Strength-source and affordable/repeated-attack evidence. Verify that the sources actually activate, then compare whether each reward increases useful attacks per turn, improves draw/energy access, or fixes a more urgent defensive weakness. Prefer that marginal contribution when justified, not merely a Strength label. Count existing copies: more setup can delay its payoff and another cheap attack can dilute defense or draw. Compare every offer with Skip; no fixed card ranking, no assumed future support, no forced archetype. The current largest bottleneck overrides synergy. Identify the existing source and payoff in your deck-need assessment.';
  return options.ask(p);
 }});
}
