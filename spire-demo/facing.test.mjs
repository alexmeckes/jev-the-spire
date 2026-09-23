import test from 'node:test';
import assert from 'node:assert/strict';
import {facingState,facingDamage} from './facing.mjs';
const state={run:{act:2,floor:33},player:{status:[{description:'Use targeting cards or potions to change your orientation.'}]},battle:{enemies:[{entity_id:'a',hp:82,status:[{id:'BACK_ATTACK_LEFT_POWER',description:'Deals 50% more damage when attacking from behind.'}],intents:[{type:'Attack',label:'6'}]},{entity_id:'b',hp:162,status:[{id:'BACK_ATTACK_RIGHT_POWER',description:'Deals 50% more damage when attacking from behind.'}],intents:[{type:'Attack',label:'30'}]}]}};
const event={outcome:'executed',state,chosen:{command:{action:'play_card',target:'a'}}};
test('facing survives untargeted decisions, but never crosses encounters',()=>{
 const s=facingState(state,[{...event,chosen:{command:{action:'end_turn'}}},event]);assert.equal(s.facingEvidence.target,'a');
 assert.equal(facingState({...state,run:{act:3,floor:33}},[event]).facingEvidence,null);
 assert.equal(facingState(state,[{...event,outcome:'cancelled'}]).facingEvidence,null);
});
test('fatal recorded intent arithmetic: turning reduces 36 to 29 without double counting',()=>{
 const s=facingState(state,[event]);
 assert.equal(facingDamage(s,[],s.battle.enemies).incomingMax,36);
 const turned=facingDamage(s,[{command:{action:'play_card',target:'b'}},{command:{action:'play_card'}}],s.battle.enemies);
 assert.equal(turned.incomingMin,29);assert.equal(turned.incomingMax,29);
 assert.ok(19>29-16);assert.ok(19<=36-16);
 assert.equal(facingDamage(state,[],state.battle.enemies),null);
 assert.equal(facingDamage(s,[],[{...s.battle.enemies[0],hp:0},s.battle.enemies[1]]),null);
});
test('turn reversal and multi-hit rounding remain conservative',()=>{
 const s=facingState(structuredClone(state),[event]);s.battle.enemies[0].intents[0].label='3x2';s.battle.enemies[1].intents[0].label='7';
 const r=facingDamage(s,[{command:{action:'use_potion',target:'b'}}],s.battle.enemies);
 assert.equal(r.incomingMin,13);assert.equal(r.incomingMax,15);
});
