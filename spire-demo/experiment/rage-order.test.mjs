import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rageOrderEvidence} from './rage-order.mjs';
const fixture=()=>JSON.parse(readFileSync(new URL('../fixtures/slippery-again.json',import.meta.url))).state;
test('Rage ordering evidence exposes additional block without modifying state',()=>{
 const s=fixture(),original=structuredClone(s),e=rageOrderEvidence(s);
 const c=e.comparisons.find(c=>c.attack==='Strike → Vantom');assert.ok(c);assert.equal(c.rageFirst.block-c.rageAfter.block,3);assert.deepEqual(s,original);
});
test('unavailable Rage does not trigger review',()=>{const s=fixture();s.player.hand=s.player.hand.filter(c=>c.name!=='Rage');assert.equal(rageOrderEvidence(s),null);});
