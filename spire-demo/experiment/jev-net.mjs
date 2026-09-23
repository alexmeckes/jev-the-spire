import {decisionQuestion} from '../planner.mjs';
import {compactRequest} from '../compact-request.mjs';

export function netQuestion(state,candidates,recent=[]) {
 const base=compactRequest(decisionQuestion(state,candidates)),move=base.questions.move;
 const roles={kill:'Find an affordable focused kill or interruption. Compare enemy attacks removed, retaliation, death triggers and facing. Do not spread damage without a concrete benefit.',survive:'Find the best immediate survival plan. Compare kills with block, HP costs, end-of-turn effects and visible death deadlines. Unknown is not safe.',setup:'Find the best useful setup or resource plan. Name the visible payoff and when it occurs. Reject setup that arrives after a death deadline; do not invent future draws.'};
 return {...base,state:{...base.state,recent_observations:recent,verification_scope:'Candidate forecasts are produced by the existing deterministic planner, not independent proof. Prefixes assume ending afterward. Unsupported effects, warnings and null survival remain uncertain. No future draws or enemy moves are known.'},questions:Object.fromEntries(Object.entries(roles).map(([role,instructions])=>[role,{...move,instructions:move.instructions+' '+instructions+' Recommend one supplied candidate; do not invent a sequence.'}]))};
}
export async function netDeliberate({state,candidates,recent=[],ask,onStage=()=>{}}) {
 if(candidates.length<=1)return {...await ask(compactRequest(decisionQuestion(state,candidates))),deliberation:null};
 onStage('Jev is comparing kill, survival and setup plans');
 const first=await ask(compactRequest(netQuestion(state,candidates,recent)));
 for(const role of ['kill','survive','setup'])if(first.answers?.[role]?.type!=='choice'||!candidates.some(c=>c.id===first.answers[role].choice))throw Error('Invalid Jev net recommendation');
 const base=decisionQuestion(state,candidates);
 const comparison=Object.fromEntries(Object.entries(first.answers).filter(([role])=>['kill','survive','setup'].includes(role)).map(([role,a])=>{
  const c=candidates.find(c=>c.id===a.choice);return [role,{choice:c.id,command:c.command,sequence:c.plan,forecast:c.forecast,visibleRules:c.details}];
 }));
 base.state={...base.state,recent_observations:recent,checked_proposals:comparison,verification_scope:'These are existing code forecasts, with all limitations retained. Role agreement is not independent evidence. All original candidates remain available.'};
 base.questions.move.instructions+=' Compare the concrete kill, survival and setup proposals against their code forecasts AND visible rules. First reject direct self-kills and plans that miss a visible death deadline. Compare attacks removed, net HP loss, energy, retaliation and final facing. Unknown or incomplete forecasts are not proof of safety or failure. A short prefix may have a useful continuation. Setup needs a stated payoff before the deadline. Prefer the plan that wins the encounter while preserving the run, not automatically the most damage or most block. You may select ANY supplied candidate, not only the recommendations. Do not vote by role agreement.';
 onStage('Jev is checking competing plans against visible mechanics');
 const final=await ask(compactRequest(base));
 if(final.answers?.move?.type!=='choice'||!candidates.some(c=>c.id===final.answers.move.choice))throw Error('Invalid Jev net final choice');
 return {...final,usage:{input_tokens:(first.usage?.input_tokens??0)+(final.usage?.input_tokens??0),output_tokens:(first.usage?.output_tokens??0)+(final.usage?.output_tokens??0)},deliberation:{version:'jev-net-offline-v1',calls:2,proposals:first.answers,comparison}};
}
