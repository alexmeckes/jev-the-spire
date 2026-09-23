import {deliberate,reviewQuestion} from '../deliberation.mjs';
import {compactRequest} from '../compact-request.mjs';
import {advisoryReview,consultLuna} from './luna.mjs';

// Opt-in live experiment. Advice never executes a command or replaces Jev.
export async function assistedDeliberate(options,{consult=consultLuna}={}) {
 const baseline=await deliberate(options);
 if(options.candidates.length<=1)return {...baseline,adviser:{status:'skipped',reason:'single candidate'}};
 options.onStage?.('Luna Max is reviewing Jev’s proposal');
 const payload=compactRequest(reviewQuestion(options.state,options.candidates,baseline,options.recent??[]));
 const advice=await consult(payload,baseline.answers.move);
 options.onStage?.('Jev is checking Luna’s advice against the visible rules');
 const final=await options.ask(compactRequest(advisoryReview(payload,baseline.answers.move,advice.advice)));
 if(final.answers?.move?.type!=='choice'||!options.candidates.some(c=>c.id===final.answers.move.choice))throw Error('Invalid Jev adviser-review choice');
 return {...final,usage:{input_tokens:(baseline.usage?.input_tokens??0)+(final.usage?.input_tokens??0),output_tokens:(baseline.usage?.output_tokens??0)+(final.usage?.output_tokens??0)},
  deliberation:{...baseline.deliberation,calls:(baseline.deliberation?.calls??1)+1},
  adviser:{status:'reviewed',...advice,proposal:baseline.answers.move,final:final.answers.move,changed:baseline.answers.move.choice!==final.answers.move.choice}};
}
