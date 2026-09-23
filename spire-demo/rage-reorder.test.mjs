import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {withRageReorders} from './planner.mjs';
const fixture=()=>JSON.parse(readFileSync(new URL('./fixtures/rage-reorder.json',import.meta.url)));
test('retains original and adds full Rage-first continuation with 3 extra block',()=>{
 const {state,candidates}=fixture(),before=structuredClone({state,candidates}),out=withRageReorders(state,candidates);
 assert.equal(out.length,2);assert.deepEqual(out[0],candidates[0]);assert.equal(out[1].label,'Rage → Strike → Gas Bomb → Strike → Gas Bomb → Defend');assert.equal(out[1].forecast.block,11);assert.equal(out[1].forecast.damage,candidates[0].forecast.damage);assert.deepEqual({state,candidates},before);
});
test('recomputes shifted card indices and uses each physical card once',()=>{
 const {state,candidates}=fixture(),out=withRageReorders(state,candidates),hand=[...state.player.hand],names=[];
 for(const p of out[1].plan){if(p.command.action==='play_card'){const [card]=hand.splice(p.command.card_index,1);assert.ok(card);names.push(card.name);}}
 assert.deepEqual(names,['Rage','Strike','Strike','Defend']);
});
test('bounded and deduplicated; unavailable or unaffordable Rage is not inserted',()=>{
 const {state,candidates}=fixture();assert.equal(withRageReorders(state,candidates,{maxExtra:0}).length,1);
 const out=withRageReorders(state,candidates);assert.equal(withRageReorders(state,out).length,2);
 state.player.hand.find(c=>c.name==='Rage').cost='99';assert.equal(withRageReorders(state,candidates).length,1);
});
