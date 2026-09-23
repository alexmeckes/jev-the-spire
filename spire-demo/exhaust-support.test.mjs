import test from 'node:test';
import assert from 'node:assert/strict';
import {exhaustSupport} from './exhaust-support.mjs';
test('distinguishes source clauses from payoff and pile references',()=>{
 const r=exhaustSupport([
 {name:'Production',description:'Gain 2 Energy. Exhaust.',copies:2},
 {name:'Drum',description:'Draw 2 cards. When this card is Exhausted, gain 2 Energy.'},
 {name:'FNP',description:'Whenever a card is Exhausted, gain 3 Block.'},
 {name:'Pact',description:'Exhaust 1 card. Draw 2 cards.'},
 {name:'Wind',description:'Exhaust all non-Attack cards in your Hand. Gain 5 Block for each card Exhausted.'},
 {name:'Ashen',description:'Deal 6 damage. Deals 3 additional damage for each card in your Exhaust Pile.'},
 {name:'Conditional',description:'If you have no Block, Exhaust 1 card.'}
 ]);
 assert.deepEqual(r.sourceCardCopies,{self:2,other:2});
 assert.deepEqual(r.triggerPayoffs.map(x=>x.name),['Drum','FNP','Ashen']);
 assert.deepEqual(r.unresolvedCards.map(x=>x.name),['Conditional']);
 assert.deepEqual(exhaustSupport().sourceCardCopies,{self:0,other:0});
});
test('one card can exhaust another and itself without conflating copy counts with triggers',()=>{
 const r=exhaustSupport([{name:'Both',description:'Exhaust 1 card. Exhaust.'}],[{name:'Relic',description:'Whenever you Exhaust, gain Block.'}]);
 assert.deepEqual(r.sourceCardCopies,{self:1,other:1});assert.equal(r.relicRulesNeedingReview.length,1);
});
