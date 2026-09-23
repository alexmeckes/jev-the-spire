import test from 'node:test';import assert from 'node:assert/strict';
import {advisoryReview} from './luna.mjs';
test('advice preserves choices and baseline input while Jev retains final authority',()=>{
 const p={state:{visible:true},questions:{move:{instructions:'Choose.',criteria:{a:'attack',b:'block'}}}};
 const result=advisoryReview(p,{choice:'a'},'Consider b only if the visible attack requires block.');
 assert.deepEqual(result.questions.move.criteria,p.questions.move.criteria);assert.equal(p.state.external_adviser,undefined);assert.match(result.questions.move.instructions,/final decision maker/);assert.equal(result.state.external_adviser.effort,'max');
});
test('reject missing and unbounded advice',()=>{for(const text of ['',null,'x'.repeat(12001)])assert.throws(()=>advisoryReview({}, {},text));});
