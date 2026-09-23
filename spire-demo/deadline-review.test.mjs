import test from 'node:test';
import assert from 'node:assert/strict';
import {deadlineReview} from './deadline-review.mjs';
import {perspectiveQuestion,reviewQuestion} from './deliberation.mjs';
import {decisionCandidates} from './planner.mjs';
const state={state_type:'boss',run:{act:2,floor:33},battle:{round:5,turn:'player',is_play_phase:true,enemies:[{entity_id:'enemy',hp:72,status:[{name:'Sandpit',description:'When this enemy takes its turn, you will be eaten and die.'}],intents:[{type:'Attack',label:'20'}]}]},player:{hp:66,block:6,energy:1,hand:[{index:0,name:'Frantic Escape',type:'Status',cost:'1',can_play:true,target_type:'Self',description:'Get farther away. Increase Sandpit by 1. Increase the cost of this card by 1.'}],potions:[]}};
test('lethal extension reaches both Jev passes and preserves legal options',()=>{
 const cs=decisionCandidates(state);assert(cs.some(c=>c.command.action==='play_card'));assert(cs.some(c=>c.command.action==='end_turn'));
 const p=perspectiveQuestion(state,cs),r=reviewQuestion(state,cs,{answers:{move:{type:'choice',choice:cs[0].id}}});
 for(const q of [p.questions.move,p.questions.survival,p.questions.encounter,r.questions.move]){assert.match(q.instructions,/LETHAL COUNTDOWN/);assert.match(q.instructions,/Frantic Escape/);assert.deepEqual(Object.keys(q.criteria),cs.map(c=>c.id));}
});
test('countdown review scopes to visible living threats and preserves affordability facts',()=>{
 const s=structuredClone(state);s.player.hand[0].can_play=false;s.player.hand[0].cost='3';assert.match(deadlineReview(s),/"playable":false/);assert.match(deadlineReview(s),/"cost":"3"/);
 s.battle.enemies[0].status[0].description='In 2 turns, you will be eaten and die.';assert.match(deadlineReview(s),/In 2 turns/);
 s.battle.enemies[0].hp=0;assert.equal(deadlineReview(s),'');assert.equal(deadlineReview({state_type:'map'}),'');
});
