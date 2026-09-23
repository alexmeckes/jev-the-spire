import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {powerTimingReview} from './power-timing.mjs';
import {perspectiveQuestion,reviewQuestion} from './deliberation.mjs';
import {decisionCandidates} from './planner.mjs';
test('power timing reaches both decisions without removing lethal alternatives',()=>{
 const state=JSON.parse(readFileSync(new URL('./fixtures/pyre-lethal.json',import.meta.url))).state;
 const cs=decisionCandidates(state),p=perspectiveQuestion(state,cs);
 const r=reviewQuestion(state,cs,{answers:{move:{type:'choice',choice:cs[0].id}}});
 for(const q of [p.questions.move,p.questions.synergy,p.questions.tempo,r.questions.move]){
  assert.match(q.instructions,/POWER TIMING/);
  assert.match(q.instructions,/Preserve an affordable kill/);
  assert.deepEqual(Object.keys(q.criteria),cs.map(c=>c.id));
 }
 assert.match(r.questions.move.instructions,/omitted from that forecast is not zero value/);
 const copy=structuredClone(state);copy.player.hand.forEach(c=>c.can_play=false);
 assert.equal(powerTimingReview(copy),'');
 delete copy.battle;assert.equal(powerTimingReview(copy),'');
});
