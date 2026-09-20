import {actionComparison,comparisonInstruction} from './action-comparison.mjs';
import {decisionQuestion} from '../planner.mjs';
import {compactRequest} from '../compact-request.mjs';
export const SIMPLE_VERSION='simple-two-pass-v1';
const instruction=`Choose a supplied candidate ID. Work through three checks: (1) What can kill us this turn, including visible status damage, timing and special enemy rules? (2) Compare complete affordable sequences that prevent it through kills, defense, potions or a stated interruption. A prefix does not force ending, but unknown draws are not guaranteed rescue. (3) Among viable lines, which leaves the strongest position for winning the fight and run? Account for setup payoffs, potion timing, energy, target changes and future pressure. Exact visible rules outrank incomplete forecasts. Unknown is not safe. Only the first action executes before a fresh observation. Do not invent hidden information.`;
export async function simpleDeliberate({state,candidates,ask,recent=[],compare=false}){
 const base=decisionQuestion(state,candidates);
 base.state.recent_observations=recent;
 base.questions.move.instructions=instruction;
 if(compare){base.state.action_comparison=actionComparison(candidates);base.questions.move.instructions+=comparisonInstruction;}
 const first=await ask(compactRequest(base));
 const valid=r=>{if(r.answers?.move?.type!=='choice'||!candidates.some(c=>c.id===r.answers.move.choice))throw Error('Invalid simple choice');};
 valid(first);
 if(candidates.length===1)return first;
 const review=structuredClone(base);
 review.state.proposed_choice=first.answers.move.choice;
 review.questions.move.instructions=base.questions.move.instructions+' Audit the proposed choice against its strongest alternative. Check missed kills, unused useful energy, needless setup and whether a potion must precede the next card. Keep or change the proposal based on visible evidence; it is not independent evidence.';
 const final=await ask(compactRequest(review));valid(final);
 return {...final,usage:{input_tokens:(first.usage?.input_tokens??0)+(final.usage?.input_tokens??0),output_tokens:(first.usage?.output_tokens??0)+(final.usage?.output_tokens??0)},deliberation:{version:compare?'simple-two-pass-comparison-v1':SIMPLE_VERSION,calls:2}};
}

export const comparisonDeliberate=args=>simpleDeliberate({...args,compare:true});
