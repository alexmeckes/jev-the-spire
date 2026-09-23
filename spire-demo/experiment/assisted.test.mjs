import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assistedDeliberate} from './assisted.mjs';
import {decisionCandidates} from '../planner.mjs';
const state=JSON.parse(readFileSync(new URL('../fixtures/beast-free.json',import.meta.url))).state;
const candidates=decisionCandidates(state).slice(0,2);
const answer=(id)=>({model:'jev-test',usage:{input_tokens:10},answers:{move:{type:'choice',choice:id}}});
test('Luna reviews baseline, Jev may change it, all options and usage retained',async()=>{
 let calls=0;
 const result=await assistedDeliberate({state,candidates,ask:async p=>{
  calls++;assert.deepEqual(Object.keys(p.questions.move.criteria),candidates.map(c=>c.id));
  if(calls===3)assert.equal(p.state.external_adviser.advice,'Prefer second candidate based on visible evidence.');
  return answer(candidates[calls===3?1:0].id);
 }},{consult:async(p,proposal)=>{assert.equal(proposal.choice,candidates[0].id);return {advice:'Prefer second candidate based on visible evidence.',model:'gpt-5.6-luna',effort:'max',latencyMs:12};}});
 assert.equal(calls,3);assert.equal(result.usage.input_tokens,30);assert.equal(result.adviser.changed,true);assert.equal(result.adviser.status,'reviewed');
});
test('adviser failures propagate without a silent unassisted result',async()=>{
 await assert.rejects(assistedDeliberate({state,candidates,ask:async()=>answer(candidates[0].id)},{consult:async()=>{throw Error('adviser unavailable');}}),/adviser unavailable/);
});
test('invalid final advice review never returns an executable decision',async()=>{
 let calls=0;
 await assert.rejects(assistedDeliberate({state,candidates,ask:async()=>answer(++calls===3?'invented':candidates[0].id)},{consult:async()=>({advice:'test'})}),/Invalid Jev adviser-review/);
});
test('single candidate skips adviser and is explicitly labeled',async()=>{
 const result=await assistedDeliberate({state,candidates:[candidates[0]],ask:async()=>answer(candidates[0].id)},{consult:async()=>{throw Error('must not call');}});
 assert.equal(result.adviser.status,'skipped');
});
