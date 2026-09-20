import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setupLinks} from './setup-links.mjs';
import {decisionQuestion,decisionCandidates} from './planner.mjs';
import {compactRequest} from './compact-request.mjs';
const fixture=()=>JSON.parse(readFileSync(new URL('./fixtures/exhaust-payoff.json',import.meta.url))).state;
test('recorded lethal hand exposes affordable exhaust-before-block payoff without choosing an action',()=>{
 const s=fixture(),links=setupLinks(s);
 assert.equal(links.length,1);assert.equal(links[0].setup.name,'Burning Pact+');assert.equal(links[0].payoff.name,'Evil Eye');
 assert.equal(links[0].energyAfterBoth,1);
 const q=compactRequest(decisionQuestion(s,decisionCandidates(s)));
 assert.deepEqual(q.state.setup_dependencies,links);
});
test('dependency respects visible availability and reports insufficient energy without guessing draws',()=>{
 const s=fixture();s.player.energy=1;
 assert.equal(setupLinks(s)[0].energyAfterBoth,-1);
 s.player.hand.find(c=>c.name==='Burning Pact+').can_play=false;
 assert.deepEqual(setupLinks(s),[]);
});

test('exhaust after a block clause still exposes the payoff and self-exhaust is not targeted exhaust',()=>{
 const s=fixture();const source=s.player.hand.find(c=>c.name==='Burning Pact+');
 source.name='True Grit+';source.description='Gain 9 Block. Exhaust 1 card.';
 assert.equal(setupLinks(s)[0].setup.name,'True Grit+');
 assert.equal(setupLinks(s)[0].payoff.name,'Evil Eye');
 source.description='Gain 9 Block. Exhaust.';
 assert.deepEqual(setupLinks(s),[]);
});

test('next-attack replay setup exposes order and total energy before the payoff',()=>{
 const s={player:{energy:2,hand:[{index:0,name:'One-Two Punch',cost:'1',can_play:true,description:'This turn, your next Attack is played an extra time.'},{index:1,name:'Rampage+',cost:'1',type:'Attack',description:"Deal 16 damage. Increase this card's damage by 9 this combat."}]}};
 const links=setupLinks(s);assert.equal(links.length,1);assert.equal(links[0].energyAfterBoth,0);assert.equal(links[0].payoff.name,'Rampage+');assert.match(links[0].note,/BEFORE/);assert.match(links[0].note,/change their own damage/);
});
