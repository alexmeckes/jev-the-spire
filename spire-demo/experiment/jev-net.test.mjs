import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decisionCandidates} from '../planner.mjs';
import {netDeliberate} from './jev-net.mjs';
const state=JSON.parse(readFileSync(new URL('../fixtures/beast-free.json',import.meta.url))).state;
const candidates=decisionCandidates(state);
test('code forecast caveats survive comparison and final Jev can reject all proposals',async()=>{
 let calls=0;
 const result=await netDeliberate({state,candidates,ask:async p=>{
  calls++;
  if(calls===1){assert.ok(p.state.candidate_details);assert.ok(Object.values(p.questions.kill.criteria).every(v=>v===null));}
  if(calls===2){
   assert.deepEqual(Object.keys(p.questions.move.criteria),candidates.map(c=>c.id));
   assert.deepEqual(p.state.checked_proposals.kill.forecast,candidates[0].forecast);
   assert.match(p.questions.move.instructions,/Unknown or incomplete/);
  }
  return {usage:{input_tokens:5},answers:Object.fromEntries(Object.keys(p.questions).map(role=>[role,{type:'choice',choice:candidates[calls===1?0:1].id}]))};
 }});
 assert.equal(calls,2);assert.equal(result.answers.move.choice,candidates[1].id);assert.equal(result.usage.input_tokens,10);
});
test('invalid proposals fail before comparison and invalid finals fail before execution',async()=>{
 for(const badCall of [1,2]){
  let calls=0;
  await assert.rejects(netDeliberate({state,candidates,ask:async p=>{calls++;return {answers:Object.fromEntries(Object.keys(p.questions).map(role=>[role,{type:'choice',choice:calls===badCall?'invalid':candidates[0].id}]))};}}),/Invalid/);
 }
});
