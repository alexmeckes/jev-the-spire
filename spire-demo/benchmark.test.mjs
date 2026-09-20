import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {simpleDeliberate} from './benchmark/simple.mjs';
import {cases,grade} from './benchmark/suite.mjs';
import {decisionCandidates} from './planner.mjs';
test('simple review preserves all candidate IDs and audits its actual proposal',async()=>{
 const state=JSON.parse(readFileSync(new URL('./fixtures/survival.json',import.meta.url))).state;
 const candidates=decisionCandidates(state);let calls=0;
 await simpleDeliberate({state,candidates,ask:async p=>{
  calls++;assert.deepEqual(Object.keys(p.questions),['move']);
  assert.deepEqual(Object.keys(p.questions.move.criteria),candidates.map(c=>c.id));
  if(calls===2)assert.equal(p.state.proposed_choice,candidates[0].id);
  return {answers:{move:{type:'choice',choice:candidates[0].id}}};
 }});assert.equal(calls,2);
});
test('benchmark keeps ambiguous strategy unscored and rejects known harmful first actions',()=>{
 assert.equal(cases.length,24);
 assert.equal(grade(cases.find(c=>c.fixture==='final-form'),{label:'anything'}).status,'review-only');
 assert.equal(grade(cases.find(c=>c.fixture==='hemokinesis-lethal'),{label:'Hemokinesis+ → enemy'}).status,'fail');
 assert.equal(grade(cases.find(c=>c.fixture==='beckon-play'),{label:'Beckon → End turn'}).status,'pass');
});
test('simple process rejects invalid model IDs',async()=>{
 const state=JSON.parse(readFileSync(new URL('./fixtures/survival.json',import.meta.url))).state;
 await assert.rejects(simpleDeliberate({state,candidates:decisionCandidates(state),ask:async()=>({answers:{move:{type:'choice',choice:'invented'}}})}),/Invalid simple choice/);
});

test('comparison preserves null uncertainty and every candidate without mutating forecasts',async()=>{
 const {actionComparison}=await import('./benchmark/action-comparison.mjs');
 const cs=[{id:'end',command:{action:'end_turn'},forecast:{hpLoss:10,survives:false}},{id:'unknown',command:{action:'play_card'},forecast:{hpLoss:null,survives:null}}];
 const before=structuredClone(cs),r=actionComparison(cs);
 assert.equal(r.ending.hpLoss,10);assert.equal(r.alternatives[0].hpLoss,null);assert.equal(r.alternatives[0].survives,null);assert.deepEqual(cs,before);
});
test('comparison intervention reaches both passes and retains legal choices',async()=>{
 const {comparisonDeliberate}=await import('./benchmark/simple.mjs');
 const state=JSON.parse(readFileSync(new URL('./fixtures/beckon-play.json',import.meta.url))).state;
 const candidates=decisionCandidates(state);let calls=0;
 await comparisonDeliberate({state,candidates,ask:async p=>{
  calls++;assert.ok(p.state.action_comparison.ending);assert.equal(p.state.action_comparison.alternatives.length,candidates.length-1);
  assert.match(p.questions.move.instructions,/both forecasts are lethal/);
  assert.deepEqual(Object.keys(p.questions.move.criteria),candidates.map(c=>c.id));
  return {answers:{move:{type:'choice',choice:candidates[0].id}}};
 }});assert.equal(calls,2);
});
