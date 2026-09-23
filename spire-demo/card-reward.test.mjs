import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decisionCandidates} from './planner.mjs';
import {perspectiveQuestion,reviewQuestion} from './deliberation.mjs';
test('reward review keeps every option, uses a neutral skip and checks existing triggers in both passes',()=>{
 const s=JSON.parse(readFileSync(new URL('./fixtures/deck-reward.json',import.meta.url))).state;
 const cs=decisionCandidates(s),skip=cs.find(c=>c.command.action==='skip_card_reward');
 assert.equal(skip.label,'Skip');
 const p=perspectiveQuestion(s,cs);
 assert.equal(p.state.decision_focus,'Card reward');
 assert.match(p.questions.synergy.instructions,/actual enablers/);
 const a={answers:{move:{type:'choice',choice:skip.id}}};
 const r=reviewQuestion(s,cs,a);
 for(const q of [...Object.entries(p.questions).filter(([k])=>k!=='deck_need').map(([,q])=>q),r.questions.move])assert.deepEqual(Object.keys(q.criteria),cs.map(c=>c.id));
 assert.match(r.questions.move.instructions,/missing enabler/);
 assert.doesNotMatch(r.questions.move.instructions,/Before choosing block|end_turn_check/);
 assert.equal(r.state.jev_recommendations.move.choice,skip.id);
});
