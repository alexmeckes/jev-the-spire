import test from 'node:test';
import assert from 'node:assert/strict';
import {effects,evaluateHand,sampleHand,assay} from './hand-lab.mjs';
const c=(description,cost=1)=>({name:description,description,cost:String(cost)});
test('energy limits combinations and maxima are separate',()=>{
 const v=evaluateHand([c('Deal 10 damage.'),c('Gain 8 Block.')],1);
 assert.equal(v.damage,10);assert.equal(v.block,8);
 assert.equal(evaluateHand([c('Deal 10 damage.'),c('Deal 10 damage.')],1).damage,10);
});
test('ordering strength and vulnerability changes damage',()=>{
 assert.equal(evaluateHand([c('Deal 6 damage.'),c('Gain 2 Strength.'),c('Apply 2 Vulnerable.')],3).damage,12);
});
test('draw resolves sampled pile and no-draw blocks later draws',()=>{
 assert.equal(evaluateHand([c('Draw 1 card.',0)],1,[c('Deal 10 damage.')]).damage,10);
 const v=evaluateHand([c('Draw 1 card. You cannot draw additional cards this turn.',0)],1,[c('Draw 1 card.',0),c('Deal 10 damage.')]);
 assert.equal(v.damage,0);
});
test('energy icons with filename dots are parsed; lethal HP payment rejected',()=>{
 assert.deepEqual(effects(c('Lose 3 HP. Gain [ironclad_energy_icon.png][ironclad_energy_icon.png].',0)),[['hp',-3],['energy',2]]);
 assert.equal(evaluateHand([c('Lose 80 HP. Deal 100 damage.',0)]).damage,0);
});
test('unsupported effects and multi-hit scaling are not silently counted',()=>{
 assert.equal(effects(c('Deal 6 damage. Double your Strength.')),null);
 assert.equal(effects(c('Deal 7 damage twice.')),null);
 assert.equal(evaluateHand([c('Deal 6 damage. Double your Strength.')]).unsupported,1);
});
test('innate occupies opening slot and sampling is deterministic',()=>{
 const innate=c('Innate. Gain 1 Strength.');const deck=Array.from({length:8},()=>c('Deal 6 damage.'));
 assert.ok(sampleHand([...deck,innate],Array.from({length:9},(_,i)=>i),5).includes(innate));
 assert.deepEqual(assay(deck,[c('Gain 5 Block.')],{samples:20}),assay(deck,[c('Gain 5 Block.')],{samples:20}));
 assert.equal(assay(deck,[],{samples:20})[0].damageDelta.mean,0);
});
test('discard reshuffle is explicitly stopped',()=>{
 const v=evaluateHand([c('Deal 1 damage.',0),c('Draw 2 cards.',0)]);
 assert.equal(v.reshuffleNeeded,true);
});
