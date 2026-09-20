import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decisionCandidates} from './planner.mjs';
import {freshCases,gradeFresh} from './benchmark/fresh-suite.mjs';
for(const t of freshCases)test(t.fixture+' preserves verified survival and lethal end turn',()=>{
 const f=JSON.parse(readFileSync(new URL('./fixtures/'+t.fixture+'.json',import.meta.url)));
 const cs=decisionCandidates(f.state);
 const safe=cs.find(c=>c.command.action==='play_card'&&c.command.card_index===f.verification.card&&(!f.verification.target||c.command.target===f.verification.target));
 assert.equal(safe.forecast.hpAfter,f.verification.hpAfterBeforeCombatHealing);
 assert.equal(gradeFresh(t,safe).status,'pass');
 const end=cs.find(c=>c.command.action==='end_turn');
 assert.equal(end.forecast.survives,false);
 assert.equal(gradeFresh(t,end).status,'fail');
});
test('unknown draw and defensive prefix are not mislabeled lethal',()=>{
 assert.equal(gradeFresh(freshCases[1],{command:{action:'play_card',card_index:2,target:'OVICOPTER_0'}}).status,'review-only');
 assert.equal(gradeFresh(freshCases[2],{command:{action:'play_card',card_index:2}}).status,'review-only');
});
test('fresh histories contain only prior observations, newest first as required by encounterMemory',()=>{
 for(const t of freshCases){
  const f=JSON.parse(readFileSync(new URL('./fixtures/'+t.fixture+'.json',import.meta.url)));
  assert.ok(f.history.every(e=>e.time<f.source.time));
  assert.deepEqual(f.history.map(e=>e.time),f.history.map(e=>e.time).sort().reverse());
 }
});
