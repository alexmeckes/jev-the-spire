import {exhaustSupport} from './exhaust-support.mjs';
import {deckSnapshot} from './encounters.mjs';
export function deckAssessment(state){
 const deck=deckSnapshot(state);
 if(!deck.available)return {available:false,note:'Deck unavailable; do not infer missing cards.'};
 const baseName=n=>(n??'').replace(/\+$/,'').toLowerCase();
 const conditional=deck.cards.filter(c=>/whenever|every|if |when |at the start|at the end/i.test(c.description??''));
 return {exhaustSupport:exhaustSupport(deck.cards,deck.relics),available:true,size:deck.size,energy:deck.energy,
  costs:deck.cards.reduce((a,c)=>{const k=String(c.cost);a[k]=(a[k]??0)+c.copies;return a;},{}),
  duplicates:deck.cards.filter(c=>c.copies>1).map(c=>({name:c.name,copies:c.copies,rule:c.description})),
  conditionalCards:conditional.map(c=>({name:c.name,copies:c.copies,rule:c.description})),
  offers:(state.card_reward?.cards??[]).map(c=>({name:c.name,cost:c.cost,rule:c.description,existingCopies:deck.cards.filter(d=>baseName(d.name)===baseName(c.name)).reduce((n,d)=>n+d.copies,0)})),
  note:'Counts describe the actual permanent deck; no hidden information or card rankings. Cost buckets are printed costs, not effective energy demand. Conditional cards include both trigger sources and payoffs: distinguish them using their full rules. A payoff is not its own enabler. Count only effects explicitly producing the required trigger, including restrictions and self-exhaust versus exhausting other cards. Missing support is a cost, not an automatic ban; assess standalone value too.'};
}
export const deckAssessmentInstruction='Use deck_assessment to identify the largest current bottleneck before choosing a reward. Compare each offered card and Skip against that bottleneck. For a conditional payoff, identify actual trigger-producing cards or relics and whether enough triggers exist for existing copies before adding another. For a duplicate, explain its marginal improvement rather than repeating why the first copy is useful. Compare reliable output per draw and playable energy costs, including cards that do nothing until setup. Do not assume future enablers. A reward need not solve every weakness, and Skip preserves existing weaknesses. The bottleneck assessment is a fallible hypothesis, not a forced choice or a vote.';
