import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {potionTiming} from './potion-timing.mjs';
import {decisionCandidates} from './planner.mjs';
import {deliberate} from './deliberation.mjs';
test('separates delayed healing, temporary buffs and block multiplier sequencing without choosing',()=>{
 const state={player:{energy:0,block:13,hp:1,potions:[{name:'A',description:'Gain Regeneration.'},{name:'B',description:'Gain 5 Strength this turn.'},{name:'C',description:'Triple your Block.'}],hand:[]},battle:{round:10,enemies:[{entity_id:'e',hp:100,intents:[{label:'30'}]}]}};
 const r=potionTiming(state);
 assert.match(r.potions[0].checks.join(' '),/remaining turns/);
 assert.match(r.potions[1].checks.join(' '),/zero payoff/);
 assert.match(r.potions[2].checks.join(' '),/after gaining block/);
 assert.equal(r.energy,0);assert.equal(r.block,13);assert.deepEqual(r.playable_cards,[]);
 assert.equal(potionTiming({}),null);
});
test('potion rules and timing comparison reach both compact Jev passes with all choices retained',async()=>{
 const s=JSON.parse(readFileSync(new URL('./fixtures/fortifier.json',import.meta.url))).state;
 const candidates=decisionCandidates(s);let calls=0;
 await deliberate({state:s,candidates,ask:async p=>{
  calls++;assert.equal(p.state.potion_timing.potions[0].description,'Triple your Block.');
  assert.match(p.state.potion_timing.potions[0].checks.join(' '),/before expiring/);
  if(calls===1)assert.match(p.questions.resources.instructions,/Read potion_timing/);
  else assert.match(p.questions.move.instructions,/Read potion_timing/);
  assert.deepEqual(Object.keys(p.questions.move.criteria),candidates.map(c=>c.id));
  return {answers:Object.fromEntries(Object.keys(p.questions).map(k=>[k,{type:'choice',choice:candidates[0].id}]))};
 }});assert.equal(calls,2);
});

test('mixed Strength and Dexterity potion benefits subsequent cards, not existing block',async()=>{
 const {projectSequence}=await import('./planner.mjs');
 const s=JSON.parse(readFileSync(new URL('./fixtures/fortifier.json',import.meta.url))).state;
 s.player.potions=[{name:'Fysh Oil',slot:0,description:'Gain 1 Strength and 1 Dexterity.',can_use_in_combat:true,target_type:'AnyPlayer'}];
 s.player.hand=[{name:'Defend',type:'Skill',cost:1,can_play:true,description:'Gain 5 Block.',target_type:'Self',index:0}];
 s.player.energy=3;s.player.status=[];s.player.block=7;
 const early=projectSequence(s,['Fysh Oil','Defend']);
 const late=projectSequence(s,['Defend','Fysh Oil']);
 assert.equal(early.block,13);assert.equal(late.block,12);assert.equal(early.strengthGained,1);
});

test('ending with no playable cards still reviews delayed healing and allows saving',async()=>{
 const s=JSON.parse(readFileSync(new URL('./fixtures/fortifier.json',import.meta.url))).state;
 s.player.hand=[];s.player.energy=0;s.player.hp=2;
 s.player.potions=[{name:'Regen Potion',slot:0,description:'Gain 5 Regen.',can_use_in_combat:true,target_type:'AnyPlayer'}];
 const candidates=decisionCandidates(s);const end=candidates.find(c=>c.command.action==='end_turn');let calls=0;
 const result=await deliberate({state:s,candidates,ask:async p=>{
  calls++;if(calls===3)assert.match(p.questions.move.instructions,/postponing another tick/);
  return {answers:Object.fromEntries(Object.keys(p.questions).map(k=>[k,{type:'choice',choice:end.id}]))};
 }});
 assert.equal(calls,3);assert.equal(result.answers.move.choice,end.id);assert.equal(result.deliberation.endTurnReviewed,true);
});

test('option-generating consumables expose sequencing opportunity without predicting results',()=>{
 const r=potionTiming({player:{energy:3,potions:[{slot:0,name:'Entropic Brew',description:'Fill all your empty Potion Slots with random Potions.'}]},battle:{enemies:[]}});
 assert.match(r.potions[0].checks.join(' '),/before spending remaining energy/);
 assert.match(r.potions[0].checks.join(' '),/do not assume which option appears/);
 assert.equal(r.potions[0].description,'Fill all your empty Potion Slots with random Potions.');
});

test('next-card repetition requires an affordable intended payoff before consumption',()=>{
 const r=potionTiming({player:{energy:1,potions:[{name:'Duplicator',description:'This turn, your next card is played an extra time.'}],hand:[{name:'Rupture',cost:1,can_play:true,description:'Whenever you lose HP on your turn, gain 1 Strength.'},{name:'Strike+',cost:1,can_play:true,description:'Deal 11 damage.'}]},battle:{enemies:[]}});
 assert.match(r.potions[0].checks.join(' '),/exact affordable next card/);
 assert.match(r.potions[0].checks.join(' '),/no immediate block or kill/);
 assert.equal(r.playable_cards.length,2);
});
