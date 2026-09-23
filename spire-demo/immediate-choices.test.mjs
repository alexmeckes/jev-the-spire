import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {immediateChoiceQuestion} from './immediate-choices.mjs';import {decisionCandidates} from './planner.mjs';import {perspectiveQuestion,deliberate} from './deliberation.mjs';import {compactRequest} from './compact-request.mjs';
const s=JSON.parse(readFileSync(new URL('./fixtures/slippery.json',import.meta.url))).state;const cs=decisionCandidates(s);
test('all distinct immediate commands remain selectable, with every continuation as evidence',()=>{
 const history={turnHistory:[{round:2}],unfinishedPlan:{label:'test'}};const p=perspectiveQuestion(s,cs,history),original=JSON.stringify(p),q=immediateChoiceQuestion(p,cs);
 assert.equal(JSON.stringify(p),original);assert.deepEqual(q.state.recent_observations,history);
 const roots=cs.filter(c=>c.plan.length===1);assert.deepEqual(Object.keys(q.questions.move.criteria),roots.map(c=>c.id));
 assert.deepEqual(Object.keys(q.state.supporting_plan_details),cs.map(c=>c.id));
 for(const root of roots){const d=JSON.parse(q.state.candidate_details[root.id]);for(const id of d.possible_continuations)assert.deepEqual(cs.find(c=>c.id===id).command,root.command);}
 assert.deepEqual(compactRequest(q).state.recent_observations,compactRequest(p).state.recent_observations);
});
test('different card indices and targets are not merged by label',()=>{const roots=cs.filter(c=>c.plan.length===1),q=immediateChoiceQuestion(perspectiveQuestion(s,cs),cs);assert.equal(Object.keys(q.questions.move.criteria).length,roots.length)});
test('missing immediate representative fails instead of hiding a legal command',()=>{const root=cs.find(c=>c.plan.length===1&&cs.some(p=>p.plan.length>1&&JSON.stringify(p.command)===JSON.stringify(c.command)));assert.throws(()=>immediateChoiceQuestion(perspectiveQuestion(s,cs),cs.filter(c=>c.id!==root.id)),/Missing immediate/)});
test('opt-in full deliberation selects original executable immediate IDs with unchanged history',async()=>{
 const root=cs.find(c=>c.command.action==='play_card'&&c.plan.length===1);let count=0;
 const r=await deliberate({state:s,candidates:cs,immediateChoices:true,ask:async q=>{count++;assert.ok(Object.hasOwn(q.state.supporting_plan_details,root.id));assert.ok(Object.keys(q.questions.move.criteria).every(id=>cs.find(c=>c.id===id).plan.length===1));return {answers:Object.fromEntries(Object.keys(q.questions).map(k=>[k,{type:'choice',choice:root.id}]))}}});assert.equal(r.answers.move.choice,root.id);assert.equal(count,3);assert.equal(r.deliberation.orderReviewed,true);assert.equal(r.deliberation.choiceRepresentation,'immediate-with-plan-evidence-v1');
});
test('a plan-only answer is rejected rather than executed through an original ID',async()=>{
 const plan=cs.find(c=>c.plan.length>1);await assert.rejects(deliberate({state:s,candidates:cs,immediateChoices:true,ask:async()=>({answers:{move:{type:'choice',choice:plan.id}}})}),/Invalid immediate-choice/);
});
