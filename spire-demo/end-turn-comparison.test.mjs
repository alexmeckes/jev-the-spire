import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decisionCandidates} from './planner.mjs';
import {compactRequest} from './compact-request.mjs';
import {endTurnComparison,endTurnComparisonQuestion} from './end-turn-comparison.mjs';
const state=()=>JSON.parse(readFileSync(new URL('./fixtures/beast-free.json',import.meta.url))).state;
const option=(id,action,forecast)=>({id,label:id,command:{action},details:{},forecast});
test('comparison preserves lethal costs and does not rank damage above survival',()=>{
 const candidates=[option('end','end_turn',{hpAfter:1,damage:0}),option('safe','play_card',{hpAfter:1,damage:4}),option('cost','play_card',{hpAfter:0,damage:11,survives:false})];
 const c=endTurnComparison(candidates);
 assert.deepEqual(c.options.map(x=>x.change_vs_ending),[{hp:0,damage:0},{hp:0,damage:4},{hp:-1,damage:11}]);
 assert.equal(c.options[2].estimate.survives,false);assert.equal(c.options.length,3);
});
test('unknown forecasts stay unknown and adverse rules and draw boundaries survive compaction',()=>{
 const candidates=[option('end','end_turn',{hpAfter:20,damage:0}),option('draw','play_card',{hpAfter:20,damage:null,quality:'partial',boundary:'draw',warnings:['Unmodeled retaliation'],delayedDeathEffects:[{description:'Lose HP'}]})];
 const q=compactRequest(endTurnComparisonQuestion(state(),candidates));
 const row=q.state.end_turn_comparison.options[1];
 assert.equal(row.change_vs_ending.damage,null);assert.equal(row.quality,'partial');assert.equal(row.boundary,'draw');assert.deepEqual(row.warnings,['Unmodeled retaliation']);assert.equal(row.delayedDeathEffects[0].description,'Lose HP');
 assert.deepEqual(Object.keys(q.questions.move.criteria),['end','draw']);assert.equal(q.state.jev_recommendations,undefined);
});
test('real planner exposes a damaging status improvement without hardcoding a card name',()=>{
 const s=state();s.player.hp=61;s.player.block=0;s.player.energy=1;s.player.status=[];s.player.relics=[];
 s.battle.enemies[0].status=[];s.battle.enemies[0].intents=[{type:'Attack',label:'15',description:'Attack for 15 damage.'}];
 s.player.hand=[0,1].map(index=>({index,name:'Toxic',type:'Status',cost:'1',target_type:'Self',can_play:true,description:'At the end of your turn, if this is in your hand, take 5 damage. Exhaust.'}));
 const c=endTurnComparison(decisionCandidates(s));
 const end=c.options.find(x=>x.id===c.baseline);assert.equal(end.estimate.hpAfter,36);
 assert.ok(c.options.some(x=>x.first_action.action==='play_card'&&x.estimate.hpAfter===41&&x.change_vs_ending.hp===5));
});
test('comparison cannot invent an end-turn baseline',()=>{assert.equal(endTurnComparison([option('card','play_card',{})]),null);});
