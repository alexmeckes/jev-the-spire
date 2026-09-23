import test from 'node:test';
import assert from 'node:assert/strict';
import {decisionFocus} from './decision-focus.mjs';
import {decisionCandidates} from './planner.mjs';
import {perspectiveQuestion,reviewQuestion} from './deliberation.mjs';
test('Act 2 route preference reaches both passes without banning unavoidable elites',()=>{
 const s={state_type:'map',run:{act:2},player:{hp:14,max_hp:80,gold:200,deck:[],potions:[],relics:[]},map:{next_options:[{index:0,type:'Elite',col:0,row:1},{index:1,type:'Monster',col:1,row:1}]}};
 const cs=decisionCandidates(s),p=perspectiveQuestion(s,cs),r=reviewQuestion(s,cs,{answers:{move:{type:'choice',choice:cs[0].id}}});
 for(const q of [p.questions.move,p.questions.survival,p.questions.resources,r.questions.move]){
  assert.match(q.instructions,/Act 2 route preference/);
  assert.match(q.instructions,/healing or shopping comes before danger/);
  assert.match(q.instructions,/When elites are unavoidable/);
  assert.deepEqual(Object.keys(q.criteria),cs.map(c=>c.id));
 }
 s.map.next_options=s.map.next_options.slice(0,1);assert.equal(decisionCandidates(s)[0].command.index,0);
 for(const act of [1,3])assert.doesNotMatch(JSON.stringify(decisionFocus({...s,run:{act}})),/Act 2 route preference/);
 assert.doesNotMatch(JSON.stringify(decisionFocus({...s,state_type:'elite'})),/Act 2 route preference/);
});
