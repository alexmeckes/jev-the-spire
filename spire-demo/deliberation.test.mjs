import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decisionCandidates} from './planner.mjs';
import {deliberate} from './deliberation.mjs';
const state=JSON.parse(readFileSync(new URL('./fixtures/beast-free.json',import.meta.url))).state;
const candidates=decisionCandidates(state);
test('review receives real assessments and retains every legal candidate',async()=>{
 let calls=0;
 const result=await deliberate({state,candidates,ask:async payload=>{
  calls++;
  assert.deepEqual(Object.keys(payload.questions.move.criteria),candidates.map(c=>c.id));
  if(calls===2)assert.equal(payload.state.jev_recommendations.move.choice,candidates[0].id);
  return {model:'test',usage:{input_tokens:10},answers:Object.fromEntries(Object.keys(payload.questions).map(k=>[k,{type:'choice',choice:candidates[calls-1].id,confidence:.5}]))};
 }});
 assert.equal(calls,2);assert.equal(result.usage.input_tokens,20);assert.equal(result.deliberation.changed,true);
});
test('invalid first-pass recommendation cannot reach final review',async()=>{
 let calls=0;await assert.rejects(deliberate({state,candidates,ask:async()=>{calls++;return {answers:{move:{type:'choice',choice:'invalid'}}};}}),/Invalid/);assert.equal(calls,1);
});
test('a single legal option uses one call',async()=>{
 let calls=0;const result=await deliberate({state,candidates:[candidates[0]],ask:async()=>{calls++;return {answers:{move:{type:'choice',choice:candidates[0].id}}};}});assert.equal(calls,1);assert.equal(result.deliberation,null);
});

test('end turn with playable cards gets one bounded Jev recheck without removing choices',async()=>{
 const opts=[{id:'a',command:{action:'play_card',card_index:0},label:'Strike',details:{}},{id:'b',command:{action:'end_turn'},label:'End turn',details:{}}];
 let calls=0;const result=await deliberate({state,candidates:opts,ask:async p=>{calls++;assert.deepEqual(Object.keys(p.questions.move.criteria),['a','b']);return {usage:{input_tokens:1},answers:Object.fromEntries(Object.keys(p.questions).map(k=>[k,{type:'choice',choice:calls===3?'a':'b'}]))};}});
 assert.equal(calls,3);assert.equal(result.answers.move.choice,'a');assert.equal(result.usage.input_tokens,3);
});

test('upgrade payoff checks survive merchant overrides and reach final review without filtering choices',async()=>{
 const shop={...structuredClone(state),state_type:'shop'};
 const opts=[{id:'buy',command:{action:'shop_purchase',index:0},label:'Setup card',details:{}},{id:'leave',command:{action:'shop_leave'},label:'Leave',details:{}}];
 let calls=0;
 await deliberate({state:shop,candidates:opts,ask:async p=>{
  calls++;
  assert.deepEqual(Object.keys(p.questions.move.criteria),['buy','leave']);
  const instructions=calls===1?p.questions.synergy.instructions:p.questions.move.instructions;
  assert.match(instructions,/count existing copies/);
  assert.match(instructions,/do not retroactively increase block/);
  assert.match(instructions,/block that expires unused/);
  assert.match(instructions,/remaining energy and card-play limits/);
  assert.match(instructions,/if unavailable, mark the gain uncertain/);
  if(calls===1)assert.match(instructions,/marginal benefit of each relic/);
  return {answers:Object.fromEntries(Object.keys(p.questions).map(k=>[k,{type:'choice',choice:'leave'}]))};
 }});
 assert.equal(calls,2);
});

test('replacement review separates play restrictions from draw triggers and preserves confirm',async()=>{
 const selection={...structuredClone(state),state_type:'hand_select',hand_select:{prompt:'Choose any number of cards to replace.',can_confirm:true,cards:[{index:0,name:'Bash',cost:'2'}]}};
 const opts=[{id:'confirm',command:{action:'combat_confirm_selection'},label:'Confirm selection',details:{}},{id:'replace',command:{action:'combat_select_card',card_index:0},label:'Bash',details:{}}];
 let calls=0;
 await deliberate({state:selection,candidates:opts,ask:async p=>{
  calls++;
  assert.deepEqual(Object.keys(p.questions.move.criteria),['confirm','replace']);
  if(calls===1){
   assert.match(p.questions.resources.instructions,/draws zero cards/);
   assert.match(p.questions.survival.instructions,/does not itself prohibit drawing/);
   assert.match(p.questions.synergy.instructions,/automatic plays/);
  }else assert.match(p.questions.move.instructions,/nothing is selected/);
  return {answers:Object.fromEntries(Object.keys(p.questions).map(k=>[k,{type:'choice',choice:'replace'}]))};
 }});
 assert.equal(calls,2);
});

test('kill-versus-block review reaches initial survival and final choice without removing defense',async()=>{
 const opts=[{id:'kill',command:{action:'play_card',card_index:0},label:'Strike',details:{}},{id:'block',command:{action:'play_card',card_index:1},label:'Defend',details:{}}];
 let calls=0;
 await deliberate({state,candidates:opts,ask:async p=>{
  calls++;assert.deepEqual(Object.keys(p.questions.move.criteria),['kill','block']);
  assert.match((calls===1?p.questions.survival:p.questions.move).instructions,/defeatedEnemies and attackRemoved/);
  return {answers:Object.fromEntries(Object.keys(p.questions).map(k=>[k,{type:'choice',choice:'kill'}]))};
 }});assert.equal(calls,2);
});

test('merchant exit gets one bounded basket review, retaining relic purchases and leave',async()=>{
 const shop={...structuredClone(state),state_type:'shop',player:{...state.player,gold:396}};
 const opts=[{id:'relic',command:{action:'shop_purchase',index:7},label:'Pen Nib — 249 gold',details:{}},{id:'leave',command:{action:'proceed'},label:'Leave',details:{}}];
 let calls=0;
 const r=await deliberate({state:shop,candidates:opts,ask:async p=>{
  calls++;assert.deepEqual(Object.keys(p.questions.move.criteria),['relic','leave']);
  if(calls===3){assert.equal(p.state.proposed_shop_exit.gold,396);assert.match(p.questions.move.instructions,/concrete affordable purchase basket/);}
  return {answers:Object.fromEntries(Object.keys(p.questions).map(k=>[k,{type:'choice',choice:calls===3?'relic':'leave'}]))};
 }});assert.equal(calls,3);assert.equal(r.answers.move.choice,'relic');assert.equal(r.deliberation.merchantReviewed,true);
});

test('random exhaust ordering is reviewed in both Jev passes without forcing card order',async()=>{
 const opts=[{id:'exhaust',command:{action:'play_card',card_index:0},label:'Cinder',details:{}},{id:'attack',command:{action:'play_card',card_index:1},label:'Thrash',details:{}}];let calls=0;
 await deliberate({state,candidates:opts,ask:async p=>{
  calls++;assert.match(p.questions.move.instructions,/random exhaust or transformation/);assert.match(p.questions.move.instructions,/without assuming which random target/);
  assert.deepEqual(Object.keys(p.questions.move.criteria),['exhaust','attack']);
  return {answers:Object.fromEntries(Object.keys(p.questions).map(k=>[k,{type:'choice',choice:'attack'}]))};
 }});assert.equal(calls,2);
});
