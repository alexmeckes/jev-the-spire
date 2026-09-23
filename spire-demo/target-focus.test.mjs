import test from 'node:test';
import assert from 'node:assert/strict';
import {targetFocusReview} from './target-focus.mjs';
import {perspectiveQuestion,reviewQuestion} from './deliberation.mjs';
import {decisionCandidates} from './planner.mjs';
const state={state_type:'boss',run:{act:2,floor:33},battle:{round:2,turn:'player',is_play_phase:true,enemies:['a','b'].map(entity_id=>({entity_id,name:entity_id,hp:30,block:0,status:[{name:'Back Attack',description:'Deals 50% more damage when it is attacking you from behind.'},{name:'Enrage',description:'When an ally dies, gain 6 Strength and 99 Block.'}],intents:[{type:'Attack',label:'12'}]}))},player:{hp:40,energy:2,block:0,hand:[{index:0,name:'Strike',type:'Attack',cost:'1',description:'Deal 6 damage.',can_play:true,target_type:'AnyEnemy'}],potions:[]}};
test('damage commitment reaches both passes while both turning targets remain available',()=>{
 const cs=decisionCandidates(state);for(const id of ['a','b'])assert(cs.some(c=>c.command.target===id));
 const p=perspectiveQuestion(state,cs),r=reviewQuestion(state,cs,{answers:{move:{type:'choice',choice:cs[0].id}}});
 for(const q of [p.questions.move,p.questions.pressure,p.questions.encounter,r.questions.move]){assert.match(q.instructions,/PRIMARY DAMAGE TARGET/);assert.match(q.instructions,/ally-death Strength and Block/);assert.deepEqual(Object.keys(q.criteria),cs.map(c=>c.id));}
});
test('focus review stops after a death and does not classify ordinary fights by name',()=>{
 const s=structuredClone(state);s.battle.enemies[0].hp=0;assert.equal(targetFocusReview(s),'');s.battle.enemies[0].hp=30;s.battle.enemies[0].status=[];assert.equal(targetFocusReview(s),'');assert.equal(targetFocusReview({}),'');
});
