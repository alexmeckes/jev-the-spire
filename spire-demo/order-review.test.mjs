import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {orderingEvidence} from './order-review.mjs';import {decisionCandidates} from './planner.mjs';import {deliberate} from './deliberation.mjs';
const fixture=()=>JSON.parse(readFileSync(new URL('./fixtures/rage-reorder.json',import.meta.url))).state;
test('attack proposal exposes Rage-first evidence and review may choose Rage',async()=>{
 const state=fixture(),candidates=decisionCandidates(state),attack=candidates.find(c=>c.details?.type==='Attack'),rage=candidates.find(c=>c.details?.name==='Rage');let calls=0;
 assert.ok(orderingEvidence(state,attack).pairs.some(p=>p.alternativeFirst==='Rage'));
 const r=await deliberate({state,candidates,ask:async p=>{calls++;assert.deepEqual(Object.keys(p.questions.move.criteria),candidates.map(c=>c.id));if(calls===3)assert.equal(p.state.card_order_review.proposedChoice,attack.id);return {usage:{input_tokens:2},answers:Object.fromEntries(Object.entries(p.questions).map(([k,q])=>[k,{type:'choice',choice:k==='deck_need'?Object.keys(q.criteria)[0]:calls===3?rage.id:attack.id}]))};}});
 assert.equal(calls,3);assert.equal(r.usage.input_tokens,6);assert.equal(r.deliberation.orderReview.changed,true);assert.equal(r.answers.move.choice,rage.id);
});
test('no review for ending or already playing Rage; invalid review IDs fail closed',async()=>{
 const state=fixture(),candidates=decisionCandidates(state);assert.equal(orderingEvidence(state,{command:{action:'end_turn'}}),null);assert.equal(orderingEvidence(state,candidates.find(c=>c.details?.name==='Rage')),null);
 let calls=0;const attack=candidates.find(c=>c.details?.type==='Attack');await assert.rejects(deliberate({state,candidates,ask:async p=>{calls++;return {answers:Object.fromEntries(Object.keys(p.questions).map(k=>[k,{type:'choice',choice:calls===3?'invalid':attack.id}]))};}}),/Invalid Jev card-order review/);
});
