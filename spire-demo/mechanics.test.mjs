import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mechanicsReview} from './mechanics.mjs';
import {decisionCandidates,projectSequence} from './planner.mjs';
import {deliberate} from './deliberation.mjs';
const s=JSON.parse(readFileSync(new URL('./fixtures/rocket-lethal.json',import.meta.url))).state;
test('recorded positioning makes survival uncertain while energy-before-draw remains available',()=>{
 const f=projectSequence(s,['Expect a Fight+']);
 assert.equal(f.energyLeft,5);assert.equal(f.survives,null);
 assert.match(f.warnings.join(' '),/Position-dependent/);
 assert.ok(decisionCandidates(s).some(c=>c.label==='Expect a Fight+ → Drum of Battle'));
 const rules=mechanicsReview(s).rules;
 assert.ok(rules.some(p=>p.rule.includes('orientation')));
 assert.equal(mechanicsReview({}),null);
});
test('mechanics rules and lethal prefix review survive compacting in both Jev passes',async()=>{
 const candidates=decisionCandidates(s);let calls=0;
 await deliberate({state:s,candidates,ask:async p=>{
  calls++;assert.ok(p.state.mechanics_review.rules.some(r=>r.rule.includes('orientation')));
  assert.match(p.questions.move.instructions,/energy-then-draw/);
  assert.deepEqual(Object.keys(p.questions.move.criteria),candidates.map(c=>c.id));
  return {answers:Object.fromEntries(Object.keys(p.questions).map(k=>[k,{type:'choice',choice:candidates[0].id}]))};
 }});assert.equal(calls,2);
});

test('self-destruction timing is supplied from visible intent without a named guide',()=>{
 const state={battle:{enemies:[{entity_id:'x',hp:999999999,intents:[{type:'DeathBlow',label:'39',description:'It will attack you for 39 damage before being destroyed.'}]}]},player:{status:[]}};
 const r=mechanicsReview(state);
 assert.equal(r.intents[0].intents[0].description,state.battle.enemies[0].intents[0].description);
 assert.match(r.checks.join(' '),/surviving that attack/);
 assert.deepEqual(r.rules,[]);
});

test('position review compares final facing and observed intent changes before attacks',()=>{
 const r=mechanicsReview(s);
 assert.match(r.checks.join(' '),/ending the sequence facing each possible target/);
 assert.match(r.checks.join(' '),/observed intent changes after each action/);
});
